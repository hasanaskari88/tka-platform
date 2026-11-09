import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

const USERNAME_PATTERN = /^[a-z0-9._-]{2,40}$/

function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
  }
  return null
}

type ImportUser = {
  username: string
  fullName: string
  classCode: string
  password: string
  role?: 'student' | 'admin'
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginMutation(request)
    if (originError) return originError

    const authorization = await requireTrustedAdmin()
    if (!authorization.authorized) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status })
    }

    const body = await request.json()
    if (!Array.isArray(body.users) || body.users.length === 0 || body.users.length > 500) {
      return NextResponse.json({ error: 'Data harus berisi 1–500 pengguna.' }, { status: 400 })
    }

    const users: ImportUser[] = []
    const seen = new Set<string>()

    for (const row of body.users) {
      const username = typeof row.username === 'string' ? row.username.trim().toLowerCase() : ''
      const fullName = typeof row.fullName === 'string' ? row.fullName.trim() : ''
      const classCode = typeof row.classCode === 'string' ? row.classCode.trim().toUpperCase() : ''
      const password = typeof row.password === 'string' ? row.password : ''
      const role = row.role === undefined ? 'student' : row.role

      if (!USERNAME_PATTERN.test(username)) {
        return NextResponse.json({ error: `Username "${username}" tidak valid (2–40 karakter: huruf kecil, angka, titik, _ atau -).` }, { status: 400 })
      }
      if (seen.has(username)) {
        return NextResponse.json({ error: `Username "${username}" muncul lebih dari sekali dalam file.` }, { status: 400 })
      }
      if (!fullName || fullName.length > 150 || !classCode || classCode.length > 30) {
        return NextResponse.json({ error: `Nama atau kode kelas untuk "${username}" tidak valid.` }, { status: 400 })
      }
      if (password.length < 6) {
        return NextResponse.json({ error: `Password untuk "${username}" minimal 6 karakter.` }, { status: 400 })
      }
      if (role !== 'student' && role !== 'admin') {
        return NextResponse.json({ error: `Role untuk "${username}" tidak valid.` }, { status: 400 })
      }

      seen.add(username)
      users.push({ username, fullName, classCode, password, role })
    }

    const adminClient = authorization.adminClient
    const createdIds: string[] = []

    for (const user of users) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: `${user.username}@grisan.com`,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          full_name: user.fullName,
          class_code: user.classCode,
        },
      })

      if (error || !data.user) {
        await Promise.all(createdIds.map((id) => adminClient.auth.admin.deleteUser(id)))
        return NextResponse.json({
          error: `Import dihentikan pada @${user.username}: ${error?.message || 'Akun gagal dibuat.'} Semua akun yang sempat dibuat dalam proses ini sudah dibatalkan.`,
        }, { status: 400 })
      }

      createdIds.push(data.user.id)

      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: data.user.id,
        username: user.username,
        full_name: user.fullName,
        class_code: user.classCode,
        role: user.role,
        plain_password: user.password,
      }, { onConflict: 'id' })

      if (profileError) {
        await Promise.all(createdIds.map((id) => adminClient.auth.admin.deleteUser(id)))
        return NextResponse.json({
          error: `Profil @${user.username} gagal disimpan: ${profileError.message}. Akun yang sempat dibuat dalam proses ini sudah dibatalkan.`,
        }, { status: 400 })
      }
    }

    return NextResponse.json({ message: `Berhasil mengimpor ${createdIds.length} akun.`, count: createdIds.length }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
