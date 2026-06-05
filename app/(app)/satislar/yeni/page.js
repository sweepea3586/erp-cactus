'use client'
import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Search } from 'lucide-react'
import { formatTRY } from '@/lib/format'
import { toast } from 'sonner'

const fetcher = (u) => fetch(u).then(r => r.json())

export default function NewSalePage() {
  const router = useRouter()
  const { data: customers = [] } = useSWR('/api/customers', fetcher)
  const { data: products = [] } = useSWR('/api/products', fetcher)

  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([])
  const [taxRate, setTaxRate] = useState(20)
  const [paid, setPaid] = useState(0)
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredProducts = useMemo(() => {
    if (!search) return products.slice(0, 8)
    const q = search.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode || '').includes(q)).slice(0, 10)
  }, [search, products])

  function addProduct(p) {
    if (p.stock <= 0) return toast.error('Stok yetersiz')
    const existing = items.find(i => i.product_id === p.id)
    if (existing) {
      if (existing.quantity + 1 > p.stock) return toast.error('Stok yetersiz')
      setItems(items.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setItems([...items, { product_id: p.id, sku: p.sku, name: p.name, unit_price: p.selling_price, quantity: 1, discount: 0, max: p.stock }])
    }
    setSearch('')
  }

  function updateItem(idx, field, value) {
    const next = [...items]
    next[idx] = { ...next[idx], [field]: value }
    setItems(next)
  }

  function removeItem(idx) { setItems(items.filter((_, i) => i !== idx)) }

  const subtotal = items.reduce((s, i) => s + (Number(i.unit_price) * Number(i.quantity)) * (1 - Number(i.discount || 0) / 100), 0)
  const tax = subtotal * (Number(taxRate) / 100)
  const total = subtotal + tax
  const due = total - Number(paid || 0)

  async function save() {
    if (!customerId) return toast.error('Müşteri seçin')
    if (items.length === 0) return toast.error('En az bir ürün ekleyin')
    setSaving(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          items: items.map(i => ({ product_id: i.product_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price), discount: Number(i.discount || 0) })),
          tax_rate: Number(taxRate), paid: Number(paid || 0), notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hata')
      toast.success('Satış oluşturuldu: ' + data.invoice_number)
      router.push(`/satislar/${data.id}`)
    } catch (e) {
      toast.error(e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Müşteri Seçimi</CardTitle></CardHeader>
          <CardContent>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Müşteri seçiniz" /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Ürün Ekle</CardTitle></CardHeader>
          <CardContent>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Ürün ara (ad, SKU, barkod)" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {search && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                {filteredProducts.length === 0 && <div className="p-3 text-sm text-slate-500">Sonuç yok</div>}
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.sku} · Stok: {p.stock}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">{formatTRY(p.selling_price)}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium text-slate-600">Ürün</th>
                  <th className="px-3 py-2 font-medium text-slate-600 w-24">Adet</th>
                  <th className="px-3 py-2 font-medium text-slate-600 w-32">Birim Fiyat</th>
                  <th className="px-3 py-2 font-medium text-slate-600 w-20">İnd. %</th>
                  <th className="px-3 py-2 font-medium text-slate-600 text-right w-32">Tutar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-slate-500">Henüz ürün eklenmedi</td></tr>}
                {items.map((it, idx) => {
                  const total = (Number(it.unit_price) * Number(it.quantity)) * (1 - Number(it.discount || 0) / 100)
                  return (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        <div className="font-medium">{it.name}</div>
                        <div className="text-xs text-slate-500">{it.sku}</div>
                      </td>
                      <td className="px-3 py-2"><Input type="number" min={1} max={it.max} value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="h-8" /></td>
                      <td className="px-3 py-2"><Input type="number" step="0.01" value={it.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="h-8" /></td>
                      <td className="px-3 py-2"><Input type="number" value={it.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} className="h-8" /></td>
                      <td className="px-3 py-2 text-right font-medium">{formatTRY(total)}</td>
                      <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-rose-600" /></Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Fatura Özeti</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span>Ara Toplam</span><span className="font-medium">{formatTRY(subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm">
              <span>KDV (%)</span>
              <Input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="h-8 w-20 text-right" />
            </div>
            <div className="flex justify-between text-sm"><span>KDV Tutarı</span><span>{formatTRY(tax)}</span></div>
            <div className="border-t pt-3 flex justify-between text-base"><span className="font-semibold">Genel Toplam</span><span className="font-bold text-emerald-700">{formatTRY(total)}</span></div>
            <div className="pt-2">
              <Label className="text-xs">Ödenen Tutar (₺)</Label>
              <Input type="number" step="0.01" value={paid} onChange={e => setPaid(e.target.value)} />
            </div>
            <div className="flex justify-between text-sm"><span>Kalan</span><span className={`font-bold ${due > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatTRY(due)}</span></div>
            <div className="pt-2">
              <Label className="text-xs">Notlar</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <Button onClick={save} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">{saving ? 'Kaydediliyor...' : 'Satışı Tamamla'}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
