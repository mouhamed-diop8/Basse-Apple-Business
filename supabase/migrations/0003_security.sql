-- ============================================================================
--  Correctifs de sécurité — commandes, stock, profils, RPC
--
--  - Le client ne dicte plus les montants, le statut ni le paiement.
--  - Insertion directe sur orders / order_items interdite (RPC uniquement).
--  - consume_stock / consume_promo ne sont plus appelables par anon.
--  - Suivi invité : référence + email (plus d’IDOR par référence seule).
--  - Un compte ne peut plus s’auto-promouvoir administrateur.
-- ============================================================================

-- Colonne pour remettre le stock des variantes à l’annulation.
alter table public.order_items
  add column if not exists variant_ids text[] not null default '{}';

-- Profil : impossible de s’inscrire avec le rôle admin.
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid() and role = 'customer');

-- Plus d’INSERT client : place_store_order (SECURITY DEFINER) s’en charge.
drop policy if exists orders_insert on public.orders;
drop policy if exists order_items_insert on public.order_items;

revoke insert on public.orders from anon, authenticated;
revoke insert on public.order_items from anon, authenticated;

-- Stock : uniquement des quantités positives (plus de restock via RPC public).
create or replace function public.consume_stock(p_product_id text, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantité invalide';
  end if;

  select stock into remaining from public.products where id = p_product_id for update;

  if remaining is null then
    raise exception 'Produit % introuvable', p_product_id;
  end if;

  if remaining < p_quantity then
    raise exception 'Stock insuffisant pour le produit %', p_product_id;
  end if;

  update public.products
     set stock = stock - p_quantity,
         units_sold = units_sold + p_quantity
   where id = p_product_id;
end;
$$;

create or replace function public.consume_promo(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  update public.promo_codes
     set usage_count = usage_count + 1
   where code = p_code
     and is_active = true
     and expiration_date >= now()
     and (usage_limit = 0 or usage_count < usage_limit);

  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'Ce code promo n’est plus applicable.';
  end if;
end;
$$;

revoke all on function public.consume_stock(text, integer) from public, anon, authenticated;
revoke all on function public.consume_promo(text) from public, anon, authenticated;

-- Lecture interne d’une commande (jamais exposée à anon / authenticated).
create or replace function public.store_order_json(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order', to_jsonb(o),
    'items', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.id)
      from public.order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_id;
$$;

revoke all on function public.store_order_json(text) from public, anon, authenticated;

-- Ancienne signature : une référence suffisait à lire les commandes invitées.
drop function if exists public.lookup_store_order(text);

create or replace function public.lookup_store_order(p_reference text, p_email text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id text;
  v_email text;
begin
  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');

  select o.id
    into v_id
    from public.orders o
   where upper(o.reference) = upper(trim(p_reference))
     and (
       public.is_admin()
       or o.user_id = auth.uid()
       or (
         v_email is not null
         and lower(o.customer_email) = v_email
       )
     );

  if v_id is null then
    return null;
  end if;

  return public.store_order_json(v_id);
end;
$$;

revoke all on function public.lookup_store_order(text, text) from public;
grant execute on function public.lookup_store_order(text, text) to anon, authenticated;

-- Création : prix, promo, livraison et stock recalculés côté serveur.
create or replace function public.place_store_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_user uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_qty integer;
  v_unit numeric(10, 2);
  v_delta numeric(10, 2);
  v_label text;
  v_image text;
  v_variant_id text;
  v_variant_ids text[];
  v_subtotal numeric(10, 2) := 0;
  v_shipping numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_total numeric(10, 2);
  v_method text;
  v_pay text;
  v_promo_code text;
  v_promo public.promo_codes%rowtype;
  v_addr jsonb;
  v_email text;
  v_phone text;
  v_first text;
  v_last text;
  v_name text;
  v_eta text;
  v_lines jsonb := '[]'::jsonb;
  v_line_count integer;
  v_raw numeric;
begin
  if p_order is null or p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Commande incomplète';
  end if;

  v_line_count := jsonb_array_length(p_items);
  if v_line_count < 1 or v_line_count > 20 then
    raise exception 'Commande incomplète';
  end if;

  v_method := p_order->>'shipping_method';
  v_pay := p_order->>'payment_method';
  if v_method not in ('standard', 'express', 'pickup') then
    raise exception 'Mode de livraison invalide';
  end if;
  if v_pay not in ('card', 'mobile_money', 'cash_on_delivery') then
    raise exception 'Moyen de paiement invalide';
  end if;

  v_addr := p_order->'shipping_address';
  if v_addr is null or jsonb_typeof(v_addr) <> 'object' then
    raise exception 'Adresse de livraison incomplète';
  end if;

  v_first := left(trim(coalesce(v_addr->>'first_name', '')), 80);
  v_last := left(trim(coalesce(v_addr->>'last_name', '')), 80);
  v_email := lower(left(trim(coalesce(v_addr->>'email', '')), 120));
  v_phone := left(trim(coalesce(v_addr->>'phone', '')), 30);

  if length(v_first) < 1 or length(v_last) < 1 then
    raise exception 'Adresse de livraison incomplète';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[A-Za-z]{2,}$' then
    raise exception 'Adresse email invalide';
  end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 8 then
    raise exception 'Numéro de téléphone invalide';
  end if;
  if length(trim(coalesce(v_addr->>'address', ''))) < 3 then
    raise exception 'Adresse de livraison incomplète';
  end if;

  v_addr := jsonb_build_object(
    'first_name', v_first,
    'last_name', v_last,
    'phone', v_phone,
    'email', v_email,
    'address', left(trim(coalesce(v_addr->>'address', '')), 200),
    'city', left(trim(coalesce(v_addr->>'city', '')), 80),
    'district', left(trim(coalesce(v_addr->>'district', '')), 80),
    'country', left(trim(coalesce(v_addr->>'country', '')), 80),
    'instructions', left(trim(coalesce(v_addr->>'instructions', '')), 500)
  );

  v_user := auth.uid();
  v_id := 'BAB-' || upper(replace(gen_random_uuid()::text, '-', ''));
  v_name := v_first || ' ' || v_last;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_qty := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Quantité invalide';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Quantité invalide';
    end if;

    select * into v_product
      from public.products
     where id = v_item->>'product_id'
       and is_active = true
     for update;

    if not found then
      raise exception 'Produit % introuvable', coalesce(v_item->>'product_id', '?');
    end if;

    v_unit := coalesce(v_product.sale_price, v_product.price);
    v_delta := 0;
    v_label := null;
    v_variant_ids := '{}';

    if jsonb_typeof(v_item->'variant_ids') = 'array' then
      for v_variant_id in select jsonb_array_elements_text(v_item->'variant_ids')
      loop
        select * into v_variant
          from public.product_variants
         where id = v_variant_id
           and product_id = v_product.id
         for update;

        if not found then
          raise exception 'Variante invalide';
        end if;

        if v_variant.stock < v_qty then
          raise exception 'Stock insuffisant pour le produit %', v_product.id;
        end if;

        v_delta := v_delta + v_variant.price_delta;
        v_variant_ids := array_append(v_variant_ids, v_variant.id);
        v_label := case
          when v_label is null then v_variant.value
          else v_label || ' · ' || v_variant.value
        end;
      end loop;
    end if;

    v_unit := round(v_unit + v_delta, 2);

    if v_product.stock < v_qty then
      raise exception 'Stock insuffisant pour le produit %', v_product.id;
    end if;

    update public.products
       set stock = stock - v_qty,
           units_sold = units_sold + v_qty
     where id = v_product.id;

    foreach v_variant_id in array v_variant_ids
    loop
      update public.product_variants
         set stock = stock - v_qty
       where id = v_variant_id;
    end loop;

    select image_url into v_image
      from public.product_images
     where product_id = v_product.id
     order by position
     limit 1;

    v_subtotal := v_subtotal + (v_unit * v_qty);

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'image', coalesce(v_image, ''),
      'variant_label', v_label,
      'variant_ids', to_jsonb(v_variant_ids),
      'quantity', v_qty,
      'unit_price', v_unit
    ));
  end loop;

  v_promo_code := nullif(upper(trim(coalesce(p_order->>'promo_code', ''))), '');
  if v_promo_code is not null then
    select * into v_promo
      from public.promo_codes
     where code = v_promo_code
     for update;

    if not found or not v_promo.is_active or v_promo.expiration_date < now() then
      raise exception 'Ce code promo n’existe pas ou n’est plus actif.';
    end if;

    if v_promo.usage_limit > 0 and v_promo.usage_count >= v_promo.usage_limit then
      raise exception 'Ce code promo a atteint sa limite d’utilisation.';
    end if;

    if v_subtotal < v_promo.min_order then
      raise exception 'Ce code promo n’atteint pas le minimum d’achat.';
    end if;

    if v_promo.type = 'percentage' then
      v_raw := (v_subtotal * v_promo.value) / 100;
    else
      v_raw := v_promo.value;
    end if;

    v_discount := round(least(v_raw, v_subtotal), 2);
  end if;

  if v_method = 'pickup' then
    v_shipping := 0;
    v_eta := 'Aujourd’hui à partir de 2 h';
  elsif v_method = 'express' then
    v_shipping := 5000;
    v_eta := 'Aujourd’hui ou sous 24 h';
  else
    v_shipping := case when v_subtotal >= 200000 then 0 else 2500 end;
    v_eta := '24 à 48 heures';
  end if;

  v_total := round(greatest(0, v_subtotal - v_discount + v_shipping), 2);

  insert into public.orders (
    id, reference, user_id, subtotal, shipping_cost, discount, total,
    status, payment_status, payment_method, shipping_method, shipping_address,
    promo_code, eta, customer_name, customer_phone, customer_email, history
  ) values (
    v_id,
    v_id,
    v_user,
    v_subtotal,
    v_shipping,
    v_discount,
    v_total,
    'received',
    'pending',
    v_pay,
    v_method,
    v_addr,
    v_promo_code,
    v_eta,
    v_name,
    v_phone,
    v_email,
    jsonb_build_array(jsonb_build_object(
      'status', 'received',
      'date', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'note', 'Commande enregistrée'
    ))
  );

  insert into public.order_items (
    order_id, product_id, name, image, variant_label, variant_ids, quantity, unit_price
  )
  select
    v_id,
    item->>'product_id',
    item->>'name',
    coalesce(item->>'image', ''),
    nullif(item->>'variant_label', ''),
    coalesce(
      (
        select array_agg(value)
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(item->'variant_ids') = 'array' then item->'variant_ids'
            else '[]'::jsonb
          end
        ) as t(value)
      ),
      '{}'::text[]
    ),
    (item->>'quantity')::integer,
    (item->>'unit_price')::numeric
  from jsonb_array_elements(v_lines) as item;

  if v_promo_code is not null then
    perform public.consume_promo(v_promo_code);
  end if;

  return public.store_order_json(v_id);
end;
$$;

revoke all on function public.place_store_order(jsonb, jsonb) from public;
grant execute on function public.place_store_order(jsonb, jsonb) to anon, authenticated;

-- Annulation admin : restock produit + variantes dans la même transaction.
create or replace function public.admin_cancel_store_order(p_reference text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_vid text;
  v_history jsonb;
  v_payment text;
begin
  if not public.is_admin() then
    raise exception 'Action réservée aux administrateurs';
  end if;

  select * into v_order
    from public.orders
   where reference = p_reference
   for update;

  if not found then
    raise exception 'Commande introuvable';
  end if;

  if v_order.status = 'cancelled' then
    return public.store_order_json(v_order.id);
  end if;

  for v_item in
    select * from public.order_items where order_id = v_order.id
  loop
    if v_item.product_id is not null then
      update public.products
         set stock = stock + v_item.quantity,
             units_sold = greatest(0, units_sold - v_item.quantity)
       where id = v_item.product_id;
    end if;

    if v_item.variant_ids is not null then
      foreach v_vid in array v_item.variant_ids
      loop
        update public.product_variants
           set stock = stock + v_item.quantity
         where id = v_vid;
      end loop;
    end if;
  end loop;

  v_payment := v_order.payment_status;
  if v_payment = 'paid' then
    v_payment := 'refunded';
  end if;

  v_history := coalesce(v_order.history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'status', 'cancelled',
    'date', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'note', nullif(p_note, '')
  ));

  update public.orders
     set status = 'cancelled',
         payment_status = v_payment,
         history = v_history
   where id = v_order.id;

  return public.store_order_json(v_order.id);
end;
$$;

revoke all on function public.admin_cancel_store_order(text, text) from public, anon;
grant execute on function public.admin_cancel_store_order(text, text) to authenticated;
