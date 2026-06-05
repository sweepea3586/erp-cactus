# Veritabanı Yapısı Dokümantasyonu

Cactus Light & Sound ERP veritabanı şemasının detaylı açıklaması. Tüm tablolar `public` schema'da yer alır ve **Row Level Security (RLS)** ile korunur.

## İlişki Diyagramı

```
                          auth.users  (Supabase)
                              │ 1:1
                          public.users  (admin/staff role)
                              │
        ┌──────────┐    ┌──────────────┐    ┌────────────────┐
        │categories│ 1─*│  products    │*───│   sale_items   │
        └──────────┘    └────┬─────────┘    └────┬───────────┘
                             │ *                 │ *
                             ▼                   ▼
                    ┌──────────────────┐   ┌─────────┐
                    │ stock_movements  │   │  sales  │
                    └──────────────────┘   └────┬────┘
                                                │ *
        ┌──────────┐    ┌─────────────────────┐ ▼
        │suppliers │    │     customers       │◄────┐
        └────┬─────┘    └──┬──────────────────┘     │
             │ *           │ *      *              │
        ┌────▼────────┐ ┌──▼────────┐ ┌────────────▼────────────┐
        │ purchases   │ │ payments  │ │ customer_transactions   │
        └────┬────────┘ └───────────┘ └─────────────────────────┘
             │ *
        ┌────▼──────────────┐
        │ purchase_items    │
        └───────────────────┘
```

---

## Tablolar

### `users`
Profil bilgileri. `auth.users` ile 1:1 eşleşir.

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | uuid (PK) | `auth.users.id` referansı |
| `username` | text (UNIQUE) | Sistem kullanıcı adı |
| `full_name` | text | Ad Soyad |
| `email` | text | E-posta |
| `role` | text | `admin` veya `staff` |
| `created_at` | timestamptz | Oluşturma |
| `updated_at` | timestamptz | Güncelleme |

**RLS**: Kullanıcı kendini okur; admin tüm kullanıcıları okur ve yazar.

---

### `categories`
Ürün kategorileri.

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | uuid (PK) | Otomatik |
| `name` | text | Kategori adı |
| `description` | text | Açıklama |

**RLS**: Tüm authenticated kullanıcılar okuyup yazabilir.

---

### `products`
Ürün kataloğu. Stok bilgisi burada tutulur.

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | uuid (PK) | Otomatik |
| `sku` | text (UNIQUE) | Ürün kodu |
| `barcode` | text | Barkod |
| `name` | text | Ürün adı |
| `brand` | text | Marka |
| `category_id` | uuid (FK) | `categories.id` |
| `purchase_price` | numeric(14,2) | Alış fiyatı |
| `selling_price` | numeric(14,2) | Satış fiyatı |
| `stock` | numeric(14,2) | Mevcut stok |
| `min_stock` | numeric(14,2) | Minimum stok seviyesi |
| `warehouse_location` | text | Depo konumu (ör: A-01-03) |
| `image_url` | text | Görsel URL'i |

**İndeksler**: `sku`, `barcode`, `category_id`, partial: `stock <= min_stock`

---

### `customers`
Müşteriler.

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | uuid (PK) | |
| `company_name` | text | Firma adı |
| `contact_person` | text | İlgili kişi |
| `phone`, `email`, `address` | text | İletişim |
| `tax_office`, `tax_number` | text | Vergi bilgileri |
| `balance` | numeric(14,2) | Cari bakiye (+ = bize borçlu) |
| `notes` | text | Notlar |

---

### `suppliers`
Tedarikçiler. `customers` tablosuyla aynı yapı.

---

### `sales` + `sale_items`
Satış faturaları ve kalemleri.

**`sales`**:
| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | uuid (PK) | |
| `invoice_number` | text (UNIQUE) | Otomatik: `CLS-YYYY-#####` |
| `customer_id` | uuid (FK) | `customers.id` |
| `subtotal`, `tax_rate`, `tax`, `total`, `paid`, `due` | numeric | Tutarlar |
| `notes` | text | |
| `user_id` | uuid (FK) | Satış yapan kullanıcı |

**`sale_items`**:
| Kolon | Tip |
|---|---|
| `id` | uuid (PK) |
| `sale_id` | uuid (FK, ON DELETE CASCADE) |
| `product_id` | uuid (FK) |
| `product_sku`, `product_name` | text (snapshot) |
| `quantity`, `unit_price`, `discount`, `line_total` | numeric |

**Trigger**: `sale_items` INSERT → `products.stock` azalır, `stock_movements` kaydı düşer. Yetersiz stokta EXCEPTION (rollback).
**Trigger**: `sales` INSERT → `customers.balance` artar (due kadar), `customer_transactions` kaydı düşer.

---

### `purchases` + `purchase_items`
Alım faturaları. `sales` ile aynı yapı, `supplier_id` kullanır.

**Trigger**: `purchase_items` INSERT → `products.stock` artar, `stock_movements` kaydı düşer.

---

### `stock_movements`
Tüm stok hareketlerinin **denetim izi** (audit trail).

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | uuid (PK) | |
| `product_id` | uuid (FK) | |
| `product_name` | text | Snapshot |
| `type` | text | `in` / `out` / `adjust` / `transfer` |
| `quantity` | numeric | Miktar |
| `reason` | text | Açıklama (ör: "Satış: CLS-2025-00001") |
| `reference_id` | uuid | İlgili satış/alım ID |
| `before_qty`, `after_qty` | numeric | Hareket öncesi/sonrası stok |
| `user_id`, `user_name` | | Hareketi yapan |

**İndeks**: `product_id`, `created_at desc`

---

### `customer_transactions`
Müşteri cari hesap defteri.

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | uuid (PK) | |
| `customer_id` | uuid (FK) | |
| `type` | text | `sale` / `payment` / `refund` / `adjust` |
| `amount` | numeric | Pozitif=borç, negatif=alacak |
| `reference_id`, `reference_number` | | İlgili fatura/ödeme |
| `description` | text | |
| `balance_after` | numeric | Hareket sonrası bakiye |

---

### `payments`
Tahsilatlar.

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | uuid (PK) | |
| `customer_id` | uuid (FK) | |
| `amount` | numeric | Tahsilat tutarı |
| `method` | text | `cash` / `card` / `transfer` / `check` / `other` |
| `reference_id`, `reference_number` | | İlgili fatura (varsa) |
| `notes` | text | |
| `user_id`, `user_name` | | |

**Trigger**: `payments` INSERT → `customers.balance` azalır, `customer_transactions` kaydı düşer.

---

### `settings`
Şirket ayarları (singleton, `id='company'`).

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | text (PK) | Sabit: `company` |
| `company_name`, `address`, `phone`, `email` | text | Şirket bilgileri |
| `tax_office`, `tax_number` | text | |
| `currency` | text | Varsayılan: `TRY` |
| `invoice_prefix` | text | Varsayılan: `CLS` |
| `invoice_counter` | int | Otomatik artan (1000'den başlar) |
| `logo_url` | text | |

**RLS**: Herkes okur, sadece admin yazar.

---

## İş Mantığı Trigger'ları

### 1. Satış → Otomatik Stok Düşüşü
```
sale_items INSERT
  → products.stock -= quantity (lock ile)
  → stock_movements'a 'out' kaydı
  → Yetersiz stok varsa EXCEPTION (transaction rollback)
```

### 2. Alım → Otomatik Stok Artışı
```
purchase_items INSERT
  → products.stock += quantity
  → stock_movements'a 'in' kaydı
```

### 3. Satış → Müşteri Bakiyesi
```
sales INSERT
  → customers.balance += due
  → customer_transactions'a 'sale' kaydı
```

### 4. Tahsilat → Bakiye Düşüşü
```
payments INSERT
  → customers.balance -= amount
  → customer_transactions'a 'payment' kaydı
```

---

## RLS Politikaları Özeti

| Tablo | Read | Write |
|---|---|---|
| `users` | self veya admin | admin |
| `settings` | authenticated | admin |
| Diğer tüm tablolar | authenticated | authenticated |

> Not: Bu MVP'de tüm operasyonel veriler authenticated kullanıcılara açıktır. Şube/depo bazında izolasyon için `branch_id` kolonu eklenip RLS buna göre yazılabilir.

---

## Storage Bucket'ları

| Bucket | Public | Yol Şablonu | Kullanım |
|---|---|---|---|
| `product-images` | ✅ | `{product_id}/{filename}` | Ürün görselleri |
| `company-logos` | ✅ | `logo.{ext}` | Şirket logosu |

**Public URL kalıbı**:
```
{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
```

---

## Veri Boyutu Tahminleri

| Tablo | Günlük Tahmini Satır | Yıllık |
|---|---|---|
| `products` | 5-10 yeni | ~3 bin |
| `customers` | 1-5 yeni | ~1 bin |
| `sales` | 20-50 | ~15 bin |
| `sale_items` | 60-150 | ~50 bin |
| `stock_movements` | 80-200 | ~70 bin |
| `customer_transactions` | 30-70 | ~25 bin |

Free Supabase planı (500 MB) ilk yıl için fazlasıyla yeterli.

---

## Uygulama Kodunda Kullanım Örnekleri

### Ürün listeleme (Server Component)
```ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

const supabase = createServerSupabaseClient()
const { data: products } = await supabase
  .from('products')
  .select('*, category:categories(name)')
  .order('created_at', { ascending: false })
```

### Satış oluşturma (Server Action - tek transaction)
```ts
'use server'
const { data: sale } = await supabase
  .from('sales')
  .insert({ customer_id, subtotal, tax, total, paid, due, invoice_number })
  .select().single()

// sale_items insert otomatik olarak stok+bakiye trigger'larını çalıştırır
await supabase.from('sale_items').insert(items.map(i => ({ ...i, sale_id: sale.id })))
```

### Ürün görseli upload
```ts
const { data } = await supabase.storage
  .from('product-images')
  .upload(`${productId}/${file.name}`, file, { upsert: true })

const url = supabase.storage.from('product-images').getPublicUrl(data.path).data.publicUrl
await supabase.from('products').update({ image_url: url }).eq('id', productId)
```
