'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Settings = {
  school_name: string; school_address: string; teacher_name: string; teacher_nip: string
  principal_name: string; principal_nip: string; issue_place: string; kkm: number
}
type Signatory = {
  id: string; full_name: string; position: 'class_teacher' | 'principal'
  class_code: string | null; nip: string; is_active: boolean
}
const defaults: Settings = {
  school_name: 'SD NEGERI GETASAN',
  school_address: 'Jl. P. Diponegoro Km 6, Desa Getasan, Kab. Semarang',
  teacher_name: '', teacher_nip: '', principal_name: '', principal_nip: '',
  issue_place: 'Getasan', kkm: 70,
}
const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900'
export default function DocumentSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [signatories, setSignatories] = useState<Signatory[]>([])
  const [classes, setClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState({ full_name: '', position: 'class_teacher' as Signatory['position'], class_code: '', nip: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const db = useMemo(() => createClient(), [])

  const load = async () => {
    setLoading(true)
    setError('')
    const [settingsResult, peopleResult, classResult] = await Promise.all([
      db.rpc('get_school_document_settings'),
      db.from('teacher_signatories').select('*').order('position').order('class_code').order('full_name'),
      db.from('profiles').select('class_code').eq('role', 'student').not('class_code', 'is', null),
    ])
    if (settingsResult.data) setSettings({ ...defaults, ...settingsResult.data })
    else if (settingsResult.error) setError('Pengaturan sekolah belum tersedia. Pastikan migration pengaturan dokumen sudah diterapkan di database pengembangan.')
    if (peopleResult.error) setError(old => old ? old + ' Daftar penandatangan belum tersedia; migration daftar guru perlu diterapkan.' : 'Daftar penandatangan belum tersedia; migration daftar guru perlu diterapkan.')
    else setSignatories((peopleResult.data || []) as Signatory[])
    setClasses([...new Set((classResult.data || []).map((x: any) => String(x.class_code || '').trim()).filter(Boolean))].sort())
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const resetForm = () => { setEditingId(''); setForm({ full_name: '', position: 'class_teacher', class_code: '', nip: '' }) }
  const saveSignatory = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(''); setMessage('')
    const payload = { full_name: form.full_name.trim(), position: form.position, class_code: form.position === 'class_teacher' ? form.class_code : null, nip: form.nip.trim(), is_active: true }
    const result = editingId
      ? await db.from('teacher_signatories').update(payload).eq('id', editingId)
      : await db.from('teacher_signatories').insert(payload)
    if (result.error) setError(result.error.message)
    else { setMessage('Data penandatangan berhasil disimpan.'); resetForm(); await load() }
    setSaving(false)
  }
  const editSignatory = (item: Signatory) => {
    setEditingId(item.id)
    setForm({ full_name: item.full_name, position: item.position, class_code: item.class_code || '', nip: item.nip || '' })
  }
  const deleteSignatory = async (item: Signatory) => {
    if (!confirm('Hapus data penandatangan ' + item.full_name + '?')) return
    const result = await db.from('teacher_signatories').delete().eq('id', item.id)
    if (result.error) setError(result.error.message)
    else { setMessage('Data penandatangan dihapus.'); await load() }
  }
  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    const result = await db.rpc('save_school_document_settings', { p_settings: settings })
    if (result.error) setError(result.error.message)
    else setMessage('Identitas sekolah berhasil disimpan.')
    setSaving(false)
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8"><div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Administrasi Sekolah</p><h1 className="mt-1 text-3xl font-black text-slate-900">Pengelolaan Dokumen</h1><p className="mt-1 text-sm text-slate-500">Identitas sekolah dan arsip guru/kepala sekolah untuk penandatangan raport serta sertifikat.</p></div><Link href="/admin" className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">← Dashboard</Link></header>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-slate-900">Daftar Guru & Kepala Sekolah</h2><p className="mt-1 text-xs text-slate-500">Simpan daftar nama dan NIP satu kali. Siswa akan melihat guru sesuai kelasnya dan kepala sekolah saat mencetak sertifikat.</p>
      <form onSubmit={saveSignatory} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Nama lengkap<input required value={form.full_name} onChange={e=>setForm(v=>({...v,full_name:e.target.value}))} placeholder="Nama dan gelar" className={fieldClass}/></label>
        <label className="text-xs font-semibold text-slate-600">Jabatan<select value={form.position} onChange={e=>setForm(v=>({...v,position:e.target.value as Signatory['position'],class_code:''}))} className={fieldClass}><option value="class_teacher">Mengampu di Kelas</option><option value="principal">Kepala Sekolah</option></select></label>
        {form.position === 'class_teacher' && <label className="text-xs font-semibold text-slate-600">Kode kelas<select required value={form.class_code} onChange={e=>setForm(v=>({...v,class_code:e.target.value}))} className={fieldClass}><option value="">Pilih kelas</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}
        <label className="text-xs font-semibold text-slate-600">NIP<input value={form.nip} onChange={e=>setForm(v=>({...v,nip:e.target.value}))} placeholder="Masukkan NIP" className={fieldClass}/></label>
        <div className="flex items-end gap-2 sm:col-span-2"><button disabled={saving || loading} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">{saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Penandatangan'}</button>{editingId && <button type="button" onClick={resetForm} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700">Batal</button>}</div>
      </form>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-3">Nama</th><th className="p-3">Jabatan</th><th className="p-3">Kelas</th><th className="p-3">NIP</th><th className="p-3">Aksi</th></tr></thead><tbody>{signatories.map(item=><tr key={item.id} className="border-b border-slate-100"><td className="p-3 font-bold text-slate-800">{item.full_name}</td><td className="p-3">{item.position==='principal'?'Kepala Sekolah':'Mengampu di Kelas'}</td><td className="p-3">{item.class_code || '—'}</td><td className="p-3">{item.nip || '—'}</td><td className="p-3"><div className="flex gap-2"><button onClick={()=>editSignatory(item)} className="font-bold text-indigo-600">Edit</button><button onClick={()=>deleteSignatory(item)} className="font-bold text-rose-600">Hapus</button></div></td></tr>)}{!signatories.length && <tr><td colSpan={5} className="p-6 text-center text-slate-400">{loading?'Memuat daftar...':'Belum ada data guru/kepala sekolah.'}</td></tr>}</tbody></table></div>
    </section>
    <form onSubmit={saveSettings} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><section><h2 className="font-black text-slate-900">Identitas Sekolah</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Nama sekolah<input required value={settings.school_name} onChange={e=>setSettings(v=>({...v,school_name:e.target.value}))} className={fieldClass}/></label><label className="text-xs font-semibold text-slate-600">Alamat sekolah<input value={settings.school_address} onChange={e=>setSettings(v=>({...v,school_address:e.target.value}))} className={fieldClass}/></label><label className="text-xs font-semibold text-slate-600">Tempat terbit<input value={settings.issue_place} onChange={e=>setSettings(v=>({...v,issue_place:e.target.value}))} className={fieldClass}/></label><label className="text-xs font-semibold text-slate-600">KKM<input type="number" min="0" max="100" value={settings.kkm} onChange={e=>setSettings(v=>({...v,kkm:Number(e.target.value)}))} className={fieldClass}/></label></div></section><div className="flex justify-end border-t pt-4"><button disabled={saving || loading} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">{saving?'Menyimpan...':'Simpan Identitas Sekolah'}</button></div></form>
  </div></main>
}
