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
        <p className="text-slate-600 font-medium">Memuat template Lembar Jawab Komputer (LJK)...</p>
      </div>
    )
  }

  const qrData = JSON.stringify({ exam_id: examId, code: exam?.token_code || 'EXAM' })
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-12">
      {/* STYLE CETAK A4 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 6mm 6mm 6mm;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .ljk-container {
            border: 2px solid #000 !important;
            box-shadow: none !important;
          }
        }
        @media screen {
          .print-only {
            display: block;
          }
        }
      `}</style>

      {/* ACTION BAR SCREEN BIASA */}
      <div className="no-print bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-base font-bold">🖨️ Cetak Lembar Jawab Komputer (LJK Dynamic Multi-Type)</h1>
            <p className="text-xs text-slate-300">Ujian: {exam?.title || 'TKA SD Negeri Getasan'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-colors"
            >
              🖨️ Cetak LJK (A4)
            </button>
            <Link
              href={`/admin/exam/${examId}`}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              ← Kembali ke Kelola Soal
            </Link>
          </div>
        </div>
      </div>

      {/* LEMBAR LJK A4 */}
      <div className="max-w-[210mm] mx-auto my-6 bg-white p-6 shadow-xl ljk-container border-2 border-black relative text-black font-serif text-xs select-none">
        {/* ⬛ 4 ANCHOR MARKS UNTUK DETEKSI SISI SUDUT OMR */}
        <div className="absolute top-2 left-2 w-5 h-5 bg-black" title="Anchor Top-Left"></div>
        <div className="absolute top-2 right-2 w-5 h-5 bg-black" title="Anchor Top-Right"></div>
        <div className="absolute bottom-2 left-2 w-5 h-5 bg-black" title="Anchor Bottom-Left"></div>
        <div className="absolute bottom-2 right-2 w-5 h-5 bg-black" title="Anchor Bottom-Right"></div>

        {/* HEADER KOP SEKOLAH */}
        <div className="border-b-2 border-black pb-2 mb-3 text-center">
          <h3 className="text-[10px] font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN SEMARANG</h3>
          <h3 className="text-[10px] font-bold uppercase tracking-wider">DINAS PENDIDIKAN, KEBUDAYAAN, KEPEMUDAAN DAN OLAHRAGA</h3>
          <h2 className="text-base font-black uppercase tracking-wide">SD NEGERI GETASAN</h2>
          <p className="text-[9px] italic">Jl. P. Diponegoro Km 6, Getasan, Kab. Semarang (50774)</p>
        </div>

        {/* INFORMASI SISWA & QR CODE */}
        <div className="grid grid-cols-12 gap-3 border border-black p-3 mb-3 bg-slate-50/50">
          <div className="col-span-8 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="w-24 font-bold text-[11px]">NAMA SISWA</span>
              <span>:</span>
              <div className="border-b border-dotted border-black flex-1 h-5"></div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-24 font-bold text-[11px]">NISN / NO UJIAN</span>
              <span>:</span>
              <div className="border-b border-dotted border-black flex-1 h-5"></div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-24 font-bold text-[11px]">KELAS / FASE</span>
              <span>:</span>
              <div className="border-b border-dotted border-black flex-1 h-5"></div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-24 font-bold text-[11px]">MATA PELAJARAN</span>
              <span>:</span>
              <span className="font-bold text-[11px] uppercase">{exam?.subtest || 'MATEMATIKA'}</span>
            </div>
          </div>

          <div className="col-span-4 flex flex-col items-center justify-center border-l border-black pl-2">
            <img src={qrUrl} alt="QR Code Ujian" className="w-20 h-20 border border-black p-0.5 bg-white" />
            <span className="text-[8px] font-mono mt-1 font-bold text-center">VALIDASI OMR ID</span>
          </div>
        </div>

        {/* PETUNJUK PENGISIAN LJK MULTI-TIPE */}
        <div className="border border-black p-2 mb-3 text-[9px] leading-tight bg-slate-100">
          <p className="font-bold uppercase mb-0.5">📌 PETUNJUK PENGISIAN LJK MULTI-TIPE:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li><b>PG Biasa:</b> Hitamkan / silang (⬛ / ✖) <b>SATU</b> opsi pilihan (A, B, C, D).</li>
            <li><b>PG Kompleks:</b> Hitamkan / silang <b>SEMUA</b> opsi pilihan yang Anda anggap benar.</li>
            <li><b>Matriks B/S:</b> Pilih <b>B</b> (Benar) atau <b>S</b> (Salah) pada setiap baris pernyataan.</li>
            <li><b>Essay / Uraian:</b> Tuliskan jawaban singkat pada kotak yang disediakan.</li>
          </ul>
        </div>

        {/* DAFTAR JAWABAN DINAMIS SESUAI TIPE SOAL */}
        <div className="space-y-3">
          <h4 className="font-black text-[11px] uppercase border-b border-black pb-1">
            LEMBAR JAWABAN SISWA ({questions.length} SOAL)
          </h4>

          <div className="space-y-2 text-[10px]">
            {questions.map((q, idx) => {
              const no = idx + 1
              const qType = q.question_type || 'multiple_choice'

              return (
                <div key={q.id} className="border border-black p-2 bg-slate-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">
                      No. {no}{' '}
                      <span className="font-normal italic text-[9px]">
                        ({qType === 'complex_multiple_choice'
                          ? 'PG Kompleks - Pilihan Bisa > 1'
                          : qType === 'true_false_matrix'
                          ? 'Matriks Benar / Salah'
                          : qType === 'essay'
                          ? 'Uraian / Esai'
                          : 'Pilihan Ganda 1 Jawaban'})
                      </span>
                    </span>
                    <span className="text-[9px] font-bold">Bobot: {q.max_score || 1} Poin</span>
                  </div>

                  {/* A. PILIHAN GANDA & PG KOMPLEKS */}
                  {(qType === 'multiple_choice' || qType === 'complex_multiple_choice') && (
                    <div className="flex items-center space-x-6 pl-2 py-1">
                      {['A', 'B', 'C', 'D'].map((opt) => (
                        <div key={opt} className="flex items-center space-x-1">
                          <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px] font-sans font-bold">
                            {opt}
                          </div>
                          <span>Pilihan {opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* B. MATRIKS BENAR / SALAH */}
                  {qType === 'true_false_matrix' && (
                    <div className="pl-2 space-y-1">
                      {Array.isArray(q.options) && q.options.length > 0 ? (
                        q.options.map((st: any, sIdx: number) => {
                          const stId = st.id || String(sIdx + 1)
                          return (
                            <div key={stId} className="flex items-center justify-between border-b border-slate-200 py-0.5 pr-2">
                              <span className="text-[9px] flex-1">
                                #{sIdx + 1}. {st.text || `Pernyataan ${sIdx + 1}`}
                              </span>
                              <div className="flex items-center space-x-4 shrink-0">
                                <div className="flex items-center space-x-1">
                                  <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[7px] font-bold">
                                    B
                                  </div>
                                  <span>Benar</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[7px] font-bold">
                                    S
                                  </div>
                                  <span>Salah</span>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[7px] font-bold">B</div>
                            <span>Benar</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[7px] font-bold">S</div>
                            <span>Salah</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* C. ESSAY / URAIAN */}
                  {qType === 'essay' && (
                    <div className="p-2 border border-dotted border-black bg-white rounded mt-1 min-h-[40px] text-[9px] italic text-slate-500">
                      Tuliskan ringkasan jawaban esai di sini atau di lembar tambahan...
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* FOOTER TANDA TANGAN */}
        <div className="mt-6 flex justify-between items-end text-[10px]">
          <div className="text-center w-36">
            <p>Tanda Tangan Siswa,</p>
            <div className="h-10"></div>
            <p className="border-b border-black font-bold">( .................................... )</p>
          </div>
          <div className="text-center w-44">
            <p>Getasan, ................................ 2026</p>
            <p>Pengawas Ujian,</p>
            <div className="h-10"></div>
            <p className="border-b border-black font-bold">( .................................... )</p>
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