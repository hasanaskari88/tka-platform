'use client'

import { useState } from 'react'
import { Bot, Sparkles, Loader2, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react'

type GeneratedQuestion = {
  question: string
  options: { A: string; B: string; C: string; D: string }
  answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

export default function AsistenAIPage() {
  const [grade, setGrade] = useState('Kelas 2 SD')
  const [subject, setSubject] = useState('Bahasa Indonesia')
  const [topic, setTopic] = useState('Kalimat sederhana dan penggunaan tanda baca')
  const [count, setCount] = useState(5)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState('')

  async function generateQuestions(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setQuestions([])

    try {
      const response = await fetch('/api/admin/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, subject, topic, count }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Gagal membuat soal.')
      }

      setQuestions(payload.questions || [])
      setModel(payload.model || 'Gemini')
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
            <div className="rounded-xl bg-white/15 p-3">
              <Bot size={28} />
            </div>
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
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Jumlah soal
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n} soal</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {loading ? 'Gemini sedang membuat soal...' : 'Buat soal dengan AI'}
              </button>
            </div>
          </form>

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {questions.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-black text-slate-800">Hasil dari Asisten AI</h2>
                <p className="text-sm text-slate-500">{questions.length} soal berhasil dibuat · {model}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={14} /> Berhasil
              </span>
            </div>

            {questions.map((item, index) => (
              <article key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-black text-indigo-700">{index + 1}</span>
                  <h3 className="pt-1 font-bold leading-relaxed text-slate-800">{item.question}</h3>
                </div>
                <div className="ml-11 grid gap-2 sm:grid-cols-2">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => (
                    <div key={key} className={`rounded-lg border px-3 py-2.5 text-sm ${item.answer === key ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                      <span className="mr-2 font-black">{key}.</span>{item.options?.[key]}
                      {item.answer === key && <CheckCircle2 size={15} className="ml-2 inline" />}
                    </div>
                  ))}
                </div>
                <div className="ml-11 mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-bold">Kunci jawaban: {item.answer}</p>
                  <p className="mt-1 leading-relaxed">{item.explanation}</p>
                </div>
              </article>
            ))}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <BookOpen size={18} className="mt-0.5 shrink-0" />
                <p><strong>Catatan:</strong> Hasil ini masih berupa draf uji coba dan belum disimpan ke bank soal. Guru perlu memeriksa ketepatan materi, kunci jawaban, dan pembahasannya sebelum digunakan.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
