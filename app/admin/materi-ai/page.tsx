'use client'

import { useEffect, useMemo, useState } from 'react'
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
  drafts?: { id: string; title: string; topicId: string; description: string; contentHtml: string }[]
}

export default function AdminAiMaterialsPage() {
  const [track, setTrack] = useState<CurriculumTrack>('GRADE_6')
  const [subject, setSubject] = useState('Matematika')
  const [topicId, setTopicId] = useState('g6-mtk-pecahan')
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(['g6-mtk-pecahan'])
  const [generatedDrafts, setGeneratedDrafts] = useState<{ id: string; title: string; topicId: string; description: string; contentHtml: string }[]>([])
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

  useEffect(() => {
    let active = true
    async function loadDrafts() {
      try {
        const response = await fetch('/api/admin/ai/generate-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list', track, subject }),
        })
        const result = await response.json() as ApiResult
        if (!response.ok) throw new Error(result.error || 'Daftar draf gagal dimuat.')
        if (active) setGeneratedDrafts(result.drafts || [])
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Daftar draf gagal dimuat.')
      }
    }
    void loadDrafts()
    return () => { active = false }
  }, [track, subject])

  const changeTrack = (next: CurriculumTrack) => {
    const nextSubjects = Object.keys(CURRICULUM_CATALOGS[next])
    const nextSubject = nextSubjects[0] || ''
    const nextTopic = getCurriculumTopics(next, nextSubject)[0]
    setTrack(next)
    setSubject(nextSubject)
    setTopicId(nextTopic?.id || '')
    setSelectedTopicIds(nextTopic?.id ? [nextTopic.id] : [])
    setGeneratedDrafts([])
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
    const selectedTopics = topics.filter((topic) => selectedTopicIds.includes(topic.id))
    if (!selectedTopics.length) { setError('Pilih minimal satu bab/topik terlebih dahulu.'); return }
    setBusy(true); setError(''); setNotice(''); setProviderInfo('')
    const created: { id: string; title: string; topicId: string; description: string; contentHtml: string }[] = []
    try {
      for (const topic of selectedTopics) {
        setNotice(`Sedang membuat materi: ${topic.title}...`)
        const result = await callApi({ action: 'generate', track, subject, topicId: topic.id, grade: Number(grade), extraInstructions })
        if (!result.title || !result.contentHtml) throw new Error(`Materi untuk "${topic.title}" tidak lengkap.`)
        const saved = await callApi({ action: 'save', title: result.title, description: result.description || '', contentHtml: result.contentHtml, subject, track, topicId: topic.id, grade: Number(grade), status: 'draft' })
        if (!saved.id) throw new Error(`ID draf "${topic.title}" tidak diterima.`)
        const draft = { id: saved.id, title: result.title, topicId: topic.id, description: result.description || '', contentHtml: result.contentHtml }
        created.push(draft); setGeneratedDrafts((previous) => [...previous, draft])
      }
      const first = created[0]
      if (first) { setTopicId(first.topicId); setTitle(first.title); setDescription(first.description); setContentHtml(first.contentHtml); setMaterialId(first.id) }
      setProviderInfo('Draf tersimpan otomatis')
      setNotice(`${created.length} materi berhasil dibuat dan disimpan sebagai draf terpisah. Belum ada yang diterbitkan.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat materi.')
      if (created.length) setNotice(`${created.length} draf berhasil disimpan sebelum proses terhenti.`)
    } finally { setBusy(false) }
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
      if (result.id) {
        setMaterialId(result.id)
        if (status === 'draft') {
          setGeneratedDrafts((previous) => {
            const draft = { id: result.id!, title, topicId, description, contentHtml }
            return [draft, ...previous.filter((item) => item.id !== result.id)]
          })
        } else {
          setGeneratedDrafts((previous) => previous.filter((item) => item.id !== result.id))
        }
      }
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
              const firstTopic = getCurriculumTopics(track, next)[0]
              setTopicId(firstTopic?.id || '')
              setSelectedTopicIds(firstTopic?.id ? [firstTopic.id] : [])
              setGeneratedDrafts([])
            }} className={field}>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="text-xs font-bold text-slate-600 md:col-span-2">Bab / Topik
            <div className="mt-2 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">Pilih satu atau beberapa bab/topik</span>
                <button type="button" onClick={() => setSelectedTopicIds(topics.map((item) => item.id))} className="text-xs font-bold text-indigo-600">Pilih semua</button>
              </div>
              {CURRICULUM_CATALOGS[track][subject]?.groups.map((group) => (
                <div key={group.title}>
                  <p className="mb-1 text-xs font-black text-slate-700">{group.title}</p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {group.topics.map((item) => (
                      <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-lg bg-white p-2 text-xs text-slate-700">
                        <input type="checkbox" checked={selectedTopicIds.includes(item.id)} onChange={(event) => setSelectedTopicIds((previous) => event.target.checked ? [...previous, item.id] : previous.filter((id) => id !== item.id))} className="mt-0.5 accent-indigo-600" />
                        <span>{item.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <label className="text-xs font-bold text-slate-600 md:col-span-2">Arahan tambahan (opsional)
            <textarea value={extraInstructions} onChange={(event) => setExtraInstructions(event.target.value)} rows={3} maxLength={1200} placeholder="Contoh: gunakan konteks kehidupan sehari-hari di lingkungan desa dan bahasa yang sederhana." className={field} />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
            <p className="max-w-2xl text-xs leading-relaxed text-slate-500">{selectedTopic?.description || 'Pilih topik untuk melihat cakupan materi.'} · {selectedTopicIds.length} topik dipilih. Setiap hasil otomatis disimpan sebagai draf terpisah.</p>
            <button type="button" onClick={generate} disabled={busy || selectedTopicIds.length === 0} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? 'Memproses...' : '✨ Buat Materi dengan AI'}
            </button>
          </div>
        </section>

        {generatedDrafts.length > 0 && (
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-black text-slate-900">Draf yang sudah dibuat</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {generatedDrafts.map((draft) => (
                <button key={draft.id} type="button" onClick={() => { setTopicId(draft.topicId); setTitle(draft.title); setDescription(draft.description); setContentHtml(draft.contentHtml); setMaterialId(draft.id); setNotice('Membuka draf untuk disunting.'); setError('') }} className={`rounded-xl border p-3 text-left text-sm ${materialId === draft.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <span className="block font-bold text-slate-800">{draft.title}</span>
                  <span className="mt-1 block text-xs text-emerald-700">Tersimpan sebagai draf</span>
                </button>
              ))}
            </div>
          </section>
        )}

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
