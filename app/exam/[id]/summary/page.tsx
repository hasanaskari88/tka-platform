'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { triggerVictoryConfetti } from '@/lib/confetti'
import { useTheme } from '@/context/ThemeContext'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

// 🛠️ HELPER EVALUASI PRESISI UNTUK 4 TIPE SOAL (PG, PG KOMPLEKS, MATRIKS, ESSAY)
const evaluateQuestion = (q: any, userAns: any) => {
  const qType = q.question_type || 'multiple_choice'
  const qMaxScore = Number(q.max_score) || 1

  const isUnanswered =
    userAns === undefined ||
    userAns === null ||
    userAns === '' ||
    (Array.isArray(userAns) && userAns.length === 0) ||
    (typeof userAns === 'object' && !Array.isArray(userAns) && Object.keys(userAns).length === 0)

  if (isUnanswered) {
    return { isCorrect: false, isUnanswered: true, ratio: 0, points: 0 }
  }

  // 1. Pilihan Ganda Biasa
  if (qType === 'multiple_choice') {
    const correctOpt = String(q.correct_option ?? q.correct_answer ?? q.correct_key ?? '').trim().toUpperCase()
    const userOpt = String(userAns).trim().toUpperCase()
    const isCorrect = userOpt === correctOpt
    return { isCorrect, isUnanswered: false, ratio: isCorrect ? 1 : 0, points: isCorrect ? qMaxScore : 0 }
  }

  // 2. PG Kompleks (Multiple Checkbox)
  if (qType === 'complex_multiple_choice') {
    const correctKeys: string[] = Array.isArray(q.correct_answers)
      ? q.correct_answers.map((k: any) => String(k).trim().toUpperCase())
      : [String(q.correct_option || q.correct_answer || '').trim().toUpperCase()]

    let userKeys: string[] = []
    if (Array.isArray(userAns)) {
      userKeys = userAns.map((k: any) => String(k).trim().toUpperCase())
    } else if (typeof userAns === 'string') {
      try {
        const parsed = JSON.parse(userAns)
        if (Array.isArray(parsed)) userKeys = parsed.map((k: any) => String(k).trim().toUpperCase())
        else userKeys = [userAns.trim().toUpperCase()]
      } catch {
        userKeys = [userAns.trim().toUpperCase()]
      }
    }

    const correctUserChoices = userKeys.filter((k) => correctKeys.includes(k)).length
    const wrongUserChoices = userKeys.filter((k) => !correctKeys.includes(k)).length
    const netCorrect = Math.max(0, correctUserChoices - wrongUserChoices)
    const ratio = correctKeys.length > 0 ? netCorrect / correctKeys.length : 0
    const isCorrect = ratio === 1

    return { isCorrect, isUnanswered: false, ratio, points: ratio * qMaxScore }
  }

  // 3. Matriks Benar - Salah
  if (qType === 'true_false_matrix') {
    const correctObj: { [key: string]: string } = q.correct_answers || {}
    let userObj: { [key: string]: string } = {}

    if (typeof userAns === 'object' && !Array.isArray(userAns)) {
      userObj = userAns
    } else if (typeof userAns === 'string') {
      try {
        userObj = JSON.parse(userAns)
      } catch {
        userObj = {}
      }
    }

    const statementIds = Object.keys(correctObj)
    if (statementIds.length === 0) {
      return { isCorrect: false, isUnanswered: false, ratio: 0, points: 0 }
    }

    let correctRows = 0
    statementIds.forEach((sId) => {
      if (String(userObj[sId] || '').trim().toLowerCase() === String(correctObj[sId] || '').trim().toLowerCase()) {
        correctRows++
      }
    })

    const ratio = correctRows / statementIds.length
    const isCorrect = ratio === 1

    return { isCorrect, isUnanswered: false, ratio, points: ratio * qMaxScore }
  }

  // 4. Essay / Uraian
  if (qType === 'essay') {
    return { isCorrect: false, isUnanswered: false, ratio: 0, points: 0 }
  }

  return { isCorrect: false, isUnanswered: false, ratio: 0, points: 0 }
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

  // Filter pembahasan: 'all' | 'correct' | 'wrong'
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong'>('all')
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    triggerVictoryConfetti()

    async function loadSummaryAndReview() {
      if (!examId) return
      const supabase = createClient()

      // 1. Data Ujian
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (examData) setExam(examData)

      // 2. Daftar Soal Ujian
      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true })

      if (questionData) setQuestions(questionData)

      // 3. Data Sesi Ujian & Jawaban Siswa
      let currentSessionId = sessionId

      if (!currentSessionId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: lastSession } = await supabase
            .from('exam_sessions')
            .select('*')
            .eq('exam_id', examId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (lastSession) {
            currentSessionId = lastSession.id
            setSessionData(lastSession)
          }
        }
      } else {
        const { data: session } = await supabase
          .from('exam_sessions')
          .select('*')
          .eq('id', currentSessionId)
          .single()

        if (session) setSessionData(session)
      }

      // 4. Jawaban Rinci dengan Auto-Parsing JSON
      if (currentSessionId) {
        const { data: answersData } = await supabase
          .from('answers')
          .select('*')
          .eq('session_id', currentSessionId)

        if (answersData) {
          const map: { [key: string]: any } = {}
          answersData.forEach((ans) => {
            let rawVal = ans.user_answer !== undefined && ans.user_answer !== null
              ? ans.user_answer
              : ans.selected_option

            if (typeof rawVal === 'string') {
              try {
                const parsed = JSON.parse(rawVal)
                if (parsed !== null) rawVal = parsed
              } catch {
                // Biarkan string biasa
              }
            }
            map[ans.question_id] = rawVal
          })
          setUserAnswersMap(map)
        }
      }

      setLoading(false)
    }

    loadSummaryAndReview()
  }, [examId, sessionId])

  // Hitung Skor & Statistik
  let totalPointsEarned = 0
  let totalMaxPoints = 0
  let totalCorrect = 0
  let totalWrong = 0
  let totalUnanswered = 0

  questions.forEach((q) => {
    const qMaxScore = Number(q.max_score) || 1
    totalMaxPoints += qMaxScore

    const userAns = userAnswersMap[q.id]
    const evalResult = evaluateQuestion(q, userAns)

    if (evalResult.isUnanswered) {
      totalUnanswered++
    } else if (evalResult.isCorrect) {
      totalCorrect++
      totalPointsEarned += evalResult.points
    } else {
      totalWrong++
      totalPointsEarned += evalResult.points
    }
  })

  const calculatedScore = totalMaxPoints > 0
    ? Math.round((totalPointsEarned / totalMaxPoints) * 100)
    : 0

  // Auto Update database jika nilai / end_time null
  useEffect(() => {
    if (sessionData && !loading && questions.length > 0) {
      const dbScore = Number(sessionData.score)
      const needFixScore = dbScore !== calculatedScore
      const needFixEndTime = !sessionData.end_time

      if (needFixScore || needFixEndTime) {
        const supabase = createClient()
        const nowIso = new Date().toISOString()
        const updatedEndTime = sessionData.end_time || nowIso

        supabase
          .from('exam_sessions')
          .update({
            score: calculatedScore,
            end_time: updatedEndTime,
          })
          .eq('id', sessionData.id)
          .then(() => {
            setSessionData((prev: any) =>
              prev ? { ...prev, score: calculatedScore, end_time: updatedEndTime } : prev
            )
          })
      }
    }
  }, [sessionData, calculatedScore, loading, questions.length])

  // Filter Soal
  const filteredQuestions = questions.filter((q) => {
    const userAns = userAnswersMap[q.id]
    const evalResult = evaluateQuestion(q, userAns)

    if (filterType === 'correct') return evalResult.isCorrect
    if (filterType === 'wrong') return !evalResult.isCorrect
    return true
  })

  // 🎨 Theme Styles (Dukungan Lengkap 6 Tema & Safe Fallback)
  const themeStylesMap: Record<string, { card: string; statBg: string; badgeColor: string }> = {
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
    disney: {
      card: 'bg-purple-950/90 border-2 border-amber-400/40 text-white shadow-pink-950/50',
      statBg: 'bg-purple-900/60 border-amber-400/40 text-amber-200',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
    },
    cartoon3d: {
      card: 'bg-white border-4 border-slate-900 text-slate-900 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]',
      statBg: 'bg-amber-100 border-2 border-slate-900 text-slate-900',
      badgeColor: 'bg-yellow-200 text-slate-900 border-2 border-slate-900 font-black',
    },
    school: {
      card: 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50',
      statBg: 'bg-slate-50 border-slate-200',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  }

  const themeStyles = themeStylesMap[theme] || themeStylesMap.school

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
      
      {/* 1. KARTU UTAMA SKOR & PRESTASI */}
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
              Subtes: <strong className="uppercase">{exam?.subtest || 'Umum'}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-white/10 px-5 py-3 rounded-2xl border border-white/15">
            <div className="text-4xl animate-bounce">⭐</div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase opacity-75 block">Skor Akhir</span>
              <span className="text-3xl font-black text-amber-400">{calculatedScore} / 100</span>
            </div>
          </div>
        </div>

        {/* STATISTIK RINGKAS */}
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
            <span className="text-xl font-black">🎯 {calculatedScore}%</span>
          </div>
        </div>

        {/* NAVIGASI CEPAT */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
          <Link
            href="/"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95"
          >
            🏠 Kembali ke Beranda Ujian
          </Link>

          <Link
            href="/history"
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl border border-white/20 transition-all"
          >
            📊 Lihat Semua Riwayat Nilai
          </Link>
        </div>
      </div>

      {/* 2. BAGIAN PEMBAHASAN SOAL */}
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

          {/* FILTER TAB */}
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

        {/* DAFTAR SOAL & PEMBAHASAN */}
        <div className="space-y-6">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => {
              const userAns = userAnswersMap[q.id]
              const evalResult = evaluateQuestion(q, userAns)
              const qType = q.question_type || 'multiple_choice'

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    evalResult.isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  {/* HEAD SOAL */}
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="font-extrabold text-xs sm:text-sm flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 bg-white/10 rounded-lg border border-white/10">
                        Soal #{questions.findIndex((item) => item.id === q.id) + 1}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded uppercase border border-indigo-500/30">
                        {qType === 'complex_multiple_choice'
                          ? 'PG Kompleks'
                          : qType === 'true_false_matrix'
                          ? 'Matriks'
                          : qType === 'essay'
                          ? 'Essay'
                          : 'Pilihan Ganda'}
                      </span>
                    </span>

                    {/* BADGE STATUS */}
                    {evalResult.isCorrect ? (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <span>✅</span>
                        <span>Jawaban Benar</span>
                      </span>
                    ) : evalResult.isUnanswered ? (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <span>⚠️</span>
                        <span>Tidak Dijawab</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <span>❌</span>
                        <span>Jawaban Kurang Tepat</span>
                      </span>
                    )}
                  </div>

                  {/* TEKS SOAL */}
                  <div className="text-sm font-medium leading-relaxed">
                    <MathRenderer content={q.question_text} />
                  </div>

                  {/* GAMBAR SOAL JIKA ADA */}
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

                  {/* RENDER HASIL SESUAI TIPE SOAL */}

                  {/* 1. PILIHAN GANDA BIASA */}
                  {qType === 'multiple_choice' && Array.isArray(q.options) && (
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt: any, oIdx: number) => {
                        const optKey = opt.key || String.fromCharCode(65 + oIdx)
                        const correctOpt = String(q.correct_option ?? q.correct_answer ?? q.correct_key ?? '').trim().toUpperCase()
                        const userOpt = String(userAns || '').trim().toUpperCase()

                        const isSelected = userOpt === optKey.toUpperCase()
                        const isCorrectOpt = correctOpt === optKey.toUpperCase()

                        let optionStyle = 'border-white/10 bg-white/5 opacity-80'
                        if (isCorrectOpt) {
                          optionStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold ring-1 ring-emerald-400'
                        } else if (isSelected && !evalResult.isCorrect) {
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
                                  isCorrectOpt
                                    ? 'bg-emerald-500 text-white'
                                    : isSelected
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-white/10 text-white/80'
                                }`}
                              >
                                {optKey}
                              </span>
                              <div>
                                <MathRenderer content={typeof opt === 'string' ? opt : opt.text} />
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 text-[10px] font-bold">
                              {isSelected && <span className="px-2 py-0.5 rounded bg-white/20">Jawabanmu</span>}
                              {isCorrectOpt && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                                  Kunci Jawaban ✔
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 2. PG KOMPLEKS */}
                  {qType === 'complex_multiple_choice' && Array.isArray(q.options) && (
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt: any, oIdx: number) => {
                        const optKey = opt.key || String.fromCharCode(65 + oIdx)
                        const correctKeys: string[] = Array.isArray(q.correct_answers)
                          ? q.correct_answers.map((k: any) => String(k).trim().toUpperCase())
                          : [String(q.correct_option || q.correct_answer || '').trim().toUpperCase()]

                        let userKeys: string[] = []
                        if (Array.isArray(userAns)) {
                          userKeys = userAns.map((k: any) => String(k).trim().toUpperCase())
                        } else if (typeof userAns === 'string') {
                          try {
                            const parsed = JSON.parse(userAns)
                            if (Array.isArray(parsed)) userKeys = parsed.map((k: any) => String(k).trim().toUpperCase())
                            else userKeys = [userAns.trim().toUpperCase()]
                          } catch {
                            userKeys = [userAns.trim().toUpperCase()]
                          }
                        }

                        const isSelected = userKeys.includes(optKey.toUpperCase())
                        const isCorrectOpt = correctKeys.includes(optKey.toUpperCase())

                        let optionStyle = 'border-white/10 bg-white/5 opacity-80'
                        if (isCorrectOpt) {
                          optionStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold ring-1 ring-emerald-400'
                        } else if (isSelected && !isCorrectOpt) {
                          optionStyle = 'border-rose-500 bg-rose-500/20 text-rose-200 font-bold ring-1 ring-rose-400'
                        }

                        return (
                          <div
                            key={optKey}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${optionStyle}`}
                          >
                            <div className="flex items-center space-x-3">
                              <input type="checkbox" readOnly checked={isSelected} className="rounded" />
                              <span className="font-bold">{optKey}.</span>
                              <div>
                                <MathRenderer content={typeof opt === 'string' ? opt : opt.text} />
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 text-[10px] font-bold">
                              {isSelected && <span className="px-2 py-0.5 rounded bg-white/20">Jawabanmu</span>}
                              {isCorrectOpt && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                                  Kunci Jawaban ✔
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 3. MATRIKS BENAR - SALAH */}
                  {qType === 'true_false_matrix' && Array.isArray(q.options) && (
                    <div className="border border-white/10 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-white/10 font-bold text-white/90 border-b border-white/10">
                          <tr>
                            <th className="p-3">Pernyataan</th>
                            <th className="p-3 w-28 text-center border-l border-white/10">Jawabanmu</th>
                            <th className="p-3 w-28 text-center border-l border-white/10">Kunci Jawaban</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {q.options.map((st: any, sIdx: number) => {
                            const stId = String(st.id || sIdx + 1)
                            const correctObj = q.correct_answers || {}

                            let userObj: { [key: string]: string } = {}
                            if (typeof userAns === 'object' && userAns !== null && !Array.isArray(userAns)) {
                              userObj = userAns
                            } else if (typeof userAns === 'string') {
                              try {
                                userObj = JSON.parse(userAns)
                              } catch {
                                userObj = {}
                              }
                            }

                            const userVal = userObj[stId] || 'Kosong'
                            const correctVal = correctObj[stId] || 'Benar'
                            const isRowCorrect = String(userVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase()

                            return (
                              <tr key={stId} className="hover:bg-white/5">
                                <td className="p-3">
                                  <MathRenderer content={typeof st === 'string' ? st : st.text} />
                                </td>
                                <td className="p-3 text-center border-l border-white/10 font-bold">
                                  <span
                                    className={`px-2 py-0.5 rounded ${
                                      isRowCorrect
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-rose-500/20 text-rose-300'
                                    }`}
                                  >
                                    {userVal}
                                  </span>
                                </td>
                                <td className="p-3 text-center border-l border-white/10 font-bold text-emerald-300">
                                  {correctVal}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 4. ESSAY */}
                  {qType === 'essay' && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-amber-300">Jawaban Essay Siswa:</span>
                      <p className="whitespace-pre-wrap text-white/90">{typeof userAns === 'string' ? userAns : '(Belum dijawab)'}</p>
                    </div>
                  )}

                  {/* PEMBAHASAN SOAL */}
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

      {/* MODAL ZOOM GAMBAR SOAL */}
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