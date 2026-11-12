import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'

export type RekapNilaiAccess =
  | {
      authorized: true
      adminClient: any
      isGlobalAdmin: boolean
      assignedClassCodes: string[]
    }
  | {
      authorized: false
      status: 401 | 403 | 500 | 503
      error: string
    }

/**
 * Admin tepercaya atau guru kelas aktif boleh membuka Rekap Nilai.
 * Penugasan guru hanya menentukan filter awal; bukan pembatas data.
 */
export async function getRekapNilaiAccess(): Promise<RekapNilaiAccess> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, status: 401, error: 'Silakan login terlebih dahulu.' }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return { authorized: false, status: 503, error: 'Konfigurasi layanan admin belum lengkap.' }
  }

  const adminClient = createSupabaseAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const trustedIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const isGlobalAdmin = trustedIds.includes(user.id)

  const { data: assignments, error: assignmentError } = await adminClient
    .from('teacher_signatories')
    .select('class_code')
    .eq('user_id', user.id)
    .eq('position', 'class_teacher')
    .eq('is_active', true)

  if (assignmentError) {
    return {
      authorized: false,
      status: 500,
      error: 'Penugasan guru kelas gagal diperiksa.',
    }
  }

  const assignedClassCodes = [...new Set((assignments || [])
    .map((row: any) => String(row.class_code || '').trim())
    .filter(Boolean))]

  if (!isGlobalAdmin && assignedClassCodes.length === 0) {
    return {
      authorized: false,
      status: 403,
      error: 'Akses Rekap Nilai hanya untuk admin atau guru kelas yang memiliki penugasan aktif.',
    }
  }

  return { authorized: true, adminClient, isGlobalAdmin, assignedClassCodes }
}
