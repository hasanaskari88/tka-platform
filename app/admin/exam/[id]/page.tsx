'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

function QuestionManagerContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State untuk Mode Edit
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  // Form State Soal
  const [questionType, setQuestionType] = useState<
    'multiple_choice' | 'complex_multiple_choice' | 'true_false_matrix'
  >('multiple_choice')
  const [questionText, setQuestionText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [maxScore, setMaxScore] = useState(1.0)

  // Options State untuk PG & PG Kompleks
  const [options, setOptions] = useState([
    { key: 'A', text: '', image_url: '' },
    { key: 'B', text: '', image_url: '' },
    { key: 'C', text: '', image_url: '' },
    { key: 'D', text: '', image_url: '' },
  ])

  // Kunci Jawaban
  const [correctSingleOption, setCorrectSingleOption] = useState('A')
  const [correctComplexOptions, setCorrectComplexOptions] = useState<string[]>([])

  // State untuk Menjodohkan / Pernyataan Benar-Salah
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

  // Helper untuk Sisip Format Teks / Rumus pada Posisi Kursor
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
    updated[idx][field] = value
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
    updated[idx][field] = val
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

  // Muat Data Soal ke Form saat Tombol Edit Diklik
  const handleEditClick = (q: any) => {
    setEditingQuestionId(q.id)
    setQuestionType(q.question_type || 'multiple_choice')
    setQuestionText(q.question_text || '')
    setImageUrl(q.image_url || '')
    setMaxScore(Number(q.max_score) || 1.0)

    if (q.question_type === 'multiple_choice') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        setOptions(q.options)
      }
      setCorrectSingleOption(q.correct_option || 'A')
    } else if (q.question_type === 'complex_multiple_choice') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        setOptions(q.options)
      }
      setCorrectComplexOptions(q.correct_answers || [q.correct_option])
    } else if (q.question_type === 'true_false_matrix') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        const formattedStatements = q.options.map((st: any) => ({
          id: st.id,
          text: st.text,
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
      // Modus Update / Edit Soal
      const res = await supabase
        .from('questions')
        .update(payload)
        .eq('id', editingQuestionId)
      error = res.error
    } else {
      // Modus Tambah Soal Baru
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
          Memuat data soal...
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="p-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-200">
          <div>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
              {exam?.subtest}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              Kelola Soal: {exam?.title}
            </h1>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            ← Kembali ke Dashboard Admin
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Input / Edit Soal */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h2 className="text-lg font-bold text-slate-800">
                {editingQuestionId ? '✏️ Edit Butir Soal' : '➕ Buat Soal Variasi TKA'}
              </h2>
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-semibold transition-colors"
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

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Tipe Soal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tipe Soal TKA
                </label>
                <select
                  value={questionType}
                  onChange={(e: any) => setQuestionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="multiple_choice">
                    Pilihan Ganda (1 Jawaban Benar)
                  </option>
                  <option value="complex_multiple_choice">
                    Pilihan Ganda Kompleks (Beberapa Jawaban Benar)
                  </option>
                  <option value="true_false_matrix">
                    Menjodohkan / Matriks (Benar - Salah)
                  </option>
                </select>
              </div>

              {/* Bilah Alat Format Penulisan (Formatting Toolbar) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Stimulus / Teks Soal
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    KaTeX: $...$
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 p-1.5 bg-slate-100 border border-slate-200 rounded-t-lg text-xs mb-[-1px]">
                  <button
                    type="button"
                    onClick={() => insertFormatText('**', '**')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded font-bold"
                    title="Cetak Tebal (Bold)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatText('*', '*')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded italic"
                    title="Cetak Miring (Italic)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatText('<u>', '</u>')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded underline"
                    title="Garis Bawah (Underline)"
                  >
                    U
                  </button>
                  <span className="border-r mx-0.5 border-slate-300"></span>

                  <button
                    type="button"
                    onClick={() =>
                      insertFormatText('<div style="text-align: left">', '</div>')
                    }
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded"
                    title="Rata Kiri"
                  >
                    ⬅ Kiri
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertFormatText('<div style="text-align: center">', '</div>')
                    }
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded font-semibold text-indigo-700"
                    title="Rata Tengah (Center)"
                  >
                    ↔ Tengah
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertFormatText('<div style="text-align: right">', '</div>')
                    }
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded"
                    title="Rata Kanan"
                  >
                    ➡️ Kanan
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertFormatText('<div style="text-align: justify">', '</div>')
                    }
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded font-semibold text-emerald-700"
                    title="Rata Kiri Kanan (Justify)"
                  >
                    ↔ Justify
                  </button>
                  <span className="border-r mx-0.5 border-slate-300"></span>

                  <button
                    type="button"
                    onClick={() => insertFormatText('$x^{2}$')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded font-mono font-bold text-indigo-600"
                    title="Sisip Pangkat (Superscript)"
                  >
                    x²
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatText('$\\frac{a}{b}$')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded font-mono font-bold text-indigo-600"
                    title="Sisip Pecahan (Fraction)"
                  >
                    ½ Pecahan
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertFormatText(
                        '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$'
                      )
                    }
                    className="px-2 py-1 bg-white hover:bg-slate-50 border rounded font-mono font-bold text-indigo-600"
                    title="Sisip Matriks"
                  >
                    [ Matrix ]
                  </button>
                </div>

                <textarea
                  id="questionTextarea"
                  rows={4}
                  required
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Ketik soal di sini. Klik tombol di atas untuk menyisipkan tebal, miring, pecahan, atau matriks..."
                  className="w-full px-3 py-2 rounded-b-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Preview Live Render */}
              {questionText && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-bold text-slate-500 block mb-1">
                    Preview Tampilan Soal:
                  </span>
                  <div className="bg-white p-3 rounded border">
                    <MathRenderer content={questionText} />
                  </div>
                </div>
              )}

              {/* Input URL Gambar Soal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  URL Gambar Soal / Stimulus (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://i.imgur.com/contoh.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                {imageUrl && (
                  <div className="mt-2 p-2 border rounded-lg bg-slate-50 text-center">
                    <img
                      src={imageUrl}
                      alt="Preview Gambar Soal"
                      className="max-h-40 mx-auto rounded object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Bobot Nilai Maksimal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Bobot Nilai Maksimal Soal Ini
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Opsi Berdasarkan Tipe Soal */}
              {questionType === 'multiple_choice' && (
                <div className="space-y-3 pt-2 border-t">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Pilihan Jawaban & Kunci
                  </label>
                  {options.map((opt, idx) => (
                    <div
                      key={opt.key}
                      className="space-y-1 p-2 border rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="correct_single"
                          checked={correctSingleOption === opt.key}
                          onChange={() => setCorrectSingleOption(opt.key)}
                        />
                        <span className="font-bold text-xs">{opt.key}.</span>
                        <input
                          type="text"
                          required
                          placeholder={`Teks Jawaban ${opt.key}`}
                          value={opt.text}
                          onChange={(e) =>
                            handleOptionChange(idx, 'text', e.target.value)
                          }
                          className="flex-1 px-2 py-1 rounded border text-xs bg-white"
                        />
                      </div>
                      <input
                        type="url"
                        placeholder={`URL Gambar Jawaban ${opt.key} (Opsional)`}
                        value={opt.image_url}
                        onChange={(e) =>
                          handleOptionChange(idx, 'image_url', e.target.value)
                        }
                        className="w-full px-2 py-1 rounded border text-[11px] bg-white text-slate-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {questionType === 'complex_multiple_choice' && (
                <div className="space-y-3 pt-2 border-t">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Pilihan Jawaban Kompleks (Centang Kunci Benar)
                  </label>
                  {options.map((opt, idx) => (
                    <div
                      key={opt.key}
                      className="space-y-1 p-2 border rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={correctComplexOptions.includes(opt.key)}
                          onChange={() => handleComplexToggle(opt.key)}
                        />
                        <span className="font-bold text-xs">{opt.key}.</span>
                        <input
                          type="text"
                          required
                          placeholder={`Teks Opsi ${opt.key}`}
                          value={opt.text}
                          onChange={(e) =>
                            handleOptionChange(idx, 'text', e.target.value)
                          }
                          className="flex-1 px-2 py-1 rounded border text-xs bg-white"
                        />
                      </div>
                      <input
                        type="url"
                        placeholder={`URL Gambar Opsi ${opt.key} (Opsional)`}
                        value={opt.image_url}
                        onChange={(e) =>
                          handleOptionChange(idx, 'image_url', e.target.value)
                        }
                        className="w-full px-2 py-1 rounded border text-[11px] bg-white text-slate-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {questionType === 'true_false_matrix' && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Matriks Pernyataan (Benar / Salah)
                    </label>
                    <button
                      type="button"
                      onClick={addStatement}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      + Tambah Baris
                    </button>
                  </div>
                  {statements.map((st, idx) => (
                    <div
                      key={st.id}
                      className="flex items-center space-x-2 p-2 border rounded-lg bg-slate-50"
                    >
                      <span className="text-xs font-bold text-slate-500">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        required
                        value={st.text}
                        onChange={(e) =>
                          handleStatementChange(idx, 'text', e.target.value)
                        }
                        className="flex-1 px-2 py-1 rounded border text-xs bg-white"
                      />
                      <select
                        value={st.correct_val}
                        onChange={(e) =>
                          handleStatementChange(idx, 'correct_val', e.target.value)
                        }
                        className="px-2 py-1 rounded border text-xs font-bold text-indigo-700 bg-white"
                      >
                        <option value="Benar">Benar</option>
                        <option value="Salah">Salah</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 ${
                  editingQuestionId
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSubmitting
                  ? 'Menyimpan...'
                  : editingQuestionId
                  ? 'Simpan Perubahan Soal'
                  : 'Tambah Soal Variasi Ini'}
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
                <div
                  key={q.id}
                  className={`bg-white p-5 rounded-xl border shadow-sm relative space-y-3 ${
                    editingQuestionId === q.id
                      ? 'border-amber-400 ring-2 ring-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-indigo-600 text-sm">
                        No. {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                        {q.question_type || 'PG'}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-200">
                        Max: {q.max_score} Poin
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditClick(q)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded border border-amber-200 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  {/* Teks & Gambar Soal */}
                  <div className="text-slate-800 text-sm font-medium">
                    <MathRenderer content={q.question_text} />
                    {q.image_url && (
                      <img
                        src={q.image_url}
                        alt="Gambar Soal"
                        className="max-h-48 rounded my-2 border object-contain"
                      />
                    )}
                  </div>

                  {/* Opsi Jawaban */}
                  {q.question_type === 'true_false_matrix' ? (
                    <div className="border rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="p-2 border-b">Pernyataan</th>
                            <th className="p-2 border-b w-24 text-center">Kunci</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.options?.map((st: any) => (
                            <tr key={st.id} className="border-b last:border-0">
                              <td className="p-2">{st.text}</td>
                              <td className="p-2 text-center font-bold text-indigo-600">
                                {q.correct_answers?.[st.id] || st.correct_val}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {q.options?.map((opt: any) => {
                        const isCorrect = Array.isArray(q.correct_answers)
                          ? q.correct_answers.includes(opt.key)
                          : q.correct_option === opt.key

                        return (
                          <div
                            key={opt.key}
                            className={`p-2 rounded-lg border ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className="mr-1">{opt.key}.</span>
                            <MathRenderer content={opt.text} />
                            {opt.image_url && (
                              <img
                                src={opt.image_url}
                                alt={`Gambar ${opt.key}`}
                                className="max-h-20 rounded mt-1 border"
                              />
                            )}
                            {isCorrect && (
                              <span className="ml-1 text-[10px] text-emerald-600">
                                (Kunci)
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
                Belum ada soal pada ujian ini. Silakan buat soal di formulir sebelah kiri.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ExamQuestionManagerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <p className="text-slate-600 font-medium">Memuat manazer soal...</p>
        </div>
      }
    >
      <QuestionManagerContent />
    </Suspense>
  )
}