
'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface ImageDialogProps {
  editor: Editor
  open: boolean
  onClose: () => void
}

type ImageAlignment = 'left' | 'center' | 'right'
type ImageSourceMode = 'upload' | 'url'

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

  useEffect(() => {
    if (open) {
      setMode('upload')
      setFile(null)
      setSrc('')
      setAlt('')
      setWidth('60%')
      setAlignment('center')
      setError('')
      setLoading(false)
    }
  }, [open])

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
        throw new Error(
          result.error || 'Gagal mengunggah gambar.'
        )
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
    } catch {
      setError('Alamat gambar tidak valid.')
      return
    }

    insertImage(trimmedSrc)
  }

  const fieldClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            Sisipkan Gambar
          </h2>

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

        <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('upload')
              setError('')
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === 'upload'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Upload dari komputer
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('url')
              setError('')
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === 'url'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Gunakan URL
          </button>
        </div>

        <div className="space-y-4">
          {mode === 'upload' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Pilih gambar dari komputer
              </label>

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

              <p className="text-xs text-slate-500">
                Format JPG, PNG, WEBP, atau GIF. Maksimal 8 MB.
                Gambar akan disimpan ke Google Drive.
              </p>

              {file && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                  <p className="font-medium">{file.name}</p>
                  <p>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
          ) : (
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

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
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
        </div>
      </div>
    </div>
  )
}
