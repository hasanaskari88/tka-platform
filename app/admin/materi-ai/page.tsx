'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CURRICULUM_CATALOGS, getCurriculumTopics, type CurriculumTrack } from '@/lib/ai-question/curriculum-catalog'
import RichTextEditor from '@/components/editor/RichTextEditor'

type ApiResult = {
  error?: string
  title?: string
  description?: string
  contentHtml?: string
  provider?: string
  model?: string
  success?: boolean
  id?: string
  status?: string
}

export default function AdminAiMaterialsPage() {
  const [track, setTrack] = useState<CurriculumTrack>('GRADE_6')
  const [subject, setSubject] = useState('Matematika')
  const [topicId, setTopicId] = useState('g6-mtk-pecahan')
  const [grade, setGrade] = useState('6')
  const [extraInstructions, setExtraInstructions] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [providerInfo, setProviderInfo] = useState('')

  const subjects = useMemo(() => Object.keys(CURRICULUM_CATALOGS[track]), [track])
  const topics = useMemo(() => getCurriculumTopics(track, subject), [track, subject])
  const selectedTopic = topics.find((topic) => topic.id === topicId)

  const changeTrack = (next: CurriculumTrack) => {
    const nextSubjects = Object.keys(CURRICULUM_CATALOGS[next])
    const nextSubject = nextSubjects[0] || ''
    const nextTopic = getCurriculumTopics(next, nextSubject)[0]
    setTrack(next)
    setSubject(nextSubject)
    setTopicId(nextTopic?.id || '')
    setGrade(next === 'GRADE_6' ? '6' : '6')
    setTitle('')
    setDescription('')
    setContentHtml('')
    setMaterialId('')
    setProviderInfo('')
    setError('')
    setNotice('')
  }

  async function callApi(payload: Record<string, unknown>): Promise<ApiResult> {
    const response = await fetch('/api/admin/ai/generate-materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json() as ApiResult
    if (!response.ok) throw new Error(result.error || 'Permintaan gagal diproses.')
    return result
  }

  async function generate() {
    if (!selectedTopic) {
      setError('Pilih topik terlebih dahulu.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    setProviderInfo('')
    try {
      const result = await callApi({ action: 'generate', track, subject, topicId, grade: Number(grade), extraInstructions })
      setTitle(result.title || selectedTopic.title)
      setDescription(result.description || '')
      setContentHtml(result.contentHtml || '')
      setMaterialId('')
      setProviderInfo([result.provider, result.model].filter(Boolean).join(' · '))
      setNotice('Draf materi berhasil dibuat. Silakan periksa dan sunting sebelum menyimpan.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat materi.')
    } finally {
      setBusy(false)
    }
  }

  async function save(status: 'draft' | 'published') {
    if (!title.trim() || !contentHtml.trim()) {
      setError('Judul dan isi materi harus tersedia.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await callApi({
        action: 'save',
        materialId: materialId || undefined,
        title,
        description,
        contentHtml,
        subject,
        track,
        topicId,
        grade: Number(grade),
        status,
      })
      if (result.id) setMaterialId(result.id)
      setNotice(status === 'published' ? 'Materi berhasil disimpan dan diterbitkan.' : 'Materi berhasil disimpan sebagai draf.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan materi.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Admin · Asisten AI</p>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Pembuat Materi Ajar</h1>
            <p className="mt-1 text-sm text-slate-500">Buat draf berdasarkan katalog kurikulum, lalu periksa dan sunting dengan editor.</p>
          </div>
          <Link href="/admin/konten" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">← Pengelolaan Konten</Link>
        </header>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

        <section className="grid gap-4 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Jalur kurikulum
            <select value={track} onChange={(event) => changeTrack(event.target.value as CurriculumTrack)} className={field}>
              <option value="GRADE_6">Pembelajaran Kelas 6 (Fase C)</option>
              <option value="TKA">Persiapan TKA SD</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Kelas
            <select value={grade} onChange={(event) => setGrade(event.target.value)} disabled={track === 'GRADE_6'} className={field}>
              <option value="6">Kelas 6 SD</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Mata pelajaran
            <select value={subject} onChange={(event) => {
              const next = event.target.value
              setSubject(next)
              setTopicId(getCurriculumTopics(track, next)[0]?.id || '')
            }} className={field}>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Topik
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className={field}>
              {topics.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600 md:col-span-2">Arahan tambahan (opsional)
            <textarea value={extraInstructions} onChange={(event) => setExtraInstructions(event.target.value)} rows={3} maxLength={1200} placeholder="Contoh: gunakan konteks kehidupan sehari-hari di lingkungan desa dan bahasa yang sederhana." className={field} />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
            <p className="max-w-2xl text-xs leading-relaxed text-slate-500">{selectedTopic?.description || 'Pilih topik untuk melihat cakupan materi.'}</p>
            <button type="button" onClick={generate} disabled={busy || !topicId} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? 'Memproses...' : '✨ Buat Materi dengan AI'}
            </button>
          </div>
        </section>

        {(contentHtml || title) && (
          <section className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-black text-slate-900">Periksa dan sunting materi</h2>
                <p className="text-xs text-slate-500">AI dapat keliru. Periksa fakta, contoh, jawaban, dan kesesuaian ATP sebelum diterbitkan.</p>
              </div>
              {providerInfo && <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">{providerInfo}</span>}
            </div>
            <label className="block text-xs font-bold text-slate-600">Judul materi
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className={field} />
            </label>
            <label className="block text-xs font-bold text-slate-600">Deskripsi singkat
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={500} className={field} />
            </label>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <RichTextEditor key={materialId || topicId} content={contentHtml} onChange={setContentHtml} minHeight={520} toolbarMode="full" />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => save('draft')} disabled={busy || !contentHtml.trim()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">
                {busy ? 'Menyimpan...' : 'Simpan sebagai Draf'}
              </button>
              <button type="button" onClick={() => {
                if (confirm('Terbitkan materi ini agar dapat dilihat siswa?')) void save('published')
              }} disabled={busy || !contentHtml.trim()} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                Terbitkan Materi
              </button>
            </div>
            {materialId && <p className="text-[11px] text-slate-500">ID materi: {materialId} · Penyimpanan berikutnya akan memperbarui materi yang sama.</p>}
          </section>
        )}

        <p className="text-center text-[11px] text-slate-400">Materi yang baru dibuat belum tampil di katalog siswa sampai diterbitkan.</p>
      </div>
    </div>
  )
}
