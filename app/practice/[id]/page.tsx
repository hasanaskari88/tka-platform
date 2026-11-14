
'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'
import MazeGameEngine from '@/components/games/MazeGameEngine'
import MazeGameV2Engine from '@/components/games/MazeGameV2Engine'
import { getMazeV2LevelNumber } from '@/lib/games/maze-v2-levels'
import FlashcardEngine from '@/components/games/FlashcardEngine'

function normalizeKey(value: any): string {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeTruth(value: any): string | null {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (['benar', 'true', '1', 'b'].includes(normalized)) return 'benar'
  if (['salah', 'false', '0', 's'].includes(normalized)) return 'salah'

  return null
}

function parseComplexAnswer(value: any): string[] {
  let parsed = value

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      parsed = parsed.split(',')
    }
  }

  if (!Array.isArray(parsed)) return []

  return [...new Set(parsed.map(normalizeKey).filter(Boolean))].sort()
}

function parseMatrixAnswer(value: any): Record<string, string> {
  let parsed = value

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return {}
    }
  }

  const result: Record<string, string> = {}

  if (Array.isArray(parsed)) {
    parsed.forEach((item, index) => {
      const normalized = normalizeTruth(item)
      if (normalized) result[String(index)] = normalized
    })
    return result
  }

  if (parsed && typeof parsed === 'object') {
    Object.entries(parsed).forEach(([key, item]) => {
      const normalized = normalizeTruth(item)
      if (normalized) result[String(key)] = normalized
    })
  }

  return result
}

function getMatrixOptionKey(item: any, index: number): string {
  if (
    item &&
    typeof item === 'object' &&
    item.id !== undefined &&
    item.id !== null
  ) {
    return String(item.id)
  }

  return String(item?._practiceKey ?? index)
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function PracticeContent() {
  const params = useParams()
  const examId = params?.id as string
  const router = useRouter()

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [skippedQuestionIds, setSkippedQuestionIds] = useState<string[]>([])
  const [isReviewingSkipped, setIsReviewingSkipped] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)

  const [userAnswer, setUserAnswer] = useState<any>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const [totalXpEarned, setTotalXpEarned] = useState(0)
  const [answerXpEarned, setAnswerXpEarned] = useState(0)
  const [streakCount, setStreakCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishSummary, setFinishSummary] = useState<any>(null)
  const [configurationError, setConfigurationError] = useState('')
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal')

  const finishStartedRef = useRef(false)
  const startAttemptPromiseRef = useRef<{
  examId: string;
  promise: Promise<{
    attemptId: string | null;
    error: unknown;
  }>;
} | null>(null);
  const streakXpRef = useRef(0)

  const checkAndUnlockBadges = async (
    currentXp: number,
    currentStreak: number
  ) => {
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

    const userBadges: string[] = Array.isArray(profile?.badges)
      ? profile.badges
      : []

    const newlyUnlocked: string[] = []

    if (!userBadges.includes('Langkah Pertama') && currentXp >= 10) {
      newlyUnlocked.push('Langkah Pertama')
    }

    if (!userBadges.includes('Raja Combo') && currentStreak >= 3) {
      newlyUnlocked.push('Raja Combo')
    }

    if (!userBadges.includes('Bintang Getasan') && currentXp >= 100) {
      newlyUnlocked.push('Bintang Getasan')
    }

    if (newlyUnlocked.length > 0) {
      await supabase
        .from('profiles')
        .update({ badges: [...userBadges, ...newlyUnlocked] })
        .eq('id', user.id)

      alert(`🎉 Kamu membuka lencana: ${newlyUnlocked.join(', ')}!`)
    }
  }

  useEffect(() => {
    let active = true

    async function loadQuestions() {
      if (!examId) return

      const supabase = createClient()

      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (examError || !examData) {
        alert('Modul latihan tidak ditemukan!')
        router.push('/practice')
        return
      }

      let questionQuery = supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)

      if (examData.activity_type === 'FLASHCARD') {
        questionQuery = questionQuery.eq('question_type', 'flashcard')
      } else if (examData.activity_type === 'MAZE_GAME_V2') {
        questionQuery = questionQuery.eq('question_type', 'maze_game_v2')
      } else if (examData.activity_type === 'MAZE_GAME') {
        questionQuery = questionQuery.eq('question_type', 'maze_game')
      } else {
        questionQuery = questionQuery.or(
          'question_type.is.null,question_type.in.(multiple_choice,complex_multiple_choice,true_false_matrix)'
        )
      }

      const { data: questionData, error: questionError } = await questionQuery

      if (questionError) {
        alert('Gagal memuat soal latihan.')
        router.push('/practice')
        return
      }

      const rawQuestions = questionData || []
      const loadedQuestions =
        examData.activity_type === 'MAZE_GAME_V2'
          ? [...rawQuestions].sort((a: any, b: any) =>
              getMazeV2LevelNumber(a) - getMazeV2LevelNumber(b)
            )
          : examData.activity_type === 'MAZE_GAME' || examData.activity_type === 'FLASHCARD'
            ? [...rawQuestions].sort((a: any, b: any) =>
                String(a.created_at || '').localeCompare(String(b.created_at || ''))
              )
          : (() => {
              const typeOrder = ['multiple_choice', 'complex_multiple_choice', 'true_false_matrix']
              return typeOrder.flatMap((type) => {
                const group = rawQuestions
                  .filter((question: any) => (question.question_type || 'multiple_choice') === type)
                  .map((question: any) => {
                    if (type === 'true_false_matrix') {
                      const rows = Array.isArray(question.options) ? question.options : []
                      return {
                        ...question,
                        options: shuffleArray(rows.map((item: any, index: number) =>
                          item && typeof item === 'object'
                            ? { ...item, _practiceKey: String(item.id ?? index) }
                            : { text: String(item ?? ''), _practiceKey: String(index) }
                        )),
                      }
                    }

                    const options = Array.isArray(question.options) ? question.options : []
                    return {
                      ...question,
                      options: shuffleArray(options.map((option: any, index: number) => {
                        const originalKey = String(option?.key ?? String.fromCharCode(65 + index))
                        return typeof option === 'string'
                          ? { key: originalKey, text: option }
                          : { ...option, key: originalKey }
                      })),
                    }
                  })
                return shuffleArray(group)
              })
            })()

      if (!active) return

      setExam(examData)
      setQuestions(loadedQuestions)

      if (
        examData.activity_type !== 'MAZE_GAME' &&
        examData.activity_type !== 'MAZE_GAME_V2' &&
        examData.activity_type !== 'FLASHCARD'
      ) {
        if (loadedQuestions.length === 0) {
          setConfigurationError('Modul ini belum memiliki soal PG, PG Kompleks, atau Matriks Benar/Salah untuk latihan otomatis.')
          setLoading(false)
          return
        }

        if (
  !startAttemptPromiseRef.current ||
  startAttemptPromiseRef.current.examId !== examId
) {
  const promise = Promise.resolve(
  supabase.rpc('start_practice_attempt', {
    p_exam_id: examId,
  })
)
  .then(({ data, error }) => {
    const attemptId =
      typeof data === 'string'
        ? data
        : data?.attempt_id ?? data?.id ?? null;

    return {
      attemptId,
      error,
    };
  })
  .catch((error: unknown) => ({
    attemptId: null,
    error,
  }));

  startAttemptPromiseRef.current = {
    examId,
    promise,
  };
}

const startResult =
  await startAttemptPromiseRef.current.promise;

if (startResult.error || !startResult.attemptId) {
  console.error(
    'Gagal memulai practice attempt:',
    startResult.error
  );

  if (active) {
    setConfigurationError(
      'Sesi latihan gagal dimulai. Silakan muat ulang halaman.'
    );
    setLoading(false);
  }

  return;
}

if (active) {
  setAttemptId(startResult.attemptId);
}
}
      if (active) setLoading(false)
    }

    loadQuestions()

    return () => {
      active = false
    }
  }, [examId, router])

  const currentQuestion = isReviewingSkipped
  ? questions.find((question) => question.id === skippedQuestionIds[reviewIndex])
  : questions[currentIndex]

const qType = currentQuestion?.question_type || 'multiple_choice'
  const questionPalettes = [
    { card: 'border-sky-200 bg-sky-100/80', option: 'border-sky-200 bg-sky-50/85 hover:border-sky-400 hover:bg-sky-100', accent: 'from-sky-400 to-blue-500' },
    { card: 'border-violet-200 bg-violet-100/80', option: 'border-violet-200 bg-violet-50/85 hover:border-violet-400 hover:bg-violet-100', accent: 'from-violet-400 to-fuchsia-500' },
    { card: 'border-amber-200 bg-amber-100/80', option: 'border-amber-200 bg-amber-50/85 hover:border-amber-400 hover:bg-amber-100', accent: 'from-amber-400 to-orange-500' },
    { card: 'border-emerald-200 bg-emerald-100/80', option: 'border-emerald-200 bg-emerald-50/85 hover:border-emerald-400 hover:bg-emerald-100', accent: 'from-emerald-400 to-teal-500' },
  ]
  const activePalette = questionPalettes[currentIndex % questionPalettes.length]
  const practiceFontSize = fontSize === 'small' ? 14 : fontSize === 'large' ? 19 : 16
  // Perkirakan panjang konten untuk membagi ruang antara soal dan jawaban.
  const plainTextLength = (value: any) =>
    String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\\[a-zA-Z]+/g, ' ').replace(/[${}]/g, ' ').replace(/\s+/g, ' ').trim().length

  const questionContentLength =
    plainTextLength(currentQuestion?.question_text) +
    (currentQuestion?.image_url ? 180 : 0)

  const answerContentLength = (() => {
    const options = Array.isArray(currentQuestion?.options) ? currentQuestion.options : []
    return options.reduce((total: number, option: any) => {
      const value = typeof option === 'string'
        ? option
        : option?.text ?? option?.title ?? option?.statement ?? ''
      return total + plainTextLength(value)
    }, 0)
  })()

  const bothSidesLong = questionContentLength >= 420 && answerContentLength >= 420
  const questionRatio = bothSidesLong
    ? 1
    : Math.min(1.55, Math.max(0.72, Math.sqrt(
        Math.max(questionContentLength, 100) / Math.max(answerContentLength, 100)
      )))
  const answerRatio = bothSidesLong ? 1 : 2 - questionRatio
  const practiceColumns = 'minmax(0, ' + questionRatio.toFixed(2) + 'fr) minmax(0, ' + answerRatio.toFixed(2) + 'fr)'

  const processXpAndStreak = (isUserRight: boolean) => {
    if (isAnswered) return
    
    setConfigurationError('')

    setIsAnswered(true)
    setIsCorrect(isUserRight)
    setAnsweredCount((previous) => previous + 1)

    if (isUserRight) {
      setCorrectCount((previous) => previous + 1)

      const newStreak = streakCount + 1
      setStreakCount(newStreak)

      const bonus =
        newStreak >= 10 ? 10 :
        newStreak >= 6 ? 8 :
        newStreak >= 4 ? 5 :
        newStreak >= 2 ? 2 : 0

      const answerXp = qType === 'multiple_choice' ? 10 : 15
      setAnswerXpEarned((previous) => previous + answerXp)
      streakXpRef.current += bonus
      setTotalXpEarned((previous) => previous + answerXp + bonus)

      checkAndUnlockBadges(totalXpEarned + answerXp + bonus, newStreak)
    } else {
      setStreakCount(0)
    }
  }

  const handleSingleChoiceSelect = (selectedOptKey: string) => {
    if (isAnswered || !currentQuestion) return

    setUserAnswer(selectedOptKey)

    const correctOpt = normalizeKey(
      currentQuestion.correct_option ??
      currentQuestion.correct_answer
    )

    if (!correctOpt) {
      setConfigurationError('Kunci jawaban pilihan ganda belum diatur.')
      return
    }

    processXpAndStreak(normalizeKey(selectedOptKey) === correctOpt)
  }

  const handleToggleComplexChoice = (optKey: string) => {
    if (isAnswered) return

    const currentList: string[] = Array.isArray(userAnswer)
      ? userAnswer
      : []

    if (currentList.includes(optKey)) {
      setUserAnswer(currentList.filter((key: string) => key !== optKey))
    } else {
      setUserAnswer([...currentList, optKey])
    }
  }

  const handleCheckComplexAnswer = () => {
    if (isAnswered || !currentQuestion) return

    const correctList = parseComplexAnswer(
      currentQuestion.correct_answers ??
      currentQuestion.correct_option
    )

    if (correctList.length === 0) {
      setConfigurationError(
        'Kunci PG kompleks belum valid. Gunakan array seperti ["A","C"].'
      )
      return
    }

    const userList = parseComplexAnswer(userAnswer)

    const isUserRight =
      userList.length === correctList.length &&
      userList.every((value, index) => value === correctList[index])

    setConfigurationError('')
    processXpAndStreak(isUserRight)
  }

  const handleSelectMatrixRow = (optionKey: string, value: string) => {
  if (isAnswered) return

  const currentMatrix =
    userAnswer && typeof userAnswer === 'object'
      ? { ...userAnswer }
      : {}

  currentMatrix[optionKey] = value
  setUserAnswer(currentMatrix)
}

const handleCheckMatrixAnswer = () => {
  if (isAnswered || !currentQuestion) return

  const options = Array.isArray(currentQuestion.options)
    ? currentQuestion.options
    : []

  if (options.length === 0) {
    setConfigurationError('Pernyataan matriks belum tersedia.')
    return
  }

  const correctMap = parseMatrixAnswer(
    currentQuestion.correct_answers ??
    currentQuestion.correct_answer
  )

  const missingKeys: { key: string; row: number }[] = options
  .map((item: any, index: number) => ({
    key: getMatrixOptionKey(item, index),
    row: index + 1,
  }))
  .filter(
    ({ key }: { key: string; row: number }) => !correctMap[key]
  )

  if (missingKeys.length > 0) {
    setConfigurationError(
      `Kunci matriks belum lengkap. Periksa baris: ${missingKeys
        .map(({ row }) => row)
        .join(', ')}.`
    )
    return
  }

  const allCorrect = options.every((item: any, index: number) => {
    const key = getMatrixOptionKey(item, index)
    const userValue = normalizeTruth(userAnswer?.[key])

    return userValue !== null && userValue === correctMap[key]
  })

  setConfigurationError('')
  processXpAndStreak(allCorrect)
}

  const handleNextQuestion = () => {
  if (isReviewingSkipped) {
    if (!currentQuestion?.id) return

    setSkippedQuestionIds((previous) =>
      previous.filter((id) => id !== currentQuestion.id)
    )
    setReviewIndex(0)
  } else if (currentIndex < questions.length - 1) {
    setCurrentIndex((previous) => previous + 1)
  } else if (skippedQuestionIds.length > 0) {
    setIsReviewingSkipped(true)
    setReviewIndex(0)
  } else {
    return
  }

  setIsAnswered(false)
  setUserAnswer(null)
  setIsCorrect(false)
  setConfigurationError('')
}

  const handleSkipQuestion = () => {
  if (isAnswered || !currentQuestion?.id) return

  setStreakCount(0)
  setUserAnswer(null)
  setIsCorrect(false)
  setConfigurationError('')

  if (!isReviewingSkipped) {
    const nextSkippedIds = [
      ...new Set([...skippedQuestionIds, currentQuestion.id]),
    ]

    setSkippedQuestionIds(nextSkippedIds)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1)
    } else {
      setIsReviewingSkipped(true)
      setReviewIndex(0)
    }

    return
  }

  // Saat putaran soal tertunda, pindahkan soal yang dilewati
  // ke urutan paling belakang jika masih ada soal tertunda lainnya.
  if (skippedQuestionIds.length > 1) {
  setSkippedQuestionIds((previous) => [
    ...previous.filter((id) => id !== currentQuestion.id),
    currentQuestion.id,
  ])
  setReviewIndex(0)
} else {
  setConfigurationError(
    'Soal ini masih tertunda. Kamu bisa mencoba menjawabnya atau memilih Selesai & Ambil XP.'
  )
}
}

  const handleFinishQuiz = async () => {
    if (!attemptId || finishStartedRef.current || isFinishing) return

    if (answeredCount < questions.length) {
      const shouldFinish = window.confirm(`Kamu baru menjawab ${answeredCount} dari ${questions.length} soal.\n\nSoal yang belum dijawab tidak mendapat XP. Akhiri dan kumpulkan sekarang?`)
      if (!shouldFinish) return
    }

    finishStartedRef.current = true
    setIsFinishing(true)

    const supabase = createClient()

    const { data, error } = await supabase.rpc(
      'finish_practice_attempt',
      {
        p_attempt_id: attemptId,
        p_answered_count: answeredCount,
        p_correct_count: correctCount,
        p_streak_xp: streakXpRef.current,
        p_answer_xp: answerXpEarned,
      }
    )

    if (error) {
      console.error('Gagal menyimpan hasil:', error)
      alert('Hasil belum berhasil disimpan. Silakan coba lagi.')
      finishStartedRef.current = false
      setIsFinishing(false)
      return
    }

    setFinishSummary(data)
    setIsFinishing(false)
  }

  const comboMessages: Record<number, string> = {
    2: 'Mantap! Teruskan! 🔥',
    3: 'Hebat! Kamu mulai panas! ⚡',
    4: 'Luar biasa! Pertahankan! 🚀',
    5: 'Amazing! Kamu hebat sekali! 🌟',
    6: 'Super! Konsentrasimu luar biasa! 💪',
    7: 'Fantastis! Jangan berhenti! 🏆',
    8: 'Wow! Kamu sedang bersinar! ✨',
    9: 'Hampir sempurna! Ayo lanjut! 🔥',
    10: 'LEGENDARIS! 10 COMBO! 👑',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="font-semibold text-sm">Memuat latihan...</p>
      </div>
    )
  }

  if (exam?.activity_type === 'MAZE_GAME_V2') {
    return <MazeGameV2Engine exam={exam} questions={questions} />
  }

  if (exam?.activity_type === 'MAZE_GAME') {
    return <MazeGameEngine exam={exam} questions={questions} />
  }

  if (exam?.activity_type === 'FLASHCARD') {
    return <FlashcardEngine exam={exam} questions={questions} />
  }

  if (configurationError && !currentQuestion) {
    return <div className="p-8">{configurationError}</div>
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{configurationError || 'Soal tidak tersedia.'}</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] bg-[radial-gradient(ellipse_at_top_left,_rgba(56,189,248,0.25),_transparent_38%),radial-gradient(ellipse_at_bottom_right,_rgba(251,191,36,0.20),_transparent_38%),linear-gradient(135deg,#101b4b_0%,#31206b_48%,#123d69_100%)] flex flex-col font-sans">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-80 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <header className="sticky top-0 z-20 border-b border-white/15 bg-gradient-to-r from-indigo-950/95 via-violet-900/95 to-blue-900/95 px-2 py-1.5 text-white shadow-lg backdrop-blur-xl sm:px-4">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/practice"
            aria-label="Keluar dari latihan"
            className="shrink-0 rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 text-[10px] font-extrabold text-white shadow-inner transition hover:bg-white/20 sm:px-3 sm:text-xs"
          >
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">← Keluar</span>
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xs font-extrabold leading-tight sm:text-sm">{exam?.title}</h1>
          </div>

          {streakCount >= 2 && (
            <div className="flex min-w-0 shrink items-center gap-1 overflow-hidden text-amber-200">
              <span className="shrink-0 text-[11px] font-black sm:text-xs">🔥 x{streakCount}</span>
              <span className="max-w-[76px] truncate text-[9px] font-semibold sm:max-w-[190px] sm:text-[10px]">
                {comboMessages[streakCount] ||
                  (streakCount > 10 ? 'GILA KEREN! COMBO TERUS! 🎉' : '')}
              </span>
            </div>
          )}

          <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200/25 bg-amber-300/10 px-2 py-1 text-[11px] font-black text-amber-300 shadow-inner sm:px-3 sm:text-sm">
            ⭐ +{totalXpEarned} XP
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-2 py-3 pb-24 sm:px-4 sm:py-4 sm:pb-28 lg:px-6">
        <div className="rounded-2xl border border-white/25 bg-white/85 p-3 shadow-xl shadow-black/20 backdrop-blur-xl sm:rounded-3xl sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-gradient-to-r from-white/90 via-sky-50/90 to-violet-50/90 px-3 py-2.5 shadow-inner backdrop-blur-md">
            <div>
              <span className="font-bold text-slate-800 text-xs">
              {isReviewingSkipped
                ? `Soal Tertunda ${reviewIndex + 1} dari ${skippedQuestionIds.length}`
                : `Soal ${currentIndex + 1} dari ${questions.length}`}              
              </span>
              <span className="ml-2 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-extrabold text-violet-800">
                {qType === 'multiple_choice' ? 'PILIHAN GANDA' : qType === 'complex_multiple_choice' ? 'PG KOMPLEKS' : 'BENAR / SALAH'}
              </span>
            </div>

            <span className="text-xs font-bold text-slate-600">
              Benar: {correctCount} · Dijawab: {answeredCount}/{questions.length}
            </span>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1" aria-label="Ukuran teks soal">
              <span className="mr-1 text-[10px] font-bold text-slate-500">Teks</span>
              <button type="button" onClick={() => setFontSize("small")} aria-pressed={fontSize === "small"} className={`rounded-md px-2 py-1 text-xs font-black ${fontSize === "small" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>A−</button>
              <button type="button" onClick={() => setFontSize("normal")} aria-pressed={fontSize === "normal"} className={`rounded-md px-2 py-1 text-xs font-black ${fontSize === "normal" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>A</button>
              <button type="button" onClick={() => setFontSize("large")} aria-pressed={fontSize === "large"} className={`rounded-md px-2 py-1 text-sm font-black ${fontSize === "large" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>A+</button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>🚀 Perjalanan latihan</span>
              <span>{Math.round((answeredCount / Math.max(questions.length, 1)) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all duration-500" style={{ width: `${Math.min(100, (answeredCount / Math.max(questions.length, 1)) * 100)}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-500">
              <span>⭐ PG benar: +10 XP</span><span>💎 PG Kompleks/Matriks benar: +15 XP</span>
            </div>
          </div>

          <div
            className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[var(--practice-columns)] lg:gap-5"
            style={{ "--practice-columns": practiceColumns } as React.CSSProperties}
          >
            <section className="min-w-0 lg:max-h-[68vh] lg:overflow-y-auto lg:overscroll-contain rounded-2xl pr-1">
          <div className={`relative overflow-hidden rounded-2xl border-2 p-3.5 font-extrabold leading-relaxed text-slate-900 shadow-md shadow-indigo-950/5 backdrop-blur-md sm:p-5 ${activePalette.card}`}
            style={{ fontSize: practiceFontSize + 1 }}>
            <div aria-hidden="true" className={`absolute -right-5 -top-7 h-28 w-28 rounded-full bg-gradient-to-br ${activePalette.accent} opacity-15 blur-xl`} />
            <div className="relative z-10 mb-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-black tracking-widest text-slate-600 shadow-sm">⚡ TANTANGAN {currentIndex + 1}</span>
              <span className="text-xl drop-shadow-sm">✨</span>
            </div>
            <div className="relative z-10">
            <MathRenderer content={currentQuestion.question_text || ''} />
            </div>
          </div>

          {currentQuestion.image_url && (
            <img
              src={currentQuestion.image_url}
              alt="Gambar soal"
              className="mx-auto max-h-56 w-auto rounded-xl border-2 border-white object-contain shadow-md sm:max-h-64"
            />
          )}

            </section>

            <section className="min-w-0 lg:max-h-[68vh] lg:overflow-y-auto lg:overscroll-contain rounded-2xl pr-1">
          {qType === 'multiple_choice' &&
            Array.isArray(currentQuestion.options) && (
              <div className="space-y-2">
                {currentQuestion.options.map((opt: any, index: number) => {
                  const key = String(
                    opt?.key || String.fromCharCode(65 + index)
                  )
                  const correctKey = normalizeKey(
                    currentQuestion.correct_option ??
                    currentQuestion.correct_answer
                  )

                  const selected = userAnswer === key
                  const correct = normalizeKey(key) === correctKey

                  let style =
                    `${questionPalettes[index % questionPalettes.length].option} text-slate-800 shadow-sm`

                  if (isAnswered && correct) {
                    style =
                      'border-emerald-500 bg-emerald-50 text-emerald-900'
                  } else if (isAnswered && selected && !correct) {
                    style =
                      'border-rose-500 bg-rose-50 text-rose-900'
                  }

                  return (
                    <button
                      key={key}
                      disabled={isAnswered}
                      onClick={() => handleSingleChoiceSelect(key)}
                      className={`w-full rounded-xl border-2 px-3 py-2.5 text-left leading-relaxed transition-all duration-150 sm:px-4 sm:py-3 ${style} hover:shadow-md`}
                      style={{ fontSize: practiceFontSize }}
                    >
                      <MathRenderer
                        content={
                          typeof opt === 'string'
                            ? opt
                            : opt.text || opt.title || ''
                        }
                      />
                    </button>
                  )
                })}
              </div>
            )}

          {qType === 'complex_multiple_choice' &&
            Array.isArray(currentQuestion.options) && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt: any, index: number) => {
                  const key = String(
                    opt?.key || String.fromCharCode(65 + index)
                  )
                  const checked =
                    Array.isArray(userAnswer) && userAnswer.includes(key)

                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3 py-2.5 leading-relaxed text-slate-800 shadow-sm transition hover:shadow-md sm:px-4 sm:py-3 ${questionPalettes[index % questionPalettes.length].option}`}
                      style={{ fontSize: practiceFontSize }}
                    >
                      <input
                        type="checkbox"
                        disabled={isAnswered}
                        checked={checked}
                        onChange={() => handleToggleComplexChoice(key)}
                      />
                      <span className="font-semibold leading-relaxed">
                        <MathRenderer
                          content={
                            typeof opt === 'string'
                              ? opt
                              : opt.text || opt.title || ''
                          }
                        />
                      </span>
                    </label>
                  )
                })}

              </div>
            )}

          {qType === 'true_false_matrix' &&
  Array.isArray(currentQuestion.options) && (
    <div className="overflow-hidden rounded-2xl border-2 border-white/80 bg-white/80 shadow-lg backdrop-blur-md">
      <table className="w-full text-xs sm:text-sm" style={{ fontSize: practiceFontSize - 1 }}>
        <thead className="bg-indigo-100 text-indigo-950">
          <tr>
            <th className="p-2 text-left sm:p-3">Pernyataan</th>
            <th className="p-2 sm:p-3">Benar</th>
            <th className="p-2 sm:p-3">Salah</th>
          </tr>
        </thead>

        <tbody>
          {currentQuestion.options.map((item: any, index: number) => {
            const optionKey = getMatrixOptionKey(item, index)

            const text =
              typeof item === 'string'
                ? item
                : item.text ||
                  item.statement ||
                  `Pernyataan ${index + 1}`

            const selected = userAnswer?.[optionKey]

            return (
              <tr key={optionKey} className={`border-t-2 border-white ${questionPalettes[index % questionPalettes.length].option.split(' ')[1]}`}>
                <td className="px-2.5 py-2.5 leading-relaxed sm:px-3 sm:py-3">
                  <MathRenderer content={text} />
                </td>

                <td className="p-2 text-center sm:p-3">
                  <button
                    disabled={isAnswered}
                    onClick={() =>
                      handleSelectMatrixRow(optionKey, 'Benar')
                    }
                    className={`rounded-lg sm:rounded-xl border-2 px-2.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold transition ${
                      selected === 'Benar'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    Benar
                  </button>
                </td>

                <td className="p-3 text-center">
                  <button
                    disabled={isAnswered}
                    onClick={() =>
                      handleSelectMatrixRow(optionKey, 'Salah')
                    }
                    className={`rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${
                      selected === 'Salah'
                        ? 'border-rose-600 bg-rose-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-rose-50'
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
  )}

              <div className="sticky bottom-0 z-20 mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white/95 pt-3 pb-1 backdrop-blur-xl">
                {!isAnswered && qType === 'complex_multiple_choice' && (
                  <button type="button" onClick={handleCheckComplexAnswer} disabled={!Array.isArray(userAnswer) || userAnswer.length === 0} className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40">
                    ☑ Periksa Jawaban
                  </button>
                )}
                {!isAnswered && qType === 'true_false_matrix' && (
                  <button type="button" onClick={handleCheckMatrixAnswer} disabled={!userAnswer || Object.keys(userAnswer).length === 0} className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40">
                    📊 Periksa Jawaban
                  </button>
                )}
                {!isAnswered && (
                  <button onClick={handleSkipQuestion} className="min-h-11 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50">
                    {isReviewingSkipped ? 'Lewati Kembali' : '⏭️ Lewati Soal'}
                  </button>
                )}
                {isAnswered && !isReviewingSkipped && currentIndex < questions.length - 1 && (
                  <button onClick={handleNextQuestion} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white text-white shadow-md transition hover:bg-blue-700">
                    Soal Selanjutnya →
                  </button>
                )}
                {isAnswered && !isReviewingSkipped && currentIndex === questions.length - 1 && skippedQuestionIds.length > 0 && (
                  <button onClick={handleNextQuestion} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-blue-700">
                    Lihat Soal Tertunda →
                  </button>
                )}
                {isAnswered && isReviewingSkipped && skippedQuestionIds.length > 1 && (
                  <button onClick={handleNextQuestion} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-blue-700">
                    Soal Tertunda Berikutnya →
                  </button>
                )}
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 z-30 -mx-3 flex justify-end border-y border-indigo-100 bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:-mx-5 sm:px-5">
            <button
              onClick={handleFinishQuiz}
              disabled={isFinishing || !attemptId}
              className="min-h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-200 transition hover:from-emerald-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {isFinishing ? 'Menyimpan...' : '🏆 Akhiri & Kumpulkan XP'}
            </button>
          </div>

          {configurationError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              {configurationError}
            </div>
          )}

          {isAnswered && (
            <div
              className={`rounded-xl border-2 p-3.5 text-sm leading-relaxed shadow-md space-y-2 ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <strong>
                {isCorrect ? '🎉 Jawaban benar!' : '❌ Jawaban belum tepat.'}
              </strong>

              <div className="border-t border-current/15 pt-2">
                <strong>Kunci jawaban:</strong>
                <div className="mt-1 font-semibold">
                  {qType === "multiple_choice" ? (() => {
                    const key = normalizeKey(currentQuestion.correct_option ?? currentQuestion.correct_answer)
                    const option = (Array.isArray(currentQuestion.options) ? currentQuestion.options : []).find((item: any, index: number) => normalizeKey(item?.key ?? String.fromCharCode(65 + index)) === key)
                    return `${key}. ${typeof option === "string" ? option : option?.text ?? option?.title ?? key}`
                  })() : qType === "complex_multiple_choice" ? parseComplexAnswer(currentQuestion.correct_answers ?? currentQuestion.correct_option).join(", ") : (() => {
                    const map = parseMatrixAnswer(currentQuestion.correct_answers ?? currentQuestion.correct_answer)
                    return (Array.isArray(currentQuestion.options) ? currentQuestion.options : []).map((item: any, index: number) => {
                      const key = getMatrixOptionKey(item, index)
                      const label = typeof item === "string" ? item : item.text ?? item.statement ?? `Pernyataan ${index + 1}`
                      return `${index + 1}. ${label}: ${map[key] === "benar" ? "Benar" : "Salah"}`
                    }).join(" · ")
                  })()}
                </div>
              </div>

              {(currentQuestion.explanation ||
                currentQuestion.pembahasan) && (
                <div className="pt-2 border-t">
                  <strong>Pembahasan:</strong>
                  <MathRenderer
                    content={
                      currentQuestion.explanation ||
                      currentQuestion.pembahasan
                    }
                  />
                </div>
              )}
            </div>
          )}


        </div>
      </main>

      {finishSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border-4 border-white bg-gradient-to-br from-white to-amber-50 p-7 text-center text-slate-900 shadow-2xl">
            <div className="text-4xl">🏆</div>
            <h2 className="mt-3 text-xl font-extrabold">Latihan Selesai!</h2>

            <p className="mt-4 text-4xl font-black text-indigo-600">
              {finishSummary.score ?? 0}
            </p>
            <p className="text-xs font-bold text-slate-500">NILAI AKHIR</p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-slate-500">Jawaban benar</p>
                <p className="text-xl font-extrabold">
                  {finishSummary.correct_count ?? correctCount}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-amber-700">Total XP</p>
                <p className="text-xl font-extrabold text-amber-600">
                  +{finishSummary.total_xp ?? 0}
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/practice')}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white"
            >
              Kembali ke Latihan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InteractivePracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          Memuat Lembar Latihan Interaktif...
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  )
}
