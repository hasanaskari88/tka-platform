'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MathRenderer from '@/components/MathRenderer'
import { createClient } from '@/lib/supabase/client'

type Flashcard = {
  id: string
  question_id: string
  position: number
  status: 'new' | 'needs_review' | 'mastered'
  review_count: number
  xp_awarded: boolean
  question_text: string
  image_url: string | null
  explanation: string | null
}

type Summary = {
  total_cards: number
  mastered_cards: number
  reviewed_again: number
  xp_earned: number
}

export default function FlashcardEngine({ exam }: { exam: any; questions?: any[] }) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [queue, setQueue] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [xpEarned, setXpEarned] = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [reviewCount, setReviewCount] = useState(0)

  const masteredCount = cards.filter((card) => card.status === 'mastered').length
  const totalCards = cards.length
  const currentCardId = queue[currentIndex]
  const currentCard = cards.find((card) => card.id === currentCardId) || null
  const progress = totalCards ? Math.round((masteredCount / totalCards) * 100) : 0

  useEffect(() => {
    let active = true

    async function loadSession() {
      setLoading(true)
      setError('')
      const supabase = createClient()

      const { data: sessionResult, error: sessionError } = await supabase.rpc(
        'start_flashcard_session',
        { p_exam_id: exam.id }
      )

      if (sessionError || !sessionResult?.session_id) {
        if (active) {
          setError(sessionError?.message || 'Sesi Flashcard gagal dimulai.')
          setLoading(false)
        }
        return
      }

      const id = String(sessionResult.session_id)
      const { data: sessionCards, error: cardsError } = await supabase
        .from('flashcard_session_cards')
        .select('id, question_id, position, status, review_count, xp_awarded')
        .eq('session_id', id)
        .order('position', { ascending: true })

      if (cardsError || !sessionCards?.length) {
        if (active) {
          setError(cardsError?.message || 'Kartu belum tersedia dalam sesi ini.')
          setLoading(false)
        }
        return
      }

      const questionIds = sessionCards.map((card: any) => card.question_id)
      const { data: questionRows, error: questionError } = await supabase
        .from('questions')
        .select('id, question_text, image_url, explanation')
        .in('id', questionIds)

      if (questionError || !questionRows) {
        if (active) {
          setError(questionError?.message || 'Isi kartu gagal dimuat.')
          setLoading(false)
        }
        return
      }

      const questionMap = new Map(questionRows.map((question: any) => [question.id, question]))
      const loadedCards: Flashcard[] = sessionCards
        .map((card: any) => {
          const question: any = questionMap.get(card.question_id)
          if (!question) return null
          return {
            ...card,
            status: card.status,
            question_text: question.question_text || '',
            image_url: question.image_url || null,
            explanation: question.explanation || '',
          }
        })
        .filter(Boolean) as Flashcard[]

      const orderedCards = [
        ...loadedCards.filter((card) => card.status === 'new'),
        ...loadedCards.filter((card) => card.status === 'needs_review').sort((a, b) => a.review_count - b.review_count),
        ...loadedCards.filter((card) => card.status === 'mastered'),
      ]

      if (!active) return

      setSessionId(id)
      setCards(orderedCards)
      const remainingCards = orderedCards.filter((card) => card.status !== 'mastered')
      setQueue(remainingCards.map((card) => card.id))
      setXpEarned(orderedCards.filter((card) => card.xp_awarded).length * 10)
      setReviewCount(orderedCards.reduce((total, card) => total + card.review_count, 0))
      setCurrentIndex(0)
      setLoading(false)

      // Sesi yang seluruh kartunya sudah dikuasai sebelum halaman dibuka
      // tetap ditutup dengan benar, bukan menampilkan layar kartu kosong.
      if (remainingCards.length === 0) {
        const { data: completed, error: completionError } = await supabase.rpc(
          'finish_flashcard_session',
          { p_session_id: id }
        )
        if (active) {
          if (completionError) {
            setError(completionError.message || 'Sesi belum berhasil ditutup.')
          } else {
            setSummary({
              total_cards: Number(completed?.total_cards ?? orderedCards.length),
              mastered_cards: Number(completed?.mastered_cards ?? orderedCards.length),
              reviewed_again: orderedCards.reduce((total, card) => total + card.review_count, 0),
              xp_earned: Number(completed?.xp_earned ?? 0),
            })
          }
        }
      }
    }

    loadSession()
    return () => { active = false }
  }, [exam.id])

  const finishSession = async (nextCards: Flashcard[]) => {
    if (!sessionId) return
    const supabase = createClient()
    const { data, error: finishError } = await supabase.rpc(
      'finish_flashcard_session',
      { p_session_id: sessionId }
    )

    if (finishError) {
      setError(finishError.message || 'Hasil sesi belum berhasil disimpan.')
      return
    }

    setSummary({
      total_cards: Number(data?.total_cards ?? nextCards.length),
      mastered_cards: Number(data?.mastered_cards ?? nextCards.length),
      reviewed_again: nextCards.reduce((total, card) => total + card.review_count, 0),
      xp_earned: Number(data?.xp_earned ?? xpEarned),
    })
  }

  const handleResponse = async (status: 'needs_review' | 'mastered') => {
    if (!sessionId || !currentCard || saving) return

    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data, error: saveError } = await supabase.rpc(
      'record_flashcard_response',
      {
        p_session_id: sessionId,
        p_question_id: currentCard.question_id,
        p_status: status,
      }
    )

    if (saveError) {
      setError(saveError.message || 'Jawaban belum berhasil disimpan. Coba lagi.')
      setSaving(false)
      return
    }

    const xp = Number(data?.xp_earned ?? 0)
    const nextCards = cards.map((card) =>
      card.id === currentCard.id
        ? {
            ...card,
            status,
            review_count: card.review_count + (status === 'needs_review' ? 1 : 0),
            xp_awarded: card.xp_awarded || xp > 0,
          }
        : card
    )

    setCards(nextCards)
    setIsFlipped(false)
    setXpEarned((previous) => previous + xp)

    if (status === 'needs_review') {
      setReviewCount((previous) => previous + 1)
      const nextQueue = [...queue.slice(currentIndex + 1), ...queue.slice(0, currentIndex), currentCard.id]
      setQueue(nextQueue)
      setCurrentIndex(0)
    } else {
      const nextQueue = queue.filter((id) => id !== currentCard.id)
      setQueue(nextQueue)
      setCurrentIndex(0)
      if (nextQueue.length === 0) {
        await finishSession(nextCards)
      }
    }

    setSaving(false)
  }

  const shuffleRemaining = () => {
    setQueue((previous) => {
      const shuffled = [...previous]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    })
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-4">🃏</div>
          <p className="font-bold">Menyiapkan kartu belajarmu...</p>
        </div>
      </div>
    )
  }

  if (error && !cards.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
        <div className="max-w-md w-full rounded-3xl border border-rose-400/30 bg-slate-900 p-7 text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h1 className="text-xl font-black mb-2">Flashcard belum bisa dibuka</h1>
          <p className="text-sm text-slate-300 mb-5">{error}</p>
          <Link href="/practice" className="inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold">Kembali ke latihan</Link>
        </div>
      </div>
    )
  }

  if (summary) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.22),_transparent_45%),linear-gradient(135deg,#0f172a,#172554)] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-emerald-300/20 bg-slate-950/90 p-7 sm:p-10 text-center shadow-2xl">
          <div className="text-7xl mb-4">🏆</div>
          <p className="text-xs font-black tracking-[0.2em] text-emerald-300">MISI BELAJAR SELESAI</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-2">{exam?.title || 'Flashcard'}</h1>
          <p className="text-slate-300 text-sm mt-3">Hebat! Semua kartu sudah berhasil kamu kuasai.</p>
          <div className="grid grid-cols-2 gap-3 mt-7">
            <div className="rounded-2xl bg-slate-900 p-4"><div className="text-3xl font-black text-emerald-300">{summary.mastered_cards}</div><div className="text-xs text-slate-400 mt-1">Kartu dikuasai</div></div>
            <div className="rounded-2xl bg-slate-900 p-4"><div className="text-3xl font-black text-amber-300">+{summary.xp_earned}</div><div className="text-xs text-slate-400 mt-1">XP sesi ini</div></div>
            <div className="rounded-2xl bg-slate-900 p-4"><div className="text-3xl font-black text-sky-300">{summary.total_cards}</div><div className="text-xs text-slate-400 mt-1">Total kartu</div></div>
            <div className="rounded-2xl bg-slate-900 p-4"><div className="text-3xl font-black text-violet-300">{summary.reviewed_again}</div><div className="text-xs text-slate-400 mt-1">Pengulangan</div></div>
          </div>
          <Link href="/practice" className="mt-7 inline-flex w-full justify-center rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-400">Kembali ke daftar latihan →</Link>
        </div>
      </div>
    )
  }

  if (!totalCards) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">Modul ini belum memiliki kartu Flashcard.</div>
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-xl font-black mb-3">Tidak ada kartu yang perlu diulang.</h1>
          <Link href="/practice" className="text-cyan-300 underline">Kembali ke latihan</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.28),_transparent_40%),radial-gradient(ellipse_at_bottom_right,_rgba(217,70,239,0.2),_transparent_40%),linear-gradient(135deg,#111827,#172554_55%,#312e81)] text-white flex flex-col">
      <header className="w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-xl px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-3">
          <Link href="/practice" className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">← Keluar</Link>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[9px] font-black tracking-[0.22em] text-amber-300">🃏 FLASHCARD ARENA</div>
            <h1 className="truncate text-sm font-extrabold">{exam?.title || 'Kartu Belajar'}</h1>
          </div>
          <div className="shrink-0 rounded-xl bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-300">⭐ {xpEarned} XP</div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-5 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span>{masteredCount} dari {totalCards} kartu dikuasai</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800 shadow-inner">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-sky-300/15 bg-sky-300/10 px-2 py-2"><div className="text-lg font-black text-sky-200">{cards.filter((card) => card.status === 'new').length}</div><div className="text-[10px] text-sky-100/70">Belum dibuka</div></div>
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/10 px-2 py-2"><div className="text-lg font-black text-amber-200">{cards.filter((card) => card.status === 'needs_review').length}</div><div className="text-[10px] text-amber-100/70">Perlu diulang</div></div>
          <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/10 px-2 py-2"><div className="text-lg font-black text-emerald-200">{masteredCount}</div><div className="text-[10px] text-emerald-100/70">Dikuasai</div></div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Kartu {totalCards - queue.length + 1} • Sisa {queue.length} • Diulang {reviewCount}×</span>
          <button type="button" onClick={shuffleRemaining} disabled={queue.length < 2 || saving} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40">🔀 Acak sisa kartu</button>
        </div>

        <button
          type="button"
          onClick={() => setIsFlipped((previous) => !previous)}
          disabled={saving}
          aria-label={isFlipped ? 'Tampilkan sisi depan' : 'Balik kartu untuk melihat jawaban'}
          className="group relative mx-auto w-full max-w-2xl text-left outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/50 rounded-[2rem]"
          style={{ perspective: '1200px' }}
        >
          <div className="relative min-h-[310px] sm:min-h-[360px] w-full transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-between rounded-[2rem] border border-cyan-200/30 bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-6 sm:p-9 text-center shadow-[0_25px_70px_rgba(2,132,199,0.25)]" style={{ backfaceVisibility: 'hidden' }}>
              <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2 text-[10px] font-black tracking-[0.18em]">❓ PERTANYAAN</span>
              <div className="my-auto w-full py-7 text-xl font-extrabold leading-relaxed sm:text-2xl"><MathRenderer content={currentCard.question_text || 'Pertanyaan belum tersedia.'} /></div>
              {currentCard.image_url && <img src={currentCard.image_url} alt="Ilustrasi kartu" className="max-h-32 max-w-full rounded-xl object-contain" />}
              <span className="text-xs font-bold text-cyan-50/80">Sentuh kartu untuk melihat jawaban ↻</span>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-between rounded-[2rem] border border-emerald-200/30 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-6 sm:p-9 text-center shadow-[0_25px_70px_rgba(16,185,129,0.22)]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2 text-[10px] font-black tracking-[0.18em]">💡 JAWABAN & PEMBAHASAN</span>
              <div className="my-auto w-full py-7 text-lg font-bold leading-relaxed sm:text-xl"><MathRenderer content={currentCard.explanation || 'Jawaban belum diisi oleh guru.'} /></div>
              <span className="text-xs font-bold text-emerald-50/80">Pilih apakah kamu sudah memahaminya</span>
            </div>
          </div>
        </button>

        <p className="text-center text-xs text-slate-300">{isFlipped ? 'Sudah mengerti? Pilih tombol hijau. Masih bingung? Kartu akan muncul lagi.' : 'Baca pertanyaan, lalu balik kartu untuk mempelajari jawabannya.'}</p>

        {isFlipped && (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleResponse('needs_review')} disabled={saving} className="rounded-2xl border border-amber-300/30 bg-amber-400/15 px-3 py-4 text-sm font-black text-amber-100 shadow-lg transition hover:bg-amber-400/25 disabled:opacity-50">
              🔁 Belum Paham
              <span className="mt-1 block text-[10px] font-medium text-amber-100/70">Pelajari lagi nanti</span>
            </button>
            <button type="button" onClick={() => handleResponse('mastered')} disabled={saving} className="rounded-2xl border border-emerald-200/30 bg-emerald-400 px-3 py-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 disabled:opacity-50">
              {saving ? 'Menyimpan...' : '✓ Sudah Paham'}
              <span className="mt-1 block text-[10px] font-bold text-emerald-950/70">Dapatkan hingga +10 XP</span>
            </button>
          </div>
        )}

        {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-center text-xs text-rose-200">{error}</p>}
      </main>
      <footer className="border-t border-white/10 bg-slate-950/40 px-4 py-3 text-center text-[10px] text-slate-400">Belajar sedikit demi sedikit. Kamu pasti bisa! 🌟</footer>
    </div>
  )
}
