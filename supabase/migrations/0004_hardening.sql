-- ============================================================================
--  Durcissement : rate limit commandes, avis, catalogue, codes promo
-- ============================================================================

alter table public.orders
  add column if not exists idempotency_key text;

create unique index if not exists orders_idempotency_key_uidx
  on public.orders (idempotency_key)
  where idempotency_key is not null;

create index if not exists orders_email_created_idx
  on public.orders (customer_email, created_at desc);

-- ---------------------------------------------------------------------------
--  Anti-flood : 5 commandes / email / heure, 40 commandes / 10 minutes
-- ---------------------------------------------------------------------------
create or replace function public.enforce_order_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.orders
     where customer_email = new.customer_email
       and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Trop de commandes. Réessayez plus tard.';
  end if;

  if (
    select count(*) from public.orders
     where created_at > now() - interval '10 minutes'
  ) >= 40 then
    raise exception 'Trop de commandes. Réessayez plus tard.';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_rate_limit on public.orders;
create trigger orders_rate_limit
  before insert on public.orders
  for each row execute function public.enforce_order_rate_limit();

revoke all on function public.enforce_order_rate_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
--  Catalogue : brouillons / inactifs invisibles hors admin
-- ---------------------------------------------------------------------------
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (is_active = true or public.is_admin());

drop policy if exists product_images_read on public.product_images;
create policy product_images_read on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.is_active = true or public.is_admin())
    )
  );

drop policy if exists product_variants_read on public.product_variants;
create policy product_variants_read on public.product_variants
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.is_active = true or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
--  Codes promo : plus de listing public, validation par RPC uniquement
-- ---------------------------------------------------------------------------
drop policy if exists promo_read on public.promo_codes;
create policy promo_read on public.promo_codes
  for select using (public.is_admin());

create or replace function public.validate_store_promo(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes%rowtype;
  v_code text;
  v_raw numeric;
  v_amount numeric(10, 2);
begin
  v_code := nullif(upper(trim(coalesce(p_code, ''))), '');
  if v_code is null then
    raise exception 'Ce code promo n’existe pas ou n’est plus actif.';
  end if;

  select * into v_promo from public.promo_codes where code = v_code;

  if not found or not v_promo.is_active or v_promo.expiration_date < now() then
    raise exception 'Ce code promo n’existe pas ou n’est plus actif.';
  end if;

  if v_promo.usage_limit > 0 and v_promo.usage_count >= v_promo.usage_limit then
    raise exception 'Ce code promo a atteint sa limite d’utilisation.';
  end if;

  if coalesce(p_subtotal, 0) < v_promo.min_order then
    raise exception 'Ce code promo n’atteint pas le minimum d’achat.';
  end if;

  if v_promo.type = 'percentage' then
    v_raw := (coalesce(p_subtotal, 0) * v_promo.value) / 100;
  else
    v_raw := v_promo.value;
  end if;

  v_amount := round(least(v_raw, coalesce(p_subtotal, 0)), 2);

  return jsonb_build_object(
    'code', v_promo.code,
    'type', v_promo.type,
    'value', v_promo.value,
    'amount', v_amount
  );
end;
$$;

revoke all on function public.validate_store_promo(text, numeric) from public;
grant execute on function public.validate_store_promo(text, numeric) to anon, authenticated;

-- ---------------------------------------------------------------------------
--  Avis : nom depuis le profil, product_id / user_id immuables
-- ---------------------------------------------------------------------------
create or replace function public.protect_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null or new.user_id is distinct from auth.uid() then
      raise exception 'Avis non autorisé';
    end if;
    select first_name into v_name from public.profiles where id = auth.uid();
    new.author_first_name := left(coalesce(nullif(trim(v_name), ''), 'Client'), 40);
    new.comment := left(trim(coalesce(new.comment, '')), 2000);
  elsif tg_op = 'UPDATE' then
    if new.product_id is distinct from old.product_id
       or new.user_id is distinct from old.user_id then
      raise exception 'Modification non autorisée';
    end if;
    new.author_first_name := old.author_first_name;
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_protect on public.reviews;
create trigger reviews_protect
  before insert or update on public.reviews
  for each row execute function public.protect_review();

revoke all on function public.protect_review() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
--  Idempotence : si la clé existe déjà, renvoyer la commande au lieu d’en créer
-- ---------------------------------------------------------------------------
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
  v_idempotency text;
  v_existing text;
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

  v_idempotency := nullif(left(trim(coalesce(p_order->>'idempotency_key', '')), 80), '');
  if v_idempotency is not null then
    if v_idempotency !~ '^[A-Za-z0-9._:-]{8,80}$' then
      raise exception 'Commande incomplète';
    end if;
    select o.id into v_existing
      from public.orders o
     where o.idempotency_key = v_idempotency;
    if found then
      if public.is_admin()
         or (select user_id from public.orders where id = v_existing) = auth.uid()
         or (select lower(customer_email) from public.orders where id = v_existing) = v_email then
        return public.store_order_json(v_existing);
      end if;
      raise exception 'Commande incomplète';
    end if;
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
    promo_code, eta, customer_name, customer_phone, customer_email, history,
    idempotency_key
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
    )),
    v_idempotency
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
