
export default function FontTestPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Pengujian Font Website
        </h1>

        {/* TES FONT ARAB */}
        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-bold text-slate-800">
            1. Font Arab - Noto Naskh Arabic
          </h2>

          <div
            lang="ar"
            dir="rtl"
            className="font-arabic text-3xl text-slate-900"
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Tes huruf Arab beserta harakat.
          </p>
        </section>

        {/* TES FONT AKSARA JAWA */}
        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-bold text-slate-800">
            2. Font Aksara Jawa - Noto Sans Javanese
          </h2>

          <div
            lang="jv"
            className="font-aksara-jawa text-3xl text-slate-900"
          >
            ꦲꦤꦕꦫꦏ ꦢꦠꦱꦮꦭ ꦥꦝꦗꦪꦚ ꦩꦒꦧꦛꦔ
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Tes aksara Jawa dan susunan hurufnya.
          </p>
        </section>

        <p className="text-sm text-slate-500">
          Jika semua huruf terlihat jelas dan tidak berubah menjadi
          kotak-kotak, font berhasil ditampilkan.
        </p>
      </div>
    </main>
  )
}
