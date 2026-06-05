-- ============================================================
-- Cactus Light & Sound ERP - Supabase Schema
-- Supabase / PostgreSQL Migration Script
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS (profiles, linked to auth.users)
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
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
-- STOCK MOVEMENTS (audit trail for every stock change)
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
-- SETTINGS (singleton row)
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
-- BUSINESS LOGIC TRIGGERS
-- ============================================================

-- 1) After insert on sale_items -> decrease stock and log movement
create or replace function public.handle_sale_item_insert()
returns trigger language plpgsql as $$
declare
  cur_stock numeric(14,2);
  inv text;
begin
  select stock into cur_stock from public.products where id = new.product_id for update;
  if cur_stock is null then raise exception 'Product not found'; end if;
  if cur_stock < new.quantity then raise exception 'Insufficient stock for product %', new.product_id; end if;

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

-- 2) After insert on purchase_items -> increase stock and log movement
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

-- 3) After insert on sales -> increase customer balance by 'due'
create or replace function public.handle_sale_insert()
returns trigger language plpgsql as $$
declare new_bal numeric(14,2);
begin
  update public.customers set balance = balance + new.due, updated_at = now()
  where id = new.customer_id returning balance into new_bal;
  insert into public.customer_transactions (customer_id, type, amount, reference_id, reference_number, description, balance_after)
  values (new.customer_id, 'sale', new.total, new.id, new.invoice_number, 'Satış Faturası ' || new.invoice_number, new_bal);
  return new;
end; $$;

drop trigger if exists trg_sale_insert on public.sales;
create trigger trg_sale_insert
after insert on public.sales
for each row execute function public.handle_sale_insert();

-- 4) After insert on payments -> decrease customer balance
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
-- ROW LEVEL SECURITY POLICIES
-- ============================================================
-- All authenticated users can read everything.
-- Only admin users can write to settings and users tables.
-- Staff can create/modify operational data.

create or replace function public.is_admin() returns boolean language sql stable as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

-- Helper: shorthand policy creation
do $$ begin
  -- USERS: each user reads themselves, admin reads all; admin writes
  create policy users_read on public.users for select to authenticated using (id = auth.uid() or public.is_admin());
  create policy users_write on public.users for all to authenticated using (public.is_admin()) with check (public.is_admin());

  -- CATEGORIES / PRODUCTS / CUSTOMERS / SUPPLIERS: all authenticated can read & write
  create policy categories_all on public.categories for all to authenticated using (true) with check (true);
  create policy products_all on public.products for all to authenticated using (true) with check (true);
  create policy customers_all on public.customers for all to authenticated using (true) with check (true);
  create policy suppliers_all on public.suppliers for all to authenticated using (true) with check (true);

  -- SALES / PURCHASES + items
  create policy sales_all on public.sales for all to authenticated using (true) with check (true);
  create policy sale_items_all on public.sale_items for all to authenticated using (true) with check (true);
  create policy purchases_all on public.purchases for all to authenticated using (true) with check (true);
  create policy purchase_items_all on public.purchase_items for all to authenticated using (true) with check (true);

  -- LEDGERS & MOVEMENTS
  create policy stock_movements_all on public.stock_movements for all to authenticated using (true) with check (true);
  create policy customer_transactions_all on public.customer_transactions for all to authenticated using (true) with check (true);
  create policy payments_all on public.payments for all to authenticated using (true) with check (true);

  -- SETTINGS: read for all, write for admin
  create policy settings_read on public.settings for select to authenticated using (true);
  create policy settings_write on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null;
end $$;

-- ============================================================
-- STORAGE BUCKETS (run in Supabase Dashboard or via API)
-- ============================================================
-- create public bucket "product-images"
-- create public bucket "company-logos"

-- ============================================================
-- DEFAULT DATA
-- ============================================================
insert into public.settings (id, company_name, address, phone, email, tax_office, tax_number, currency, invoice_prefix, invoice_counter)
values ('company', 'Cactus Light & Sound', 'İstanbul, Türkiye', '+90 212 000 00 00', 'info@cactus.com', 'Beyoğlu', '1234567890', 'TRY', 'CLS', 1000)
on conflict (id) do nothing;

insert into public.categories (name) values
  ('Aydınlatma'),('Ses Sistemi'),('Mikser'),('Mikrofon'),('Hoparlör'),('Anfi'),('Kablo & Aksesuar')
on conflict do nothing;
