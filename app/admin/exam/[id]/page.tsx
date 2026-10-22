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

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  const [questionType, setQuestionType] = useState<
    'multiple_choice' | 'complex_multiple_choice' | 'true_false_matrix'
  >('multiple_choice')
  const [questionText, setQuestionText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [maxScore, setMaxScore] = useState(1.0)
  const [explanation, setExplanation] = useState('')

  const [options, setOptions] = useState([
    { key: 'A', text: '', image_url: '' },
    { key: 'B', text: '', image_url: '' },
    { key: 'C', text: '', image_url: '' },
    { key: 'D', text: '', image_url: '' },
  ])

  const [correctSingleOption, setCorrectSingleOption] = useState('A')
  const [correctComplexOptions, setCorrectComplexOptions] = useState<string[]>([])

  const [statements, setStatements] = useState([
    { id: '1', text: 'Pernyataan 1', correct_val: 'Benar' },
    { id: '2', text: 'Pernyataan 2', correct_val: 'Salah' },
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

  const insertFormatText = (before: string, after: string = '') => {
    const textarea = document.getElementById(
      'questionTextarea'
    ) as HTMLTextAreaElement
    if (!textarea) {
      setQuestionText((prev) => prev + before + after)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = questionText.substring(start, end)
    const replacement = before + (selected || '') + after

    const newText =
      questionText.substring(0, start) + replacement + questionText.substring(end)
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
    field: 'text' | 'correct_val',
    val: string
  ) => {
    const updated = [...statements]
    updated[idx][field] = val || ''
    setStatements(updated)
  }

  const addStatement = () => {
    setStatements([
      ...statements,
      {
        id: String(statements.length + 1),
        text: `Pernyataan ${statements.length + 1}`,
        correct_val: 'Benar',
      },
    ])
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
      { id: '1', text: 'Pernyataan 1', correct_val: 'Benar' },
      { id: '2', text: 'Pernyataan 2', correct_val: 'Salah' },
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
        setCorrectSingleOption(q.correct_option || 'A')
      } else {
        setCorrectComplexOptions(q.correct_answers || [q.correct_option])
      }
    } else if (q.question_type === 'true_false_matrix') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        const formattedStatements = q.options.map((st: any) => ({
          id: st.id,
          text: st.text || '',
          correct_val: q.correct_answers?.[st.id] || st.correct_val || 'Benar',
        }))
        setStatements(formattedStatements)
      }
    }

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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-4 border-slate-200 gap-3">
          <div>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
              {exam?.subtest}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              ⚙️ Kelola Soal Admin: {exam?.title}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center space-x-1"
              suppressHydrationWarning
            >
              <span>📥</span>
              <span>Import Soal (Bulk)</span>
            </button>

            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ← Dashboard Admin
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Input / Edit Soal */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h2 className="text-lg font-bold text-slate-800">
                {editingQuestionId ? '✏️ Edit Butir Soal' : '➕ Input Soal Manual'}
              </h2>
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-semibold transition-colors"
                  suppressHydrationWarning
                >
                  ✕ Batal Edit
                </button>
              )}
            </div>

            {msg && (
              <div
                className={`p-3 rounded-lg text-xs font-medium mb-4 ${
                  msg.startsWith('Error')
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {msg}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4" suppressHydrationWarning>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tipe Soal TKA
                </label>
                <select
                  value={questionType}
                  onChange={(e: any) => setQuestionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  suppressHydrationWarning
                >
                  <option value="multiple_choice">Pilihan Ganda (1 Jawaban Benar)</option>
                  <option value="complex_multiple_choice">Pilihan Ganda Kompleks</option>
                  <option value="true_false_matrix">Matriks (Benar - Salah)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Stimulus / Teks Soal
                </label>
                <textarea
                  id="questionTextarea"
                  rows={4}
                  required
                  value={questionText || ''}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Ketik soal di sini..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  suppressHydrationWarning
                />
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
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  suppressHydrationWarning
                />
              </div>

              {questionType === 'multiple_choice' && (
                <div className="space-y-3 pt-2 border-t">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Pilihan Jawaban & Kunci
                  </label>
                  {options.map((opt, idx) => (
                    <div key={opt.key} className="flex items-center space-x-2 p-2 border rounded-lg bg-slate-50">
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
                        placeholder={`Teks Jawaban ${opt.key}`}
                        value={opt.text || ''}
                        onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                        className="flex-1 px-2 py-1 rounded border text-xs bg-white"
                        suppressHydrationWarning
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t space-y-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  💡 Pembahasan Soal
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan pembahasan di sini..."
                  value={explanation || ''}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  suppressHydrationWarning
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 ${
                  editingQuestionId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                suppressHydrationWarning
              >
                {isSubmitting ? 'Menyimpan...' : editingQuestionId ? 'Simpan Perubahan Soal' : 'Tambah Soal Manual'}
              </button>
            </form>
          </div>

          {/* Daftar Soal */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">
              📚 Daftar Soal Aktif ({questions.length})
            </h2>

            {questions.length > 0 ? (
              questions.map((q, idx) => (
                <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-indigo-600 text-sm">No. {idx + 1}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditClick(q)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded border border-amber-200"
                        suppressHydrationWarning
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                        suppressHydrationWarning
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  <div className="text-slate-800 text-sm font-medium">
                    <MathRenderer content={q.question_text} />
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
                Belum ada soal pada ujian ini.
              </div>
            )}
          </div>
        </div>
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