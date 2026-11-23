import { createClient as createSupabaseAdminClient, type User } from '@supabase/supabase-js'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'

type TrustedAdminResult =
  | {
      authorized: true
      userId: string
      user: User
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      adminClient: any
    }
  | {
      authorized: false
      status: 401 | 403 | 503
      error: string
    }

/**
 * Memverifikasi sesi Supabase, lalu memeriksa role melalui service role.
 * Ini aman karena perubahan profiles.role oleh pengguna biasa diblokir
 * oleh trigger database prevent_profile_role_escalation.
 */
export async function requireTrustedAdmin(): Promise<TrustedAdminResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      authorized: false,
      status: 401,
      error: 'Silakan login terlebih dahulu.',
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      authorized: false,
      status: 503,
      error: 'Konfigurasi layanan admin belum lengkap.',
    }
  }

  const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Trusted admin role lookup failed:', profileError)
    return {
      authorized: false,
      status: 503,
      error: 'Status admin belum dapat diverifikasi. Silakan coba kembali.',
    }
  }

  if (profile?.role !== 'admin') {
    return {
      authorized: false,
      status: 403,
      error: 'Akses ditolak. Akun ini tidak memiliki hak admin.',
    }
  }

  return {
    authorized: true,
    userId: user.id,
    user,
    supabase,
    adminClient,
  }
}
