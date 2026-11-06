
import { createClient } from './server'

export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      authorized: false as const,
      status: 401,
      error: 'Silakan login terlebih dahulu.',
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return {
      authorized: false as const,
      status: 403,
      error: 'Akses ditolak. Fitur ini khusus admin.',
    }
  }

  return {
    authorized: true as const,
    supabase,
    user,
  }
}
