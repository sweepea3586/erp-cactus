import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'

export default async function App() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')
  redirect('/login')
}
