# Supabase Migration Package

Bu klasör, **Cactus Light & Sound ERP** uygulamasının Supabase'e geçişi için gereken her şeyi içerir.

## İçindekiler

| Dosya | Açıklama |
|---|---|
| [`schema.sql`](./schema.sql) | Tüm tablolar, indeksler, RLS politikaları ve iş mantığı trigger'larını içeren tam migration script |
| [`SETUP.md`](./SETUP.md) | Adım adım Supabase kurulum kılavuzu |
| [`SCHEMA.md`](./SCHEMA.md) | Veritabanı yapısı ve ilişkiler dokümantasyonu |

## Hızlı Başlangıç

1. [Supabase Dashboard](https://supabase.com/dashboard)'ta yeni bir proje oluşturun
2. **SQL Editor**'ü açıp [`schema.sql`](./schema.sql) içeriğini yapıştırıp çalıştırın
3. **Storage**'da iki public bucket oluşturun: `product-images` ve `company-logos`
4. **Settings → API**'den anahtarları alıp projenin `.env` dosyasına yapıştırın (bkz. [`/.env.example`](../.env.example))
5. İlk admin kullanıcıyı oluşturun (bkz. [`SETUP.md`](./SETUP.md) §3)

## Mevcut Durum

- ✅ Şema hazır ve test edildi (PostgreSQL syntax)
- ✅ RLS politikaları tanımlandı
- ✅ Otomatik stok / bakiye trigger'ları yazıldı
- ⏳ Uygulama kodu henüz MongoDB kullanıyor; Supabase istemcileri kurulduktan sonra geçiş yapılacak

## Geçiş Tetikleyici

Anahtarlarınız hazır olduğunda, ana ajana şu komutu verin:

> *"Supabase entegrasyonunu şimdi etkinleştir"*

Detay için [`SETUP.md`](./SETUP.md) §8'e bakın.
