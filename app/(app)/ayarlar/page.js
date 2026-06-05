'use client'
import useSWR, { mutate } from 'swr'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const fetcher = (u) => fetch(u).then(r => r.json())

export default function SettingsPage() {
  const { data } = useSWR('/api/settings', fetcher)
  const [form, setForm] = useState({})
  useEffect(() => { if (data) setForm(data) }, [data])

  async function save() {
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) return toast.error('Kaydedilemedi')
    toast.success('Ayarlar kaydedildi')
    mutate('/api/settings')
  }

  if (!data) return <div>Yükleniyor...</div>

  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle>Şirket Bilgileri</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Label>Şirket Adı</Label><Input value={form.company_name || ''} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
          <div><Label>Telefon</Label><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>E-posta</Label><Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Vergi Dairesi</Label><Input value={form.tax_office || ''} onChange={e => setForm({ ...form, tax_office: e.target.value })} /></div>
          <div><Label>Vergi No</Label><Input value={form.tax_number || ''} onChange={e => setForm({ ...form, tax_number: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Adres</Label><Textarea rows={2} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Para Birimi</Label><Input value={form.currency || 'TRY'} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
          <div><Label>Fatura Ön Eki</Label><Input value={form.invoice_prefix || ''} onChange={e => setForm({ ...form, invoice_prefix: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Logo URL</Label><Input value={form.logo_url || ''} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></div>
        </div>
        <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">Kaydet</Button>
      </CardContent>
    </Card>
  )
}
