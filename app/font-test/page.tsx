
'use client'

import { Suspense, useEffect, useState } from 'react'
import RichTextEditor from '@/components/editor/RichTextEditor'
import MathRenderer from '@/components/MathRenderer'

const STORAGE_KEY = 'tka-platform-font-test-content-v1'

const INITIAL_CONTENT = `
  <h2>Laboratorium Editor Soal TKA</h2>
  <p>Ini adalah teks biasa untuk menguji editor.</p>
  <p>Silakan pilih sebagian teks untuk mencoba format tebal, miring, garis bawah, warna, dan ukuran huruf.</p>
  <p lang="ar" dir="rtl" class="font-arabic">
    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
  </p>
  <p lang="jv" class="font-aksara-jawa">
    ꦲꦤꦕꦫꦏ ꦢꦠꦱꦮꦭ ꦥꦝꦗꦪꦚ
  </p>
  <p>Contoh soal: Berapakah hasil dari penjumlahan 125 + 275?</p>
`

type SaveStatus = 'loading' | 'saving' | 'saved' | 'error'

export default function FontTestPage() {
  const [content, setContent] = useState(INITIAL_CONTENT)
  const [isLoaded, setIsLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // Memuat isi editor yang sebelumnya tersimpan di browser.
  useEffect(() => {
    try {
      const savedContent = window.localStorage.getItem(STORAGE_KEY)

      if (savedContent !== null) {
        setContent(savedContent)
      }

      setSaveStatus('saved')
    } catch (error) {
      console.error('Gagal memuat isi editor:', error)
      setSaveStatus('error')
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Menyimpan otomatis setiap kali isi editor berubah.
  useEffect(() => {
    if (!isLoaded) return

    setSaveStatus('saving')

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, content)
        setSaveStatus('saved')
        setLastSaved(
          new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )
      } catch (error) {
        console.error('Gagal menyimpan isi editor:', error)
        setSaveStatus('error')
      }
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [content, isLoaded])

  // Simpan manual ketika tombol ditekan.
  function saveNow() {
    try {
      window.localStorage.setItem(STORAGE_KEY, content)
      setSaveStatus('saved')
      setLastSaved(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    } catch (error) {
      console.error('Gagal menyimpan isi editor:', error)
      setSaveStatus('error')
    }
  }

  // Kembalikan editor ke contoh awal.
  function resetEditor() {
    const confirmed = window.confirm(
      'Kembalikan editor ke contoh awal? Isi pengujian yang tersimpan akan diganti.'
    )

    if (!confirmed) return

    try {
      window.localStorage.setItem(STORAGE_KEY, INITIAL_CONTENT)
      setContent(INITIAL_CONTENT)
      setSaveStatus('saved')
      setLastSaved(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    } catch (error) {
      console.error('Gagal mereset isi editor:', error)
      setContent(INITIAL_CONTENT)
      setSaveStatus('error')
    }
  }

  const saveStatusText = {
    loading: 'Memuat data...',
    saving: 'Menyimpan perubahan...',
    saved: 'Perubahan tersimpan di browser',
    error: 'Gagal menyimpan. Periksa penyimpanan browser.',
  }

  const saveStatusColor = {
    loading: 'text-slate-500',
    saving: 'text-amber-600',
    saved: 'text-green-700',
    error: 'text-red-600',
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        <header className="space-y-2">
          <div className="text-sm font-semibold text-blue-700">
            TKA PLATFORM · LABORATORIUM
          </div>

          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            Pengujian Rich Text Editor
          </h1>

          <p className="text-sm text-slate-600">
            Halaman khusus untuk menguji editor sebelum diintegrasikan
            ke dalam bank soal. Perubahan tersimpan otomatis di browser
            yang sedang digunakan, bukan ke database.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800">
                1. Area Editor
              </h2>
              <p className="text-xs text-slate-500">
                Uji seluruh tombol toolbar dan isi editor.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveNow}
                disabled={!isLoaded}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Simpan sekarang
              </button>

              <button
                type="button"
                onClick={resetEditor}
                disabled={!isLoaded}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset contoh
              </button>
            </div>
          </div>

          {!isLoaded ? (
            <div className="min-h-[220px] rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
              Memuat isi editor...
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="min-h-[220px] rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
                  Menyiapkan editor...
                </div>
              }
            >
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Tuliskan soal atau materi di sini..."
              />
            </Suspense>
          )}

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`font-semibold ${saveStatusColor[saveStatus]}`}>
                {saveStatusText[saveStatus]}
              </span>

              {lastSaved && saveStatus === 'saved' && (
                <span className="text-slate-400">
                  · Terakhir disimpan pukul {lastSaved}
                </span>
              )}
            </div>

            <span className="text-xs text-slate-500">
              {content.length.toLocaleString('id-ID')} karakter HTML
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4">
            <h2 className="font-bold text-slate-800">
              2. Pratinjau Hasil
            </h2>
            <p className="text-xs text-slate-500">
              Gambaran hasil konten setelah dibaca oleh komponen MathRenderer.
            </p>
          </div>

          <div className="min-h-40 rounded-lg border border-slate-200 bg-white p-4">
            <Suspense
              fallback={
                <div className="text-sm text-slate-500">
                  Menyiapkan pratinjau...
                </div>
              }
            >
              <MathRenderer content={content} />
            </Suspense>
          </div>
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h2 className="mb-2 font-bold text-slate-800">
            3. Daftar Pengujian
          </h2>

          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Format teks, jenis huruf, ukuran, dan warna.</li>
            <li>Perataan paragraf dan daftar berpoin/bernomor.</li>
            <li>Pangkat, indeks bawah, serta rumus matematika.</li>
            <li>Tabel dan gambar.</li>
            <li>Pengaturan ukuran dan posisi gambar.</li>
            <li>Penulisan Arab beserta harakat dan arah RTL.</li>
            <li>Aksara Jawa beserta sandhangan.</li>
            <li>Kesesuaian hasil editor dengan pratinjau.</li>
            <li>Penyimpanan otomatis dan pemuatan kembali setelah reload.</li>
          </ul>
        </section>

      </div>
    </main>
  )
}
