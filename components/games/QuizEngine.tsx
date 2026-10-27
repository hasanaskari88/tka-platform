'use client'

import { useState } from 'react'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface QuizEngineProps {
  exam: any
  questions: any[]
}

export default function QuizEngine({ exam, questions }: QuizEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState<any>(null)
  const [isAnswered, setIsAnswered] = useState<boolean>(false)
  const [isCorrect, setIsCorrect] = useState<boolean>(false)

  const [totalXpEarned, setTotalXpEarned] = useState<number>(0)
  const [streakCount, setStreakCount] = useState<number>(0)
  const [answeredCount, setAnsweredCount] = useState<number>(0)
  const [correctCount, setCorrectCount] = useState<number>(0)

  const currentQuestion = questions[currentIndex]

  // Cek & Unlock Badges
  const checkAndUnlockBadges = async (currentXp: number, currentStreak: number) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('badges')
      .eq('id', user.id)
      .maybeSingle()

    let userBadges: string[] = Array.isArray(profile?.badges) ? profile.badges : []
    let newlyUnlocked: string[] = []

    if (!userBadges.includes('Langkah Pertama') && currentXp >= 10) newlyUnlocked.push('Langkah Pertama')
    if (!userBadges.includes('Raja Combo') && currentStreak >= 3) newlyUnlocked.push('Raja Combo')
    if (!userBadges.includes('Bintang Getasan') && currentXp >= 100) newlyUnlocked.push('Bintang Getasan')

    if (newlyUnlocked.length > 0) {
      await supabase
        .from('profiles')
        .update({ badges: [...userBadges, ...newlyUnlocked] })
        .eq('id', user.id)

      alert(`🎉 Selamat! Kamu Membuka Lencana Baru: ${newlyUnlocked.join(', ')}!`)
    }
  }

  const handleCheckAnswer = async (selectedOptKey: string) => {
    if (isAnswered || !currentQuestion) return

    setUserAnswer(selectedOptKey)
    setIsAnswered(true)

    const correctOpt = String(currentQuestion.correct_option ?? currentQuestion.correct_answer ?? '').trim().toUpperCase()
    const isUserRight = String(selectedOptKey).trim().toUpperCase() === correctOpt

    setIsCorrect(isUserRight)
    setAnsweredCount((prev) => prev + 1)

    if (isUserRight) {
      setCorrectCount((prev) => prev + 1)
      const newStreak = streakCount + 1
      setStreakCount(newStreak)

      const earnedXp = 10
      const newTotalXp = totalXpEarned + earnedXp
      setTotalXpEarned(newTotalXp)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('add_user_xp', { user_id_input: user.id, xp_to_add: earnedXp })
        await checkAndUnlockBadges(newTotalXp, newStreak)
      }
    } else {
      setStreakCount(0)
    }
  }

  const handleNextQuestion = () => {
    setIsAnswered(false)
    setUserAnswer(null)
    setIsCorrect(false)
    if (currentIndex < questions.length - 1) setCurrentIndex((prev) => prev + 1)
  }

  const handleSkipQuestion = () => {
    setIsAnswered(false)
    setUserAnswer(null)
    setIsCorrect(false)
    setStreakCount(0)
    if (currentIndex < questions.length - 1) setCurrentIndex((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      <header className="bg-slate-900 text-white px-6 py-3.5 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <Link href="/practice" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700">
            ← Keluar
          </Link>
          <div>
            <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded font-bold uppercase">📝 QUIZ INTERAKTIF</span>
            <h1 className="text-sm font-bold mt-0.5">{exam?.title}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {streakCount >= 2 && (
            <div className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-xl text-xs font-black animate-pulse">
              🔥 Combo x{streakCount}!
            </div>
          )}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Bonus XP Terkumpul</span>
            <span className="font-mono text-base font-bold text-amber-400">⭐ +{totalXpEarned} XP</span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <span className="font-bold text-slate-800 text-xs">Soal Latihan {currentIndex + 1} dari {questions.length}</span>
            <span className="text-xs text-slate-500 font-semibold">Terjawab Benar: {correctCount} / {answeredCount}</span>
          </div>

          <div className="text-slate-900 text-sm font-semibold leading-relaxed">
            <MathRenderer content={currentQuestion?.question_text || ''} />
          </div>

          {currentQuestion?.image_url && <img src={currentQuestion.image_url} alt="Gambar Soal" className="max-h-56 rounded-xl border" />}

          {Array.isArray(currentQuestion?.options) && (
            <div className="space-y-2 pt-2">
              {currentQuestion.options.map((opt: any, oIdx: number) => {
                const optKey = opt.key || String.fromCharCode(65 + oIdx)
                const isSelected = userAnswer === optKey
                const correctOpt = String(currentQuestion.correct_option ?? currentQuestion.correct_answer ?? '').trim().toUpperCase()
                const isThisOptionCorrect = optKey === correctOpt

                let btnStyle = 'border-slate-200 hover:bg-slate-50 text-slate-800'
                if (isAnswered) {
                  if (isThisOptionCorrect) btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500'
                  else if (isSelected) btnStyle = 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-500'
                }

                return (
                  <button key={optKey || oIdx} disabled={isAnswered} onClick={() => handleCheckAnswer(optKey)} className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center space-x-3 transition-all ${btnStyle}`}>
                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-bold text-xs shrink-0">{String.fromCharCode(65 + oIdx)}</span>
                    <div className="flex-1 font-semibold"><MathRenderer content={typeof opt === 'string' ? opt : (opt.text || opt.title || '')} /></div>
                  </button>
                )
              })}
            </div>
          )}

          {isAnswered && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900' : 'bg-rose-500/10 border-rose-500/30 text-rose-900'}`}>
              <div className="font-bold text-sm">{isCorrect ? '🎉 Benar Sempurna! (+10 XP)' : '❌ Kurang Tepat!'}</div>
              {(currentQuestion?.explanation || currentQuestion?.pembahasan) && (
                <div className="pt-2 border-t border-slate-300/60">
                  <span className="font-extrabold block text-slate-800 mb-1">💡 Pembahasan:</span>
                  <MathRenderer content={currentQuestion.explanation || currentQuestion.pembahasan} />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            {!isAnswered && currentIndex < questions.length - 1 ? (
              <button onClick={handleSkipQuestion} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300">
                ⏭️ Lewati Soal
              </button>
            ) : <div />}

            {isAnswered ? (
              currentIndex < questions.length - 1 ? (
                <button onClick={handleNextQuestion} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm">
                  Soal Selanjutnya →
                </button>
              ) : (
                <Link href="/practice" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm">
                  🏆 Selesai & Ambil XP
                </Link>
              )
            ) : (
              <p className="text-slate-400 text-xs font-medium hidden sm:block">Pilih salah satu jawaban atau klik lewati soal.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}