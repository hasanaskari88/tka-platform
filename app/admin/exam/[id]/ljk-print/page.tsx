'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function LjkPrintContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadExamData() {
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

      if (examData) setExam(examData)
      if (questionData) setQuestions(questionData)
      setLoading(false)
    }

    loadExamData()
  }, [examId])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-slate-600 font-medium">Memuat LJK 1 Halaman...</p>
      </div>
    )
  }

  const qrData = JSON.stringify({ exam_id: examId, code: exam?.token_code || 'EXAM' })
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`

  // Bagi soal ke dalam 3 Kolom Sejajar (Max 10 soal per kolom agar muat pas)
  const totalQuestions = questions.length
  const itemsPerCol = Math.ceil(Math.max(totalQuestions, 30) / 3)
  const col1 = questions.slice(0, itemsPerCol)
  const col2 = questions.slice(itemsPerCol, itemsPerCol * 2)
  const col3 = questions.slice(itemsPerCol * 2)

  const columnsData = [
    { offset: 0, items: col1 },
    { offset: itemsPerCol, items: col2 },
    { offset: itemsPerCol * 2, items: col3 },
  ]

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-8">
      {/* ATURAN STYLESHEET STRICT 1 HALAMAN A4 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 4mm 4mm 4mm;
          }
          html, body {
            height: 100%;
            overflow: hidden !important;
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .ljk-single-page {
            border: 2px solid #000 !important;
            box-shadow: none !important;
            max-height: 287mm !important;
            height: 287mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ACTION BAR SCREEN BIASA */}
      <div className="no-print bg-slate-900 text-white p-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-sm font-bold">📄 LJK Ultra-Simpel (Pasti 1 Halaman A4)</h1>
            <p className="text-[11px] text-slate-300">Ujian: {exam?.title}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition-colors"
            >
              🖨️ Cetak (1 Halaman A4)
            </button>
            <Link
              href={`/admin/exam/${examId}`}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              ← Kembali
            </Link>
          </div>
        </div>
      </div>

      {/* KONTEN UTAMA LJK 1 HALAMAN A4 */}
      <div className="max-w-[205mm] mx-auto my-4 bg-white p-4 shadow-xl ljk-single-page border-2 border-black relative text-black font-serif text-[10px] select-none flex flex-col justify-between">
        {/* ⬛ 4 ANCHOR MARKS UNTUK OMR */}
        <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-black"></div>
        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-black"></div>
        <div className="absolute bottom-1.5 left-1.5 w-4 h-4 bg-black"></div>
        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-black"></div>

        <div>
          {/* KOP RINGKAS */}
          <div className="border-b-2 border-black pb-1 mb-2 text-center">
            <h3 className="text-[9px] font-bold uppercase tracking-wider leading-none">
              DINAS PENDIDIKAN KABUPATEN SEMARANG
            </h3>
            <h2 className="text-sm font-black uppercase tracking-wide my-0.5 leading-none">
              LEMBAR JAWAB KOMPUTER (LJK) - SD NEGERI GETASAN
            </h2>
            <p className="text-[8px] italic leading-none">Jl. P. Diponegoro Km 6, Getasan, Kab. Semarang</p>
          </div>

          {/* INFORMASI SISWA & QR CODE */}
          <div className="grid grid-cols-12 gap-2 border border-black p-2 mb-2 bg-slate-50/50">
            <div className="col-span-9 space-y-1">
              <div className="flex items-center space-x-1">
                <span className="w-20 font-bold text-[9px]">NAMA SISWA</span>
                <span>:</span>
                <div className="border-b border-dotted border-black flex-1 h-3.5"></div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-20 font-bold text-[9px]">NISN / NO UJIAN</span>
                <span>:</span>
                <div className="border-b border-dotted border-black flex-1 h-3.5"></div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-20 font-bold text-[9px]">MAPEL / KELAS</span>
                <span>:</span>
                <span className="font-bold uppercase text-[9px]">
                  {exam?.subtest || 'UMUM'} | SD NEGERI GETASAN
                </span>
              </div>
            </div>

            <div className="col-span-3 flex flex-col items-center justify-center border-l border-black pl-1">
              <img src={qrUrl} alt="QR Code" className="w-14 h-14 border border-black p-0.5 bg-white" />
              <span className="text-[7px] font-mono mt-0.5 font-bold">OMR-ID</span>
            </div>
          </div>

          {/* PETUNJUK RINGKAS */}
          <div className="border border-black px-2 py-1 mb-2 text-[8px] bg-slate-100 flex justify-between items-center">
            <span><b>PETUNJUK:</b> Hitamkan/Silang bulatan (⬛ / ✖) pada opsi jawaban.</span>
            <div className="flex items-center space-x-2 font-bold text-[7px]">
              <span>[PG/PGK: A-B-C-D]</span>
              <span>[Matriks: B-S]</span>
            </div>
          </div>

          {/* GRID JAWABAN 3 KOLOM SEJAJAR */}
          <div className="grid grid-cols-3 gap-2 border border-black p-2 bg-white">
            {columnsData.map((col, colIdx) => (
              <div
                key={colIdx}
                className="space-y-1 border-r last:border-r-0 border-slate-300 pr-1.5"
              >
                <div className="flex justify-between font-bold border-b border-black pb-0.5 text-[8px] text-slate-700">
                  <span>NO</span>
                  <span>BULATAN JAWABAN OMR</span>
                </div>

                {col.items.map((q, idx) => {
                  const no = col.offset + idx + 1
                  const qType = q.question_type || 'multiple_choice'

                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between border-b border-slate-100 py-0.5"
                    >
                      <span className="font-bold text-[9px] w-5">{no}.</span>

                      {/* A. PG & PG KOMPLEKS */}
                      {(qType === 'multiple_choice' || qType === 'complex_multiple_choice') && (
                        <div className="flex items-center space-x-2">
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <div
                              key={opt}
                              className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[7px] font-sans font-bold"
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* B. MATRIKS BENAR / SALAH */}
                      {qType === 'true_false_matrix' && (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[7px] italic text-slate-500">Mtrx:</span>
                          <div className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[6px] font-bold bg-slate-50">
                            B
                          </div>
                          <div className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[6px] font-bold bg-slate-50">
                            S
                          </div>
                        </div>
                      )}

                      {/* C. ESSAY / URAIAN */}
                      {qType === 'essay' && (
                        <div className="w-24 border border-dotted border-black h-3.5 rounded flex items-center justify-center text-[6px] text-slate-400 italic">
                          [ Esai ]
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* TANDA TANGAN DI BAGIAN BAWAH */}
        <div className="flex justify-between items-end text-[8px] pt-2 border-t border-slate-300">
          <div className="text-center w-28">
            <p>Tanda Tangan Siswa,</p>
            <div className="h-6"></div>
            <p className="border-b border-black font-bold">( ............................. )</p>
          </div>
          <div className="text-center w-36">
            <p>Getasan, ......................... 2026</p>
            <p>Pengawas Ujian,</p>
            <div className="h-6"></div>
            <p className="border-b border-black font-bold">( ............................. )</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LjkPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Memuat form...</div>}>
      <LjkPrintContent />
    </Suspense>
  )
}