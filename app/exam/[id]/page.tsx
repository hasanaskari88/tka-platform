'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'

function ExamEngineContent() {
  const params = useParams()
  const examId = params?.id as string
  const router = useRouter()

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // State Session & User
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // State Jawaban Siswa & Ragu-ragu
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [key: string]: boolean }>({})

  // State Modal Lightbox Gambar
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null)

  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Ref untuk menghindari submit ganda
  const isSubmittingRef = useRef(false)

  // Helper Acak Array (Fisher-Yates Shuffle)
  const shuffleArray = (array: any[]) => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // 1. MEMUAT UJIAN & SINKRONISASI SESI PENGERJAAN DARI DATABASE
  const initExamEngine = async () => {
    if (!examId) return
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const activeUserId = user?.id || null
    setUserId(activeUserId)

    // Fetch Exam
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (!examData) {
      alert('Ujian tidak ditemukan!')
      router.push('/')
      return
    }

    // Fetch Questions
    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    let processedQuestions = questionData || []
    if (examData.shuffle_questions) {
      processedQuestions = shuffleArray(processedQuestions)
    }

    if (examData.shuffle_options) {
      processedQuestions = processedQuestions.map((q) => {
        if (
          (q.question_type === 'multiple_choice' ||
            q.question_type === 'complex_multiple_choice' ||
            q.question_type === 'true_false_matrix') &&
          Array.isArray(q.options) &&
          q.options.length > 0
        ) {
          return {
            ...q,
            options: shuffleArray(q.options),
          }
        }
        return q
      })
    }

    setQuestions(processedQuestions)
    setExam(examData)

    // 🟢 CEK SESI PENGERJAAN AKTIF DI DATABASE DENGAN KONDISI "in_progress"
    let currentSession: any = null

    if (activeUserId) {
      const { data: existingSession } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', activeUserId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      currentSession = existingSession
    }

    // Jika belum ada sesi aktif, buat sesi baru di DB
    if (!currentSession) {
      const startTimeIso = new Date().toISOString()
      const { data: newSession, error: createErr } = await supabase
        .from('exam_sessions')
        .insert([
          {
            exam_id: examId,
            user_id: activeUserId,
            status: 'in_progress',
            start_time: startTimeIso,
          },
        ])
        .select()
        .single()

      if (createErr || !newSession) {
        alert('Gagal memuat atau membuat sesi ujian. Silakan coba lagi.')
        router.push('/')
        return
      }
      currentSession = newSession
    }

    setSessionId(currentSession.id)

    // 🟢 SINKRONISASI PEMULIHAN JAWABAN TERSIMPAN (RESTORE ANSWERS)
    const { data: savedAnswers } = await supabase
      .from('answers')
      .select('*')
      .eq('session_id', currentSession.id)

    if (savedAnswers && savedAnswers.length > 0) {
      const restoredMap: { [key: string]: any } = {}
      savedAnswers.forEach((ans) => {
        if (ans.user_answer !== null && ans.user_answer !== undefined) {
          let parsedVal = ans.user_answer
          if (typeof parsedVal === 'string') {
            const trimmed = parsedVal.trim()
            if (
              (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
              (trimmed.startsWith('[') && trimmed.endsWith(']'))
            ) {
              try {
                parsedVal = JSON.parse(trimmed)
              } catch (e) {
                parsedVal = trimmed
              }
            }
          }
          restoredMap[ans.question_id] = parsedVal
        }
      })
      setUserAnswers(restoredMap)
    }

    // 🟢 HITUNG DURATION & SISA WAKTU BERDASARKAN TIMESTAMP START_TIME
    const durationSec = (examData.duration_minutes || 15) * 60
    const startMs = new Date(currentSession.start_time || currentSession.created_at).getTime()
    const nowMs = Date.now()
    const elapsedSec = Math.floor((nowMs - startMs) / 1000)
    const remainingSec = Math.max(0, durationSec - elapsedSec)

    setTimeLeft(remainingSec)
    setLoading(false)
  }

  useEffect(() => {
    initExamEngine()
  }, [examId])

  // 🟢 PROTEKSI RELOAD / BACK BROWSER (PREVENT ACCIDENTAL LEAVE)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // 🟢 TIMER COUNTDOWN PRESISI
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer)
          handleFinishExam(true)
          return 0
        }
        return prev !== null ? prev - 1 : null
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // 🟢 REAL-TIME AUTO-SAVE KE SUPABASE UNTUK SETIAP PERUBAHAN JAWABAN
  const autoSaveAnswerToSupabase = async (questionId: string, answerValue: any) => {
    if (!sessionId) return
    const supabase = createClient()

    const formattedAns =
      answerValue === undefined || answerValue === null
        ? null
        : typeof answerValue === 'string'
        ? answerValue
        : JSON.stringify(answerValue)

    await supabase.from('answers').upsert(
      {
        session_id: sessionId,
        question_id: questionId,
        user_answer: formattedAns,
      },
      { onConflict: 'session_id,question_id' }
    )
  }

  // Handler Jawaban Pilihan Ganda Biasa
  const handleSelectSingleOption = (questionId: string, optKey: string) => {
    setUserAnswers((prev) => {
      const next = { ...prev, [questionId]: optKey }
      autoSaveAnswerToSupabase(questionId, optKey)
      return next
    })
  }

  // Handler Jawaban PG Kompleks (Multiple Checkbox)
  const handleToggleComplexOption = (questionId: string, optKey: string) => {
    const currentAns = Array.isArray(userAnswers[questionId]) ? userAnswers[questionId] : []
    let updated: string[] = []
    if (currentAns.includes(optKey)) {
      updated = currentAns.filter((k: string) => k !== optKey)
    } else {
      updated = [...currentAns, optKey]
    }
    setUserAnswers((prev) => {
      const next = { ...prev, [questionId]: updated }
      autoSaveAnswerToSupabase(questionId, updated)
      return next
    })
  }

  // Handler Jawaban Matriks Benar-Salah
  const handleSelectMatrixValue = (
    questionId: string,
    statementId: string,
    val: 'Benar' | 'Salah'
  ) => {
    const currentMatrix =
      typeof userAnswers[questionId] === 'object' && !Array.isArray(userAnswers[questionId])
        ? userAnswers[questionId]
        : {}
    const updatedMatrix = { ...currentMatrix, [statementId]: val }

    setUserAnswers((prev) => {
      const next = { ...prev, [questionId]: updatedMatrix }
      autoSaveAnswerToSupabase(questionId, updatedMatrix)
      return next
    })
  }

  // Handler Jawaban Essay
  const handleEssayChange = (questionId: string, text: string) => {
    setUserAnswers((prev) => {
      const next = { ...prev, [questionId]: text }
      autoSaveAnswerToSupabase(questionId, text)
      return next
    })
  }

  // Handler Ragu-Ragu
  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }))
  }

  // 🟢 FINISH EXAM & CALCULATE FINAL SCORE
  const handleFinishExam = async (autoFinish = false) => {
    if (isSubmittingRef.current) return
    if (!autoFinish && !confirm('Apakah Anda yakin ingin menyelesaikan ujian ini?')) return

    isSubmittingRef.current = true
    setIsSubmitting(true)

    const supabase = createClient()

    let totalPointsEarned = 0
    let totalMaxPoints = 0

    questions.forEach((q) => {
      const qMaxScore = Number(q.max_score) || 1
      totalMaxPoints += qMaxScore

      const qType = q.question_type || 'multiple_choice'
      const userAns = userAnswers[q.id]

      const isUnattempted =
        userAns === undefined ||
        userAns === null ||
        userAns === '' ||
        (Array.isArray(userAns) && userAns.length === 0) ||
        (typeof userAns === 'object' &&
          !Array.isArray(userAns) &&
          Object.keys(userAns).length === 0)

      if (!isUnattempted) {
        if (qType === 'multiple_choice') {
          const correctOpt = String(q.correct_option ?? q.correct_answer ?? '')
            .trim()
            .toUpperCase()
          if (String(userAns).trim().toUpperCase() === correctOpt) {
            totalPointsEarned += qMaxScore
          }
        } else if (qType === 'complex_multiple_choice') {
          const correctKeys: string[] = Array.isArray(q.correct_answers)
            ? q.correct_answers.map((k: any) => String(k).trim().toUpperCase())
            : [String(q.correct_option || q.correct_answer).trim().toUpperCase()]
          const userKeys: string[] = Array.isArray(userAns)
            ? userAns.map((k: any) => String(k).trim().toUpperCase())
            : []

          const correctUserChoices = userKeys.filter((k) => correctKeys.includes(k)).length
          const wrongUserChoices = userKeys.filter((k) => !correctKeys.includes(k)).length

          const netCorrect = Math.max(0, correctUserChoices - wrongUserChoices)
          if (correctKeys.length > 0) {
            const ratio = netCorrect / correctKeys.length
            totalPointsEarned += ratio * qMaxScore
          }
        } else if (qType === 'true_false_matrix') {
          const correctObj: { [key: string]: string } = q.correct_answers || {}
          const userObj = typeof userAns === 'object' && !Array.isArray(userAns) ? userAns : {}

          const statementIds = Object.keys(correctObj)
          if (statementIds.length > 0) {
            let correctRows = 0
            statementIds.forEach((sId) => {
              if (
                userObj[sId] &&
                String(userObj[sId]).trim().toLowerCase() === String(correctObj[sId]).trim().toLowerCase()
              ) {
                correctRows++
              }
            })
            const ratio = correctRows / statementIds.length
            totalPointsEarned += ratio * qMaxScore
          }
        }
      }
    })

    const finalScore =
      totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0

    const endTimeIso = new Date().toISOString()

    // Update Status Session Menjadi Completed
    if (sessionId) {
      await supabase
        .from('exam_sessions')
        .update({
          status: 'completed',
          score: finalScore,
          end_time: endTimeIso,
        })
        .eq('id', sessionId)
    }

    router.push(`/exam/${examId}/summary?session_id=${sessionId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <p className="font-semibold text-sm">Memuat ruang ujian CBT...</p>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const qType = currentQuestion?.question_type || 'multiple_choice'

  const matrixStatements =
    Array.isArray(currentQuestion?.options) && currentQuestion.options.length > 0
      ? currentQuestion.options
      : Array.isArray(currentQuestion?.statements)
      ? currentQuestion.statements
      : Array.isArray(currentQuestion?.matrix_statements)
      ? currentQuestion.matrix_statements
      : []

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      {/* HEADER CBT SISWA */}
      <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md">
        <div>
          <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded font-bold uppercase">
            {exam?.subtest || 'TKA'}
          </span>
          <h1 className="text-base font-bold mt-0.5">{exam?.title}</h1>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              Sisa Waktu
            </span>
            <span className="font-mono text-lg font-bold text-amber-400">
              ⏱ {timeLeft !== null ? formatTime(timeLeft) : '00:00'}
            </span>
          </div>

          <button
            onClick={() => handleFinishExam(false)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
            suppressHydrationWarning
          >
            {isSubmitting ? 'Menyimpan...' : 'Selesaikan Ujian ✓'}
          </button>
        </div>
      </header>

      {/* BODY KONTEN SOAL & NAVIGASI */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEMBAR SOAL */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          {currentQuestion ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800 text-sm">
                    Soal Nomor {currentIndex + 1} dari {questions.length}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                    {qType === 'complex_multiple_choice'
                      ? 'PG Kompleks'
                      : qType === 'true_false_matrix'
                      ? 'Matriks'
                      : qType === 'essay'
                      ? 'Uraian / Essay'
                      : 'Pilihan Ganda'}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleFlag(currentQuestion.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    flaggedQuestions[currentQuestion.id]
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  suppressHydrationWarning
                >
                  🚩 {flaggedQuestions[currentQuestion.id] ? 'Ragu-Ragu' : 'Tandai Ragu'}
                </button>
              </div>

              {/* TEKS SOAL & GAMBAR */}
              <div className="text-slate-900 text-sm font-semibold leading-relaxed">
                <MathRenderer content={currentQuestion.question_text || ''} />
              </div>

              {currentQuestion.image_url && (
                <div className="my-2">
                  <img
                    src={currentQuestion.image_url}
                    alt="Gambar Soal"
                    onClick={() => setZoomedImageUrl(currentQuestion.image_url)}
                    className="max-h-60 rounded-xl border cursor-zoom-in hover:opacity-90 transition-opacity"
                  />
                </div>
              )}

              {/* 1. PILIHAN GANDA BIASA */}
              {qType === 'multiple_choice' && Array.isArray(currentQuestion.options) && (
                <div className="space-y-2 pt-2">
                  {currentQuestion.options.map((opt: any, oIdx: number) => {
                    const optKey = opt.key || String.fromCharCode(65 + oIdx)
                    const displayLabel = String.fromCharCode(65 + oIdx)
                    const isSelected = userAnswers[currentQuestion.id] === optKey

                    return (
                      <button
                        key={optKey || oIdx}
                        onClick={() => handleSelectSingleOption(currentQuestion.id, optKey)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center space-x-3 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500 text-indigo-900 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-800 font-medium'
                        }`}
                        suppressHydrationWarning
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {displayLabel}
                        </span>
                        <div className="flex-1 text-slate-900 font-semibold">
                          <MathRenderer content={typeof opt === 'string' ? opt : (opt.text || opt.title || '')} />
                          {opt.image_url && (
                            <img
                              src={opt.image_url}
                              alt={`Opsi ${displayLabel}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setZoomedImageUrl(opt.image_url)
                              }}
                              className="max-h-24 mt-2 rounded border cursor-zoom-in hover:opacity-90 transition-opacity"
                            />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 2. PILIHAN GANDA KOMPLEKS (CHECKBOX) */}
              {qType === 'complex_multiple_choice' && Array.isArray(currentQuestion.options) && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                    ℹ️ Pilih satu atau beberapa jawaban yang Anda anggap benar.
                  </p>
                  {currentQuestion.options.map((opt: any, oIdx: number) => {
                    const optKey = opt.key || String.fromCharCode(65 + oIdx)
                    const displayLabel = String.fromCharCode(65 + oIdx)
                    const currentAns = Array.isArray(userAnswers[currentQuestion.id])
                      ? userAnswers[currentQuestion.id]
                      : []
                    const isSelected = currentAns.includes(optKey)

                    return (
                      <button
                        key={optKey || oIdx}
                        onClick={() => handleToggleComplexOption(currentQuestion.id, optKey)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center space-x-3 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500 text-indigo-900 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-800 font-medium'
                        }`}
                        suppressHydrationWarning
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={isSelected}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="font-bold text-xs shrink-0">{displayLabel}.</span>
                        <div className="flex-1 text-slate-900 font-semibold">
                          <MathRenderer content={typeof opt === 'string' ? opt : (opt.text || opt.title || '')} />
                          {opt.image_url && (
                            <img
                              src={opt.image_url}
                              alt={`Opsi ${displayLabel}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setZoomedImageUrl(opt.image_url)
                              }}
                              className="max-h-24 mt-2 rounded border cursor-zoom-in hover:opacity-90 transition-opacity"
                            />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 3. MATRIKS BENAR - SALAH */}
              {qType === 'true_false_matrix' && (
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                    ℹ️ Tentukan pilihan Benar atau Salah untuk setiap baris pernyataan di bawah ini.
                  </p>
                  <div className="border border-slate-300 rounded-xl overflow-hidden text-xs bg-white shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                        <tr>
                          <th className="p-3 text-slate-900 font-extrabold">Pernyataan</th>
                          <th className="p-3 w-36 text-center border-l border-slate-300 text-slate-900 font-extrabold">
                            Pilihan Jawaban
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {matrixStatements.map((st: any, sIdx: number) => {
                          const stId = String(st.id || sIdx + 1)
                          const currentMatrix =
                            typeof userAnswers[currentQuestion.id] === 'object'
                              ? userAnswers[currentQuestion.id]
                              : {}
                          const selectedVal = currentMatrix?.[stId]

                          const statementText =
                            typeof st === 'string'
                              ? st
                              : st?.text ||
                                st?.statement ||
                                st?.statement_text ||
                                st?.title ||
                                st?.content ||
                                st?.label ||
                                ''

                          return (
                            <tr key={stId || sIdx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3">
                                <div className="flex items-start space-x-2">
                                  <span className="font-bold text-slate-700 text-xs shrink-0">
                                    {sIdx + 1}.
                                  </span>
                                  <div className="flex-1 text-slate-900 font-semibold text-xs leading-relaxed">
                                    <MathRenderer content={statementText} />
                                    {st.image_url && (
                                      <img
                                        src={st.image_url}
                                        alt={`Gambar Pernyataan ${sIdx + 1}`}
                                        onClick={() => setZoomedImageUrl(st.image_url)}
                                        className="max-h-24 mt-1.5 rounded border cursor-zoom-in hover:opacity-90 transition-opacity"
                                      />
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 border-l border-slate-200">
                                <div className="flex justify-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectMatrixValue(currentQuestion.id, stId, 'Benar')
                                    }
                                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                                      selectedVal === 'Benar'
                                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                    suppressHydrationWarning
                                  >
                                    Benar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectMatrixValue(currentQuestion.id, stId, 'Salah')
                                    }
                                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                                      selectedVal === 'Salah'
                                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                    suppressHydrationWarning
                                  >
                                    Salah
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. URAIAN / ESSAY */}
              {qType === 'essay' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase">
                    Lembar Jawaban Essay Anda:
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Tuliskan jawaban lengkap Anda di sini..."
                    value={userAnswers[currentQuestion.id] || ''}
                    onChange={(e) => handleEssayChange(currentQuestion.id, e.target.value)}
                    className="w-full p-3.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold text-slate-900 bg-white placeholder:text-slate-400 shadow-inner"
                    suppressHydrationWarning
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-10">Belum ada soal pada ujian ini.</p>
          )}

          {/* NAVIGASI SEBELUMNYA / SELANJUTNYA */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
              suppressHydrationWarning
            >
              ← Sebelumnya
            </button>

            <button
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
              suppressHydrationWarning
            >
              Selanjutnya →
            </button>
          </div>
        </div>

        {/* SIDEBAR NAVIGASI NOMOR SOAL */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
          <h3 className="text-xs font-bold text-slate-700 uppercase border-b pb-2">
            🧭 Navigasi Nomor Soal
          </h3>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const ans = userAnswers[q.id]
              const isAnswered =
                ans !== undefined &&
                ans !== null &&
                (Array.isArray(ans)
                  ? ans.length > 0
                  : typeof ans === 'object'
                  ? Object.keys(ans).length > 0
                  : true)
              const isFlagged = !!flaggedQuestions[q.id]
              const isCurrent = idx === currentIndex

              let btnClass = 'bg-slate-100 text-slate-600 border-slate-200'
              if (isAnswered) btnClass = 'bg-emerald-600 text-white border-emerald-600 font-bold'
              if (isFlagged) btnClass = 'bg-amber-500 text-white border-amber-500 font-bold'
              if (isCurrent) btnClass += ' ring-2 ring-indigo-600 ring-offset-1 font-bold'

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-lg text-xs font-mono transition-all border flex items-center justify-center ${btnClass}`}
                  suppressHydrationWarning
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* MODAL LIGHTBOX FULLSCREEN */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white p-2 rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/70 text-white flex items-center justify-center font-bold text-sm hover:bg-slate-900 transition-colors z-10"
              title="Tutup Gambar"
            >
              ✕
            </button>
            <img
              src={zoomedImageUrl}
              alt="Gambar Diperbesar"
              className="max-h-[85vh] max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExamEnginePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
          <p className="font-semibold text-sm">Memuat ruang ujian CBT...</p>
        </div>
      }
    >
      <ExamEngineContent />
    </Suspense>
  )
}