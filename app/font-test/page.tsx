'use client'

import { useState } from 'react'
import RichTextEditor from '@/components/editor/RichTextEditor'
import MathRenderer from '@/components/MathRenderer'

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

export default function FontTestPage() {
  const [content, setContent] = useState(INITIAL_CONTENT)

  function resetEditor() {
    setContent(INITIAL_CONTENT)
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
            ke dalam bank soal. Perubahan di sini tidak disimpan ke database.
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

            <button
              type="button"
              onClick={resetEditor}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset contoh
            </button>
          </div>

          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Tuliskan soal atau materi di sini..."
          />

          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
            <span>Perubahan hanya tersimpan sementara di halaman ini.</span>
            <span>{content.length.toLocaleString('id-ID')} karakter HTML</span>
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
            <MathRenderer content={content} />
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
            <li>Penulisan Arab beserta harakat dan arah RTL.</li>
            <li>Aksara Jawa beserta sandhangan.</li>
            <li>Kesesuaian hasil editor dengan pratinjau.</li>
          </ul>
        </section>

      </div>
    </main>
  )
}