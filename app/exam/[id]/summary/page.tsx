'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { triggerVictoryConfetti } from '@/lib/confetti'
import { useTheme } from '@/context/ThemeContext'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

// 🛠️ HELPER EVALUASI PRESISI UNTUK 4 TIPE SOAL (PG, PG KOMPLEKS, MATRIKS, ESSAY)

const evaluateQuestion = (q: any, userAns: any, teacherScore: number | null = null) => {
  const qType = q.question_type || 'multiple_choice'
  const qMaxScore = Number(q.max_score) || 1

  const normalize = (value: any) =>
    String(value ?? '').trim().toLowerCase()

  const isUnanswered =
    userAns === undefined ||
    userAns === null ||
    userAns === '' ||
    (Array.isArray(userAns) && userAns.length === 0) ||
    (
      typeof userAns === 'object' &&
      !Array.isArray(userAns) &&
      Object.keys(userAns).length === 0
    )

  if (isUnanswered) {
    return {
      isCorrect: false,
      isUnanswered: true,
      ratio: 0,
      points: 0,
    }
  }

  // 1. Pilihan Ganda Biasa
  if (qType === 'multiple_choice') {
    const correctOpt = normalize(
      q.correct_option ?? q.correct_answer ?? q.correct_key
    )
    const userOpt = normalize(userAns)
    const isCorrect = userOpt !== '' && userOpt === correctOpt

    return {
      isCorrect,
      isUnanswered: false,
      ratio: isCorrect ? 1 : 0,
      points: isCorrect ? qMaxScore : 0,
    }
  }

  // 2. PG Kompleks (Multiple Checkbox)
  if (qType === 'complex_multiple_choice') {
    const parseArray = (value: any): string[] => {
      if (Array.isArray(value)) {
        return value.map(normalize).filter(Boolean)
      }

      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            return parsed.map(normalize).filter(Boolean)
          }
        } catch {
          // Nilai bukan JSON; lanjutkan sebagai satu pilihan.
        }

        return value.trim() ? [normalize(value)] : []
      }

      return []
    }

    const correctKeys = [
      ...new Set(
        parseArray(
          q.correct_answers ??
          q.correct_option ??
          q.correct_answer
        )
      ),
    ]

    const userKeys = [
      ...new Set(parseArray(userAns)),
    ]

    if (correctKeys.length === 0) {
      return {
        isCorrect: false,
        isUnanswered: false,
        ratio: 0,
        points: 0,
      }
    }

    // Jawaban dinilai benar penuh hanya jika seluruh pilihan
    // sama persis dengan kunci, tanpa pilihan tambahan.
    const isCorrect =
      correctKeys.length === userKeys.length &&
      correctKeys.every((key) => userKeys.includes(key))

    // Skor parsial: pilihan benar dikurangi pilihan salah.
    const correctCount = userKeys.filter(
      (key) => correctKeys.includes(key)
    ).length

    const wrongCount = userKeys.filter(
      (key) => !correctKeys.includes(key)
    ).length

    const netCorrect = Math.max(0, correctCount - wrongCount)
    const ratio = Math.min(1, netCorrect / correctKeys.length)

    return {
      isCorrect,
      isUnanswered: false,
      ratio,
      points: ratio * qMaxScore,
    }
  }

  // 3. Matriks Benar - Salah
  
if (qType === 'true_false_matrix') {
  const correctObj =
    q.correct_answers &&
    typeof q.correct_answers === 'object' &&
    !Array.isArray(q.correct_answers)
      ? q.correct_answers
      : {}

  let userObj: Record<string, any> = {}

  if (
    typeof userAns === 'object' &&
    userAns !== null &&
    !Array.isArray(userAns)
  ) {
    userObj = userAns
  } else if (typeof userAns === 'string') {
    try {
      const parsed = JSON.parse(userAns)

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        userObj = parsed
      }
    } catch {
      userObj = {}
    }
  }

  const statementIds = Object.keys(correctObj)

  if (statementIds.length === 0) {
    return {
      isCorrect: false,
      isUnanswered: false,
      ratio: 0,
      points: 0,
    }
  }

  let correctRows = 0
  let answeredRows = 0

  for (const statementId of statementIds) {
    const correctValue = normalize(correctObj[statementId])
    const userValue = normalize(userObj[statementId])

    if (userValue !== '') {
      answeredRows++
    }

    if (
      userValue !== '' &&
      userValue === correctValue
    ) {
      correctRows++
    }
  }

  const ratio = correctRows / statementIds.length
  const isCorrect = correctRows === statementIds.length

  return {
    isCorrect,
    isUnanswered: answeredRows === 0,
    ratio,
    points: ratio * qMaxScore,
  }
}


  // 4. Essay / Uraian
  
  // Essay / Uraian - menunggu penilaian guru/admin
  if (qType === 'essay' || qType === 'uraian') {
    const essayText = typeof userAns === 'string'
      ? userAns.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<\/p\s*>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').replace(/[\u00a0\u200b\uFEFF]/g, ' ').trim()
      : String(userAns ?? '').trim()
    const isFilled = essayText.length > 0
    if (isFilled && teacherScore !== null && teacherScore !== undefined) {
      return { isCorrect: Number(teacherScore) > 0, isUnanswered: false, isPending: false, isGraded: true, ratio: qMaxScore > 0 ? Number(teacherScore) / qMaxScore : 0, points: Number(teacherScore) }
    }
    return { isCorrect: false, isUnanswered: !isFilled, isPending: isFilled, isGraded: false, ratio: 0, points: 0 }
  }

  return {
    isCorrect: false,
    isUnanswered: false,
    ratio: 0,
    points: 0,
  }
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
  const [teacherScoresMap, setTeacherScoresMap] = useState<{ [key: string]: number | null }>({})
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
      // Ringkasan hanya boleh dibuka oleh pemilik sesi yang sedang login.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        setLoading(false)
        return
      }

      let currentSessionId = sessionId

      if (!currentSessionId) {
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
      } else {
        const { data: session } = await supabase
          .from('exam_sessions')
          .select('*')
          .eq('id', currentSessionId)
          .eq('user_id', user.id)
          .single()

        if (!session) {
          // Jangan memuat jawaban jika sesi bukan milik akun ini atau tidak ditemukan.
          setLoading(false)
          router.replace('/')
          return
        }

        setSessionData(session)
      }

      // 4. Jawaban Rinci dengan Auto-Parsing JSON
      if (currentSessionId) {
        const { data: answersData } = await supabase
          .from('answers')
          .select('*')
          .eq('session_id', currentSessionId)

        if (answersData) {
          const map: { [key: string]: any } = {}
          const scores: { [key: string]: number | null } = {}
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
            scores[ans.question_id] = ans.teacher_score === null || ans.teacher_score === undefined ? null : Number(ans.teacher_score)
          })
          setUserAnswersMap(map)
          setTeacherScoresMap(scores)
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
  let totalPendingEssay = 0

  questions.forEach((q) => {
    const qMaxScore = Number(q.max_score) || 1
    totalMaxPoints += qMaxScore

    const userAns = userAnswersMap[q.id]
    const evalResult = evaluateQuestion(q, userAns, teacherScoresMap[q.id])

    if (evalResult.isPending) {
      totalPendingEssay++
    } else if (evalResult.isUnanswered) {
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

  // Rekap poin berdasarkan tipe soal. Nilai essay yang belum diperiksa
  // tetap dihitung sebagai menunggu, bukan dianggap sudah mendapat nol final.
  const questionTypeLabels: Record<string, string> = {
    multiple_choice: 'Pilihan ganda',
    complex_multiple_choice: 'Pilihan ganda kompleks',
    true_false_matrix: 'Matriks benar / salah',
    essay: 'Essay / uraian',
    uraian: 'Essay / uraian',
  }

  const pointsByType = Object.values(
    questions.reduce((groups: Record<string, any>, q) => {
      const rawType = String(q.question_type || 'multiple_choice')
      const typeKey = rawType === 'uraian' ? 'essay' : rawType
      const userAns = userAnswersMap[q.id]
      const result = evaluateQuestion(q, userAns, teacherScoresMap[q.id])
      const maxPoints = Number(q.max_score) || 1
      const group = groups[typeKey] || {
        key: typeKey,
        label: questionTypeLabels[typeKey] || rawType.replaceAll('_', ' '),
        count: 0,
        maxPoints: 0,
        earnedPoints: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        pending: 0,
      }

      group.count += 1
      group.maxPoints += maxPoints
      group.earnedPoints += result.points || 0
      if (result.isPending) group.pending += 1
      else if (result.isUnanswered) group.unanswered += 1
      else if (result.isCorrect) group.correct += 1
      else group.wrong += 1

      groups[typeKey] = group
      return groups
    }, {})
  )

  // Auto Update database jika nilai / end_time null
  

  // Filter Soal
  const filteredQuestions = questions.filter((q) => {
    const userAns = userAnswersMap[q.id]
    const evalResult = evaluateQuestion(q, userAns, teacherScoresMap[q.id])

    if (exam?.show_results === false || exam?.show_explanations === false) return true
    if (filterType === 'correct') return evalResult.isCorrect
    if (filterType === 'wrong') return !evalResult.isCorrect && !evalResult.isPending
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
      badgeColor: 'bg-amber-500/20 text-amber-900 border-amber-400/50',
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
      {exam?.show_results === false ? (
        <div className={`p-6 rounded-3xl border backdrop-blur-2xl shadow-2xl ${themeStyles.card}`}>
          <h1 className="text-xl sm:text-2xl font-black">{exam?.title || 'Ujian CBT'}</h1>
          <p className="mt-2 text-sm opacity-80">Subtes: <strong className="uppercase">{exam?.subtest || 'Umum'}</strong></p>
          <div className="mt-4 rounded-xl border border-amber-300/50 bg-amber-500/10 px-4 py-3 text-sm">
            🔒 Nilai ujian ini disembunyikan sesuai pengaturan paket.
          </div>
          <div className="mt-4 rounded-xl border border-sky-300/40 bg-sky-500/10 px-4 py-4 text-sm leading-relaxed">
            <p className="font-extrabold">🌟 Tetap semangat belajar!</p>
            <p className="mt-1">Nilai bukan satu-satunya ukuran kemampuanmu. Terus berlatih, jangan takut salah, dan jadikan setiap pengalaman sebagai langkah untuk menjadi lebih baik.</p>
            <p className="mt-2 font-semibold">Kamu hebat karena sudah berusaha menyelesaikan ujian ini. Terus maju! 💪</p>
          </div>
        </div>
      ) : (
      <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-2xl shadow-2xl space-y-6 transition-all ${themeStyles.card}`}>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left border-b border-white/10 pb-6">
          <div className="space-y-1">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${themeStyles.badgeColor}`}>
              {totalPendingEssay > 0 ? '⏳ HASIL UJIAN · NILAI SEMENTARA' : '🏆 HASIL UJIAN SELESAI'}
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
              <span className="text-[10px] font-extrabold uppercase opacity-75 block">{totalPendingEssay > 0 ? 'Nilai Sementara' : 'Skor Akhir'}</span>
              <span className="text-3xl font-black text-amber-400">
                  {sessionData?.score !== null && sessionData?.score !== undefined
                    ? Number(sessionData.score)
                    : calculatedScore} / 100
                </span>
            </div>
          </div>
        </div>

        {totalPendingEssay > 0 ? (
          <div className="rounded-xl border border-amber-300/50 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed">
            <strong>Nilai belum final.</strong> Masih ada {totalPendingEssay} jawaban essay/uraian yang menunggu penilaian guru. Nilai dan rincian poin dapat berubah setelah guru menyelesaikan pemeriksaan.
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-xs leading-relaxed">
            <strong>Penilaian selesai.</strong> Seluruh jawaban yang perlu dinilai sudah memiliki hasil penilaian.
          </div>
        )}

        <div className="rounded-xl border border-sky-300/40 bg-sky-500/10 px-4 py-3 text-xs leading-relaxed">
          🌟 <strong>Terus tingkatkan kemampuanmu!</strong> Hasil hari ini adalah bekal untuk belajar lebih baik esok hari. Tetap percaya diri, rajin berlatih, dan jangan menyerah saat menemui soal yang sulit. Kamu pasti bisa! 💪
        </div>

        {/* STATISTIK RINGKAS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
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

          <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/30 text-amber-500">
            <span className="text-[10px] font-bold uppercase opacity-75 block">Essay Menunggu Nilai</span>
            <span className="text-xl font-black">📝 {totalPendingEssay}</span>
          </div>

          <div className="p-4 rounded-2xl border bg-sky-500/10 border-sky-500/30 text-sky-400">
            <span className="text-[10px] font-bold uppercase opacity-75 block">Akurasi Nilai</span>
            <span className="text-xl font-black">🎯 {calculatedScore}%</span>
          </div>
        </div>

        {/* RINCIAN PEROLEHAN POIN BERDASARKAN TIPE SOAL */}
        <section className="rounded-2xl border border-white/15 bg-black/10 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
            <div>
              <h2 className="text-sm sm:text-base font-black">📊 Rincian Poin per Tipe Soal</h2>
              <p className="text-[11px] opacity-75 mt-1">Poin yang diperoleh dibandingkan dengan poin maksimal setiap tipe soal.</p>
            </div>
            <span className="text-[11px] font-bold opacity-80">
              Total: {Number(totalPointsEarned.toFixed(2))} / {Number(totalMaxPoints.toFixed(2))} poin
            </span>
          </div>

          {pointsByType.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pointsByType.map((item: any) => {
                const percentage = item.maxPoints > 0
                  ? Math.max(0, Math.min(100, (item.earnedPoints / item.maxPoints) * 100))
                  : 0
                return (
                  <div key={item.key} className="rounded-xl border border-white/15 bg-white/5 p-3 space-y-2">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold capitalize">{item.label}</p>
                        <p className="text-[10px] opacity-70">{item.count} soal</p>
                      </div>
                      <p className="text-xs font-black tabular-nums whitespace-nowrap">
                        {Number(item.earnedPoints.toFixed(2))} / {Number(item.maxPoints.toFixed(2))}
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold opacity-80">
                      {item.correct > 0 && <span>✓ Benar {item.correct}</span>}
                      {item.wrong > 0 && <span>✕ Salah {item.wrong}</span>}
                      {item.unanswered > 0 && <span>○ Kosong {item.unanswered}</span>}
                      {item.pending > 0 && <span className="text-amber-300">⏳ Menunggu nilai {item.pending}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs opacity-70">Belum ada data soal untuk ditampilkan.</p>
          )}
          {totalPendingEssay > 0 && (
            <p className="text-[10px] leading-relaxed opacity-75">
              Catatan: poin uraian yang belum diperiksa belum masuk ke perolehan poin. Rincian dan skor akhir akan berubah setelah guru memberikan nilai.
            </p>
          )}
        </section>

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
            className="px-5 py-2.5 bg-white/10 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-white/20 transition-all"
          >
            📊 Lihat Semua Riwayat Nilai
          </Link>
        </div>
      </div>
      )}

      {/* 2. BAGIAN PEMBAHASAN SOAL */}
      {exam?.show_results !== false ? (
      <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-2xl shadow-2xl space-y-6 ${themeStyles.card}`}>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-black flex items-center space-x-2">
              <span>📖</span>
              <span>{exam?.show_explanations === false ? 'Ringkasan Jawaban' : 'Pembahasan & Kunci Jawaban'}</span>
            </h2>
            <p className="text-xs opacity-75 mt-0.5">
              {exam?.show_explanations === false ? 'Berikut soal dan jawaban yang telah kamu kirim. Kunci jawaban dan pembahasan tidak ditampilkan.' : 'Pelajari kembali soal dan kunci jawaban resmi untuk meningkatkan pemahaman.'}
            </p>
          </div>

          {/* FILTER TAB */}
          {exam?.show_results !== false && exam?.show_explanations !== false && (
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
          )}
        </div>

        {/* DAFTAR SOAL & PEMBAHASAN */}
        <div className="space-y-6">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => {
              const userAns = userAnswersMap[q.id]
              const evalResult = evaluateQuestion(q, userAns, teacherScoresMap[q.id] ?? null)
              const qType = q.question_type || 'multiple_choice'

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all space-y-4 text-slate-900 ${
                    exam?.show_results === false || exam?.show_explanations === false
                      ? 'bg-slate-50 border-slate-200'
                      : evalResult.isPending
                      ? 'bg-sky-50 border-sky-300'
                      : evalResult.isCorrect
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-rose-50 border-rose-300'
                  }`}
                >
                  {/* HEAD SOAL */}
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3 text-slate-900">
                    <span className="font-extrabold text-xs sm:text-sm flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-lg border border-slate-300">
                        Soal #{questions.findIndex((item) => item.id === q.id) + 1}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 text-[10px] font-bold rounded uppercase border border-indigo-300">
                        {qType === 'complex_multiple_choice'
                          ? 'PG Kompleks'
                          : qType === 'true_false_matrix'
                          ? 'Matriks'
                          : qType === 'essay' || qType === 'uraian'
                          ? 'Essay / Uraian'
                          : 'Pilihan Ganda'}
                      </span>
                    </span>

                    {/* BADGE STATUS */}
                    {exam?.show_results !== false && exam?.show_explanations !== false && (evalResult.isPending ? (
                      <span className="px-3 py-1 bg-sky-100 text-sky-900 border border-sky-300 text-xs font-bold rounded-xl flex items-center space-x-1"><span>📝</span><span>Menunggu Penilaian Guru</span></span>
                    ) : evalResult.isGraded ? (
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs font-bold rounded-xl">Sudah Dinilai Guru</span>
                    ) : evalResult.isCorrect ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <span>✅</span>
                        <span>Jawaban Benar</span>
                      </span>
                    ) : evalResult.isUnanswered ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <span>⚠️</span>
                        <span>Tidak Dijawab</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-rose-100 text-rose-900 border border-rose-500/40 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <span>❌</span>
                        <span>Jawaban Kurang Tepat</span>
                      </span>
                    ))}
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
                        const isCorrectOpt = exam?.show_explanations !== false && correctOpt === optKey.toUpperCase()

                        let optionStyle = 'border-slate-300 bg-slate-50 text-slate-800'
                        if (exam?.show_explanations !== false && isCorrectOpt) {
                          optionStyle = 'border-emerald-400 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-300'
                        } else if (exam?.show_explanations !== false && isSelected && !evalResult.isCorrect) {
                          optionStyle = 'border-rose-400 bg-rose-50 text-rose-950 font-bold ring-1 ring-rose-300'
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
                                    ? 'bg-emerald-600 text-white'
                                    : isSelected
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {optKey}
                              </span>
                              <div>
                                <MathRenderer content={typeof opt === 'string' ? opt : opt.text} />
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 text-[10px] font-bold">
                              {isSelected && <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800">Jawabanmu</span>}
                              {exam?.show_explanations !== false && isCorrectOpt && (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
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
                        const isCorrectOpt = exam?.show_explanations !== false && correctKeys.includes(optKey.toUpperCase())

                        let optionStyle = 'border-slate-300 bg-slate-50 text-slate-800'
                        if (exam?.show_explanations !== false && isCorrectOpt) {
                          optionStyle = 'border-emerald-400 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-300'
                        } else if (exam?.show_explanations !== false && isSelected && !isCorrectOpt) {
                          optionStyle = 'border-rose-400 bg-rose-50 text-rose-950 font-bold ring-1 ring-rose-300'
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
                              {isSelected && <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800">Jawabanmu</span>}
                              {isCorrectOpt && (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
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
                    <div className="border border-slate-300 rounded-xl overflow-hidden text-xs bg-white text-slate-900">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                          <tr>
                            <th className="p-3">Pernyataan</th>
                            <th className="p-3 w-28 text-center border-l border-slate-200">Jawabanmu</th>
                            {exam?.show_explanations !== false && <th className="p-3 w-28 text-center border-l border-slate-200">Kunci Jawaban</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
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
                            const isRowCorrect = exam?.show_explanations !== false && String(userVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase()

                            return (
                              <tr key={stId} className="hover:bg-slate-50">
                                <td className="p-3">
                                  <MathRenderer content={typeof st === 'string' ? st : st.text} />
                                </td>
                                <td className="p-3 text-center border-l border-slate-200 font-bold">
                                  <span
                                    className={`px-2 py-0.5 rounded ${
                                      isRowCorrect
                                        ? 'bg-emerald-100 text-emerald-900'
                                        : 'bg-rose-100 text-rose-900'
                                    }`}
                                  >
                                    {userVal}
                                  </span>
                                </td>
                                {exam?.show_explanations !== false && <td className="p-3 text-center border-l border-slate-200 font-bold text-emerald-900">{correctVal}</td>}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 4. ESSAY */}
                  {qType === 'essay' && (
                    <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 space-y-1">
                      <span className="font-bold text-amber-900">Jawaban Essay Siswa:</span>
                      <div className="text-slate-900">
                        <MathRenderer content={typeof userAns === 'string' ? userAns : '(Belum dijawab)'} />
                      </div>
                    </div>
                  )}

                  {/* PEMBAHASAN SOAL */}
                  {exam?.show_explanations !== false && (q.explanation || q.pembahasan) && (
                    <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1">
                      <span className="font-extrabold uppercase tracking-wider block flex items-center space-x-1">
                        <span>💡</span>
                        <span>Pembahasan Soal:</span>
                      </span>
                      <div className="leading-relaxed text-amber-950">
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
      ) : false ? (
        <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-2xl shadow-2xl ${themeStyles.card}`}>
          <h2 className="text-lg sm:text-xl font-black">📖 Pembahasan & Kunci Jawaban</h2>
          <div className="mt-3 rounded-xl border border-amber-300/50 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed">
            🔒 Kunci jawaban dan pembahasan tidak ditampilkan sesuai pengaturan paket ujian.
          </div>
          <div className="mt-4 rounded-xl border border-sky-300/40 bg-sky-500/10 px-4 py-4 text-sm leading-relaxed">
            <p className="font-extrabold">🌱 Jangan berhenti belajar!</p>
            <p className="mt-1">Kamu sudah menyelesaikan satu tahap dengan baik. Terus berlatih, perbaiki hal yang masih sulit, dan rayakan setiap kemajuan kecilmu.</p>
            <p className="mt-2 font-semibold">Usaha yang tekun akan membawamu semakin dekat dengan cita-cita. Semangat! ⭐</p>
          </div>
        </div>
      ) : null}

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