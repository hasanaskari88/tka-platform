'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import { createClient } from '@/lib/supabase/client'
import { getDetailHtml, legacyTextToHtml } from '@/lib/content-summary'

type Announcement = {
  id: string
  title: string
  content: string
  content_html: string | null
  category: string | null
  created_at: string
  summary_repeat: boolean
}

function AnnouncementDetailContent() {
  const params = useParams<{ id: string }>()
  const [item, setItem] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error: queryError } = await createClient()
        .from('announcements')
        .select('id,title,content,content_html,category,created_at,summary_repeat')
        .eq('id', params.id)
        .eq('is_active', true)
        .maybeSingle()
      if (!active) return
      if (queryError || !data) setError('Pengumuman tidak ditemukan atau sudah tidak aktif.')
      else setItem(data as Announcement)
      setLoading(false)
    }
    if (params.id) void load()
    return () => { active = false }
  }, [params.id])

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-9">
        <Link href="/" className="text-sm font-bold text-indigo-700 underline underline-offset-4">← Kembali ke Beranda</Link>
        {loading ? (
          <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">Memuat pengumuman...</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-600">{error}</div>
        ) : item ? (
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 bg-indigo-50/70 p-5 sm:p-8">
              <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-black uppercase text-indigo-800">{item.category || 'Pengumuman'}</span>
              <h1 className="mt-3 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">{item.title}</h1>
              <p className="mt-3 text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            </header>
            <div className="p-5 text-sm leading-8 text-slate-700 sm:p-8">
              <MathRenderer content={item.content_html ? getDetailHtml(item.content_html, item.summary_repeat !== false) : legacyTextToHtml(item.content || '')} className="material-content max-w-none" />
            </div>
          </article>
        ) : null}
      </main>
    </div>
  )
}

export default function AnnouncementDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-10 text-center text-sm">Memuat pengumuman...</div>}>
      <AnnouncementDetailContent />
    </Suspense>
  )
}
