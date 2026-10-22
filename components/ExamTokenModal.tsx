'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  if (!isOpen || !exam) return null

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsVerifying(true)

    const now = new Date()

    // 1. Cek Jadwal Mulai
    if (exam.start_time && new Date(exam.start_time) > now) {
      setErrorMsg(
        `Ujian belum dibuka. Ujian dimulai pada: ${new Date(
          exam.start_time
        ).toLocaleString('id-ID')}`
      )
      setIsVerifying(false)
      return
    }

    // 2. Cek Jadwal Selesai
    if (exam.end_time && new Date(exam.end_time) < now) {
      setErrorMsg('Masa berlaku ujian ini telah berakhir.')
      setIsVerifying(false)
      return
    }

    // 3. Cek Validasi Token Ujian (Jika Ditentukan)
    if (
      exam.token &&
      inputToken.trim().toUpperCase() !== exam.token.toUpperCase()
    ) {
      setErrorMsg('Token ujian yang Anda masukkan salah / tidak valid.')
      setIsVerifying(false)
      return
    }

    // Jika Semua Validasi Lolos -> Pindah ke Halaman CBT
    router.push(`/exam/${exam.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
        <div className="flex justify-between items-start border-b pb-3">
          <div>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase">
              {exam.subtest}
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">
              Konfirmasi Akses Ujian
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
            suppressHydrationWarning
          >
            ✕
          </button>
        </div>

        {/* Informasi Ujian */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
          <div className="flex justify-between">
            <span>Judul Ujian:</span>
            <span className="font-bold text-slate-800">{exam.title}</span>
          </div>
          <div className="flex justify-between">
            <span>Durasi:</span>
            <span className="font-bold text-slate-800">
              {exam.duration_minutes} Menit
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

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleStartExam} className="space-y-4">
          {exam.token ? (
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
      </div>
    </div>
  )
}