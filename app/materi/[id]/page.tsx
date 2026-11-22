'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import { createClient } from '@/lib/supabase/client'

type Material = {
  id: string
  title: string
  description: string | null
  subject: string | null
  content_html: string | null
  file_url: string | null
  author_display_name: string | null
  created_at: string
}

function PublishedMaterialContent() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error: queryError } = await createClient()
        .from('study_materials')
        .select('id,title,description,subject,content_html,file_url,author_display_name,created_at')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()
      if (!active) return
      if (queryError || !data) setError('Materi tidak ditemukan atau belum diterbitkan.')
      else setMaterial(data as Material)
      setLoading(false)
    }
    if (id) void load()
    return () => { active = false }
  }, [id])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-9">
        <Link href="/materi" className="text-sm font-bold text-indigo-700 underline underline-offset-4">← Kembali ke Pusat Sumber Belajar</Link>
        {loading ? (
          <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">Memuat materi...</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-800">{error}</div>
        ) : material ? (
          <article className="overflow-hidden rounded-3xl border-2 border-slate-900 bg-white shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]">
            <header className="border-b-2 border-slate-900 bg-gradient-to-r from-amber-200 via-orange-100 to-yellow-100 p-5 sm:p-8">
              <span className="inline-flex rounded-full border-2 border-slate-900 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-wide">{material.subject || 'Materi belajar'}</span>
              <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{material.title}</h1>
              {material.description && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">{material.description}</p>}
              <p className="mt-4 text-xs font-semibold text-slate-600">✍️ {material.author_display_name || 'Tim Penyusun'}</p>
            </header>
            <div className="p-5 sm:p-8">
              {material.content_html ? (
                <MathRenderer content={material.content_html} className="material-content max-w-none text-sm leading-8 text-slate-800 sm:text-base" />
              ) : material.file_url ? (
                <a href={material.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-900">Buka berkas materi ↗</a>
              ) : <p className="text-sm text-slate-500">Isi materi belum tersedia.</p>}
            </div>
          </article>
        ) : null}
      </main>
    </div>
  )
}

export default function PublishedMaterialPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 p-10 text-center text-sm text-slate-500">Memuat materi...</div>}>
      <PublishedMaterialContent />
    </Suspense>
  )
}
