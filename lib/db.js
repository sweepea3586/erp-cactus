import { MongoClient } from 'mongodb'

let client
let db
let seeded = false

export async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME || 'cactus_erp')
  }
  if (!seeded) {
    seeded = true
    try { await seedDefaults(db) } catch (e) { console.error('Seed error:', e) }
  }
  return db
}

async function seedDefaults(db) {
  const { hashPassword } = await import('./auth.js')

  // Default admin user
  const usersCount = await db.collection('users').countDocuments()
  if (usersCount === 0) {
    const { v4: uuidv4 } = await import('uuid')
    await db.collection('users').insertOne({
      id: uuidv4(),
      username: 'admin',
      full_name: 'Sistem Yöneticisi',
      email: 'admin@cactus.com',
      role: 'admin',
      password_hash: hashPassword('admin123'),
      created_at: new Date(),
    })
    await db.collection('users').insertOne({
      id: uuidv4(),
      username: 'personel',
      full_name: 'Personel Kullanıcı',
      email: 'personel@cactus.com',
      role: 'staff',
      password_hash: hashPassword('personel123'),
      created_at: new Date(),
    })
  }

  // Default categories
  const catCount = await db.collection('categories').countDocuments()
  if (catCount === 0) {
    const { v4: uuidv4 } = await import('uuid')
    const cats = ['Aydınlatma', 'Ses Sistemi', 'Mikser', 'Mikrofon', 'Hoparlör', 'Anfi', 'Kablo & Aksesuar']
    await db.collection('categories').insertMany(cats.map(name => ({ id: uuidv4(), name, created_at: new Date() })))
  }

  // Default settings
  const settings = await db.collection('settings').findOne({ id: 'company' })
  if (!settings) {
    await db.collection('settings').insertOne({
      id: 'company',
      company_name: 'Cactus Light & Sound',
      address: 'İstanbul, Türkiye',
      phone: '+90 212 000 00 00',
      email: 'info@cactus.com',
      tax_office: 'Beyoğlu',
      tax_number: '1234567890',
      currency: 'TRY',
      invoice_prefix: 'CLS',
      invoice_counter: 1000,
      logo_url: '',
    })
  }

  // Demo data: a couple of products and customers if empty
  const productsCount = await db.collection('products').countDocuments()
  if (productsCount === 0) {
    const { v4: uuidv4 } = await import('uuid')
    const sampleCategory = await db.collection('categories').findOne({ name: 'Hoparlör' })
    const sampleCategory2 = await db.collection('categories').findOne({ name: 'Aydınlatma' })
    await db.collection('products').insertMany([
      {
        id: uuidv4(), sku: 'HP-001', barcode: '8690000000011', name: 'JBL EON 715 Aktif Hoparlör',
        brand: 'JBL', category_id: sampleCategory?.id, category_name: 'Hoparlör',
        purchase_price: 18500, selling_price: 26500, stock: 12, min_stock: 3,
        warehouse_location: 'A-01-03', image_url: '', created_at: new Date(),
      },
      {
        id: uuidv4(), sku: 'HP-002', barcode: '8690000000028', name: 'Mackie Thump 215 Aktif Hoparlör',
        brand: 'Mackie', category_id: sampleCategory?.id, category_name: 'Hoparlör',
        purchase_price: 12000, selling_price: 17800, stock: 8, min_stock: 4,
        warehouse_location: 'A-01-04', image_url: '', created_at: new Date(),
      },
      {
        id: uuidv4(), sku: 'LED-101', barcode: '8690000000035', name: 'Moving Head LED 230W',
        brand: 'CactusPro', category_id: sampleCategory2?.id, category_name: 'Aydınlatma',
        purchase_price: 8500, selling_price: 13900, stock: 2, min_stock: 5,
        warehouse_location: 'B-02-01', image_url: '', created_at: new Date(),
      },
      {
        id: uuidv4(), sku: 'LED-102', barcode: '8690000000042', name: 'PAR LED 18x18W RGBWA+UV',
        brand: 'CactusPro', category_id: sampleCategory2?.id, category_name: 'Aydınlatma',
        purchase_price: 2200, selling_price: 3850, stock: 25, min_stock: 10,
        warehouse_location: 'B-02-04', image_url: '', created_at: new Date(),
      },
    ])
  }

  const customersCount = await db.collection('customers').countDocuments()
  if (customersCount === 0) {
    const { v4: uuidv4 } = await import('uuid')
    await db.collection('customers').insertMany([
      { id: uuidv4(), company_name: 'Yıldız Organizasyon Ltd.', contact_person: 'Mehmet Yıldız',
        phone: '+90 532 111 22 33', email: 'info@yildizorg.com', address: 'Şişli, İstanbul',
        tax_office: 'Şişli', tax_number: '9876543210', balance: 0, notes: 'Düzenli müşteri', created_at: new Date() },
      { id: uuidv4(), company_name: 'Anadolu Ses Sistemleri A.Ş.', contact_person: 'Ayşe Demir',
        phone: '+90 533 222 33 44', email: 'ayse@anadoluses.com', address: 'Çankaya, Ankara',
        tax_office: 'Çankaya', tax_number: '1122334455', balance: 12500, notes: '', created_at: new Date() },
      { id: uuidv4(), company_name: 'Ege Tiyatro Sahne', contact_person: 'Kemal Akar',
        phone: '+90 534 333 44 55', email: 'kemal@egetiyatro.com', address: 'Bornova, İzmir',
        tax_office: 'Bornova', tax_number: '5566778899', balance: 0, notes: '', created_at: new Date() },
    ])
  }
}
