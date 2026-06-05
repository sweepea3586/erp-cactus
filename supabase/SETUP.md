# Supabase Kurulum Kılavuzu

Bu kılavuz, **Cactus Light & Sound ERP**'yi Supabase ile devreye almak için gereken tüm adımları içerir.

---

## 1. Supabase Projesi Oluşturma

1. [https://supabase.com/dashboard](https://supabase.com/dashboard) adresine gidin.
2. **New project** → organizasyon seçin.
3. Aşağıdaki bilgileri girin:
   - **Name**: `cactus-erp` (önerilen)
   - **Database Password**: Güçlü bir şifre belirleyin ve güvenli yerde saklayın
   - **Region**: Türkiye'ye en yakın: `eu-central-1` (Frankfurt) veya `eu-west-1` (İrlanda)
   - **Pricing Plan**: Başlangıç için **Free** yeterli
4. **Create new project** → 1-2 dakika bekleyin.

---

## 2. Şema Yükleme

1. Sol menüden **SQL Editor**'ü açın.
2. **+ New query** → [`schema.sql`](./schema.sql) dosyasının tüm içeriğini kopyalayın.
3. **Run** (▶️) butonuna basın.
4. Sol menüden **Table Editor**'a girip tüm tabloların oluştuğunu doğrulayın:
   - `users`, `categories`, `products`, `customers`, `suppliers`
   - `sales`, `sale_items`, `purchases`, `purchase_items`
   - `stock_movements`, `customer_transactions`, `payments`, `settings`

### CLI ile (alternatif)

```bash
npm i -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
psql "$DATABASE_URL" -f supabase/schema.sql
```

---

## 3. İlk Admin Kullanıcıyı Oluşturma

Supabase Auth, `auth.users` tablosunu kullanır. Bizim `public.users` tablomuz buna FK ile bağlıdır.

1. Sol menüden **Authentication → Users**'a girin.
2. **Add user → Create new user**:
   - Email: `admin@cactus.com`
   - Password: Güçlü bir şifre
   - **Auto Confirm User**: ✅ (geliştirme için)
3. Oluşturulan kullanıcının **User UID**'sini kopyalayın.
4. **SQL Editor**'de aşağıdaki sorguyu çalıştırın (UID'yi değiştirin):

```sql
insert into public.users (id, username, full_name, email, role)
values (
  '<USER_UID_HERE>',
  'admin',
  'Sistem Yöneticisi',
  'admin@cactus.com',
  'admin'
);
```

---

## 4. Storage Bucket'ları Oluşturma

1. Sol menüden **Storage**'a girin.
2. **New bucket** → aşağıdakileri oluşturun:

| Bucket Adı | Public | Kullanım |
|---|---|---|
| `product-images` | ✅ Evet | Ürün görselleri |
| `company-logos` | ✅ Evet | Şirket logosu |

3. Her bucket için **Policies** sekmesinde aşağıdaki politikaları ekleyin:

```sql
-- Authenticated users can upload to both buckets
create policy "Authenticated uploads"
on storage.objects for insert to authenticated
with check (bucket_id in ('product-images', 'company-logos'));

create policy "Authenticated update"
on storage.objects for update to authenticated
using (bucket_id in ('product-images', 'company-logos'));

create policy "Authenticated delete"
on storage.objects for delete to authenticated
using (bucket_id in ('product-images', 'company-logos'));

-- Public read is automatic for public buckets
```

---

## 5. API Anahtarlarını Toplama

1. **Settings → API** menüsüne girin.
2. Aşağıdaki değerleri kopyalayıp projenin `.env` dosyasına yapıştırın:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...        # Project API keys -> anon
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...            # Project API keys -> service_role (GİZLİ!)
```

⚠️ **GÜVENLİK UYARISI:**
- `service_role` anahtarı tüm RLS politikalarını bypass eder.
- Bu anahtarı **asla** frontend koda veya `NEXT_PUBLIC_*` prefix'li bir env'e koymayın.
- Sadece API route'ları ve Server Action'larda kullanın.

---

## 6. Auth Ayarları

1. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (geliştirme) veya canlı alan adınız
   - **Redirect URLs**: `http://localhost:3000/**` + canlı alan adı/**

2. **Authentication → Providers → Email**:
   - **Enable Email signup**: ✅
   - **Confirm email**: Geliştirmede kapatabilir, prod'da açık tutun

3. **Authentication → Email Templates**:
   - **Confirm signup** şablonunda `{{ .ConfirmationURL }}` yerine:
     ```
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
     ```

---

## 7. (Opsiyonel) Realtime Açma

Eğer canlı güncellemeler istiyorsanız (örneğin yeni satış bildirimi):

1. **Database → Replication** → `supabase_realtime` publication'una şu tabloları ekleyin:
   - `sales`, `products`, `stock_movements`

---

## 8. Uygulama Tarafında Geçiş

Anahtarlar hazır olduğunda ana ajana şunu söyleyin:

> *"Supabase entegrasyonunu şimdi etkinleştir"*

Ajan aşağıdakileri yapacak:

1. `@supabase/supabase-js` ve `@supabase/ssr` paketlerini kuracak
2. `/lib/supabase/` altında browser, server ve middleware istemcilerini oluşturacak
3. Mevcut API route'ları Supabase çağrılarına çevirecek
4. Login sayfasını Supabase Auth ile entegre edecek
5. Ürün/logo upload özelliklerini Storage ile aktif edecek
6. MongoDB bağımlılığını kaldıracak

---

## 9. Veri Taşıma (MongoDB → Supabase)

Eğer mevcut MongoDB'deki veriyi de Supabase'e taşımak isterseniz, ana ajan migration scripti yazabilir:

```bash
# Mongo'dan döküm al
mongoexport --uri=$MONGO_URL --db=cactus_erp --collection=products --out=/tmp/products.json
mongoexport --uri=$MONGO_URL --db=cactus_erp --collection=customers --out=/tmp/customers.json
# ... diğer koleksiyonlar

# Sonra Supabase JS client veya psql ile yükle
```

Detaylı migration için ana ajana isteğinizi belirtin.

---

## 10. Sorun Giderme

| Sorun | Çözüm |
|---|---|
| `permission denied for table xxx` | RLS politikası eksik, `schema.sql`'i tekrar çalıştırın |
| `auth.uid()` null dönüyor | İstek auth header'ı olmadan geliyor; anon yerine authenticated kullanın |
| Trigger çalışmıyor | `service_role` ile test edin |
| Storage upload 403 | Bucket policy'sini kontrol edin (§4) |
| Login redirect döngüsü | Site URL ve Redirect URL'lerin tam eşleşmesi gerekir |
| `relation does not exist` | Şema yüklenmemiş, §2'yi tekrarlayın |

---

## 11. Kontrol Listesi

Geçişe başlamadan önce:

- [ ] Supabase projesi oluşturuldu
- [ ] `schema.sql` çalıştırıldı, tüm tablolar listeleniyor
- [ ] İlk admin kullanıcı `auth.users` + `public.users`'a eklendi
- [ ] `product-images` ve `company-logos` bucket'ları oluşturuldu
- [ ] Storage policies eklendi
- [ ] `.env` dosyasında 3 Supabase anahtarı dolu
- [ ] Site URL ve Redirect URL'leri ayarlandı

Listenin tamamı tikli ise → ana ajana **"Supabase entegrasyonunu şimdi etkinleştir"** deyin.
