import Image from 'next/image'
import Link from 'next/link'

const logoAssets = [
  {
    file: 'logo-sd-getasan.png',
    title: 'Logo SD Negeri Getasan',
    role: 'Logo yang saat ini dipakai pada sertifikat penghargaan',
    size: '±866 KB',
    status: 'Dipakai saat ini',
    href: '/logo-sd-getasan.png',
  },
  {
    file: 'logo-sd-getasan2.png',
    title: 'Logo SD Negeri Getasan — alternatif 2',
    role: 'Berkas logo alternatif; perlu dibandingkan secara visual',
    size: '±818 KB',
    status: 'Perlu ditinjau',
    href: '/logo-sd-getasan2.png',
  },
  {
    file: 'logo-sd.png',
    title: 'Logo SD — salinan identik',
    role: 'SHA GitHub sama persis dengan logo-sd-getasan.png',
    size: '±866 KB',
    status: 'Duplikat identik',
    href: '/logo-sd.png',
  },
  {
    file: 'logo-tka.png',
    title: 'Logo TKA',
    role: 'Logo platform / asesmen TKA; kandidat logo pendamping bila sesuai kebutuhan',
    size: '±251 KB',
    status: 'Perlu ditinjau',
    href: '/logo-tka.png',
  },
]

export default function LogoInventoryPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/raport/penghargaan" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
          ← Kembali ke Penghargaan
        </Link>

        <header className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Inventaris aset visual</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">Inventaris Logo Sekolah & Platform</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Daftar ini menampilkan berkas logo yang ditemukan di folder public proyek. Gunakan pratinjau untuk membandingkan bentuk, warna, tulisan, dan kejernihan sebelum menentukan susunan kop sertifikat.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-indigo-50 p-3"><p className="text-2xl font-black text-indigo-800">4</p><p className="text-xs font-semibold text-indigo-700">Berkas logo ditemukan</p></div>
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-2xl font-black text-emerald-800">3</p><p className="text-xs font-semibold text-emerald-700">Berkas logo unik berdasarkan SHA</p></div>
            <div className="rounded-xl bg-amber-50 p-3"><p className="text-2xl font-black text-amber-800">1</p><p className="text-xs font-semibold text-amber-700">Salinan identik</p></div>
          </div>
        </header>

        <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {logoAssets.map((asset) => (
            <article key={asset.file} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-64 items-center justify-center bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5">
                <Image src={asset.href} alt={asset.title} width={480} height={480} unoptimized className="h-full w-full object-contain" />
              </div>
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{asset.status}</span>
                  <span className="text-[10px] text-slate-400">{asset.size}</span>
                </div>
                <h2 className="mt-3 text-base font-black text-slate-900">{asset.title}</h2>
                <p className="mt-1 min-h-10 text-xs leading-5 text-slate-600">{asset.role}</p>
                <p className="mt-3 break-all rounded-lg bg-slate-50 p-2 font-mono text-[10px] text-slate-500">public/{asset.file}</p>
                <a href={asset.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-indigo-700 hover:underline">Buka gambar asli ↗</a>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black text-amber-950">Catatan pemeriksaan berkas</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900">
            <li><strong>logo-sd-getasan.png</strong> dan <strong>logo-sd.png</strong> memiliki SHA GitHub yang sama, sehingga keduanya identik secara byte.</li>
            <li><strong>logo-sd-getasan2.png</strong> memiliki SHA berbeda; jangan dianggap versi yang lebih baik sebelum dibandingkan secara visual.</li>
            <li><strong>logo-tka.png</strong> adalah aset berbeda dan perlu dipastikan apakah memang dimaksudkan sebagai identitas pendamping sekolah.</li>
            <li>Belum ada logo yang diubah, dihapus, atau diganti pada sertifikat.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
