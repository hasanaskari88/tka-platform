import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'

type Access = {
  adminClient: any
  isGlobalAdmin: boolean
  assignedClassCodes: string[]
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
  }
  return null
}

async function getAccess(): Promise<Access | NextResponse> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Konfigurasi layanan admin belum lengkap.' }, { status: 503 })
  }

  const adminClient = createSupabaseAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Admin utama harus masuk allowlist server. Guru dikenali melalui penugasan
  // wali kelas aktif yang dikelola dari halaman Pengaturan Dokumen.
  const trustedIds = (process.env.ADMIN_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean)
  const isGlobalAdmin = trustedIds.includes(user.id)
  let assignedClassCodes: string[] = []

  if (!isGlobalAdmin) {
    const { data: assignments, error: assignmentError } = await adminClient
      .from('teacher_signatories')
      .select('class_code')
      .eq('user_id', user.id)
      .eq('position', 'class_teacher')
      .eq('is_active', true)

    if (assignmentError) {
      return NextResponse.json({ error: 'Penugasan kelas tidak dapat diverifikasi.' }, { status: 500 })
    }

    assignedClassCodes = [...new Set((assignments || [])
      .map((row: any) => String(row.class_code || '').trim())
      .filter(Boolean))]

    if (assignedClassCodes.length === 0) {
      return NextResponse.json({ error: 'Akun ini belum memiliki penugasan wali kelas aktif.' }, { status: 403 })
    }
  }

  return { adminClient, isGlobalAdmin, assignedClassCodes }
}

async function fetchAll(makeQuery: () => any) {
  const rows: any[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

export async function GET() {
  try {
    const access = await getAccess()
    if (access instanceof NextResponse) return access
    const { adminClient, isGlobalAdmin, assignedClassCodes } = access

    const students = await fetchAll(() => {
      let query = adminClient.from('profiles')
        .select('id,full_name,username,class_code')
        .eq('role', 'student')
        .order('full_name')
      if (!isGlobalAdmin) query = query.in('class_code', assignedClassCodes)
      return query
    })

    const studentIds = students.map((student: any) => student.id)
    const [exams, examSessions, practiceAttempts, settings] = await Promise.all([
      fetchAll(() => adminClient.from('exams')
        .select('id,title,subtest,target_mode,activity_type')
        .order('title')),
      studentIds.length ? fetchAll(() => adminClient.from('exam_sessions')
        .select('id,user_id,exam_id,status,score,score_override,bonus_points,start_time,end_time,submitted_at,completed_at')
        .in('user_id', studentIds)
        .order('created_at', { ascending: false })) : Promise.resolve([]),
      studentIds.length ? fetchAll(() => adminClient.from('practice_attempts')
        .select('id,user_id,exam_id,attempt_number,status,score,started_at,completed_at,created_at')
        .in('user_id', studentIds)
        .order('created_at', { ascending: false })) : Promise.resolve([]),
      adminClient.from('school_document_settings').select('kkm').eq('id', 'primary').maybeSingle(),
    ])

    if (settings.error) throw settings.error

    return NextResponse.json({
      students,
      exams,
      examSessions,
      practiceAttempts,
      assignedClassCodes,
      isGlobalAdmin,
      kkm: Number(settings.data?.kkm ?? 70),
    })
  } catch (error: any) {
    console.error('Rekap nilai GET:', error)
    return NextResponse.json({ error: error?.message || 'Data rekap nilai gagal dimuat.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const originError = rejectCrossOriginMutation(request)
  if (originError) return originError

  try {
    const access = await getAccess()
    if (access instanceof NextResponse) return access
    const { adminClient, isGlobalAdmin, assignedClassCodes } = access
    const body = await request.json()
    const items = Array.isArray(body.items) ? body.items : []

    if (items.length === 0 || items.length > 200) {
      return NextResponse.json({ error: 'Pilih 1–200 riwayat untuk dihapus.' }, { status: 400 })
    }

    const examIds = [...new Set(items.filter((x: any) => x?.kind === 'exam' && UUID_PATTERN.test(String(x.id))).map((x: any) => String(x.id)))]
    const practiceIds = [...new Set(items.filter((x: any) => x?.kind === 'practice' && UUID_PATTERN.test(String(x.id))).map((x: any) => String(x.id)))]
    if (examIds.length + practiceIds.length !== items.length) {
      return NextResponse.json({ error: 'Daftar riwayat tidak valid.' }, { status: 400 })
    }

    const selectedRows = await Promise.all([
      examIds.length ? adminClient.from('exam_sessions').select('id,user_id').in('id', examIds) : Promise.resolve({ data: [], error: null }),
      practiceIds.length ? adminClient.from('practice_attempts').select('id,user_id').in('id', practiceIds) : Promise.resolve({ data: [], error: null }),
    ])
    if (selectedRows.some((result: any) => result.error)) {
      return NextResponse.json({ error: 'Riwayat terpilih gagal diverifikasi.' }, { status: 500 })
    }

    const rows = [...(selectedRows[0].data || []), ...(selectedRows[1].data || [])]
    if (rows.length !== items.length) {
      return NextResponse.json({ error: 'Sebagian riwayat tidak ditemukan. Muat ulang halaman.' }, { status: 409 })
    }

    if (!isGlobalAdmin) {
      const userIds = [...new Set(rows.map((row: any) => row.user_id).filter(Boolean))]
      const { data: profiles, error: profileError } = await adminClient
        .from('profiles').select('id,class_code').in('id', userIds)
      if (profileError) throw profileError
      const allowed = new Set(assignedClassCodes)
      const unauthorized = (profiles || []).some((profile: any) => !allowed.has(String(profile.class_code || '').trim()))
      if (unauthorized || (profiles || []).length !== userIds.length) {
        return NextResponse.json({ error: 'Penghapusan ditolak: ada riwayat di luar kelas ampuan.' }, { status: 403 })
      }
    }

    const [deletedExam, deletedPractice] = await Promise.all([
      examIds.length ? adminClient.from('exam_sessions').delete().in('id', examIds).select('id') : Promise.resolve({ data: [], error: null }),
      practiceIds.length ? adminClient.from('practice_attempts').delete().in('id', practiceIds).select('id') : Promise.resolve({ data: [], error: null }),
    ])
    if (deletedExam.error || deletedPractice.error) {
      throw deletedExam.error || deletedPractice.error
    }

    return NextResponse.json({
      deletedExam: deletedExam.data?.length || 0,
      deletedPractice: deletedPractice.data?.length || 0,
    })
  } catch (error: any) {
    console.error('Rekap nilai DELETE:', error)
    return NextResponse.json({ error: error?.message || 'Riwayat gagal dihapus.' }, { status: 500 })
  }
}
