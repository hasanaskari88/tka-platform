import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Inisialisasi Supabase Admin Client menggunakan Service Role Key / Anon Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// DELETE: Hapus Pengguna dari auth.users & public.profiles
export async function DELETE(req: Request) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib diisi' }, { status: 400 })
    }

    // 1. Hapus dari public.profiles
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // 2. Hapus dari auth.users jika Service Role Key tersedia
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
    }

    return NextResponse.json({ message: 'Pengguna berhasil dihapus secara permanen' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Update Data Pengguna / Password
export async function PUT(req: Request) {
  try {
    const { userId, fullName, classCode, role, newPassword } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib diisi' }, { status: 400 })
    }

    // 1. Update Profil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        class_code: classCode,
        role: role,
      })
      .eq('id', userId)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // 2. Update Password Pengguna (jika diisi)
    if (newPassword && newPassword.trim().length >= 6) {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        })
      }
    }

    return NextResponse.json({ message: 'Data pengguna berhasil diperbarui' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}