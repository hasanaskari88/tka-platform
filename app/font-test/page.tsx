'use client'

import { Suspense, useEffect, useState } from 'react'
import RichTextEditor from '@/components/editor/RichTextEditor'
import MathRenderer from '@/components/MathRenderer'
import * as XLSX from 'xlsx'

type LabQuestion = { question_text: string; image_url?: string | null; options: any[]; question_type: string; correct_option?: string; correct_answers?: any; correct_answer?: string; explanation?: string }

const STORAGE_KEY = 'tka-platform-font-test-content-v1'

const INITIAL_CONTENT = `
  <h2>Laboratorium Editor Soal TKA</h2>
  <p>Ini adalah teks biasa untuk menguji editor.</p>
  <p>Silakan pilih sebagian teks untuk mencoba format tebal, miring, garis bawah, warna, dan ukuran huruf.</p>
  <p lang="ar" dir="rtl" class="font-arabic">
    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
  </p>
  <p lang="jv" class="font-aksara-jawa">
    ꦲꦤꦕꦫꦏ ꦢꦠꦱꦮꦭ ꦥꦝꦗꦪꦚ
  </p>
  <p>Contoh soal: Berapakah hasil dari penjumlahan 125 + 275?</p>
`

type SaveStatus = 'loading' | 'saving' | 'saved' | 'error'

function labParseKeys(value: any): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return []
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed.map((item: any) => String(item).trim().toUpperCase()).filter(Boolean) } catch {}
    return raw.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)
  }
  return []
}

function checkLabAnswer(q: LabQuestion, answer: any): { status: 'correct' | 'wrong' | 'incomplete' | 'no-key' | 'essay'; keyText: string } {
  const type = q.question_type
  if (type === 'essay' || type === 'uraian') {
    const key = q.correct_answer || q.correct_answers || q.correct_option || ''
    return { status: 'essay', keyText: typeof key === 'string' ? key : JSON.stringify(key || '') }
  }
  if (type === 'true_false_matrix') {
    const keys = q.correct_answers && typeof q.correct_answers === 'object' && !Array.isArray(q.correct_answers) ? q.correct_answers : null
    if (!keys || !Object.keys(keys).length) return { status: 'no-key', keyText: '' }
    const ids = Object.keys(keys)
    const keyText = Object.entries(keys).map(([id, val]) => `${id}: ${String(val).toLowerCase() === 'true' ? 'Benar' : 'Salah'}`).join(' · ')
    if (!answer || !ids.every((id) => answer[id] !== undefined && answer[id] !== '')) return { status: 'incomplete', keyText }
    return { status: ids.every((id) => String(answer[id]).toLowerCase() === String(keys[id]).toLowerCase()) ? 'correct' : 'wrong', keyText }
  }
  if (type === 'complex_multiple_choice') {
    const keys = labParseKeys(q.correct_answers ?? q.correct_option ?? q.correct_answer)
    if (!keys.length) return { status: 'no-key', keyText: '' }
    const selected = Array.isArray(answer) ? answer.map((v) => String(v).toUpperCase()) : labParseKeys(answer)
    if (!selected.length) return { status: 'incomplete', keyText: keys.join(', ') }
    const ok = selected.length === keys.length && keys.every((key) => selected.includes(key)) && selected.every((key) => keys.includes(key))
    return { status: ok ? 'correct' : 'wrong', keyText: keys.join(', ') }
  }
  const key = String(q.correct_option ?? q.correct_answer ?? '').trim().toUpperCase()
  if (!key) return { status: 'no-key', keyText: '' }
  const selected = String(answer ?? '').trim().toUpperCase()
  if (!selected) return { status: 'incomplete', keyText: key }
  return { status: selected === key ? 'correct' : 'wrong', keyText: key }
}


const JAVANESE_SAMPLES = [
  { label: 'Aksara ra', text: 'ꦫ' },
  { label: 'Ra + wulu', text: 'ꦫꦶ' },
  { label: 'Ra + suku', text: 'ꦫꦸ' },
  { label: 'Ra + taling', text: 'ꦫꦺ' },
  { label: 'Ra + taling tarung', text: 'ꦫꦺꦴ' },
  { label: 'Ra dalam kata', text: 'ꦥꦸꦫ' },
  { label: 'Ka + pasangan ra', text: 'ꦏ꧀ꦫ' },
  { label: 'Rama', text: 'ꦫꦩ' },
]

export default function FontTestPage() {
  const [content, setContent] = useState(INITIAL_CONTENT)
  const [isLoaded, setIsLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [labQuestions, setLabQuestions] = useState<LabQuestion[]>([])
  const [labAnswers, setLabAnswers] = useState<Record<number, any>>({})
  const [labChecked, setLabChecked] = useState<Record<number, boolean>>({})
  useEffect(() => { setLabChecked({}) }, [labAnswers])
  const [activeLabQuestion, setActiveLabQuestion] = useState(0)
  const [importMessage, setImportMessage] = useState('')

  // Memuat isi editor yang sebelumnya tersimpan di browser.
  useEffect(() => {
    try {
      const savedContent = window.localStorage.getItem(STORAGE_KEY)

      if (savedContent !== null) {
        setContent(savedContent)
      }

      setSaveStatus('saved')
    } catch (error) {
      console.error('Gagal memuat isi editor:', error)
      setSaveStatus('error')
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Menyimpan otomatis setiap kali isi editor berubah.
  useEffect(() => {
    if (!isLoaded) return

    setSaveStatus('saving')

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, content)
        setSaveStatus('saved')
        setLastSaved(
          new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )
      } catch (error) {
        console.error('Gagal menyimpan isi editor:', error)
        setSaveStatus('error')
      }
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [content, isLoaded])

  // Simpan manual ketika tombol ditekan.
  function saveNow() {
    try {
      window.localStorage.setItem(STORAGE_KEY, content)
      setSaveStatus('saved')
      setLastSaved(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    } catch (error) {
      console.error('Gagal menyimpan isi editor:', error)
      setSaveStatus('error')
    }
  }

  // Kembalikan editor ke contoh awal.
  function resetEditor() {
    const confirmed = window.confirm(
      'Kembalikan editor ke contoh awal? Isi pengujian yang tersimpan akan diganti.'
    )

    if (!confirmed) return

    try {
      window.localStorage.setItem(STORAGE_KEY, INITIAL_CONTENT)
      setContent(INITIAL_CONTENT)
      setSaveStatus('saved')
      setLastSaved(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    } catch (error) {
      console.error('Gagal mereset isi editor:', error)
      setContent(INITIAL_CONTENT)
      setSaveStatus('error')
    }
  }

  // Impor hanya ke state halaman ini. Tidak ada penulisan ke Supabase.
  async function importQuestionFile(file?: File) {
    if (!file) return
    try {
      let rows: any[] = []
      if (/\\.json$/i.test(file.name)) {
        const parsed = JSON.parse(await file.text())
        if (!Array.isArray(parsed)) throw new Error('File JSON harus berisi daftar soal berbentuk array.')
        rows = parsed
      } else {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
      }

      const read = (row: any, names: string[]) => {
        const key = Object.keys(row).find((item) => names.includes(item.trim().toLowerCase()))
        return key ? row[key] : ''
      }
      const parsedQuestions: LabQuestion[] = rows.map((row: any, index: number) => {
        const questionText = String(read(row, ['question_text', 'pertanyaan', 'soal', 'question']) || '').trim()
        if (!questionText) return null
        let options: any[] = []
        const rawOptions = read(row, ['options', 'pilihan'])
        if (Array.isArray(rawOptions)) options = rawOptions
        else if (typeof rawOptions === 'string' && rawOptions.trim()) {
          try { options = JSON.parse(rawOptions) } catch { options = [] }
        }
        if (!options.length) {
          options = ['A', 'B', 'C', 'D'].map((key) => ({
            key,
            text: String(read(row, [`option_${key.toLowerCase()}`, `pilihan_${key.toLowerCase()}`, key.toLowerCase()]) || ''),
          })).filter((option) => option.text)
        }
        const type = String(read(row, ['question_type', 'tipe_soal', 'jenis_soal']) || 'multiple_choice').toLowerCase()
        let correctAnswers: any = read(row, ['correct_answers', 'kunci_jawaban', 'jawaban_benar'])
        if (typeof correctAnswers === 'string' && /^[\\[{]/.test(correctAnswers.trim())) {
          try { correctAnswers = JSON.parse(correctAnswers) } catch { /* pertahankan teks */ }
        }
        return {
          question_text: questionText,
          image_url: String(read(row, ['image_url', 'gambar']) || '') || null,
          options,
          question_type: type,
          correct_option: String(read(row, ['correct_option', 'correct_answer', 'kunci', 'jawaban']) || 'A').toUpperCase(),
          correct_answers: correctAnswers,
          correct_answer: String(read(row, ['correct_answer', 'kunci', 'jawaban']) || ''),
          explanation: String(read(row, ['explanation', 'pembahasan']) || ''),
        }
      }).filter(Boolean) as LabQuestion[]
      if (!parsedQuestions.length) throw new Error('Tidak ditemukan soal. Pastikan kolom Pertanyaan/Soal terisi.')
      setLabQuestions(parsedQuestions)
      setLabAnswers({})
      setLabChecked({})
      setActiveLabQuestion(0)
      setImportMessage(`Berhasil memuat ${parsedQuestions.length} soal sementara. Data hanya berada di halaman ini.`)
    } catch (error: any) {
      setImportMessage(error?.message || 'File tidak dapat dibaca. Periksa format file.')
    }
  }

  function resetLab() {
    setLabAnswers({})
    setLabChecked({})
    setActiveLabQuestion(0)
  }

  const saveStatusText = {
    loading: 'Memuat data...',
    saving: 'Menyimpan perubahan...',
    saved: 'Perubahan tersimpan di browser',
    error: 'Gagal menyimpan. Periksa penyimpanan browser.',
  }

  const saveStatusColor = {
    loading: 'text-slate-500',
    saving: 'text-amber-600',
    saved: 'text-green-700',
    error: 'text-red-600',
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        <header className="space-y-2">
          <div className="text-sm font-semibold text-blue-700">
            TKA PLATFORM · LABORATORIUM
          </div>

          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            Pengujian Rich Text Editor
          </h1>

          <p className="text-sm text-slate-600">
            Halaman khusus untuk menguji editor sebelum diintegrasikan
            ke dalam bank soal. Perubahan tersimpan otomatis di browser
            yang sedang digunakan, bukan ke database.
          </p>
        </header>

        <section className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4">
            <h2 className="font-bold text-slate-800">
              1. Perbandingan Font Aksara Jawa
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Kedua font ditampilkan berdampingan menggunakan rangkaian aksara
              dan sandhangan yang sama. Perhatikan terutama bentuk aksara ra
              serta tampilannya ketika menjadi pasangan.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-slate-800">Noto Sans Javanese</h3>
                <p className="text-xs text-slate-500">Font lama · pembanding</p>
              </div>
              <div className="space-y-3">
                {JAVANESE_SAMPLES.map((sample) => (
                  <div key={sample.label} className="border-t border-slate-200 pt-2">
                    <div className="text-xs text-slate-500">{sample.label}</div>
                    <div
                      lang="jv"
                      className="mt-1 text-3xl leading-relaxed"
                      style={{ fontFamily: "'Noto Javanese Local', sans-serif" }}
                    >
                      {sample.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-slate-800">nyk Ngayogyan Jejeg</h3>
                <p className="text-xs text-slate-500">Font baru · kandidat</p>
              </div>
              <div className="space-y-3">
                {JAVANESE_SAMPLES.map((sample) => (
                  <div key={sample.label} className="border-t border-violet-100 pt-2">
                    <div className="text-xs text-slate-500">{sample.label}</div>
                    <div
                      lang="jv"
                      className="mt-1 text-3xl leading-relaxed"
                      style={{ fontFamily: "'Nyk Ngayogyan Jejeg', sans-serif" }}
                    >
                      {sample.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Catatan: ini hanya pengujian tampilan. Font utama website dan font
            editor belum diubah, sehingga pilihan font baru tidak akan
            memengaruhi halaman lain.
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800">
                2. Area Editor
              </h2>
              <p className="text-xs text-slate-500">
                Uji seluruh tombol toolbar dan isi editor.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveNow}
                disabled={!isLoaded}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Simpan sekarang
              </button>

              <button
                type="button"
                onClick={resetEditor}
                disabled={!isLoaded}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset contoh
              </button>
            </div>
          </div>

          {!isLoaded ? (
            <div className="min-h-[220px] rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
              Memuat isi editor...
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="min-h-[220px] rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
                  Menyiapkan editor...
                </div>
              }
            >
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Tuliskan soal atau materi di sini..."
              />
            </Suspense>
          )}

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`font-semibold ${saveStatusColor[saveStatus]}`}>
                {saveStatusText[saveStatus]}
              </span>

              {lastSaved && saveStatus === 'saved' && (
                <span className="text-slate-400">
                  · Terakhir disimpan pukul {lastSaved}
                </span>
              )}
            </div>

            <span className="text-xs text-slate-500">
              {content.length.toLocaleString('id-ID')} karakter HTML
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4">
            <h2 className="font-bold text-slate-800">
              3. Pratinjau Hasil
            </h2>
            <p className="text-xs text-slate-500">
              Gambaran hasil konten setelah dibaca oleh komponen MathRenderer.
            </p>
          </div>

          <div className="min-h-40 rounded-lg border border-slate-200 bg-white p-4">
            <Suspense
              fallback={
                <div className="text-sm text-slate-500">
                  Menyiapkan pratinjau...
                </div>
              }
            >
              <MathRenderer content={content} />
            </Suspense>
          </div>
        </section>

        <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-3">
            <h2 className="font-bold text-slate-800">4. Import Soal & Simulasi Siswa</h2>
            <p className="mt-1 text-sm text-slate-600">Impor file Excel (.xlsx/.xls), CSV, atau JSON. Soal dan jawaban simulasi hanya disimpan sementara di memori halaman ini, tidak masuk database.</p>
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5 text-center hover:bg-emerald-100">
            <span className="text-sm font-semibold text-emerald-800">Pilih file soal untuk dicoba</span>
            <span className="text-xs text-emerald-700">Excel, CSV, atau JSON · gunakan sheet pertama untuk Excel</span>
            <input type="file" accept=".xlsx,.xls,.csv,.json" className="max-w-full text-xs" onChange={(event) => importQuestionFile(event.target.files?.[0])} />
          </label>
          {importMessage && <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{importMessage}</p>}
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            Nama kolom yang dikenali: Pertanyaan/Soal, Pilihan A–D (atau kolom options), Kunci/Jawaban, Tipe Soal, Gambar, dan Pembahasan. Baris pertama file harus berisi judul kolom.
          </div>
          {labQuestions.length > 0 && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">Simulasi ujian sementara</p>
                  <p className="text-xs text-slate-500">Soal {activeLabQuestion + 1} dari {labQuestions.length}</p>
                  <p className="text-xs font-semibold text-emerald-700">Benar: {labQuestions.filter((q, i) => labChecked[i] && checkLabAnswer(q, labAnswers[i]).status === "correct").length} dari {Object.values(labChecked).filter(Boolean).length} diperiksa</p>
                </div>
                <button type="button" onClick={resetLab} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Reset jawaban</button>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-emerald-500" style={{ width: `${((activeLabQuestion + 1) / labQuestions.length) * 100}%` }} /></div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Mode Preview · Tidak menyimpan</span>
                  <span className="text-xs text-slate-500">{labQuestions[activeLabQuestion].question_type}</span>
                </div>
                <div className="mb-3 font-medium text-slate-900"><MathRenderer content={labQuestions[activeLabQuestion].question_text} /></div>
                {labQuestions[activeLabQuestion].image_url && <img src={labQuestions[activeLabQuestion].image_url || ''} alt="Gambar soal" className="mb-3 max-h-64 max-w-full rounded-lg object-contain" />}
                {labQuestions[activeLabQuestion].question_type === 'essay' || labQuestions[activeLabQuestion].question_type === 'uraian' ? (
                  <textarea value={labAnswers[activeLabQuestion] || ''} onChange={(event) => setLabAnswers((old) => ({ ...old, [activeLabQuestion]: event.target.value }))} rows={5} placeholder="Tuliskan jawaban..." className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900" />
                ) : labQuestions[activeLabQuestion].question_type === 'true_false_matrix' ? (
                  <div className="space-y-2">{labQuestions[activeLabQuestion].options.map((option: any, index: number) => {
                    const label = option.text || option.statement || option.key || `Pernyataan ${index + 1}`
                    const current = labAnswers[activeLabQuestion]?.[option.key || String(index)] || ''
                    return <div key={option.key || index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-800"><span>{label}</span><select value={current} onChange={(event) => setLabAnswers((old) => ({ ...old, [activeLabQuestion]: { ...(old[activeLabQuestion] || {}), [option.key || String(index)]: event.target.value } }))} className="rounded border border-slate-300 p-2"><option value="">Pilih</option><option value="true">Benar</option><option value="false">Salah</option></select></div>
                  })}</div>
                ) : (
                  <div className="space-y-2">{labQuestions[activeLabQuestion].options.map((option: any, index: number) => {
                    const key = String(option.key || String.fromCharCode(65 + index))
                    const text = typeof option === 'string' ? option : option.text || option.title || ''
                    const multi = labQuestions[activeLabQuestion].question_type === 'complex_multiple_choice'
                    const selected = labAnswers[activeLabQuestion]
                    const checked = multi ? Array.isArray(selected) && selected.includes(key) : selected === key
                    return <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                      <input type={multi ? 'checkbox' : 'radio'} name={`lab-question-${activeLabQuestion}`} checked={checked} onChange={() => setLabAnswers((old) => ({ ...old, [activeLabQuestion]: multi ? (checked ? selected.filter((item: string) => item !== key) : [...(selected || []), key]) : key }))} />
                      <span className="font-semibold">{key}.</span><span>{text}</span>
                    </label>
                  })}</div>
                )}
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setLabChecked((old) => ({ ...old, [activeLabQuestion]: true }))} disabled={!((labAnswers[activeLabQuestion] !== undefined) && (typeof labAnswers[activeLabQuestion] !== 'string' || labAnswers[activeLabQuestion].trim() !== ''))} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Periksa Jawaban</button>
                  {labChecked[activeLabQuestion] && (() => {
                    const q = labQuestions[activeLabQuestion]
                    const result = checkLabAnswer(q, labAnswers[activeLabQuestion])
                    return <div className={`rounded-lg border p-3 text-sm ${result.status === 'correct' ? 'border-emerald-200 bg-emerald-50' : result.status === 'wrong' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                      <p className="font-bold">{result.status === 'correct' ? '✓ Jawaban benar!' : result.status === 'wrong' ? '✕ Jawaban belum tepat.' : result.status === 'incomplete' ? 'Jawaban belum lengkap.' : result.status === 'essay' ? 'Periksa jawaban uraian dengan membandingkan kunci.' : 'Kunci jawaban belum tersedia.'}</p>
                      {result.keyText && <p className="mt-2"><strong>Kunci jawaban:</strong> {result.keyText}</p>}
                    </div>
                  })()}
                  {labQuestions[activeLabQuestion].explanation ? <details open={Boolean(labChecked[activeLabQuestion])} className="rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold">Pembahasan</summary><div className="mt-2 text-sm"><MathRenderer content={labQuestions[activeLabQuestion].explanation || ''} /></div></details> : <p className="text-xs text-slate-500">Belum ada pembahasan untuk soal ini.</p>}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button type="button" disabled={activeLabQuestion === 0} onClick={() => setActiveLabQuestion((index) => Math.max(0, index - 1))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">Sebelumnya</button>
                <span className="text-xs text-slate-500">{Object.keys(labAnswers).length} soal dijawab</span>
                <button type="button" disabled={activeLabQuestion >= labQuestions.length - 1} onClick={() => setActiveLabQuestion((index) => Math.min(labQuestions.length - 1, index + 1))} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Berikutnya</button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h2 className="mb-2 font-bold text-slate-800">
            5. Daftar Pengujian
          </h2>

          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Format teks, jenis huruf, ukuran, dan warna.</li>
            <li>Perataan paragraf dan daftar berpoin/bernomor.</li>
            <li>Pangkat, indeks bawah, serta rumus matematika.</li>
            <li>Tabel dan gambar.</li>
            <li>Pengaturan ukuran dan posisi gambar.</li>
            <li>Penulisan Arab beserta harakat dan arah RTL.</li>
            <li>Aksara Jawa beserta sandhangan dan pasangan.</li>
            <li>Kesesuaian hasil editor dengan pratinjau.</li>
            <li>Penyimpanan otomatis dan pemuatan kembali setelah reload.</li>
          </ul>
        </section>

      </div>
    </main>
  )
}
