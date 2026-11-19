'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'


function parseKeys(value: any): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((item: any) => String(item).trim().toUpperCase()).filter(Boolean)
      if (parsed && typeof parsed === 'object') return Object.keys(parsed)
    } catch {}
    return trimmed.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)
  }
  return []
}

function getAnswerCheck(q: any, answer: any): { status: 'correct' | 'wrong' | 'incomplete' | 'no-key'; keyText: string } {
  const type = q?.question_type || 'multiple_choice'
  if (type === 'essay' || type === 'uraian') {
    const key = q.correct_answer ?? q.correct_answers ?? q.correct_option ?? ''
    return { status: 'no-key', keyText: typeof key === 'string' ? key : JSON.stringify(key || '') }
  }
  if (type === 'true_false_matrix') {
    const keys = q.correct_answers && typeof q.correct_answers === 'object' && !Array.isArray(q.correct_answers)
      ? q.correct_answers
      : null
    if (!keys || !Object.keys(keys).length) return { status: 'no-key', keyText: '' }
    const ids = Object.keys(keys)
    if (!answer || typeof answer !== 'object' || !ids.every((id) => answer[id] !== undefined && answer[id] !== '')) {
      return { status: 'incomplete', keyText: Object.entries(keys).map(([id, val]) => `${id}: ${String(val).toLowerCase() === 'true' ? 'Benar' : 'Salah'}`).join(' · ') }
    }
    const correct = ids.every((id) => String(answer[id]).toLowerCase() === String(keys[id]).toLowerCase())
    return { status: correct ? 'correct' : 'wrong', keyText: Object.entries(keys).map(([id, val]) => `${id}: ${String(val).toLowerCase() === 'true' ? 'Benar' : 'Salah'}`).join(' · ') }
  }
  if (type === 'complex_multiple_choice') {
    const raw = q.correct_answers ?? q.correct_option ?? q.correct_answer
    const keys = parseKeys(raw)
    if (!keys.length) return { status: 'no-key', keyText: '' }
    const selected = Array.isArray(answer) ? answer.map((v) => String(v).toUpperCase()) : parseKeys(answer)
    if (!selected.length) return { status: 'incomplete', keyText: keys.join(', ') }
    const correct = selected.length === keys.length && keys.every((key) => selected.includes(key)) && selected.every((key) => keys.includes(key))
    return { status: correct ? 'correct' : 'wrong', keyText: keys.join(', ') }
  }
  const raw = q.correct_option ?? q.correct_answer ?? q.correct_key ?? q.answer ?? ''
  const key = String(raw).trim().toUpperCase()
  if (!key) return { status: 'no-key', keyText: '' }
  const selected = String(answer ?? '').trim().toUpperCase()
  if (!selected) return { status: 'incomplete', keyText: key }
  return { status: selected === key ? 'correct' : 'wrong', keyText: key }
}

export default function ExamPreviewPage() {
  const params = useParams()
  const examId = params?.id as string
  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({})
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!examId) return
      setLoading(true)
      const supabase = createClient()
      const { data: examData, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single()
      if (examError || !examData) {
        if (!cancelled) { setError('Paket ujian tidak ditemukan atau tidak dapat diakses.'); setLoading(false) }
        return
      }
      const { data: questionData, error: questionError } = await supabase.from('questions').select('*').eq('exam_id', examId).order('created_at', { ascending: true })
      if (questionError) {
        if (!cancelled) { setError('Soal gagal dimuat: ' + questionError.message); setLoading(false) }
        return
      }
      if (!cancelled) {
        setExam(examData)
        let list = questionData || []
        if (examData.shuffle_questions) list = [...list].sort(() => Math.random() - 0.5)
        if (examData.shuffle_options) list = list.map((question: any) => ({
          ...question,
          options: Array.isArray(question.options) ? [...question.options].sort(() => Math.random() - 0.5) : question.options,
        }))
        setQuestions(list)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [examId])

  const question = questions[index]
  const type = question?.question_type || 'multiple_choice'
  const options = Array.isArray(question?.options) ? question.options : []
  const currentAnswer = question ? answers[question.id] : undefined
  const answeredCount = Object.values(answers).filter((value) => value !== undefined && value !== null && value !== '').length
  const checkedCount = Object.values(checkedQuestions).filter(Boolean).length
  const correctCount = questions.filter((item) => checkedQuestions[item.id] && getAnswerCheck(item, answers[item.id]).status === 'correct').length

  function setAnswer(value: any) {
    if (!question) return
    setAnswers((old) => ({ ...old, [question.id]: value }))
    setCheckedQuestions((old) => ({ ...old, [question.id]: false }))
  }

  if (loading) return <main className="min-h-screen bg-slate-100 p-8 text-slate-600">Memuat preview ujian...</main>
  if (error) return <main className="min-h-screen bg-slate-100 p-8"><p className="text-red-700">{error}</p><Link href={`/admin/exams/${examId}/questions`} className="mt-4 inline-block text-blue-700 underline">Kembali ke bank soal</Link></main>
  if (!questions.length) return <main className="min-h-screen bg-slate-100 p-8"><p>Belum ada soal untuk dipreview.</p><Link href={`/admin/exams/${examId}/questions`} className="text-blue-700 underline">Kembali ke bank soal</Link></main>

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white shadow-lg sm:px-6">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">{exam?.subtest || 'TKA'} · MODE PREVIEW</div>
          <h1 className="truncate text-base font-bold">{exam?.title}</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span>{index + 1}/{questions.length} soal</span>
          <span className="rounded-lg bg-slate-800 px-3 py-2">{answeredCount} dijawab</span>
          <Link href={`/admin/exams/${examId}/questions`} className="rounded-lg border border-slate-600 px-3 py-2 hover:bg-slate-800">Keluar Preview</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 p-4 md:grid-cols-[minmax(0,1fr)_260px] md:p-6">
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <span className="text-sm font-bold text-slate-700">Soal Nomor {index + 1}</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-800">SIMULASI · TIDAK DISIMPAN</span>
          </div>
          <div className="prose max-w-none text-base leading-relaxed"><MathRenderer content={question?.question_text || ''} /></div>
          {question?.image_url && <img src={question.image_url} alt="Ilustrasi soal" className="my-4 max-h-80 max-w-full rounded-lg object-contain" />}

          {type === 'essay' || type === 'uraian' ? (
            <textarea rows={6} value={currentAnswer || ''} onChange={(event) => setAnswer(event.target.value)} placeholder="Tuliskan jawaban Anda..." className="mt-5 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none" />
          ) : type === 'true_false_matrix' ? (
            <div className="mt-5 space-y-3">{options.map((option: any, i: number) => {
              const key = String(option.key || i)
              const label = option.text || option.statement || option.title || key
              return <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><span className="text-sm">{label}</span><select value={currentAnswer?.[key] || ''} onChange={(event) => setAnswer({ ...(currentAnswer || {}), [key]: event.target.value })} className="rounded-lg border border-slate-300 p-2 text-sm"><option value="">Pilih jawaban</option><option value="true">Benar</option><option value="false">Salah</option></select></div>
            })}</div>
          ) : (
            <div className="mt-5 space-y-3">{options.map((option: any, i: number) => {
              const key = String(option.key || String.fromCharCode(65 + i))
              const label = typeof option === 'string' ? option : option.text || option.title || ''
              const multi = type === 'complex_multiple_choice'
              const selected = multi ? Array.isArray(currentAnswer) && currentAnswer.includes(key) : currentAnswer === key
              return <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type={multi ? 'checkbox' : 'radio'} name={`preview-${question.id}`} checked={selected} onChange={() => setAnswer(multi ? (selected ? currentAnswer.filter((item: string) => item !== key) : [...(currentAnswer || []), key]) : key)} className="mt-1" />
                <span className="font-semibold">{key}.</span><span className="text-sm"><MathRenderer content={label} /></span>
              </label>
            })}</div>
          )}

          
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => setCheckedQuestions((old) => ({ ...old, [question.id]: true }))}
              disabled={type !== 'essay' && type !== 'uraian' && !currentAnswer}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Periksa Jawaban
            </button>
            {checkedQuestions[question.id] && (() => {
              const result = getAnswerCheck(question, currentAnswer)
              return (
                <div className={`rounded-xl border p-4 ${result.status === 'correct' ? 'border-emerald-200 bg-emerald-50' : result.status === 'wrong' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                  <p className="font-bold text-sm">
                    {result.status === 'correct' ? '✓ Jawaban benar!' : result.status === 'wrong' ? '✕ Jawaban belum tepat.' : result.status === 'incomplete' ? 'Jawaban belum lengkap.' : (type === 'essay' || type === 'uraian') ? 'Bandingkan dengan kunci jawaban berikut.' : 'Kunci jawaban belum diatur.'}
                  </p>
                  {result.keyText && <p className="mt-2 text-sm"><strong>Kunci jawaban:</strong> {result.keyText}</p>}
                  {(type === 'essay' || type === 'uraian') && currentAnswer && <p className="mt-2 text-sm"><strong>Jawaban yang ditulis:</strong> {currentAnswer}</p>}
                </div>
              )
            })()}
            {question?.explanation ? (
              <details open={Boolean(checkedQuestions[question.id])} className="rounded-xl bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold">Pembahasan</summary>
                <div className="mt-3 text-sm"><MathRenderer content={question.explanation} /></div>
              </details>
            ) : (
              <p className="text-xs text-slate-500">Belum ada pembahasan yang diisi untuk soal ini.</p>
            )}
          </div>

          <div className="mt-8 flex justify-between gap-3 border-t border-slate-100 pt-4">
            <button type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Sebelumnya</button>
            <button type="button" disabled={index === questions.length - 1} onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Berikutnya</button>
          </div>
        </section>

        <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 font-bold">Navigasi Soal</h2>
          <p className="mb-4 text-xs text-slate-500">Klik nomor untuk berpindah soal.</p>
          <div className="mb-4 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900"><p className="font-bold">Hasil latihan sementara</p><p className="mt-1">Sudah diperiksa: {checkedCount} soal</p><p>Jawaban benar: {correctCount}</p></div>
          <div className="grid grid-cols-5 gap-2">{questions.map((item, i) => {
            const answered = answers[item.id] !== undefined && answers[item.id] !== null && answers[item.id] !== '' && (!Array.isArray(answers[item.id]) || answers[item.id].length > 0)
            return <button key={item.id} type="button" onClick={() => setIndex(i)} className={`aspect-square rounded-lg text-sm font-bold ${index === i ? 'bg-indigo-600 text-white' : answered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</button>
          })}</div>
          <button type="button" onClick={() => { setAnswers({}); setCheckedQuestions({}); setIndex(0) }} className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600">Reset simulasi</button>
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Mode preview tidak membuat sesi ujian, tidak menyimpan jawaban atau nilai, dan tidak menambah XP. Semua jawaban hilang saat halaman ditutup.</p>
        </aside>
      </div>
    </main>
  )
}
