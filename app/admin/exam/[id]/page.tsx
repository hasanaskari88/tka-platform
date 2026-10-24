'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import BulkUploadModal from '@/components/BulkUploadModal'
import Link from 'next/link'

function QuestionManagerContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Mode Tab: 'form' atau 'list'
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form')

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  // Form State
  const [questionType, setQuestionType] = useState<
    'multiple_choice' | 'complex_multiple_choice' | 'true_false_matrix'
  >('multiple_choice')
  const [questionText, setQuestionText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [maxScore, setMaxScore] = useState(1.0)
  const [explanation, setExplanation] = useState('')

  // State Opsi PG & PG Kompleks (dengan Teks & URL Gambar)
  const [options, setOptions] = useState([
    { key: 'A', text: '', image_url: '' },
    { key: 'B', text: '', image_url: '' },
    { key: 'C', text: '', image_url: '' },
    { key: 'D', text: '', image_url: '' },
  ])

  // State Kunci Jawaban
  const [correctSingleOption, setCorrectSingleOption] = useState('A')
  const [correctComplexOptions, setCorrectComplexOptions] = useState<string[]>([])

  // State Pernyataan untuk Matriks Benar - Salah
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

  // Helper Menyisipkan Teks / Tag HTML / Latex pada Kursor Textarea
  const insertFormatText = (before: string, after: string = '') => {
    const textarea = document.getElementById('questionTextarea') as HTMLTextAreaElement
    if (!textarea) {
      setQuestionText((prev) => prev + before + after)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = questionText.substring(start, end)
    const replacement = before + (selected || '') + after

    const newText = questionText.substring(0, start) + replacement + questionText.substring(end)
    setQuestionText(newText)

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
    setQuestionType(q.question_type || 'multiple_choice')
    setQuestionText(q.question_text || '')
    setImageUrl(q.image_url || '')
    setMaxScore(Number(q.max_score) || 1.0)
    setExplanation(q.explanation || '')

    if (
      q.question_type === 'multiple_choice' ||
      q.question_type === 'complex_multiple_choice'
    ) {
      if (Array.isArray(q.options) && q.options.length > 0) {
        const normalizedOptions = q.options.map((opt: any, index: number) => ({
          key: opt.key || String.fromCharCode(65 + index),
          text: opt.text || '',
          image_url: opt.image_url || '',
        }))
        setOptions(normalizedOptions)
      }

      if (q.question_type === 'multiple_choice') {
        setCorrectSingleOption(
          q.correct_option || (Array.isArray(q.correct_answers) ? q.correct_answers[0] : 'A')
        )
      } else {
        if (Array.isArray(q.correct_answers)) {
          setCorrectComplexOptions(q.correct_answers)
        } else if (q.correct_option) {
          setCorrectComplexOptions(q.correct_option.split(',').map((s: string) => s.trim()))
        } else {
          setCorrectComplexOptions([])
        }
      }
    } else if (q.question_type === 'true_false_matrix') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        const formattedStatements = q.options.map((st: any) => ({
          id: String(st.id),
          text: st.text || '',
          image_url: st.image_url || '',
          correct_val: q.correct_answers?.[st.id] || st.correct_val || 'Benar',
        }))
        setStatements(formattedStatements)
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
    }
    setIsSubmitting(false)
  }

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Hapus butir soal ini?')) return
    const supabase = createClient()
    await supabase.from('questions').delete().eq('id', qId)
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
      <Navbar />

      <main className="p-8 max-w-6xl mx-auto space-y-6">
        {/* HEADER INFORMASI UJIAN & TOKEN */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
                {exam?.subtest || 'SUBTES TKA'}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                🔑 Token: {exam?.token_code || exam?.token || 'AKTIF'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              ⚙️ Kelola Soal: {exam?.title}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
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

        {/* BARS NAVIGASI TAB UTAMA */}
        <div className="flex border-b border-slate-200 space-x-4">
          <button
            onClick={() => setActiveTab('form')}
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

            <form onSubmit={handleSaveQuestion} className="space-y-4" suppressHydrationWarning>
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

              {/* TOOLBAR FORMATTING TEKS & MATH HELPER */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Stimulus / Teks Soal
                  </label>
                  <span className="text-[10px] text-slate-400">Mendukung Format HTML & Math (LaTeX)</span>
                </div>

                {/* Toolbar Pintas */}
                <div className="flex flex-wrap gap-1 bg-slate-100 p-2 rounded-t-xl border border-b-0 border-slate-300 text-xs">
                  <button type="button" onClick={() => insertFormatText('<b>', '</b>')} className="px-2 py-1 bg-white border rounded font-bold hover:bg-slate-50">B</button>
                  <button type="button" onClick={() => insertFormatText('<i>', '</i>')} className="px-2 py-1 bg-white border rounded italic hover:bg-slate-50">I</button>
                  <button type="button" onClick={() => insertFormatText('<u>', '</u>')} className="px-2 py-1 bg-white border rounded underline hover:bg-slate-50">U</button>
                  <button type="button" onClick={() => insertFormatText('<div text-center>', '</div>')} className="px-2 py-1 bg-white border rounded hover:bg-slate-50">Align Center</button>
                  <button type="button" onClick={() => insertFormatText('<blockquote>', '</blockquote>')} className="px-2 py-1 bg-white border rounded hover:bg-slate-50">Kutipan</button>
                  <button type="button" onClick={() => insertFormatText('<table border="1"><tr><td>', '</td></tr></table>')} className="px-2 py-1 bg-white border rounded hover:bg-slate-50">Tabel</button>
                  <span className="border-r border-slate-300 mx-1"></span>
                  <button type="button" onClick={() => insertFormatText('$\\frac{', '}{}$')} className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold hover:bg-indigo-100">{"Pecahan $\\frac{a}{b}$"}</button>
  <button type="button" onClick={() => insertFormatText('$\\sqrt{', '}$')} className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold hover:bg-indigo-100">{"Akar $\\sqrt{x}$"}</button>
  <button type="button" onClick={() => insertFormatText('$x^{', '}$')} className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold hover:bg-indigo-100">{"Pangkat $x^n$"}</button>
  <button type="button" onClick={() => insertFormatText('$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$')} className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold hover:bg-indigo-100">Matriks Math</button>
                </div>

                <textarea
                  id="questionTextarea"
                  rows={5}
                  required
                  value={questionText || ''}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Ketik teks soal / gunakan toolbar di atas..."
                  className="w-full px-3 py-2 rounded-b-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                  suppressHydrationWarning
                />
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

              {/* 🟢 PILIHAN GANDA BIASA */}
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

              {/* 🟢 PILIHAN GANDA KOMPLEKS */}
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

              {/* 🟢 MATRIKS BENAR - SALAH */}
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

              <div className="pt-3 border-t space-y-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  💡 Pembahasan Soal
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan pembahasan di sini..."
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

        {/* TAB 2: DAFTAR SOAL AKTIF */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">
                📚 Daftar Soal Aktif ({questions.length})
              </h2>
              <button
                onClick={() => {
                  resetForm()
                  setActiveTab('form')
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
              >
                + Tambah Soal Baru
              </button>
            </div>

            {questions.length > 0 ? (
              questions.map((q, idx) => {
                const qType = q.question_type || 'multiple_choice'

                return (
                  <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-indigo-600 text-sm">No. {idx + 1}</span>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase">
                          {qType === 'complex_multiple_choice'
                            ? 'PG Kompleks'
                            : qType === 'true_false_matrix'
                            ? 'Matriks'
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
                          {q.options.map((opt: any) => {
                            let isKey = false
                            if (qType === 'multiple_choice') {
                              isKey = q.correct_option === opt.key
                            } else {
                              isKey = Array.isArray(q.correct_answers)
                                ? q.correct_answers.includes(opt.key)
                                : String(q.correct_option).includes(opt.key)
                            }

                            return (
                              <div
                                key={opt.key}
                                className={`flex items-start space-x-2 ${
                                  isKey ? 'font-bold text-emerald-700' : 'text-slate-600'
                                }`}
                              >
                                <span className="w-4">{opt.key}.</span>
                                <div className="flex-1">
                                  <MathRenderer content={opt.text} />
                                  {opt.image_url && (
                                    <img src={opt.image_url} alt={`Gambar Opsi ${opt.key}`} className="max-h-24 mt-1 rounded border" />
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
                                    <MathRenderer content={st.text} />
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