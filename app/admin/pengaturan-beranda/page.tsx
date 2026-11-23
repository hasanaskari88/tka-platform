'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Surface = 'cbt' | 'material' | 'practice' | 'announcement'
type Item = {
  id: string
  title: string
  description: string | null
  meta: string
  created_at: string | null
  eligible: boolean
}
type SurfaceData = { items: Item[]; pinnedIds: string[] }

const tabs: Array<{ id: Surface; label: string; description: string }> = [
  { id: 'cbt', label: 'Ujian (CBT)', description: 'Urutan ujian pada halaman depan.' },
  { id: 'material', label: 'Materi', description: 'Urutan materi belajar pada halaman depan.' },
  { id: 'practice', label: 'Practice', description: 'Urutan kartu aktivitas di halaman latihan.' },
  { id: 'announcement', label: 'Pengumuman', description: 'Urutan informasi sekolah pada halaman depan.' },
]

const emptyData: SurfaceData = { items: [], pinnedIds: [] }

export default function HomepageSettingsPage() {
  const [activeSurface, setActiveSurface] = useState<Surface>('cbt')
  const [dataBySurface, setDataBySurface] = useState<Record<Surface, SurfaceData>>({
    cbt: emptyData,
    material: emptyData,
    practice: emptyData,
    announcement: emptyData,
  })
  const [draftBySurface, setDraftBySurface] = useState<Record<Surface, string[]>>({
    cbt: [], material: [], practice: [], announcement: [],
  })
  const [savedBySurface, setSavedBySurface] = useState<Record<Surface, string[]>>({
    cbt: [], material: [], practice: [], announcement: [],
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadSurface = useCallback(async (surface: Surface) => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/homepage-pins?surface=' + surface, {
        method: 'GET',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Pengaturan gagal dimuat.')

      const nextData: SurfaceData = {
        items: Array.isArray(payload?.items) ? payload.items : [],
        pinnedIds: Array.isArray(payload?.pinnedIds) ? payload.pinnedIds : [],
      }
      setDataBySurface((old) => ({ ...old, [surface]: nextData }))
      setDraftBySurface((old) => ({ ...old, [surface]: [...nextData.pinnedIds] }))
      setSavedBySurface((old) => ({ ...old, [surface]: [...nextData.pinnedIds] }))
    } catch (loadError: any) {
      setError(loadError?.message || 'Pengaturan gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadSurface(activeSurface) }, [activeSurface, loadSurface])

  const activeTab = tabs.find((tab) => tab.id === activeSurface) || tabs[0]
  const data = dataBySurface[activeSurface]
  const pinnedIds = draftBySurface[activeSurface]
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds])
  const itemById = useMemo(() => new Map<string, Item>(data.items.map((item) => [item.id, item] as [string, Item])), [data.items])
  const pinnedItems = pinnedIds.map((id) => itemById.get(id)).filter(Boolean) as Item[]
  const searchableItems = data.items.filter((item) =>
    item.eligible &&
    !pinnedSet.has(item.id) &&
    (item.title + ' ' + item.meta + ' ' + (item.description || '')).toLowerCase().includes(search.trim().toLowerCase())
  )
  const isDirty = JSON.stringify(pinnedIds) !== JSON.stringify(savedBySurface[activeSurface])

  const changePinnedIds = (nextIds: string[]) => {
    setDraftBySurface((old) => ({ ...old, [activeSurface]: nextIds }))
    setMessage('')
    setError('')
  }
  const addPin = (id: string) => {
    if (!pinnedSet.has(id)) changePinnedIds([...pinnedIds, id])
  }
  const removePin = (id: string) => changePinnedIds(pinnedIds.filter((itemId) => itemId !== id))
  const movePin = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= pinnedIds.length) return
    const next = [...pinnedIds]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    changePinnedIds(next)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/homepage-pins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surface: activeSurface, itemIds: pinnedIds }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Urutan prioritas gagal disimpan.')

      const confirmedIds = Array.isArray(payload?.pinnedIds) ? payload.pinnedIds : pinnedIds
      setDraftBySurface((old) => ({ ...old, [activeSurface]: [...confirmedIds] }))
      setSavedBySurface((old) => ({ ...old, [activeSurface]: [...confirmedIds] }))
      setMessage('Urutan prioritas berhasil disimpan.')
    } catch (saveError: any) {
      setError(saveError?.message || 'Urutan prioritas gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Pengelolaan Website</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Pengaturan Beranda</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Pilih konten yang ingin ditampilkan lebih dahulu. Pengaturan ini hanya mengubah urutan tampilan, bukan isi, status publikasi, token, atau aktivitas.
          </p>
        </header>

        <nav className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Jenis konten">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveSurface(tab.id); setSearch(''); setError(''); setMessage('') }}
              className={'rounded-xl border px-3 py-3 text-left text-sm font-bold transition ' + (
                activeSurface === tab.id
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">{activeTab.label}</h2>
              <p className="mt-1 text-xs text-slate-500">{activeTab.description}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadSurface(activeSurface)}
              disabled={loading || saving}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"
            >
              Muat ulang
            </button>
          </div>

          {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          {message && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

          {loading ? (
            <div className="py-16 text-center text-sm font-semibold text-slate-500">Memuat daftar konten...</div>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800">⭐ Sedang diprioritaskan</h3>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{pinnedIds.length} item</span>
                </div>
                {pinnedItems.length ? pinnedItems.map((item, index) => (
                  <article key={item.id} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                        {!item.eligible && <p className="mt-2 text-xs font-bold text-amber-700">Konten sedang tidak tersedia untuk publik. Lepas pin atau biarkan sampai diterbitkan kembali.</p>}
                        {item.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{item.description}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button type="button" onClick={() => movePin(index, -1)} disabled={index === 0} aria-label="Naikkan urutan" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 disabled:opacity-30">↑</button>
                        <button type="button" onClick={() => movePin(index, 1)} disabled={index === pinnedIds.length - 1} aria-label="Turunkan urutan" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 disabled:opacity-30">↓</button>
                        <button type="button" onClick={() => removePin(item.id)} className="rounded-lg border border-rose-100 bg-white px-2 py-1 text-[10px] font-bold text-rose-600">Lepas</button>
                      </div>
                    </div>
                  </article>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-xs text-slate-500">Belum ada konten yang diprioritaskan.</div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-black text-slate-800">Konten lainnya</h3>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari judul atau kategori..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
                />
                <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                  {searchableItems.map((item) => (
                    <article key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                        {item.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>}
                      </div>
                      <button type="button" onClick={() => addPin(item.id)} className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">+ Pin</button>
                    </article>
                  ))}
                  {!searchableItems.length && <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500">Tidak ada konten yang cocok atau semua konten sudah dipin.</div>}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Perubahan belum aktif sampai tombol simpan ditekan. Urutan setiap tab berdiri sendiri.</p>
            <button
              type="button"
              onClick={() => void save()}
              disabled={loading || saving || !isDirty}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Menyimpan...' : 'Simpan perubahan'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
