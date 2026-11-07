'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface ImageCropDialogProps {
  src: string
  onClose: () => void
  onCropped: (imageUrl: string) => void
}

interface CropSelection {
  x: number
  y: number
  width: number
  height: number
}

export default function ImageCropDialog({
  src,
  onClose,
  onCropped,
}: ImageCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const [selection, setSelection] = useState<CropSelection | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSelection(null)
    setError('')
  }, [src])

  const getPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const image = imageRef.current
    if (!image) return null

    const rect = image.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
      width: rect.width,
      height: rect.height,
    }
  }

  const startSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (saving) return
    const point = getPoint(event)
    if (!point) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: point.x, y: point.y }
    setSelection({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    })
  }

  const moveSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const point = getPoint(event)
    if (!point) return

    const start = dragRef.current
    setSelection({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    })
  }

  const finishSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    moveSelection(event)
    dragRef.current = null
  }

  const saveCrop = async () => {
    const image = imageRef.current
    if (!image || !selection) {
      setError('Tarik pada gambar untuk memilih area yang akan dipotong.')
      return
    }

    const rect = image.getBoundingClientRect()
    if (
      selection.width < 12 ||
      selection.height < 12 ||
      !rect.width ||
      !rect.height
    ) {
      setError('Area potongan terlalu kecil. Pilih area yang lebih besar.')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Muat ulang sumber dengan izin CORS agar dapat diproses oleh canvas.
      // Gambar Drive diproses melalui endpoint server satu-domain.
      // Thumbnail Drive tidak selalu mengirim header CORS untuk canvas.
      let cropSourceUrl = src
      try {
        const parsedSource = new URL(src, window.location.origin)
        const driveFileId =
          parsedSource.hostname === 'drive.google.com'
            ? parsedSource.searchParams.get('id')
            : null

        if (driveFileId) {
          cropSourceUrl = `/api/google-drive/image/${encodeURIComponent(driveFileId)}`
        }
      } catch {
        // Biarkan URL asli; proses pemuatan di bawah akan menampilkan pesan jika gagal.
      }

      const source = new window.Image()
      source.crossOrigin = 'anonymous'
      source.src = cropSourceUrl

      await new Promise<void>((resolve, reject) => {
        source.onload = () => resolve()
        source.onerror = () =>
          reject(new Error('Gambar tidak dapat diproses. Untuk gambar dari situs luar, server gambar harus mengizinkan akses CORS.'))
      })

      const scaleX = source.naturalWidth / rect.width
      const scaleY = source.naturalHeight / rect.height
      const sx = Math.round(selection.x * scaleX)
      const sy = Math.round(selection.y * scaleY)
      const sw = Math.round(selection.width * scaleX)
      const sh = Math.round(selection.height * scaleY)

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, sw)
      canvas.height = Math.max(1, sh)

      const context = canvas.getContext('2d')
      if (!context) throw new Error('Browser tidak dapat memproses gambar.')

      context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result)
          else reject(new Error('Gagal membuat hasil potongan gambar.'))
        }, 'image/png')
      })

      const formData = new FormData()
      formData.append('file', blob, `gambar-crop-${Date.now()}.png`)

      const response = await fetch('/api/google-drive/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok || !result.success || !result.file?.imageUrl) {
        throw new Error(result.error || 'Gagal menyimpan hasil crop ke Google Drive.')
      }

      onCropped(result.file.imageUrl)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat memotong gambar.'
      )
    } finally {
      setSaving(false)
    }
  }

  const imageRect = imageRef.current?.getBoundingClientRect()
  const selectionStyle = selection && imageRect
    ? {
        left: `${selection.x / imageRect.width * 100}%`,
        top: `${selection.y / imageRect.height * 100}%`,
        width: `${selection.width / imageRect.width * 100}%`,
        height: `${selection.height / imageRect.height * 100}%`,
      }
    : undefined

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="font-semibold text-slate-800">Potong gambar</h3>
            <p className="text-xs text-slate-500">Tarik pada gambar untuk memilih bagian yang ingin dipertahankan.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50">✕</button>
        </div>

        <div className="max-h-[65vh] overflow-auto bg-slate-100 p-4 text-center">
          <div
            className="relative inline-block max-w-full cursor-crosshair select-none"
            onPointerDown={startSelection}
            onPointerMove={moveSelection}
            onPointerUp={finishSelection}
            onPointerCancel={finishSelection}
            style={{ touchAction: 'none' }}
          >
            <img
              ref={imageRef}
              src={src}
              alt="Pratinjau gambar yang akan dipotong"
              draggable={false}
              className="block max-h-[55vh] max-w-full rounded"
            />
            <div className="absolute inset-0 pointer-events-none">
              {selectionStyle && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-400/20 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
                  style={selectionStyle}
                />
              )}
            </div>
          </div>
        </div>

        {error && <p className="mx-4 mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4">
          <p className="text-xs text-slate-500">Gambar asli di Google Drive tidak dihapus.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelection(null)} disabled={saving} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Ulangi pilihan</button>
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Batal</button>
            <button type="button" onClick={saveCrop} disabled={saving || !selection || selection.width < 12 || selection.height < 12} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Menyimpan...' : 'Potong dan Simpan ke Drive'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
