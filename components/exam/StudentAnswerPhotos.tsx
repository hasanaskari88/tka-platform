'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SavedPhoto = {
  id: string
  storage_path: string
  created_at: string
  signedUrl: string
}

type StudentAnswerPhotosProps = {
  sessionId: string
  questionId: string
  userId: string
  disabled?: boolean
  onUploadingChange?: (uploading: boolean) => void
}

async function compressPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const maxWidth = 1600
  const scale = Math.min(1, maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Perangkat tidak dapat memproses foto.')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const toJpeg = (quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Foto gagal dikompres.')),
        'image/jpeg',
        quality
      )
    })

  let compressed = await toJpeg(0.84)
  if (compressed.size > 900 * 1024) compressed = await toJpeg(0.74)
  if (compressed.size > 1.5 * 1024 * 1024) compressed = await toJpeg(0.64)
  return compressed
}

export default function StudentAnswerPhotos({
  sessionId,
  questionId,
  userId,
  disabled = false,
  onUploadingChange,
}: StudentAnswerPhotosProps) {
  const supabase = useMemo(() => createClient(), [])
  const [photos, setPhotos] = useState<SavedPhoto[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    const loadPhotos = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('answer_images')
        .select('id, storage_path, created_at')
        .eq('session_id', sessionId)
        .eq('question_id', questionId)
        .order('created_at', { ascending: true })

      if (error) {
        if (active) setErrorMessage('Foto tersimpan belum dapat dimuat. Periksa koneksi internet.')
        if (active) setLoading(false)
        return
      }

      const rows = data || []
      const { data: signedRows, error: signedError } = rows.length
        ? await supabase.storage.from('student-answer-photos').createSignedUrls(
            rows.map((row) => row.storage_path),
            60 * 60
          )
        : { data: [], error: null }

      if (!active) return
      if (signedError) {
        setErrorMessage('Pratinjau foto belum dapat dibuka. Coba muat ulang halaman.')
      } else {
        setPhotos(rows.map((row, index) => ({
          ...row,
          signedUrl: signedRows?.[index]?.signedUrl || '',
        })))
      }
      setLoading(false)
    }

    if (sessionId && questionId && userId) loadPhotos()
    else setLoading(false)

    return () => { active = false }
  }, [supabase, sessionId, questionId, userId])

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    }
  }, [pendingPreview])

  const chooseFile = (file?: File) => {
    setErrorMessage('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Pilih file gambar dari kamera atau galeri.')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setErrorMessage('Ukuran foto asli terlalu besar (maksimal 12 MB).')
      return
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async () => {
    if (!pendingFile || !userId || photos.length >= 5) return
    setUploading(true)
    onUploadingChange?.(true)
    setErrorMessage('')

    let storagePath = ''
    try {
      const compressed = await compressPhoto(pendingFile)
      if (compressed.size > 5 * 1024 * 1024) {
        throw new Error('Foto masih terlalu besar setelah dikompres. Coba foto ulang dengan jarak lebih dekat.')
      }

      const fileId = crypto.randomUUID()
      storagePath = `${userId}/${sessionId}/${questionId}/${fileId}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('student-answer-photos')
        .upload(storagePath, compressed, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        })
      if (uploadError) throw uploadError

      const { data: inserted, error: insertError } = await supabase
        .from('answer_images')
        .insert({
          session_id: sessionId,
          question_id: questionId,
          user_id: userId,
          storage_path: storagePath,
          file_name: pendingFile.name.slice(0, 180),
          mime_type: 'image/jpeg',
          file_size_bytes: compressed.size,
        })
        .select('id, storage_path, created_at')
        .single()

      if (insertError) {
        await supabase.storage.from('student-answer-photos').remove([storagePath])
        throw insertError
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from('student-answer-photos')
        .createSignedUrl(storagePath, 60 * 60)
      if (signedError) throw signedError

      setPhotos((current) => [...current, {
        ...inserted,
        signedUrl: signed.signedUrl,
      }])
      setPendingFile(null)
      if (pendingPreview) URL.revokeObjectURL(pendingPreview)
      setPendingPreview('')
    } catch (error) {
      console.error('Gagal mengunggah foto jawaban:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Foto gagal diunggah. Silakan coba lagi.')
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  const deletePhoto = async (photo: SavedPhoto) => {
    if (disabled || deletingId) return
    setDeletingId(photo.id)
    setErrorMessage('')
    try {
      const { error: rowError } = await supabase
        .from('answer_images')
        .delete()
        .eq('id', photo.id)
      if (rowError) throw rowError

      const { error: fileError } = await supabase.storage
        .from('student-answer-photos')
        .remove([photo.storage_path])
      if (fileError) console.warn('Metadata foto terhapus, tetapi file belum terhapus:', fileError)

      setPhotos((current) => current.filter((item) => item.id !== photo.id))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Foto gagal dihapus.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <details className="group rounded-xl border border-sky-200 bg-sky-50/70 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-sky-900 [&::-webkit-details-marker]:hidden">
        <span>{`📷 Sertakan foto jawaban (opsional)${photos.length > 0 ? ` · ${photos.length} foto` : ""}`}</span>
        <span className="text-xs font-semibold text-sky-700 group-open:hidden">Buka</span>
        <span className="hidden text-xs font-semibold text-sky-700 group-open:inline">Tutup</span>
      </summary>
      <div className="mt-3 space-y-3">
      <div>
        <p className="text-sm font-bold text-slate-800">Foto jawaban tulisan tangan</p>
        <p className="text-xs text-slate-600 mt-1">
          Jika lebih mudah, tulis jawaban di kertas lalu foto dengan jelas. Foto akan otomatis diperkecil sebelum dikirim.
          Maksimal 5 foto untuk setiap soal.
        </p>
      </div>

      {!disabled && photos.length < 5 && (
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800">
            📸 Buka Kamera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                chooseFile(event.target.files?.[0])
                event.currentTarget.value = ''
              }}
            />
          </label>
          <label className="cursor-pointer rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100">
            🖼️ Pilih dari Galeri
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                chooseFile(event.target.files?.[0])
                event.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      )}

      {pendingPreview && pendingFile && (
        <div className="rounded-lg border border-sky-200 bg-white p-2 space-y-2">
          <p className="text-xs font-bold text-slate-700">Periksa foto sebelum dikirim</p>
          <img src={pendingPreview} alt="Pratinjau foto jawaban" className="max-h-64 w-full rounded-lg object-contain bg-slate-100" />
          <p className="text-[11px] text-slate-500">{pendingFile.name}</p>
          <div className="flex gap-2">
            <button type="button" onClick={uploadPhoto} disabled={uploading} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {uploading ? 'Mengompres dan mengirim...' : 'Kirim Foto'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingPreview) URL.revokeObjectURL(pendingPreview)
                setPendingFile(null)
                setPendingPreview('')
              }}
              disabled={uploading}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
            >
              Batal / Foto Ulang
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-xs text-slate-500">Memuat foto tersimpan...</p>}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={photo.id} className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
              {photo.signedUrl ? (
                <a href={photo.signedUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={photo.signedUrl} alt={`Foto jawaban ${index + 1}`} className="h-32 w-full rounded object-contain bg-slate-100" />
                </a>
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400">Pratinjau tidak tersedia</div>
              )}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-emerald-700">✓ Foto {index + 1} terkirim</span>
                {!disabled && (
                  <button type="button" onClick={() => deletePhoto(photo)} disabled={deletingId === photo.id} className="text-[11px] font-bold text-rose-600 disabled:opacity-50">
                    {deletingId === photo.id ? '...' : 'Hapus'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length >= 5 && <p className="text-xs font-semibold text-amber-700">Batas 5 foto untuk soal ini sudah tercapai.</p>}
      {errorMessage && <p role="alert" className="text-xs font-semibold text-rose-700">{errorMessage}</p>}
      {!loading && photos.length === 0 && !pendingPreview && <p className="text-[11px] text-slate-500">Belum ada foto yang dikirim untuk soal ini.</p>}
      </div>
    </details>
  )
}
