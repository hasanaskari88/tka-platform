'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [classCode, setClassCode] = useState('')
  const [password, setPassword] = useState('')
  
  // State untuk kontrol visibilitas kata sandi (Lihat / Sembunyikan)
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    // Bersihkan username (tanpa spasi, huruf kecil)
    const cleanedUsername = username.trim().toLowerCase().replace(/\s+/g, '')
    // Konversi username ke domain email internal yang valid
    const internalEmail = `${cleanedUsername}@grisan.com`

    const supabase = createClient()

    if (isRegister) {
      // Pendaftaran Akun Baru (Register)
      const { data, error } = await supabase.auth.signUp({
        email: internalEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            username: cleanedUsername,
            class_code: classCode.trim().toUpperCase(),
          },
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setErrorMsg('Username ini sudah terdaftar. Silakan gunakan username lain.')
        } else {
          setErrorMsg(error.message)
        }
      } else {
        setSuccessMsg(
          'Pendaftaran akun berhasil! Silakan masuk dengan Username & Password Anda.'
        )
        setIsRegister(false)
        setPassword('')
        setShowPassword(false)
      }
    } else {
      // Masuk ke Akun (Login)
      const { error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      })

      if (error) {
        setErrorMsg('Username atau Password salah. Silakan periksa kembali.')
      } else {
        router.push('/')
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        {/* Header Form */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            {isRegister ? 'Pendaftaran Siswa Baru' : 'Masuk Ujian TKA'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRegister
              ? 'Isi data & Kode Kelas dari Guru/Admin'
              : 'Gunakan Username & Password yang telah didaftarkan'}
          </p>
        </div>

        {/* Notifikasi Error / Sukses */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">
            {successMsg}
          </div>
        )}

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nama Lengkap Siswa
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Ahmad Rizki"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Username / NISN
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: arizki123 atau 00543210"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Kode Kelas / Kode Admin
              </label>
              <input
                type="text"
                required
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="Contoh: TKA-IPA1 atau XII-2026"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm uppercase"
              />
            </div>
          )}

          {/* Input Password dengan Tombol Toggle Mata */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Kata Sandi / Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 text-xs font-semibold px-1 py-1 focus:outline-none transition-colors"
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? '🙈 Sembunyi' : '👁️ Lihat'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 mt-2"
          >
            {loading
              ? 'Memproses...'
              : isRegister
              ? 'Daftar Akun Siswa'
              : 'Masuk Sekarang'}
          </button>
        </form>

        {/* Toggle Form */}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-600">
          {isRegister ? (
            <p>
              Sudah memiliki akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false)
                  setErrorMsg(null)
                }}
                className="text-indigo-600 font-bold hover:underline"
              >
                Masuk di sini
              </button>
            </p>
          ) : (
            <p>
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true)
                  setErrorMsg(null)
                }}
                className="text-indigo-600 font-bold hover:underline"
              >
                Daftar akun siswa
              </button>
            </p>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  )
}