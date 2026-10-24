'use client'

import { useEffect, useState, Suspense } from 'react'
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
  
  // State Jawaban Siswa & Ragu-ragu
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [key: string]: boolean }>({})
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Helper Acak Array
  const shuffleArray = (array: any[]) => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  const loadExamData = async () => {
    if (!examId) return
    const supabase = createClient()

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

    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    if (questionData) {
      let processedQuestions = [...questionData]

      if (examData.shuffle_questions) {
        processedQuestions = shuffleArray(processedQuestions)
      }

      if (examData.shuffle_options) {
        processedQuestions = processedQuestions.map((q) => {
          if (
            (q.question_type === 'multiple_choice' || q.question_type === 'complex_multiple_choice') &&
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
    }

    setExam(examData)
    setTimeLeft((examData.duration_minutes || 15) * 60)
    setLoading(false)
  }

  useEffect(() => {
    loadExamData()
  }, [examId])

  // Timer Countdown Ujian
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer)
          handleFinishExam(true) // Auto finish saat waktu habis
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

  // Handler Jawaban Pilihan Ganda Biasa
  const handleSelectSingleOption = (questionId: string, optKey: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optKey,
    }))
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
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: updated,
    }))
  }

  // Handler Jawaban Matriks Benar-Salah
  const handleSelectMatrixValue = (questionId: string, statementId: string, val: 'Benar' | 'Salah') => {
    const currentMatrix = typeof userAnswers[questionId] === 'object' && !Array.isArray(userAnswers[questionId])
      ? userAnswers[questionId]
      : {}
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...currentMatrix,
        [statementId]: val,
      },
    }))
  }

  // Handler Jawaban Essay
  const handleEssayChange = (questionId: string, text: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }))
  }

  // Handler Ragu-Ragu
  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }))
  }

  // Selesaikan Ujian & Simpan Hasil
  const handleFinishExam = async (autoFinish = false) => {
    if (isSubmitting) return
    if (!autoFinish && !confirm('Apakah Anda yakin ingin menyelesaikan ujian ini?')) return

    setIsSubmitting(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Hitung Skor Otomatis untuk PG, PG Kompleks, dan Matriks
    let earnedScore = 0
    questions.forEach((q) => {
      const qType = q.question_type || 'multiple_choice'
      const userAns = userAnswers[q.id]

      if (qType === 'multiple_choice') {
        if (userAns && String(userAns).trim().toUpperCase() === String(q.correct_option).trim().toUpperCase()) {
          earnedScore += Number(q.max_score) || 1
        }
      } else if (qType === 'complex_multiple_choice') {
        if (Array.isArray(userAns) && Array.isArray(q.correct_answers)) {
          const sortedUser = [...userAns].sort().join(',')
          const sortedKey = [...q.correct_answers].sort().join(',')
          if (sortedUser === sortedKey) {
            earnedScore += Number(q.max_score) || 1
          }
        }
      } else if (qType === 'true_false_matrix') {
        if (userAns && typeof userAns === 'object' && q.correct_answers) {
          let isAllCorrect = true
          const stKeys = Object.keys(q.correct_answers)
          if (stKeys.length === 0) isAllCorrect = false

          for (const key of stKeys) {
            if (userAns[key] !== q.correct_answers[key]) {
              isAllCorrect = false
              break
            }
          }
          if (isAllCorrect) {
            earnedScore += Number(q.max_score) || 1
          }
        }
      }
      // Note: Essay dinilai manual oleh Admin/Guru
    })

    const nowIso = new Date().toISOString()

    // 1. Simpan Sesi Ujian
    const { data: session, error: sessionErr } = await supabase
      .from('exam_sessions')
      .insert([
        {
          exam_id: examId,
          user_id: user?.id || null,
          status: 'completed',
          score: earnedScore,
          submitted_at: nowIso,
          completed_at: nowIso,
        },
      ])
      .select()
      .single()

    if (sessionErr || !session) {
      alert(`Gagal menyimpan hasil ujian: ${sessionErr?.message || 'Error'}`)
      setIsSubmitting(false)
      return
    }

    // 2. Simpan Detail Jawaban
    const answerRecords = questions.map((q) => ({
      session_id: session.id,
      question_id: q.id,
      user_answer: userAnswers[q.id] !== undefined ? userAnswers[q.id] : null,
    }))

    await supabase.from('answers').insert(answerRecords)

    // 3. Pindah ke Halaman Summary
    router.push(`/exam/${examId}/summary?session_id=${session.id}`)
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
              <div className="text-slate-800 text-sm font-medium leading-relaxed">
                <MathRenderer content={currentQuestion.question_text} />
              </div>

              {currentQuestion.image_url && (
                <div className="my-2">
                  <img src={currentQuestion.image_url} alt="Gambar Soal" className="max-h-60 rounded-xl border" />
                </div>
              )}

              {/* RENDER LEMBAR JAWAB SESUAI TIPE SOAL */}

              {/* 1. PILIHAN GANDA BIASA */}
              {qType === 'multiple_choice' && Array.isArray(currentQuestion.options) && (
                <div className="space-y-2 pt-2">
                  {currentQuestion.options.map((opt: any, oIdx: number) => {
                    const optKey = opt.key || String.fromCharCode(65 + oIdx)
                    const isSelected = userAnswers[currentQuestion.id] === optKey

                    return (
                      <button
                        key={optKey || oIdx}
                        onClick={() => handleSelectSingleOption(currentQuestion.id, optKey)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center space-x-3 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500 text-indigo-900 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                        suppressHydrationWarning
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {optKey}
                        </span>
                        <div className="flex-1">
                          <MathRenderer content={typeof opt === 'string' ? opt : opt.text} />
                          {opt.image_url && (
                            <img src={opt.image_url} alt={`Opsi ${optKey}`} className="max-h-24 mt-1 rounded border" />
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
                    const currentAns = Array.isArray(userAnswers[currentQuestion.id]) ? userAnswers[currentQuestion.id] : []
                    const isSelected = currentAns.includes(optKey)

                    return (
                      <button
                        key={optKey || oIdx}
                        onClick={() => handleToggleComplexOption(currentQuestion.id, optKey)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center space-x-3 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500 text-indigo-900 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                        suppressHydrationWarning
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={isSelected}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="font-bold text-xs shrink-0">{optKey}.</span>
                        <div className="flex-1">
                          <MathRenderer content={typeof opt === 'string' ? opt : opt.text} />
                          {opt.image_url && (
                            <img src={opt.image_url} alt={`Opsi ${optKey}`} className="max-h-24 mt-1 rounded border" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 3. MATRIKS BENAR - SALAH */}
              {qType === 'true_false_matrix' && Array.isArray(currentQuestion.options) && (
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                    ℹ️ Tentukan pilihan Benar atau Salah untuk setiap baris pernyataan di bawah ini.
                  </p>
                  <div className="border rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 border-b font-bold text-slate-700">
                        <tr>
                          <th className="p-3">Pernyataan</th>
                          <th className="p-3 w-32 text-center border-l">Pilihan Jawaban</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {currentQuestion.options.map((st: any, sIdx: number) => {
                          const stId = String(st.id || sIdx + 1)
                          const currentMatrix = typeof userAnswers[currentQuestion.id] === 'object' ? userAnswers[currentQuestion.id] : {}
                          const selectedVal = currentMatrix?.[stId]

                          return (
                            <tr key={stId || sIdx} className="hover:bg-slate-50">
                              <td className="p-3">
                                <MathRenderer content={typeof st === 'string' ? st : st.text} />
                                {st.image_url && (
                                  <img src={st.image_url} alt="Gambar Pernyataan" className="max-h-24 mt-1 rounded border" />
                                )}
                              </td>
                              <td className="p-3 border-l">
                                <div className="flex justify-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectMatrixValue(currentQuestion.id, stId, 'Benar')}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                                      selectedVal === 'Benar'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                                    suppressHydrationWarning
                                  >
                                    Benar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectMatrixValue(currentQuestion.id, stId, 'Salah')}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                                      selectedVal === 'Salah'
                                        ? 'bg-rose-600 text-white shadow-sm'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
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
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Lembar Jawaban Essay Anda:
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Tuliskan jawaban lengkap Anda di sini..."
                    value={userAnswers[currentQuestion.id] || ''}
                    onChange={(e) => handleEssayChange(currentQuestion.id, e.target.value)}
                    className="w-full p-3.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                    suppressHydrationWarning
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-10">Belum ada soal pada ujian ini.</p>
          )}

          {/* NAVIGASI SEBELUMNYA / SELANJUTNYA */}
          <div className="flex justify-between items-center pt-4 border-t">
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
              const isAnswered = ans !== undefined && ans !== null && (Array.isArray(ans) ? ans.length > 0 : true)
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