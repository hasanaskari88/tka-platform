'use client'

import { useEffect, useMemo, useState } from 'react'
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

type Tile = {
  id: string
  cardId: string
  side: 'front' | 'back'
  content: string
  imageUrl: string | null
}

type Summary = {
  total_cards: number
  mastered_cards: number
  reviewed_again: number
  xp_earned: number
}

function shuffle<T,>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export default function FlashcardEngine({ exam }: { exam: any; questions?: any[] }) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [xpEarned, setXpEarned] = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [level, setLevel] = useState<number | null>(null)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [opened, setOpened] = useState<string[]>([])
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([])
  const [mismatch, setMismatch] = useState(false)
  const [levelDone, setLevelDone] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)

  const masteredCount = cards.filter((card) => card.status === 'mastered').length
  const totalCards = cards.length
  const remainingCards = cards.filter((card) => card.status !== 'mastered')
  const progress = totalCards ? Math.round((masteredCount / totalCards) * 100) : 0

  const levelCards = useMemo(() => {
    if (level === null) return []
    const ordered = [...remainingCards].sort((a, b) => a.position - b.position)
    const count = level === 1 ? 3 : level === 2 ? 5 : ordered.length
    return ordered.slice(0, count)
  }, [cards, level])

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
          setError(sessionError?.message || 'Sesi Pair Matching gagal dimulai.')
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
          setError(cardsError?.message || 'Set pasangan kartu masih kosong.')
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
          setError(questionError?.message || 'Isi pasangan kartu gagal dimuat.')
          setLoading(false)
        }
        return
      }

      const questionMap = new Map(questionRows.map((question: any) => [question.id, question]))
      const loaded: Flashcard[] = sessionCards.map((item: any) => {
        const question: any = questionMap.get(item.question_id)
        return {
          ...item,
          question_text: question?.question_text || '',
          image_url: question?.image_url || null,
          explanation: question?.explanation || '',
        }
      }).filter((card: Flashcard) => card.question_text.trim() && (card.explanation || '').trim())

      if (!active) return
      setSessionId(id)
      setCards(loaded)
      setXpEarned(loaded.filter((card) => card.xp_awarded).length * 10)
      setReviewCount(loaded.reduce((sum, card) => sum + card.review_count, 0))
      setLoading(false)

      if (loaded.length && loaded.every((card) => card.status === 'mastered')) {
        const { data, error: finishError } = await supabase.rpc('finish_flashcard_session', { p_session_id: id })
        if (active) {
          if (finishError) setError(finishError.message)
          else setSummary({
            total_cards: Number(data?.total_cards ?? loaded.length),
            mastered_cards: Number(data?.mastered_cards ?? loaded.length),
            reviewed_again: loaded.reduce((sum, card) => sum + card.review_count, 0),
            xp_earned: Number(data?.xp_earned ?? 0),
          })
        }
      }
    }
    void loadSession()
    return () => { active = false }
  }, [exam.id])

  const startLevel = (nextLevel: number) => {
    const available = cards.filter((card) => card.status !== 'mastered').sort((a, b) => a.position - b.position)
    const count = nextLevel === 1 ? 3 : nextLevel === 2 ? 5 : available.length
    const chosen = available.slice(0, count)
    if (!chosen.length) return
    const nextTiles: Tile[] = chosen.flatMap((card) => [
      { id: `${card.id}-front`, cardId: card.id, side: 'front' as const, content: card.question_text, imageUrl: card.image_url },
      { id: `${card.id}-back`, cardId: card.id, side: 'back' as const, content: card.explanation || '', imageUrl: null },
    ])
    setLevel(nextLevel)
    setTiles(shuffle(nextTiles))
    setOpened([])
    setMatchedCardIds([])
    setMismatch(false)
    setLevelDone(false)
    setError('')
  }

  const finishSession = async (nextCards: Flashcard[]) => {
    if (!sessionId) return
    const supabase = createClient()
    const { data, error: finishError } = await supabase.rpc('finish_flashcard_session', { p_session_id: sessionId })
    if (finishError) {
      setError(finishError.message || 'Hasil sesi belum berhasil disimpan.')
      return
    }
    setSummary({
      total_cards: Number(data?.total_cards ?? nextCards.length),
      mastered_cards: Number(data?.mastered_cards ?? nextCards.length),
      reviewed_again: nextCards.reduce((sum, card) => sum + card.review_count, 0),
      xp_earned: Number(data?.xp_earned ?? xpEarned),
    })
  }

  const chooseTile = async (tile: Tile) => {
    if (saving || mismatch || levelDone || opened.includes(tile.id) || matchedCardIds.includes(tile.cardId)) return
    const nextOpened = [...opened, tile.id]
    setOpened(nextOpened)
    if (nextOpened.length < 2) return

    const first = tiles.find((item) => item.id === nextOpened[0])
    const second = tiles.find((item) => item.id === nextOpened[1])
    if (!first || !second) return

    if (first.cardId === second.cardId && first.side !== second.side) {
      setSaving(true)
      const card = cards.find((item) => item.id === first.cardId)
      if (!card || !sessionId) {
        setSaving(false)
        return
      }
      const supabase = createClient()
      const { data, error: saveError } = await supabase.rpc('record_flashcard_response', {
        p_session_id: sessionId,
        p_question_id: card.question_id,
        p_status: 'mastered',
      })
      if (saveError) {
        setError(saveError.message || 'Pasangan cocok, tetapi hasil belum tersimpan. Coba lagi.')
        setOpened([])
        setSaving(false)
        return
      }

      const xp = Number(data?.xp_earned ?? 0)
      const nextCards = cards.map((item) => item.id === card.id
        ? { ...item, status: 'mastered' as const, xp_awarded: item.xp_awarded || xp > 0 }
        : item)
      const nextMatched = [...matchedCardIds, card.id]
      setCards(nextCards)
      setMatchedCardIds(nextMatched)
      setXpEarned((value) => value + xp)
      setOpened([])
      setSaving(false)

      if (nextMatched.length === levelCards.length) {
        setLevelDone(true)
        if (nextCards.every((item) => item.status === 'mastered')) {
          await finishSession(nextCards)
        }
      }
    } else {
      setMismatch(true)
      setReviewCount((value) => value + 1)
      window.setTimeout(() => {
        setOpened([])
        setMismatch(false)
      }, 850)
    }
  }

  const shuffleUnmatched = () => {
    const remaining = tiles.filter((tile) => !matchedCardIds.includes(tile.cardId))
    const solved = tiles.filter((tile) => matchedCardIds.includes(tile.cardId))
    setTiles([...solved, ...shuffle(remaining)])
    setOpened([])
    setMismatch(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white flex items-center justify-center">
      <div className="text-center"><div className="mb-4 text-5xl animate-bounce">🃏</div><p className="font-bold">Menyiapkan permainan pasangan kartu...</p></div>
    </div>
  )

  if (error && !cards.length) return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
      <div className="max-w-md w-full rounded-3xl border border-rose-400/30 bg-slate-900 p-7 text-center">
        <div className="mb-3 text-5xl">⚠️</div><h1 className="mb-2 text-xl font-black">Pair Matching belum bisa dibuka</h1>
        <p className="mb-5 text-sm text-slate-300">{error}</p>
        <Link href="/practice" className="inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold">Kembali ke latihan</Link>
      </div>
    </div>
  )

  if (summary) return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.22),_transparent_45%),linear-gradient(135deg,#0f172a,#172554)] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-[2rem] border border-emerald-300/20 bg-slate-950/90 p-7 text-center shadow-2xl sm:p-10">
        <div className="mb-4 text-7xl">🏆</div><p className="text-xs font-black tracking-[0.2em] text-emerald-300">MISI BELAJAR SELESAI</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">{exam?.title || 'Pair Matching'}</h1>
        <p className="mt-3 text-sm text-slate-300">Hebat! Semua pasangan berhasil ditemukan.</p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-900 p-4"><div className="text-3xl font-black text-emerald-300">{summary.mastered_cards}</div><div className="mt-1 text-xs text-slate-400">Pasangan ditemukan</div></div>
          <div className="rounded-2xl bg-slate-900 p-4"><div className="text-3xl font-black text-amber-300">+{summary.xp_earned}</div><div className="mt-1 text-xs text-slate-400">XP sesi ini</div></div>
        </div>
        <Link href="/practice" className="mt-7 inline-flex w-full justify-center rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-black text-emerald-950">Kembali ke daftar latihan →</Link>
      </div>
    </div>
  )

  if (!totalCards) return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">Guru belum menyiapkan pasangan kartu untuk permainan ini.</div>

  const availableCount = remainingCards.length
  const levelCount = levelCards.length
  const boardColumns = tiles.length <= 6 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-5'

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.28),_transparent_40%),radial-gradient(ellipse_at_bottom_right,_rgba(217,70,239,0.2),_transparent_40%),linear-gradient(135deg,#111827,#172554_55%,#312e81)] text-white">
      <header className="w-full border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link href="/practice" className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200">← Keluar</Link>
          <div className="min-w-0 flex-1 text-center"><div className="text-[9px] font-black tracking-[0.22em] text-amber-300">🧩 PAIR MATCHING</div><h1 className="truncate text-sm font-extrabold">{exam?.title || 'Kartu Pasangan'}</h1></div>
          <div className="shrink-0 rounded-xl bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-300">⭐ {xpEarned} XP</div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300"><span>{masteredCount} dari {totalCards} pasangan ditemukan</span><span>{progress}%</span></div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} /></div>

        {level === null ? (
          <section className="rounded-3xl border border-white/15 bg-slate-950/50 p-5 sm:p-7">
            <div className="text-center"><div className="text-5xl">🎮</div><h2 className="mt-3 text-2xl font-black">Pilih Level Permainan</h2><p className="mt-2 text-sm text-slate-300">Kamu bebas memilih tantangan. Pasangan yang sudah ditemukan tidak akan muncul lagi.</p></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button onClick={() => startLevel(1)} disabled={availableCount === 0} className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-5 text-left transition hover:bg-emerald-400/20 disabled:opacity-40"><div className="text-2xl">🌱</div><div className="mt-2 font-black">Level 1 · Mudah</div><div className="mt-1 text-xs text-emerald-100/80">6 kartu · 3 pasangan</div><div className="mt-3 text-xs font-bold">{Math.min(3, availableCount)} pasangan tersedia</div></button>
              <button onClick={() => startLevel(2)} disabled={availableCount === 0} className="rounded-2xl border border-sky-300/30 bg-sky-400/10 p-5 text-left transition hover:bg-sky-400/20 disabled:opacity-40"><div className="text-2xl">🚀</div><div className="mt-2 font-black">Level 2 · Sedang</div><div className="mt-1 text-xs text-sky-100/80">10 kartu · 5 pasangan</div><div className="mt-3 text-xs font-bold">{Math.min(5, availableCount)} pasangan tersedia</div></button>
              <button onClick={() => startLevel(3)} disabled={availableCount === 0} className="rounded-2xl border border-violet-300/30 bg-violet-400/10 p-5 text-left transition hover:bg-violet-400/20 disabled:opacity-40"><div className="text-2xl">🏆</div><div className="mt-2 font-black">Level 3 · Tantangan</div><div className="mt-1 text-xs text-violet-100/80">Semua sisa pasangan</div><div className="mt-3 text-xs font-bold">{availableCount} pasangan tersedia</div></button>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-widest text-cyan-200">Level {level} · {level === 1 ? 'Mudah' : level === 2 ? 'Sedang' : 'Tantangan'}</div><div className="mt-1 text-sm font-bold text-slate-200">Temukan pasangan sisi depan dan belakang</div></div><div className="flex gap-2"><button onClick={shuffleUnmatched} disabled={saving || levelDone} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15 disabled:opacity-40">🔀 Acak Kartu</button><button onClick={() => { setLevel(null); setTiles([]); setOpened([]); setMatchedCardIds([]); setLevelDone(false) }} disabled={saving} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold">Pilih Level</button></div></div>
            <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-sky-300/10 p-2"><div className="text-xl font-black text-sky-200">{levelCards.length * 2}</div><div className="text-[10px] text-sky-100/70">Jumlah kartu</div></div><div className="rounded-xl bg-emerald-300/10 p-2"><div className="text-xl font-black text-emerald-200">{matchedCardIds.length}</div><div className="text-[10px] text-emerald-100/70">Pasangan cocok</div></div><div className="rounded-xl bg-amber-300/10 p-2"><div className="text-xl font-black text-amber-200">{levelCards.length - matchedCardIds.length}</div><div className="text-[10px] text-amber-100/70">Sisa pasangan</div></div></div>

            <div className={`grid ${boardColumns} gap-3 sm:gap-4`}>
              {tiles.map((tile) => {
                const isOpen = opened.includes(tile.id)
                const isMatched = matchedCardIds.includes(tile.cardId)
                return (
                  <button key={tile.id} type="button" onClick={() => void chooseTile(tile)} disabled={isMatched || saving || levelDone} className={`relative flex min-h-32 items-center justify-center overflow-hidden rounded-2xl border-2 p-3 text-center shadow-lg transition-all duration-200 sm:min-h-40 sm:p-4 ${isMatched ? 'border-emerald-300/40 bg-emerald-500/20 opacity-75' : isOpen ? 'border-cyan-200 bg-gradient-to-br from-cyan-500 to-blue-700 text-white scale-[1.02]' : 'border-white/20 bg-gradient-to-br from-indigo-600 to-violet-800 hover:-translate-y-1 hover:border-cyan-200/60'} `}>
                    {isMatched ? <div><div className="text-3xl">✓</div><div className="mt-1 text-[10px] font-black text-emerald-100">COCOK</div></div> : isOpen ? <div className="w-full"><div className="mb-2 text-[9px] font-black tracking-widest text-cyan-100">{tile.side === 'front' ? 'SISI DEPAN' : 'SISI BELAKANG'}</div><div className="text-sm font-extrabold leading-relaxed sm:text-base"><MathRenderer content={tile.content || 'Konten belum tersedia'} /></div>{tile.imageUrl && <img src={tile.imageUrl} alt="" className="mx-auto mt-2 max-h-16 rounded-lg object-contain" />}</div> : <div><div className="text-4xl">🃏</div><div className="mt-2 text-[9px] font-black tracking-widest text-white/70">BUKA KARTU</div></div>}
                  </button>
                )
              })}
            </div>
            {mismatch && <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-center text-xs font-bold text-amber-100">Belum cocok. Coba ingat letak kartu tadi, ya!</p>}
            {levelDone && <div className="rounded-3xl border border-emerald-300/30 bg-emerald-400/10 p-6 text-center"><div className="text-4xl">🎉</div><h3 className="mt-2 text-xl font-black">Level berhasil diselesaikan!</h3><p className="mt-2 text-sm text-emerald-100/80">Kamu menemukan semua {levelCards.length} pasangan.</p><button onClick={() => { setLevel(null); setTiles([]); setOpened([]); setMatchedCardIds([]); setLevelDone(false) }} className="mt-4 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950">Pilih level berikutnya</button></div>}
          </>
        )}

        <div className="text-center text-xs text-slate-400">Pasangan yang cocok akan tersimpan otomatis. Salah memilih tidak mengurangi XP.</div>
        {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-center text-xs text-rose-200">{error}</p>}
      </main>
      <footer className="border-t border-white/10 bg-slate-950/40 px-4 py-3 text-center text-[10px] text-slate-400">Belajar sambil bermain. Kamu pasti bisa! 🌟</footer>
    </div>
  )
}
