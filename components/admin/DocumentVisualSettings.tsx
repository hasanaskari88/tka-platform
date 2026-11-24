'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type DocumentKey = 'report' | 'certificate' | 'award'
export type VisualPreset = {
  leftLogo: string
  rightLogo: string
  theme: string
  pattern: string
  watermark: { enabled: boolean; opacity: number; size: number }
}
export type DocumentVisualSettings = {
  defaults: VisualPreset
  documents: Record<DocumentKey, { useGlobal: boolean; overrides: VisualPreset }>
}

const DEFAULT_PRESET: VisualPreset = {
  leftLogo: '/logo-sd-getasan.png',
  rightLogo: 'none',
  theme: 'candy',
  pattern: 'cartoon3d-dot',
  watermark: { enabled: true, opacity: 0.20, size: 60 },
}
const DEFAULT_SETTINGS: DocumentVisualSettings = {
  defaults: DEFAULT_PRESET,
  documents: {
    report: { useGlobal: true, overrides: DEFAULT_PRESET },
    certificate: { useGlobal: true, overrides: DEFAULT_PRESET },
    award: { useGlobal: true, overrides: DEFAULT_PRESET },
  },
}

export const documentLogoOptions = [
  { value: 'none', label: 'Tanpa logo' },
  { value: '/Logo-kab-smg.png', label: 'Logo Kabupaten Semarang' },
  { value: '/logo-sd-getasan.png', label: 'Logo SD Negeri Getasan' },
  { value: '/logo-sd-getasan2.png', label: 'Logo SD Getasan alternatif' },
  { value: '/logo-tka.png', label: 'Logo TKA' },
]

export const documentThemeOptions = [
  { id: 'candy', name: 'Candy Celebration', swatches: ['#f9a8d4', '#fde68a', '#93c5fd', '#c4b5fd'] },
  { id: 'rainbow', name: 'Rainbow Achievement', swatches: ['#fb7185', '#fbbf24', '#34d399', '#60a5fa'] },
  { id: 'sunny', name: 'Sunny Smile', swatches: ['#facc15', '#fb923c', '#7dd3fc', '#fed7aa'] },
  { id: 'mint', name: 'Mint & Peach', swatches: ['#6ee7b7', '#fdba9a', '#fef3c7', '#a7f3d0'] },
  { id: 'sky', name: 'Blue Sky Dream', swatches: ['#7dd3fc', '#5eead4', '#fb7185', '#fde68a'] },
]
export const documentPatternOptions = [
  { id: 'cartoon3d-dot', name: '3D Cartoon Dot' },
  { id: 'batik-kawung', name: 'Batik Kawung' },
  { id: 'batik-mega-mendung', name: 'Batik Mega Mendung' },
  { id: 'batik-parang', name: 'Batik Parang' },
  { id: 'modern-geometric', name: 'Modern Geometric' },
]

function normalizeSettings(value: any): DocumentVisualSettings {
  const defaults = { ...DEFAULT_PRESET, ...(value?.defaults || {}), watermark: { ...DEFAULT_PRESET.watermark, ...(value?.defaults?.watermark || {}) } }
  const documents = {} as DocumentVisualSettings['documents']
  for (const key of ['report', 'certificate', 'award'] as DocumentKey[]) {
    const saved = value?.documents?.[key] || {}
    const overrides = { ...defaults, ...(saved.overrides || {}), watermark: { ...defaults.watermark, ...(saved.overrides?.watermark || {}) } }
    documents[key] = { useGlobal: saved.useGlobal !== false, overrides }
  }
  return { defaults, documents }
}

export function useDocumentVisualSettings(documentKey: DocumentKey) {
  const [settings, setSettings] = useState<DocumentVisualSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const active = settings.documents[documentKey]
  const preset = active.useGlobal ? settings.defaults : active.overrides

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const db = createClient()
        const { data, error } = await db.rpc('get_school_document_visual_settings')
        if (error) throw error
        if (alive && data?.settings) setSettings(normalizeSettings(data.settings))
      } catch (error: any) {
        if (alive) setMessage(error?.message || 'Pengaturan tampilan belum dapat dimuat; menggunakan pengaturan bawaan.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  const updateDefaults = useCallback((patch: Partial<VisualPreset>) => {
    setSettings(old => ({ ...old, defaults: { ...old.defaults, ...patch, watermark: { ...old.defaults.watermark, ...(patch.watermark || {}) } } }))
  }, [])
  const updateActivePreset = useCallback((patch: Partial<VisualPreset>) => {
    setSettings(old => {
      const current = old.documents[documentKey]
      return {
        ...old,
        documents: {
          ...old.documents,
          [documentKey]: {
            ...current,
            overrides: { ...current.overrides, ...patch, watermark: { ...current.overrides.watermark, ...(patch.watermark || {}) } },
          },
        },
      }
    })
  }, [documentKey])
  const setUseGlobal = useCallback((useGlobal: boolean) => {
    setSettings(old => ({
      ...old,
      documents: {
        ...old.documents,
        [documentKey]: {
          ...old.documents[documentKey],
          useGlobal,
          overrides: useGlobal ? old.documents[documentKey].overrides : { ...old.defaults, watermark: { ...old.defaults.watermark } },
        },
      },
    }))
  }, [documentKey])
  const save = useCallback(async () => {
    setSaving(true)
    setMessage('')
    try {
      const db = createClient()
      const { error } = await db.rpc('save_school_document_visual_settings', { p_settings: settings })
      if (error) throw error
      setMessage('Pengaturan berhasil disimpan.')
    } catch (error: any) {
      setMessage(error?.message || 'Pengaturan gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }, [settings])

  return { settings, preset, loading, saving, message, updateDefaults, updateActivePreset, setUseGlobal, save, useGlobal: active.useGlobal }
}

function PresetFields({ value, onChange, title }: { value: VisualPreset; onChange: (patch: Partial<VisualPreset>) => void; title: string }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-sm font-black text-slate-800">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['leftLogo', 'rightLogo'] as const).map((key) => (
          <label key={key} className="text-xs font-bold text-slate-700">
            {key === 'leftLogo' ? 'Logo kop sebelah kiri' : 'Logo kop sebelah kanan'}
            <select value={value[key]} onChange={e => onChange({ [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
              {documentLogoOptions.map(logo => <option key={logo.value} value={logo.value}>{logo.label}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-bold text-slate-700">Tema warna</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {documentThemeOptions.map(theme => (
            <button key={theme.id} type="button" onClick={() => onChange({ theme: theme.id })} aria-pressed={value.theme === theme.id} className={`rounded-lg border-2 p-2 text-left ${value.theme === theme.id ? 'border-indigo-500 bg-white' : 'border-slate-200 bg-white/70'}`}>
              <span className="mb-1 flex h-4 overflow-hidden rounded">{theme.swatches.map((color, index) => <span key={index} className="flex-1" style={{ backgroundColor: color }} />)}</span>
              <span className="text-[10px] font-bold text-slate-700">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold text-slate-700">Motif latar</p>
        <div className="flex flex-wrap gap-2">
          {documentPatternOptions.map(pattern => (
            <button key={pattern.id} type="button" onClick={() => onChange({ pattern: pattern.id })} aria-pressed={value.pattern === pattern.id} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${value.pattern === pattern.id ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-600'}`}>{pattern.name}</button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <input type="checkbox" checked={value.watermark.enabled} onChange={e => onChange({ watermark: { ...value.watermark, enabled: e.target.checked } })} />
          Tampilkan watermark logo SD di tengah halaman
        </label>
        {value.watermark.enabled && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-600">Intensitas watermark: <b>{Math.round(value.watermark.opacity * 100)}%</b>
              <input type="range" min="12" max="32" step="2" value={Math.round(value.watermark.opacity * 100)} onChange={e => onChange({ watermark: { ...value.watermark, opacity: Number(e.target.value) / 100 } })} className="mt-2 w-full" />
              <span className="text-[10px] text-slate-400">Bawaan 20% · dapat dinaikkan sampai 32%</span>
            </label>
            <label className="text-xs text-slate-600">Ukuran watermark: <b>{value.watermark.size}%</b>
              <input type="range" min="45" max="75" step="5" value={value.watermark.size} onChange={e => onChange({ watermark: { ...value.watermark, size: Number(e.target.value) } })} className="mt-2 w-full" />
              <span className="text-[10px] text-slate-400">Persentase lebar area isi</span>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DocumentVisualSettingsPanel({
  documentKey, title, settings, preset, useGlobal, loading, saving, message,
  updateDefaults, updateActivePreset, setUseGlobal, save,
}: {
  title: string
  settings: DocumentVisualSettings
  preset: VisualPreset
  useGlobal: boolean
  loading: boolean
  saving: boolean
  message: string
  updateDefaults: (patch: Partial<VisualPreset>) => void
  updateActivePreset: (patch: Partial<VisualPreset>) => void
  setUseGlobal: (value: boolean) => void
  save: () => void
}) {
  const globalSummary = useMemo(() => documentThemeOptions.find(x => x.id === settings.defaults.theme)?.name || settings.defaults.theme, [settings.defaults.theme])
  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-black text-slate-900">🎨 Identitas visual dokumen</h2>
          <p className="mt-1 text-xs text-slate-500">Pengaturan umum dipakai bersama Raport, Sertifikat, dan Penghargaan. Setiap dokumen dapat dibuat berbeda.</p>
        </div>
        <button type="button" onClick={save} disabled={loading || saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
      </div>
      <div className="mt-3">
        <PresetFields value={settings.defaults} onChange={updateDefaults} title={`Pengaturan umum · ${globalSummary}`} />
      </div>
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <label className="flex items-start gap-2 text-sm font-bold text-amber-950">
          <input type="checkbox" checked={useGlobal} onChange={e => setUseGlobal(e.target.checked)} className="mt-1" />
          <span>Gunakan pengaturan umum untuk {title}<small className="mt-1 block font-normal text-amber-800">Jika dimatikan, dokumen ini mempunyai logo, tema, motif, dan watermark sendiri.</small></span>
        </label>
      </div>
      {!useGlobal && <div className="mt-3"><PresetFields value={preset} onChange={updateActivePreset} title={`Pengaturan khusus · ${title}`} /></div>}
      {loading && <p className="mt-2 text-xs text-slate-500">Memuat pengaturan tersimpan…</p>}
      {message && <p className={`mt-2 text-xs ${message.includes('berhasil') ? 'text-emerald-700' : 'text-amber-700'}`}>{message}</p>}
      <p className="mt-2 text-[10px] text-slate-400">Watermark memakai logo SD Negeri Getasan, terpisah dari pilihan logo kiri dan kanan kop.</p>
    </section>
  )
}
