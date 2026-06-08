import { NextResponse } from 'next/server'
import { createClient, getCurrentUser } from '@/lib/supabase/server'

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}
function ok(data, status = 200) { return cors(NextResponse.json(data, { status })) }
function fail(message, status = 400) { return cors(NextResponse.json({ error: message }, { status })) }
export async function OPTIONS() { return cors(new NextResponse(null, { status: 200 })) }

async function handle(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const supabase = createClient()

    // ============== AUTH ==============
    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json()
      if (!email || !password) return fail('E-posta ve şifre zorunludur')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return fail(error.message || 'Giriş başarısız', 401)
      // Get profile
      const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).maybeSingle()
      return ok({ user: profile || { id: data.user.id, email: data.user.email, role: 'staff', full_name: data.user.email } })
    }

    if (route === '/auth/signup' && method === 'POST') {
      const { email, password, full_name } = await request.json()
      if (!email || !password) return fail('E-posta ve şifre zorunludur')
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: full_name || email.split('@')[0], role: 'staff' } },
      })
      if (error) return fail(error.message, 400)
      return ok({ user: data.user })
    }

    if (route === '/auth/logout' && method === 'POST') {
      await supabase.auth.signOut()
      return ok({ success: true })
    }

    if (route === '/auth/me' && method === 'GET') {
      const user = await getCurrentUser()
      if (!user) return fail('Unauthorized', 401)
      return ok({ user })
    }

    // ============== AUTH GUARD ==============
    const me = await getCurrentUser()
    if (!me) return fail('Unauthorized', 401)

    // ============== DASHBOARD ==============
    if (route === '/dashboard/stats' && method === 'GET') {
      const [{ data: products = [] }, { data: customers = [] }, { data: sales = [] }] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
      ])
      const totalStockValue = products.reduce((s, p) => s + Number(p.purchase_price || 0) * Number(p.stock || 0), 0)
      const totalProducts = products.length
      const totalCustomers = customers.length
      const totalReceivables = customers.reduce((s, c) => s + Number(c.balance || 0), 0)
      const lowStock = products.filter(p => Number(p.stock || 0) <= Number(p.min_stock || 0))

      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
      const monthlySales = sales.filter(s => new Date(s.created_at) >= startOfMonth)
        .reduce((s, x) => s + Number(x.total || 0), 0)

      const series = []
      for (let i = 29; i >= 0; i--) {
        const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - i)
        const next = new Date(day); next.setDate(next.getDate() + 1)
        const total = sales.filter(s => new Date(s.created_at) >= day && new Date(s.created_at) < next)
          .reduce((sum, x) => sum + Number(x.total || 0), 0)
        series.push({ date: day.toISOString().slice(0, 10), total })
      }

      return ok({
        totalStockValue, totalProducts, totalCustomers,
        monthlySales, totalReceivables,
        lowStockCount: lowStock.length,
        lowStock: lowStock.slice(0, 10),
        recentSales: sales.slice(0, 5),
        series,
      })
    }

    // ============== CATEGORIES ==============
    if (route === '/categories' && method === 'GET') {
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (error) return fail(error.message)
      return ok(data || [])
    }
    if (route === '/categories' && method === 'POST') {
      const b = await request.json()
      const { data, error } = await supabase.from('categories').insert({ name: b.name }).select().single()
      if (error) return fail(error.message)
      return ok(data)
    }

    // ============== PRODUCTS ==============
    if (route === '/products' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')
      let query = supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false })
      if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%,brand.ilike.%${q}%`)
      const { data, error } = await query
      if (error) return fail(error.message)
      const flat = (data || []).map(p => ({ ...p, category_name: p.categories?.name || '' }))
      return ok(flat)
    }
    if (route === '/products' && method === 'POST') {
      const b = await request.json()
      if (!b.name || !b.sku) return fail('Ad ve SKU zorunlu')
      const payload = {
        sku: b.sku, barcode: b.barcode || null,
        name: b.name, brand: b.brand || null,
        category_id: b.category_id || null,
        purchase_price: Number(b.purchase_price || 0),
        selling_price: Number(b.selling_price || 0),
        stock: Number(b.stock || 0),
        min_stock: Number(b.min_stock || 0),
        warehouse_location: b.warehouse_location || null,
        image_url: b.image_url || null,
      }
      const { data, error } = await supabase.from('products').insert(payload).select().single()
      if (error) return fail(error.message)
      if (data.stock > 0) {
        await supabase.from('stock_movements').insert({
          product_id: data.id, product_name: data.name, type: 'in',
          quantity: data.stock, reason: 'Açılış stok',
          user_id: me.id, user_name: me.full_name, after_qty: data.stock,
        })
      }
      return ok(data)
    }
    if (route.startsWith('/products/') && method === 'GET') {
      const id = route.split('/')[2]
      const sub = route.split('/')[3]
      if (sub === 'movements') {
        const { data, error } = await supabase.from('stock_movements').select('*').eq('product_id', id).order('created_at', { ascending: false })
        if (error) return fail(error.message)
        return ok(data || [])
      }
      const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
      if (error) return fail(error.message)
      if (!data) return fail('Bulunamadı', 404)
      return ok(data)
    }
    if (route.startsWith('/products/') && method === 'PUT') {
      const id = route.split('/')[2]
      const b = await request.json()
      const payload = {
        sku: b.sku, barcode: b.barcode || null,
        name: b.name, brand: b.brand || null,
        category_id: b.category_id || null,
        purchase_price: Number(b.purchase_price || 0),
        selling_price: Number(b.selling_price || 0),
        min_stock: Number(b.min_stock || 0),
        warehouse_location: b.warehouse_location || null,
        image_url: b.image_url || null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('products').update(payload).eq('id', id)
      if (error) return fail(error.message)
      return ok({ success: true })
    }
    if (route.startsWith('/products/') && method === 'DELETE') {
      const id = route.split('/')[2]
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) return fail(error.message)
      return ok({ success: true })
    }

    // ============== STOCK ADJUST ==============
    if (route === '/stock/adjust' && method === 'POST') {
      const b = await request.json()
      const { data: p } = await supabase.from('products').select('*').eq('id', b.product_id).maybeSingle()
      if (!p) return fail('Ürün bulunamadı', 404)
      const qty = Number(b.quantity || 0)
      const type = b.type
      let newStock = Number(p.stock)
      if (type === 'in') newStock += qty
      else if (type === 'out') newStock -= qty
      else if (type === 'adjust') newStock = qty
      if (newStock < 0) return fail('Stok negatif olamaz')
      const { error: e1 } = await supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', p.id)
      if (e1) return fail(e1.message)
      await supabase.from('stock_movements').insert({
        product_id: p.id, product_name: p.name, type, quantity: qty,
        reason: b.reason || (type === 'in' ? 'Stok girişi' : type === 'out' ? 'Stok çıkışı' : 'Stok sayımı'),
        user_id: me.id, user_name: me.full_name, before_qty: Number(p.stock), after_qty: newStock,
      })
      return ok({ success: true, stock: newStock })
    }

    if (route === '/stock/movements' && method === 'GET') {
      const { data, error } = await supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(500)
      if (error) return fail(error.message)
      return ok(data || [])
    }

    // ============== CUSTOMERS ==============
    if (route === '/customers' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')
      let query = supabase.from('customers').select('*').order('company_name')
      if (q) query = query.or(`company_name.ilike.%${q}%,contact_person.ilike.%${q}%,phone.ilike.%${q}%`)
      const { data, error } = await query
      if (error) return fail(error.message)
      return ok(data || [])
    }
    if (route === '/customers' && method === 'POST') {
      const b = await request.json()
      if (!b.company_name) return fail('Firma adı zorunlu')
      const payload = {
        company_name: b.company_name,
        contact_person: b.contact_person || null,
        phone: b.phone || null, email: b.email || null, address: b.address || null,
        tax_office: b.tax_office || null, tax_number: b.tax_number || null,
        balance: Number(b.balance || 0), notes: b.notes || null,
      }
      const { data, error } = await supabase.from('customers').insert(payload).select().single()
      if (error) return fail(error.message)
      return ok(data)
    }
    if (route.startsWith('/customers/') && method === 'GET') {
      const id = route.split('/')[2]
      const sub = route.split('/')[3]
      if (sub === 'transactions') {
        const { data, error } = await supabase.from('customer_transactions').select('*').eq('customer_id', id).order('created_at', { ascending: false })
        if (error) return fail(error.message)
        return ok(data || [])
      }
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
      if (error) return fail(error.message)
      if (!data) return fail('Bulunamadı', 404)
      return ok(data)
    }
    if (route.startsWith('/customers/') && method === 'PUT') {
      const id = route.split('/')[2]
      const b = await request.json()
      const payload = {
        company_name: b.company_name,
        contact_person: b.contact_person || null,
        phone: b.phone || null, email: b.email || null, address: b.address || null,
        tax_office: b.tax_office || null, tax_number: b.tax_number || null,
        notes: b.notes || null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('customers').update(payload).eq('id', id)
      if (error) return fail(error.message)
      return ok({ success: true })
    }
    if (route.startsWith('/customers/') && method === 'DELETE') {
      const id = route.split('/')[2]
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) return fail(error.message)
      return ok({ success: true })
    }

    // ============== SALES ==============
    if (route === '/sales' && method === 'GET') {
      const { data, error } = await supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false })
      if (error) return fail(error.message)
      const sales = (data || []).map(s => ({ ...s, items: s.sale_items || [] }))
      return ok(sales)
    }
    if (route === '/sales' && method === 'POST') {
      const b = await request.json()
      const { data: customer } = await supabase.from('customers').select('*').eq('id', b.customer_id).maybeSingle()
      if (!customer) return fail('Müşteri bulunamadı', 400)
      if (!Array.isArray(b.items) || b.items.length === 0) return fail('En az bir ürün ekleyin')

      // Validate stock + build line items
      const enriched = []
      for (const it of b.items) {
        const { data: p } = await supabase.from('products').select('*').eq('id', it.product_id).maybeSingle()
        if (!p) return fail('Ürün bulunamadı: ' + it.product_id)
        const qty = Number(it.quantity || 0)
        if (qty <= 0) return fail("Adet 0'dan büyük olmalı: " + p.name)
        if (qty > Number(p.stock)) return fail(`Yetersiz stok: ${p.name} (mevcut: ${p.stock})`)
        const unit_price = Number(it.unit_price ?? p.selling_price)
        const discount = Number(it.discount || 0)
        const line_total = unit_price * qty * (1 - discount / 100)
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

      // Generate invoice number
      const { data: invData, error: invErr } = await supabase.rpc('next_invoice_number')
      if (invErr) return fail('Fatura numarası üretilemedi: ' + invErr.message)
      const invoice_number = invData

      // Insert sale (trigger updates customer balance)
      const { data: sale, error: saleErr } = await supabase.from('sales').insert({
        invoice_number,
        customer_id: customer.id,
        customer_name: customer.company_name,
        subtotal, tax_rate: taxRate, tax, total, paid, due,
        notes: b.notes || null,
        user_id: me.id, user_name: me.full_name,
      }).select().single()
      if (saleErr) return fail(saleErr.message)

      // Insert sale_items (triggers update stock + movements)
      const itemsPayload = enriched.map(it => ({ ...it, sale_id: sale.id }))
      const { error: itemsErr } = await supabase.from('sale_items').insert(itemsPayload)
      if (itemsErr) {
        // rollback
        await supabase.from('sales').delete().eq('id', sale.id)
        return fail(itemsErr.message)
      }

      // Record payment if any (trigger subtracts from balance)
      if (paid > 0) {
        await supabase.from('payments').insert({
          customer_id: customer.id, amount: paid,
          method: 'cash', reference_id: sale.id, reference_number: invoice_number,
          notes: 'Satışla birlikte tahsilat',
          user_id: me.id, user_name: me.full_name,
        })
      }

      return ok({ ...sale, items: enriched })
    }
    if (route.startsWith('/sales/') && method === 'GET') {
      const id = route.split('/')[2]
      const { data: sale, error } = await supabase.from('sales').select('*, sale_items(*)').eq('id', id).maybeSingle()
      if (error) return fail(error.message)
      if (!sale) return fail('Bulunamadı', 404)
      const { data: customer } = await supabase.from('customers').select('*').eq('id', sale.customer_id).maybeSingle()
      const { data: settings } = await supabase.from('settings').select('*').eq('id', 'company').maybeSingle()
      return ok({ sale: { ...sale, items: sale.sale_items || [] }, customer, settings })
    }

    // ============== PAYMENTS ==============
    if (route === '/payments' && method === 'POST') {
      const b = await request.json()
      const amount = Number(b.amount || 0)
      if (amount <= 0) return fail('Tutar geçersiz')
      const { data, error } = await supabase.from('payments').insert({
        customer_id: b.customer_id,
        amount, method: b.method || 'cash', notes: b.notes || null,
        user_id: me.id, user_name: me.full_name,
      }).select().single()
      if (error) return fail(error.message)
      return ok(data)
    }

    // ============== SETTINGS ==============
    if (route === '/settings' && method === 'GET') {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 'company').maybeSingle()
      if (error) return fail(error.message)
      return ok(data || {})
    }
    if (route === '/settings' && method === 'PUT') {
      const b = await request.json()
      const { id, ...payload } = b
      payload.updated_at = new Date().toISOString()
      const { error } = await supabase.from('settings').update(payload).eq('id', 'company')
      if (error) return fail(error.message)
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
