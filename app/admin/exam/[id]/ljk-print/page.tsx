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
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State Mode Cetak & Filter Kelas
  const [printMode, setPrintMode] = useState<'blank' | 'students'>('students')
  const [selectedClass, setSelectedClass] = useState<string>('ALL')

  useEffect(() => {
    async function loadData() {
      if (!examId) return
      const supabase = createClient()

      // 1. Fetch Ujian
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      // 2. Fetch Soal Ujian
      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true })

      // 3. Fetch Data Siswa
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

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-slate-600 font-medium">Memuat LJK Bulk Generator...</p>
      </div>
    )
  }

  // Dapatkan Daftar Kelas Unik
  const classList = Array.from(
    new Set(students.map((s) => s.class_code).filter(Boolean))
  )

  // Filter Siswa Sesuai Pilihan Kelas
  const filteredStudents = students.filter((st) => {
    if (selectedClass === 'ALL') return true
    return st.class_code === selectedClass
  })

  // Sedia data soal terindeks
  const indexedQuestions = questions.map((q, idx) => ({ ...q, originalNo: idx + 1 }))

  // Grouping Soal Berdasarkan Tipe
  const pgQuestions = indexedQuestions.filter(
    (q) => (q.question_type || 'multiple_choice') === 'multiple_choice' || q.question_type === 'complex_multiple_choice'
  )
  const matrixQuestions = indexedQuestions.filter(
    (q) => q.question_type === 'true_false_matrix'
  )
  const essayQuestions = indexedQuestions.filter(
    (q) => q.question_type === 'essay'
  )

  // Grid Kolom PG (4 Kolom) & Matriks (3 Kolom)
  const pgPerCol = Math.ceil(pgQuestions.length / 4)
  const pgColumns = [
    pgQuestions.slice(0, pgPerCol),
    pgQuestions.slice(pgPerCol, pgPerCol * 2),
    pgQuestions.slice(pgPerCol * 2, pgPerCol * 3),
    pgQuestions.slice(pgPerCol * 3),
  ].filter((col) => col.length > 0)

  const matrixPerCol = Math.ceil(matrixQuestions.length / 3)
  const matrixColumns = [
    matrixQuestions.slice(0, matrixPerCol),
    matrixQuestions.slice(matrixPerCol, matrixPerCol * 2),
    matrixQuestions.slice(matrixPerCol * 2),
  ].filter((col) => col.length > 0)

  // Helper Render Komponen LJK Satuan
  const renderSingleLjkSheet = (studentData?: any, indexKey: number = 0) => {
    const isPrefilled = !!studentData
    const studentUsername = studentData?.username || ''
    const studentName = studentData?.full_name || ''
    const studentClass = studentData?.class_code ? `Kelas ${studentData.class_code}` : 'SD Negeri Getasan'

    const qrData = JSON.stringify({
      exam_id: examId,
      username: studentUsername || 'GENERIC_STUDENT',
    })
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrData)}`

    return (
      <div
        key={studentData?.id || indexKey}
        className="max-w-[204mm] mx-auto my-3 bg-white p-3 shadow-xl ljk-single-page border-2 border-black relative text-black font-serif text-[9px] select-none flex flex-col justify-between"
      >
        {/* ⬛ 4 ANCHOR MARKS UNTUK OMR */}
        <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-black"></div>
        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-black"></div>
        <div className="absolute bottom-1.5 left-1.5 w-4 h-4 bg-black"></div>
        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-black"></div>

        <div className="space-y-1.5">
          {/* KOP SEKOLAH */}
          <div className="border-b-2 border-black pb-0.5 text-center">
            <h3 className="text-[8.5px] font-bold uppercase tracking-wider leading-none">
              DINAS PENDIDIKAN KABUPATEN SEMARANG
            </h3>
            <h2 className="text-xs font-black uppercase tracking-wide my-0.5 leading-none">
              LEMBAR JAWAB KOMPUTER (LJK) - SD NEGERI GETASAN
            </h2>
            <p className="text-[7.5px] italic leading-none">Jl. P. Diponegoro Km 6, Getasan, Kab. Semarang (50774)</p>
          </div>

          {/* INFORMASI SISWA & QR CODE (PRE-FILLED JIKA BULK) */}
          <div className="grid grid-cols-12 gap-1.5 border border-black p-1.5 bg-slate-50/50">
            <div className="col-span-9 space-y-0.5">
              <div className="flex items-center space-x-1">
                <span className="w-20 font-bold text-[8.5px]">NAMA SISWA</span>
                <span>:</span>
                {isPrefilled ? (
                  <span className="font-bold text-[9px] uppercase tracking-wide border-b border-black flex-1 h-3.5 leading-none">
                    {studentName}
                  </span>
                ) : (
                  <div className="border-b border-dotted border-black flex-1 h-3"></div>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-20 font-bold text-[8.5px]">NISN / USERNAME</span>
                <span>:</span>
                {isPrefilled ? (
                  <span className="font-bold text-[9px] font-mono border-b border-black flex-1 h-3.5 leading-none">
                    {studentUsername}
                  </span>
                ) : (
                  <div className="border-b border-dotted border-black flex-1 h-3"></div>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-20 font-bold text-[8.5px]">MAPEL / KELAS</span>
                <span>:</span>
                <span className="font-bold uppercase text-[8.5px]">
                  {exam?.subtest || 'UMUM'} | {studentClass}
                </span>
              </div>
            </div>

            <div className="col-span-3 flex flex-col items-center justify-center border-l border-black pl-1">
              <img src={qrUrl} alt="QR Code" className="w-10 h-10 border border-black p-0.5 bg-white" />
              <span className="text-[6.5px] font-mono mt-0.5 font-bold">
                {studentUsername ? `@${studentUsername}` : 'OMR-ID'}
              </span>
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

          {/* BAGIAN I: PILIHAN GANDA & PG KOMPLEKS (4 KOLOM) */}
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

          {/* BAGIAN II: MATRIKS BENAR / SALAH (3 KOLOM) */}
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

          {/* BAGIAN III: ESSAY / URAIAN */}
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

        {/* TANDA TANGAN SISWA */}
        <div className="flex justify-between items-end text-[7.5px] pt-1 border-t border-slate-300 mt-0.5">
          <div className="text-center w-28">
            <p>Tanda Tangan Siswa,</p>
            <div className="h-4"></div>
            <p className="border-b border-black font-bold">
              {studentName ? `( ${studentName.substring(0, 18)} )` : '( ............................. )'}
            </p>
          </div>
          <div className="text-center w-36">
            <p>Getasan, ......................... 2026</p>
            <p>Pengawas Ujian,</p>
            <div className="h-4"></div>
            <p className="border-b border-black font-bold">( ............................. )</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-8">
      {/* ATURAN STYLESHEET STRICT BULK PRINTING (PAGE-BREAK PER SISWA) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 3mm 3mm 3mm 3mm;
          }
          html, body {
            height: auto;
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
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ACTION BAR SCREEN BIASA (FILTER & BULK PRINT CONTROLS) */}
      <div className="no-print bg-slate-900 text-white p-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-sm font-bold">🖨️ Cetak Massal LJK (Bulk Generator)</h1>
            <p className="text-[11px] text-slate-300">Ujian: {exam?.title}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* SELECT MODE CETAK */}
            <select
              value={printMode}
              onChange={(e: any) => setPrintMode(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg focus:outline-none"
            >
              <option value="students">👤 Cetak Massal Siswa (Pre-filled)</option>
              <option value="blank">📄 Cetak Template Kosong (Isi Manual)</option>
            </select>

            {/* SELECT FILTER KELAS */}
            {printMode === 'students' && (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg focus:outline-none"
              >
                <option value="ALL">🌐 Semua Kelas ({students.length} Siswa)</option>
                {classList.map((cCode) => (
                  <option key={cCode} value={cCode}>
                    🏫 Kelas {cCode}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center space-x-1"
            >
              <span>🖨️</span>
              <span>
                Cetak ({printMode === 'blank' ? '1 Lembar' : `${filteredStudents.length} Halaman`})
              </span>
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

      {/* KONTEN HASIL CETAK LJK */}
      {printMode === 'blank' ? (
        renderSingleLjkSheet(null, 0)
      ) : filteredStudents.length > 0 ? (
        filteredStudents.map((student, idx) => renderSingleLjkSheet(student, idx))
      ) : (
        <div className="max-w-md mx-auto my-12 bg-white p-6 rounded-2xl border text-center text-slate-500 text-xs font-bold">
          Tidak ada data siswa ditemukan untuk kelas yang dipilih.
        </div>
      )}
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