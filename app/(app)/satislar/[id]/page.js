'use client'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { formatTRY, formatDateTime } from '@/lib/format'

const fetcher = (u) => fetch(u).then(r => r.json())

export default function InvoicePage() {
  const { id } = useParams()
  const { data, isLoading } = useSWR(`/api/sales/${id}`, fetcher)

  if (isLoading || !data) return <div>Yükleniyor...</div>
  if (data.error) return <div className="text-rose-600">{data.error}</div>

  const { sale, customer, settings } = data

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link href="/satislar"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Geri</Button></Link>
        <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700"><Printer className="h-4 w-4 mr-2" />Yazdır / PDF</Button>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{settings?.company_name || 'Cactus Light & Sound'}</h1>
                  <p className="text-xs text-slate-500">{settings?.address}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Tel: {settings?.phone}</p>
              <p className="text-xs text-slate-500">Vergi D.: {settings?.tax_office} / {settings?.tax_number}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-900">FATURA</h2>
              <p className="font-mono text-sm text-emerald-700 mt-1">{sale.invoice_number}</p>
              <p className="text-xs text-slate-500 mt-2">Tarih: {formatDateTime(sale.created_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-slate-200">
            <div>
              <p className="text-xs uppercase text-slate-500 mb-1">Müşteri</p>
              <p className="font-semibold text-slate-900">{customer?.company_name}</p>
              <p className="text-sm text-slate-600">{customer?.contact_person}</p>
              <p className="text-sm text-slate-600">{customer?.address}</p>
              <p className="text-sm text-slate-600">{customer?.phone}</p>
              {customer?.tax_number && <p className="text-xs text-slate-500 mt-1">VKN: {customer.tax_number} / {customer.tax_office}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-slate-500 mb-1">Satış Personeli</p>
              <p className="font-medium">{sale.user_name}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead className="border-b-2 border-slate-300">
              <tr className="text-left">
                <th className="py-2 font-semibold">#</th>
                <th className="py-2 font-semibold">Ürün</th>
                <th className="py-2 font-semibold text-right">Adet</th>
                <th className="py-2 font-semibold text-right">Birim</th>
                <th className="py-2 font-semibold text-right">İnd.</th>
                <th className="py-2 font-semibold text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-2">{idx + 1}</td>
                  <td className="py-2"><div className="font-medium">{it.product_name}</div><div className="text-xs text-slate-500">{it.product_sku}</div></td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{formatTRY(it.unit_price)}</td>
                  <td className="py-2 text-right">{it.discount}%</td>
                  <td className="py-2 text-right font-medium">{formatTRY(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between"><span>Ara Toplam:</span><span className="font-medium">{formatTRY(sale.subtotal)}</span></div>
              <div className="flex justify-between"><span>KDV (%{sale.tax_rate}):</span><span>{formatTRY(sale.tax)}</span></div>
              <div className="flex justify-between text-base font-bold border-t pt-2"><span>Genel Toplam:</span><span className="text-emerald-700">{formatTRY(sale.total)}</span></div>
              <div className="flex justify-between"><span>Ödenen:</span><span>{formatTRY(sale.paid)}</span></div>
              <div className="flex justify-between font-bold"><span>Kalan:</span><span className={sale.due > 0 ? 'text-rose-600' : 'text-emerald-700'}>{formatTRY(sale.due)}</span></div>
            </div>
          </div>

          {sale.notes && (
            <div className="mt-8 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">Notlar:</p>
              <p className="text-sm">{sale.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
