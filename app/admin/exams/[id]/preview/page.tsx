'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'

type CheckStatus = 'correct' | 'wrong' | 'incomplete' | 'no-key'

function parseKeys(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((item: any) => String(item).trim().toUpperCase()).filter(Boolean)
      if (parsed && typeof parsed === 'object') return Object.keys(parsed).map((key) => key.trim().toUpperCase())
    } catch {}
    return trimmed.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).map((key) => key.trim().toUpperCase())
  }
  return []
}

function normalizeMatrixValue(value: any): string {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['true', 'benar', '1', 'yes'].includes(normalized)) return 'benar'
  if (['false', 'salah', '0', 'no'].includes(normalized)) return 'salah'
  return normalized
}

function isAnswered(question: any, answer: any): boolean {
  const type = question?.question_type || 'multiple_choice'
  if (answer === undefined || answer === null) return false
  if (type === 'essay' || type === 'uraian') {
    return String(answer).replace(/<br\\s*\\/?\\s*>/gi, ' ').replace(/<\\/p\\s*>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').trim().length > 0
  }
  if (Array.isArray(answer)) return answer.length > 0
  if (typeof answer === 'object') return Object.values(answer).some((value) => String(value ?? '').trim() !== '')
  return String(answer).trim().length > 0
}

function getAnswerCheck(question: any, answer: any): { status: CheckStatus; keyText: string } {
  const type = question?.question_type || 'multiple_choice'

  if (type === 'essay' || type === 'uraian') {
    const key = question.correct_answer ?? question.correct_answers ?? question.correct_option ?? ''
    return { status: 'no-key', keyText: typeof key === 'string' ? key : JSON.stringify(key || '') }
  }

  if (type === 'true_false_matrix') {
    const keys = question.correct_answers && typeof question.correct_answers === 'object' && !Array.isArray(question.correct_answers)
      ? question.correct_answers
      : null
    if (!keys || !Object.keys(keys).length) return { status: 'no-key', keyText: '' }

    const ids = Object.keys(keys)
    const keyText = Object.entries(keys)
      .map(([id, value]) => `${id}: ${normalizeMatrixValue(value) === 'benar' ? 'Benar' : normalizeMatrixValue(value) === 'salah' ? 'Salah' : String(value)}`)
      .join(' · ')

    if (!answer || typeof answer !== 'object' || Array.isArray(answer) ||
      !ids.every((id) => answer[id] !== undefined && String(answer[id]).trim() !== '')) {
      return { status: 'incomplete', keyText }
    }

    const correct = ids.every((id) => normalizeMatrixValue(answer[id]) === normalizeMatrixValue(keys[id]))
    return { status: correct ? 'correct' : 'wrong', keyText }
  }

  if (type === 'complex_multiple_choice') {
    const raw = question.correct_answers ?? question.correct_option ?? question.correct_answer
    const keys = parseKeys(raw)
    if (!keys.length) return { status: 'no-key', keyText: '' }

    const selected = Array.isArray(answer)
      ? answer.map((value) => String(value).trim().toUpperCase()).filter(Boolean)
      : parseKeys(answer)
    if (!selected.length) return { status: 'incomplete', keyText: keys.join(', ') }

    const correct = selected.length === keys.length &&
      keys.every((key) => selected.includes(key)) &&
      selected.every((key) => keys.includes(key))
    return { status: correct ? 'correct' : 'wrong', keyText: keys.join(', ') }
  }

  const raw = question.correct_option ?? question.correct_answer ?? question.correct_key ?? question.answer ?? ''
  const key = String(raw).trim().toUpperCase()
  if (!key) return { status: 'no-key', keyText: '' }

  const selected = String(answer ?? '').trim().toUpperCase()
  if (!selected) return { status: 'incomplete', keyText: key }
  return { status: selected === key ? 'correct' : 'wrong', keyText: key }
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }
  return result
}

function preparePreviewQuestions(source: any[], exam: any): any[] {
  const groups = [
    source.filter((question) => question.question_type === 'multiple_choice'),
    source.filter((question) => question.question_type === 'complex_multiple_choice'),
    source.filter((question) => question.question_type === 'true_false_matrix'),
    source.filter((question) => question.question_type === 'essay' || question.question_type === 'uraian'),
    source.filter((question) => !['multiple_choice', 'complex_multiple_choice', 'true_false_matrix', 'essay', 'uraian'].includes(question.question_type || 'multiple_choice')),
  ]

  return groups.flatMap((group) => {
    const orderedGroup = exam.shuffle_questions ? shuffleArray(group) : group
    return orderedGroup.map((question) => {
      if (
        exam.shuffle_options &&
        ['multiple_choice', 'complex_multiple_choice', 'true_false_matrix'].includes(question.question_type) &&
        Array.isArray(question.options) &&
        question.options.length > 0
      ) {
        return { ...question, options: shuffleArray(question.options) }
      }
      return question
    })
  })
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
  const [showQuestionNav, setShowQuestionNav] = useState(true)
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal')
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!examId) return
      setLoading(true)
      setError('')

      const supabase = createClient()
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (examError || !examData) {
        if (!cancelled) {
          setError('Paket ujian tidak ditemukan atau tidak dapat diakses.')
          setLoading(false)
        }
        return
      }

      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (questionError) {
        if (!cancelled) {
          setError('Soal gagal dimuat: ' + questionError.message)
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setExam(examData)
        setQuestions(preparePreviewQuestions(questionData || [], examData))
        setAnswers({})
        setCheckedQuestions({})
        setIndex(0)
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
  const answeredCount = questions.filter((item) => isAnswered(item, answers[item.id])).length
  const checkedCount = Object.values(checkedQuestions).filter(Boolean).length
  const correctCount = questions.filter((item) =>
    checkedQuestions[item.id] && getAnswerCheck(item, answers[item.id]).status === 'correct'
  ).length
  const questionFontSize = fontSize === 'normal' ? '16px' : fontSize === 'large' ? '20px' : '24px'

  function setAnswer(value: any) {
    if (!question) return
    setAnswers((old) => ({ ...old, [question.id]: value }))
    setCheckedQuestions((old) => ({ ...old, [question.id]: false }))
  }

  function renderOptionText(option: any): string {
    return typeof option === 'string' ? option : option?.text || option?.statement || option?.statement_text || option?.title || option?.content || option?.label || ''
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-100 p-8 text-slate-600">Memuat preview ujian...</main>
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-red-700">{error}</p>
        <Link href={`/admin/exams/${examId}/questions`} className="mt-4 inline-block text-blue-700 underline">Kembali ke bank soal</Link>
      </main>
    )
  }

  if (!questions.length) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p>Belum ada soal untuk dipreview.</p>
        <Link href={`/admin/exams/${examId}/questions`} className="text-blue-700 underline">Kembali ke bank soal</Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white shadow-lg sm:px-6">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">{exam?.subtest || 'TKA'} · MODE PREVIEW BANK SOAL CBT</div>
          <h1 className="truncate text-base font-bold">{exam?.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-lg bg-slate-800 px-3 py-2">{index + 1}/{questions.length} soal</span>
          <span className="rounded-lg bg-slate-800 px-3 py-2">{answeredCount} dijawab</span>
          <button
            type="button"
            onClick={() => setShowQuestionNav((visible) => !visible)}
            className="rounded-lg border border-slate-600 px-3 py-2 font-semibold hover:bg-slate-800"
            aria-expanded={showQuestionNav}
          >
            {showQuestionNav ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi'}
          </button>
          <Link href={`/admin/exams/${examId}/questions`} className="rounded-lg border border-slate-600 px-3 py-2 hover:bg-slate-800">
            Keluar Preview
          </Link>
        </div>
      </header>

      <div className={`mx-auto grid max-w-7xl items-start gap-5 p-4 md:p-6 ${showQuestionNav ? 'md:grid-cols-[minmax(0,1fr)_260px]' : 'md:grid-cols-1'}`}>
        <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <span className="text-sm font-bold text-slate-700">Soal Nomor {index + 1}</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-800">SIMULASI · TIDAK DISIMPAN</span>
          </div>

          <div className="prose max-w-none leading-relaxed" style={{ fontSize: questionFontSize }}>
            <MathRenderer content={question?.question_text || ''} />
          </div>

          {question?.image_url && (
            <button type="button" onClick={() => setZoomedImageUrl(question.image_url)} className="my-4 block max-w-full cursor-zoom-in text-left">
              <img src={question.image_url} alt="Ilustrasi soal" className="max-h-80 max-w-full rounded-lg object-contain" />
              <span className="mt-1 block text-xs text-slate-500">Ketuk gambar untuk memperbesar</span>
            </button>
          )}

          {type === 'essay' || type === 'uraian' ? (
            <textarea
              rows={7}
              value={currentAnswer || ''}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Tuliskan jawaban Anda..."
              className="mt-5 w-full rounded-xl border border-slate-300 p-3 focus:border-indigo-500 focus:outline-none"
              style={{ fontSize: questionFontSize }}
            />
          ) : type === 'true_false_matrix' ? (
            <div className="mt-5 space-y-3" style={{ fontSize: questionFontSize }}>
              {options.map((option: any, optionIndex: number) => {
                const key = String(typeof option === 'object' && option?.id ? option.id : optionIndex + 1)
                const label = renderOptionText(option) || (typeof option === 'string' ? option : '')
                const selectedValue = currentAnswer?.[key] || ''

                return (
                  <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <span className="shrink-0 font-bold">{optionIndex + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <MathRenderer content={label} />
                        {option?.image_url && (
                          <button type="button" onClick={() => setZoomedImageUrl(option.image_url)} className="mt-2 block cursor-zoom-in">
                            <img src={option.image_url} alt={`Gambar pernyataan ${optionIndex + 1}`} className="max-h-40 max-w-full rounded-lg object-contain" />
                          </button>
                        )}
                      </div>
                    </div>
                    <select
                      value={selectedValue}
                      onChange={(event) => setAnswer({ ...(currentAnswer || {}), [key]: event.target.value })}
                      className="rounded-lg border border-slate-300 bg-white p-2 text-sm"
                    >
                      <option value="">Pilih jawaban</option>
                      <option value="Benar">Benar</option>
                      <option value="Salah">Salah</option>
                    </select>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-5 space-y-3" style={{ fontSize: questionFontSize }}>
              {options.map((option: any, optionIndex: number) => {
                const key = String(typeof option === 'object' && option?.key ? option.key : String.fromCharCode(65 + optionIndex))
                const label = renderOptionText(option)
                const multi = type === 'complex_multiple_choice'
                const selected = multi
                  ? Array.isArray(currentAnswer) && currentAnswer.includes(key)
                  : currentAnswer === key
                const displayLabel = String.fromCharCode(65 + optionIndex)

                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={`preview-${question.id}`}
                      checked={selected}
                      onChange={() => setAnswer(multi
                        ? (selected
                          ? (currentAnswer || []).filter((item: string) => item !== key)
                          : [...(currentAnswer || []), key])
                        : key)}
                      className="mt-1"
                    />
                    <span className="shrink-0 font-semibold">{displayLabel}.</span>
                    <span className="min-w-0 flex-1">
                      <MathRenderer content={label} />
                      {option?.image_url && (
                        <img
                          src={option.image_url}
                          alt={`Gambar opsi ${displayLabel}`}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            setZoomedImageUrl(option.image_url)
                          }}
                          className="mt-2 max-h-40 max-w-full cursor-zoom-in rounded-lg object-contain"
                        />
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => setCheckedQuestions((old) => ({ ...old, [question.id]: true }))}
              disabled={!isAnswered(question, currentAnswer)}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Periksa Jawaban
            </button>

            {checkedQuestions[question.id] && (() => {
              const result = getAnswerCheck(question, currentAnswer)
              return (
                <div className={`rounded-xl border p-4 ${result.status === 'correct' ? 'border-emerald-200 bg-emerald-50' : result.status === 'wrong' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                  <p className="text-sm font-bold">
                    {result.status === 'correct'
                      ? '✓ Jawaban benar!'
                      : result.status === 'wrong'
                        ? '✕ Jawaban belum tepat.'
                        : result.status === 'incomplete'
                          ? 'Jawaban belum lengkap.'
                          : (type === 'essay' || type === 'uraian')
                            ? 'Bandingkan dengan kunci jawaban berikut.'
                            : 'Kunci jawaban belum diatur.'}
                  </p>
                  {result.keyText && <p className="mt-2 text-sm"><strong>Kunci jawaban:</strong> {result.keyText}</p>}
                  {(type === 'essay' || type === 'uraian') && currentAnswer && (
                    <div className="mt-2 text-sm">
                      <strong>Jawaban simulasi:</strong>
                      <p className="mt-1 whitespace-pre-wrap">{currentAnswer}</p>
                    </div>
                  )}
                </div>
              )
            })()}

            {question?.explanation ? (
              <details open={Boolean(checkedQuestions[question.id])} className="rounded-xl bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold">Pembahasan</summary>
                <div className="mt-3" style={{ fontSize: questionFontSize }}>
                  <MathRenderer content={question.explanation} />
                </div>
              </details>
            ) : (
              <p className="text-xs text-slate-500">Belum ada pembahasan yang diisi untuk soal ini.</p>
            )}
          </div>

          <div className="mt-8 flex justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={index === questions.length - 1}
              onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </section>

        {showQuestionNav && (
          <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-bold">Navigasi Soal</h2>
                <p className="text-xs text-slate-500">Klik nomor untuk berpindah soal.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestionNav(false)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                aria-label="Sembunyikan navigasi soal"
              >
                Sembunyikan
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">
              <p className="font-bold">Hasil simulasi sementara</p>
              <p className="mt-1">Sudah diperiksa: {checkedCount} soal</p>
              <p>Jawaban benar: {correctCount}</p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((item, questionIndex) => {
                const answered = isAnswered(item, answers[item.id])
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(questionIndex)}
                    className={`aspect-square rounded-lg text-sm font-bold ${index === questionIndex ? 'bg-indigo-600 text-white' : answered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                    aria-label={`Buka soal nomor ${questionIndex + 1}`}
                  >
                    {questionIndex + 1}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => { setAnswers({}); setCheckedQuestions({}); setIndex(0) }}
              className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"
            >
              Reset simulasi
            </button>

            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              Mode preview tidak membuat sesi ujian, tidak menyimpan jawaban atau nilai, dan tidak menambah XP. Semua jawaban hilang saat halaman ditutup.
            </p>
          </aside>
        )}
      </div>

      {!showQuestionNav && (
        <button
          type="button"
          onClick={() => setShowQuestionNav(true)}
          className="fixed bottom-4 right-4 z-20 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-slate-700"
        >
          Tampilkan Navigasi Soal
        </button>
      )}

      <div className="fixed bottom-4 left-4 z-20 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
        <span className="px-2 text-xs font-semibold text-slate-500">Ukuran teks</span>
        {([
          ['normal', 'A'],
          ['large', 'A+'],
          ['xlarge', 'A++'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFontSize(value)}
            aria-pressed={fontSize === value}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${fontSize === value ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Perbesar gambar"
          onClick={() => setZoomedImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImageUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900"
          >
            Tutup
          </button>
          <img
            src={zoomedImageUrl}
            alt="Gambar diperbesar"
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  )
}
