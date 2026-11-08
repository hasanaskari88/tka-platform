
'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface ImageDialogProps {
  editor: Editor
  open: boolean
  onClose: () => void
}

interface DriveImage {
  id: string
  name: string
  mimeType: string
  size: string
  createdTime: string | null
  imageUrl: string
  webViewLink: string | null
}

type ImageAlignment = 'left' | 'center' | 'right'
type ImageSourceMode = 'upload' | 'library' | 'url'

export default function ImageDialog({
  editor,
  open,
  onClose,
}: ImageDialogProps) {
  const [mode, setMode] = useState<ImageSourceMode>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [src, setSrc] = useState('')
  const [alt, setAlt] = useState('')
  const [width, setWidth] = useState('60%')
  const [alignment, setAlignment] = useState<ImageAlignment>('center')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [galleryFiles, setGalleryFiles] = useState<DriveImage[]>([])
  const [gallerySearch, setGallerySearch] = useState('')
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setMode('upload')
    setFile(null)
    setSrc('')
    setAlt('')
    setWidth('60%')
    setAlignment('center')
    setError('')
    setLoading(false)
    setGallerySearch('')
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'library') return

    let cancelled = false

    const fetchGallery = async () => {
      setGalleryLoading(true)
      setError('')

      try {
        const response = await fetch('/api/google-drive/images')
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Gagal mengambil galeri gambar.')
        }

        if (!cancelled) {
          setGalleryFiles(result.files || [])
          setNextPageToken(result.nextPageToken || null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Gagal mengambil galeri gambar.'
          )
        }
      } finally {
        if (!cancelled) {
          setGalleryLoading(false)
        }
      }
    }

    fetchGallery()

    return () => {
      cancelled = true
    }
  }, [open, mode])

  if (!open) return null

  const insertImage = (imageUrl: string) => {
    const widthValue = width === 'auto' ? 'auto' : width

    const margin =
      alignment === 'left'
        ? '0 auto 0 0'
        : alignment === 'right'
          ? '0 0 0 auto'
          : '0 auto'

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'image',
        attrs: {
          src: imageUrl,
          alt: alt.trim(),
          title: alt.trim(),
          width: widthValue,
          style: `width: ${widthValue}; display: block; margin: ${margin};`,
        },
      })
      .run()

    onClose()
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Pilih gambar dari komputer terlebih dahulu.')
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]

    if (!allowedTypes.includes(file.type)) {
      setError('Format gambar harus JPG, PNG, WEBP, atau GIF.')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 8 MB.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/google-drive/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success || !result.file?.imageUrl) {
        throw new Error(result.error || 'Gagal mengunggah gambar.')
      }

      insertImage(result.file.imageUrl)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mengunggah gambar.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleInsertUrl = () => {
    const trimmedSrc = src.trim()

    if (!trimmedSrc) {
      setError('Masukkan alamat gambar terlebih dahulu.')
      return
    }

    try {
      const parsedUrl = new URL(trimmedSrc)

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        setError('Alamat gambar harus menggunakan HTTP atau HTTPS.')
        return
      }

      // Beberapa situs pencarian gambar (termasuk Yahoo Images)
      // menyimpan URL file gambar di dalam parameter, bukan pada URL halaman.
      const embeddedImageUrl =
        parsedUrl.searchParams.get('imgurl') ||
        parsedUrl.searchParams.get('mediaurl') ||
        parsedUrl.searchParams.get('image_url')

      let imageUrl = trimmedSrc

      if (embeddedImageUrl) {
        const candidateUrl = new URL(embeddedImageUrl)

        if (!['http:', 'https:'].includes(candidateUrl.protocol)) {
          setError('Tautan gambar yang ditemukan tidak menggunakan HTTP atau HTTPS.')
          return
        }

        imageUrl = candidateUrl.href
      } else if (
        parsedUrl.hostname.includes('images.search.yahoo.com') ||
        parsedUrl.pathname.includes('/search/images')
      ) {
        setError(
          'Ini tautan halaman hasil pencarian, bukan tautan file gambar. Salin alamat gambar langsung atau gunakan tautan hasil gambar yang memuat parameter imgurl.'
        )
        return
      }

      insertImage(imageUrl)
    } catch {
      setError('Alamat URL atau tautan gambar di dalamnya tidak valid.')
    }
  }

  const loadMoreImages = async () => {
    if (!nextPageToken || galleryLoading) return

    setGalleryLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/google-drive/images?pageToken=${encodeURIComponent(nextPageToken)}`
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal mengambil gambar berikutnya.')
      }

      setGalleryFiles((previous) => [
        ...previous,
        ...(result.files || []),
      ])

      setNextPageToken(result.nextPageToken || null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil gambar berikutnya.'
      )
    } finally {
      setGalleryLoading(false)
    }
  }

  const filteredImages = galleryFiles.filter((image) =>
    image.name.toLowerCase().includes(gallerySearch.toLowerCase())
  )

  const formatSize = (size: string) => {
    const bytes = Number(size)

    if (!bytes) return ''

    return bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`
  }

  const fieldClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500'

  const tabClass = (active: boolean) =>
    `rounded-md px-2 py-2 text-xs font-semibold sm:text-sm ${
      active
        ? 'bg-white text-blue-700 shadow-sm'
        : 'text-slate-600 hover:bg-white/70'
    }`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Sisipkan Gambar
            </h2>
            <p className="text-xs text-slate-500">
              Pilih gambar baru atau gunakan koleksi Google Drive.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-2">
          <button
            type="button"
            onClick={() => {
              setMode('upload')
              setError('')
            }}
            className={tabClass(mode === 'upload')}
          >
            Upload Baru
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('library')
              setError('')
            }}
            className={tabClass(mode === 'library')}
          >
            Galeri Drive
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('url')
              setError('')
            }}
            className={tabClass(mode === 'url')}
          >
            Gunakan URL
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">

          {mode === 'upload' && (
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Pilih gambar dari komputer
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null)
                    setError('')
                  }}
                  disabled={loading}
                  className={fieldClass}
                />
              </label>

              <p className="text-xs text-slate-500">
                Format JPG, PNG, WEBP, atau GIF. Maksimal 8 MB.
                Gambar akan disimpan ke Google Drive.
              </p>

              {file && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                  <p className="font-medium">{file.name}</p>
                  <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
            </div>
          )}

          {mode === 'library' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">
                  Koleksi gambar tersimpan
                </p>

                <span className="text-xs text-slate-500">
                  {galleryFiles.length} gambar
                </span>
              </div>

              <input
                type="search"
                value={gallerySearch}
                onChange={(event) => setGallerySearch(event.target.value)}
                placeholder="Cari nama gambar..."
                className={fieldClass}
              />

              {galleryLoading && galleryFiles.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-500">
                  Memuat galeri Google Drive...
                </div>
              )}

              {!galleryLoading && filteredImages.length === 0 && !error && (
                <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    {galleryFiles.length === 0
                      ? 'Belum ada gambar tersimpan.'
                      : 'Gambar tidak ditemukan.'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Unggah gambar baru atau coba kata pencarian lain.
                  </p>
                </div>
              )}

              {filteredImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filteredImages.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setAlt(image.name)
                        insertImage(image.imageUrl)
                      }}
                      className="group overflow-hidden rounded-xl border border-slate-200 text-left transition hover:border-blue-500 hover:ring-2 hover:ring-blue-100 disabled:opacity-50"
                      title={`Gunakan ${image.name}`}
                    >
                      <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.imageUrl}
                          alt={image.name}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="p-2">
                        <p className="truncate text-xs font-semibold text-slate-700">
                          {image.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatSize(image.size)}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-blue-600 group-hover:text-blue-800">
                          Pilih gambar
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {nextPageToken && (
                <button
                  type="button"
                  onClick={loadMoreImages}
                  disabled={galleryLoading}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {galleryLoading ? 'Memuat...' : 'Muat gambar lainnya'}
                </button>
              )}

              {galleryLoading && galleryFiles.length > 0 && (
                <p className="text-center text-xs text-slate-500">
                  Memuat gambar...
                </p>
              )}
            </div>
          )}

          {mode === 'url' && (
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Alamat URL gambar
              </span>

              <input
                type="url"
                value={src}
                onChange={(event) => setSrc(event.target.value)}
                placeholder="https://contoh.com/gambar.jpg"
                className={fieldClass}
              />
            </label>
          )}

          {mode !== 'library' && (
            <>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">
                  Keterangan gambar
                </span>

                <input
                  value={alt}
                  onChange={(event) => setAlt(event.target.value)}
                  placeholder="Contoh: Gambar bangun datar"
                  className={fieldClass}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Ukuran gambar
                  </span>

                  <select
                    value={width}
                    onChange={(event) => setWidth(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="25%">Kecil (25%)</option>
                    <option value="40%">40%</option>
                    <option value="60%">Sedang (60%)</option>
                    <option value="80%">80%</option>
                    <option value="100%">Lebar penuh</option>
                    <option value="auto">Ukuran asli</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Posisi gambar
                  </span>

                  <select
                    value={alignment}
                    onChange={(event) =>
                      setAlignment(event.target.value as ImageAlignment)
                    }
                    className={fieldClass}
                  >
                    <option value="left">Kiri</option>
                    <option value="center">Tengah</option>
                    <option value="right">Kanan</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        {mode !== 'library' && (
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={mode === 'upload' ? handleUpload : handleInsertUrl}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Mengunggah...'
                : mode === 'upload'
                  ? 'Upload dan Sisipkan'
                  : 'Sisipkan Gambar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
