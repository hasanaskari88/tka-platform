'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { triggerVictoryConfetti } from '@/lib/confetti'
import { useTheme } from '@/context/ThemeContext'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

// 🟢 KONEKSI KE HELPER PENILAIAN PRESISI
function checkQuestionAccuracy(q: any, userAns: any) {
  if (userAns === null || userAns === undefined || userAns === '') {
    return { isCorrect: false, isUnattempted: true, ratio: 0 }
  }

  const qType = q.question_type || 'multiple_choice'

  if (qType === 'multiple_choice') {
    const correctOpt = (q.correct_option ?? q.correct_answer ?? q.correct_key ?? q.answer ?? '').toString().trim()
    const isCorrect = String(userAns).trim().toLowerCase() === correctOpt.toLowerCase()
    return { isCorrect, isUnattempted: false, ratio: isCorrect ? 1 : 0 }
  }

  if (qType === 'complex_multiple_choice') {
    const correctKeys: string[] = Array.isArray(q.correct_answers)
      ? q.correct_answers
      : [q.correct_option].filter(Boolean)
    const userKeys: string[] = Array.isArray(userAns) ? userAns : []

    if (userKeys.length === 0) return { isCorrect: false, isUnattempted: true, ratio: 0 }

    const correctUserChoices = userKeys.filter((k) => correctKeys.includes(k)).length
    const wrongUserChoices = userKeys.filter((k) => !correctKeys.includes(k)).length

    const netCorrect = Math.max(0, correctUserChoices - wrongUserChoices)
    const ratio = correctKeys.length > 0 ? netCorrect / correctKeys.length : 0
    return { isCorrect: ratio === 1, isUnattempted: false, ratio }
  }

  if (qType === 'true_false_matrix') {
    const correctObj: { [key: string]: string } = q.correct_answers || {}
    const userObj = typeof userAns === 'object' && !Array.isArray(userAns) ? userAns : {}

    const statementIds = Object.keys(correctObj)
    if (statementIds.length === 0) return { isCorrect: false, isUnattempted: true, ratio: 0 }

    let correctRows = 0
    let attemptedRows = 0
    statementIds.forEach((sId) => {
      if (userObj[sId]) attemptedRows++
      if (userObj[sId] === correctObj[sId]) correctRows++
    })

    if (attemptedRows === 0) return { isCorrect: false, isUnattempted: true, ratio: 0 }

    const ratio = correctRows / statementIds.length
    return { isCorrect: ratio === 1, isUnattempted: false, ratio }
  }

  return { isCorrect: false, isUnattempted: true, ratio: 0 }
}

function ExamSummaryContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { theme } = useTheme()

  const examId = params?.id as string
  const sessionId = searchParams.get('session_id')

  const [exam, setExam] = useState<any>(null)
  const [sessionData, setSessionData] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [userAnswersMap, setUserAnswersMap] = useState<{ [key: string]: any }>({})
  const [loading, setLoading] = useState(true)

  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong'>('all')
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    triggerVictoryConfetti()

    async function loadSummaryAndReview() {
      if (!examId) return
      const supabase = createClient()

      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (examData) setExam(examData)

      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true })

      if (questionData) setQuestions(questionData)

      let currentSessionId = sessionId

      if (!currentSessionId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: lastSession } = await supabase
            .from('exam_sessions')
            .select('*')
            .eq('exam_id', examId)
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(1)
            .single()

          if (lastSession) {
            currentSessionId = lastSession.id
            setSessionData(lastSession)
          }
        }
      } else if (currentSessionId && !currentSessionId.startsWith('local_')) {
        const { data: session } = await supabase
          .from('exam_sessions')
          .select('*')
          .eq('id', currentSessionId)
          .single()

        if (session) setSessionData(session)
      }

      let loadedFromSupabase = false
      if (currentSessionId && !currentSessionId.startsWith('local_')) {
        const { data: answersData } = await supabase
          .from('answers')
          .select('*')
          .eq('session_id', currentSessionId)

        if (answersData && answersData.length > 0) {
          const map: { [key: string]: any } = {}
          answersData.forEach((ans) => {
            let val = ans.user_answer ?? ans.selected_option ?? ans.selected_answers
            if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
              try {
                val = JSON.parse(val)
              } catch (e) {}
            }
            map[ans.question_id] = val
          })
          setUserAnswersMap(map)
          loadedFromSupabase = true
        }
      }

      if (!loadedFromSupabase) {
        const localSavedSession =
          localStorage.getItem(`cbt_answers_session_${currentSessionId}`) ||
          localStorage.getItem(`cbt_answers_${examId}`)
        if (localSavedSession) {
          try {
            setUserAnswersMap(JSON.parse(localSavedSession))
          } catch (e) {}
        }
      }

      setLoading(false)
    }

    loadSummaryAndReview()
  }, [examId, sessionId])

  // 🟢 HANDLER KERJAKAN KEMBALI (RETAKE EXAM)
  const handleRetakeExam = () => {
    if (confirm('Apakah Anda yakin ingin mengerjakan kembali ujian ini? Pengerjaan baru akan dicatat sebagai sesi ujian baru.')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`cbt_temp_answers_${examId}`)
        localStorage.removeItem(`cbt_answers_${examId}`)
        localStorage.removeItem(`cbt_score_${examId}`)
        if (sessionId) {
          localStorage.removeItem(`cbt_answers_session_${sessionId}`)
        }
      }
      // Tambahkan ?force_new=true pada URL
      router.push(`/exam/${examId}?force_new=true`)
    }
  }

  // 🟢 PERHITUNGAN POPULASI SKOR
  let totalPointsEarned = 0
  let totalMaxPoints = 0
  let totalCorrect = 0
  let totalWrong = 0
  let totalUnanswered = 0

  questions.forEach((q) => {
    const qMaxScore = Number(q.max_score) || 1
    totalMaxPoints += qMaxScore

    const userAns = userAnswersMap[q.id]
    const { isCorrect, isUnattempted, ratio } = checkQuestionAccuracy(q, userAns)

    if (isUnattempted) {
      totalUnanswered++
    } else if (isCorrect) {
      totalCorrect++
      totalPointsEarned += qMaxScore
    } else {
      totalWrong++
      totalPointsEarned += ratio * qMaxScore
    }
  })

  const accuracyPercentage =
    totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0

  // 🟢 SKOR AKHIR REAL-TIME
  const localSavedScore = typeof window !== 'undefined' ? localStorage.getItem(`cbt_score_${examId}`) : null
  const calculatedScore = sessionData?.score && sessionData.score > 0
    ? sessionData.score
    : localSavedScore ? Number(localSavedScore) : accuracyPercentage

  const filteredQuestions = questions.filter((q) => {
    const userAns = userAnswersMap[q.id]
    const { isCorrect } = checkQuestionAccuracy(q, userAns)

    if (filterType === 'correct') return isCorrect
    if (filterType === 'wrong') return !isCorrect
    return true
  })

  const themeStyles = {
    space: {
      card: 'bg-slate-900/85 border-purple-500/40 text-white shadow-purple-900/40',
      statBg: 'bg-purple-950/60 border-purple-800/50',
      badgeColor: 'bg-purple-900/80 text-purple-200 border-purple-700/50',
    },
    jungle: {
      card: 'bg-emerald-950/85 border-emerald-500/40 text-white shadow-emerald-950/40',
      statBg: 'bg-emerald-900/60 border-emerald-800/50',
      badgeColor: 'bg-emerald-900/80 text-emerald-200 border-emerald-700/50',
    },
    ocean: {
      card: 'bg-sky-950/85 border-cyan-500/40 text-white shadow-sky-950/40',
      statBg: 'bg-sky-900/60 border-cyan-800/50',
      badgeColor: 'bg-sky-900/80 text-cyan-200 border-cyan-700/50',
    },
    school: {
      card: 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50',
      statBg: 'bg-slate-50 border-slate-200',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  }[theme]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <div className="p-6 rounded-2xl bg-slate-900/70 text-white backdrop-blur-md border border-white/10 text-sm font-semibold">
          Memuat ringkasan & pembahasan nilai... ⏳
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 font-sans relative z-10 max-w-5xl mx-auto space-y-8">
      <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-2xl shadow-2xl space-y-6 transition-all ${themeStyles.card}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left border-b border-white/10 pb-6">
          <div className="space-y-1">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${themeStyles.badgeColor}`}>
              🏆 HASIL UJIAN SELESAI
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {exam?.title || 'Evaluasi Ujian TKA'}
            </h1>
            <p className="text-xs opacity-80">
              Subtes: <strong className="uppercase">{exam?.subtest || 'Umum'}</strong> | SD Negeri Getasan
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-white/10 px-5 py-3 rounded-2xl border border-white/15">
            <div className="text-4xl animate-bounce">⭐</div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase opacity-75 block">Skor Akhir</span>
              <span className="text-3xl font-black text-amber-400">{calculatedScore}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className={`p-4 rounded-2xl border backdrop-blur-md ${themeStyles.statBg}`}>
            <span className="text-[10px] font-bold uppercase opacity-75 block">Total Soal</span>
            <span className="text-xl font-black">{questions.length}</span>
          </div>

          <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <span className="text-[10px] font-bold uppercase opacity-75 block">Jawaban Benar</span>
            <span className="text-xl font-black">🟢 {totalCorrect}</span>
          </div>

          <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/30 text-rose-400">
            <span className="text-[10px] font-bold uppercase opacity-75 block">Salah / Kosong</span>
            <span className="text-xl font-black">🔴 {totalWrong + totalUnanswered}</span>
          </div>

          <div className="p-4 rounded-2xl border bg-sky-500/10 border-sky-500/30 text-sky-400">
            <span className="text-[10px] font-bold uppercase opacity-75 block">Akurasi Nilai</span>
            <span className="text-xl font-black">🎯 {accuracyPercentage}%</span>
          </div>
        </div>

        {/* 🟢 TOMBOL AKSI & KERJAKAN KEMBALI */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl border border-white/20 transition-all active:scale-95"
            >
              🏠 Beranda
            </Link>

            <Link
              href="/history"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl border border-white/20 transition-all active:scale-95"
            >
              📊 Riwayat Ujian
            </Link>
          </div>

          <button
            onClick={handleRetakeExam}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center space-x-2 border border-indigo-400/30"
          >
            <span>🔄</span>
            <span>Mengerjakan Kembali</span>
          </button>
        </div>
      </div>

      <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-2xl shadow-2xl space-y-6 ${themeStyles.card}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-black flex items-center space-x-2">
              <span>📖</span>
              <span>Pembahasan & Kunci Jawaban</span>
            </h2>
            <p className="text-xs opacity-75 mt-0.5">
              Pelajari kembali soal dan kunci jawaban resmi untuk meningkatkan pemahaman.
            </p>
          </div>

          <div className="flex bg-black/20 p-1 rounded-xl border border-white/10 space-x-1 text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-indigo-600 text-white shadow' : 'opacity-70 hover:opacity-100'
              }`}
            >
              Semua ({questions.length})
            </button>
            <button
              onClick={() => setFilterType('correct')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'correct' ? 'bg-emerald-600 text-white shadow' : 'opacity-70 hover:opacity-100'
              }`}
            >
              Benar ({totalCorrect})
            </button>
            <button
              onClick={() => setFilterType('wrong')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'wrong' ? 'bg-rose-600 text-white shadow' : 'opacity-70 hover:opacity-100'
              }`}
            >
              Salah ({totalWrong + totalUnanswered})
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => {
              const userAns = userAnswersMap[q.id]
              const { isCorrect, isUnattempted } = checkQuestionAccuracy(q, userAns)

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="font-extrabold text-xs sm:text-sm flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 bg-white/10 rounded-lg border border-white/10">
                        Soal #{questions.findIndex((item) => item.id === q.id) + 1}
                      </span>
                    </span>

                    {isCorrect ? (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <span>✅</span>
                        <span>Jawaban Benar</span>
                      </span>
                    ) : !isUnattempted ? (
                      <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <span>❌</span>
                        <span>Jawaban Kurang Tepat</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <span>⚠️</span>
                        <span>Tidak Dijawab</span>
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-medium leading-relaxed">
                    <MathRenderer content={q.question_text} />
                  </div>

                  {q.image_url && (
                    <div className="my-2">
                      <img
                        src={q.image_url}
                        alt="Gambar Soal"
                        className="max-h-56 rounded-xl border border-white/20 cursor-pointer object-contain hover:opacity-90 transition-opacity"
                        onClick={() => setZoomedImageUrl(q.image_url)}
                      />
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    {q.options?.map((opt: any) => {
                      const optKey = String(opt.key ?? opt.value ?? '').trim()
                      const correctOpt = (q.correct_option ?? q.correct_answer ?? q.correct_key ?? '').toString().trim()
                      
                      let isSelected = false
                      if (Array.isArray(userAns)) {
                        isSelected = userAns.includes(optKey)
                      } else if (typeof userAns === 'string') {
                        isSelected = userAns.trim().toLowerCase() === optKey.toLowerCase()
                      }

                      const isTheCorrectOption = correctOpt.toLowerCase() === optKey.toLowerCase() || (Array.isArray(q.correct_answers) && q.correct_answers.includes(optKey))

                      let optionStyle = 'border-white/10 bg-white/5 opacity-80'
                      if (isTheCorrectOption) {
                        optionStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold ring-1 ring-emerald-400'
                      } else if (isSelected && !isCorrect) {
                        optionStyle = 'border-rose-500 bg-rose-500/20 text-rose-200 font-bold ring-1 ring-rose-400'
                      }

                      return (
                        <div
                          key={optKey}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${optionStyle}`}
                        >
                          <div className="flex items-center space-x-3">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                                isTheCorrectOption
                                  ? 'bg-emerald-500 text-white'
                                  : isSelected
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-white/10 text-white/80'
                              }`}
                            >
                              {optKey}
                            </span>
                            <div>
                              <MathRenderer content={opt.text} />
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-[10px] font-bold">
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded bg-white/20">
                                Jawabanmu
                              </span>
                            )}
                            {isTheCorrectOption && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                                Kunci Jawaban ✔
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {(q.explanation || q.pembahasan) && (
                    <div className="mt-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                      <span className="font-extrabold uppercase tracking-wider block flex items-center space-x-1">
                        <span>💡</span>
                        <span>Pembahasan Soal:</span>
                      </span>
                      <div className="leading-relaxed opacity-95">
                        <MathRenderer content={q.explanation || q.pembahasan} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center text-xs opacity-75 bg-white/5 rounded-2xl border border-white/10">
              Tidak ada soal pada kategori filter ini.
            </div>
          )}
        </div>
      </div>

      {zoomedImageUrl && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 p-3 rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col items-center">
            <button
              onClick={() => setZoomedImageUrl(null)}
              className="self-end px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg mb-2"
            >
              ✕ Tutup
            </button>
            <img
              src={zoomedImageUrl}
              alt="Gambar Diperbesar"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExamSummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-sans">
          <div className="p-6 rounded-2xl bg-slate-900/70 text-white backdrop-blur-md border border-white/10 text-sm font-semibold">
            Memuat ringkasan & pembahasan nilai... ⏳
          </div>
        </div>
      }
    >
      <ExamSummaryContent />
    </Suspense>
  )
}