'use client'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime, formatNumber } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

const fetcher = (u) => fetch(u).then(r => r.json())

export default function StockPage() {
  const { data: movements = [] } = useSWR('/api/stock/movements', fetcher)
  const typeLabel = { in: 'Giriş', out: 'Çıkış', adjust: 'Sayım' }
  const typeColor = { in: 'bg-emerald-100 text-emerald-700', out: 'bg-rose-100 text-rose-700', adjust: 'bg-amber-100 text-amber-700' }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Tarih</th>
                <th className="px-4 py-3 font-medium text-slate-600">Ürün</th>
                <th className="px-4 py-3 font-medium text-slate-600">Hareket</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Miktar</th>
                <th className="px-4 py-3 font-medium text-slate-600">Açıklama</th>
                <th className="px-4 py-3 font-medium text-slate-600">Kullanıcı</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500">Hareket yok</td></tr>}
              {movements.map(m => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(m.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{m.product_name}</td>
                  <td className="px-4 py-3"><Badge className={typeColor[m.type] + ' hover:' + typeColor[m.type]}>{typeLabel[m.type]}</Badge></td>
                  <td className="px-4 py-3 text-right font-mono">{m.type === 'out' ? '-' : '+'}{formatNumber(m.quantity)}</td>
                  <td className="px-4 py-3 text-slate-600">{m.reason}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{m.user_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
