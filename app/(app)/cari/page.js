'use client'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { formatTRY } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

const fetcher = (u) => fetch(u).then(r => r.json())

export default function Page() {
  const { data: customers = [] } = useSWR('/api/customers', fetcher)
  const withBalance = customers.filter(c => (c.balance || 0) !== 0).sort((a, b) => b.balance - a.balance)
  const total = customers.reduce((s, c) => s + (c.balance || 0), 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Toplam Alacaklar</p>
            <p className="text-2xl font-bold text-rose-600">{formatTRY(total)}</p>
          </div>
          <Badge variant="destructive">{withBalance.length} Müşteri</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Müşteri</th>
                <th className="px-4 py-3 font-medium text-slate-600">İlgili Kişi</th>
                <th className="px-4 py-3 font-medium text-slate-600">Telefon</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{c.company_name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.contact_person || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || '-'}</td>
                  <td className={`px-4 py-3 text-right font-medium ${c.balance > 0 ? 'text-rose-600' : c.balance < 0 ? 'text-emerald-700' : 'text-slate-600'}`}>{formatTRY(c.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
