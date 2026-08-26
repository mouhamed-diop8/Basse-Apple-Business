-- ============================================================================
--  Basse Apple Business — schéma initial
--  À exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
--  Couvre les sections 22 (base de données) et 23 (sécurité) du cahier des
--  charges : rôles, RLS, protection des routes administrateur.
-- ============================================================================

create extension if not exists "pgcrypto";
-- Recherche partielle tolérante aux fautes de frappe (section 29).
create extension if not exists pg_trgm;

-- ----------------------------------------------------------------- profils --
-- Les identifiants sont gérés par Supabase Auth (mots de passe hachés bcrypt
-- côté serveur). Cette table ne contient que les données de profil.
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  first_name  text not null default '',
  last_name   text not null default '',
  email       text not null,
  phone       text not null default '',
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Un utilisateur ne peut pas s'attribuer le rôle admin : seul un admin
-- existant (ou le service_role) peut modifier la colonne `role`.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.protect_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Modification du rôle non autorisée';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_role();

-- Création automatique du profil à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------- catégories --
create table if not exists public.categories (
  id          text primary key,
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  image       text not null default '',
  icon        text not null default 'pricetag-outline',
  position    integer not null default 0
);

-- ---------------------------------------------------------------- produits --
create table if not exists public.products (
  id                   text primary key,
  name                 text not null,
  description          text not null default '',
  brand                text not null default '',
  category_id          text references public.categories on delete set null,
  price                numeric(10, 2) not null check (price >= 0),
  sale_price           numeric(10, 2) check (sale_price >= 0),
  stock                integer not null default 0 check (stock >= 0),
  low_stock_threshold  integer not null default 5,
  sku                  text not null default '',
  warranty             text not null default '',
  condition            text not null default 'new' check (condition in ('new', 'refurbished')),
  rating               numeric(2, 1) not null default 0,
  reviews_count        integer not null default 0,
  units_sold           integer not null default 0,
  is_active            boolean not null default true,
  is_featured          boolean not null default false,
  return_policy        text not null default '',
  shipping_note        text not null default '',
  included_accessories text[] not null default '{}',
  specs                jsonb not null default '[]',
  storage_gb           integer,
  ram_gb               integer,
  screen_inches        numeric(4, 1),
  colors               text[] not null default '{}',
  created_at           timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_brand_idx on public.products (brand);
create index if not exists products_active_idx on public.products (is_active);

create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references public.products on delete cascade,
  image_url  text not null,
  position   integer not null default 0
);

create index if not exists product_images_product_idx on public.product_images (product_id);

create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

create table if not exists public.product_variants (
  id          text primary key,
  product_id  text not null references public.products on delete cascade,
  kind        text not null check (kind in ('color', 'storage', 'ram', 'size', 'config')),
  name        text not null,
  value       text not null,
  price_delta numeric(10, 2) not null default 0,
  stock       integer not null default 0,
  hex         text
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);

-- --------------------------------------------------------------- commandes --
create table if not exists public.orders (
  id               text primary key,
  reference        text not null unique,
  user_id          uuid references public.profiles on delete set null,
  subtotal         numeric(10, 2) not null default 0,
  shipping_cost    numeric(10, 2) not null default 0,
  discount         numeric(10, 2) not null default 0,
  total            numeric(10, 2) not null default 0,
  status           text not null default 'received' check (status in (
                     'received', 'payment_confirmed', 'preparing',
                     'shipped', 'delivering', 'delivered', 'cancelled')),
  payment_status   text not null default 'pending' check (payment_status in (
                     'pending', 'paid', 'failed', 'refunded')),
  payment_method   text not null check (payment_method in (
                     'card', 'mobile_money', 'cash_on_delivery', 'paypal')),
  shipping_method  text not null check (shipping_method in ('standard', 'express', 'pickup')),
  shipping_address jsonb not null,
  promo_code       text,
  tracking_number  text,
  eta              text not null default '',
  customer_name    text not null default '',
  customer_phone   text not null default '',
  customer_email   text not null default '',
  history          jsonb not null default '[]',
  created_at       timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      text not null references public.orders on delete cascade,
  product_id    text references public.products on delete set null,
  name          text not null,
  image         text not null default '',
  variant_label text,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(10, 2) not null check (unit_price >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- -------------------------------------------------------------------- avis --
create table if not exists public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  product_id         text not null references public.products on delete cascade,
  user_id            uuid references public.profiles on delete set null,
  author_first_name  text not null default '',
  rating             integer not null check (rating between 1 and 5),
  comment            text not null default '',
  created_at         timestamptz not null default now(),
  -- Un seul avis par client et par produit.
  unique (product_id, user_id)
);

create index if not exists reviews_product_idx on public.reviews (product_id);

-- ----------------------------------------------------------------- favoris --
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  product_id text not null references public.products on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ------------------------------------------------------------ codes promo --
create table if not exists public.promo_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  type            text not null check (type in ('percentage', 'fixed')),
  value           numeric(10, 2) not null check (value > 0),
  min_order       numeric(10, 2) not null default 0,
  expiration_date timestamptz not null,
  usage_limit     integer not null default 0,
  usage_count     integer not null default 0,
  is_active       boolean not null default true
);

-- --------------------------------------------------------------- adresses --
create table if not exists public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  label        text not null default 'Adresse',
  first_name   text not null default '',
  last_name    text not null default '',
  phone        text not null default '',
  email        text not null default '',
  address      text not null,
  city         text not null default '',
  district     text not null default '',
  country      text not null default '',
  instructions text not null default '',
  is_default   boolean not null default false
);

-- ============================================================================
--  Row Level Security
--  Principe : le catalogue est public en lecture, tout le reste est cloisonné
--  par utilisateur, et seules les fonctions admin peuvent écrire côté boutique.
-- ============================================================================

alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_images   enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.reviews          enable row level security;
alter table public.favorites        enable row level security;
alter table public.promo_codes      enable row level security;
alter table public.addresses        enable row level security;

-- Profils : chacun lit et modifie le sien ; les admins voient tout.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

-- Catalogue : lecture publique, écriture réservée aux admins.
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (true);

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_images_read on public.product_images;
create policy product_images_read on public.product_images for select using (true);

drop policy if exists product_images_write on public.product_images;
create policy product_images_write on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_variants_read on public.product_variants;
create policy product_variants_read on public.product_variants for select using (true);

drop policy if exists product_variants_write on public.product_variants;
create policy product_variants_write on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

-- Commandes : un client ne voit que les siennes.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert with check (user_id = auth.uid() or user_id is null);

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or o.user_id is null)
    )
  );

-- Avis : lecture publique, écriture par l'auteur uniquement.
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert with check (user_id = auth.uid());

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews
  for update using (user_id = auth.uid() or public.is_admin());

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews
  for delete using (user_id = auth.uid() or public.is_admin());

-- Favoris et adresses : strictement privés.
drop policy if exists favorites_all on public.favorites;
create policy favorites_all on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists addresses_all on public.addresses;
create policy addresses_all on public.addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Codes promo : lisibles pour permettre la validation au panier, modifiables
-- par les admins seuls. Le compteur d'utilisation passe par une fonction.
drop policy if exists promo_read on public.promo_codes;
create policy promo_read on public.promo_codes
  for select using (is_active = true or public.is_admin());

drop policy if exists promo_write on public.promo_codes;
create policy promo_write on public.promo_codes
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
--  Fonctions métier
-- ============================================================================

-- Décrémente le stock de façon atomique et incrémente les ventes.
create or replace function public.consume_stock(p_product_id text, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
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

-- Incrémente l'utilisation d'un code promo sans donner de droit d'écriture.
create or replace function public.consume_promo(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promo_codes set usage_count = usage_count + 1 where code = p_code;
$$;

-- Recalcule la note moyenne d'un produit après ajout ou suppression d'un avis.
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set rating = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where product_id = target), 0),
         reviews_count = (select count(*) from public.reviews where product_id = target)
   where p.id = target;
  return null;
end;
$$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- ============================================================================
--  Promotion d'un compte en administrateur
--  Créez d'abord le compte via l'application, puis exécutez :
--    update public.profiles set role = 'admin' where email = 'vous@exemple.com';
-- ============================================================================
