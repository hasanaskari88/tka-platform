import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'


const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Vary: 'Cookie',
    },
  })
}

/**
 * Mengambil kredensial hanya untuk kartu yang dipilih admin tepercaya.
 * plain_password sengaja dipertahankan karena kartu harus menampilkan
 * password yang dapat dibaca siswa untuk login.
 */
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin) {
      return jsonNoStore({ error: 'Permintaan lintas situs ditolak.' }, 403)
    }

    const authorization = await requireTrustedAdmin()
    if (!authorization.authorized) {
      return jsonNoStore({ error: authorization.error }, authorization.status)
    }

    const body = await request.json().catch(() => null)
    const rawIds = body && Array.isArray(body.userIds) ? body.userIds : null

    if (!rawIds || rawIds.length === 0 || rawIds.length > 500) {
      return jsonNoStore(
        { error: 'Pilih antara 1 sampai 500 pengguna untuk dicetak.' },
        400
      )
    }

    if (
      rawIds.some((id: unknown) => typeof id !== 'string' || !UUID_PATTERN.test(id))
    ) {
      return jsonNoStore({ error: 'Daftar User ID tidak valid.' }, 400)
    }

    const userIds = [...new Set(rawIds as string[])]
    if (userIds.length !== rawIds.length) {
      return jsonNoStore({ error: 'Daftar pengguna mengandung ID duplikat.' }, 400)
    }

    const { data, error } = await authorization.adminClient
      .from('profiles')
      .select('id, username, full_name, class_code, plain_password')
      .in('id', userIds)

    if (error) {
      return jsonNoStore(
        { error: 'Data kartu gagal diambil. Silakan coba kembali.' },
        500
      )
    }

    if (!data || data.length !== userIds.length) {
      return jsonNoStore(
        { error: 'Sebagian pengguna tidak ditemukan. Muat ulang daftar pengguna.' },
        404
      )
    }

    const users = data.map((profile: any) => ({
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      class_code: profile.class_code,
      // Nilai ini hanya dikirim setelah pemeriksaan admin tepercaya.
      plain_password: profile.plain_password,
    }))

    return jsonNoStore({ users })
  } catch {
    return jsonNoStore({ error: 'Terjadi kesalahan saat menyiapkan kartu.' }, 500)
  }
}
