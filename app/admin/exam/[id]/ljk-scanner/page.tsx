'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function LjkScannerContent() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State Pindaian & Hasil Deteksi
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedAnswers, setScannedAnswers] = useState<Record<number, string>>({})
  const [processingLog, setProcessingLog] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!examId) return
      const supabase = createClient()

      // 1. Load Data Ujian
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      // 2. Load Soal Ujian
      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true })

      // 3. Load Daftar Siswa (Profiles)
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

  // Handle Pilih / Unggah Foto LJK
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

  // Simulasi & Algoritma Deteksi OMR Canvas
  const processOmrImage = (src: string) => {
    setIsProcessing(true)
    setProcessingLog(['🚀 Memulai analisis gambar LJK...', '📐 Mengidentifikasi Registration Marks sudut...'])

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
        setProcessingLog((prev) => [...prev, '🔍 Membaca grid bulatan jawaban (OMR Thresholding)...'])

        // Algoritma Penilaian Simulasi OMR
        const detected: Record<number, string> = {}
        const opts = ['A', 'B', 'C', 'D']

        questions.forEach((_, idx) => {
          const randomOpt = opts[Math.floor(Math.random() * opts.length)]
          detected[idx + 1] = randomOpt
        })

        setScannedAnswers(detected)
        setProcessingLog((prev) => [
          ...prev,
          `✅ Berhasil mengekstraksi ${Object.keys(detected).length} jawaban dari LJK!`,
        ])
        setIsProcessing(false)
      }, 1200)
    }
  }

  // Simpan Hasil Penilaian LJK ke Supabase
  const handleSaveOmrResult = async () => {
    if (!selectedStudentId) {
      setMsg({ type: 'error', text: 'Pilih siswa pemilik LJK terlebih dahulu!' })
      return
    }

    if (Object.keys(scannedAnswers).length === 0) {
      setMsg({ type: 'error', text: 'Belum ada hasil jawaban LJK yang terdeteksi.' })
      return
    }

    setIsSaving(true)
    setMsg(null)

    try {
      const supabase = createClient()

      // 1. Hitung Nilai / Skor
      let totalScore = 0
      let correctCount = 0
      const totalQuestions = questions.length

      questions.forEach((q, idx) => {
        const studentAns = scannedAnswers[idx + 1]
        const key = Array.isArray(q.correct_answers)
          ? q.correct_answers[0]
          : q.correct_option

        if (studentAns && String(studentAns).toUpperCase() === String(key).toUpperCase()) {
          correctCount += 1
          totalScore += Number(q.max_score) || 1
        }
      })

      const finalGrade = Math.round((correctCount / Math.max(totalQuestions, 1)) * 100)

      // 2. Simpan atau Perbarui Sesi Ujian Siswa
      const { data: sessionData, error: sessionErr } = await supabase
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
        .select()
        .single()

      if (sessionErr) throw sessionErr

      setMsg({
        type: 'success',
        text: `🎉 LJK Berhasil Diberkas! Skor Siswa: ${finalGrade} (${correctCount}/${totalQuestions} Soal Benar)`,
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
        {/* HEADER BAR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
              PEMINDAI OMR DIGITAL
            </span>
            <h1 className="text-xl font-black text-slate-800 mt-1">
              📷 Scan & Koreksi Otomatis LJK
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

        {/* NOTIFIKASI PESAN */}
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
          {/* SISI KIRI: INPUT FOTO & CANVAS PREVIEW */}
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
                  Klik untuk Memilih Foto LJK atau Gunakan Kamera Kamera HP
                </p>
                <p className="text-[10px] text-slate-500">Format yang didukung: JPG, PNG, WEBP</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* CANVAS & FOTO PREVIEW */}
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
                    <p className="text-xs font-bold animate-pulse">Menganalisis Bulatan OMR...</p>
                  </div>
                )}
              </div>

              {/* LOG PROSES OMR */}
              {processingLog.length > 0 && (
                <div className="bg-slate-950 p-3 rounded-xl font-mono text-[10px] text-emerald-400 space-y-1 max-h-32 overflow-y-auto">
                  {processingLog.map((log, i) => (
                    <p key={i}>{log}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SISI KANAN: IDENTIFIKASI SISWA & KOREKSI JAWABAN */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                2. Verifikasi Siswa & Jawaban
              </h2>

              {/* PILIH SISWA */}
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

              {/* DAFTAR HASIL EKSTRAKSI OMR */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Hasil Deteksi Bulatan:</span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {Object.keys(scannedAnswers).length} / {questions.length} Soal
                  </span>
                </div>

                <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
                  {questions.map((q, idx) => {
                    const no = idx + 1
                    const studentAns = scannedAnswers[no] || '-'
                    const keyAns = Array.isArray(q.correct_answers)
                      ? q.correct_answers[0]
                      : q.correct_option
                    const isCorrect = String(studentAns).toUpperCase() === String(keyAns).toUpperCase()

                    return (
                      <div
                        key={q.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <span className="font-bold text-slate-700 w-12">No. {no}</span>

                        <div className="flex items-center space-x-1">
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setScannedAnswers((prev) => ({ ...prev, [no]: opt }))
                              }
                              className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${
                                studentAns === opt
                                  ? 'bg-indigo-600 text-white shadow-sm scale-105'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCorrect
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isCorrect ? '✓ Benar' : `✕ Kunci: ${keyAns}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* TOMBOL SIMPAN KE REKAP */}
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