-- ============================================================
-- Cactus Light & Sound ERP - Supabase Schema (v2)
-- Supabase / PostgreSQL Migration Script - Idempotent
-- ============================================================
-- Çalıştırma: Supabase Dashboard -> SQL Editor -> Paste -> Run
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS (profiles, linked to auth.users)
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  full_name text,
  email text,
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.users enable row level security;

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);
alter table public.categories enable row level security;

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  barcode text,
  name text not null,
  brand text,
  category_id uuid references public.categories(id) on delete set null,
  purchase_price numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  stock numeric(14,2) not null default 0,
  min_stock numeric(14,2) not null default 0,
  warehouse_location text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_low_stock on public.products(stock) where stock <= min_stock;
alter table public.products enable row level security;

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_office text,
  tax_number text,
  balance numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_customers_name on public.customers(company_name);
alter table public.customers enable row level security;

-- ============================================================
-- SUPPLIERS
-- ============================================================
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_office text,
  tax_number text,
  balance numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.suppliers enable row level security;

-- ============================================================
-- SALES (Invoices)
-- ============================================================
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  customer_name text,
  subtotal numeric(14,2) not null default 0,
  tax_rate numeric(5,2) not null default 20,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  due numeric(14,2) not null default 0,
  notes text,
  user_id uuid references public.users(id),
  user_name text,
  created_at timestamptz default now()
);
create index if not exists idx_sales_customer on public.sales(customer_id);
create index if not exists idx_sales_date on public.sales(created_at desc);
alter table public.sales enable row level security;

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_sku text,
  product_name text,
  quantity numeric(14,2) not null,
  unit_price numeric(14,2) not null,
  discount numeric(5,2) not null default 0,
  line_total numeric(14,2) not null,
  created_at timestamptz default now()
);
create index if not exists idx_sale_items_sale on public.sale_items(sale_id);
create index if not exists idx_sale_items_product on public.sale_items(product_id);
alter table public.sale_items enable row level security;

-- ============================================================
-- PURCHASES
-- ============================================================
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text unique not null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  subtotal numeric(14,2) not null default 0,
  tax_rate numeric(5,2) not null default 20,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  due numeric(14,2) not null default 0,
  notes text,
  user_id uuid references public.users(id),
  created_at timestamptz default now()
);
alter table public.purchases enable row level security;

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text,
  quantity numeric(14,2) not null,
  unit_price numeric(14,2) not null,
  line_total numeric(14,2) not null,
  created_at timestamptz default now()
);
alter table public.purchase_items enable row level security;

-- ============================================================
-- STOCK MOVEMENTS (audit trail)
-- ============================================================
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  product_name text,
  type text not null check (type in ('in','out','adjust','transfer')),
  quantity numeric(14,2) not null,
  reason text,
  reference_id uuid,
  before_qty numeric(14,2),
  after_qty numeric(14,2),
  user_id uuid references public.users(id),
  user_name text,
  created_at timestamptz default now()
);
create index if not exists idx_stock_movements_product on public.stock_movements(product_id);
create index if not exists idx_stock_movements_date on public.stock_movements(created_at desc);
alter table public.stock_movements enable row level security;

-- ============================================================
-- CUSTOMER TRANSACTIONS (ledger)
-- ============================================================
create table if not exists public.customer_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('sale','payment','refund','adjust')),
  amount numeric(14,2) not null,
  reference_id uuid,
  reference_number text,
  description text,
  balance_after numeric(14,2),
  created_at timestamptz default now()
);
create index if not exists idx_cust_txn_customer on public.customer_transactions(customer_id);
alter table public.customer_transactions enable row level security;

-- ============================================================
-- PAYMENTS (collections)
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount numeric(14,2) not null,
  method text default 'cash' check (method in ('cash','card','transfer','check','other')),
  reference_id uuid,
  reference_number text,
  notes text,
  user_id uuid references public.users(id),
  user_name text,
  created_at timestamptz default now()
);
create index if not exists idx_payments_customer on public.payments(customer_id);
alter table public.payments enable row level security;

-- ============================================================
-- SETTINGS (singleton)
-- ============================================================
create table if not exists public.settings (
  id text primary key default 'company',
  company_name text,
  address text,
  phone text,
  email text,
  tax_office text,
  tax_number text,
  currency text default 'TRY',
  invoice_prefix text default 'CLS',
  invoice_counter integer default 1000,
  logo_url text,
  updated_at timestamptz default now()
);
alter table public.settings enable row level security;

-- ============================================================
-- AUTH SYNC: auto-create public.users from auth.users
-- (İLK kullanıcı otomatik admin olur!)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.users;
  insert into public.users (id, username, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    case when is_first then 'admin' else coalesce(new.raw_user_meta_data->>'role', 'staff') end
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- INVOICE NUMBER GENERATOR
-- ============================================================
create or replace function public.next_invoice_number()
returns text language plpgsql security definer set search_path = public as $$
declare
  s record;
  prefix text;
  cnt int;
begin
  select * into s from public.settings where id = 'company' for update;
  prefix := coalesce(s.invoice_prefix, 'CLS');
  cnt := coalesce(s.invoice_counter, 1000) + 1;
  update public.settings set invoice_counter = cnt where id = 'company';
  return prefix || '-' || extract(year from now())::text || '-' || lpad(cnt::text, 5, '0');
end; $$;

-- ============================================================
-- BUSINESS LOGIC TRIGGERS
-- ============================================================

-- 1) sale_items INSERT -> stock - and log
create or replace function public.handle_sale_item_insert()
returns trigger language plpgsql as $$
declare
  cur_stock numeric(14,2);
  inv text;
begin
  select stock into cur_stock from public.products where id = new.product_id for update;
  if cur_stock is null then raise exception 'Ürün bulunamadı: %', new.product_id; end if;
  if cur_stock < new.quantity then raise exception 'Yetersiz stok: %', new.product_name; end if;

  update public.products set stock = stock - new.quantity, updated_at = now() where id = new.product_id;
  select invoice_number into inv from public.sales where id = new.sale_id;

  insert into public.stock_movements (product_id, product_name, type, quantity, reason, reference_id, before_qty, after_qty)
  values (new.product_id, new.product_name, 'out', new.quantity, 'Satış: ' || coalesce(inv,''), new.sale_id, cur_stock, cur_stock - new.quantity);

  return new;
end; $$;

drop trigger if exists trg_sale_item_insert on public.sale_items;
create trigger trg_sale_item_insert
after insert on public.sale_items
for each row execute function public.handle_sale_item_insert();

-- 2) purchase_items INSERT -> stock +
create or replace function public.handle_purchase_item_insert()
returns trigger language plpgsql as $$
declare cur_stock numeric(14,2);
begin
  select stock into cur_stock from public.products where id = new.product_id for update;
  update public.products set stock = stock + new.quantity, updated_at = now() where id = new.product_id;
  insert into public.stock_movements (product_id, product_name, type, quantity, reason, reference_id, before_qty, after_qty)
  values (new.product_id, new.product_name, 'in', new.quantity, 'Alım', new.purchase_id, cur_stock, cur_stock + new.quantity);
  return new;
end; $$;

drop trigger if exists trg_purchase_item_insert on public.purchase_items;
create trigger trg_purchase_item_insert
after insert on public.purchase_items
for each row execute function public.handle_purchase_item_insert();

-- 3) sales INSERT -> customer balance + total (payment trigger will subtract paid)
create or replace function public.handle_sale_insert()
returns trigger language plpgsql as $$
declare new_bal numeric(14,2);
begin
  update public.customers set balance = balance + new.total, updated_at = now()
  where id = new.customer_id returning balance into new_bal;
  insert into public.customer_transactions (customer_id, type, amount, reference_id, reference_number, description, balance_after)
  values (new.customer_id, 'sale', new.total, new.id, new.invoice_number, 'Satış Faturası ' || new.invoice_number, new_bal);
  return new;
end; $$;

drop trigger if exists trg_sale_insert on public.sales;
create trigger trg_sale_insert
after insert on public.sales
for each row execute function public.handle_sale_insert();

-- 4) payments INSERT -> customer balance -
create or replace function public.handle_payment_insert()
returns trigger language plpgsql as $$
declare new_bal numeric(14,2);
begin
  update public.customers set balance = balance - new.amount, updated_at = now()
  where id = new.customer_id returning balance into new_bal;
  insert into public.customer_transactions (customer_id, type, amount, reference_id, description, balance_after)
  values (new.customer_id, 'payment', -new.amount, new.id, coalesce(new.notes, 'Tahsilat'), new_bal);
  return new;
end; $$;

drop trigger if exists trg_payment_insert on public.payments;
create trigger trg_payment_insert
after insert on public.payments
for each row execute function public.handle_payment_insert();

-- ============================================================
-- RLS POLICIES (idempotent)
-- ============================================================
-- is_admin: SECURITY DEFINER ile recursion'dan kaçınır
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

-- Drop existing policies (clean slate)
drop policy if exists users_read on public.users;
drop policy if exists users_write on public.users;
drop policy if exists users_self_update on public.users;
drop policy if exists categories_all on public.categories;
drop policy if exists products_all on public.products;
drop policy if exists customers_all on public.customers;
drop policy if exists suppliers_all on public.suppliers;
drop policy if exists sales_all on public.sales;
drop policy if exists sale_items_all on public.sale_items;
drop policy if exists purchases_all on public.purchases;
drop policy if exists purchase_items_all on public.purchase_items;
drop policy if exists stock_movements_all on public.stock_movements;
drop policy if exists customer_transactions_all on public.customer_transactions;
drop policy if exists payments_all on public.payments;
drop policy if exists settings_read on public.settings;
drop policy if exists settings_write on public.settings;

-- USERS: self read; admin read all & write all
create policy users_read on public.users for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy users_write on public.users for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Operational tables: all authenticated can read/write
create policy categories_all on public.categories for all to authenticated using (true) with check (true);
create policy products_all on public.products for all to authenticated using (true) with check (true);
create policy customers_all on public.customers for all to authenticated using (true) with check (true);
create policy suppliers_all on public.suppliers for all to authenticated using (true) with check (true);
create policy sales_all on public.sales for all to authenticated using (true) with check (true);
create policy sale_items_all on public.sale_items for all to authenticated using (true) with check (true);
create policy purchases_all on public.purchases for all to authenticated using (true) with check (true);
create policy purchase_items_all on public.purchase_items for all to authenticated using (true) with check (true);
create policy stock_movements_all on public.stock_movements for all to authenticated using (true) with check (true);
create policy customer_transactions_all on public.customer_transactions for all to authenticated using (true) with check (true);
create policy payments_all on public.payments for all to authenticated using (true) with check (true);

-- SETTINGS: read all, write admin
create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_write on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true), ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "storage_public_read" on storage.objects;
drop policy if exists "storage_auth_insert" on storage.objects;
drop policy if exists "storage_auth_update" on storage.objects;
drop policy if exists "storage_auth_delete" on storage.objects;

create policy "storage_public_read" on storage.objects for select to public
  using (bucket_id in ('product-images', 'company-logos'));
create policy "storage_auth_insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images', 'company-logos'));
create policy "storage_auth_update" on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'company-logos'));
create policy "storage_auth_delete" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images', 'company-logos'));

-- ============================================================
-- DEFAULT DATA
-- ============================================================
insert into public.settings (id, company_name, address, phone, email, tax_office, tax_number, currency, invoice_prefix, invoice_counter)
values ('company', 'Cactus Light & Sound', 'İstanbul, Türkiye', '+90 212 000 00 00', 'info@cactus.com', 'Beyoğlu', '1234567890', 'TRY', 'CLS', 1000)
on conflict (id) do nothing;

insert into public.categories (name) values
  ('Aydınlatma'),('Ses Sistemi'),('Mikser'),('Mikrofon'),('Hoparlör'),('Anfi'),('Kablo & Aksesuar')
on conflict do nothing;

-- ============================================================
-- POST-INSTALL NOTES
-- ============================================================
-- 1) Authentication -> Users -> Add User
--    Email: admin@cactus.com  Password: <güçlü>  Auto Confirm: ✅
-- 2) SQL Editor: UPDATE public.users SET role='admin' WHERE email='admin@cactus.com';
-- 3) (Opsiyonel) İlk kullanıcı oluşunca trigger otomatik public.users'a satır ekler.
