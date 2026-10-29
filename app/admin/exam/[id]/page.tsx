'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import BulkUploadModal from '@/components/BulkUploadModal'
import Link from 'next/link'

const DEFAULT_KEYS = ['A', 'B', 'C', 'D']

// Helper Normalisasi Opsi PG/PG Kompleks (Selalu 4 Opsi A, B, C, D)
function getNormalizedOptions(rawOptions: any) {
  const optsArray = Array.isArray(rawOptions) ? rawOptions : []
  return DEFAULT_KEYS.map((key, index) => {
    const found =
      optsArray.find((o: any) => typeof o === 'object' && o?.key === key) ||
      optsArray[index]

    if (typeof found === 'string' || typeof found === 'number') {
      return { key, text: String(found), image_url: '' }
    } else if (found && typeof found === 'object') {
      return {
        key: found.key || key,
        text: found.text !== undefined && found.text !== null ? String(found.text) : '',
        image_url: found.image_url ? String(found.image_url) : '',
      }
    }
    return { key, text: '', image_url: '' }
  })
}

// Helper Normalisasi Pernyataan Matriks
function getNormalizedStatements(rawOptions: any, correctAnswers: any) {
  const stArray = Array.isArray(rawOptions) ? rawOptions : []
  if (stArray.length === 0) {
    return [
      { id: '1', text: 'Pernyataan 1', image_url: '', correct_val: 'Benar' },
      { id: '2', text: 'Pernyataan 2', image_url: '', correct_val: 'Salah' },
    ]
  }
  return stArray.map((st: any, idx: number) => {
    const stId = String(st.id || idx + 1)
    let cVal = 'Benar'
    if (correctAnswers && typeof correctAnswers === 'object' && correctAnswers[stId]) {
      cVal = String(correctAnswers[stId])
    } else if (st.correct_val) {
      cVal = String(st.correct_val)
    }
    return {
      id: stId,
      text: typeof st === 'string' ? st : String(st.text || ''),
      image_url: st.image_url ? String(st.image_url) : '',
      correct_val: cVal,
    }
  })
}

function QuestionManagerContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Mode Navigasi Tab: 'form' (Input/Edit) atau 'list' (Daftar Soal)
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form')

  // Mode Tampilan Dual-View Editor ('split' | 'preview' | 'code')
  const [editorViewMode, setEditorViewMode] = useState<'split' | 'preview' | 'code'>('split')

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  // Checklist Seleksi Massal & Sorting/Filter
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('created_asc')
  const [filterType, setFilterType] = useState<string>('ALL')

  // State Form Soal
  const [questionType, setQuestionType] = useState<
    'multiple_choice' | 'complex_multiple_choice' | 'true_false_matrix' | 'essay'
  >('multiple_choice')
  const [questionText, setQuestionText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [maxScore, setMaxScore] = useState(1.0)
  const [explanation, setExplanation] = useState('')

  // State Opsi PG & PG Kompleks
  const [options, setOptions] = useState([
    { key: 'A', text: '', image_url: '' },
    { key: 'B', text: '', image_url: '' },
    { key: 'C', text: '', image_url: '' },
    { key: 'D', text: '', image_url: '' },
  ])

  // State Kunci Jawaban
  const [correctSingleOption, setCorrectSingleOption] = useState('A')
  const [correctComplexOptions, setCorrectComplexOptions] = useState<string[]>([])

  // State Matriks Benar-Salah
  const [statements, setStatements] = useState([
    { id: '1', text: 'Pernyataan 1', image_url: '', correct_val: 'Benar' },
    { id: '2', text: 'Pernyataan 2', image_url: '', correct_val: 'Salah' },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const loadData = async () => {
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

  useEffect(() => {
    loadData()
  }, [examId])

  // 1. 📊 FUNGSI EXPORT KE EXCEL (.XLSX)
  const handleExportExcel = async () => {
    if (questions.length === 0) {
      alert('Belum ada soal untuk diekspor!')
      return
    }

    try {
      const XLSX = await import('xlsx')
      const excelRows = questions.map((q, idx) => {
        let optionsText = ''
        if (Array.isArray(q.options)) {
          optionsText = q.options
            .map((o: any) => (o.key ? `${o.key}. ${o.text}` : `${o.id || ''}. ${o.text}`))
            .join(' | ')
        }

        let keyText = ''
        if (Array.isArray(q.correct_answers)) {
          keyText = q.correct_answers.join(', ')
        } else if (typeof q.correct_option === 'object' && q.correct_option !== null) {
          keyText = JSON.stringify(q.correct_option)
        } else {
          keyText = String(q.correct_option || '')
        }

        return {
          No: idx + 1,
          'Tipe Soal': q.question_type || 'multiple_choice',
          Pertanyaan: q.question_text || '',
          'Pilihan / Pernyataan': optionsText,
          'Kunci Jawaban': keyText,
          Pembahasan: q.explanation || '-',
          'Bobot Poin': q.max_score || 1,
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(excelRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Soal')

      const fileName = `Soal_${(exam?.title || 'Ujian').replace(/\s+/g, '_')}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (err) {
      alert('Gagal mengekspor ke Excel. Pastikan modul xlsx tersedia.')
    }
  }

  // 2. 🖨️ FUNGSI EXPORT / CETAK PDF (A4 2 KOLOM)
  const handleExportPDF = () => {
    if (questions.length === 0) {
      alert('Belum ada soal untuk dicetak!')
      return
    }
    window.print()
  }

  // HANDLER CHECKLIST & BATCH SELECTION
  const handleToggleSelectAll = (targetQuestions: any[]) => {
    if (selectedIds.length === targetQuestions.length && targetQuestions.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(targetQuestions.map((q) => q.id))
    }
  }

  const handleToggleSelectOne = (qId: string) => {
    if (selectedIds.includes(qId)) {
      setSelectedIds(selectedIds.filter((id) => id !== qId))
    } else {
      setSelectedIds([...selectedIds, qId])
    }
  }

  // HANDLER HAPUS TERPILIH & HAPUS SEMUA
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    const confirmDelete = confirm(
      `Apakah Anda yakin ingin menghapus ${selectedIds.length} soal yang dipilih?\n\n⚠️ Soal yang dihapus tidak dapat dikembalikan!`
    )
    if (!confirmDelete) return

    const supabase = createClient()
    const { error } = await supabase.from('questions').delete().in('id', selectedIds)

    if (error) {
      alert(`Gagal menghapus soal terpilih: ${error.message}`)
    } else {
      alert(`✅ Berhasil menghapus ${selectedIds.length} soal terpilih!`)
      setSelectedIds([])
      loadData()
    }
  }

  const handleDeleteAllQuestions = async () => {
    if (questions.length === 0) return
    const confirmDelete = confirm(
      `⚠️ PERINGATAN BATCH DELETE!\n\nApakah Anda yakin ingin MENGHAPUS SEMUA (${questions.length}) soal pada ujian ini?\n\nTindakan ini bersifat permanen!`
    )
    if (!confirmDelete) return

    const supabase = createClient()
    const { error } = await supabase.from('questions').delete().eq('exam_id', examId)

    if (error) {
      alert(`Gagal menghapus seluruh soal: ${error.message}`)
    } else {
      alert(`🗑️ Seluruh soal pada ujian ini berhasil dihapus!`)
      setSelectedIds([])
      loadData()
    }
  }

  // LOGIKA FILTERING & SORTING DAFTAR SOAL
  const filteredAndSortedQuestions = [...questions]
    .filter((q) => {
      if (filterType === 'ALL') return true
      const qType = q.question_type || 'multiple_choice'
      return qType === filterType
    })
    .sort((a, b) => {
      if (sortBy === 'created_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'created_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'score_desc') {
        return (Number(b.max_score) || 1) - (Number(a.max_score) || 1)
      }
      if (sortBy === 'score_asc') {
        return (Number(a.max_score) || 1) - (Number(b.max_score) || 1)
      }
      if (sortBy === 'type') {
        return (a.question_type || '').localeCompare(b.question_type || '')
      }
      return 0
    })

  // Helper Sisip Teks Toolbar LaTeX / HTML
  const insertFormatText = (
    before: string,
    after: string = '',
    targetId: string = 'questionTextarea'
  ) => {
    const textarea = document.getElementById(targetId) as HTMLTextAreaElement
    if (!textarea) {
      if (targetId === 'questionTextarea') {
        setQuestionText((prev) => prev + before + after)
      } else if (targetId === 'explanationTextarea') {
        setExplanation((prev) => prev + before + after)
      }
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentVal = targetId === 'questionTextarea' ? questionText : explanation
    const selected = currentVal.substring(start, end)
    const replacement = before + (selected || '') + after

    const newText =
      currentVal.substring(0, start) + replacement + currentVal.substring(end)

    if (targetId === 'questionTextarea') {
      setQuestionText(newText)
    } else {
      setExplanation(newText)
    }

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + (selected ? selected.length : 0)
      )
    }, 0)
  }

  const handleOptionChange = (
    idx: number,
    field: 'text' | 'image_url',
    value: string
  ) => {
    const updated = [...options]
    updated[idx][field] = value || ''
    setOptions(updated)
  }

  const handleComplexToggle = (key: string) => {
    if (correctComplexOptions.includes(key)) {
      setCorrectComplexOptions(correctComplexOptions.filter((k) => k !== key))
    } else {
      setCorrectComplexOptions([...correctComplexOptions, key])
    }
  }

  const handleStatementChange = (
    idx: number,
    field: 'text' | 'correct_val' | 'image_url',
    val: string
  ) => {
    const updated = [...statements]
    updated[idx][field] = val || ''
    setStatements(updated)
  }

  const addStatement = () => {
    const newId = String(Date.now())
    setStatements([
      ...statements,
      {
        id: newId,
        text: `Pernyataan ${statements.length + 1}`,
        image_url: '',
        correct_val: 'Benar',
      },
    ])
  }

  const removeStatement = (idx: number) => {
    if (statements.length <= 1) {
      alert('Minimal harus ada 1 pernyataan!')
      return
    }
    setStatements(statements.filter((_, i) => i !== idx))
  }

  const resetForm = () => {
    setEditingQuestionId(null)
    setQuestionType('multiple_choice')
    setQuestionText('')
    setImageUrl('')
    setMaxScore(1.0)
    setExplanation('')
    setOptions([
      { key: 'A', text: '', image_url: '' },
      { key: 'B', text: '', image_url: '' },
      { key: 'C', text: '', image_url: '' },
      { key: 'D', text: '', image_url: '' },
    ])
    setCorrectSingleOption('A')
    setCorrectComplexOptions([])
    setStatements([
      { id: '1', text: 'Pernyataan 1', image_url: '', correct_val: 'Benar' },
      { id: '2', text: 'Pernyataan 2', image_url: '', correct_val: 'Salah' },
    ])
  }

  const handleEditClick = (q: any) => {
    setEditingQuestionId(q.id)
    const type = q.question_type || 'multiple_choice'
    setQuestionType(type)
    setQuestionText(q.question_text || '')
    setImageUrl(q.image_url || '')
    setMaxScore(Number(q.max_score) || 1.0)
    setExplanation(q.explanation || '')

    setOptions(getNormalizedOptions(q.options))
    setStatements(getNormalizedStatements(q.options, q.correct_answers))

    if (type === 'multiple_choice') {
      const keyVal = q.correct_option || (Array.isArray(q.correct_answers) ? q.correct_answers[0] : 'A')
      setCorrectSingleOption(String(keyVal).trim().toUpperCase())
    } else if (type === 'complex_multiple_choice') {
      if (Array.isArray(q.correct_answers)) {
        setCorrectComplexOptions(q.correct_answers.map(String))
      } else if (q.correct_option) {
        setCorrectComplexOptions(String(q.correct_option).split(',').map((s) => s.trim()))
      } else {
        setCorrectComplexOptions(['A'])
      }
    }

    setActiveTab('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMsg(null)

    const supabase = createClient()

    let payload: any = {
      exam_id: examId,
      question_type: questionType,
      question_text: questionText,
      image_url: imageUrl.trim() || null,
      max_score: Number(maxScore),
      explanation: explanation.trim() || null,
    }

    if (questionType === 'multiple_choice') {
      payload.options = options
      payload.correct_option = correctSingleOption
      payload.correct_answers = [correctSingleOption]
    } else if (questionType === 'complex_multiple_choice') {
      if (correctComplexOptions.length === 0) {
        setMsg('Error: Pilih minimal 1 kunci jawaban untuk PG Kompleks.')
        setIsSubmitting(false)
        return
      }
      payload.options = options
      payload.correct_option = correctComplexOptions.join(',')
      payload.correct_answers = correctComplexOptions
    } else if (questionType === 'true_false_matrix') {
      if (statements.length === 0) {
        setMsg('Error: Tambahkan minimal 1 pernyataan untuk Matriks.')
        setIsSubmitting(false)
        return
      }
      payload.options = statements
      const answerObj: { [key: string]: string } = {}
      statements.forEach((st) => {
        answerObj[st.id] = st.correct_val
      })
      payload.correct_answers = answerObj
      payload.correct_option = 'MATRIX'
    } else if (questionType === 'essay') {
      payload.options = []
      payload.correct_option = 'ESSAY'
      payload.correct_answers = null
    }

    let error: any = null

    if (editingQuestionId) {
      const res = await supabase
        .from('questions')
        .update(payload)
        .eq('id', editingQuestionId)
      error = res.error
    } else {
      const res = await supabase.from('questions').insert([payload])
      error = res.error
    }

    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setMsg(
        editingQuestionId
          ? 'Soal berhasil diperbarui!'
          : 'Soal baru berhasil ditambahkan!'
      )
      resetForm()
      loadData()
      setActiveTab('list')
    }
    setIsSubmitting(false)
  }

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Hapus butir soal ini?')) return
    const supabase = createClient()
    await supabase.from('questions').delete().eq('id', qId)
    setSelectedIds((prev) => prev.filter((id) => id !== qId))
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <main className="p-8 text-center text-slate-600 font-medium">
          Memuat data soal admin...
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ATURAN STYLESHEET KHUSUS TAMPILAN CETAK PDF (A4 2 KOLOM + HALAMAN TERPISAH KUNCI & PEMBAHASAN) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 15mm 10mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-family: 'Times New Roman', Times, serif, sans-serif;
          }
          nav,
          header,
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          /* FORMAT 2 KOLOM NASKAH SOAL */
          .soal-two-columns {
            column-count: 2;
            column-gap: 20px;
            column-rule: 1px solid #cbd5e1;
          }
          .soal-item-print {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 16px;
          }
          /* HALAMAN TERPISAH KUNCI & PEMBAHASAN */
          .page-break-before {
            break-before: page;
            page-break-before: always;
            column-count: 1 !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* BILAH UTAMA (NAVBAR SCREEN BIASA) */}
      <div className="no-print">
        <Navbar />
      </div>

      {/* 🖨️ DOKUMEN CETAK/PDF (HANYA MUNCUL SAAT CETAK / WINDOW.PRINT) */}
      <div className="print-only text-black p-2 font-serif leading-snug">
        {/* KOP RAPORT RESMI SEKOLAH */}
        <div className="border-b-4 border-double border-black pb-3 mb-4 text-center relative">
          <div className="flex items-center justify-center space-x-4">
            <div className="text-left space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider">
                PEMERINTAH KABUPATEN SEMARANG
              </h3>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                DINAS PENDIDIKAN, KEBUDAYAAN, KEPEMUDAAN DAN OLAHRAGA
              </h3>
              <h1 className="text-lg font-black uppercase tracking-wide">
                SD NEGERI GETASAN
              </h1>
              <p className="text-[10px] italic">
                Jl. P. Diponegoro Km 6, Getasan, Kab. Semarang (50774) | Email:
                sdnegerigetasan@gmail.com
              </p>
            </div>
          </div>
        </div>

        {/* INFORMASI UJIAN */}
        <div className="border border-black p-3 mb-4 text-xs grid grid-cols-2 gap-2 bg-slate-50">
          <div>
            <p>
              <b>MATA PELAJARAN:</b> {exam?.subtest || 'MATEMATIKA'}
            </p>
            <p>
              <b>NAMA UJIAN:</b> {exam?.title}
            </p>
          </div>
          <div>
            <p>
              <b>ALOKASI WAKTU:</b> {exam?.duration_minutes} Menit
            </p>
            <p>
              <b>KELAS / FASE:</b> SD Negeri Getasan
            </p>
          </div>
        </div>

        {/* PETUNJUK PENGERJAAN */}
        <p className="text-[11px] italic border-b border-black pb-2 mb-3">
          <b>PETUNJUK:</b> Pilihlah satu atau beberapa jawaban yang paling tepat pada lembar jawaban yang telah disediakan!
        </p>

        {/* NASKAH SOAL 2 KOLOM */}
        <div className="soal-two-columns text-xs">
          {questions.map((q, idx) => (
            <div key={q.id} className="soal-item-print">
              <div className="flex items-start space-x-1">
                <span className="font-bold shrink-0">{idx + 1}.</span>
                <div className="space-y-1 w-full">
                  <div className="font-medium text-justify">
                    <MathRenderer content={q.question_text} />
                  </div>

                  {/* GAMBAR SOAL JIKA ADA */}
                  {q.image_url && (
                    <img
                      src={q.image_url}
                      alt="Gambar Soal"
                      className="max-h-36 object-contain rounded my-1 border border-slate-300"
                    />
                  )}

                  {/* OPTION PILIHAN GANDA */}
                  {Array.isArray(q.options) && q.question_type !== 'true_false_matrix' && (
                    <div className="space-y-1 pt-1 pl-1">
                      {q.options.map((opt: any) => (
                        <div key={opt.key} className="flex items-start space-x-1.5">
                          <span className="font-bold">{opt.key}.</span>
                          <span>
                            <MathRenderer content={opt.text} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PERNYATAAN BENAR/SALAH MATRIKS */}
                  {q.question_type === 'true_false_matrix' && Array.isArray(q.options) && (
                    <table className="w-full text-[10px] border-collapse border border-black mt-1">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-black p-1 text-left">Pernyataan</th>
                          <th className="border border-black p-1 text-center w-12">Benar</th>
                          <th className="border border-black p-1 text-center w-12">Salah</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.options.map((st: any) => (
                          <tr key={st.id}>
                            <td className="border border-black p-1">{st.text}</td>
                            <td className="border border-black p-1 text-center">◯</td>
                            <td className="border border-black p-1 text-center">◯</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 📄 LEMBAR TERPISAH: KUNCI JAWABAN & PEMBAHASAN */}
        <div className="page-break-before pt-4">
          <div className="text-center border-b-2 border-black pb-2 mb-4">
            <h2 className="text-base font-bold uppercase">
              🔑 KUNCI JAWABAN & PEMBAHASAN SOAL
            </h2>
            <p className="text-xs">
              <b>PAKET UJIAN:</b> {exam?.title} ({exam?.subtest || 'UMUM'})
            </p>
          </div>

          <table className="w-full text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-black p-2 w-12 text-center">No</th>
                <th className="border border-black p-2 w-28 text-center">Kunci Jawaban</th>
                <th className="border border-black p-2 text-left">Pembahasan & Solusi</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => {
                let kunciStr = ''
                if (Array.isArray(q.correct_answers)) {
                  kunciStr = q.correct_answers.join(', ')
                } else if (typeof q.correct_option === 'object' && q.correct_option !== null) {
                  kunciStr = Object.entries(q.correct_option)
                    .map(([k, v]) => `#${k}: ${v}`)
                    .join(' | ')
                } else {
                  kunciStr = String(q.correct_option || '-')
                }

                return (
                  <tr key={q.id}>
                    <td className="border border-black p-2 text-center font-bold">
                      {idx + 1}
                    </td>
                    <td className="border border-black p-2 text-center font-bold text-indigo-900">
                      {kunciStr}
                    </td>
                    <td className="border border-black p-2 leading-relaxed">
                      {q.explanation ? (
                        <MathRenderer content={q.explanation} />
                      ) : (
                        <span className="italic text-slate-500">Tidak ada pembahasan.</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Halaman Interaktif Web Admin */}
      <main className="no-print p-8 max-w-6xl mx-auto space-y-6">
        {/* HEADER ACTION BAR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
                {exam?.subtest || 'SUBTES TKA'}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                🔑 Token Ujian: {exam?.token_code || exam?.token || 'AKTIF'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              ⚙️ Kelola Soal: {exam?.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* TOMBOL EXPORT EXCEL */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
              suppressHydrationWarning
            >
              <span>📊</span>
              <span>Export Excel</span>
            </button>

            {/* TOMBOL EXPORT / CETAK PDF */}
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
              suppressHydrationWarning
            >
              <span>🖨️</span>
              <span>Export PDF (Cetak A4)</span>
            </button>

            {/* IMPORT BULK */}
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
              suppressHydrationWarning
            >
              <span>📥</span>
              <span>Import Soal (Bulk)</span>
            </button>

            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-xl transition-colors"
            >
              ← Dashboard Admin
            </Link>
          </div>
        </div>

        {/* TAB BAR NAVIGASI */}
        <div className="flex border-b border-slate-200 space-x-4">
          <button
            onClick={() => {
              if (activeTab === 'list' && !editingQuestionId) {
                resetForm()
              }
              setActiveTab('form')
            }}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'form'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{editingQuestionId ? '✏️ Edit Soal' : '➕ Tambah Soal Manual'}</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📚 Daftar Soal Aktif ({questions.length})</span>
          </button>
        </div>

        {/* TAB 1: FORM INPUT & EDIT SOAL */}
        {activeTab === 'form' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h2 className="text-lg font-bold text-slate-800">
                {editingQuestionId ? '✏️ Edit Butir Soal' : '➕ Input Soal Baru'}
              </h2>
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                  suppressHydrationWarning
                >
                  ✕ Batal Edit
                </button>
              )}
            </div>

            {msg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  msg.startsWith('Error')
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {msg}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-5" suppressHydrationWarning>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Tipe Soal TKA
                  </label>
                  <select
                    value={questionType}
                    onChange={(e: any) => setQuestionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    suppressHydrationWarning
                  >
                    <option value="multiple_choice">Pilihan Ganda (1 Jawaban Benar)</option>
                    <option value="complex_multiple_choice">Pilihan Ganda Kompleks</option>
                    <option value="true_false_matrix">Matriks (Benar - Salah)</option>
                    <option value="essay">Uraian / Essay (Penilaian Manual Guru)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Bobot Nilai Maksimal
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* DUAL-VIEW EDITOR MODERN */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Stimulus / Teks Soal
                  </label>

                  {/* Toggle Mode Tampilan Editor */}
                  <div className="flex items-center space-x-1 bg-slate-200 p-1 rounded-lg text-[11px] font-bold self-start">
                    <button
                      type="button"
                      onClick={() => setEditorViewMode('split')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        editorViewMode === 'split'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📑 Dual-View (Split)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorViewMode('preview')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        editorViewMode === 'preview'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      👁️ Tampilan Visual UI
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorViewMode('code')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        editorViewMode === 'code'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      💻 Editor Kode Mentah
                    </button>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                  {/* BILAH ALAT FORMAT (TOOLBAR LENGKAP MODERN) */}
                  <div className="p-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-xs select-none">
                    <div className="flex items-center space-x-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => insertFormatText('<b>', '</b>')}
                        className="w-7 h-7 flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 rounded"
                        title="Cetak Tebal (Bold)"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatText('<i>', '</i>')}
                        className="w-7 h-7 flex items-center justify-center italic font-serif text-slate-700 hover:bg-slate-100 rounded"
                        title="Cetak Miring (Italic)"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatText('<u>', '</u>')}
                        className="w-7 h-7 flex items-center justify-center underline text-slate-700 hover:bg-slate-100 rounded"
                        title="Garis Bawah (Underline)"
                      >
                        U
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatText('<s>', '</s>')}
                        className="w-7 h-7 flex items-center justify-center line-through text-slate-700 hover:bg-slate-100 rounded"
                        title="Coret (Strikethrough)"
                      >
                        S
                      </button>
                    </div>

                    <div className="flex items-center space-x-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => insertFormatText('<div style="text-align: left">', '</div>')}
                        className="px-2 h-7 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 rounded text-[10px]"
                        title="Rata Kiri"
                      >
                        ⬅️ Kiri
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatText('<div style="text-align: center">', '</div>')}
                        className="px-2 h-7 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 rounded text-[10px]"
                        title="Rata Tengah"
                      >
                        ↔️ Tengah
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatText('<div style="text-align: right">', '</div>')}
                        className="px-2 h-7 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 rounded text-[10px]"
                        title="Rata Kanan"
                      >
                        ➡️ Kanan
                      </button>
                    </div>

                    <div className="flex items-center space-x-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => insertFormatText('<blockquote>', '</blockquote>')}
                        className="px-2 h-7 flex items-center justify-center font-medium text-slate-700 hover:bg-slate-100 rounded text-[11px]"
                        title="Kutipan (Quote)"
                      >
                        💬 Kutipan
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatText(
                            '\n<table border="1" style="width:100%; border-collapse:collapse;" className="my-2">\n  <thead>\n    <tr className="bg-slate-100">\n      <th className="p-2 border">Kolom 1</th>\n      <th className="p-2 border">Kolom 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td className="p-2 border">Data 1</td>\n      <td className="p-2 border">Data 2</td>\n    </tr>\n  </tbody>\n</table>\n'
                          )
                        }
                        className="px-2 h-7 flex items-center justify-center font-medium text-slate-700 hover:bg-slate-100 rounded text-[11px]"
                        title="Tabel HTML"
                      >
                        📊 Tabel
                      </button>
                    </div>

                    <div className="flex items-center space-x-1 bg-indigo-50 border border-indigo-200 rounded-lg p-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => insertFormatText('$\\frac{', '}{b}$')}
                        className="px-2 h-7 flex items-center justify-center font-bold text-indigo-700 hover:bg-indigo-100 rounded text-[11px]"
                        title="Pecahan"
                      >
                        {"$\\frac{a}{b}$"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatText('$\\sqrt{', '}$') }
                        className="px-2 h-7 flex items-center justify-center font-bold text-indigo-700 hover:bg-indigo-100 rounded text-[11px]"
                        title="Akar Matematika"
                      >
                        {"$\\sqrt{x}$"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatText('$x^{', '}$') }
                        className="px-2 h-7 flex items-center justify-center font-bold text-indigo-700 hover:bg-indigo-100 rounded text-[11px]"
                        title="Pangkat (Superscript)"
                      >
                        {"$x^n$"}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatText('$x_{', '}$') }
                        className="px-2 h-7 flex items-center justify-center font-bold text-indigo-700 hover:bg-indigo-100 rounded text-[11px]"
                        title="Indeks Bawah (Subscript)"
                      >
                        {"$x_n$"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatText(
                            '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$'
                          )
                        }
                        className="px-2 h-7 flex items-center justify-center font-bold text-indigo-700 hover:bg-indigo-100 rounded text-[11px]"
                        title="Matriks 2x2"
                      >
                        Matriks
                      </button>
                    </div>
                  </div>

                  {/* KOTAK ATAS: LIVE VISUAL PREVIEW */}
                  {(editorViewMode === 'split' || editorViewMode === 'preview') && (
                    <div className="p-4 bg-slate-50 border-b border-slate-200 min-h-[120px] max-h-[260px] overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Tampilan Visual UI (Live Preview)</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Tampilan visual nyata siswa saat ujian
                        </span>
                      </div>

                      {questionText.trim() ? (
                        <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                          <MathRenderer content={questionText} />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Hasil visual UI akan langsung ditampilkan di sini secara real-time saat Anda mengetik kode di bawah...
                        </p>
                      )}
                    </div>
                  )}

                  {/* KOTAK BAWAH: EDITOR CODE TEXTAREA */}
                  {(editorViewMode === 'split' || editorViewMode === 'code') && (
                    <div className="relative">
                      <div className="bg-slate-900 px-3 py-1 flex justify-between items-center text-[10px] font-mono text-slate-400 border-b border-slate-800">
                        <span>💻 EDITOR BARIS KODE (HTML / LATEX)</span>
                        <span className="text-slate-500">UTF-8</span>
                      </div>
                      <textarea
                        id="questionTextarea"
                        rows={5}
                        required
                        value={questionText || ''}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="Ketik teks soal, tag HTML, atau rumus KaTeX di sini..."
                        className="w-full p-3.5 font-mono text-xs bg-slate-950 text-emerald-400 focus:outline-none focus:ring-0 resize-y leading-relaxed"
                        spellCheck={false}
                        suppressHydrationWarning
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  URL Gambar Soal (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={imageUrl || ''}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  suppressHydrationWarning
                />
              </div>

              {/* PILIHAN GANDA BIASA */}
              {questionType === 'multiple_choice' && (
                <div className="space-y-3 pt-3 border-t">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Pilihan Jawaban & Kunci (Pilih 1 Radio)
                  </label>
                  {options.map((opt, idx) => (
                    <div key={opt.key} className="space-y-1 p-3 border rounded-xl bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="correct_single"
                          checked={correctSingleOption === opt.key}
                          onChange={() => setCorrectSingleOption(opt.key)}
                          suppressHydrationWarning
                        />
                        <span className="font-bold text-xs">{opt.key}.</span>
                        <input
                          type="text"
                          required
                          placeholder={`Teks Jawaban Opsi ${opt.key}`}
                          value={opt.text || ''}
                          onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border text-xs bg-white"
                          suppressHydrationWarning
                        />
                      </div>
                      <div className="pl-6">
                        <input
                          type="text"
                          placeholder={`URL Gambar Opsi ${opt.key} (Opsional)`}
                          value={opt.image_url || ''}
                          onChange={(e) => handleOptionChange(idx, 'image_url', e.target.value)}
                          className="w-full px-2.5 py-1 rounded-lg border text-[11px] bg-white text-slate-500"
                          suppressHydrationWarning
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PILIHAN GANDA KOMPLEKS */}
              {questionType === 'complex_multiple_choice' && (
                <div className="space-y-3 pt-3 border-t">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Pilihan Jawaban & Kunci (Centang Semua Opsi Benar)
                  </label>
                  {options.map((opt, idx) => (
                    <div key={opt.key} className="space-y-1 p-3 border rounded-xl bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={correctComplexOptions.includes(opt.key)}
                          onChange={() => handleComplexToggle(opt.key)}
                          suppressHydrationWarning
                        />
                        <span className="font-bold text-xs">{opt.key}.</span>
                        <input
                          type="text"
                          required
                          placeholder={`Teks Jawaban Opsi ${opt.key}`}
                          value={opt.text || ''}
                          onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border text-xs bg-white"
                          suppressHydrationWarning
                        />
                      </div>
                      <div className="pl-6">
                        <input
                          type="text"
                          placeholder={`URL Gambar Opsi ${opt.key} (Opsional)`}
                          value={opt.image_url || ''}
                          onChange={(e) => handleOptionChange(idx, 'image_url', e.target.value)}
                          className="w-full px-2.5 py-1 rounded-lg border text-[11px] bg-white text-slate-500"
                          suppressHydrationWarning
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MATRIKS BENAR - SALAH */}
              {questionType === 'true_false_matrix' && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Daftar Pernyataan & Kunci Jawaban
                    </label>
                    <button
                      type="button"
                      onClick={addStatement}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                      suppressHydrationWarning
                    >
                      + Tambah Pernyataan
                    </button>
                  </div>

                  {statements.map((st, idx) => (
                    <div key={st.id || idx} className="space-y-1 p-3 border rounded-xl bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs w-6 text-center">{idx + 1}.</span>
                        <input
                          type="text"
                          required
                          placeholder={`Pernyataan ${idx + 1}`}
                          value={st.text || ''}
                          onChange={(e) => handleStatementChange(idx, 'text', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border text-xs bg-white"
                          suppressHydrationWarning
                        />
                        <select
                          value={st.correct_val}
                          onChange={(e) => handleStatementChange(idx, 'correct_val', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-white text-indigo-700"
                          suppressHydrationWarning
                        >
                          <option value="Benar">Benar</option>
                          <option value="Salah">Salah</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeStatement(idx)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1"
                          suppressHydrationWarning
                        >
                          ✕
                        </button>
                      </div>
                      <div className="pl-8">
                        <input
                          type="text"
                          placeholder={`URL Gambar Pernyataan ${idx + 1} (Opsional)`}
                          value={st.image_url || ''}
                          onChange={(e) => handleStatementChange(idx, 'image_url', e.target.value)}
                          className="w-full px-2.5 py-1 rounded-lg border text-[11px] bg-white text-slate-500"
                          suppressHydrationWarning
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* URAIAN / ESSAY */}
              {questionType === 'essay' && (
                <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">📝 Catatan Soal Uraian / Essay:</p>
                  <p className="leading-relaxed text-[11px]">
                    Siswa akan menjawab dalam bentuk lembar esai teks bebas. Nilai akhir soal ini akan diberikan atau disesuaikan secara manual oleh Guru/Admin di halaman Rekap Nilai Hasil Ujian.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t space-y-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  💡 Pembahasan Soal / Pedoman Penskoran Guru
                </label>
                <textarea
                  id="explanationTextarea"
                  rows={3}
                  placeholder="Tuliskan pembahasan atau kata kunci rubrik penilaian di sini..."
                  value={explanation || ''}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  suppressHydrationWarning
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 ${
                  editingQuestionId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                suppressHydrationWarning
              >
                {isSubmitting ? 'Menyimpan...' : editingQuestionId ? 'Simpan Perubahan Soal' : 'Tambah Soal Manual'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: DAFTAR SOAL AKTIF (DENGAN CHECKLIST, SORTING, & HAPUS BATCH) */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {/* BILAH KONTROL ATAS: CHECKLIST, BATCH DELETE, SORTING & FILTER */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              {/* SELEKSI CHECKLIST MASSAL & HAPUS */}
              <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
                <label className="flex items-center space-x-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={
                      filteredAndSortedQuestions.length > 0 &&
                      selectedIds.length === filteredAndSortedQuestions.length
                    }
                    onChange={() => handleToggleSelectAll(filteredAndSortedQuestions)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  />
                  <span>Pilih Semua ({filteredAndSortedQuestions.length})</span>
                </label>

                {selectedIds.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1"
                  >
                    <span>🗑️ Hapus Terpilih ({selectedIds.length})</span>
                  </button>
                )}

                <button
                  onClick={handleDeleteAllQuestions}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors"
                  title="Hapus seluruh soal pada ujian ini"
                >
                  ⚠️ Hapus Semua Soal
                </button>
              </div>

              {/* FITUR SORTING & FILTER TIPE SOAL */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-bold text-slate-500">🔀 Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="created_asc">🔢 Nomor (Lama → Baru)</option>
                    <option value="created_desc">🔢 Nomor (Baru → Lama)</option>
                    <option value="type">🏷️ Tipe Soal</option>
                    <option value="score_desc">⭐ Bobot (Terbesar)</option>
                    <option value="score_asc">⭐ Bobot (Terkecil)</option>
                  </select>
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="ALL">🌐 Semua Tipe</option>
                  <option value="multiple_choice">🔘 Pilihan Ganda</option>
                  <option value="complex_multiple_choice">☑️ PG Kompleks</option>
                  <option value="true_false_matrix">📊 Matriks</option>
                  <option value="essay">📝 Essay</option>
                </select>

                <button
                  onClick={() => {
                    resetForm()
                    setActiveTab('form')
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shrink-0"
                >
                  + Tambah Soal
                </button>
              </div>
            </div>

            {/* DAFTAR KARTU SOAL AKTIF DENGAN CHECKLIST */}
            {filteredAndSortedQuestions.length > 0 ? (
              filteredAndSortedQuestions.map((q, idx) => {
                const qType = q.question_type || 'multiple_choice'
                const isChecked = selectedIds.includes(q.id)

                return (
                  <div
                    key={q.id}
                    className={`bg-white p-6 rounded-2xl border shadow-sm space-y-3 transition-all ${
                      isChecked
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* BARIS HEADER KARTU SOAL DENGAN CHECKBOX */}
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(q.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                        />
                        <span className="font-bold text-indigo-600 text-sm">No. {idx + 1}</span>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase">
                          {qType === 'complex_multiple_choice'
                            ? 'PG Kompleks'
                            : qType === 'true_false_matrix'
                            ? 'Matriks'
                            : qType === 'essay'
                            ? 'Uraian / Essay'
                            : 'Pilihan Ganda'}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          (Bobot: {q.max_score || 1} Poin)
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(q)}
                          className="text-xs text-amber-600 hover:text-amber-800 font-bold bg-amber-50 px-3 py-1 rounded-lg border border-amber-200"
                          suppressHydrationWarning
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1"
                          suppressHydrationWarning
                        >
                          Hapus
                        </button>
                      </div>
                    </div>

                    <div className="text-slate-800 text-sm font-medium">
                      <MathRenderer content={q.question_text} />
                    </div>

                    {q.image_url && (
                      <div className="my-2">
                        <img src={q.image_url} alt="Gambar Soal" className="max-h-56 rounded-xl border" />
                      </div>
                    )}

                    {/* Pratinjau Opsi PG & PG Kompleks */}
                    {(qType === 'multiple_choice' || qType === 'complex_multiple_choice') &&
                      Array.isArray(q.options) && (
                        <div className="space-y-1.5 pl-3 border-l-2 border-slate-200 text-xs">
                          {q.options.map((opt: any, oIdx: number) => {
                            const optKey = opt.key || String.fromCharCode(65 + oIdx)
                            let isKey = false
                            if (qType === 'multiple_choice') {
                              isKey = String(q.correct_option).trim().toUpperCase() === optKey
                            } else {
                              isKey = Array.isArray(q.correct_answers)
                                ? q.correct_answers.includes(optKey)
                                : String(q.correct_option).includes(optKey)
                            }

                            return (
                              <div
                                key={optKey || oIdx}
                                className={`flex items-start space-x-2 ${
                                  isKey ? 'font-bold text-emerald-700' : 'text-slate-600'
                                }`}
                              >
                                <span className="w-4">{optKey}.</span>
                                <div className="flex-1">
                                  <MathRenderer content={typeof opt === 'string' ? opt : opt.text} />
                                  {opt.image_url && (
                                    <img src={opt.image_url} alt={`Gambar Opsi ${optKey}`} className="max-h-24 mt-1 rounded border" />
                                  )}
                                </div>
                                {isKey && <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded font-bold">Kunci</span>}
                              </div>
                            )
                          })}
                        </div>
                      )}

                    {/* Pratinjau Pernyataan Matriks */}
                    {qType === 'true_false_matrix' && Array.isArray(q.options) && (
                      <div className="border rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b font-bold text-slate-700">
                            <tr>
                              <th className="p-2.5">Pernyataan</th>
                              <th className="p-2.5 w-24 text-center border-l">Kunci</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {q.options.map((st: any, sIdx: number) => {
                              const keyVal = q.correct_answers?.[st.id] || st.correct_val || 'Benar'
                              return (
                                <tr key={st.id || sIdx}>
                                  <td className="p-2.5">
                                    <MathRenderer content={typeof st === 'string' ? st : st.text} />
                                    {st.image_url && (
                                      <img src={st.image_url} alt="Gambar Pernyataan" className="max-h-20 mt-1 rounded border" />
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center border-l font-bold text-indigo-700">
                                    {keyVal}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pratinjau Essay */}
                    {qType === 'essay' && (
                      <div className="p-3 bg-slate-50 rounded-xl border text-xs text-slate-600 space-y-1">
                        <span className="font-bold text-slate-800 block">Rubrik / Pedoman Guru:</span>
                        <p>{q.explanation || 'Tidak ada pedoman penskoran khusus.'}</p>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm">
                Belum ada soal pada ujian ini.
              </div>
            )}
          </div>
        )}
      </main>

      <BulkUploadModal
        examId={examId}
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  )
}

export default function ExamQuestionManagerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <p className="text-slate-600 font-medium">Memuat manajer soal admin...</p>
        </div>
      }
    >
      <QuestionManagerContent />
    </Suspense>
  )
}