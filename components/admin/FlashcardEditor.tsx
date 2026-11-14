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

function hasReadableContent(html: string) {
  const plain = html
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim()
  return plain.length > 0 || /<img\b/i.test(html)
}

export default function FlashcardEditor({
  exam,
  onClose,
}: {
  exam: { id: string; title: string }
  onClose: () => void
}) {
  const [cards, setCards] = useState<CardRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const loadCards = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error: loadError } = await supabase
      .from('questions')
      .select('id, question_text, explanation, image_url, created_at')
      .eq('exam_id', exam.id)
      .eq('question_type', 'flashcard')
      .order('created_at', { ascending: true })

    if (loadError) {
      setError(loadError.message)
    } else {
      setCards((data || []) as CardRow[])
      setError('')
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadCards()
  }, [exam.id])

  const startNew = () => {
    setSelectedId(null)
    setFront('')
    setBack('')
    setShowPreview(false)
    setError('')
  }

  const editCard = (card: CardRow) => {
    setSelectedId(card.id)
    setFront(card.question_text || '')
    setBack(card.explanation || '')
    setShowPreview(false)
    setError('')
  }

  const saveCard = async () => {
    if (saving) return
    if (!hasReadableContent(front) || !hasReadableContent(back)) {
      setError('Sisi depan dan sisi belakang wajib diisi sebelum disimpan.')
      return
    }

    setSaving(true)
    setError('')
    const supabase = createClient()
    const payload = {
      exam_id: exam.id,
      question_text: front,
      explanation: back,
      options: [],
      correct_option: 'A',
      question_type: 'flashcard',
    }

    const result = selectedId
      ? await supabase.from('questions').update(payload).eq('id', selectedId)
      : await supabase.from('questions').insert(payload)

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    await loadCards()
    startNew()
    setSaving(false)
  }

  const deleteCard = async (card: CardRow) => {
    if (!confirm('Hapus kartu ini? Riwayat belajar kartu ini juga akan terhapus sesuai relasi database.')) return
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('questions').delete().eq('id', card.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    if (selectedId === card.id) startNew()
    await loadCards()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="text-[10px] font-black tracking-[0.18em] text-amber-300">🃏 EDITOR FLASHCARD</div>
            <h2 className="mt-1 truncate text-base font-black sm:text-lg">{exam.title}</h2>
            <p className="mt-1 text-xs text-slate-400">{cards.length} kartu tersimpan</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold hover:bg-slate-700">✕</button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-800 bg-slate-900/60 p-4 lg:border-b-0 lg:border-r">
            <button type="button" onClick={startNew} className="mb-3 w-full rounded-xl bg-amber-500 px-4 py-3 text-xs font-black text-amber-950 hover:bg-amber-400">＋ Tambah kartu baru</button>
            <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Daftar kartu</div>
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-400">Memuat kartu...</p>
            ) : cards.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-xs text-slate-400">Belum ada kartu. Buat kartu pertama di sini.</div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(96vh-230px)]">
                {cards.map((card, index) => (
                  <div key={card.id} className={`rounded-xl border p-3 ${selectedId === card.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-950'}`}>
                    <button type="button" onClick={() => editCard(card)} className="w-full text-left">
                      <div className="text-[10px] font-black text-slate-500">KARTU {index + 1}</div>
                      <div className="mt-1 line-clamp-2 text-xs font-bold text-slate-100"><MathRenderer content={card.question_text || '(Tanpa pertanyaan)'} /></div>
                    </button>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => editCard(card)} className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-200">Edit</button>
                      <button type="button" onClick={() => deleteCard(card)} className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-300">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <section className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black">{selectedId ? 'Edit kartu' : 'Kartu baru'}</h3>
                <p className="mt-1 text-xs text-slate-400">Isi pertanyaan di sisi depan dan jawaban di sisi belakang.</p>
              </div>
              <button type="button" onClick={() => setShowPreview((value) => !value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-200">{showPreview ? '✏️ Kembali ke editor' : '👁️ Pratinjau kartu'}</button>
            </div>

            {showPreview ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="min-h-56 rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-600 to-blue-800 p-5">
                  <div className="mb-5 text-[10px] font-black tracking-widest text-cyan-100">SISI DEPAN</div>
                  <div className="text-center text-lg font-bold"><MathRenderer content={front || 'Pertanyaan akan tampil di sini'} /></div>
                </div>
                <div className="min-h-56 rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-600 to-teal-800 p-5">
                  <div className="mb-5 text-[10px] font-black tracking-widest text-emerald-100">SISI BELAKANG</div>
                  <div className="text-center text-lg font-bold"><MathRenderer content={back || 'Jawaban akan tampil di sini'} /></div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="overflow-hidden rounded-2xl border border-cyan-300/30 bg-cyan-50">
                  <div className="bg-cyan-700 px-4 py-2 text-[10px] font-black tracking-widest text-white">❓ SISI DEPAN — PERTANYAAN / ISTILAH</div>
                  <RichTextEditor content={front} onChange={setFront} placeholder="Tuliskan pertanyaan atau istilah..." minHeight={170} />
                </div>
                <div className="overflow-hidden rounded-2xl border border-emerald-300/30 bg-emerald-50">
                  <div className="bg-emerald-700 px-4 py-2 text-[10px] font-black tracking-widest text-white">💡 SISI BELAKANG — JAWABAN / PENJELASAN</div>
                  <RichTextEditor content={back} onChange={setBack} placeholder="Tuliskan jawaban dan penjelasan..." minHeight={170} />
                </div>
              </div>
            )}

            {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
              <button type="button" onClick={startNew} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-300">Kosongkan</button>
              <button type="button" onClick={saveCard} disabled={saving || showPreview} className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-50">{saving ? 'Menyimpan...' : selectedId ? 'Simpan perubahan kartu' : 'Simpan kartu baru'}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
