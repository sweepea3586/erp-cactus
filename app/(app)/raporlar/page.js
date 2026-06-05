'use client'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTRY, formatNumber } from '@/lib/format'

const fetcher = (u) => fetch(u).then(r => r.json())

export default function Page() {
  const { data: products = [] } = useSWR('/api/products', fetcher)
  const { data: sales = [] } = useSWR('/api/sales', fetcher)
  const { data: customers = [] } = useSWR('/api/customers', fetcher)

  const stockValue = products.reduce((s, p) => s + (p.purchase_price || 0) * (p.stock || 0), 0)
  const salesTotal = sales.reduce((s, x) => s + (x.total || 0), 0)
  const costOfSold = sales.reduce((s, x) => s + x.items.reduce((t, i) => {
    const prod = products.find(p => p.id === i.product_id)
    return t + (prod?.purchase_price || 0) * i.quantity
  }, 0), 0)
  const profit = salesTotal - costOfSold

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Toplam Satış</p><p className="text-2xl font-bold mt-1">{formatTRY(salesTotal)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Satılan Maliyet</p><p className="text-2xl font-bold mt-1">{formatTRY(costOfSold)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Brüt Kâr</p><p className="text-2xl font-bold mt-1 text-emerald-700">{formatTRY(profit)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Stok Değeri</p><p className="text-2xl font-bold mt-1">{formatTRY(stockValue)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>En Çok Satılan Ürünler</CardTitle></CardHeader>
        <CardContent>
          <TopProducts sales={sales} />
        </CardContent>
      </Card>
    </div>
  )
}

function TopProducts({ sales }) {
  const map = {}
  for (const s of sales) for (const i of s.items) {
    if (!map[i.product_id]) map[i.product_id] = { name: i.product_name, sku: i.product_sku, qty: 0, total: 0 }
    map[i.product_id].qty += i.quantity
    map[i.product_id].total += i.line_total
  }
  const list = Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-slate-200">
        <tr className="text-left text-slate-500">
          <th className="py-2 font-medium">Ürün</th>
          <th className="py-2 font-medium text-right">Adet</th>
          <th className="py-2 font-medium text-right">Toplam</th>
        </tr>
      </thead>
      <tbody>
        {list.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-500">Veri yok</td></tr>}
        {list.map((p, i) => (
          <tr key={i} className="border-b border-slate-100">
            <td className="py-2"><div className="font-medium">{p.name}</div><div className="text-xs text-slate-500">{p.sku}</div></td>
            <td className="py-2 text-right">{formatNumber(p.qty)}</td>
            <td className="py-2 text-right font-medium">{formatTRY(p.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
