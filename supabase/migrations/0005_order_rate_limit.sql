-- Le plafond de 5 commandes/heure bloquait les essais légitimes (boutique + tests).
-- On garde une protection anti-flood, à un niveau réaliste pour une boutique.

create or replace function public.enforce_order_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if (
    select count(*) from public.orders
     where customer_email = new.customer_email
       and created_at > now() - interval '1 hour'
  ) >= 50 then
    raise exception 'Trop de commandes. Réessayez plus tard.';
  end if;

  if (
    select count(*) from public.orders
     where created_at > now() - interval '10 minutes'
  ) >= 200 then
    raise exception 'Trop de commandes. Réessayez plus tard.';
  end if;

  return new;
end;
$$;
