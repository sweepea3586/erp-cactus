-- ============================================================
-- Cactus ERP - Patch v2 (Eksik Triggerlar + RPC + Storage)
-- Önceki schema'yı koruyarak eksik kısımları ekler.
-- Idempotent: tekrar tekrar güvenle çalıştırılabilir.
-- ============================================================

-- 1) Auto-create public.users from auth.users (first user = admin)
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

-- 2) Backfill: mevcut auth.users içindekiler için public.users oluştur
insert into public.users (id, username, full_name, email, role)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
  coalesce(au.raw_user_meta_data->>'full_name', au.email),
  au.email,
  case
    when (select count(*) from public.users) = 0 then 'admin'
    else 'staff'
  end
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

-- İlk kullanıcıyı admin yap (eğer hiç admin yoksa)
update public.users
set role = 'admin'
where id = (select id from public.users order by created_at asc limit 1)
and not exists (select 1 from public.users where role = 'admin');

-- 3) Invoice number generator RPC
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

grant execute on function public.next_invoice_number() to authenticated;

-- 4) Storage buckets (idempotent)
insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- 5) Storage policies
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

-- 6) Sale trigger: balance += total (not due) - so payment trigger works correctly
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

-- 7) is_admin SECURITY DEFINER (recursion önlemi)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- 8) customer_name kolonu sales tablosunda yoksa ekle
alter table public.sales add column if not exists customer_name text;
alter table public.sales add column if not exists user_name text;

-- Tamamlandı! Test için: select public.next_invoice_number();
