'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

// 🎨 Daftar Template Avatar & Ikon Karakter Ringan
const AVATAR_TEMPLATES = [
  { id: '👨‍🚀', name: 'Astronaut' },
  { id: '🤖', name: 'Robot' },
  { id: '🐱', name: 'Kucing Pintar' },
  { id: '🦊', name: 'Rubah Cerdik' },
  { id: '🦁', name: 'Singa Pemberani' },
  { id: '🦄', name: 'Unicorn' },
  { id: '🦉', name: 'Burung Hantu Bijak' },
  { id: '🐉', name: 'Naga Api' },
  { id: '🧙‍♂️', name: 'Penyihir' },
  { id: '🦸‍♂️', name: 'Pahlawan' },
  { id: '🎮', name: 'Gamer' },
  { id: '🌟', name: 'Bintang' },
  { id: '🏆', name: 'Juara' },
  { id: '👑', name: 'Raja/Ratu' },
  { id: '🐼', name: 'Panda' },
  { id: '🚀', name: 'Roket' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 📝 State Form Edit Profil
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [classCode, setClassCode] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('👨‍🚀')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // 📊 State Statistik Gamifikasi
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)

  // 🔔 Pesan Notifikasi (Sukses / Error)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 1. Ambil Data User & Profil dari Supabase Saat Halaman Dimuat
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        setUser(user)

        // Ambil data profil dari tabel 'profiles'
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          setFullName(profile.full_name || '')
          setUsername(profile.username || user.email?.split('@')[0] || '')
          setClassCode(profile.class_code || '')
          setSelectedAvatar(profile.avatar_url || '👨‍🚀')
          setXp(profile.xp || 0)
          setLevel(profile.level || 1)
        } else {
          setFullName(user.email?.split('@')[0] || 'Siswa')
          setUsername(user.email?.split('@')[0] || 'siswa')
        }
      } catch (err: any) {
        console.error('Gagal memuat profil:', err)
        setMessage({ type: 'error', text: 'Gagal memuat data profil Anda.' })
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [router])

  // 2. Fungsi Simpan Perubahan Profil
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Nama Lengkap wajib diisi!' })
      return
    }

    // Validasi Ubah Password (Jika Diisi)
    if (newPassword.trim()) {
      if (newPassword.length < 6) {
        setMessage({ type: 'error', text: 'Password baru minimal 6 karakter!' })
        return
      }
      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' })
        return
      }
    }

    setIsSaving(true)

    try {
      const supabase = createClient()

      // A. Update Tabel Profiles di Database (Termasuk avatar_url)
      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '')
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: cleanUsername,
          class_code: classCode.trim().toUpperCase(),
          avatar_url: selectedAvatar,
        })
        .eq('id', user.id)

      if (profileErr) {
        throw new Error(profileErr.message)
      }

      // B. Update Password di Supabase Auth (Jika Diisi)
      if (newPassword.trim()) {
        const { error: pwdErr } = await supabase.auth.updateUser({
          password: newPassword.trim(),
        })

        if (pwdErr) {
          throw new Error(`Gagal mengubah password: ${pwdErr.message}`)
        }
      }

      setMessage({
        type: 'success',
        text: '🎉 Profil & Karakter Avatar berhasil disimpan!',
      })
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat menyimpan profil.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
        <p className="text-white/80 font-semibold bg-slate-900/60 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
          Memuat halaman profil... ⏳
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        
        {/* HEADER PAGE */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black rounded-full uppercase tracking-wider">
              ⚙️ PENGATURAN AKUN
            </span>
            <h1 className="text-2xl font-black text-white mt-1">Pengaturan Profil Siswa</h1>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800"
          >
            ← Kembali ke Beranda
          </Link>
        </div>

        {/* KARTU PREVIEW AKUN & AVATAR HARIAN */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/80 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
              {selectedAvatar}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{fullName || 'Nama Siswa'}</h2>
              <p className="text-xs text-indigo-300 font-semibold">
                {classCode ? `Kelas ${classCode}` : 'Belum diatur kelas'} • @{username || 'username'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950/70 px-4 py-2.5 rounded-2xl border border-slate-800 text-center">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Total XP</span>
              <span className="text-sm font-black text-amber-400">⭐ {xp}</span>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Level</span>
              <span className="text-sm font-black text-purple-300">🎖️ Lvl {level}</span>
            </div>
          </div>
        </div>

        {/* PESAN NOTIFIKASI */}
        {message && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold backdrop-blur-md transition-all ${
              message.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* FORM EDIT PROFIL */}
        <form onSubmit={handleSaveProfile} className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
          
          {/* 🎭 SEKSI PILIH TEMPLATE AVATAR / IKON KARAKTER */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>🎭 Pilih Karakter Avatar Kamu</span>
              <span className="text-[10px] text-indigo-400 normal-case">Pilih 1 ikon favorit</span>
            </h3>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 pt-1">
              {AVATAR_TEMPLATES.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    title={avatar.name}
                    className={`p-3 rounded-2xl text-2xl flex items-center justify-center transition-all transform hover:scale-110 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-2 border-indigo-400 shadow-lg shadow-indigo-600/40 scale-105'
                        : 'bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300'
                    }`}
                  >
                    {avatar.id}
                  </button>
                )
              })}
            </div>
          </div>

          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2 pt-2">
            ✏️ Informasi Identitas
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* NAMA LENGKAP */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Nama Lengkap Siswa <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* USERNAME */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: budisantoso"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* KELAS */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Kelas
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="Contoh: 6A / 5B"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold uppercase"
              />
            </div>
          </div>

          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-2 pt-2">
            🔒 Ubah Password (Opsional)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Password Baru
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Biarkan kosong jika tidak diubah"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* TOMBOL SIMPAN */}
          <div className="pt-3 flex justify-end space-x-3 border-t border-slate-800">
            <Link
              href="/"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
            </button>
          </div>
        </form>

      </main>
    </div>
  )
}