'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/client'

type Announcement = { id: string; title: string; content: string; category: string; is_active: boolean; created_at: string }
type Material = { id: string; title: string; file_url: string; description: string; subject: string; author_display_name?: string | null; created_at: string }

export default function AdminKontenPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [tab, setTab] = useState<'announcement' | 'material'>('announcement')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [annId, setAnnId] = useState('')
  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  const [annCategory, setAnnCategory] = useState('Penting')
  const [matId, setMatId] = useState('')
  const [matTitle, setMatTitle] = useState('')
  const [matUrl, setMatUrl] = useState('')
  const [matDesc, setMatDesc] = useState('')
  const [matSubject, setMatSubject] = useState('Umum')
  const [matAuthor, setMatAuthor] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    const db = createClient()
    const [a, m] = await Promise.all([
      db.from('announcements').select('*').order('created_at', { ascending: false }),
      db.from('study_materials').select('*').order('created_at', { ascending: false }),
    ])
    if (a.error) setError('Pengumuman: ' + a.error.message)
    else setAnnouncements((a.data || []) as Announcement[])
    if (m.error) setError(old => old ? old + ' | Materi: ' + m.error.message : 'Materi: ' + m.error.message)
    else setMaterials((m.data || []) as Material[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const resetAnn = () => { setAnnId(''); setAnnTitle(''); setAnnContent(''); setAnnCategory('Penting') }
  const resetMat = () => { setMatId(''); setMatTitle(''); setMatUrl(''); setMatDesc(''); setMatSubject('Umum'); setMatAuthor('') }

  const saveAnn = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    const db = createClient()
    const payload = { title: annTitle.trim(), content: annContent.trim(), category: annCategory, is_active: true }
    const result = annId ? await db.from('announcements').update(payload).eq('id', annId) : await db.from('announcements').insert(payload)
    if (result.error) setError(result.error.message)
    else { resetAnn(); await load() }
    setSaving(false)
  }
  const saveMat = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    const db = createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) { setError('Sesi login tidak ditemukan. Silakan login kembali.'); setSaving(false); return }
    const payload = { title: matTitle.trim(), file_url: matUrl.trim(), description: matDesc.trim(), subject: matSubject, author_display_name: matAuthor.trim() || null }
    const result = matId ? await db.from('study_materials').update(payload).eq('id', matId) : await db.from('study_materials').insert({ ...payload, created_by: user.id })
    if (result.error) setError(result.error.message)
    else { resetMat(); await load() }
    setSaving(false)
  }
  const deleteAnn = async (id: string) => { if (!confirm('Hapus pengumuman ini?')) return; const r = await createClient().from('announcements').delete().eq('id', id); if (r.error) setError(r.error.message); else await load() }
  const deleteMat = async (id: string) => { if (!confirm('Hapus materi ini?')) return; const r = await createClient().from('study_materials').delete().eq('id', id); if (r.error) setError(r.error.message); else await load() }

  const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800'
  return <div className="min-h-screen bg-slate-50"><Navbar /><main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Admin Center</p><h1 className="text-3xl font-black text-slate-900">Pengelolaan Konten</h1><p className="text-sm text-slate-500">Kelola pengumuman dan materi belajar secara terpisah dari bank soal.</p></div><Link href="/admin" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">← Dashboard Admin</Link></header>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="flex flex-wrap gap-2"><button onClick={()=>setTab('announcement')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab==='announcement'?'bg-indigo-600 text-white':'bg-white text-slate-700 border'}`}>📢 Pengumuman ({announcements.length})</button><button onClick={()=>setTab('material')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab==='material'?'bg-indigo-600 text-white':'bg-white text-slate-700 border'}`}>📚 Materi Belajar ({materials.length})</button></div>
    {tab==='announcement' ? <section className="grid gap-5 lg:grid-cols-[360px_1fr]"><form onSubmit={saveAnn} className="h-fit space-y-3 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">{annId?'Edit Pengumuman':'Tambah Pengumuman'}</h2><label className="block text-xs font-semibold text-slate-600">Judul<input required value={annTitle} onChange={e=>setAnnTitle(e.target.value)} className={field}/></label><label className="block text-xs font-semibold text-slate-600">Kategori<select value={annCategory} onChange={e=>setAnnCategory(e.target.value)} className={field}><option>Penting</option><option>Informasi</option><option>Jadwal</option><option>Prestasi</option></select></label><label className="block text-xs font-semibold text-slate-600">Isi pengumuman<textarea required rows={8} value={annContent} onChange={e=>setAnnContent(e.target.value)} className={field}/></label><div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white">{saving?'Menyimpan...':'Simpan Pengumuman'}</button>{annId&&<button type="button" onClick={resetAnn} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold">Batal</button>}</div></form><div className="space-y-3">{announcements.map(a=><article key={a.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><div><span className="text-[10px] font-bold uppercase text-indigo-600">{a.category}</span><h3 className="font-black text-slate-900">{a.title}</h3></div><div className="flex gap-2"><button onClick={()=>{setAnnId(a.id);setAnnTitle(a.title);setAnnContent(a.content);setAnnCategory(a.category||'Penting')}} className="text-xs font-bold text-indigo-600">Edit</button><button onClick={()=>deleteAnn(a.id)} className="text-xs font-bold text-rose-600">Hapus</button></div></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.content}</p></article>)}{!loading&&!announcements.length&&<p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400">Belum ada pengumuman.</p>}</div></section> : <section className="grid gap-5 lg:grid-cols-[360px_1fr]"><form onSubmit={saveMat} className="h-fit space-y-3 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">{matId?'Edit Materi':'Tambah Materi'}</h2><label className="block text-xs font-semibold text-slate-600">Judul<input required value={matTitle} onChange={e=>setMatTitle(e.target.value)} className={field}/></label><label className="block text-xs font-semibold text-slate-600">Mata pelajaran<input value={matSubject} onChange={e=>setMatSubject(e.target.value)} className={field}/></label><label className="block text-xs font-semibold text-slate-600">URL file<input required type="url" value={matUrl} onChange={e=>setMatUrl(e.target.value)} className={field}/></label><label className="block text-xs font-semibold text-slate-600">Deskripsi<textarea rows={4} value={matDesc} onChange={e=>setMatDesc(e.target.value)} className={field}/></label><label className="block text-xs font-semibold text-slate-600">Nama penulis<input value={matAuthor} onChange={e=>setMatAuthor(e.target.value)} className={field}/></label><div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white">{saving?'Menyimpan...':'Simpan Materi'}</button>{matId&&<button type="button" onClick={resetMat} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold">Batal</button>}</div></form><div className="space-y-3">{materials.map(m=><article key={m.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><div><span className="text-[10px] font-bold uppercase text-emerald-600">{m.subject}</span><h3 className="font-black text-slate-900">{m.title}</h3><p className="mt-1 text-xs text-slate-500">{m.description}</p><a href={m.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-indigo-600 underline">Buka file materi</a></div><div className="flex gap-2"><button onClick={()=>{setMatId(m.id);setMatTitle(m.title);setMatUrl(m.file_url);setMatDesc(m.description||'');setMatSubject(m.subject||'Umum');setMatAuthor(m.author_display_name||'')}} className="text-xs font-bold text-indigo-600">Edit</button><button onClick={()=>deleteMat(m.id)} className="text-xs font-bold text-rose-600">Hapus</button></div></div></article>)}{!loading&&!materials.length&&<p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400">Belum ada materi.</p>}</div></section>}
  </main></div>
}
