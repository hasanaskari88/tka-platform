'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

// 🟢 Import Engine Game Edukatif
import MazeGameEngine from '@/components/games/MazeGameEngine'
import FlashcardEngine from '@/components/games/FlashcardEngine'

function PracticeContent() {
  const params = useParams()
  const examId = params?.id as string
  const router = useRouter()

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // State Jawaban & Feedback Instan per Soal
  const [userAnswer, setUserAnswer] = useState<any>(null)
  const [isAnswered, setIsAnswered] = useState<boolean>(false)
  const [isCorrect, setIsCorrect] = useState<boolean>(false)

  // Stats Sesi Latihan Mandiri
  const [totalXpEarned, setTotalXpEarned] = useState<number>(0)
  const [streakCount, setStreakCount] = useState<number>(0)
  const [answeredCount, setAnsweredCount] = useState<number>(0)
  const [correctCount, setCorrectCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // 🟢 FUNGSI CEK & UNLOCK LENCANA OTOMATIS
  const checkAndUnlockBadges = async (currentXp: number, currentStreak: number) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('badges')
      .eq('id', user.id)
      .single()

    let userBadges: string[] = Array.isArray(profile?.badges) ? profile.badges : []
    let newlyUnlocked: string[] = []

    // 1. Lencana: Langkah Pertama
    if (!userBadges.includes('Langkah Pertama') && currentXp >= 10) {
      newlyUnlocked.push('Langkah Pertama')
    }

    // 2. Lencana: Raja Combo
    if (!userBadges.includes('Raja Combo') && currentStreak >= 3) {
      newlyUnlocked.push('Raja Combo')
    }

    // 3. Lencana: Bintang Getasan
    if (!userBadges.includes('Bintang Getasan') && currentXp >= 100) {
      newlyUnlocked.push('Bintang Getasan')
    }

    // Simpan ke Supabase jika ada Lencana Baru
    if (newlyUnlocked.length > 0) {
      const updatedBadges = [...userBadges, ...newlyUnlocked]
      await supabase
        .from('profiles')
        .update({ badges: updatedBadges })
        .eq('id', user.id)

      alert(`🎉 Selamat! Kamu Membuka Lencana Baru: ${newlyUnlocked.join(', ')}!`)
    }
  }

  useEffect(() => {
    async function loadQuestions() {
      if (!examId) return
      const supabase = createClient()

      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (!examData) {
        alert('Modul latihan tidak ditemukan!')
        router.push('/practice')
        return
      }
      setExam(examData)

      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true })

      if (questionData) setQuestions(questionData)
      setLoading(false)
    }

    loadQuestions()
  }, [examId, router])

  const currentQuestion = questions[currentIndex]
  const qType = currentQuestion?.question_type || 'multiple_choice'

  // Helper Tambah Skor XP & Combo
  const processXpAndStreak = async (isUserRight: boolean) => {
    setIsAnswered(true)
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('add_user_xp', { user_id_input: user.id, xp_to_add: earnedXp })
        await checkAndUnlockBadges(newTotalXp, newStreak)
      }
    } else {
      setStreakCount(0)
    }
  }

  // 1. Handler Pilihan Ganda Tunggal
  const handleSingleChoiceSelect = (selectedOptKey: string) => {
    if (isAnswered || !currentQuestion) return
    setUserAnswer(selectedOptKey)

    const correctOpt = String(currentQuestion.correct_option ?? currentQuestion.correct_answer ?? '').trim().toUpperCase()
    const isUserRight = String(selectedOptKey).trim().toUpperCase() === correctOpt
    processXpAndStreak(isUserRight)
  }

  // 2. Handler Pilihan Ganda Kompleks (Kotak Centang)
  const handleToggleComplexChoice = (optKey: string) => {
    if (isAnswered) return
    const currentList: string[] = Array.isArray(userAnswer) ? userAnswer : []
    if (currentList.includes(optKey)) {
      setUserAnswer(currentList.filter((k) => k !== optKey))
    } else {
      setUserAnswer([...currentList, optKey])
    }
  }

  const handleCheckComplexAnswer = () => {
    if (isAnswered || !currentQuestion) return
    let correctList: string[] = []

    if (Array.isArray(currentQuestion.correct_answers)) {
      correctList = currentQuestion.correct_answers.map((k: any) => String(k).trim().toUpperCase())
    } else if (typeof currentQuestion.correct_answers === 'string') {
      try {
        const parsed = JSON.parse(currentQuestion.correct_answers)
        correctList = Array.isArray(parsed) ? parsed.map((k: any) => String(k).trim().toUpperCase()) : []
      } catch {
        correctList = currentQuestion.correct_answers.split(',').map((k: string) => k.trim().toUpperCase())
      }
    } else {
      correctList = [String(currentQuestion.correct_option || 'A').trim().toUpperCase()]
    }

    const userList: string[] = (Array.isArray(userAnswer) ? userAnswer : []).map((k) => String(k).trim().toUpperCase())
    const isUserRight =
      userList.length === correctList.length && userList.every((val) => correctList.includes(val))

    processXpAndStreak(isUserRight)
  }

  // 3. Handler Matriks Benar/Salah
  const handleSelectMatrixRow = (rowIdx: number, val: string) => {
    if (isAnswered) return
    const currentMatrix = typeof userAnswer === 'object' && userAnswer !== null ? { ...userAnswer } : {}
    currentMatrix[rowIdx] = val
    setUserAnswer(currentMatrix)
  }

  const handleCheckMatrixAnswer = () => {
    if (isAnswered || !currentQuestion) return
    let correctMap: any = currentQuestion.correct_answers || {}

    if (typeof correctMap === 'string') {
      try {
        correctMap = JSON.parse(correctMap)
      } catch {
        correctMap = {}
      }
    }

    const opts = Array.isArray(currentQuestion.options) ? currentQuestion.options : []
    let allCorrect = true

    opts.forEach((_: any, idx: number) => {
      const userVal = userAnswer?.[idx] || ''
      const key = String(idx)
      const targetVal = correctMap[key] || correctMap[idx] || 'Benar'
      if (userVal.trim().toLowerCase() !== String(targetVal).trim().toLowerCase()) {
        allCorrect = false
      }
    })

    processXpAndStreak(allCorrect)
  }

  // 4. Handler Isian Singkat
  const handleCheckFillInAnswer = () => {
    if (isAnswered || !currentQuestion) return
    const userText = String(userAnswer || '').trim().toLowerCase()
    const targetText = String(currentQuestion.correct_option || currentQuestion.correct_answer || '').trim().toLowerCase()
    const isUserRight = userText === targetText
    processXpAndStreak(isUserRight)
  }

  // 5. Handler Essay / Uraian
  const handleSubmitEssayAnswer = () => {
    if (isAnswered || !currentQuestion) return
    processXpAndStreak(true) // Menghargai usaha menjawab esai mandiri dengan XP
  }

  // Navigasi Soal
  const handleNextQuestion = () => {
    setIsAnswered(false)
    setUserAnswer(null)
    setIsCorrect(false)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handleSkipQuestion = () => {
    setIsAnswered(false)
    setUserAnswer(null)
    setIsCorrect(false)
    setStreakCount(0)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <p className="font-semibold text-sm">Memuat Lembar Latihan Interaktif...</p>
      </div>
    )
  }

  // 🟢 PENGALIH GAME EDUKATIF BERDASARKAN activity_type
  if (exam?.activity_type === 'MAZE_GAME') {
    return <MazeGameEngine exam={exam} questions={questions} />
  }

  if (exam?.activity_type === 'FLASHCARD') {
    return <FlashcardEngine exam={exam} questions={questions} />
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      {/* HEADER LATIHAN MANDIRI */}
      <header className="bg-slate-900 text-white px-6 py-3.5 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <Link
            href="/practice"
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors border border-slate-700"
          >
            ← Keluar
          </Link>
          <div>
            <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded font-bold uppercase">
              MODE LATIHAN MANDIRI
            </span>
            <h1 className="text-sm font-bold mt-0.5">{exam?.title}</h1>
          </div>
        </div>

        {/* INDIKATOR POIN XP & COMBO STREAK */}
        <div className="flex items-center space-x-4">
          {streakCount >= 2 && (
            <div className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-xl text-xs font-black animate-pulse">
              🔥 Combo x{streakCount}!
            </div>
          )}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              Bonus XP Terkumpul
            </span>
            <span className="font-mono text-base font-bold text-amber-400">
              ⭐ +{totalXpEarned} XP
            </span>
          </div>
        </div>
      </header>

      {/* LEMBAR KONTEN LATIHAN */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 text-xs">
                Soal Latihan {currentIndex + 1} dari {questions.length}
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold px-2 py-0.5 rounded-md uppercase">
                {qType === 'complex_multiple_choice'
                  ? '☑️ PG Kompleks'
                  : qType === 'true_false_matrix'
                  ? '📊 Matriks Pernyataan'
                  : qType === 'fill_in'
                  ? '✏️ Isian Singkat'
                  : qType === 'essay'
                  ? '📝 Uraian / Essay'
                  : '🔘 Pilihan Ganda'}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Terjawab Benar: {correctCount} / {answeredCount}
            </span>
          </div>

          {/* TEKS SOAL */}
          <div className="text-slate-900 text-sm font-semibold leading-relaxed">
            <MathRenderer content={currentQuestion?.question_text || ''} />
          </div>

          {currentQuestion?.image_url && (
            <img
              src={currentQuestion.image_url}
              alt="Gambar Soal"
              className="max-h-56 rounded-xl border"
            />
          )}

          {/* 🔘 TIPE 1: PILIHAN GANDA TUNGGAL */}
          {qType === 'multiple_choice' && Array.isArray(currentQuestion?.options) && (
            <div className="space-y-2 pt-2">
              {currentQuestion.options.map((opt: any, oIdx: number) => {
                const optKey = opt.key || String.fromCharCode(65 + oIdx)
                const displayLabel = String.fromCharCode(65 + oIdx)
                const isSelected = userAnswer === optKey

                const correctOpt = String(currentQuestion.correct_option ?? currentQuestion.correct_answer ?? '')
                  .trim()
                  .toUpperCase()
                const isThisOptionCorrect = optKey === correctOpt

                let btnStyle = 'border-slate-200 hover:bg-slate-50 text-slate-800'
                if (isAnswered) {
                  if (isThisOptionCorrect) {
                    btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500'
                  } else if (isSelected && !isThisOptionCorrect) {
                    btnStyle = 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-500'
                  }
                }

                return (
                  <button
                    key={optKey || oIdx}
                    disabled={isAnswered}
                    onClick={() => handleSingleChoiceSelect(optKey)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center space-x-3 transition-all ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {displayLabel}
                    </span>
                    <div className="flex-1 font-semibold">
                      <MathRenderer content={typeof opt === 'string' ? opt : (opt.text || opt.title || '')} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ☑️ TIPE 2: PILIHAN GANDA KOMPLEKS (KOTAK CENTANG) */}
          {qType === 'complex_multiple_choice' && Array.isArray(currentQuestion?.options) && (
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                {currentQuestion.options.map((opt: any, oIdx: number) => {
                  const optKey = opt.key || String.fromCharCode(65 + oIdx)
                  const isChecked = Array.isArray(userAnswer) && userAnswer.includes(optKey)

                  return (
                    <div
                      key={optKey || oIdx}
                      onClick={() => handleToggleComplexChoice(optKey)}
                      className={`p-3.5 rounded-xl border text-xs flex items-center space-x-3 cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/50 font-bold text-indigo-950'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <div className="flex-1 font-semibold">
                        <MathRenderer content={typeof opt === 'string' ? opt : (opt.text || opt.title || '')} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {!isAnswered && (
                <button
                  onClick={handleCheckComplexAnswer}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  ☑️ Cek Jawaban PG Kompleks
                </button>
              )}
            </div>
          )}

          {/* 📊 TIPE 3: MATRIKS BENAR - SALAH */}
          {qType === 'true_false_matrix' && Array.isArray(currentQuestion?.options) && (
            <div className="space-y-4 pt-2">
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3 border-b border-slate-200">Pernyataan</th>
                      <th className="p-3 border-b border-slate-200 text-center w-24">Benar</th>
                      <th className="p-3 border-b border-slate-200 text-center w-24">Salah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentQuestion.options.map((item: any, rIdx: number) => {
                      const statementText = typeof item === 'string' ? item : (item.text || item.statement || `Pernyataan #${rIdx + 1}`)
                      const selectedVal = userAnswer?.[rIdx] || ''

                      return (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">
                            <MathRenderer content={statementText} />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={isAnswered}
                              onClick={() => handleSelectMatrixRow(rIdx, 'Benar')}
                              className={`px-3 py-1 rounded-lg font-bold border ${
                                selectedVal === 'Benar'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              Benar
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={isAnswered}
                              onClick={() => handleSelectMatrixRow(rIdx, 'Salah')}
                              className={`px-3 py-1 rounded-lg font-bold border ${
                                selectedVal === 'Salah'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              Salah
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {!isAnswered && (
                <button
                  onClick={handleCheckMatrixAnswer}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  📊 Periksa Jawaban Matriks
                </button>
              )}
            </div>
          )}

          {/* ✏️ TIPE 4: ISIAN SINGKAT */}
          {qType === 'fill_in' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ketikkan Jawaban Singkat Kamu:
                </label>
                <input
                  type="text"
                  disabled={isAnswered}
                  value={userAnswer || ''}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Ketik jawaban di sini..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              {!isAnswered && (
                <button
                  onClick={handleCheckFillInAnswer}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  ✏️ Cek Jawaban Isian
                </button>
              )}
            </div>
          )}

          {/* 📝 TIPE 5: URAIAN / ESSAY */}
          {qType === 'essay' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tuliskan Lembar Uraian / Jawaban Lengkap Kamu:
                </label>
                <textarea
                  rows={4}
                  disabled={isAnswered}
                  value={userAnswer || ''}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Jelaskan langkah-langkah pengerjaan..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {!isAnswered && (
                <button
                  onClick={handleSubmitEssayAnswer}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  📝 Kirim Jawaban & Lihat Solusi Guru
                </button>
              )}
            </div>
          )}

          {/* UMPAN BALIK INSTAN & PEMBAHASAN LANGSUNG */}
          {isAnswered && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 animate-fadeIn ${
                isCorrect
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-900'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-sm">
                <span>{isCorrect ? '🎉 Tepat Sempurna! (+10 XP)' : '❌ Kurang Tepat!'}</span>
              </div>

              {(currentQuestion?.explanation || currentQuestion?.pembahasan) && (
                <div className="pt-2 border-t border-slate-300/60">
                  <span className="font-extrabold block text-slate-800 mb-1">
                    💡 Pembahasan Langkah demi Langkah:
                  </span>
                  <div className="text-slate-700 leading-relaxed">
                    <MathRenderer content={currentQuestion.explanation || currentQuestion.pembahasan} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 🟢 NAVIGASI BAWAH */}
          <div className="flex items-center justify-between border-t pt-4">
            {!isAnswered && currentIndex < questions.length - 1 ? (
              <button
                onClick={handleSkipQuestion}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors border border-slate-300 flex items-center space-x-1"
                suppressHydrationWarning
              >
                <span>⏭️ Lewati Soal</span>
              </button>
            ) : (
              <div />
            )}

            {isAnswered ? (
              currentIndex < questions.length - 1 ? (
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                  suppressHydrationWarning
                >
                  Soal Selanjutnya →
                </button>
              ) : (
                <Link
                  href="/practice"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  🏆 Selesai & Ambil XP
                </Link>
              )
            ) : (
              <p className="text-slate-400 text-xs font-medium hidden sm:block">
                Pilih/isi jawaban kamu lalu periksa hasilnya.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InteractivePracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
          <p className="font-semibold text-sm">Memuat Lembar Latihan Interaktif...</p>
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  )
}