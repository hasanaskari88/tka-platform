'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/context/ThemeContext'
import { getMaterialTheme } from '@/lib/material-theme'

const PAGE_SIZE = 10

export default function MateriCatalogPage() {
  const { theme } = useTheme()
  const styles = getMaterialTheme(theme)
  const [materials, setMaterials] = useState<any[]>([])
  const [pinOrder, setPinOrder] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('Semua')
  const [sort, setSort] = useState('Prioritas')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true
    async function loadMaterials() {
      const supabase = createClient()
      const [materialsResult, pinsResponse] = await Promise.all([
        supabase.from('study_materials').select('*, author:profiles!study_materials_created_by_fkey(full_name)').eq('status', 'published').order('created_at', { ascending: false }),
        fetch('/api/homepage-pins?surface=material', { cache: 'no-store' }).catch(() => null),
      ])
      if (!active) return
      if (materialsResult.error) console.error('Gagal memuat katalog sumber belajar:', materialsResult.error)
      else setMaterials(materialsResult.data || [])
      if (pinsResponse?.ok) {
        const payload = await pinsResponse.json().catch(() => null)
        const nextOrder: Record<string, number> = {}
        for (const pin of Array.isArray(payload?.pins) ? payload.pins : []) {
          if (pin?.scope === 'item' && typeof pin.id === 'string') nextOrder[pin.id] = Number(pin.sort_order) || 0
        }
        if (active) setPinOrder(nextOrder)
      }
      setLoading(false)
    }
    loadMaterials()
    return () => { active = false }
  }, [])

  const subjects = useMemo(() => {
    return Array.from(new Set(
      materials.map((item) => String(item.subject || 'Umum').trim()).filter(Boolean),
    )).sort((a, b) => a.localeCompare(b, 'id'))
  }, [materials])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('id')
    const result = materials.filter((item) => {
      const itemSubject = String(item.subject || 'Umum').trim()
      if (subject !== 'Semua' && itemSubject !== subject) return false
      if (!keyword) return true
      return `${item.title || ''} ${item.description || ''} ${itemSubject} ${item.author_display_name || item.author?.full_name || ''}`
        .toLocaleLowerCase('id').includes(keyword)
    })

    result.sort((a, b) => {
      if (sort === 'Prioritas') {
        const orderA = pinOrder[a.id]
        const orderB = pinOrder[b.id]
        if (orderA !== undefined && orderB !== undefined) return orderA - orderB
        if (orderA !== undefined) return -1
        if (orderB !== undefined) return 1
      }
      if (sort === 'Nama A-Z') return (a.title || '').localeCompare(b.title || '', 'id')
      if (sort === 'Nama Z-A') return (b.title || '').localeCompare(a.title || '', 'id')
      if (sort === 'Penulis A-Z') {
        const authorA = a.author_display_name || a.author?.full_name || 'Tim Penyusun'
        const authorB = b.author_display_name || b.author?.full_name || 'Tim Penyusun'
        return authorA.localeCompare(authorB, 'id')
      }
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return sort === 'Terlama' ? dateA - dateB : dateB - dateA
    })
    return result
  }, [materials, search, subject, sort, pinOrder])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleMaterials = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, subject, sort])

  return (
    <div className={`min-h-screen ${styles.page} theme-${theme}`}>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-9">
        <div className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 ${styles.hero}`}>
          <Link href="/" className={`text-xs font-bold underline underline-offset-4 ${styles.accent}`}>← Kembali ke Beranda</Link>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${styles.heroBadge}`}>📚 Perpustakaan Digital</span>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Pusat Sumber Belajar</h1>
              <p className={`mt-2 max-w-2xl text-xs font-semibold leading-relaxed sm:text-sm ${styles.heroText}`}>
                Temukan materi, bahan ajar, dan sumber belajar berdasarkan mata pelajaran.
              </p>
            </div>
            <span className="hidden text-5xl sm:block">🎒</span>
          </div>
        </div>

        <section className={`space-y-4 rounded-3xl border p-4 sm:p-5 ${styles.panel}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-black">Jelajahi koleksi</h2>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${styles.count}`}>{filtered.length} sumber ditemukan</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_220px_170px]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, deskripsi, penulis..."
              aria-label="Cari sumber belajar"
              className={`min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none ${styles.input}`}
            />
            <select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Pilih mata pelajaran" className={`rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none ${styles.input}`}>
              <option value="Semua">Semua mata pelajaran</option>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Urutkan sumber belajar" className={`rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none ${styles.input}`}>
              <option value="Prioritas">⭐ Prioritas Beranda</option>
              <option value="Terbaru">Terbaru</option>
              <option value="Terlama">Terlama</option>
              <option value="Nama A-Z">Nama A–Z</option>
              <option value="Nama Z-A">Nama Z–A</option>
              <option value="Penulis A-Z">Penulis A–Z</option>
            </select>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm font-bold text-slate-500">Memuat sumber belajar...</div>
          ) : visibleMaterials.length > 0 ? (
            <div className="space-y-3">
              {visibleMaterials.map((item, index) => (
                <article key={item.id} className={`flex items-start gap-3 rounded-2xl border p-3 transition sm:p-4 ${styles.card}`}>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-2xl ${styles.icon}`}>{['📕', '📘', '📗', '📙', '📚'][((page - 1) * PAGE_SIZE + index) % 5]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{item.title || 'Tanpa judul'}</h3>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">{item.subject || 'Umum'}</span>
                    </div>
                    <p className={`mt-1 text-[11px] font-semibold ${styles.muted}`}>✍️ {item.author_display_name || item.author?.full_name || 'Tim Penyusun'}</p>
                    {item.description && <div className={`mt-2 line-clamp-2 text-xs leading-relaxed ${styles.muted}`}><MathRenderer content={item.description} /></div>}
                  </div>
                  {item.content_html ? (
                    <Link href={'/materi/' + item.id} className="shrink-0 rounded-xl border-2 border-slate-900 bg-amber-300 px-3 py-2 text-[11px] font-black text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition hover:-translate-y-0.5">Baca Materi ↗</Link>
                  ) : item.file_url ? (
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl border-2 border-slate-900 bg-amber-300 px-3 py-2 text-[11px] font-black text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition hover:-translate-y-0.5">Buka ↗</a>
                  ) : <span className="shrink-0 text-[10px] font-semibold text-slate-400">Belum tersedia</span>}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-14 text-center">
              <div className="text-4xl">🔎</div>
              <h3 className="mt-3 text-sm font-black">Sumber belajar belum ditemukan</h3>
              <p className="mt-1 text-xs text-slate-500">Coba ubah kata kunci atau mata pelajaran.</p>
              <button type="button" onClick={() => { setSearch(''); setSubject('Semua'); setSort('Prioritas') }} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Reset pencarian</button>
            </div>
          )}

          {!loading && filtered.length > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500">Halaman {page} dari {totalPages}</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border-2 border-slate-200 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">← Sebelumnya</button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40">Berikutnya →</button>
              </div>
            </div>
          )}
        </section>
        <p className={`text-center text-[11px] ${styles.muted}`}>Koleksi diperbarui dari sumber belajar yang dikelola oleh admin.</p>
      </main>
    </div>
  )
}
