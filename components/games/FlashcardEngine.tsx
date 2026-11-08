'use client'

import { useEffect, useState } from 'react'
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
  const [isSavingAndExit, setIsSavingAndExit] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [notice, setNotice] = useState('')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [attemptLoading, setAttemptLoading] = useState(true)
  const [attemptError, setAttemptError] = useState('')
  const [completedCardIds, setCompletedCardIds] = useState<string[]>([])
  const [isResumedSession, setIsResumedSession] = useState(false)

  const currentQuestion = questions?.[currentIndex]
  const totalQuestions = questions?.length ?? 0

  useEffect(() => {
    let active = true

    async function startSession() {
      if (!exam?.id || totalQuestions === 0) {
        setAttemptLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('start_practice_attempt', {
          p_exam_id: exam.id,
        })

        if (error) throw error

        const id =
          typeof data === 'string'
            ? data
            : data?.attempt_id ?? data?.id

        if (!id) throw new Error('ID sesi latihan tidak ditemukan.')

        const saved = data?.progress || {}
        const restoredIds = Array.isArray(saved.completedCardIds)
          ? saved.completedCardIds.map(String)
          : []
        const restoredIndex = Math.min(
          Number(saved.currentIndex || 0),
          totalQuestions
        )

        if (!active) return

        setAttemptId(String(id))
        setCompletedCardIds(restoredIds)
        setCurrentIndex(restoredIndex)
        setXpEarned(restoredIds.length * 10)
        setIsResumedSession(Boolean(data?.resumed))
        setIsComplete(restoredIndex >= totalQuestions)
        if (restoredIndex >= totalQuestions) {
          setNotice('Semua kartu sudah dipelajari. Sesi menunggu penyimpanan akhir.')
        }
      } catch (error) {
        console.error('Gagal memulai sesi Flashcard:', error)
        if (active) {
          setAttemptError('Sesi Flashcard gagal dimulai. Silakan muat ulang halaman.')
        }
      } finally {
        if (active) setAttemptLoading(false)
      }
    }

    startSession()
    return () => {
      active = false
    }
  }, [exam?.id, totalQuestions])

  const persistProgress = async (
    nextIndex = currentIndex,
    nextCompletedIds = completedCardIds
  ) => {
    if (!attemptId) return false

    const progress = {
      currentIndex: nextIndex,
      completedCardIds: nextCompletedIds,
      completedCount: nextCompletedIds.length,
    }

    const { error } = await createClient().rpc(
      'save_practice_attempt_progress',
      {
        p_attempt_id: attemptId,
        p_progress: progress,
        p_answered_count: nextCompletedIds.length,
        p_correct_count: nextCompletedIds.length,
        p_answer_xp: nextCompletedIds.length * 10,
        p_streak_xp: 0,
      }
    )

    if (error) {
      console.error('Gagal menyimpan progres Flashcard:', error)
      return false
    }

    return true
  }

  const finishSession = async (completedIds = completedCardIds) => {
    if (!attemptId) return false

    const { error } = await createClient().rpc('finish_practice_attempt', {
      p_attempt_id: attemptId,
      p_answered_count: completedIds.length,
      p_correct_count: completedIds.length,
      p_streak_xp: 0,
    })

    if (error) {
      console.error('Gagal menyelesaikan sesi Flashcard:', error)
      setNotice('Kartu sudah dipelajari, tetapi finalisasi sesi belum tersimpan. Tekan tombol coba simpan lagi.')
      return false
    }

    setNotice('')
    return true
  }

  const handleUnderstand = async () => {
    if (isSaving || isComplete || !currentQuestion || !attemptId) return

    setIsSaving(true)
    setNotice('')

    const cardId = String(currentQuestion.id ?? `card-${currentIndex}`)
    const nextCompletedIds = [...new Set([...completedCardIds, cardId])]
    const nextIndex = Math.min(currentIndex + 1, totalQuestions)

    const saved = await persistProgress(nextIndex, nextCompletedIds)

    if (!saved) {
      setNotice('Kartu belum tersimpan. Periksa koneksi lalu coba lagi.')
      setIsSaving(false)
      return
    }

    setCompletedCardIds(nextCompletedIds)
    setCurrentIndex(nextIndex)
    setXpEarned(nextCompletedIds.length * 10)
    setIsFlipped(false)

    if (nextIndex >= totalQuestions) {
      setIsComplete(true)
      await finishSession(nextCompletedIds)
    }

    setIsSaving(false)
  }

  const handleSaveAndExit = async () => {
    if (isSaving || isSavingAndExit || !attemptId) return

    if (isComplete) {
      window.location.assign('/practice')
      return
    }

    setIsSavingAndExit(true)
    const saved = await persistProgress(currentIndex, completedCardIds)
    setIsSavingAndExit(false)

    if (!saved) {
      setNotice('Progres belum berhasil disimpan. Periksa koneksi lalu coba lagi.')
      return
    }

    window.location.assign('/practice')
  }

  const handleRetryFinish = async () => {
    if (isSaving) return
    setIsSaving(true)
    const saved = await persistProgress(currentIndex, completedCardIds)
    if (saved) await finishSession(completedCardIds)
    setIsSaving(false)
  }

  if (attemptLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        Memulai sesi Flashcard...
      </div>
    )
  }

  if (attemptError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p>{attemptError}</p>
          <Link href="/practice" className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-bold">
            Kembali ke Latihan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      <header className="bg-slate-950 px-4 sm:px-6 py-4 flex justify-between items-center gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleSaveAndExit}
            disabled={isSaving || isSavingAndExit || !attemptId}
            className="shrink-0 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-xs font-bold rounded-xl text-white"
          >
            {isSavingAndExit ? 'Menyimpan...' : '💾 Simpan & Keluar'}
          </button>

          <div className="min-w-0">
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-1 rounded font-extrabold border border-amber-500/30">
              🃏 FLASHCARD
            </span>
            <h1 className="text-sm font-bold mt-1 truncate">
              {exam?.title || 'Kartu Pengingat'}
            </h1>
            {isResumedSession && (
              <p className="text-[10px] text-emerald-300">Progres sesi sebelumnya dipulihkan</p>
            )}
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
            <h2 className="text-xl font-bold mb-2">Belum Ada Kartu</h2>
            <p className="text-sm text-slate-400 mb-6">
              Belum ada soal untuk latihan ini. Silakan kembali ke halaman latihan atau hubungi guru.
            </p>
            <Link href="/practice" className="inline-block px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm">
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

            {notice && <p className="text-sm text-amber-300 mb-5">{notice}</p>}

            {notice && (
              <button
                type="button"
                onClick={handleRetryFinish}
                disabled={isSaving}
                className="mb-4 w-full rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Coba Simpan Hasil Lagi'}
              </button>
            )}

            <Link href="/practice" className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm">
              Kembali ke Latihan →
            </Link>
          </div>
        ) : (
          <>
            <div className="w-full flex justify-between items-center text-xs text-slate-400 font-bold">
              <span>Kartu {currentIndex + 1} dari {totalQuestions}</span>
              <span>{Math.round((completedCardIds.length / totalQuestions) * 100)}% dipelajari</span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${(completedCardIds.length / totalQuestions) * 100}%` }}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              aria-label={isFlipped ? 'Tampilkan pertanyaan' : 'Tampilkan jawaban'}
              className={`w-full min-h-72 bg-slate-950 rounded-3xl border p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-2xl transition-all duration-300 ${
                isFlipped
                  ? 'bg-indigo-950/60 border-indigo-500'
                  : 'border-slate-800 hover:border-indigo-500/60'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-3 py-2 bg-slate-900 rounded-full border border-slate-800 text-slate-400">
                {isFlipped ? '💡 Jawaban & Pembahasan' : '❓ Pertanyaan'}
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

            {notice && <p className="text-xs text-amber-300 text-center">{notice}</p>}
          </>
        )}
      </main>
    </div>
  )
}
