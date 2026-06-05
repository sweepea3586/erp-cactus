'use client'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { formatTRY, formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

const fetcher = (u) => fetch(u).then(r => r.json())

export default function SalesPage() {
  const { data: sales = [] } = useSWR('/api/sales', fetcher)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Toplam {sales.length} fatura</p>
        <Link href="/satislar/yeni"><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" />Yeni Satış</Button></Link>
      </div>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Fatura No</th>
                <th className="px-4 py-3 font-medium text-slate-600">Müşteri</th>
                <th className="px-4 py-3 font-medium text-slate-600">Tarih</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Ara Toplam</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">KDV</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Toplam</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Kalan</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-500">Henüz satış yok</td></tr>}
              {sales.map(s => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/satislar/${s.id}`} className="text-emerald-600 hover:underline font-mono">{s.invoice_number}</Link></td>
                  <td className="px-4 py-3">{s.customer_name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(s.created_at)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatTRY(s.subtotal)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatTRY(s.tax)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatTRY(s.total)}</td>
                  <td className="px-4 py-3 text-right">
                    {s.due > 0 ? <Badge variant="destructive">{formatTRY(s.due)}</Badge> : <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ödendi</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
