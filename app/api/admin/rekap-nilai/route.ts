import { NextResponse } from 'next/server'
import { getRekapNilaiAccess } from '@/lib/supabase/rekap-nilai-access'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
  }
  return null
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
    const access = await getRekapNilaiAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    const { adminClient, isGlobalAdmin, assignedClassCodes } = access

    // Ambil seluruh siswa dan seluruh riwayat. Penugasan hanya dipakai
    // sebagai nilai filter awal pada halaman, bukan untuk membatasi data.
    const students = await fetchAll(() => adminClient.from('profiles')
      .select('id,full_name,username,class_code')
      .eq('role', 'student')
      .order('full_name'))

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
    const access = await getRekapNilaiAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    const { adminClient } = access
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

    // Tidak ada pemeriksaan class_code di sini: penghapusan terpilih
    // tidak dibatasi pada kelas ampuan.
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
