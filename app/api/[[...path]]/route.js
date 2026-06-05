import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db'
import {
  verifyPassword, hashPassword, setSessionCookie,
  clearSessionCookie, getCurrentUser,
} from '@/lib/auth'

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}

function ok(data, status = 200) { return cors(NextResponse.json(data, { status })) }
function fail(message, status = 400) { return cors(NextResponse.json({ error: message }, { status })) }
function clean(doc) { if (!doc) return doc; const { _id, password_hash, ...r } = doc; return r }
function cleanList(list) { return list.map(clean) }

export async function OPTIONS() { return cors(new NextResponse(null, { status: 200 })) }

async function nextInvoiceNumber(db) {
  const settings = await db.collection('settings').findOne({ id: 'company' })
  const prefix = settings?.invoice_prefix || 'CLS'
  const counter = (settings?.invoice_counter || 1000) + 1
  await db.collection('settings').updateOne({ id: 'company' }, { $set: { invoice_counter: counter } })
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${String(counter).padStart(5, '0')}`
}

async function logStockMovement(db, payload) {
  await db.collection('stock_movements').insertOne({
    id: uuidv4(),
    created_at: new Date(),
    ...payload,
  })
}

async function handle(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await getDb()

    // ===================== AUTH =====================
    if (route === '/auth/login' && method === 'POST') {
      const { username, password } = await request.json()
      if (!username || !password) return fail('Kullanıcı adı ve şifre zorunludur')
      const user = await db.collection('users').findOne({ username })
      if (!user || !verifyPassword(password, user.password_hash)) {
        return fail('Hatalı kullanıcı adı veya şifre', 401)
      }
      setSessionCookie(user.id)
      return ok({ user: clean(user) })
    }

    if (route === '/auth/logout' && method === 'POST') {
      clearSessionCookie()
      return ok({ success: true })
    }

    if (route === '/auth/me' && method === 'GET') {
      const user = await getCurrentUser()
      if (!user) return fail('Unauthorized', 401)
      return ok({ user })
    }

    // Protect everything below
    const me = await getCurrentUser()
    if (!me) return fail('Unauthorized', 401)

    // ===================== DASHBOARD =====================
    if (route === '/dashboard/stats' && method === 'GET') {
      const products = await db.collection('products').find({}).toArray()
      const totalStockValue = products.reduce((s, p) => s + (p.purchase_price || 0) * (p.stock || 0), 0)
      const totalProducts = products.length
      const lowStock = products.filter(p => (p.stock || 0) <= (p.min_stock || 0))
      const totalCustomers = await db.collection('customers').countDocuments()
      const customers = await db.collection('customers').find({}).toArray()
      const totalReceivables = customers.reduce((s, c) => s + (c.balance || 0), 0)

      const startOfMonth = new Date()
      startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
      const sales = await db.collection('sales').find({}).sort({ created_at: -1 }).toArray()
      const monthlySales = sales.filter(s => new Date(s.created_at) >= startOfMonth)
        .reduce((s, x) => s + (x.total || 0), 0)

      // Daily series for last 30 days
      const series = []
      for (let i = 29; i >= 0; i--) {
        const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - i)
        const next = new Date(day); next.setDate(next.getDate() + 1)
        const total = sales.filter(s => new Date(s.created_at) >= day && new Date(s.created_at) < next)
          .reduce((sum, x) => sum + (x.total || 0), 0)
        series.push({ date: day.toISOString().slice(0, 10), total })
      }

      const recentSales = sales.slice(0, 5).map(clean)
      return ok({
        totalStockValue, totalProducts, totalCustomers, monthlySales,
        totalReceivables, lowStockCount: lowStock.length,
        lowStock: cleanList(lowStock).slice(0, 10),
        recentSales, series,
      })
    }

    // ===================== CATEGORIES =====================
    if (route === '/categories' && method === 'GET') {
      const items = await db.collection('categories').find({}).sort({ name: 1 }).toArray()
      return ok(cleanList(items))
    }
    if (route === '/categories' && method === 'POST') {
      const body = await request.json()
      const item = { id: uuidv4(), name: body.name, created_at: new Date() }
      await db.collection('categories').insertOne(item)
      return ok(clean(item))
    }

    // ===================== PRODUCTS =====================
    if (route === '/products' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')
      const filter = q ? { $or: [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
      ] } : {}
      const items = await db.collection('products').find(filter).sort({ created_at: -1 }).toArray()
      return ok(cleanList(items))
    }
    if (route === '/products' && method === 'POST') {
      const b = await request.json()
      if (!b.name || !b.sku) return fail('Ad ve SKU zorunlu')
      const cat = b.category_id ? await db.collection('categories').findOne({ id: b.category_id }) : null
      const item = {
        id: uuidv4(),
        sku: b.sku, barcode: b.barcode || '',
        name: b.name, brand: b.brand || '',
        category_id: b.category_id || null, category_name: cat?.name || '',
        purchase_price: Number(b.purchase_price || 0),
        selling_price: Number(b.selling_price || 0),
        stock: Number(b.stock || 0),
        min_stock: Number(b.min_stock || 0),
        warehouse_location: b.warehouse_location || '',
        image_url: b.image_url || '',
        created_at: new Date(),
      }
      await db.collection('products').insertOne(item)
      if (item.stock > 0) {
        await logStockMovement(db, {
          product_id: item.id, product_name: item.name, type: 'in',
          quantity: item.stock, reason: 'Açılış stok', user_id: me.id, user_name: me.full_name,
        })
      }
      return ok(clean(item))
    }
    if (route.startsWith('/products/') && method === 'GET') {
      const id = route.split('/')[2]
      const sub = route.split('/')[3]
      if (sub === 'movements') {
        const items = await db.collection('stock_movements').find({ product_id: id }).sort({ created_at: -1 }).toArray()
        return ok(cleanList(items))
      }
      const item = await db.collection('products').findOne({ id })
      if (!item) return fail('Bulunamadı', 404)
      return ok(clean(item))
    }
    if (route.startsWith('/products/') && method === 'PUT') {
      const id = route.split('/')[2]
      const b = await request.json()
      const cat = b.category_id ? await db.collection('categories').findOne({ id: b.category_id }) : null
      const update = {
        sku: b.sku, barcode: b.barcode || '',
        name: b.name, brand: b.brand || '',
        category_id: b.category_id || null, category_name: cat?.name || '',
        purchase_price: Number(b.purchase_price || 0),
        selling_price: Number(b.selling_price || 0),
        min_stock: Number(b.min_stock || 0),
        warehouse_location: b.warehouse_location || '',
        image_url: b.image_url || '',
        updated_at: new Date(),
      }
      await db.collection('products').updateOne({ id }, { $set: update })
      return ok({ success: true })
    }
    if (route.startsWith('/products/') && method === 'DELETE') {
      const id = route.split('/')[2]
      await db.collection('products').deleteOne({ id })
      return ok({ success: true })
    }

    // ===================== STOCK ADJUSTMENT =====================
    if (route === '/stock/adjust' && method === 'POST') {
      const b = await request.json()
      const p = await db.collection('products').findOne({ id: b.product_id })
      if (!p) return fail('Ürün bulunamadı', 404)
      const qty = Number(b.quantity || 0)
      const type = b.type // 'in' | 'out' | 'adjust'
      let newStock = p.stock
      if (type === 'in') newStock += qty
      else if (type === 'out') newStock -= qty
      else if (type === 'adjust') newStock = qty
      if (newStock < 0) return fail('Stok negatif olamaz')
      await db.collection('products').updateOne({ id: p.id }, { $set: { stock: newStock } })
      await logStockMovement(db, {
        product_id: p.id, product_name: p.name, type, quantity: qty,
        reason: b.reason || (type === 'in' ? 'Stok girişi' : type === 'out' ? 'Stok çıkışı' : 'Stok sayımı'),
        user_id: me.id, user_name: me.full_name, before: p.stock, after: newStock,
      })
      return ok({ success: true, stock: newStock })
    }

    if (route === '/stock/movements' && method === 'GET') {
      const items = await db.collection('stock_movements').find({}).sort({ created_at: -1 }).limit(500).toArray()
      return ok(cleanList(items))
    }

    // ===================== CUSTOMERS =====================
    if (route === '/customers' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')
      const filter = q ? { $or: [
        { company_name: { $regex: q, $options: 'i' } },
        { contact_person: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ] } : {}
      const items = await db.collection('customers').find(filter).sort({ company_name: 1 }).toArray()
      return ok(cleanList(items))
    }
    if (route === '/customers' && method === 'POST') {
      const b = await request.json()
      if (!b.company_name) return fail('Firma adı zorunlu')
      const item = {
        id: uuidv4(),
        company_name: b.company_name,
        contact_person: b.contact_person || '',
        phone: b.phone || '', email: b.email || '', address: b.address || '',
        tax_office: b.tax_office || '', tax_number: b.tax_number || '',
        balance: Number(b.balance || 0), notes: b.notes || '',
        created_at: new Date(),
      }
      await db.collection('customers').insertOne(item)
      return ok(clean(item))
    }
    if (route.startsWith('/customers/') && method === 'GET') {
      const id = route.split('/')[2]
      const sub = route.split('/')[3]
      if (sub === 'transactions') {
        const items = await db.collection('customer_transactions').find({ customer_id: id }).sort({ created_at: -1 }).toArray()
        return ok(cleanList(items))
      }
      const item = await db.collection('customers').findOne({ id })
      if (!item) return fail('Bulunamadı', 404)
      return ok(clean(item))
    }
    if (route.startsWith('/customers/') && method === 'PUT') {
      const id = route.split('/')[2]
      const b = await request.json()
      const update = {
        company_name: b.company_name,
        contact_person: b.contact_person || '',
        phone: b.phone || '', email: b.email || '', address: b.address || '',
        tax_office: b.tax_office || '', tax_number: b.tax_number || '',
        notes: b.notes || '',
        updated_at: new Date(),
      }
      await db.collection('customers').updateOne({ id }, { $set: update })
      return ok({ success: true })
    }
    if (route.startsWith('/customers/') && method === 'DELETE') {
      const id = route.split('/')[2]
      await db.collection('customers').deleteOne({ id })
      return ok({ success: true })
    }

    // ===================== SALES =====================
    if (route === '/sales' && method === 'GET') {
      const items = await db.collection('sales').find({}).sort({ created_at: -1 }).toArray()
      return ok(cleanList(items))
    }
    if (route === '/sales' && method === 'POST') {
      const b = await request.json()
      const customer = await db.collection('customers').findOne({ id: b.customer_id })
      if (!customer) return fail('Müşteri bulunamadı', 400)
      if (!Array.isArray(b.items) || b.items.length === 0) return fail('En az bir ürün ekleyin')

      // Validate stock
      const enriched = []
      for (const it of b.items) {
        const p = await db.collection('products').findOne({ id: it.product_id })
        if (!p) return fail('Ürün bulunamadı: ' + it.product_id)
        const qty = Number(it.quantity || 0)
        if (qty <= 0) return fail('Adet 0\'dan büyük olmalı: ' + p.name)
        if (qty > p.stock) return fail(`Yetersiz stok: ${p.name} (mevcut: ${p.stock})`)
        const unit_price = Number(it.unit_price ?? p.selling_price)
        const discount = Number(it.discount || 0)
        const line_total = (unit_price * qty) * (1 - discount / 100)
        enriched.push({
          product_id: p.id, product_sku: p.sku, product_name: p.name,
          quantity: qty, unit_price, discount, line_total,
        })
      }

      const subtotal = enriched.reduce((s, x) => s + x.line_total, 0)
      const taxRate = Number(b.tax_rate ?? 20)
      const tax = subtotal * (taxRate / 100)
      const total = subtotal + tax
      const paid = Number(b.paid || 0)
      const due = total - paid

      const invoice_number = await nextInvoiceNumber(db)
      const sale = {
        id: uuidv4(),
        invoice_number,
        customer_id: customer.id,
        customer_name: customer.company_name,
        items: enriched,
        subtotal, tax_rate: taxRate, tax, total,
        paid, due,
        notes: b.notes || '',
        user_id: me.id, user_name: me.full_name,
        created_at: new Date(),
      }
      await db.collection('sales').insertOne(sale)

      // Update stock
      for (const it of enriched) {
        const p = await db.collection('products').findOne({ id: it.product_id })
        const newStock = p.stock - it.quantity
        await db.collection('products').updateOne({ id: it.product_id }, { $set: { stock: newStock } })
        await logStockMovement(db, {
          product_id: it.product_id, product_name: it.product_name,
          type: 'out', quantity: it.quantity,
          reason: `Satış: ${invoice_number}`, reference_id: sale.id,
          user_id: me.id, user_name: me.full_name, before: p.stock, after: newStock,
        })
      }

      // Update customer balance
      const newBalance = (customer.balance || 0) + due
      await db.collection('customers').updateOne({ id: customer.id }, { $set: { balance: newBalance } })
      await db.collection('customer_transactions').insertOne({
        id: uuidv4(), customer_id: customer.id,
        type: 'sale', amount: total,
        reference_id: sale.id, reference_number: invoice_number,
        description: `Satış Faturası ${invoice_number}`,
        balance_after: newBalance,
        created_at: new Date(),
      })
      if (paid > 0) {
        await db.collection('payments').insertOne({
          id: uuidv4(), customer_id: customer.id,
          amount: paid, reference_id: sale.id, reference_number: invoice_number,
          method: 'cash', notes: 'Satışla birlikte tahsilat',
          user_id: me.id, user_name: me.full_name, created_at: new Date(),
        })
        await db.collection('customer_transactions').insertOne({
          id: uuidv4(), customer_id: customer.id,
          type: 'payment', amount: -paid,
          reference_id: sale.id, reference_number: invoice_number,
          description: `Tahsilat ${invoice_number}`,
          balance_after: newBalance,
          created_at: new Date(),
        })
      }

      return ok(clean(sale))
    }
    if (route.startsWith('/sales/') && method === 'GET') {
      const id = route.split('/')[2]
      const item = await db.collection('sales').findOne({ id })
      if (!item) return fail('Bulunamadı', 404)
      const customer = await db.collection('customers').findOne({ id: item.customer_id })
      const settings = await db.collection('settings').findOne({ id: 'company' })
      return ok({ sale: clean(item), customer: clean(customer), settings: clean(settings) })
    }

    // ===================== PAYMENTS =====================
    if (route === '/payments' && method === 'POST') {
      const b = await request.json()
      const customer = await db.collection('customers').findOne({ id: b.customer_id })
      if (!customer) return fail('Müşteri bulunamadı', 404)
      const amount = Number(b.amount || 0)
      if (amount <= 0) return fail('Tutar geçersiz')
      const payment = {
        id: uuidv4(), customer_id: customer.id,
        amount, method: b.method || 'cash', notes: b.notes || '',
        user_id: me.id, user_name: me.full_name, created_at: new Date(),
      }
      await db.collection('payments').insertOne(payment)
      const newBalance = (customer.balance || 0) - amount
      await db.collection('customers').updateOne({ id: customer.id }, { $set: { balance: newBalance } })
      await db.collection('customer_transactions').insertOne({
        id: uuidv4(), customer_id: customer.id,
        type: 'payment', amount: -amount,
        description: b.notes || 'Tahsilat', balance_after: newBalance,
        created_at: new Date(),
      })
      return ok(clean(payment))
    }

    // ===================== SETTINGS =====================
    if (route === '/settings' && method === 'GET') {
      const s = await db.collection('settings').findOne({ id: 'company' })
      return ok(clean(s))
    }
    if (route === '/settings' && method === 'PUT') {
      const b = await request.json()
      await db.collection('settings').updateOne({ id: 'company' }, { $set: b })
      return ok({ success: true })
    }

    return fail(`Route ${route} not found`, 404)
  } catch (e) {
    console.error('API error:', e)
    return fail(e.message || 'Sunucu hatası', e.status || 500)
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle
