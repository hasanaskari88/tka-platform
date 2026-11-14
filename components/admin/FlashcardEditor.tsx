'use client'

import { useEffect, useState } from 'react'
import RichTextEditor from '@/components/editor/RichTextEditor'
import MathRenderer from '@/components/MathRenderer'
import { createClient } from '@/lib/supabase/client'

type CardRow = {
  id: string
  question_text: string
  explanation: string | null
  image_url: string | null
  created_at: string
}
type BankRow = {
  id: string
  question_text: string
  options: any
  correct_option: string | null
  explanation: string | null
  image_url: string | null
  exams?: { id: string; title: string; subtest: string | null } | null
}

function hasReadableContent(html: string) {
  const plain = html.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<\/(p|div|li|h[1-6])>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').trim()
  return plain.length > 0 || /<img\b/i.test(html)
}

function optionText(option: any) {
  if (typeof option === 'string') return option
  return String(option?.text ?? option?.label ?? option?.value ?? '')
}

export default function FlashcardEditor({ exam, onClose }: { exam: { id: string; title: string }; onClose: () => void }) {
  const [cards, setCards] = useState<CardRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [bankRows, setBankRows] = useState<BankRow[]>([])
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([])
  const [bankLoading, setBankLoading] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  const [importing, setImporting] = useState(false)

  const loadCards = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error: loadError } = await supabase.from('questions')
      .select('id, question_text, explanation, image_url, created_at')
      .eq('exam_id', exam.id).eq('question_type', 'flashcard').order('created_at', { ascending: true })
    if (loadError) setError(loadError.message)
    else { setCards((data || []) as CardRow[]); setError('') }
    setLoading(false)
  }

  useEffect(() => { void loadCards() }, [exam.id])

  const startNew = () => { setSelectedId(null); setFront(''); setBack(''); setShowPreview(false); setError('') }
  const editCard = (card: CardRow) => { setSelectedId(card.id); setFront(card.question_text || ''); setBack(card.explanation || ''); setShowPreview(false); setError('') }

  const saveCard = async () => {
    if (saving) return
    if (!hasReadableContent(front) || !hasReadableContent(back)) { setError('Sisi depan dan sisi belakang wajib diisi sebelum disimpan.'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const payload = { exam_id: exam.id, question_text: front, explanation: back, options: [], correct_option: 'A', question_type: 'flashcard' }
    const result = selectedId ? await supabase.from('questions').update(payload).eq('id', selectedId) : await supabase.from('questions').insert(payload)
    if (result.error) { setError(result.error.message); setSaving(false); return }
    await loadCards(); startNew(); setSaving(false)
  }

  const openImport = async () => {
    setShowImport(true); setBankLoading(true); setError('')
    const supabase = createClient()
    const { data, error: bankError } = await supabase.from('questions')
      .select('id, question_text, options, correct_option, explanation, image_url, exams!inner(id, title, subtest)')
      .neq('exam_id', exam.id)
      .in('question_type', ['multiple_choice', 'complex_multiple_choice'])
      .order('created_at', { ascending: false })
      .limit(300)
    if (bankError) setError(bankError.message)
    else setBankRows((data || []) as unknown as BankRow[])
    setBankLoading(false)
  }

  const filteredBankRows = bankRows.filter((row) => {
    const source = row.exams?.title || ''
    const text = `${row.question_text} ${source} ${row.exams?.subtest || ''}`.toLowerCase()
    return text.includes(bankSearch.toLowerCase())
  })

  const toggleBankRow = (id: string) => setSelectedBankIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id])

  const importSelected = async () => {
    if (importing || !selectedBankIds.length) return
    setImporting(true); setError('')
    const selected = bankRows.filter((row) => selectedBankIds.includes(row.id))
    const payload = selected.map((row) => {
      const options = Array.isArray(row.options) ? row.options : []
      const key = String(row.correct_option || '').trim().toUpperCase()
      const answer = options.find((option: any, index: number) => String(option?.key ?? option?.value ?? String.fromCharCode(65 + index)).trim().toUpperCase() === key)
      const answerContent = optionText(answer)
      const explanation = row.explanation ? `<p>Jawaban: ${answerContent || key}</p><p>${row.explanation}</p>` : `<p>Jawaban: ${answerContent || key}</p>`
      return { exam_id: exam.id, question_text: row.question_text, explanation, image_url: row.image_url, options: [], correct_option: 'A', question_type: 'flashcard' }
    })
    const supabase = createClient()
    const { error: insertError } = await supabase.from('questions').insert(payload)
    if (insertError) { setError(insertError.message); setImporting(false); return }
    setSelectedBankIds([]); setShowImport(false); await loadCards(); setImporting(false)
  }

  const deleteCard = async (card: CardRow) => {
    if (!confirm('Hapus pasangan kartu ini? Riwayat belajar yang terhubung juga dapat terhapus sesuai relasi database.')) return
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('questions').delete().eq('id', card.id)
    if (deleteError) { setError(deleteError.message); return }
    if (selectedId === card.id) startNew()
    await loadCards()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-6">
          <div className="min-w-0"><div className="text-[10px] font-black tracking-[0.18em] text-amber-300">🧩 KELOLA SET PASANGAN KARTU</div><h2 className="mt-1 truncate text-base font-black sm:text-lg">{exam.title}</h2><p className="mt-1 text-xs text-slate-400">{cards.length} pasangan tersimpan · level dipilih pemain</p></div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold hover:bg-slate-700">✕</button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-800 bg-slate-900/60 p-4 lg:border-b-0 lg:border-r">
            <button type="button" onClick={startNew} className="mb-2 w-full rounded-xl bg-amber-500 px-4 py-3 text-xs font-black text-amber-950">＋ Buat pasangan sendiri</button>
            <button type="button" onClick={() => void openImport()} className="mb-3 w-full rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-xs font-black text-cyan-100">📥 Ambil dari bank soal</button>
            <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Daftar pasangan</div>
            {loading ? <p className="py-6 text-center text-xs text-slate-400">Memuat pasangan...</p> : cards.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-xs text-slate-400">Belum ada pasangan. Buat sendiri, import, atau gunakan generator.</div> : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(96vh-260px)]">
                {cards.map((card, index) => <div key={card.id} className={`rounded-xl border p-3 ${selectedId === card.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-950'}`}>
                  <button type="button" onClick={() => editCard(card)} className="w-full text-left"><div className="text-[10px] font-black text-slate-500">PASANGAN {index + 1}</div><div className="mt-1 line-clamp-2 text-xs font-bold text-slate-100"><MathRenderer content={card.question_text || '(Sisi depan kosong)'} /></div><div className="mt-1 line-clamp-1 text-[10px] text-emerald-200"><MathRenderer content={card.explanation || '(Sisi belakang kosong)'} /></div></button>
                  <div className="mt-2 flex gap-2"><button type="button" onClick={() => editCard(card)} className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-200">Edit</button><button type="button" onClick={() => deleteCard(card)} className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-300">Hapus</button></div>
                </div>)}
              </div>
            )}
          </aside>

          <section className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-black">{selectedId ? 'Edit pasangan' : 'Pasangan baru'}</h3><p className="mt-1 text-xs text-slate-400">Satu pasangan terdiri dari satu sisi depan dan satu sisi belakang.</p></div><button type="button" onClick={() => setShowPreview((value) => !value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-200">{showPreview ? '✏️ Kembali ke editor' : '👁️ Pratinjau pasangan'}</button></div>
            {showPreview ? <div className="grid gap-3 md:grid-cols-2"><div className="min-h-56 rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-600 to-blue-800 p-5"><div className="mb-5 text-[10px] font-black tracking-widest text-cyan-100">SISI DEPAN</div><div className="text-center text-lg font-bold"><MathRenderer content={front || 'Pertanyaan akan tampil di sini'} /></div></div><div className="min-h-56 rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-600 to-teal-800 p-5"><div className="mb-5 text-[10px] font-black tracking-widest text-emerald-100">SISI BELAKANG</div><div className="text-center text-lg font-bold"><MathRenderer content={back || 'Jawaban akan tampil di sini'} /></div></div></div> : <div className="grid gap-4"><div className="overflow-hidden rounded-2xl border border-cyan-300/30 bg-cyan-50"><div className="bg-cyan-700 px-4 py-2 text-[10px] font-black tracking-widest text-white">❓ SISI DEPAN — PERTANYAAN / ISTILAH</div><RichTextEditor content={front} onChange={setFront} placeholder="Tuliskan pertanyaan atau istilah..." minHeight={170} /></div><div className="overflow-hidden rounded-2xl border border-emerald-300/30 bg-emerald-50"><div className="bg-emerald-700 px-4 py-2 text-[10px] font-black tracking-widest text-white">💡 SISI BELAKANG — JAWABAN / PENJELASAN</div><RichTextEditor content={back} onChange={setBack} placeholder="Tuliskan jawaban dan penjelasan..." minHeight={170} /></div></div>}
            {error && !showImport && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4"><button type="button" onClick={startNew} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-300">Kosongkan</button><button type="button" onClick={saveCard} disabled={saving || showPreview} className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black text-emerald-950 disabled:opacity-50">{saving ? 'Menyimpan...' : selectedId ? 'Simpan perubahan pasangan' : 'Simpan pasangan baru'}</button></div>
          </section>
        </div>

        {showImport && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-3"><div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black">📥 Import dari bank soal</h3><p className="mt-1 text-xs text-slate-400">Pilih soal ujian atau latihan. Kunci jawaban pilihan ganda dijadikan sisi belakang.</p></div><button onClick={() => setShowImport(false)} className="rounded-lg bg-slate-800 px-3 py-2">✕</button></div><input value={bankSearch} onChange={(event) => setBankSearch(event.target.value)} placeholder="Cari soal, judul ujian, atau subtes..." className="mt-4 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none" /><div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">{bankLoading ? <p className="p-8 text-center text-sm text-slate-400">Mengambil bank soal...</p> : filteredBankRows.length ? filteredBankRows.map((row) => <label key={row.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3"><input type="checkbox" checked={selectedBankIds.includes(row.id)} onChange={() => toggleBankRow(row.id)} className="mt-1" /><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold text-cyan-200">{row.exams?.title || 'Sumber bank soal'} · {row.exams?.subtest || 'Tanpa subtes'}</span><span className="mt-1 block text-xs text-white"><MathRenderer content={row.question_text} /></span><span className="mt-1 block text-[10px] text-slate-400">Kunci: {row.correct_option || 'belum ditentukan'}</span></span></label>) : <p className="p-6 text-center text-xs text-slate-400">Tidak ada soal yang cocok dengan pencarian.</p>}</div>{error && <p className="mt-2 text-xs text-rose-300">{error}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700 pt-3"><span className="text-xs text-slate-400">{selectedBankIds.length} soal dipilih</span><div className="flex gap-2"><button onClick={() => setShowImport(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold">Batal</button><button onClick={() => void importSelected()} disabled={!selectedBankIds.length || importing} className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-50">{importing ? 'Mengimpor...' : 'Import sebagai pasangan'}</button></div></div></div></div>}
      </div>
    </div>
  )
}
