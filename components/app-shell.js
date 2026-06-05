'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, Users, Receipt, Warehouse, Truck,
  ShoppingCart, Wallet, BarChart3, Settings, LogOut, Menu, X, Bell, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const NAV = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/urunler', label: 'Ürünler', icon: Package },
  { href: '/musteriler', label: 'Müşteriler', icon: Users },
  { href: '/satislar', label: 'Satışlar', icon: Receipt },
  { href: '/stok', label: 'Stok Yönetimi', icon: Warehouse },
  { href: '/tedarikciler', label: 'Tedarikçiler', icon: Truck },
  { href: '/alimlar', label: 'Alımlar', icon: ShoppingCart },
  { href: '/cari', label: 'Cari Hesap', icon: Wallet },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

export function AppShell({ children, user }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Çıkış yapıldı')
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <div className="leading-tight">
              <div className="font-bold text-slate-900 text-sm">Cactus</div>
              <div className="text-[10px] text-slate-500">Light &amp; Sound</div>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden"><X className="h-5 w-5" /></button>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                )}>
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              {(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{user?.full_name || user?.username}</div>
              <div className="text-xs text-slate-500 capitalize">{user?.role === 'admin' ? 'Yönetici' : 'Personel'}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={logout} title="Çıkış"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden"><Menu className="h-5 w-5" /></button>
            <h1 className="text-lg font-semibold text-slate-900">{NAV.find(n => pathname.startsWith(n.href))?.label || 'Panel'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon"><Bell className="h-5 w-5 text-slate-600" /></Button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
