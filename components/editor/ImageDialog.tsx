'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface ImageDialogProps {
  editor: Editor
  open: boolean
  onClose: () => void
}

type ImageAlignment = 'left' | 'center' | 'right'

export default function ImageDialog({
  editor,
  open,
  onClose,
}: ImageDialogProps) {
  const [src, setSrc] = useState('')
  const [alt, setAlt] = useState('')
  const [width, setWidth] = useState('60%')
  const [alignment, setAlignment] = useState<ImageAlignment>('center')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setSrc('')
      setAlt('')
      setWidth('60%')
      setAlignment('center')
      setError('')
    }
  }, [open])

  if (!open) return null

  const insertImage = () => {
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
          src: trimmedSrc,
          alt: alt.trim(),
          title: alt.trim(),
          width: widthValue,
          style: `width: ${widthValue}; display: block; margin: ${margin};`,
        },
      })
      .run()

    onClose()
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
            className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
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
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={insertImage}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Sisipkan Gambar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}