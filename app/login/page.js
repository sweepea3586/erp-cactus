'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Leaf, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@cactus.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [fullName, setFullName] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const url = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
      const body = mode === 'signup' ? { email, password, full_name: fullName } : { email, password }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız')
      if (mode === 'signup') {
        toast.success('Kayıt başarılı! Şimdi giriş yapabilirsiniz.')
        setMode('login')
      } else {
        toast.success('Hoş geldiniz!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg mb-3">
            <Leaf className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Cactus Light &amp; Sound</h1>
          <p className="text-sm text-slate-500">Kurumsal ERP Sistemi</p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle>{mode === 'signup' ? 'Hesap Oluştur' : 'Giriş Yap'}</CardTitle>
            <CardDescription>
              {mode === 'signup' ? 'Yeni bir hesap oluşturun.' : 'Supabase hesabınızla oturum açın.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Ad Soyad</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={6} />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {mode === 'signup' ? 'Kayıt Ol' : 'Giriş Yap'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-emerald-600 hover:underline"
              >
                {mode === 'login' ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
