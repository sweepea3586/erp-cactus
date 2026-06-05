# Cactus Light & Sound ERP

Türkçe arayüzlü, modern ERP sistemi. İthalat & dağıtım işletmeleri için.

## Özellikler

- 🔐 **Kimlik Doğrulama**: Admin / Personel rolleri (cookie session)
- 📊 **Dashboard**: Stok değeri, satış trendi, düşük stok uyarıları
- 📦 **Ürün Yönetimi**: CRUD, SKU/barkod, kategori, depo konumu
- 👥 **Müşteri Yönetimi**: CRUD, cari hesap, tahsilat
- 🧾 **Satışlar**: Çoklu kalemli fatura, otomatik stok+bakiye güncellemesi, yazdırma/PDF
- 📋 **Stok**: Tüm hareketler için audit trail, manuel düzeltme
- 💰 **Cari Hesap**: Toplam alacaklar, müşteri bakiyeleri
- 📈 **Raporlar**: Brüt kâr, en çok satan ürünler
- ⚙️ **Ayarlar**: Şirket bilgileri, fatura ayarları

## Teknoloji

- **Next.js 14** App Router, JavaScript
- **Tailwind CSS** + **shadcn/ui**
- **MongoDB** (aktif) → **Supabase** (hazır, geçişe planlı)
- **recharts** grafikler
- **SWR** istemci taraflı veri yönetimi

## Geliştirme

```bash
yarn install
yarn dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışır.

## Demo Hesaplar

Uygulama ilk çalıştığında otomatik olarak hazırlanır:

| Rol | Kullanıcı adı | Şifre |
|---|---|---|
| Yönetici | `admin` | `admin123` |
| Personel | `personel` | `personel123` |

## Ortam Değişkenleri

`/.env.example` dosyasını `.env` olarak kopyalayıp doldurun.

## Supabase Geçişi

Tüm migration script, kurulum kılavuzu ve dokümantasyon:

- [`/supabase/README.md`](./supabase/README.md) - Genel bakış
- [`/supabase/SETUP.md`](./supabase/SETUP.md) - Adım adım kurulum
- [`/supabase/SCHEMA.md`](./supabase/SCHEMA.md) - Veritabanı yapısı
- [`/supabase/schema.sql`](./supabase/schema.sql) - SQL migration

Anahtarlarınız hazır olunca, ana ajana **"Supabase entegrasyonunu şimdi etkinleştir"** deyin.

## Klasör Yapısı

```
/app
├── app/
│   ├── (app)/                # Korumalı sayfalar (login gerektirir)
│   │   ├── dashboard/
│   │   ├── urunler/
│   │   ├── musteriler/
│   │   ├── satislar/[id]/, yeni/
│   │   ├── stok/, tedarikciler/, alimlar/
│   │   ├── cari/, raporlar/, ayarlar/
│   │   └── layout.js         # AppShell wrap
│   ├── api/[[...path]]/      # Tüm backend
│   ├── login/
│   ├── layout.js, page.js
├── components/
│   ├── app-shell.js          # Sidebar + Topbar
│   └── ui/                   # shadcn components
├── lib/
│   ├── db.js                 # MongoDB connection + seed
│   ├── auth.js               # Cookie session helpers
│   └── format.js             # Türkçe formatters
├── supabase/                 # 🚀 Supabase migration paketi
│   ├── schema.sql
│   ├── README.md
│   ├── SETUP.md
│   └── SCHEMA.md
├── middleware.js             # Auth protection
└── .env.example
```
