'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ExamTokenModalProps {
  exam: any
  isOpen: boolean
  onClose: () => void
}

export default function ExamTokenModal({
  exam,
  isOpen,
  onClose,
}: ExamTokenModalProps) {
  const router = useRouter()
  const [inputToken, setInputToken] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  // 🟢 State Pengecekan Identitas & Profil User Login
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isCheckingUser, setIsCheckingUser] = useState(true)

  // 🟢 Effect untuk Memeriksa Status User Saat Modal Dibuka
  useEffect(() => {
    let isMounted = true

    async function checkUserSession() {
      if (!isOpen) return
      setIsCheckingUser(true)
      setErrorMsg(null)

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user && isMounted) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          if (profile) {
            setUserProfile(profile)
          } else {
            setUserProfile({
              full_name: user.email?.split('@')[0] || 'Siswa',
              username: user.email,
            })
          }
        } else if (isMounted) {
          setUserProfile(null)
        }
      } catch (err) {
        console.error('Gagal memuat status user:', err)
      } finally {
        if (isMounted) setIsCheckingUser(false)
      }
    }

    checkUserSession()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  if (!isOpen || !exam) return null

  // Toleransi Nama Kolom Token & Durasi dari Database
  const activeToken = exam.token || exam.token_code || null
  const durationVal = exam.duration_minutes || exam.duration || 15

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsVerifying(true)

    try {
      const now = new Date()

      // 1. Cek Jadwal Mulai Ujian
      if (exam.start_time && new Date(exam.start_time) > now) {
        setErrorMsg(
          `Ujian belum dibuka. Ujian dimulai pada: ${new Date(
            exam.start_time
          ).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
        )
        setIsVerifying(false)
        return
      }

      // 2. Cek Jadwal Selesai Ujian
      if (exam.end_time && new Date(exam.end_time) < now) {
        setErrorMsg('Masa berlaku ujian ini telah berakhir.')
        setIsVerifying(false)
        return
      }

      // 3. Cek Validasi Token Ujian (Jika Ditentukan)
      if (
        activeToken &&
        inputToken.trim().toUpperCase() !== activeToken.trim().toUpperCase()
      ) {
        setErrorMsg('Token ujian yang Anda masukkan salah / tidak valid.')
        setIsVerifying(false)
        return
      }

      // Jika Semua Validasi Lolos -> Pindah ke Ruang Ujian CBT
      router.push(`/exam/${exam.id}`)
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi. Silahkan reload halaman dan coba lagi.')
      setIsVerifying(false)
    }
  }

  // Helper untuk Memuat Ulang Halaman Jika Mengalami Freeze / Stuck
  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
        
        {/* HEADER MODAL */}
        <div className="flex justify-between items-start border-b pb-3 border-slate-100">
          <div>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase">
              {exam.subtest || 'SUBTES'}
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">
              Konfirmasi Akses Ujian
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
            suppressHydrationWarning
          >
            ✕
          </button>
        </div>

        {/* INFORMASI DETAIL UJIAN */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
          <div className="flex justify-between">
            <span>Judul Ujian:</span>
            <span className="font-bold text-slate-800">{exam.title}</span>
          </div>
          <div className="flex justify-between">
            <span>Durasi:</span>
            <span className="font-bold text-slate-800">
              {durationVal} Menit
            </span>
          </div>
          {exam.start_time && (
            <div className="flex justify-between">
              <span>Jadwal Buka:</span>
              <span className="font-semibold text-indigo-700">
                {new Date(exam.start_time).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          )}
          {exam.end_time && (
            <div className="flex justify-between">
              <span>Jadwal Tutup:</span>
              <span className="font-semibold text-rose-600">
                {new Date(exam.end_time).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          )}
        </div>

        {/* 🟢 BLOK PENGECEKAN IDENTITAS & STATUS LOGIN USER */}
        <div className="p-3 rounded-xl border text-xs space-y-1.5 transition-all">
          {isCheckingUser ? (
            <div className="flex items-center space-x-2 text-slate-500 font-medium py-1">
              <span className="w-3 h-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></span>
              <span>Memeriksa status akun login Anda...</span>
            </div>
          ) : userProfile ? (
            /* KONDISI A: USER SUDAH LOGIN */
            <div className="bg-emerald-50 border-emerald-200 p-3 rounded-lg border space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-emerald-800">
                  👤 Mengerjakan Sebagai:
                </span>
                <span className="text-[9px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                  Akun Aktif
                </span>
              </div>
              <p className="font-bold text-slate-800 text-xs truncate">
                {userProfile.full_name}
              </p>
              <p className="text-[10px] text-slate-500">
                {userProfile.class_code
                  ? `Kelas ${userProfile.class_code}`
                  : `@${userProfile.username || 'siswa'}`}
              </p>
              <div className="pt-1 text-[10px] text-slate-500 flex justify-between items-center border-t border-emerald-200/60 mt-1">
                <span>Bukan akun kamu?</span>
                <Link
                  href="/login"
                  className="font-bold text-indigo-700 hover:underline"
                >
                  Ganti Akun / Login Ulang →
                </Link>
              </div>
            </div>
          ) : (
            /* KONDISI B: USER BELUM LOGIN (MODE TAMU) */
            <div className="bg-amber-50 border-amber-200 p-3 rounded-lg border space-y-1.5">
              <span className="text-amber-800 font-bold block text-[11px]">
                ⚠️ Status: Belum Login (Mode Tamu)
              </span>
              <p className="text-[10px] text-amber-900 leading-relaxed">
                Anda dapat langsung mengerjakan, namun <span className="font-bold">hasil & poin XP tidak tersimpan</span> di riwayat akun pribadi.
              </p>
              <div className="pt-1 flex items-center justify-between">
                <Link
                  href="/login"
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded transition-colors"
                >
                  🔑 Masuk (Login)
                </Link>
                <span className="text-[10px] text-slate-400 font-medium">atau lanjut pengerjaan ↓</span>
              </div>
            </div>
          )}
        </div>

        {/* PESAN ERROR DENGAN PETUNJUK RELOAD */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium space-y-1">
            <p>{errorMsg}</p>
            <p className="text-[10px] text-slate-500">
              Macet atau bermasalah? <button type="button" onClick={handleReload} className="underline font-bold text-indigo-600">Silahkan reload halaman</button>.
            </p>
          </div>
        )}

        {/* FORM INPUT TOKEN & TOMBOL AKSI */}
        <form onSubmit={handleStartExam} className="space-y-4">
          {activeToken ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Masukkan Token Ujian (6 Digit)
              </label>
              <input
                type="text"
                maxLength={6}
                required
                placeholder="Contoh: X7K29A"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-center font-mono font-bold text-lg tracking-widest text-indigo-700 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-600"
                suppressHydrationWarning
              />
            </div>
          ) : (
            <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-center font-medium">
              ✓ Ujian ini tidak memerlukan token. Klik tombol di bawah untuk mulai.
            </p>
          )}

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              suppressHydrationWarning
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              suppressHydrationWarning
            >
              {isVerifying ? 'Memeriksa...' : 'Mulai Kerjakan →'}
            </button>
          </div>
        </form>

        {/* PETUNJUK MANUSIAWI JIKA SISTEM MACET / FREEZE */}
        <div className="text-center pt-1 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            Jika sistem macet / freeze, <button type="button" onClick={handleReload} className="text-indigo-600 font-bold hover:underline" suppressHydrationWarning>silahkan reload halaman</button>.
          </p>
        </div>

      </div>
    </div>
  )
}