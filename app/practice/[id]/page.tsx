
'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'
import MazeGameEngine from '@/components/games/MazeGameEngine'
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

  return String(index)
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
  const [streakCount, setStreakCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishSummary, setFinishSummary] = useState<any>(null)
  const [configurationError, setConfigurationError] = useState('')
  const [isSavingAndExit, setIsSavingAndExit] = useState(false)
  const [isResumedSession, setIsResumedSession] = useState(false)

  const progressRef = useRef<any>({
    currentIndex: 0,
    skippedQuestionIds: [],
    isReviewingSkipped: false,
    reviewIndex: 0,
    userAnswer: null,
    isAnswered: false,
    isCorrect: false,
    streakCount: 0,
    answeredCount: 0,
    correctCount: 0,
    totalXpEarned: 0,
    streakXp: 0,
    answers: {},
  })
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

      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true })

      if (questionError) {
        alert('Gagal memuat soal latihan.')
        router.push('/practice')
        return
      }

      const loadedQuestions = questionData || []

      if (!active) return

      setExam(examData)
      setQuestions(loadedQuestions)

      if (
        examData.activity_type !== 'MAZE_GAME' &&
        examData.activity_type !== 'MAZE_GAME_V2' &&
        examData.activity_type !== 'FLASHCARD'
      ) {
        if (loadedQuestions.length === 0) {
          setConfigurationError('Modul ini belum memiliki soal.')
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
      progress: data?.progress ?? {},
      resumed: Boolean(data?.resumed),
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
  const savedProgress = startResult.progress || {}
  const restored = {
    currentIndex: Number(savedProgress.currentIndex || 0),
    skippedQuestionIds: Array.isArray(savedProgress.skippedQuestionIds)
      ? savedProgress.skippedQuestionIds
      : [],
    isReviewingSkipped: Boolean(savedProgress.isReviewingSkipped),
    reviewIndex: Number(savedProgress.reviewIndex || 0),
    userAnswer: savedProgress.userAnswer ?? null,
    isAnswered: Boolean(savedProgress.isAnswered),
    isCorrect: Boolean(savedProgress.isCorrect),
    streakCount: Number(savedProgress.streakCount || 0),
    answeredCount: Number(savedProgress.answeredCount || 0),
    correctCount: Number(savedProgress.correctCount || 0),
    totalXpEarned: Number(savedProgress.totalXpEarned || 0),
    streakXp: Number(savedProgress.streakXp || 0),
    answers: savedProgress.answers && typeof savedProgress.answers === 'object'
      ? savedProgress.answers
      : {},
  }

  progressRef.current = restored
  setCurrentIndex(Math.min(restored.currentIndex, Math.max(0, loadedQuestions.length - 1)))
  setSkippedQuestionIds(restored.skippedQuestionIds)
  setIsReviewingSkipped(restored.isReviewingSkipped)
  setReviewIndex(restored.reviewIndex)
  setUserAnswer(restored.userAnswer)
  setIsAnswered(restored.isAnswered)
  setIsCorrect(restored.isCorrect)
  setStreakCount(restored.streakCount)
  setAnsweredCount(restored.answeredCount)
  setCorrectCount(restored.correctCount)
  setTotalXpEarned(restored.totalXpEarned)
  streakXpRef.current = restored.streakXp
  setAttemptId(startResult.attemptId)
  setIsResumedSession(startResult.resumed)
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

  const persistAttemptProgress = async (nextProgress?: any) => {
    const progress = nextProgress || progressRef.current
    if (!attemptId) return false

    const { error } = await createClient().rpc(
      'save_practice_attempt_progress',
      {
        p_attempt_id: attemptId,
        p_progress: progress,
        p_answered_count: Number(progress.answeredCount || 0),
        p_correct_count: Number(progress.correctCount || 0),
        p_answer_xp: Number(progress.correctCount || 0) * 10,
        p_streak_xp: Number(progress.streakXp || 0),
      }
    )

    if (error) {
      console.error('Gagal menyimpan progres latihan:', error)
      return false
    }
    return true
  }

  const processXpAndStreak = (isUserRight: boolean, answerValue: any = userAnswer) => {
    if (isAnswered || !currentQuestion?.id) return

    setConfigurationError('')

    const nextAnsweredCount = answeredCount + 1
    const nextCorrectCount = correctCount + (isUserRight ? 1 : 0)
    const newStreak = isUserRight ? streakCount + 1 : 0
    const bonus = isUserRight
      ? newStreak >= 10 ? 10
        : newStreak >= 6 ? 8
        : newStreak >= 4 ? 5
        : newStreak >= 2 ? 2 : 0
      : 0
    const nextStreakXp = streakXpRef.current + bonus
    const nextTotalXp = totalXpEarned + (isUserRight ? 10 + bonus : 0)

    setIsAnswered(true)
    setIsCorrect(isUserRight)
    setAnsweredCount(nextAnsweredCount)
    setCorrectCount(nextCorrectCount)
    setStreakCount(newStreak)
    streakXpRef.current = nextStreakXp
    setTotalXpEarned(nextTotalXp)

    if (isUserRight) {
      checkAndUnlockBadges(nextTotalXp, newStreak)
    }

    const nextProgress = {
      ...progressRef.current,
      currentIndex,
      skippedQuestionIds,
      isReviewingSkipped,
      reviewIndex,
      userAnswer: answerValue,
      isAnswered: true,
      isCorrect: isUserRight,
      streakCount: newStreak,
      answeredCount: nextAnsweredCount,
      correctCount: nextCorrectCount,
      totalXpEarned: nextTotalXp,
      streakXp: nextStreakXp,
      answers: {
        ...(progressRef.current.answers || {}),
        [String(currentQuestion.id)]: {
          answer: answerValue,
          isCorrect: isUserRight,
        },
      },
    }
    progressRef.current = nextProgress
    void persistAttemptProgress(nextProgress)
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

    processXpAndStreak(normalizeKey(selectedOptKey) === correctOpt, selectedOptKey)
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
    processXpAndStreak(isUserRight, userList)
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
  processXpAndStreak(allCorrect, userAnswer)
}

  const handleCheckFillInAnswer = () => {
    if (isAnswered || !currentQuestion) return

    const userText = String(userAnswer || '').trim().toLowerCase()
    const targetText = String(
      currentQuestion.correct_option ??
      currentQuestion.correct_answer ??
      ''
    ).trim().toLowerCase()

    if (!targetText) {
      setConfigurationError('Kunci jawaban isian belum diatur.')
      return
    }

    processXpAndStreak(userText === targetText, userAnswer)
  }

  const handleSubmitEssayAnswer = () => {
    if (isAnswered || !currentQuestion) return

    // Sesuai perilaku lama: essay mendapatkan XP berbasis usaha.
    processXpAndStreak(true, userAnswer)
  }

  const handleNextQuestion = () => {
  let nextCurrentIndex = currentIndex
  let nextSkippedIds = skippedQuestionIds
  let nextReviewingSkipped = isReviewingSkipped
  let nextReviewIndex = reviewIndex

  if (isReviewingSkipped) {
    if (!currentQuestion?.id) return

    nextSkippedIds = skippedQuestionIds.filter((id) => id !== currentQuestion.id)
    nextReviewIndex = 0
    setSkippedQuestionIds(nextSkippedIds)
    setReviewIndex(0)
  } else if (currentIndex < questions.length - 1) {
    nextCurrentIndex = currentIndex + 1
    setCurrentIndex(nextCurrentIndex)
  } else if (skippedQuestionIds.length > 0) {
    nextReviewingSkipped = true
    nextReviewIndex = 0
    setIsReviewingSkipped(true)
    setReviewIndex(0)
  } else {
    return
  }

  setIsAnswered(false)
  setUserAnswer(null)
  setIsCorrect(false)
  setConfigurationError('')

  const nextProgress = {
    ...progressRef.current,
    currentIndex: nextCurrentIndex,
    skippedQuestionIds: nextSkippedIds,
    isReviewingSkipped: nextReviewingSkipped,
    reviewIndex: nextReviewIndex,
    userAnswer: null,
    isAnswered: false,
    isCorrect: false,
  }
  progressRef.current = nextProgress
  void persistAttemptProgress(nextProgress)
}

  const handleSkipQuestion = () => {
  if (isAnswered || !currentQuestion?.id) return

  let nextCurrentIndex = currentIndex
  let nextSkippedIds = skippedQuestionIds
  let nextReviewingSkipped = isReviewingSkipped
  let nextReviewIndex = reviewIndex

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
      nextCurrentIndex = currentIndex + 1
      setCurrentIndex(nextCurrentIndex)
    } else {
      nextReviewingSkipped = true
      nextReviewIndex = 0
      setIsReviewingSkipped(true)
      setReviewIndex(0)
    }

    const nextProgress = {
      ...progressRef.current,
      currentIndex: nextCurrentIndex,
      skippedQuestionIds: nextSkippedIds,
      isReviewingSkipped: nextReviewingSkipped,
      reviewIndex: nextReviewIndex,
      streakCount: 0,
      userAnswer: null,
      isAnswered: false,
      isCorrect: false,
    }
    progressRef.current = nextProgress
    void persistAttemptProgress(nextProgress)
    return
  }

  // Saat putaran soal tertunda, pindahkan soal yang dilewati
  // ke urutan paling belakang jika masih ada soal tertunda lainnya.
  if (skippedQuestionIds.length > 1) {
  nextSkippedIds = [
    ...skippedQuestionIds.filter((id) => id !== currentQuestion.id),
    currentQuestion.id,
  ]
  nextReviewIndex = 0
  setSkippedQuestionIds(nextSkippedIds)
  setReviewIndex(0)
  const nextProgress = {
    ...progressRef.current,
    skippedQuestionIds: nextSkippedIds,
    reviewIndex: 0,
    streakCount: 0,
    userAnswer: null,
    isAnswered: false,
    isCorrect: false,
  }
  progressRef.current = nextProgress
  void persistAttemptProgress(nextProgress)
} else {
  setConfigurationError(
    'Soal ini masih tertunda. Kamu bisa mencoba menjawabnya atau memilih Selesai & Ambil XP.'
  )
}
}

  const handleSaveAndExit = async () => {
    if (!attemptId || isSavingAndExit || isFinishing) {
      if (!attemptId) router.push('/practice')
      return
    }

    setIsSavingAndExit(true)
    const saved = await persistAttemptProgress(progressRef.current)
    setIsSavingAndExit(false)

    if (!saved) {
      alert('Progres belum berhasil disimpan. Periksa koneksi lalu coba lagi.')
      return
    }

    router.push('/practice')
  }

  const handleFinishQuiz = async () => {
    if (!attemptId || finishStartedRef.current || isFinishing) return

    finishStartedRef.current = true
    setIsFinishing(true)

    const saved = await persistAttemptProgress(progressRef.current)
    if (!saved) {
      alert('Progres belum berhasil disimpan. Silakan coba lagi.')
      finishStartedRef.current = false
      setIsFinishing(false)
      return
    }

    const supabase = createClient()

    const { data, error } = await supabase.rpc(
      'finish_practice_attempt',
      {
        p_attempt_id: attemptId,
        p_answered_count: answeredCount,
        p_correct_count: correctCount,
        p_streak_xp: streakXpRef.current,
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      <header className="bg-slate-900 text-white px-6 py-3.5 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleSaveAndExit}
            disabled={isSavingAndExit || isFinishing}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
          >
            {isSavingAndExit ? 'Menyimpan...' : '💾 Simpan & Keluar'}
          </button>

          <div>
            <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded font-bold">
              MODE LATIHAN MANDIRI
            </span>
            <h1 className="text-sm font-bold mt-1">{exam?.title}</h1>
          </div>
        </div>

        <div className="text-right">
          {streakCount >= 2 && (
            <div className="text-amber-300 text-xs font-black animate-pulse">
              🔥 Combo x{streakCount}!
            </div>
          )}

          {streakCount >= 2 && (
            <div className="text-amber-200 text-[10px] mt-1">
              {comboMessages[streakCount] ||
                (streakCount > 10
                  ? 'GILA KEREN! COMBO TERUS! 🎉'
                  : '')}
            </div>
          )}

          <div className="text-amber-400 font-mono font-bold">
            ⭐ +{totalXpEarned} XP
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
          {isResumedSession && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              Sesi sebelumnya dipulihkan. Lanjutkan dari progres terakhir.
            </div>
          )}

          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <span className="font-bold text-slate-800 text-xs">
              {isReviewingSkipped
                ? `Soal Tertunda ${reviewIndex + 1} dari ${skippedQuestionIds.length}`
                : `Soal ${currentIndex + 1} dari ${questions.length}`}              
              </span>
              <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">
                {qType}
              </span>
            </div>

            <span className="text-xs text-slate-500 font-semibold">
              Benar: {correctCount} / {answeredCount} dijawab
            </span>
          </div>

          <div className="text-slate-900 text-sm font-semibold leading-relaxed">
            <MathRenderer content={currentQuestion.question_text || ''} />
          </div>

          {currentQuestion.image_url && (
            <img
              src={currentQuestion.image_url}
              alt="Gambar soal"
              className="max-h-56 rounded-xl border"
            />
          )}

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
                    'border-slate-200 hover:bg-slate-50 text-slate-800'

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
                      className={`w-full text-left p-3.5 rounded-xl border text-xs ${style}`}
                    >
                      <span className="font-bold mr-3">{key}.</span>
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
                      className="flex items-center gap-3 border rounded-xl p-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        disabled={isAnswered}
                        checked={checked}
                        onChange={() => handleToggleComplexChoice(key)}
                      />
                      <span className="text-sm font-semibold">
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

                {!isAnswered && (
                  <button
                    onClick={handleCheckComplexAnswer}
                    className="w-full py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl"
                  >
                    ☑️ Cek Jawaban PG Kompleks
                  </button>
                )}
              </div>
            )}

          {qType === 'true_false_matrix' &&
  Array.isArray(currentQuestion.options) && (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3 text-left">Pernyataan</th>
            <th className="p-3">Benar</th>
            <th className="p-3">Salah</th>
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
              <tr key={optionKey} className="border-t">
                <td className="p-3">
                  <MathRenderer content={text} />
                </td>

                <td className="p-3 text-center">
                  <button
                    disabled={isAnswered}
                    onClick={() =>
                      handleSelectMatrixRow(optionKey, 'Benar')
                    }
                    className={`px-3 py-1 rounded border ${
                      selected === 'Benar'
                        ? 'bg-emerald-600 text-white'
                        : ''
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
                    className={`px-3 py-1 rounded border ${
                      selected === 'Salah'
                        ? 'bg-rose-600 text-white'
                        : ''
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

      {!isAnswered && (
        <button
          onClick={handleCheckMatrixAnswer}
          className="w-full py-2.5 bg-indigo-600 text-white font-bold"
        >
          📊 Periksa Jawaban Matriks
        </button>
      )}
    </div>
  )}

          {qType === 'fill_in' && (
            <div className="space-y-3">
              <input
                type="text"
                disabled={isAnswered}
                value={userAnswer || ''}
                onChange={(event) => setUserAnswer(event.target.value)}
                placeholder="Ketik jawaban di sini..."
                className="w-full p-3 border rounded-xl text-sm"
              />

              {!isAnswered && (
                <button
                  onClick={handleCheckFillInAnswer}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl"
                >
                  Cek Jawaban
                </button>
              )}
            </div>
          )}

          {qType === 'essay' && (
            <div className="space-y-3">
              <textarea
                rows={4}
                disabled={isAnswered}
                value={userAnswer || ''}
                onChange={(event) => setUserAnswer(event.target.value)}
                placeholder="Tuliskan jawaban lengkap..."
                className="w-full p-3 border rounded-xl text-sm"
              />

              {!isAnswered && (
                <button
                  onClick={handleSubmitEssayAnswer}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl"
                >
                  Kirim Jawaban
                </button>
              )}
            </div>
          )}

          {configurationError && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              {configurationError}
            </div>
          )}

          {isAnswered && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <strong>
                {isCorrect ? '🎉 Jawaban benar!' : '❌ Jawaban belum tepat.'}
              </strong>

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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
  <button
    type="button"
    onClick={handleSaveAndExit}
    disabled={isSavingAndExit || isFinishing}
    className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
  >
    {isSavingAndExit ? 'Menyimpan progres...' : '💾 Simpan & Keluar'}
  </button>
  {!isAnswered && (
    <button
      onClick={handleSkipQuestion}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
    >
      {isReviewingSkipped ? 'Lewati Kembali' : 'Lewati Soal'}
    </button>
  )}

  {isReviewingSkipped && (
    <button
      onClick={handleFinishQuiz}
      disabled={isFinishing || !attemptId}
      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
    >
      {isFinishing ? 'Menyimpan...' : '🏆 Selesai & Ambil XP'}
    </button>
  )}

  {isAnswered && !isReviewingSkipped && currentIndex < questions.length - 1 && (
    <button
      onClick={handleNextQuestion}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
    >
      Soal Selanjutnya →
    </button>
  )}

  {isAnswered && !isReviewingSkipped && currentIndex === questions.length - 1 && (
    skippedQuestionIds.length > 0 ? (
      <button
        onClick={handleNextQuestion}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Lihat Soal Tertunda →
      </button>
    ) : (
      <button
        onClick={handleFinishQuiz}
        disabled={isFinishing || !attemptId}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isFinishing ? 'Menyimpan...' : '🏆 Selesai & Ambil XP'}
      </button>
    )
  )}

  {isAnswered && isReviewingSkipped && skippedQuestionIds.length > 1 && (
    <button
      onClick={handleNextQuestion}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
    >
      Soal Tertunda Berikutnya →
    </button>
  )}
</div>
        </div>
      </main>

      {finishSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center text-slate-900">
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
