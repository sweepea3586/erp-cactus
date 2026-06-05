'use client'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTRY, formatNumber, formatDate } from '@/lib/format'
import { Package, Users, TrendingUp, AlertTriangle, Wallet, Receipt } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

const fetcher = (u) => fetch(u).then(r => r.json())

function StatCard({ icon: Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR('/api/dashboard/stats', fetcher, { refreshInterval: 30000 })

  if (isLoading || !data) return <div className="text-slate-500">Yükleniyor...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Wallet} label="Stok Değeri" value={formatTRY(data.totalStockValue)} color="emerald" />
        <StatCard icon={Package} label="Toplam Ürün" value={formatNumber(data.totalProducts)} color="sky" />
        <StatCard icon={Users} label="Toplam Müşteri" value={formatNumber(data.totalCustomers)} color="violet" />
        <StatCard icon={TrendingUp} label="Bu Ay Satış" value={formatTRY(data.monthlySales)} color="amber" />
        <StatCard icon={Receipt} label="Alacaklar" value={formatTRY(data.totalReceivables)} color="rose" />
        <StatCard icon={AlertTriangle} label="Stok Uyarısı" value={data.lowStockCount} color={data.lowStockCount > 0 ? 'rose' : 'slate'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Son 30 Gün Satışlar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatTRY(v)} labelFormatter={(l) => `Tarih: ${l}`} />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Düşük Stok</CardTitle>
              <Link href="/urunler" className="text-sm text-emerald-600 hover:underline">Tümü</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[280px] overflow-auto">
            {data.lowStock.length === 0 && <p className="text-sm text-slate-500">Stok seviyesi normal.</p>}
            {data.lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.sku}</p>
                </div>
                <Badge variant="destructive" className="shrink-0">{p.stock} / {p.min_stock}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Son Satışlar</CardTitle>
            <Link href="/satislar" className="text-sm text-emerald-600 hover:underline">Tümü</Link>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 font-medium">Fatura No</th>
                <th className="py-2 font-medium">Müşteri</th>
                <th className="py-2 font-medium">Tarih</th>
                <th className="py-2 font-medium text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSales.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500">Henüz satış yok.</td></tr>
              )}
              {data.recentSales.map(s => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="py-2"><Link href={`/satislar/${s.id}`} className="text-emerald-600 hover:underline font-mono">{s.invoice_number}</Link></td>
                  <td className="py-2">{s.customer_name}</td>
                  <td className="py-2 text-slate-600">{formatDate(s.created_at)}</td>
                  <td className="py-2 text-right font-medium">{formatTRY(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
