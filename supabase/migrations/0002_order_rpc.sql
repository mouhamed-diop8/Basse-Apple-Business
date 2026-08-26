-- Commandes : création et lecture via fonctions SECURITY DEFINER.
-- Sans cela, RLS empêche de relire une commande invité (et souvent d'insérer
-- les lignes d'articles), donc l'écran de confirmation reste vide.
--
-- Les montants, le stock et le suivi invité sont durcis dans 0003_security.sql.

create or replace function public.lookup_store_order(p_reference text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'order', to_jsonb(o),
    'items', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.id)
      from public.order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  into result
  from public.orders o
  where o.reference = p_reference
    and (
      o.user_id = auth.uid()
      or o.user_id is null
      or public.is_admin()
    );

  return result;
end;
$$;

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
begin
  if p_order is null or p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Commande incomplète';
  end if;

  v_id := p_order->>'id';
  if v_id is null or v_id <> p_order->>'reference' then
    raise exception 'Référence de commande invalide';
  end if;

  if auth.uid() is not null then
    v_user := auth.uid();
  else
    v_user := null;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    perform public.consume_stock(v_item->>'product_id', (v_item->>'quantity')::integer);
  end loop;

  insert into public.orders (
    id, reference, user_id, subtotal, shipping_cost, discount, total,
    status, payment_status, payment_method, shipping_method, shipping_address,
    promo_code, eta, customer_name, customer_phone, customer_email, history
  ) values (
    v_id,
    p_order->>'reference',
    v_user,
    (p_order->>'subtotal')::numeric,
    (p_order->>'shipping_cost')::numeric,
    (p_order->>'discount')::numeric,
    (p_order->>'total')::numeric,
    p_order->>'status',
    p_order->>'payment_status',
    p_order->>'payment_method',
    p_order->>'shipping_method',
    p_order->'shipping_address',
    nullif(p_order->>'promo_code', ''),
    coalesce(p_order->>'eta', ''),
    coalesce(p_order->>'customer_name', ''),
    coalesce(p_order->>'customer_phone', ''),
    coalesce(p_order->>'customer_email', ''),
    coalesce(p_order->'history', '[]'::jsonb)
  );

  insert into public.order_items (
    order_id, product_id, name, image, variant_label, quantity, unit_price
  )
  select
    v_id,
    item->>'product_id',
    item->>'name',
    coalesce(item->>'image', ''),
    nullif(item->>'variant_label', ''),
    (item->>'quantity')::integer,
    (item->>'unit_price')::numeric
  from jsonb_array_elements(p_items) as item;

  if nullif(p_order->>'promo_code', '') is not null then
    perform public.consume_promo(p_order->>'promo_code');
  end if;

  return public.lookup_store_order(p_order->>'reference');
end;
$$;

revoke all on function public.lookup_store_order(text) from public;
revoke all on function public.place_store_order(jsonb, jsonb) from public;
grant execute on function public.lookup_store_order(text) to anon, authenticated;
grant execute on function public.place_store_order(jsonb, jsonb) to anon, authenticated;
