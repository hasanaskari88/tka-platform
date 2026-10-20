'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

function ExamContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // User Answers State (String, Array, atau Object per Soal)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({})
  const [flagged, setFlagged] = useState<{ [key: string]: boolean }>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [finalScore, setFinalScore] = useState<number | null>(null)

  // State Statistik Hasil Ujian
  const [stats, setStats] = useState({
    totalQuestions: 0,
    correctCount: 0,
    partialCount: 0,
    wrongCount: 0,
    unattemptedCount: 0,
  })
  
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!examId) return

    async function loadExamDataAndCreateSession() {
      const supabase = createClient()

      const { data: examData } = await supabase.from('exams').select('*').eq('id', examId).single()
      const { data: questionData } = await supabase.from('questions').select('*').eq('exam_id', examId).order('created_at', { ascending: true })

      if (examData && questionData) {
        setExam(examData)
        setQuestions(questionData)
        setTimeLeft(examData.duration_minutes * 60)

        const { data: { user } } = await supabase.auth.getUser()

        const { data: sessionData } = await supabase
          .from('exam_sessions')
          .insert([
            {
              exam_id: examId,
              user_id: user?.id || null,
              status: 'ongoing',
              start_time: new Date().toISOString(),
            },
          ])
          .select()
          .single()

        if (sessionData) {
          setSessionId(sessionData.id)
        }
      }
      setLoading(false)
    }

    loadExamDataAndCreateSession()
  }, [examId])

  // Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0 || isSubmitted || loading) return

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
  }, [timeLeft, isSubmitted, loading])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Handle Jawaban PG biasa
  const handleSelectSingleOption = (questionId: string, optionKey: string) => {
    if (isSubmitted) return
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionKey }))
  }

  // Handle Jawaban PG Kompleks
  const handleToggleComplexOption = (questionId: string, optionKey: string) => {
    if (isSubmitted) return
    const currentList: string[] = Array.isArray(userAnswers[questionId]) ? userAnswers[questionId] : []
    let updated: string[]

    if (currentList.includes(optionKey)) {
      updated = currentList.filter((k) => k !== optionKey)
    } else {
      updated = [...currentList, optionKey]
    }

    setUserAnswers((prev) => ({ ...prev, [questionId]: updated }))
  }

  // Handle Jawaban Matriks Menjodohkan
  const handleSelectMatrixOption = (questionId: string, statementId: string, value: string) => {
    if (isSubmitted) return
    const currentObj = typeof userAnswers[questionId] === 'object' && !Array.isArray(userAnswers[questionId])
      ? userAnswers[questionId]
      : {}

    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...currentObj,
        [statementId]: value,
      },
    }))
  }

  const toggleFlag = (questionId: string) => {
    if (isSubmitted) return
    setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  // Evaluasi Hasil & Kalkulasi Rincian
  const handleSubmit = async () => {
    if (isSaving || isSubmitted) return
    setIsSaving(true)

    let totalPointsEarned = 0
    let totalMaxPoints = 0

    let correct = 0
    let partial = 0
    let wrong = 0
    let unattempted = 0

    questions.forEach((q) => {
      const qMaxScore = Number(q.max_score) || 1
      totalMaxPoints += qMaxScore

      const userAns = userAnswers[q.id]
      const qType = q.question_type || 'multiple_choice'

      // Cek apakah belum dijawab
      const isUnattempted =
        !userAns ||
        (Array.isArray(userAns) && userAns.length === 0) ||
        (typeof userAns === 'object' && !Array.isArray(userAns) && Object.keys(userAns).length === 0)

      if (isUnattempted) {
        unattempted++
      } else {
        if (qType === 'multiple_choice') {
          if (userAns === q.correct_option) {
            totalPointsEarned += qMaxScore
            correct++
          } else {
            wrong++
          }
        } else if (qType === 'complex_multiple_choice') {
          const correctKeys: string[] = q.correct_answers || [q.correct_option]
          const userKeys: string[] = Array.isArray(userAns) ? userAns : []

          const correctUserChoices = userKeys.filter((k) => correctKeys.includes(k)).length
          const wrongUserChoices = userKeys.filter((k) => !correctKeys.includes(k)).length

          const netCorrect = Math.max(0, correctUserChoices - wrongUserChoices)
          const ratio = netCorrect / correctKeys.length
          totalPointsEarned += ratio * qMaxScore

          if (ratio === 1) correct++
          else if (ratio > 0) partial++
          else wrong++
        } else if (qType === 'true_false_matrix') {
          const correctObj: { [key: string]: string } = q.correct_answers || {}
          const userObj = typeof userAns === 'object' && !Array.isArray(userAns) ? userAns : {}

          const statementIds = Object.keys(correctObj)
          if (statementIds.length > 0) {
            let correctRows = 0
            statementIds.forEach((sId) => {
              if (userObj[sId] === correctObj[sId]) {
                correctRows++
              }
            })
            const ratio = correctRows / statementIds.length
            totalPointsEarned += ratio * qMaxScore

            if (ratio === 1) correct++
            else if (ratio > 0) partial++
            else wrong++
          }
        }
      }
    })

    const calculatedScore = totalMaxPoints > 0 ? (totalPointsEarned / totalMaxPoints) * 100 : 0
    setFinalScore(calculatedScore)

    setStats({
      totalQuestions: questions.length,
      correctCount: correct,
      partialCount: partial,
      wrongCount: wrong,
      unattemptedCount: unattempted,
    })

    const supabase = createClient()

    if (sessionId) {
      await supabase
        .from('exam_sessions')
        .update({
          status: 'completed',
          score: calculatedScore,
          end_time: new Date().toISOString(),
        })
        .eq('id', sessionId)

      const answerRecords = questions.map((q) => ({
        session_id: sessionId,
        question_id: q.id,
        selected_option: typeof userAnswers[q.id] === 'string' ? userAnswers[q.id] : JSON.stringify(userAnswers[q.id]),
        selected_answers: userAnswers[q.id] || null,
        is_flagged: !!flagged[q.id],
      }))

      if (answerRecords.length > 0) {
        await supabase.from('answers').insert(answerRecords)
      }
    }

    setIsSaving(false)
    setIsSubmitted(true)
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
        <p className="text-slate-600 font-medium mb-4">Soal ujian tidak ditemukan.</p>
        <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
          Kembali ke Beranda
        </Link>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Header CBT */}
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
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-bold">
            Ujian Selesai
          </div>
        )}
      </header>

      {/* Body CBT */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Kolom Soal / Review */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {isSubmitted ? (
            /* Tampilan Ringkasan Hasil & Review Jawaban */
            <div className="space-y-6">
              {/* Kartu Ringkasan Hasil */}
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Hasil & Laporan Evaluasi Ujian</h2>
                <p className="text-slate-600 mb-6 text-sm">Rincian pencapaian dan analisis pengerjaan soal TKA Anda.</p>
                
                {/* Skor Akhir Utama */}
                <div className="inline-block bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-6">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">Skor Akhir TKA</span>
                  <span className="text-5xl font-extrabold text-indigo-700">{finalScore?.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 block mt-1">Skala 0 - 100 Poin</span>
                </div>

                {/* Kartu Statistik Jawaban */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6 text-left">
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Benar Sempurna</span>
                    <span className="text-xl font-bold text-emerald-800">{stats.correctCount} <span className="text-xs font-normal">Soal</span></span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">Benar Sebagian</span>
                    <span className="text-xl font-bold text-amber-800">{stats.partialCount} <span className="text-xs font-normal">Soal</span></span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-rose-700 uppercase block">Salah</span>
                    <span className="text-xl font-bold text-rose-800">{stats.wrongCount} <span className="text-xs font-normal">Soal</span></span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase block">Kosong / Ragu</span>
                    <span className="text-xl font-bold text-slate-700">{stats.unattemptedCount} <span className="text-xs font-normal">Soal</span></span>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <Link href="/history" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                    📊 Ke Riwayat Ujian
                  </Link>
                  <Link href="/" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors">
                    Kembali ke Beranda
                  </Link>
                </div>
              </div>

              {/* Review & Pembahasan Jawaban Per Nomor */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-slate-800 pb-3 border-b">
                  📋 Review Jawaban & Pembahasan Per Soal
                </h3>

                <div className="space-y-6">
                  {questions.map((q, idx) => {
                    const qType = q.question_type || 'multiple_choice'
                    const userAns = userAnswers[q.id]
                    const correctKeys = q.correct_answers || [q.correct_option]

                    return (
                      <div key={q.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                          <span className="font-bold text-indigo-700 text-sm">Soal No. {idx + 1}</span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-white border text-slate-600 uppercase">
                            {qType === 'complex_multiple_choice'
                              ? 'PG Kompleks'
                              : qType === 'true_false_matrix'
                              ? 'Matriks'
                              : 'Pilihan Ganda'}
                          </span>
                        </div>

                        {/* Teks Soal & Gambar */}
                        <div className="text-slate-800 text-sm font-medium">
                          <MathRenderer content={q.question_text} />
                          {q.image_url && <img src={q.image_url} alt="Gambar Soal" className="max-h-48 rounded my-2 border object-contain" />}
                        </div>

                        {/* Review Pilihan Jawaban berdasarkan Tipe */}
                        {qType === 'multiple_choice' && (
                          <div className="space-y-2 text-xs">
                            {q.options?.map((opt: any) => {
                              const isUserChosen = userAns === opt.key
                              const isKey = q.correct_option === opt.key

                              let styleClass = 'bg-white border-slate-200 text-slate-700'
                              if (isKey) {
                                styleClass = 'bg-emerald-50 border-emerald-400 font-bold text-emerald-800'
                              } else if (isUserChosen && !isKey) {
                                styleClass = 'bg-rose-50 border-rose-300 font-bold text-rose-800'
                              }

                              return (
                                <div key={opt.key} className={`p-3 rounded-lg border flex items-center justify-between ${styleClass}`}>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold">{opt.key}.</span>
                                    <MathRenderer content={opt.text} />
                                  </div>
                                  <div className="flex items-center space-x-1 text-[11px]">
                                    {isKey && <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">Kunci Jawaban</span>}
                                    {isUserChosen && (
                                      <span className={isKey ? 'bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold' : 'bg-rose-600 text-white px-2 py-0.5 rounded font-bold'}>
                                        Jawaban Anda
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {qType === 'complex_multiple_choice' && (
                          <div className="space-y-2 text-xs">
                            {q.options?.map((opt: any) => {
                              const userList: string[] = Array.isArray(userAns) ? userAns : []
                              const isUserChosen = userList.includes(opt.key)
                              const isKey = correctKeys.includes(opt.key)

                              let styleClass = 'bg-white border-slate-200 text-slate-700'
                              if (isKey) {
                                styleClass = 'bg-emerald-50 border-emerald-400 font-bold text-emerald-800'
                              } else if (isUserChosen && !isKey) {
                                styleClass = 'bg-rose-50 border-rose-300 font-bold text-rose-800'
                              }

                              return (
                                <div key={opt.key} className={`p-3 rounded-lg border flex items-center justify-between ${styleClass}`}>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold">{opt.key}.</span>
                                    <MathRenderer content={opt.text} />
                                  </div>
                                  <div className="flex items-center space-x-1 text-[11px]">
                                    {isKey && <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">Kunci Benar</span>}
                                    {isUserChosen && (
                                      <span className={isKey ? 'bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold' : 'bg-rose-600 text-white px-2 py-0.5 rounded font-bold'}>
                                        Anda Pilih
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {qType === 'true_false_matrix' && (
                          <div className="border rounded-lg overflow-hidden bg-white text-xs">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-100 text-slate-700 border-b">
                                <tr>
                                  <th className="p-2.5 font-bold">Pernyataan</th>
                                  <th className="p-2.5 font-bold w-28 text-center border-l">Jawaban Anda</th>
                                  <th className="p-2.5 font-bold w-28 text-center border-l">Kunci Benar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {q.options?.map((st: any) => {
                                  const userObj = typeof userAns === 'object' && !Array.isArray(userAns) ? userAns : {}
                                  const userVal = userObj[st.id] || '-'
                                  const keyVal = q.correct_answers?.[st.id] || st.correct_val
                                  const isCorrectRow = userVal === keyVal

                                  return (
                                    <tr key={st.id} className="border-b last:border-0">
                                      <td className="p-2.5 font-medium">{st.text}</td>
                                      <td className={`p-2.5 text-center border-l font-bold ${isCorrectRow ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                        {userVal}
                                      </td>
                                      <td className="p-2.5 text-center border-l font-bold text-indigo-700 bg-indigo-50/50">
                                        {keyVal}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Lembar Soal Aktif CBT */
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700">Soal No. {currentIndex + 1}</span>
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
                      flagged[currentQuestion.id] ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {flagged[currentQuestion.id] ? '★ Ragu-Ragu' : '☆ Tandai Ragu'}
                  </button>
                </div>

                {/* Teks & Gambar Soal */}
                <div className="text-slate-800 text-base leading-relaxed mb-4 font-medium">
                  <MathRenderer content={currentQuestion.question_text} />
                  {currentQuestion.image_url && (
                    <img src={currentQuestion.image_url} alt="Gambar Soal" className="max-h-64 rounded my-3 border object-contain" />
                  )}
                </div>

                {/* Tampilan Input Pilihan Jawaban */}
                {(!currentQuestion.question_type || currentQuestion.question_type === 'multiple_choice') && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((opt: { key: string; text: string; image_url?: string }) => {
                      const isSelected = userAnswers[currentQuestion.id] === opt.key
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSelectSingleOption(currentQuestion.id, opt.key)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3 ${
                            isSelected ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {opt.key}
                          </span>
                          <div className="pt-0.5">
                            <MathRenderer content={opt.text} />
                            {opt.image_url && <img src={opt.image_url} alt={`Gambar ${opt.key}`} className="max-h-32 rounded mt-2 border" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentQuestion.question_type === 'complex_multiple_choice' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mb-3">
                      💡 Petunjuk: Anda dapat memilih lebih dari satu jawaban yang bernilai benar.
                    </p>
                    {currentQuestion.options?.map((opt: { key: string; text: string; image_url?: string }) => {
                      const userList: string[] = Array.isArray(userAnswers[currentQuestion.id]) ? userAnswers[currentQuestion.id] : []
                      const isSelected = userList.includes(opt.key)
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleToggleComplexOption(currentQuestion.id, opt.key)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3 ${
                            isSelected ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded flex items-center justify-center border text-xs font-bold shrink-0 mt-0.5 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                            {isSelected ? '✓' : ''}
                          </div>
                          <div className="pt-0.5">
                            <span className="font-bold mr-2 text-slate-800">{opt.key}.</span>
                            <MathRenderer content={opt.text} />
                            {opt.image_url && <img src={opt.image_url} alt={`Gambar ${opt.key}`} className="max-h-32 rounded mt-2 border" />}
                          </div>
                        </button>
                      )
                    })}
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
                        {currentQuestion.options?.map((st: { id: string; text: string }) => {
                          const userObj = typeof userAnswers[currentQuestion.id] === 'object' && !Array.isArray(userAnswers[currentQuestion.id])
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
                                  onChange={() => handleSelectMatrixOption(currentQuestion.id, st.id, 'Benar')}
                                  className="w-4 h-4 text-indigo-600"
                                />
                              </td>
                              <td className="p-4 text-center border-l">
                                <input
                                  type="radio"
                                  name={`st_${currentQuestion.id}_${st.id}`}
                                  checked={selectedVal === 'Salah'}
                                  onChange={() => handleSelectMatrixOption(currentQuestion.id, st.id, 'Salah')}
                                  className="w-4 h-4 text-indigo-600"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Navigasi Bawah */}
              <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-100">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg disabled:opacity-50 hover:bg-slate-200 transition-colors"
                >
                  ← Sebelumnya
                </button>

                {currentIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Menyimpan...' : 'Selesaikan Ujian'}
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Selanjutnya →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Navigasi Nomor Soal */}
        {!isSubmitted && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Nomor Soal</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!userAnswers[q.id] && (
                  Array.isArray(userAnswers[q.id]) ? userAnswers[q.id].length > 0 : true
                )
                const isFlagged = !!flagged[q.id]
                const isCurrent = idx === currentIndex

                let btnClass = 'bg-slate-100 text-slate-600 border-slate-200'
                if (isFlagged) {
                  btnClass = 'bg-amber-500 text-white border-amber-600'
                } else if (isAnswered) {
                  btnClass = 'bg-indigo-600 text-white border-indigo-700'
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-lg text-xs font-bold border transition-all ${btnClass} ${
                      isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-xs space-y-2 text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-indigo-600 rounded"></span>
                <span>Sudah Dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-500 rounded"></span>
                <span>Ragu-Ragu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-slate-100 border rounded"></span>
                <span>Belum Dijawab</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function ExamSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans"><p className="text-slate-600 font-medium">Memuat sesi ujian...</p></div>}>
      <ExamContent />
    </Suspense>
  )
}