'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Pencil, Trash2, Wallet } from 'lucide-react'
import { formatTRY } from '@/lib/format'
import { toast } from 'sonner'
import Link from 'next/link'

const fetcher = (u) => fetch(u).then(r => r.json())
const empty = { company_name: '', contact_person: '', phone: '', email: '', address: '', tax_office: '', tax_number: '', notes: '', balance: 0 }

export default function CustomersPage() {
  const [q, setQ] = useState('')
  const { data: customers = [] } = useSWR(`/api/customers?q=${encodeURIComponent(q)}`, fetcher)
  const [open, setOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [pay, setPay] = useState({ customer_id: '', amount: '', method: 'cash', notes: '' })

  function startCreate() { setEditing(null); setForm(empty); setOpen(true) }
  function startEdit(c) { setEditing(c); setForm({ ...empty, ...c }); setOpen(true) }

  async function save() {
    if (!form.company_name) return toast.error('Firma adı zorunlu')
    const url = editing ? `/api/customers/${editing.id}` : '/api/customers'
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) return toast.error('Kaydedilemedi')
    toast.success(editing ? 'Müşteri güncellendi' : 'Müşteri eklendi')
    setOpen(false); mutate((k) => typeof k === 'string' && k.startsWith('/api/customers'))
  }

  async function remove(id) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    toast.success('Silindi'); mutate((k) => typeof k === 'string' && k.startsWith('/api/customers'))
  }

  async function recordPayment() {
    if (!pay.amount || Number(pay.amount) <= 0) return toast.error('Tutar girin')
    const res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pay, amount: Number(pay.amount) }) })
    if (!res.ok) return toast.error('Hata oluştu')
    toast.success('Tahsilat kaydedildi')
    setPayOpen(false); setPay({ customer_id: '', amount: '', method: 'cash', notes: '' })
    mutate((k) => typeof k === 'string' && k.startsWith('/api/customers'))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Müşteri ara..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={startCreate} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" />Yeni Müşteri</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Firma</th>
                <th className="px-4 py-3 font-medium text-slate-600">İlgili Kişi</th>
                <th className="px-4 py-3 font-medium text-slate-600">Telefon</th>
                <th className="px-4 py-3 font-medium text-slate-600">E-posta</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Bakiye</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500">Müşteri yok</td></tr>}
              {customers.map(c => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.company_name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.contact_person || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email || '-'}</td>
                  <td className={`px-4 py-3 text-right font-medium ${c.balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{formatTRY(c.balance)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" title="Tahsilat" onClick={() => { setPay({ customer_id: c.id, amount: '', method: 'cash', notes: '' }); setPayOpen(true) }}><Wallet className="h-4 w-4 text-emerald-600" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Firma Adı *</Label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
            <div><Label>İlgili Kişi</Label><Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><Label>Telefon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>E-posta</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Vergi Dairesi</Label><Input value={form.tax_office} onChange={e => setForm({ ...form, tax_office: e.target.value })} /></div>
            <div><Label>Vergi No / TCKN</Label><Input value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Adres</Label><Textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Notlar</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tahsilat Al</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tutar (₺) *</Label><Input type="number" step="0.01" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} /></div>
            <div><Label>Açıklama</Label><Input value={pay.notes} onChange={e => setPay({ ...pay, notes: e.target.value })} placeholder="Örn: Nakit tahsilat" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Vazgeç</Button>
            <Button onClick={recordPayment} className="bg-emerald-600 hover:bg-emerald-700">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
