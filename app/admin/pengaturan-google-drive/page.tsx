'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function GoogleDriveSettingsContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('googleDrive')

  const statusMessages: Record<string, { title: string; detail: string; style: string }> = {
    connected: {
      title: 'Google Drive berhasil dihubungkan.',
      detail: 'Akun Google sudah tersimpan. Silakan coba paste atau unggah gambar pada editor soal.',
      style: 'border-green-200 bg-green-50 text-green-800',
    },
    invalid_state: {
      title: 'Proses koneksi tidak valid atau sudah kedaluwarsa.',
      detail: 'Jangan membuka alamat callback secara langsung. Mulai ulang melalui tombol Hubungkan Google Drive di halaman ini.',
      style: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    cancelled: {
      title: 'Proses koneksi dibatalkan di Google.',
      detail: 'Silakan klik Hubungkan Google Drive jika ingin mencoba lagi.',
      style: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    unauthorized: {
      title: 'Sesi login berakhir.',
      detail: 'Silakan login kembali sebagai admin, lalu ulangi proses koneksi.',
      style: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    forbidden: {
      title: 'Akses admin tidak dikenali.',
      detail: 'Pastikan akun yang digunakan memiliki peran admin.',
      style: 'border-red-200 bg-red-50 text-red-800',
    },
    missing_code: {
      title: 'Google tidak mengirim kode otorisasi.',
      detail: 'Silakan mulai ulang koneksi dari tombol di halaman ini.',
      style: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    error: {
      title: 'Koneksi Google Drive gagal diselesaikan.',
      detail: 'Coba ulangi. Jika masih gagal, periksa konfigurasi OAuth dan variabel Production di Vercel.',
      style: 'border-red-200 bg-red-50 text-red-800',
    },
  }

  const message = status ? statusMessages[status] : null

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-indigo-600">PENGATURAN ADMIN</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Pengaturan Google Drive</h1>
          <p className="mt-2 text-sm text-slate-600">
            Hubungkan akun Google agar gambar dari editor soal dapat disimpan ke Google Drive.
          </p>
        </div>

        {message && (
          <div className={`mb-5 rounded-xl border p-4 ${message.style}`} role="status">
            <p className="font-bold">{message.title}</p>
            <p className="mt-1 text-sm">{message.detail}</p>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">☁️</div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Koneksi akun Google</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Tekan tombol di bawah. Website akan membuka halaman resmi Google untuk meminta izin akses penyimpanan file. Setelah izin diberikan, Google akan mengembalikan Bapak ke halaman ini.
              </p>
            </div>
          </div>

          <a
            href="/api/google-drive/connect"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
          >
            <span aria-hidden="true">🔗</span>
            Hubungkan Google Drive
          </a>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p className="font-bold text-slate-800">Cara menghubungkan:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Klik tombol Hubungkan Google Drive.</li>
              <li>Pilih akun Google yang akan digunakan.</li>
              <li>Jika muncul permintaan izin, tinjau lalu klik Izinkan.</li>
              <li>Tunggu sampai kembali ke halaman Pengaturan Google Drive.</li>
              <li>Jika muncul pesan berhasil, coba paste gambar ke editor soal.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              Catatan: jangan membuka alamat /api/google-drive/callback secara manual. Alamat itu hanya digunakan Google untuk mengembalikan hasil proses koneksi.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function GoogleDriveSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Memuat pengaturan Google Drive...</div>}>
      <GoogleDriveSettingsContent />
    </Suspense>
  )
}
