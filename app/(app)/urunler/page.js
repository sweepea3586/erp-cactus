'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Pencil, Trash2, PackagePlus, PackageMinus } from 'lucide-react'
import { formatTRY, formatNumber } from '@/lib/format'
import { toast } from 'sonner'

const fetcher = (u) => fetch(u).then(r => r.json())
const empty = { sku: '', barcode: '', name: '', brand: '', category_id: '', purchase_price: '', selling_price: '', stock: '', min_stock: '', warehouse_location: '', image_url: '' }

export default function ProductsPage() {
  const [q, setQ] = useState('')
  const { data: products = [] } = useSWR(`/api/products?q=${encodeURIComponent(q)}`, fetcher)
  const { data: categories = [] } = useSWR('/api/categories', fetcher)
  const [open, setOpen] = useState(false)
  const [adjOpen, setAdjOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [adj, setAdj] = useState({ product_id: '', type: 'in', quantity: '', reason: '' })

  function startCreate() { setEditing(null); setForm(empty); setOpen(true) }
  function startEdit(p) {
    setEditing(p)
    setForm({ ...empty, ...p, category_id: p.category_id || '', purchase_price: String(p.purchase_price), selling_price: String(p.selling_price), stock: String(p.stock), min_stock: String(p.min_stock) })
    setOpen(true)
  }

  async function save() {
    if (!form.name || !form.sku) return toast.error('Ad ve SKU zorunlu')
    const url = editing ? `/api/products/${editing.id}` : '/api/products'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) return toast.error('Kaydedilemedi')
    toast.success(editing ? 'Ürün güncellendi' : 'Ürün eklendi')
    setOpen(false); mutate((k) => typeof k === 'string' && k.startsWith('/api/products'))
  }

  async function remove(id) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    toast.success('Silindi'); mutate((k) => typeof k === 'string' && k.startsWith('/api/products'))
  }

  async function adjustStock() {
    if (!adj.product_id || !adj.quantity) return toast.error('Eksik bilgi')
    const res = await fetch('/api/stock/adjust', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...adj, quantity: Number(adj.quantity) }) })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error || 'Hata')
    toast.success('Stok güncellendi')
    setAdjOpen(false); setAdj({ product_id: '', type: 'in', quantity: '', reason: '' })
    mutate((k) => typeof k === 'string' && k.startsWith('/api/products'))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Ürün ara (ad, SKU, barkod)..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAdjOpen(true)}><PackagePlus className="h-4 w-4 mr-2" />Stok Hareketi</Button>
          <Button onClick={startCreate} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" />Yeni Ürün</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-slate-600">SKU</th>
                <th className="px-4 py-3 font-medium text-slate-600">Ürün Adı</th>
                <th className="px-4 py-3 font-medium text-slate-600">Marka</th>
                <th className="px-4 py-3 font-medium text-slate-600">Kategori</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Alış</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Satış</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-center">Stok</th>
                <th className="px-4 py-3 font-medium text-slate-600">Konum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-slate-500">Ürün bulunamadı</td></tr>}
              {products.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.brand}</td>
                  <td className="px-4 py-3 text-slate-600">{p.category_name || '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatTRY(p.purchase_price)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatTRY(p.selling_price)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={p.stock <= p.min_stock ? 'destructive' : 'secondary'}>{formatNumber(p.stock)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.warehouse_location || '-'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => { setAdj({ product_id: p.id, type: 'in', quantity: '', reason: '' }); setAdjOpen(true) }}><PackageMinus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Ürün Düzenle' : 'Yeni Ürün'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
            <div><Label>Barkod</Label><Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Ürün Adı *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Marka</Label><Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Alış Fiyatı (₺)</Label><Input type="number" step="0.01" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} /></div>
            <div><Label>Satış Fiyatı (₺)</Label><Input type="number" step="0.01" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} /></div>
            {!editing && <div><Label>Açılış Stok</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>}
            <div><Label>Min. Stok</Label><Input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Depo Konumu</Label><Input value={form.warehouse_location} onChange={e => setForm({ ...form, warehouse_location: e.target.value })} placeholder="Ör: A-01-03" /></div>
            <div className="sm:col-span-2"><Label>Görsel URL</Label><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stok Hareketi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ürün</Label>
              <Select value={adj.product_id} onValueChange={(v) => setAdj({ ...adj, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Ürün seçin" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hareket Türü</Label>
              <Select value={adj.type} onValueChange={(v) => setAdj({ ...adj, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Giriş (+)</SelectItem>
                  <SelectItem value="out">Çıkış (-)</SelectItem>
                  <SelectItem value="adjust">Sayım (Yeni Stok)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Miktar</Label><Input type="number" value={adj.quantity} onChange={e => setAdj({ ...adj, quantity: e.target.value })} /></div>
            <div><Label>Açıklama</Label><Input value={adj.reason} onChange={e => setAdj({ ...adj, reason: e.target.value })} placeholder="Örn: Depo sayımı" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>Vazgeç</Button>
            <Button onClick={adjustStock} className="bg-emerald-600 hover:bg-emerald-700">Uygula</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
