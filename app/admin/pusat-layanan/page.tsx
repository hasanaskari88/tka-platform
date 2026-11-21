'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, Cloud, Copy, Database, Image as ImageIcon, Loader2, RefreshCw, Save, Sparkles, Trash2, XCircle } from 'lucide-react'

type ProviderConfig = { provider_order: string[]; providers: Record<string, { enabled?: boolean }> }
type Asset = {
  id: string
  original_name: string
  mime_type: string
  file_size_bytes: number
  provider: string
  public_url: string | null
  status: string
  created_at: string
  usage: { questionCount: number; materialCount: number; total: number } | null
}
type AIUsage = { summary: { calls: number; failures: number; tokens: number; providers: Record<string, { calls: number; failures: number; tokens: number }> }; logs: Array<{ request_id: string; task: string; provider: string; model: string | null; status: string; total_tokens: number | null; latency_ms: number | null; error_message: string | null; created_at: string }> }
type SettingsPayload = {
  storage_config: ProviderConfig
  ai_config: ProviderConfig
  availability: Record<string, boolean>
  google_drive: { connected: boolean; connected_at: string | null }
}
const STORAGE = [
  { id: 'imagekit', name: 'ImageKit', note: 'CDN gambar utama', icon: ImageIcon },
  { id: 'google_drive', name: 'Google Drive', note: 'Penyimpanan cadangan', icon: Cloud },
  { id: 'supabase', name: 'Supabase Storage', note: 'Penyimpanan cadangan terakhir', icon: Database },
]
const AI = [
  { id: 'groq', name: 'Groq', note: 'Penyedia AI teks utama' },
  { id: 'gemini_primary', name: 'Gemini akun utama', note: 'Cadangan pertama' },
  { id: 'gemini_secondary', name: 'Gemini akun kedua', note: 'Cadangan berikutnya' },
]
function formatBytes(value: number) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3)
  return (value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1) + ' ' + units[index]
}
function moveItem(config: ProviderConfig, id: string, direction: -1 | 1): ProviderConfig {
  const order = [...config.provider_order]
  const index = order.indexOf(id)
  const next = index + direction
  if (index < 0 || next < 0 || next >= order.length) return config
  ;[order[index], order[next]] = [order[next], order[index]]
  return { ...config, provider_order: order }
}

export default function ServiceCenterPage() {
  const [tab, setTab] = useState<'settings' | 'gallery' | 'usage'>('settings')
  const [settings, setSettings] = useState<SettingsPayload | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [galleryPage, setGalleryPage] = useState(1)
  const [galleryTotalPages, setGalleryTotalPages] = useState(1)
  const [galleryTotal, setGalleryTotal] = useState(0)
  const [summary, setSummary] = useState({ count: 0, bytes: 0 })
  const [aiUsage, setAiUsage] = useState<AIUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadSettings = useCallback(async () => {
    const response = await fetch('/api/admin/service-settings', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Gagal membaca pengaturan.')
    setSettings(data)
  }, [])

  const loadGallery = useCallback(async (requestedPage: number) => {
    setGalleryLoading(true)
    try {
      const response = await fetch('/api/admin/media?page=' + requestedPage + '&pageSize=18', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal memuat galeri.')
      setAssets(data.assets || [])
      setSelectedAssetIds([])
      setGalleryPage(data.page || requestedPage)
      setGalleryTotalPages(data.totalPages || 1)
      setGalleryTotal(data.total || 0)
      setSummary(data.summary || { count: 0, bytes: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat galeri.')
    } finally {
      setGalleryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings().catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat pengaturan.'))
      .finally(() => setLoading(false))
  }, [loadSettings])

  useEffect(() => {
    if (tab === 'gallery') void loadGallery(galleryPage)
    if (tab === 'usage') {
      fetch('/api/admin/ai-usage', { cache: 'no-store' })
        .then(async (response) => {
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Gagal memuat statistik AI.')
          setAiUsage(data)
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat statistik AI.'))
    }
  }, [tab, galleryPage, loadGallery])

  async function saveSettings() {
    if (!settings) return
    setSaving(true); setMessage(''); setError('')
    try {
      const response = await fetch('/api/admin/service-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_config: settings.storage_config, ai_config: settings.ai_config }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Pengaturan gagal disimpan.')
      setMessage('Pengaturan berhasil disimpan.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan.')
    } finally {
      setSaving(false)
    }
  }

  async function syncMedia() {
    setSyncing(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/media/sync', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Inventarisasi gagal.')
      setMessage('Inventarisasi selesai: ' + data.discovered + ' file ditemukan, ' + data.imported + ' file baru dicatat.' + (data.errors?.length ? ' Ada penyedia yang gagal dibaca: ' + data.errors.map((item: { provider: string }) => item.provider).join(', ') + '.' : ''))
      await loadGallery(galleryPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inventarisasi media gagal.')
    } finally {
      setSyncing(false)
    }
  }

  async function deleteAsset(asset: Asset) {
    if (asset.usage?.total) {
      setError('Gambar masih digunakan oleh soal atau materi, sehingga tidak dapat dihapus.')
      return
    }
    if (!window.confirm('Hapus gambar "' + asset.original_name + '" secara permanen?')) return
    setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: asset.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gambar gagal dihapus.')
      setMessage('Gambar berhasil dihapus.')
      await loadGallery(galleryPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus gambar.')
    }
  }

  function toggleAssetSelection(id: string, checked: boolean) {
    setSelectedAssetIds((current) => checked
      ? (current.includes(id) ? current : [...current, id])
      : current.filter((item) => item !== id))
  }

  function selectAllUnusedAssets() {
    const eligibleIds = assets.filter((asset) => asset.usage?.total === 0).map((asset) => asset.id)
    setSelectedAssetIds(eligibleIds)
  }

  async function deleteSelectedAssets() {
    if (!selectedAssetIds.length || bulkDeleting) return
    const selectedCount = selectedAssetIds.length
    if (!window.confirm('Hapus ' + selectedCount + ' gambar terpilih secara permanen? Gambar yang ternyata masih digunakan akan dilewati.')) return
    setBulkDeleting(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedAssetIds }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Penghapusan gambar gagal.')
      setMessage(data.message || (data.deleted + ' gambar berhasil dihapus.'))
      setSelectedAssetIds([])
      await loadGallery(galleryPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus gambar terpilih.')
    } finally {
      setBulkDeleting(false)
    }
  }

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('googleDrive')
    if (!status) return
    const messages: Record<string, string> = {
      connected: 'Google Drive berhasil dihubungkan.',
      invalid_state: 'Proses koneksi Google Drive tidak valid atau kedaluwarsa. Silakan hubungkan ulang.',
      cancelled: 'Proses koneksi Google Drive dibatalkan.',
      unauthorized: 'Sesi login berakhir. Silakan login kembali.',
      forbidden: 'Akun ini tidak memiliki akses admin.',
      missing_code: 'Google tidak mengirim kode otorisasi. Silakan coba lagi.',
      error: 'Koneksi Google Drive gagal. Periksa konfigurasi OAuth Production di Vercel.',
    }
    if (messages[status]) setMessage(messages[status])
  }, [])

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} /> Memuat pusat pengaturan...</div>

  const reorder = (kind: 'storage_config' | 'ai_config', id: string, direction: -1 | 1) => {
    setSettings((current) => current ? { ...current, [kind]: moveItem(current[kind], id, direction) } : current)
  }
  const toggle = (kind: 'storage_config' | 'ai_config', id: string, enabled: boolean) => {
    setSettings((current) => current ? {
      ...current,
      [kind]: { ...current[kind], providers: { ...current[kind].providers, [id]: { ...current[kind].providers[id], enabled } } },
    } : current)
  }
  const renderProviders = (kind: 'storage_config' | 'ai_config', list: typeof STORAGE | typeof AI) => {
    const config = settings?.[kind]
    if (!config) return null
    return <div className="space-y-2">
      {config.provider_order.map((id, index) => {
        const item = list.find((entry) => entry.id === id)
        if (!item) return null
        const available = settings?.availability[id]
        const Icon = id === 'imagekit' ? ImageIcon : id === 'google_drive' ? Cloud : id === 'supabase' ? Database : Sparkles
        return <div key={id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">{item.note}</p>
            <p className={`mt-1 text-[11px] font-semibold ${available ? 'text-emerald-700' : 'text-amber-700'}`}>{available ? 'Konfigurasi server tersedia' : 'Env / kredensial belum lengkap'}</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={config.providers[id]?.enabled !== false} onChange={(e) => toggle(kind, id, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            Aktif
          </label>
          <div className="flex gap-1">
            <button type="button" title="Naikkan prioritas" disabled={index === 0} onClick={() => reorder(kind, id, -1)} className="rounded-lg border p-2 text-slate-600 disabled:opacity-30"><ArrowUp size={15} /></button>
            <button type="button" title="Turunkan prioritas" disabled={index === config.provider_order.length - 1} onClick={() => reorder(kind, id, 1)} className="rounded-lg border p-2 text-slate-600 disabled:opacity-30"><ArrowDown size={15} /></button>
          </div>
          <span className="w-16 text-right text-[11px] font-bold text-slate-400">Prioritas {index + 1}</span>
        </div>
      })}
    </div>
  }

  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Pusat pengelolaan</p>
      <h1 className="mt-1 text-2xl font-black text-slate-900">Layanan AI & Media</h1>
      <p className="mt-1 text-sm text-slate-500">Atur urutan penyedia layanan, pantau penggunaan, dan kelola gambar platform.</p>
    </div>
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {([['settings','Pengaturan penyedia'],['gallery','Galeri media'],['usage','Ringkasan penggunaan']] as const).map(([id,label]) =>
        <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{label}</button>
      )}
    </div>
    {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17} />{message}</div>}
    {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><XCircle size={17} />{error}<button className="ml-auto text-xs font-bold" onClick={() => setError('')}>Tutup</button></div>}

    {tab === 'settings' && settings && <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="mb-1 text-base font-black text-slate-900">Penyimpanan gambar</h2>
        <p className="mb-4 text-sm text-slate-500">Urutan ini menentukan penyedia yang dicoba lebih dahulu. Kredensial tetap disimpan di environment server, bukan di database.</p>
        {renderProviders('storage_config', STORAGE)}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="mb-1 text-base font-black text-slate-900">Koneksi Google Drive</h2>
            <p className="text-sm text-slate-500">Hubungkan akun Google untuk penyimpanan cadangan dan inventarisasi media. Izin OAuth dikelola melalui akun Google.</p>
            <p className={`mt-2 text-xs font-bold ${settings.google_drive?.connected ? 'text-emerald-700' : 'text-amber-700'}`}>
              {settings.google_drive?.connected ? 'Terhubung' : 'Belum terhubung'}
              {settings.google_drive?.connected_at ? ' · ' + new Date(settings.google_drive.connected_at).toLocaleString('id-ID') : ''}
            </p>
          </div>
          <a href="/api/google-drive/connect" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
            <Cloud size={16} /> {settings.google_drive?.connected ? 'Hubungkan ulang' : 'Hubungkan Google Drive'}
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-500">Token akses disimpan terenkripsi di server dan tidak ditampilkan di halaman ini.</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="mb-1 text-base font-black text-slate-900">Penyedia AI teks</h2>
        <p className="mb-4 text-sm text-slate-500">Jika satu penyedia gagal atau kuotanya habis, sistem dapat mencoba penyedia berikutnya yang aktif.</p>
        {renderProviders('ai_config', AI)}
      </section>
      <div className="flex justify-end"><button onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />} Simpan pengaturan</button></div>
    </div>}

    {tab === 'gallery' && <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">File tercatat</p><p className="mt-1 text-2xl font-black text-slate-900">{summary.count}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Total ukuran file</p><p className="mt-1 text-2xl font-black text-slate-900">{formatBytes(summary.bytes)}</p></div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4"><div><p className="text-xs font-semibold text-slate-500">Penyegaran data</p><p className="mt-1 text-sm font-bold text-slate-800">Inventarisasi penyimpanan</p></div><div className="flex gap-2"><button onClick={() => void loadGallery(galleryPage)} className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50" title="Muat ulang"><RefreshCw size={17} /></button><button onClick={() => void syncMedia()} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{syncing ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />} {syncing ? 'Memindai...' : 'Pindai file lama'}</button></div></div>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">Galeri menampilkan file yang tercatat di layanan media. Gunakan Pindai file lama untuk memasukkan file yang sudah ada di folder ImageKit TKA Platform, folder aplikasi Google Drive, dan bucket question-images. Penghapusan ditolak bila gambar masih ditemukan pada soal atau materi.</p>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Menampilkan {assets.length ? ((galleryPage - 1) * 18 + 1) : 0}–{Math.min(galleryPage * 18, galleryTotal)} dari {galleryTotal} gambar · Halaman {galleryPage} dari {galleryTotalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setGalleryPage((current) => Math.max(1, current - 1))} disabled={galleryPage <= 1 || galleryLoading} className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40">Sebelumnya</button>
            <button type="button" onClick={() => setGalleryPage((current) => Math.min(galleryTotalPages, current + 1))} disabled={galleryPage >= galleryTotalPages || galleryLoading} className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40">Berikutnya</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={selectAllUnusedAssets} disabled={galleryLoading || !assets.some((asset) => asset.usage?.total === 0)} className="text-xs font-bold text-indigo-700 hover:underline disabled:opacity-40">Pilih semua yang belum digunakan</button>
            <button type="button" onClick={() => setSelectedAssetIds([])} disabled={!selectedAssetIds.length} className="text-xs font-semibold text-slate-500 hover:underline disabled:opacity-40">Batal pilih</button>
            <span className="text-xs text-slate-500">{selectedAssetIds.length} gambar dipilih</span>
          </div>
          <button type="button" onClick={() => void deleteSelectedAssets()} disabled={!selectedAssetIds.length || bulkDeleting || galleryLoading} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40">
            {bulkDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            {bulkDeleting ? 'Menghapus...' : 'Hapus yang dipilih'}
          </button>
        </div>
      </div>
      {galleryLoading ? <div className="flex justify-center py-12 text-slate-500"><Loader2 className="animate-spin" /></div> : assets.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><ImageIcon className="mx-auto text-slate-300" size={36} /><p className="mt-3 font-bold text-slate-700">Belum ada media tercatat</p><p className="mt-1 text-sm text-slate-500">Gambar baru akan muncul di sini setelah melalui layanan unggah terpusat.</p></div> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => <article key={asset.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="relative flex h-44 items-center justify-center bg-slate-100">
              {asset.public_url ? <img src={asset.public_url} alt={asset.original_name} className="h-full w-full object-contain" /> : <ImageIcon className="text-slate-300" size={36} />}
              <label className="absolute left-2 top-2 flex cursor-pointer items-center gap-2 rounded-lg border border-white/70 bg-white/95 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                <input type="checkbox" checked={selectedAssetIds.includes(asset.id)} disabled={(asset.usage?.total ?? 1) > 0 || bulkDeleting} onChange={(event) => toggleAssetSelection(asset.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Pilih
              </label>
              {asset.usage?.total ? <span className="absolute right-2 top-2 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Sedang digunakan</span> : null}
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate text-sm font-bold text-slate-800" title={asset.original_name}>{asset.original_name}</p>
              <p className="text-xs text-slate-500">{asset.provider} · {formatBytes(Number(asset.file_size_bytes))}</p>
              {asset.usage && <p className={`text-xs font-semibold ${asset.usage.total ? 'text-amber-700' : 'text-emerald-700'}`}>{asset.usage.questionCount} soal · {asset.usage.materialCount} materi {asset.usage.total ? '— sedang digunakan' : '— belum terpakai'}</p>}
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                {asset.public_url ? <div className="flex items-center gap-3"><a href={asset.public_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-700 hover:underline">Buka gambar</a><button type="button" onClick={() => { void navigator.clipboard.writeText(asset.public_url!).then(() => setMessage('URL gambar berhasil disalin.')).catch(() => setError('Gagal menyalin URL gambar.')) }} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-700"><Copy size={12} /> Salin URL</button></div> : <span className="text-xs text-slate-400">URL tidak tersedia</span>}
                <button onClick={() => void deleteAsset(asset)} disabled={(asset.usage?.total || 0) > 0} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={13} /> Hapus</button>
              </div>
            </div>
          </article>)}
        </div>}
    </section>}

    {tab === 'usage' && <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Permintaan berhasil · 30 hari</p><p className="mt-1 text-2xl font-black text-slate-900">{aiUsage?.summary.calls ?? '—'}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Percobaan gagal</p><p className="mt-1 text-2xl font-black text-slate-900">{aiUsage?.summary.failures ?? '—'}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Total token tercatat</p><p className="mt-1 text-2xl font-black text-slate-900">{(aiUsage?.summary.tokens ?? 0).toLocaleString('id-ID')}</p></div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-black text-slate-900">Penggunaan per penyedia</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Object.entries(aiUsage?.summary.providers || {}).map(([provider, value]) => <div key={provider} className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-slate-800">{provider}</p><p className="mt-1 text-xs text-slate-600">{value.calls} berhasil · {value.failures} gagal</p><p className="text-xs text-slate-500">{value.tokens.toLocaleString('id-ID')} token</p></div>)}
          {!aiUsage?.logs.length && <p className="text-sm text-slate-500">Belum ada catatan penggunaan pada 30 hari terakhir.</p>}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4"><h2 className="font-black text-slate-900">Aktivitas terbaru</h2><p className="text-xs text-slate-500">Maksimal 1.000 percobaan dalam 30 hari terakhir</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Waktu</th><th className="p-3">Tugas</th><th className="p-3">Penyedia / model</th><th className="p-3">Status</th><th className="p-3 text-right">Token</th><th className="p-3 text-right">Durasi</th></tr></thead><tbody>{aiUsage?.logs.map((log, index) => <tr key={log.request_id + index} className="border-t border-slate-100"><td className="whitespace-nowrap p-3">{new Date(log.created_at).toLocaleString('id-ID')}</td><td className="p-3">{log.task}</td><td className="p-3">{log.provider}<span className="block text-slate-400">{log.model || '—'}</span></td><td className="p-3"><span className={log.status === 'success' ? 'font-bold text-emerald-700' : log.status === 'failed' ? 'font-bold text-rose-700' : 'text-slate-500'}>{log.status}</span></td><td className="p-3 text-right">{log.total_tokens?.toLocaleString('id-ID') || '—'}</td><td className="p-3 text-right">{log.latency_ms ? log.latency_ms + ' ms' : '—'}</td></tr>)}</tbody></table></div>
      </div>
    </section>}
  </div>
}
