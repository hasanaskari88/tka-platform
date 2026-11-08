'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Settings = {
  school_name: string
  school_address: string
  teacher_name: string
  teacher_nip: string
  principal_name: string
  principal_nip: string
  issue_place: string
  kkm: number
}

const defaults: Settings = {
  school_name: 'SD NEGERI GETASAN',
  school_address: 'Jl. P. Diponegoro Km 6, Desa Getasan, Kab. Semarang',
  teacher_name: '',
  teacher_nip: '',
  principal_name: 'GIYANTO, S.Pd.',
  principal_nip: '19670715 199903 1 006',
  issue_place: 'Getasan',
  kkm: 70,
}

export default function DocumentSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const db = createClient()
      const { data, error: loadError } = await db.rpc('get_school_document_settings')
      if (!active) return
      if (loadError) {
        setError('Pengaturan terpusat belum tersedia di database. Migration school_document_settings perlu diuji dan diterapkan pada lingkungan pengembangan terlebih dahulu.')
      } else if (data) {
        setSettings({ ...defaults, ...data })
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const update = (key: keyof Settings, value: string | number) => setSettings(old => ({ ...old, [key]: value }))

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    const db = createClient()
    const { error: saveError } = await db.rpc('save_school_document_settings', { p_settings: settings })
    if (saveError) setError(saveError.message)
    else setMessage('Pengaturan dokumen berhasil disimpan dan akan digunakan sebagai nilai bawaan raport/sertifikat.')
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Administrasi Sekolah</p><h1 className="mt-1 text-3xl font-black text-slate-900">Pengaturan Dokumen</h1><p className="mt-1 text-sm text-slate-500">Identitas sekolah dan penandatangan yang digunakan pada raport serta sertifikat.</p></div>
          <Link href="/admin" className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">← Dashboard</Link>
        </header>

        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

        <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <section><h2 className="font-black text-slate-900">Identitas Sekolah</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Nama sekolah<input required value={settings.school_name} onChange={e => update('school_name', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
            <label className="text-xs font-semibold text-slate-600">Alamat sekolah<input value={settings.school_address} onChange={e => update('school_address', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
          </div></section>

          <section className="border-t border-slate-100 pt-4"><h2 className="font-black text-slate-900">Guru / Admin Penandatangan</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Nama guru / admin<input value={settings.teacher_name} onChange={e => update('teacher_name', e.target.value)} placeholder="Nama lengkap" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
            <label className="text-xs font-semibold text-slate-600">NIP guru / admin<input value={settings.teacher_nip} onChange={e => update('teacher_nip', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
          </div></section>

          <section className="border-t border-slate-100 pt-4"><h2 className="font-black text-slate-900">Kepala Sekolah</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Nama kepala sekolah<input value={settings.principal_name} onChange={e => update('principal_name', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
            <label className="text-xs font-semibold text-slate-600">NIP kepala sekolah<input value={settings.principal_nip} onChange={e => update('principal_nip', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
          </div></section>

          <section className="border-t border-slate-100 pt-4"><h2 className="font-black text-slate-900">Pengaturan Umum Dokumen</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Tempat terbit<input value={settings.issue_place} onChange={e => update('issue_place', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
            <label className="text-xs font-semibold text-slate-600">KKM / batas ketuntasan<input type="number" min="0" max="100" value={settings.kkm} onChange={e => update('kkm', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
          </div></section>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-slate-500">Pengaturan ini akan menjadi nilai bawaan untuk dokumen yang dibuat oleh admin.</p><button type="submit" disabled={loading || saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</button></div>
        </form>
      </div>
    </main>
  )
}
