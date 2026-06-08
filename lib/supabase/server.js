import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component'lerde set() çağrılamaz; middleware'in halletmesine bırak.
          }
        },
      },
    }
  )
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()
  if (profile) return profile
  // Fallback: kullanıcı kaydı yoksa minimum bilgi döndür
  return {
    id: user.id,
    username: user.email?.split('@')[0] || 'user',
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email,
    role: user.user_metadata?.role || 'staff',
  }
}
