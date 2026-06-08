import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'

export default async function AppLayout({ children }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return <AppShell user={user}>{children}</AppShell>
}
