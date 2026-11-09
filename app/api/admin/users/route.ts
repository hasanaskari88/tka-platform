import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get('origin')

  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: 'Permintaan lintas situs ditolak.' },
      { status: 403 }
    )
  }

  return null
}

async function authorizeMutation(request: Request) {
  const originError = rejectCrossOriginMutation(request)
  if (originError) return { response: originError } as const

  const auth = await requireTrustedAdmin()
  if (!auth.authorized) {
    return {
      response: NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      ),
    } as const
  }

  return { auth } as const
}

// DELETE: Hapus akun Auth. profiles.id memiliki ON DELETE CASCADE.
export async function DELETE(req: Request) {
  try {
    const authorization = await authorizeMutation(req)
    if ('response' in authorization) return authorization.response

    const body = await req.json()
    const userId = typeof body.userId === 'string' ? body.userId : ''

    if (!UUID_PATTERN.test(userId)) {
      return NextResponse.json(
        { error: 'User ID tidak valid.' },
        { status: 400 }
      )
    }

    if (userId === authorization.auth.userId) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun sendiri.' },
        { status: 400 }
      )
    }

    const allowedAdminIds = (process.env.ADMIN_USER_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    if (allowedAdminIds.includes(userId)) {
      return NextResponse.json(
        {
          error:
            'Akun admin tepercaya tidak dapat dihapus melalui halaman ini. Perbarui daftar ADMIN_USER_IDS melalui prosedur admin terlebih dahulu.',
        },
        { status: 400 }
      )
    }

    const { error } =
      await authorization.auth.adminClient.auth.admin.deleteUser(userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Pengguna berhasil dihapus secara permanen.',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Terjadi kesalahan server.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT: Update profil dan password melalui service-role setelah verifikasi admin.
export async function PUT(req: Request) {
  try {
    const authorization = await authorizeMutation(req)
    if ('response' in authorization) return authorization.response

    const body = await req.json()
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const classCode =
      typeof body.classCode === 'string'
        ? body.classCode.trim().toUpperCase()
        : ''
    const role = body.role
    const newPassword =
      typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!UUID_PATTERN.test(userId)) {
      return NextResponse.json(
        { error: 'User ID tidak valid.' },
        { status: 400 }
      )
    }

    if (!fullName || fullName.length > 150) {
      return NextResponse.json(
        { error: 'Nama lengkap wajib diisi dan maksimal 150 karakter.' },
        { status: 400 }
      )
    }

    if (!classCode || classCode.length > 30) {
      return NextResponse.json(
        { error: 'Kode kelas wajib diisi dan maksimal 30 karakter.' },
        { status: 400 }
      )
    }

    if (role !== 'student' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Role pengguna tidak valid.' },
        { status: 400 }
      )
    }

    const allowedAdminIds = (process.env.ADMIN_USER_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    if (allowedAdminIds.includes(userId) && role !== 'admin') {
      return NextResponse.json(
        {
          error:
            'Role admin tepercaya tidak dapat diturunkan melalui halaman ini. Perbarui daftar ADMIN_USER_IDS melalui prosedur admin terlebih dahulu.',
        },
        { status: 400 }
      )
    }

    if (newPassword && newPassword.trim().length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter.' },
        { status: 400 }
      )
    }

    const { error: profileError } = await authorization.auth.adminClient
      .from('profiles')
      .update({
        full_name: fullName,
        class_code: classCode,
        role,
      })
      .eq('id', userId)

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    if (newPassword) {
      const { error: passwordError } =
        await authorization.auth.adminClient.auth.admin.updateUserById(userId, {
          password: newPassword.trim(),
        })

      if (passwordError) {
        return NextResponse.json(
          {
            error: `Profil berhasil diperbarui, tetapi password gagal diubah: ${passwordError.message}`,
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      message: 'Data pengguna berhasil diperbarui.',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Terjadi kesalahan server.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
