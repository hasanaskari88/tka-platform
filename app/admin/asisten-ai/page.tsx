'use client'

import { useState } from 'react'
import { Bot, Sparkles, Loader2, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react'

type QuestionType = 'multiple_choice' | 'complex_multiple_choice' | 'true_false_matrix' | 'essay'
type GeneratedQuestion = {
  question: string
  explanation: string
  options?: { A: string; B: string; C: string; D: string }
  answer?: 'A' | 'B' | 'C' | 'D'
  answers?: string[]
  statements?: { id: string; text: string; answer: 'Benar' | 'Salah' }[]
  model_answer?: string
  rubric?: string
  max_score?: number
}

const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Pilihan ganda',
  complex_multiple_choice: 'Pilihan ganda kompleks',
  true_false_matrix: 'Benar / Salah (Matriks)',
  essay: 'Uraian',
}

export default function AsistenAIPage() {
  const [grade, setGrade] = useState('Kelas 6 SD')
  const [subject, setSubject] = useState('Bahasa Indonesia')
  const [topic, setTopic] = useState('Kalimat sederhana dan penggunaan tanda baca')
  const [count, setCount] = useState(5)
  const [indicator, setIndicator] = useState('')
  const [cognitiveLevel, setCognitiveLevel] = useState('AUTO')
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice')
  const [shortAnswerCount, setShortAnswerCount] = useState(10)
  const [shortAnswerMaxScore, setShortAnswerMaxScore] = useState(2)
  const [longEssayMaxScore, setLongEssayMaxScore] = useState(3)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('Menghubungi Gemini...')

  async function generateQuestions(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setQuestions([])

    try {
      setLoadingMessage('Memulai proses pembuatan soal...')
      const response = await fetch('/api/admin/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, subject, topic, count, indicator, cognitiveLevel, questionType, shortAnswerCount, shortAnswerMaxScore, longEssayMaxScore }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Gagal memulai pembuatan soal.')
      if (!payload.interactionId) throw new Error('Gemini tidak memberikan ID proses.')

      setLoadingMessage('Gemini sedang menyusun soal. Hasil diperiksa otomatis setiap beberapa detik...')
      const startedAt = Date.now()
      let completed = false
      while (!completed && Date.now() - startedAt < 240000) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        const check = await fetch('/api/admin/ai/generate-questions?id=' + encodeURIComponent(payload.interactionId) + '&count=' + count, { cache: 'no-store' })
        const result = await check.json()
        if (!check.ok) throw new Error(result.error || 'Gemini gagal membuat soal.')
        if (result.status === 'completed') {
          setQuestions(result.questions || [])
          setModel(result.model || 'Gemini')
          completed = true
        } else if (result.status !== 'in_progress' && result.status !== 'requires_action') {
          throw new Error(result.error || 'Proses Gemini gagal.')
        }
      }
      if (!completed) throw new Error('Gemini masih memproses soal setelah 4 menit. Silakan coba lagi nanti.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-600 p-5 text-white shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-3"><Bot size={28} /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">Fitur percobaan</p>
              <h1 className="text-2xl font-black sm:text-3xl">Asisten AI Guru</h1>
              <p className="mt-1 text-sm text-indigo-100">Bantu guru menyiapkan soal pembelajaran dengan Gemini.</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="text-violet-600" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Uji coba membuat soal</h2>
          </div>

          <form onSubmit={generateQuestions} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Kelas
              <input value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={40} required className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Mata pelajaran
              <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={80} required className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
              Materi / topik
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={300} required rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Contoh: penjumlahan bilangan sampai 100" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
              Indikator soal <span className="font-normal text-slate-400">(opsional)</span>
              <textarea value={indicator} onChange={(e) => setIndicator(e.target.value)} maxLength={200} rows={2} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Contoh: Disajikan sebuah teks, siswa dapat menentukan gagasan pokok." />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Bentuk soal
              <select value={questionType} onChange={(e) => { const nextType = e.target.value as QuestionType; setQuestionType(nextType); if (nextType === 'essay') { setCount(15); setShortAnswerCount(10) } }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="multiple_choice">Pilihan ganda (1 jawaban benar)</option>
                <option value="complex_multiple_choice">Pilihan ganda kompleks (lebih dari 1 benar)</option>
                <option value="true_false_matrix">Benar / Salah (beberapa pernyataan)</option>
                <option value="essay">Uraian (dengan rubrik penilaian)</option>
              </select>
            </label>
            {questionType === 'essay' && (
              <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 sm:col-span-2">
                <div>
                  <p className="text-sm font-bold text-violet-900">Pengaturan kelompok skor uraian</p>
                  <p className="mt-1 text-xs font-normal text-violet-800">Semua soal tetap disimpan sebagai tipe uraian/essay agar kompatibel dengan CBT.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Jumlah soal isian singkat pertama
                    <input type="number" min={1} max={Math.max(1, count - 1)} value={shortAnswerCount} onChange={(e) => setShortAnswerCount(Math.min(Math.max(1, Number(e.target.value)), Math.max(1, count - 1)))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" />
                  </label>
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Skor maksimal isian singkat
                    <input type="number" min={1} max={100} value={shortAnswerMaxScore} onChange={(e) => setShortAnswerMaxScore(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" />
                  </label>
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Skor maksimal uraian panjang
                    <input type="number" min={1} max={100} value={longEssayMaxScore} onChange={(e) => setLongEssayMaxScore(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" />
                  </label>
                </div>
                <p className="text-xs text-violet-900">Contoh: jika jumlah soal 15 dan kelompok pertama 10, maka soal 1–10 mendapat maksimal {shortAnswerMaxScore} poin dan soal 11–15 maksimal {longEssayMaxScore} poin.</p>
              </div>
            )}
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Level kognitif
              <select value={cognitiveLevel} onChange={(e) => setCognitiveLevel(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="AUTO">Otomatis sesuai materi</option>
                <option value="LOTS">LOTS — mengingat dan memahami</option>
                <option value="MOTS">MOTS — menerapkan</option>
                <option value="HOTS">HOTS — menganalisis dan menalar</option>
                <option value="C1">C1 — Mengingat</option>
                <option value="C2">C2 — Memahami</option>
                <option value="C3">C3 — Menerapkan</option>
                <option value="C4">C4 — Menganalisis</option>
                <option value="C5">C5 — Mengevaluasi</option>
                <option value="C6">C6 — Mencipta</option>
              </select>
            </label>
            <div className="space-y-1.5 text-sm font-semibold text-slate-700">
              Model AI
              <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal text-slate-700">
                <span className="font-semibold">Gemini 4 Hydrogen</span>
                <span className="ml-2 text-xs text-emerald-700">Aktif</span>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Varian 4 Hydrogen Thinking belum diaktifkan karena ID model API-nya belum dapat diverifikasi.</p>
              </div>
            </div>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Jumlah soal
              <select value={count} onChange={(e) => { const nextCount = Number(e.target.value); setCount(nextCount); setShortAnswerCount((current) => Math.min(current, Math.max(1, nextCount - 1))) }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => <option key={n} value={n}>{n} soal</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {loading ? 'Gemini sedang membuat soal...' : 'Buat soal dengan AI'}
              </button>
            </div>
          </form>

          {loading && <p className="mt-3 text-center text-xs text-slate-500" aria-live="polite">{loadingMessage}</p>}
          {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
        </section>

        {questions.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-black text-slate-800">Hasil dari Asisten AI</h2>
                <p className="text-sm text-slate-500">{questions.length} soal berhasil dibuat · {model} · {questionTypeLabels[questionType]}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> Berhasil</span>
            </div>

            {questions.map((item, index) => (
              <article key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-black text-indigo-700">{index + 1}</span>
                  <h3 className="pt-1 font-bold leading-relaxed text-slate-800">{item.question}</h3>
                </div>

                {questionType === 'multiple_choice' && item.options && (
                  <div className="ml-11 grid gap-2 sm:grid-cols-2">
                    {(['A', 'B', 'C', 'D'] as const).map((key) => (
                      <div key={key} className={`rounded-lg border px-3 py-2.5 text-sm ${item.answer === key ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        <span className="mr-2 font-black">{key}.</span>{item.options?.[key]}
                        {item.answer === key && <CheckCircle2 size={15} className="ml-2 inline" />}
                      </div>
                    ))}
                  </div>
                )}

                {questionType === 'complex_multiple_choice' && item.options && (
                  <div className="ml-11 space-y-2">
                    {(['A', 'B', 'C', 'D'] as const).map((key) => {
                      const isCorrect = item.answers?.includes(key)
                      return <div key={key} className={`rounded-lg border px-3 py-2.5 text-sm ${isCorrect ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        <span className="mr-2 font-black">{key}.</span>{item.options?.[key]}
                        {isCorrect && <span className="ml-2 text-xs font-bold">✓ Kunci benar</span>}
                      </div>
                    })}
                    <p className="text-xs font-bold text-emerald-700">Kunci jawaban: {item.answers?.join(', ')}</p>
                  </div>
                )}

                {questionType === 'true_false_matrix' && (
                  <div className="ml-11 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 text-left">Pernyataan</th><th className="px-3 py-2 text-center">Kunci</th></tr></thead>
                      <tbody>{item.statements?.map((statement) => <tr key={statement.id} className="border-t border-slate-200"><td className="px-3 py-2">{statement.id}. {statement.text}</td><td className="px-3 py-2 text-center font-bold text-emerald-700">{statement.answer}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}

                {questionType === 'essay' && (
                  <div className="ml-11 space-y-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      <p className="font-bold">Contoh jawaban</p>
                      <p className="mt-1 whitespace-pre-wrap">{item.model_answer}</p>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                      <p className="font-bold">Pedoman penilaian · Skor maksimal {item.max_score ?? 10}</p>
                      <p className="mt-1 whitespace-pre-wrap">{item.rubric}</p>
                    </div>
                  </div>
                )}

                <div className="ml-11 mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-bold">Pembahasan</p>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.explanation}</p>
                </div>
              </article>
            ))}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <BookOpen size={18} className="mt-0.5 shrink-0" />
                <p><strong>Catatan:</strong> Hasil ini masih berupa draf dan belum disimpan ke bank soal. Guru perlu memeriksa isi, kunci jawaban, contoh jawaban, serta pedoman penilaian sebelum digunakan. Khusus soal uraian, nilai akhir tetap ditentukan oleh guru.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
