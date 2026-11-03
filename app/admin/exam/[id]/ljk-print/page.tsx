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
        <p className="text-slate-600 font-medium">Memuat LJK Presisi Grid Ultra-Kompak...</p>
      </div>
    )
  }

  const qrData = JSON.stringify({ exam_id: examId, code: exam?.token_code || 'EXAM' })
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrData)}`

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

  // Distribusi PG & PGK ke 4 KOLOM GRID (Ultra-Kompak)
  const pgPerCol = Math.ceil(pgQuestions.length / 4)
  const pgColumns = [
    pgQuestions.slice(0, pgPerCol),
    pgQuestions.slice(pgPerCol, pgPerCol * 2),
    pgQuestions.slice(pgPerCol * 2, pgPerCol * 3),
    pgQuestions.slice(pgPerCol * 3),
  ].filter((col) => col.length > 0)

  // Distribusi MATRIKS B/S ke 3 KOLOM GRID (Ultra-Kompak)
  const matrixPerCol = Math.ceil(matrixQuestions.length / 3)
  const matrixColumns = [
    matrixQuestions.slice(0, matrixPerCol),
    matrixQuestions.slice(matrixPerCol, matrixPerCol * 2),
    matrixQuestions.slice(matrixPerCol * 2),
  ].filter((col) => col.length > 0)

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-8">
      {/* ATURAN STYLESHEET STRICT 1 HALAMAN A4 PORTRAIT */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 3mm 3mm 3mm 3mm;
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
            max-height: 282mm !important;
            height: 282mm !important;
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
            <h1 className="text-sm font-bold">📄 LJK Presisi (Grid PG 4-Kolom & Matriks 3-Kolom)</h1>
            <p className="text-[11px] text-slate-300">Ujian: {exam?.title}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition-colors"
            >
              🖨️ Cetak LJK (A4 1 Halaman)
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
      <div className="max-w-[204mm] mx-auto my-3 bg-white p-3 shadow-xl ljk-single-page border-2 border-black relative text-black font-serif text-[9px] select-none flex flex-col justify-between">
        {/* ⬛ 4 ANCHOR MARKS UNTUK OMR */}
        <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-black"></div>
        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-black"></div>
        <div className="absolute bottom-1.5 left-1.5 w-4 h-4 bg-black"></div>
        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-black"></div>

        <div className="space-y-1.5">
          {/* KOP SEKOLAH KOMPAK */}
          <div className="border-b-2 border-black pb-0.5 text-center">
            <h3 className="text-[8.5px] font-bold uppercase tracking-wider leading-none">
              DINAS PENDIDIKAN KABUPATEN SEMARANG
            </h3>
            <h2 className="text-xs font-black uppercase tracking-wide my-0.5 leading-none">
              LEMBAR JAWAB KOMPUTER (LJK) - SD NEGERI GETASAN
            </h2>
            <p className="text-[7.5px] italic leading-none">Jl. P. Diponegoro Km 6, Getasan, Kab. Semarang (50774)</p>
          </div>

          {/* INFORMASI SISWA & QR CODE */}
          <div className="grid grid-cols-12 gap-1.5 border border-black p-1.5 bg-slate-50/50">
            <div className="col-span-9 space-y-0.5">
              <div className="flex items-center space-x-1">
                <span className="w-20 font-bold text-[8.5px]">NAMA SISWA</span>
                <span>:</span>
                <div className="border-b border-dotted border-black flex-1 h-3"></div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-20 font-bold text-[8.5px]">NISN / NO UJIAN</span>
                <span>:</span>
                <div className="border-b border-dotted border-black flex-1 h-3"></div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-20 font-bold text-[8.5px]">MAPEL / KELAS</span>
                <span>:</span>
                <span className="font-bold uppercase text-[8.5px]">
                  {exam?.subtest || 'UMUM'} | SD NEGERI GETASAN
                </span>
              </div>
            </div>

            <div className="col-span-3 flex flex-col items-center justify-center border-l border-black pl-1">
              <img src={qrUrl} alt="QR Code" className="w-10 h-10 border border-black p-0.5 bg-white" />
              <span className="text-[6.5px] font-mono mt-0.5 font-bold">OMR-ID</span>
            </div>
          </div>

          {/* PETUNJUK RINGKAS */}
          <div className="border border-black px-1.5 py-0.5 text-[7.5px] bg-slate-100 flex justify-between items-center">
            <span><b>PETUNJUK:</b> Hitamkan/Silang bulatan (⬛ / ✖) secara penuh pada opsi jawaban.</span>
            <div className="flex items-center space-x-2 font-bold text-[6.5px]">
              <span>[PG/PGK: A-B-C-D]</span>
              <span>[Matriks: B-S]</span>
            </div>
          </div>

          {/* BAGIAN I: PILIHAN GANDA & PG KOMPLEKS (4 KOLOM GRID) */}
          {pgQuestions.length > 0 && (
            <div className="border border-black p-1 bg-white">
              <div className="text-[7.5px] font-bold uppercase border-b border-black pb-0.5 mb-0.5 bg-slate-100 px-1 flex justify-between">
                <span>BAGIAN I: PILIHAN GANDA & PG KOMPLEKS</span>
                <span className="font-normal text-[6.5px]">Bulatan OMR (A, B, C, D)</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {pgColumns.map((colItems, colIdx) => (
                  <div key={colIdx} className="space-y-0.5 border-r last:border-r-0 border-slate-300 pr-1">
                    <div className="flex justify-between font-bold border-b border-slate-300 pb-0.5 text-[6.5px] text-slate-600">
                      <span>NO</span>
                      <span>OPSI JAWABAN</span>
                    </div>

                    {colItems.map((q) => (
                      <div key={q.id} className="flex items-center justify-between border-b border-slate-100 py-0.5">
                        <span className="font-bold text-[8px] w-4">No.{q.originalNo}</span>
                        <div className="flex items-center space-x-1">
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <div
                              key={opt}
                              className="w-3 h-3 rounded-full border border-black flex items-center justify-center text-[6px] font-sans font-bold bg-white"
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

          {/* BAGIAN II: MATRIKS BENAR / SALAH (3 KOLOM GRID) */}
          {matrixQuestions.length > 0 && (
            <div className="border border-black p-1 bg-white">
              <div className="text-[7.5px] font-bold uppercase border-b border-black pb-0.5 mb-0.5 bg-slate-100 px-1 flex justify-between">
                <span>BAGIAN II: SOAL MATRIKS (BENAR / SALAH)</span>
                <span className="font-normal text-[6.5px]">Hitamkan B (Benar) / S (Salah)</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {matrixColumns.map((colItems, colIdx) => (
                  <div key={colIdx} className="space-y-1 border-r last:border-r-0 border-slate-300 pr-1">
                    {colItems.map((q) => (
                      <div key={q.id} className="border border-slate-200 p-0.5 rounded bg-slate-50/50 space-y-0.5">
                        <span className="font-bold text-[7.5px] text-indigo-900 block border-b border-slate-200 pb-0.5">
                          Soal No. {q.originalNo} (Matriks)
                        </span>

                        <div className="space-y-0.5">
                          {getStatementsList(q).map((st: any, sIdx: number) => (
                            <div
                              key={st.id || sIdx}
                              className="flex items-center justify-between text-[6.5px] bg-white px-1 py-0.5 rounded border border-slate-200"
                            >
                              <span className="font-semibold text-slate-800 truncate max-w-[80px]" title={st.text}>
                                #{sIdx + 1}. {st.text.length > 14 ? st.text.substring(0, 14) + '...' : st.text}
                              </span>
                              <div className="flex items-center space-x-1 shrink-0">
                                <div className="flex items-center space-x-0.5">
                                  <div className="w-3 h-3 rounded-full border border-black flex items-center justify-center text-[6px] font-bold bg-white">
                                    B
                                  </div>
                                </div>
                                <div className="flex items-center space-x-0.5">
                                  <div className="w-3 h-3 rounded-full border border-black flex items-center justify-center text-[6px] font-bold bg-white">
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

          {/* BAGIAN III: ESSAY / URAIAN (3 KOLOM GRID JIKA ADA) */}
          {essayQuestions.length > 0 && (
            <div className="border border-black p-1 bg-white">
              <div className="text-[7.5px] font-bold uppercase border-b border-black pb-0.5 mb-0.5 bg-slate-100 px-1">
                BAGIAN III: ESSAY / URAIAN
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {essayQuestions.map((q) => (
                  <div key={q.id} className="border border-dotted border-black p-0.5 rounded flex items-center justify-between">
                    <span className="font-bold text-[7.5px]">No. {q.originalNo} (Esai)</span>
                    <span className="text-[6px] italic text-slate-400">[ Lembar Esai ]</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TANDA TANGAN KOMPAK DI BAWAH */}
        <div className="flex justify-between items-end text-[7.5px] pt-1 border-t border-slate-300 mt-0.5">
          <div className="text-center w-28">
            <p>Tanda Tangan Siswa,</p>
            <div className="h-4"></div>
            <p className="border-b border-black font-bold">( ............................. )</p>
          </div>
          <div className="text-center w-36">
            <p>Getasan, ......................... 2026</p>
            <p>Pengawas Ujian,</p>
            <div className="h-4"></div>
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