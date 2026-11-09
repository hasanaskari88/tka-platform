
'use client'

import { useState } from 'react'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface FlashcardProps {
  exam: any
  questions: any[]
}

export default function FlashcardEngine({
  exam,
  questions,
}: FlashcardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [notice, setNotice] = useState('')

  const currentQuestion = questions?.[currentIndex]
  const totalQuestions = questions?.length ?? 0

  const handleUnderstand = async () => {
    if (isSaving || isComplete || !currentQuestion) return

    setIsSaving(true)
    setNotice('')

    const earned = 10
    let syncFailed = false

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        syncFailed = true
      } else if (user) {
        const { error } = await supabase.rpc('add_user_xp', {
          user_id_input: user.id,
          xp_to_add: earned,
        })

        if (error) syncFailed = true
      }
    } catch {
      syncFailed = true
    }

    setXpEarned((prev) => prev + earned)
    setIsFlipped(false)

    if (currentIndex >= totalQuestions - 1) {
      setIsComplete(true)
    } else {
      setCurrentIndex((prev) => prev + 1)
    }

    if (syncFailed) {
      setNotice(
        'Kartu berhasil diselesaikan, tetapi sinkronisasi XP perlu diperiksa.'
      )
    } else {
      setNotice('')
    }

    setIsSaving(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      <header className="bg-slate-950 px-4 sm:px-6 py-4 flex justify-between items-center gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/practice"
            className="shrink-0 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300"
          >
            ← Keluar
          </Link>

          <div className="min-w-0">
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-1 rounded font-extrabold border border-amber-500/30">
              🃏 FLASHCARD
            </span>
            <h1 className="text-sm font-bold mt-1 truncate">
              {exam?.title || 'Kartu Pengingat'}
            </h1>
          </div>
        </div>

        <div className="shrink-0 font-mono font-bold text-amber-400 text-sm">
          ⭐ {xpEarned} XP
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col items-center justify-center gap-6">
        {totalQuestions === 0 ? (
          <div className="w-full text-center bg-slate-950 border border-slate-800 rounded-3xl p-8">
            <div className="text-5xl mb-4">🃏</div>
            <h2 className="text-xl font-bold mb-2">
              Belum Ada Kartu
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Belum ada soal untuk latihan ini. Silakan kembali
              ke halaman latihan atau hubungi guru.
            </p>
            <Link
              href="/practice"
              className="inline-block px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm"
            >
              Kembali ke Latihan
            </Link>
          </div>
        ) : isComplete ? (
          <div className="w-full text-center bg-slate-950 border border-emerald-500/30 rounded-3xl p-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-extrabold text-emerald-400 mb-2">
              Latihan Selesai!
            </h2>
            <p className="text-slate-300 mb-2">
              Hebat! Kamu telah mempelajari semua {totalQuestions} kartu.
            </p>
            <p className="text-amber-400 font-bold text-lg mb-5">
              ⭐ XP sesi ini: +{xpEarned}
            </p>

            {notice && (
              <p className="text-sm text-amber-300 mb-5">
                {notice}
              </p>
            )}

            <Link
              href="/practice"
              className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm"
            >
              Kembali ke Latihan →
            </Link>
          </div>
        ) : (
          <>
            <div className="w-full flex justify-between items-center text-xs text-slate-400 font-bold">
              <span>
                Kartu {currentIndex + 1} dari {totalQuestions}
              </span>
              <span>
                {Math.round(((currentIndex + 1) / totalQuestions) * 100)}%
                selesai
              </span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{
                  width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              aria-label={
                isFlipped ? 'Tampilkan pertanyaan' : 'Tampilkan jawaban'
              }
              className={`w-full min-h-72 bg-slate-950 rounded-3xl border p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-2xl transition-all duration-300 ${
                isFlipped
                  ? 'bg-indigo-950/60 border-indigo-500'
                  : 'border-slate-800 hover:border-indigo-500/60'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-3 py-2 bg-slate-900 rounded-full border border-slate-800 text-slate-400">
                {isFlipped
                  ? '💡 Jawaban & Pembahasan'
                  : '❓ Pertanyaan'}
              </span>

              <div className="text-base sm:text-lg font-bold text-white py-6">
                <MathRenderer
                  content={
                    isFlipped
                      ? (
                          currentQuestion?.explanation ||
                          currentQuestion?.pembahasan ||
                          currentQuestion?.answer ||
                          currentQuestion?.correct_answer ||
                          'Belum ada jawaban atau pembahasan.'
                        )
                      : (
                          currentQuestion?.question_text ||
                          'Pertanyaan belum tersedia.'
                        )
                  }
                />
              </div>

              <span className="text-xs text-indigo-400 font-semibold">
                🔄 Klik kartu untuk membalik
              </span>
            </button>

            <p className="text-xs text-slate-400 text-center">
              Baca pertanyaan, balik kartu, lalu pelajari jawabannya.
            </p>

            {isFlipped && (
              <button
                type="button"
                onClick={handleUnderstand}
                disabled={isSaving}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-wait text-white font-bold text-sm rounded-2xl shadow-lg transition-all"
              >
                {isSaving
                  ? 'Memproses...'
                  : currentIndex === totalQuestions - 1
                    ? '✅ Selesaikan Latihan (+10 XP)'
                    : '✅ Saya Sudah Paham (+10 XP) →'}
              </button>
            )}

            {notice && (
              <p className="text-xs text-amber-300 text-center">
                {notice}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
