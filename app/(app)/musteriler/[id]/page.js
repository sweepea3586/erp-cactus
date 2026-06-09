'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Receipt,
  Hash,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  TrendingUp,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react'
import { formatTRY, formatDateTime } from '@/lib/format'

const fetcher = (u) => fetch(u).then((r) => r.json())

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2 rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">{label}</p>
          <p className="text-base font-semibold text-slate-800 leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// items come pre-loaded from GET /api/sales/:id → { sale: { ...sale, items: [...] } }
function SaleRow({ sale, items = [] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr
        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3 w-8 text-slate-400">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
        <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(sale.created_at)}</td>
        <td className="px-4 py-3">
          <Link
            href={`/satislar/${sale.id}`}
            className="font-mono text-emerald-600 hover:underline text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {sale.invoice_number}
          </Link>
        </td>
        <td className="px-4 py-3 text-right font-medium text-slate-800">{formatTRY(sale.total)}</td>
        <td className="px-4 py-3 text-right text-slate-500">{formatTRY(sale.paid)}</td>
        <td className="px-4 py-3 text-right">
          {sale.due > 0 ? (
            <Badge variant="destructive">{formatTRY(sale.due)}</Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ödendi</Badge>
          )}
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={6} className="px-8 py-3">
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Ürün bulunamadı.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="pb-1 text-left font-medium">Ürün</th>
                    <th className="pb-1 text-right font-medium">Adet</th>
                    <th className="pb-1 text-right font-medium">Birim Fiyat</th>
                    <th className="pb-1 text-right font-medium">Satır Toplamı</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 text-slate-700">{item.product_name}</td>
                      <td className="py-1.5 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-1.5 text-right text-slate-600">{formatTRY(item.unit_price)}</td>
                      <td className="py-1.5 text-right font-medium text-slate-800">{formatTRY(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function MusteriDetayPage() {
  const { id } = useParams()

  const { data: customer, isLoading: loadingCustomer } = useSWR(
    id ? `/api/customers/${id}` : null,
    fetcher
  )

  // Fetch all sales to find which ones belong to this customer
  const { data: allSales = [] } = useSWR('/api/sales', fetcher)
  const salesForCustomer = allSales.filter(
    (s) => s.customer_id === id || s.customer_id === Number(id)
  )

  // Fetch full detail (with items) for each of this customer's sales in parallel
  const saleIds = salesForCustomer.map((s) => s.id)
  const { data: saleDetails = [] } = useSWR(
    saleIds.length > 0 ? ['sale-details', ...saleIds] : null,
    async () => {
      const results = await Promise.all(
        saleIds.map((sid) =>
          fetch(`/api/sales/${sid}`)
            .then((r) => r.json())
            .then((d) => d.sale ?? d) // handle both { sale: {...} } and bare object
        )
      )
      return results
    }
  )

  // Use detailed sales (with embedded items) when available, fall back to list data
  const sales = saleDetails.length > 0 ? saleDetails : salesForCustomer

  const { data: transactions = [] } = useSWR(
    id ? `/api/customers/${id}/transactions` : null,
    fetcher
  )

  // Computed stats
  const totalPurchase = sales.reduce((sum, s) => sum + (s.total || 0), 0)
  const totalSaleCount = sales.length
  const lastSaleDate =
    sales.length > 0
      ? formatDateTime(
          sales.reduce((latest, s) =>
            new Date(s.created_at) > new Date(latest.created_at) ? s : latest
          ).created_at
        )
      : '—'
  const openBalance = sales.reduce((sum, s) => sum + (s.due || 0), 0)

  if (loadingCustomer) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Yükleniyor…
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <AlertCircle className="h-8 w-8 text-slate-300" />
        <p className="text-sm">Müşteri bulunamadı.</p>
        <Link href="/musteriler">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Geri Dön
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/musteriler">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{customer.company_name || customer.name}</h1>
          {customer.contact_person && (
            <p className="text-sm text-slate-500">{customer.contact_person}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Toplam Alışveriş"
          value={formatTRY(totalPurchase)}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={ShoppingCart}
          label="Toplam Satış Sayısı"
          value={`${totalSaleCount} fatura`}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CalendarCheck}
          label="Son Alışveriş"
          value={lastSaleDate}
          accent="bg-violet-50 text-violet-600"
        />
        <StatCard
          icon={AlertCircle}
          label="Açık Bakiye"
          value={formatTRY(openBalance)}
          accent={openBalance > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}
        />
      </div>

      {/* Two-column layout: customer info + transactions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Info */}
        <Card className="md:col-span-1">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Müşteri Bilgileri
            </h2>

            <InfoRow icon={Building2} label="Firma Adı" value={customer.company_name || customer.name} />
            <InfoRow icon={User} label="İlgili Kişi" value={customer.contact_person} />
            <InfoRow icon={Phone} label="Telefon" value={customer.phone} />
            <InfoRow icon={Mail} label="E-Posta" value={customer.email} />
            <InfoRow icon={MapPin} label="Adres" value={customer.address} />
            <InfoRow icon={Receipt} label="Vergi Dairesi" value={customer.tax_office} />
            <InfoRow icon={Hash} label="Vergi No" value={customer.tax_number} />

            {customer.balance !== undefined && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Güncel Bakiye</p>
                <p
                  className={`text-lg font-bold ${
                    customer.balance < 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {formatTRY(customer.balance)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="md:col-span-2">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Hesap Hareketleri
              </h2>
            </div>
            <div className="overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 font-medium text-slate-600 text-xs">Tarih</th>
                    <th className="px-4 py-2.5 font-medium text-slate-600 text-xs">Tür</th>
                    <th className="px-4 py-2.5 font-medium text-slate-600 text-xs text-right">Tutar</th>
                    <th className="px-4 py-2.5 font-medium text-slate-600 text-xs">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                        Hareket bulunamadı
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                          {formatDateTime(t.created_at)}
                        </td>
                        <td className="px-4 py-2.5">
                          <TransactionBadge type={t.type} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                          {formatTRY(t.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{t.description || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales History */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Satış Geçmişi
            </h2>
            <span className="text-xs text-slate-400">{totalSaleCount} fatura</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 py-2.5 w-8" />
                  <th className="px-4 py-2.5 font-medium text-slate-600 text-xs">Tarih</th>
                  <th className="px-4 py-2.5 font-medium text-slate-600 text-xs">Fatura No</th>
                  <th className="px-4 py-2.5 font-medium text-slate-600 text-xs text-right">Toplam</th>
                  <th className="px-4 py-2.5 font-medium text-slate-600 text-xs text-right">Ödenen</th>
                  <th className="px-4 py-2.5 font-medium text-slate-600 text-xs text-right">Kalan</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                      Bu müşteriye ait satış bulunamadı
                    </td>
                  </tr>
                ) : (
                  sales
                    .slice()
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map((sale) => (
                      <SaleRow key={sale.id} sale={sale} items={sale.items ?? []} />
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400 leading-none mb-0.5">{label}</p>
        <p className="text-sm text-slate-700 break-words">{value}</p>
      </div>
    </div>
  )
}

function TransactionBadge({ type }) {
  const map = {
    payment: { label: 'Ödeme', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    invoice: { label: 'Fatura', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    refund: { label: 'İade', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
    adjustment: { label: 'Düzeltme', className: 'bg-slate-100 text-slate-600 hover:bg-slate-100' },
  }

  const cfg = map[type] ?? {
    label: type,
    className: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  }

  return <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
}

