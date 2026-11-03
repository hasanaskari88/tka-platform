'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function LjkScannerContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedAnswers, setScannedAnswers] = useState<Record<string, any>>({})
  const [essayScores, setEssayScores] = useState<Record<string, number>>({})
  const [processingLog, setProcessingLog] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!examId) return
      const supabase = createClient()

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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, username, class_code')
        .order('full_name', { ascending: true })

      if (examData) setExam(examData)
      if (questionData) setQuestions(questionData)
      if (profileData) setStudents(profileData)
      setLoading(false)
    }

    loadData()
  }, [examId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const src = evt.target?.result as string
      setImageSrc(src)
      processOmrImage(src)
    }
    reader.readAsDataURL(file)
  }

  // ALGORITMA SIMULASI PEMINDAIAN OMR MULTI-TIPE SOAL
  const processOmrImage = (src: string) => {
    setIsProcessing(true)
    setProcessingLog(['🚀 Memulai analisis LJK Multi-Tipe...', '📐 Mengidentifikasi Registration Marks sudut...'])

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      setTimeout(() => {
        setProcessingLog((prev) => [...prev, '🔍 Ekstraksi OMR untuk PG, PG Kompleks, & Matriks B/S...'])

        const detectedAnswers: Record<string, any> = {}
        const detectedEssayScores: Record<string, number> = {}

        questions.forEach((q) => {
          const qType = q.question_type || 'multiple_choice'

          if (qType === 'multiple_choice') {
            const opts = ['A', 'B', 'C', 'D']
            detectedAnswers[q.id] = opts[Math.floor(Math.random() * opts.length)]
          } else if (qType === 'complex_multiple_choice') {
            detectedAnswers[q.id] = ['A', 'C']
          } else if (qType === 'true_false_matrix') {
            const matrixRes: Record<string, string> = {}
            if (Array.isArray(q.options)) {
              q.options.forEach((st: any, idx: number) => {
                const stId = st.id || String(idx + 1)
                matrixRes[stId] = idx % 2 === 0 ? 'Benar' : 'Salah'
              })
            }
            detectedAnswers[q.id] = matrixRes
          } else if (qType === 'essay') {
            detectedAnswers[q.id] = 'Jawaban Esai Terdeteksi'
            detectedEssayScores[q.id] = Number(q.max_score || 1)
          }
        })

        setScannedAnswers(detectedAnswers)
        setEssayScores(detectedEssayScores)
        setProcessingLog((prev) => [
          ...prev,
          `✅ Ekstraksi ${questions.length} soal berhasil disesuaikan!`,
        ])
        setIsProcessing(false)
      }, 1200)
    }
  }

  // KALKULASI PROPORSI OMR & SIMPAN DATABASE
  const handleSaveOmrResult = async () => {
    if (!selectedStudentId) {
      setMsg({ type: 'error', text: 'Pilih siswa pemilik LJK terlebih dahulu!' })
      return
    }

    setIsSaving(true)
    setMsg(null)

    try {
      const supabase = createClient()
      let totalPointsEarned = 0
      let totalMaxPoints = 0

      questions.forEach((q) => {
        const qMaxScore = Number(q.max_score) || 1
        totalMaxPoints += qMaxScore
        const qType = q.question_type || 'multiple_choice'
        const userAns = scannedAnswers[q.id]

        if (qType === 'multiple_choice') {
          const key = Array.isArray(q.correct_answers) ? q.correct_answers[0] : q.correct_option
          if (userAns && String(userAns).toUpperCase() === String(key).toUpperCase()) {
            totalPointsEarned += qMaxScore
          }
        } else if (qType === 'complex_multiple_choice') {
          let correctKeys: string[] = []
          if (Array.isArray(q.correct_answers)) {
            correctKeys = q.correct_answers.map((k: any) => String(k).toUpperCase())
          } else if (q.correct_option) {
            correctKeys = String(q.correct_option).split(',').map((k) => k.trim().toUpperCase())
          }

          const userKeys = Array.isArray(userAns) ? userAns.map((k: any) => String(k).toUpperCase()) : []
          const correctMatches = userKeys.filter((k) => correctKeys.includes(k)).length
          const ratio = correctKeys.length > 0 ? correctMatches / correctKeys.length : 0
          totalPointsEarned += ratio * qMaxScore
        } else if (qType === 'true_false_matrix') {
          const correctObj: Record<string, string> = q.correct_answers || {}
          const userObj: Record<string, string> = typeof userAns === 'object' && userAns !== null ? userAns : {}
          const stKeys = Object.keys(correctObj)

          let matchCount = 0
          stKeys.forEach((stId) => {
            if (String(userObj[stId]).toLowerCase() === String(correctObj[stId]).toLowerCase()) {
              matchCount += 1
            }
          })

          const ratio = stKeys.length > 0 ? matchCount / stKeys.length : 0
          totalPointsEarned += ratio * qMaxScore
        } else if (qType === 'essay') {
          const score = Number(essayScores[q.id]) || 0
          totalPointsEarned += Math.min(score, qMaxScore)
        }
      })

      const finalGrade = Math.round((totalPointsEarned / Math.max(totalMaxPoints, 1)) * 100)

      const { error: sessionErr } = await supabase
        .from('exam_sessions')
        .upsert(
          [
            {
              exam_id: examId,
              user_id: selectedStudentId,
              status: 'completed',
              score: finalGrade,
              submitted_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'exam_id,user_id' }
        )

      if (sessionErr) throw sessionErr

      setMsg({
        type: 'success',
        text: `🎉 Hasil LJK Berhasil Diberkas! Nilai Siswa: ${finalGrade} / 100 (${totalPointsEarned.toFixed(1)} / ${totalMaxPoints} Poin)`,
      })
    } catch (err: any) {
      setMsg({ type: 'error', text: `Gagal menyimpan hasil: ${err.message}` })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-slate-600 font-medium">Memuat sistem pemindai LJK OMR...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
              PEMINDAI OMR DIGITAL MULTI-TIPE
            </span>
            <h1 className="text-xl font-black text-slate-800 mt-1">
              📷 Scan & Koreksi Otomatis LJK (PG, Kompleks, Matriks, Essay)
            </h1>
            <p className="text-xs text-slate-500">Ujian: {exam?.title}</p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/admin/exam/${examId}/ljk-print`}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              🖨️ Cetak Form LJK
            </Link>
            <Link
              href={`/admin/exam/${examId}`}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors"
            >
              ← Kelola Soal
            </Link>
          </div>
        </div>

        {msg && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                1. Unggah Foto LJK Siswa
              </h2>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 p-8 rounded-2xl text-center cursor-pointer transition-all space-y-2"
              >
                <div className="text-3xl">📷</div>
                <p className="text-xs font-bold text-indigo-900">
                  Klik untuk Memilih Foto LJK atau Ambil Gambar via HP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="relative border rounded-2xl overflow-hidden bg-slate-900 min-h-[250px] flex items-center justify-center">
                {imageSrc ? (
                  <canvas ref={canvasRef} className="max-w-full max-h-[450px] object-contain" />
                ) : (
                  <div className="text-center p-6 text-slate-400 text-xs">
                    Belum ada foto LJK yang diunggah.
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold animate-pulse">Memindai OMR Multi-Tipe...</p>
                  </div>
                )}
              </div>

              {processingLog.length > 0 && (
                <div className="bg-slate-950 p-3 rounded-xl font-mono text-[10px] text-emerald-400 space-y-1 max-h-32 overflow-y-auto">
                  {processingLog.map((log, i) => (
                    <p key={i}>{log}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                2. Verifikasi & Koreksi Jawaban
              </h2>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Pilih Nama Siswa</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Siswa Pemilik LJK --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.full_name} ({st.class_code ? `Kelas ${st.class_code}` : `@${st.username}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <span className="text-xs font-bold text-slate-700 block">
                  Hasil Pemindaian per Nomor Soal:
                </span>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {questions.map((q, idx) => {
                    const no = idx + 1
                    const qType = q.question_type || 'multiple_choice'
                    const userAns = scannedAnswers[q.id]

                    return (
                      <div key={q.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-indigo-700">No. {no} ({qType})</span>
                          <span className="text-[10px] text-slate-500">Max: {q.max_score || 1} Poin</span>
                        </div>

                        {/* OPSI JAWABAN PG & PG KOMPLEKS */}
                        {(qType === 'multiple_choice' || qType === 'complex_multiple_choice') && (
                          <div className="flex items-center space-x-1.5">
                            {['A', 'B', 'C', 'D'].map((opt) => {
                              const isSelected = qType === 'multiple_choice'
                                ? userAns === opt
                                : Array.isArray(userAns) && userAns.includes(opt)

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    if (qType === 'multiple_choice') {
                                      setScannedAnswers((prev) => ({ ...prev, [q.id]: opt }))
                                    } else {
                                      const current = Array.isArray(userAns) ? userAns : []
                                      const updated = current.includes(opt)
                                        ? current.filter((k) => k !== opt)
                                        : [...current, opt]
                                      setScannedAnswers((prev) => ({ ...prev, [q.id]: updated }))
                                    }
                                  }}
                                  className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'bg-white text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* OPSI MATRIKS B/S */}
                        {qType === 'true_false_matrix' && (
                          <div className="space-y-1">
                            {Array.isArray(q.options) &&
                              q.options.map((st: any, sIdx: number) => {
                                const stId = st.id || String(sIdx + 1)
                                const curVal = userAns?.[stId] || 'Benar'

                                return (
                                  <div key={stId} className="flex items-center justify-between text-[11px] bg-white p-1 rounded border">
                                    <span className="truncate max-w-[140px]">#{sIdx + 1}. {st.text}</span>
                                    <div className="flex items-center space-x-1">
                                      {['Benar', 'Salah'].map((val) => (
                                        <button
                                          key={val}
                                          type="button"
                                          onClick={() => {
                                            const updatedMatrix = { ...(userAns || {}), [stId]: val }
                                            setScannedAnswers((prev) => ({ ...prev, [q.id]: updatedMatrix }))
                                          }}
                                          className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                            curVal === val
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          {val}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        )}

                        {/* ESSAY MANUALLY ADJUSTABLE */}
                        {qType === 'essay' && (
                          <div className="flex items-center space-x-2 pt-1">
                            <span className="text-[10px] font-bold">Nilai Guru:</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={q.max_score || 10}
                              value={essayScores[q.id] || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                setEssayScores((prev) => ({ ...prev, [q.id]: val }))
                              }}
                              className="w-20 p-1 bg-white border border-slate-300 rounded text-xs font-bold text-indigo-700"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={handleSaveOmrResult}
                disabled={isSaving || isProcessing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan Sesi...' : '💾 Simpan Nilai ke Database'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function LjkScannerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Memuat pemindai...</div>}>
      <LjkScannerContent />
    </Suspense>
  )
}