'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Helper mengekstrak daftar pernyataan matriks
function getStatementsList(q: any) {
  let opts = q.options
  if (typeof opts === 'string') {
    try {
      opts = JSON.parse(opts)
    } catch (e) {
      opts = []
    }
  }
  if (!Array.isArray(opts) || opts.length === 0) {
    return [
      { id: '1', text: 'Pernyataan 1' },
      { id: '2', text: 'Pernyataan 2' },
    ]
  }
  return opts.map((st: any, idx: number) => ({
    id: String(st.id || idx + 1),
    text: typeof st === 'string' ? st : String(st.text || `Pernyataan ${idx + 1}`),
  }))
}

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
        <p className="text-slate-600 font-medium">Memuat LJK Presisi Terkelompok...</p>
      </div>
    )
  }

  const qrData = JSON.stringify({ exam_id: examId, code: exam?.token_code || 'EXAM' })
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`

  // Sedia data soal dengan indeks asli
  const indexedQuestions = questions.map((q, idx) => ({ ...q, originalNo: idx + 1 }))

  // Grouping berdasarkan jenis soal
  const pgQuestions = indexedQuestions.filter(
    (q) => (q.question_type || 'multiple_choice') === 'multiple_choice' || q.question_type === 'complex_multiple_choice'
  )
  const matrixQuestions = indexedQuestions.filter(
    (q) => q.question_type === 'true_false_matrix'
  )
  const essayQuestions = indexedQuestions.filter(
    (q) => q.question_type === 'essay'
  )

  // Distribusi PG ke 3 Kolom
  const pgPerCol = Math.ceil(pgQuestions.length / 3)
  const pgCol1 = pgQuestions.slice(0, pgPerCol)
  const pgCol2 = pgQuestions.slice(pgPerCol, pgPerCol * 2)
  const pgCol3 = pgQuestions.slice(pgPerCol * 2)
  const pgColumns = [pgCol1, pgCol2, pgCol3].filter((col) => col.length > 0)

  // Distribusi Matriks ke 2 Kolom (jika ada)
  const matrixPerCol = Math.ceil(matrixQuestions.length / 2)
  const matrixCol1 = matrixQuestions.slice(0, matrixPerCol)
  const matrixCol2 = matrixQuestions.slice(matrixPerCol)
  const matrixColumns = [matrixCol1, matrixCol2].filter((col) => col.length > 0)

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-8">
      {/* ATURAN STYLESHEET PRESI KETAT 1 HALAMAN A4 */}
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
            max-height: 285mm !important;
            height: 285mm !important;
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
            <h1 className="text-sm font-bold">📄 LJK Terkelompok (Presisi Layout 1 Halaman A4)</h1>
            <p className="text-[11px] text-slate-300">Ujian: {exam?.title}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition-colors"
            >
              🖨️ Cetak LJK (A4)
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

        <div className="space-y-2">
          {/* KOP SEKOLAH */}
          <div className="border-b-2 border-black pb-1 text-center">
            <h3 className="text-[9px] font-bold uppercase tracking-wider leading-none">
              DINAS PENDIDIKAN KABUPATEN SEMARANG
            </h3>
            <h2 className="text-sm font-black uppercase tracking-wide my-0.5 leading-none">
              LEMBAR JAWAB KOMPUTER (LJK) - SD NEGERI GETASAN
            </h2>
            <p className="text-[8px] italic leading-none">Jl. P. Diponegoro Km 6, Getasan, Kab. Semarang</p>
          </div>

          {/* INFORMASI SISWA & QR CODE */}
          <div className="grid grid-cols-12 gap-2 border border-black p-2 bg-slate-50/50">
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
              <img src={qrUrl} alt="QR Code" className="w-12 h-12 border border-black p-0.5 bg-white" />
              <span className="text-[7px] font-mono mt-0.5 font-bold">OMR-ID</span>
            </div>
          </div>

          {/* PETUNJUK RINGKAS */}
          <div className="border border-black px-2 py-0.5 text-[8px] bg-slate-100 flex justify-between items-center">
            <span><b>PETUNJUK:</b> Hitamkan/Silang bulatan (⬛ / ✖) secara penuh.</span>
            <div className="flex items-center space-x-2 font-bold text-[7px]">
              <span>[PG/PGK: A-B-C-D]</span>
              <span>[Matriks: B-S]</span>
            </div>
          </div>

          {/* BAGIAN I: PILIHAN GANDA & PG KOMPLEKS (GRID KOLOM RAPI) */}
          {pgQuestions.length > 0 && (
            <div className="border border-black p-1.5 bg-white">
              <div className="text-[8px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-slate-100 px-1 flex justify-between">
                <span>BAGIAN I: PILIHAN GANDA & PG KOMPLEKS</span>
                <span className="font-normal text-[7px]">Bulatan OMR (A, B, C, D)</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {pgColumns.map((colItems, colIdx) => (
                  <div key={colIdx} className="space-y-0.5 border-r last:border-r-0 border-slate-300 pr-1">
                    <div className="flex justify-between font-bold border-b border-slate-300 pb-0.5 text-[7px] text-slate-600">
                      <span>NO</span>
                      <span>OPSI JAWABAN</span>
                    </div>

                    {colItems.map((q) => (
                      <div key={q.id} className="flex items-center justify-between border-b border-slate-100 py-0.5">
                        <span className="font-bold text-[9px] w-5">No. {q.originalNo}</span>
                        <div className="flex items-center space-x-1.5">
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <div
                              key={opt}
                              className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[7px] font-sans font-bold bg-white"
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BAGIAN II: MATRIKS BENAR / SALAH (KELOMPOK KHUSUS 2 KOLOM) */}
          {matrixQuestions.length > 0 && (
            <div className="border border-black p-1.5 bg-white">
              <div className="text-[8px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-slate-100 px-1 flex justify-between">
                <span>BAGIAN II: SOAL MATRIKS (BENAR / SALAH)</span>
                <span className="font-normal text-[7px]">Hitamkan B (Benar) / S (Salah)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {matrixColumns.map((colItems, colIdx) => (
                  <div key={colIdx} className="space-y-1.5 border-r last:border-r-0 border-slate-300 pr-1">
                    {colItems.map((q) => (
                      <div key={q.id} className="border border-slate-200 p-1 rounded bg-slate-50/50 space-y-0.5">
                        <span className="font-bold text-[8px] text-indigo-900 block border-b border-slate-200 pb-0.5">
                          Soal No. {q.originalNo} (Matriks)
                        </span>

                        <div className="space-y-0.5 pt-0.5">
                          {getStatementsList(q).map((st: any, sIdx: number) => (
                            <div
                              key={st.id || sIdx}
                              className="flex items-center justify-between text-[7px] bg-white px-1 py-0.5 rounded border border-slate-200"
                            >
                              <span className="font-semibold text-slate-800 truncate max-w-[130px]" title={st.text}>
                                #{sIdx + 1}. {st.text.length > 20 ? st.text.substring(0, 20) + '...' : st.text}
                              </span>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <div className="flex items-center space-x-0.5">
                                  <div className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[7px] font-bold bg-white">
                                    B
                                  </div>
                                </div>
                                <div className="flex items-center space-x-0.5">
                                  <div className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[7px] font-bold bg-white">
                                    S
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BAGIAN III: ESSAY / URAIAN (JIKA ADA) */}
          {essayQuestions.length > 0 && (
            <div className="border border-black p-1.5 bg-white">
              <div className="text-[8px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-slate-100 px-1">
                BAGIAN III: ESSAY / URAIAN
              </div>
              <div className="grid grid-cols-2 gap-2">
                {essayQuestions.map((q) => (
                  <div key={q.id} className="border border-dotted border-black p-1 rounded flex items-center justify-between">
                    <span className="font-bold text-[8px]">Soal No. {q.originalNo} (Esai)</span>
                    <span className="text-[7px] italic text-slate-400">[ Dijawab pada Lembar Esai ]</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TANDA TANGAN DI BAGIAN BAWAH */}
        <div className="flex justify-between items-end text-[8px] pt-1 border-t border-slate-300 mt-1">
          <div className="text-center w-28">
            <p>Tanda Tangan Siswa,</p>
            <div className="h-5"></div>
            <p className="border-b border-black font-bold">( ............................. )</p>
          </div>
          <div className="text-center w-36">
            <p>Getasan, ......................... 2026</p>
            <p>Pengawas Ujian,</p>
            <div className="h-5"></div>
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