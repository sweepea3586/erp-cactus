# 🚀 SUPABASE HIZLI KURULUM (3 DAKİKA)

Uygulamayı tam çalışır hale getirmek için aşağıdaki **3 adımı** Supabase Dashboard'da yapın.

> 📍 Dashboard: https://supabase.com/dashboard/project/hmrcxzyxzioxdkgepiew

---

## ✅ ADIM 1 — Şemayı Yükle (1 dakika)

1. Sol menüden **SQL Editor**'a girin
2. **+ New query**'e tıklayın
3. `/app/supabase/schema.sql` dosyasının **tüm içeriğini** yapıştırın
4. ▶️ **Run** butonuna basın

> ✅ Sonuç: "Success. No rows returned" — tablolar, trigger'lar, RLS politikaları, Storage bucket'ları oluştu.

---

## ✅ ADIM 2 — E-posta Onayını Kapat (15 saniye)

İlk kullanım için en pratik yol:

1. Sol menü → **Authentication → Providers**
2. **Email** kartına tıklayın
3. **"Confirm email"** seçeneğini ❌ **KAPATIN**
4. **Save** butonuna basın

> Alternatif: Açık bırakıp her kullanıcı için gelen e-postadan onay linkine tıklayabilirsiniz.

---

## ✅ ADIM 3 — Mevcut admin@cactus.com kullanıcısını sil ve yeniden oluştur (30 saniye)

Daha önce oluşturulan kullanıcı doğrulanmamış. Yenisini şöyle yaparız:

1. **Authentication → Users**
2. `admin@cactus.com` satırını bulun → 3 nokta menüsü → **Delete user**
3. ✅ Şimdi `/login` sayfasında **"Hesabınız yok mu? Kayıt olun"** linkine tıklayıp yeni hesap oluşturun
   - E-posta: `admin@cactus.com` (veya başka)
   - Şifre: en az 6 karakter
   - Ad Soyad: serbest

> 🎯 **İlk kayıt olan kullanıcı OTOMATİK olarak admin yetkisine sahip olur** (schema'daki trigger sayesinde).

---

## 🎉 Tamamlandı!

Artık tüm modüller çalışıyor:
- ✅ Giriş / Kayıt
- ✅ Ürünler (görsel yükleme dahil)
- ✅ Müşteriler + Tahsilat
- ✅ Satış faturası (otomatik stok düşüşü + bakiye)
- ✅ Stok hareketleri (audit trail)
- ✅ Dashboard
- ✅ Cari hesap
- ✅ Raporlar
- ✅ Ayarlar (logo yükleme dahil)

---

## ❓ Sorun Yaşarsanız

| Hata | Çözüm |
|---|---|
| "Email not confirmed" | Adım 2'yi yapın, sonra kullanıcıyı sil + yeniden kayıt |
| "permission denied" | Adım 1'i tekrar çalıştırın (idempotent, zararsız) |
| "Bucket not found" | Adım 1'i tekrar çalıştırın — bucket'lar otomatik oluşur |
| Login çalışmıyor | F5 → tarayıcı çerezlerini temizleyin |

---

## 🔐 Servis Anahtarı (Opsiyonel)

Şu an **Publishable Key** ile her şey çalışıyor. İleride server-side admin işlemleri için **Secret Key** istenirse:

1. **Settings → API → Project API Keys**
2. **service_role** veya **secret key** değerini kopyalayın
3. `/app/.env` dosyasına ekleyin:
   ```
   SUPABASE_SECRET_KEY=sb_secret_...
   ```
4. Ajana iletin
