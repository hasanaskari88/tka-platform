'use client'

import { useState } from 'react'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface FlashcardProps {
  exam: any
  questions: any[]
}

export default function FlashcardEngine({ exam, questions }: FlashcardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)

  const currentQuestion = questions[currentIndex]

  const handleFlip = () => setIsFlipped(!isFlipped)

  const handleUnderstand = async () => {
    const earned = 10
    setXpEarned((prev) => prev + earned)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.rpc('add_user_xp', { user_id_input: user.id, xp_to_add: earned })
    }

    setIsFlipped(false)
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      <header className="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Link href="/practice" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300">
            ← Keluar
          </Link>
          <div>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-extrabold border border-amber-500/30">
              🃏 FLASHCARD RUMUS & MEMORI
            </span>
            <h1 className="text-sm font-bold mt-0.5">{exam?.title || 'Kartu Pengingat Rumus'}</h1>
          </div>
        </div>

        <div className="font-mono font-bold text-amber-400 text-sm">⭐ +{xpEarned} XP</div>
      </header>

      <main className="max-w-2xl mx-auto w-full p-6 flex-1 flex flex-col items-center justify-center space-y-6">
        <span className="text-xs text-slate-400 font-bold">Kartu {currentIndex + 1} dari {questions.length}</span>

        {/* KARTU MEMORI FLIP */}
        <div
          onClick={handleFlip}
          className={`w-full h-72 bg-slate-950 rounded-3xl border border-slate-800 p-8 flex flex-col justify-between items-center text-center cursor-pointer shadow-2xl transition-all transform duration-500 ${
            isFlipped ? 'bg-indigo-950/60 border-indigo-500/50' : 'hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 bg-slate-900 rounded-full border border-slate-800 text-slate-400">
            {isFlipped ? '💡 Jawaban & Solusi' : '❓ Tanyaan / Concept'}
          </span>

          <div className="text-base sm:text-lg font-bold text-white">
            <MathRenderer content={isFlipped ? (currentQuestion?.explanation || currentQuestion?.pembahasan || 'Tidak ada solusi.') : (currentQuestion?.question_text || '')} />
          </div>

          <span className="text-xs text-indigo-400 font-semibold">🔄 Klik untuk membalik kartu</span>
        </div>

        {/* KONTROL */}
        {isFlipped && (
          <button onClick={handleUnderstand} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg transition-all">
            ✅ Saya Sudah Paham (+10 XP) →
          </button>
        )}
      </main>
    </div>
  )
}