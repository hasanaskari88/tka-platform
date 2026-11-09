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
 * Verifies the session against Supabase Auth and then checks a server-only
 * allowlist. Do not use profiles.role here: current database policies allow
 * profile-role changes and are awaiting a separately approved RLS fix.
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

  const allowedAdminIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (allowedAdminIds.length === 0) {
    return {
      authorized: false,
      status: 503,
      error: 'Daftar admin tepercaya belum dikonfigurasi. Hubungi pengelola aplikasi.',
    }
  }

  if (!allowedAdminIds.includes(user.id)) {
    return {
      authorized: false,
      status: 403,
      error: 'Akses ditolak. Akun ini tidak terdaftar sebagai admin tepercaya.',
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

  return {
    authorized: true,
    userId: user.id,
    user,
    supabase,
    adminClient,
  }
}
