'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'
import { triggerVictoryConfetti } from '@/lib/confetti'

export function checkQuestionAccuracy(q: any, userAns: any) {
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

function ExamContent() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null)

  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({})
  const [flagged, setFlagged] = useState<{ [key: string]: boolean }>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const [fontSizeClass, setFontSizeClass] = useState<'text-xs' | 'text-sm' | 'text-base' | 'text-lg'>('text-sm')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Helper Acak Array
  const shuffleArray = (array: any[]) => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  useEffect(() => {
    if (!examId) return

    async function loadExamDataAndCreateSession() {
      const supabase = createClient()

      // 1. Ambil data User secara pasti
      let activeUser = null
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        activeUser = userData.user
      } else {
        const { data: sessionData } = await supabase.auth.getSession()
        activeUser = sessionData?.session?.user || null
      }

      if (!activeUser) {
        router.push('/login')
        return
      }

      // 2. Ambil Data Ujian dan Soal
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true })

      if (examData && questionData) {
        setExam(examData)

        let processedQuestions = [...questionData]

        if (examData.shuffle_questions) {
          processedQuestions = shuffleArray(processedQuestions)
        }

        if (examData.shuffle_options) {
          processedQuestions = processedQuestions.map((q) => {
            if (Array.isArray(q.options) && q.options.length > 0) {
              return {
                ...q,
                options: shuffleArray(q.options),
              }
            }
            return q
          })
        }

        setQuestions(processedQuestions)

        const totalDurationSeconds = (examData.duration_minutes || 15) * 60
        let activeSessionId: string | null = null

        // 🟢 3. MANAJEMEN SESI UJIAN & SISA WAKTU (MENCEGAH TERJEBAK DI SESI LAMA)
        const { data: existingSession } = await supabase
          .from('exam_sessions')
          .select('id, start_time')
          .eq('exam_id', examId)
          .eq('user_id', activeUser.id)
          .eq('status', 'ongoing')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingSession && existingSession.start_time) {
          const startTimeMs = new Date(existingSession.start_time).getTime()
          const nowMs = new Date().getTime()
          const elapsedSeconds = Math.floor((nowMs - startTimeMs) / 1000)
          const remainingSeconds = totalDurationSeconds - elapsedSeconds

          // Jika sesi ongoing lama sudah habis waktunya, selesaikan & buat sesi baru secara bersih
          if (remainingSeconds <= 0) {
            await supabase
              .from('exam_sessions')
              .update({
                status: 'completed',
                score: 0,
                completed_at: new Date().toISOString(),
              })
              .eq('id', existingSession.id)

            // Buat Sesi Baru untuk Ujian Sekarang
            const nowIso = new Date().toISOString()
            const { data: newSession } = await supabase
              .from('exam_sessions')
              .insert([
                {
                  exam_id: examId,
                  user_id: activeUser.id,
                  status: 'ongoing',
                  start_time: nowIso,
                },
              ])
              .select('id')
              .single()

            if (newSession) {
              activeSessionId = newSession.id
            }
            setTimeLeft(totalDurationSeconds)
          } else {
            // Sesi ongoing masih aktif
            activeSessionId = existingSession.id
            setTimeLeft(remainingSeconds)
          }
        } else {
          // Buat Sesi Baru jika tidak ada sesi ongoing
          const nowIso = new Date().toISOString()
          const { data: newSession } = await supabase
            .from('exam_sessions')
            .insert([
              {
                exam_id: examId,
                user_id: activeUser.id,
                status: 'ongoing',
                start_time: nowIso,
              },
            ])
            .select('id')
            .single()

          if (newSession) {
            activeSessionId = newSession.id
          }
          setTimeLeft(totalDurationSeconds)
        }

        if (activeSessionId) {
          setSessionId(activeSessionId)
        }
      }

      // 4. Muat Jawaban Sementara dari LocalStorage
      const savedLocalAns = localStorage.getItem(`cbt_temp_answers_${examId}`)
      if (savedLocalAns) {
        try {
          setUserAnswers(JSON.parse(savedLocalAns))
        } catch (e) {}
      }

      setLoading(false)
    }

    loadExamDataAndCreateSession()
  }, [examId])

  // Timer Countdown Effect
  useEffect(() => {
    if (loading || isSubmitted) return

    if (timeLeft <= 0 && !loading && questions.length > 0) {
      handleSubmit()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, isSubmitted, loading, questions.length])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleSelectSingleOption = (questionId: string, optionKey: string) => {
    if (isSubmitted) return
    const updated = { ...userAnswers, [questionId]: optionKey }
    setUserAnswers(updated)
    localStorage.setItem(`cbt_temp_answers_${examId}`, JSON.stringify(updated))
  }

  const handleToggleComplexOption = (questionId: string, optionKey: string) => {
    if (isSubmitted) return
    const currentList: string[] = Array.isArray(userAnswers[questionId])
      ? userAnswers[questionId]
      : []
    let updatedList: string[]

    if (currentList.includes(optionKey)) {
      updatedList = currentList.filter((k) => k !== optionKey)
    } else {
      updatedList = [...currentList, optionKey]
    }

    const updated = { ...userAnswers, [questionId]: updatedList }
    setUserAnswers(updated)
    localStorage.setItem(`cbt_temp_answers_${examId}`, JSON.stringify(updated))
  }

  const handleSelectMatrixOption = (
    questionId: string,
    statementId: string,
    value: string
  ) => {
    if (isSubmitted) return
    const currentObj =
      typeof userAnswers[questionId] === 'object' &&
      !Array.isArray(userAnswers[questionId])
        ? userAnswers[questionId]
        : {}

    const updated = {
      ...userAnswers,
      [questionId]: {
        ...currentObj,
        [statementId]: value,
      },
    }
    setUserAnswers(updated)
    localStorage.setItem(`cbt_temp_answers_${examId}`, JSON.stringify(updated))
  }

  const toggleFlag = (questionId: string) => {
    if (isSubmitted) return
    setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  // 🟢 HANDLER SELESAI & SIMPAN NILAI (GARANSI RECORD BARU TERSIMPAN)
  const handleSubmit = async () => {
    if (isSaving || isSubmitted) return
    setIsSaving(true)

    try {
      let totalPointsEarned = 0
      let totalMaxPoints = 0
      let correct = 0

      questions.forEach((q) => {
        const qMaxScore = Number(q.max_score) || 1
        totalMaxPoints += qMaxScore

        const userAns = userAnswers[q.id]
        const { isCorrect, ratio } = checkQuestionAccuracy(q, userAns)

        if (isCorrect) correct++
        totalPointsEarned += ratio * qMaxScore
      })

      const calculatedScore =
        totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0

      const supabase = createClient()

      let currentUser = null
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        currentUser = userData.user
      } else {
        const { data: sessData } = await supabase.auth.getSession()
        currentUser = sessData?.session?.user || null
      }

      const nowIso = new Date().toISOString()
      let finalSessionId = sessionId
      let isDbSaved = false

      // 1. Coba UPDATE Sesi Ongoing Yang Ada
      if (finalSessionId) {
        const { error: updateError, data: updatedRows } = await supabase
          .from('exam_sessions')
          .update({
            status: 'completed',
            score: calculatedScore,
            total_correct: correct,
            end_time: nowIso,
            submitted_at: nowIso,
            completed_at: nowIso,
          })
          .eq('id', finalSessionId)
          .select()

        if (!updateError && updatedRows && updatedRows.length > 0) {
          isDbSaved = true
        } else {
          console.warn('Update sesi gagal, menjalankan fallback insert:', updateError)
        }
      }

      // 2. Fallback: Buat Sesi Completed BARU Jika Update Sesi Lama Gagal / NULL
      if (!isDbSaved && currentUser?.id) {
        const { data: newCompletedSession, error: insertError } = await supabase
          .from('exam_sessions')
          .insert([
            {
              exam_id: examId,
              user_id: currentUser.id,
              status: 'completed',
              score: calculatedScore,
              total_correct: correct,
              start_time: nowIso,
              end_time: nowIso,
              submitted_at: nowIso,
              completed_at: nowIso,
            },
          ])
          .select()
          .single()

        if (!insertError && newCompletedSession) {
          finalSessionId = newCompletedSession.id
          isDbSaved = true
        } else {
          console.error('Insert fallback sesi gagal:', insertError)
        }
      }

      // 3. Simpan Rincian Jawaban ke Tabel answers
      if (finalSessionId) {
        await supabase.from('answers').delete().eq('session_id', finalSessionId)

        const answerRecords = questions.map((q) => ({
          session_id: finalSessionId,
          question_id: q.id,
          user_answer:
            typeof userAnswers[q.id] === 'string'
              ? userAnswers[q.id]
              : JSON.stringify(userAnswers[q.id] || null),
          selected_option:
            typeof userAnswers[q.id] === 'string'
              ? userAnswers[q.id]
              : JSON.stringify(userAnswers[q.id] || null),
          selected_answers: userAnswers[q.id] || null,
          is_flagged: !!flagged[q.id],
        }))

        if (answerRecords.length > 0) {
          await supabase.from('answers').insert(answerRecords)
        }
      }

      // 4. Bersihkan memori sementara & Simpan cache hasil
      const sessionRef = finalSessionId || `local_${Date.now()}`
      localStorage.removeItem(`cbt_temp_answers_${examId}`)
      localStorage.setItem(`cbt_answers_${examId}`, JSON.stringify(userAnswers))
      localStorage.setItem(`cbt_answers_session_${sessionRef}`, JSON.stringify(userAnswers))
      localStorage.setItem(`cbt_score_${examId}`, String(calculatedScore))

      triggerVictoryConfetti()

      setIsSubmitted(true)
      setIsSaving(false)

      setTimeout(() => {
        router.push(`/exam/${examId}/summary?session_id=${sessionRef}`)
      }, 1200)
    } catch (err) {
      console.error('Gagal mengirimkan jawaban ujian:', err)
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-slate-600 font-medium">Memuat sesi ujian...</p>
      </div>
    )
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center font-sans">
        <p className="text-slate-600 font-medium mb-4">
          Soal ujian tidak ditemukan.
        </p>
        <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium">
          Kembali ke Beranda
        </Link>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col font-sans ${fontSizeClass}`}>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-slate-800">{exam.title}</h1>
          <p className="text-xs text-slate-500 uppercase">{exam.subtest}</p>
        </div>

        {!isSubmitted ? (
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg font-mono font-bold text-lg">
            <span>⏱</span>
            <span>{formatTime(timeLeft)}</span>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm">
            Ujian Selesai
          </div>
        )}

        <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <span className="text-[10px] text-slate-400 font-bold px-1 uppercase">Ukuran Teks:</span>
          <button
            onClick={() => setFontSizeClass('text-xs')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
              fontSizeClass === 'text-xs' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
            suppressHydrationWarning
          >
            A-
          </button>
          <button
            onClick={() => setFontSizeClass('text-sm')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
              fontSizeClass === 'text-sm' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
            suppressHydrationWarning
          >
            A
          </button>
          <button
            onClick={() => setFontSizeClass('text-base')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
              fontSizeClass === 'text-base' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
            suppressHydrationWarning
          >
            A+
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700">
                    Soal No. {currentIndex + 1} Dari {questions.length}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase">
                    {currentQuestion.question_type === 'complex_multiple_choice'
                      ? 'Pilihan Ganda Kompleks'
                      : currentQuestion.question_type === 'true_false_matrix'
                      ? 'Matriks'
                      : 'Pilihan Ganda'}
                  </span>
                </div>
                <button
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                    flagged[currentQuestion.id]
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                  suppressHydrationWarning
                >
                  {flagged[currentQuestion.id] ? '★ Ragu-Ragu' : '☆ Tandai Ragu'}
                </button>
              </div>

              <div className="text-slate-800 text-base leading-relaxed mb-4 font-medium">
                <MathRenderer content={currentQuestion.question_text} />
                {currentQuestion.image_url && (
                  <div className="relative group inline-block my-2 block">
                    <img
                      src={currentQuestion.image_url}
                      alt="Gambar Soal"
                      className="max-h-64 rounded-xl border border-slate-200 cursor-pointer object-contain hover:opacity-95 transition-opacity"
                      onClick={() => setZoomedImageUrl(currentQuestion.image_url)}
                    />
                    <button
                      type="button"
                      onClick={() => setZoomedImageUrl(currentQuestion.image_url)}
                      className="mt-1.5 px-3 py-1 bg-slate-800/80 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1.5"
                      suppressHydrationWarning
                    >
                      <span>🔍</span>
                      <span>Perbesar Gambar</span>
                    </button>
                  </div>
                )}
              </div>

              {(!currentQuestion.question_type ||
                currentQuestion.question_type === 'multiple_choice') && (
                <div className="space-y-3">
                  {currentQuestion.options?.map(
                    (opt: { key: string; text: string; image_url?: string }) => {
                      const isSelected = userAnswers[currentQuestion.id] === opt.key
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSelectSingleOption(currentQuestion.id, opt.key)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                          suppressHydrationWarning
                        >
                          <span
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <div className="pt-0.5">
                            <MathRenderer content={opt.text} />
                            {opt.image_url && (
                              <img
                                src={opt.image_url}
                                alt={`Gambar ${opt.key}`}
                                className="max-h-32 rounded mt-2 border"
                              />
                            )}
                          </div>
                        </button>
                      )
                    }
                  )}
                </div>
              )}

              {currentQuestion.question_type === 'complex_multiple_choice' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mb-3">
                    💡 Petunjuk: Anda dapat memilih lebih dari satu jawaban yang bernilai benar.
                  </p>
                  {currentQuestion.options?.map(
                    (opt: { key: string; text: string; image_url?: string }) => {
                      const userList: string[] = Array.isArray(userAnswers[currentQuestion.id])
                        ? userAnswers[currentQuestion.id]
                        : []
                      const isSelected = userList.includes(opt.key)
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleToggleComplexOption(currentQuestion.id, opt.key)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                          suppressHydrationWarning
                        >
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center border text-xs font-bold shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-slate-300 text-slate-400'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </div>
                          <div className="pt-0.5">
                            <span className="font-bold mr-2 text-slate-800">{opt.key}.</span>
                            <MathRenderer content={opt.text} />
                            {opt.image_url && (
                              <img
                                src={opt.image_url}
                                alt={`Gambar ${opt.key}`}
                                className="max-h-32 rounded mt-2 border"
                              />
                            )}
                          </div>
                        </button>
                      )
                    }
                  )}
                </div>
              )}

              {currentQuestion.question_type === 'true_false_matrix' && (
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm mt-4">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-100 text-slate-700 border-b">
                      <tr>
                        <th className="p-4 font-bold">Pernyataan</th>
                        <th className="p-4 font-bold w-28 text-center border-l">Benar</th>
                        <th className="p-4 font-bold w-28 text-center border-l">Salah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentQuestion.options?.map(
                        (st: { id: string; text: string }) => {
                          const userObj =
                            typeof userAnswers[currentQuestion.id] === 'object' &&
                            !Array.isArray(userAnswers[currentQuestion.id])
                              ? userAnswers[currentQuestion.id]
                              : {}
                          const selectedVal = userObj[st.id]

                          return (
                            <tr key={st.id} className="border-b last:border-0 hover:bg-slate-50">
                              <td className="p-4 font-medium text-slate-800">{st.text}</td>
                              <td className="p-4 text-center border-l">
                                <input
                                  type="radio"
                                  name={`st_${currentQuestion.id}_${st.id}`}
                                  checked={selectedVal === 'Benar'}
                                  onChange={() =>
                                    handleSelectMatrixOption(currentQuestion.id, st.id, 'Benar')
                                  }
                                  className="w-4 h-4 text-indigo-600"
                                  suppressHydrationWarning
                                />
                              </td>
                              <td className="p-4 text-center border-l">
                                <input
                                  type="radio"
                                  name={`st_${currentQuestion.id}_${st.id}`}
                                  checked={selectedVal === 'Salah'}
                                  onChange={() =>
                                    handleSelectMatrixOption(currentQuestion.id, st.id, 'Salah')
                                  }
                                  className="w-4 h-4 text-indigo-600"
                                  suppressHydrationWarning
                                />
                              </td>
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-100">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg disabled:opacity-50 hover:bg-slate-200 transition-colors"
                suppressHydrationWarning
              >
                ← Sebelumnya
              </button>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  suppressHydrationWarning
                >
                  {isSaving ? 'Menyimpan...' : 'Selesaikan Ujian'}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                  suppressHydrationWarning
                >
                  Selanjutnya →
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">
            Nomor Soal
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered =
                !!userAnswers[q.id] &&
                (Array.isArray(userAnswers[q.id])
                  ? userAnswers[q.id].length > 0
                  : true)
              const isFlagged = !!flagged[q.id]
              const isCurrent = idx === currentIndex

              let btnClass = 'bg-slate-100 text-slate-600 border-slate-200'
              if (isFlagged) {
                btnClass = 'bg-amber-500 text-white border-amber-600'
              } else if (isAnswered) {
                btnClass = 'bg-indigo-600 text-white border-indigo-700'
              }

              if (isCurrent) {
                btnClass += ' ring-2 ring-indigo-400 font-bold'
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-lg text-xs font-semibold border transition-all ${btnClass}`}
                  suppressHydrationWarning
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {zoomedImageUrl && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-white p-2 rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center p-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span>🖼️</span>
                <span>Pratinjau Gambar Soal (Resolusi Penuh)</span>
              </span>
              <button
                type="button"
                onClick={() => setZoomedImageUrl(null)}
                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                suppressHydrationWarning
              >
                ✕ Tutup
              </button>
            </div>

            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center">
              <img
                src={zoomedImageUrl}
                alt="Gambar Soal Diperbesar"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <p className="text-slate-600 font-medium">Memuat sesi ujian...</p>
        </div>
      }
    >
      <ExamContent />
    </Suspense>
  )
}