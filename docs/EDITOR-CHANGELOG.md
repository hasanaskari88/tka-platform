## 2026-11-08 — Animasi 3D hero tema non-Gaming
- Menambahkan animasi melayang dengan rotasi perspektif 3D pada ilustrasi hero Space, Jungle, Ocean, Disney, dan School.
- Ikon utama, bintang, dan ornamen pendamping bergerak dengan animasi terpisah untuk memberi kedalaman seperti hero Cartoon3D dan Gaming.
- Efek visual meningkat saat pointer diarahkan; animasi menghormati preferensi reduced motion.
- Tidak mengubah isi hero, tautan, data, skema, maupun alur aplikasi. Menunggu Preview dan QA pengguna.


## 2026-11-08 — Latar tema transparan, tidak mengganti latar asli
- Menindaklanjuti persetujuan pengguna: latar dasar tema non-Gaming tidak lagi diberi warna solid atau gradasi pengganti.
- Menghapus aturan background-image/background-color besar yang sebelumnya menutupi latar.
- Mengganti aksen dengan lapisan pseudo-element transparan: titik kecil dan cahaya warna tema ber-opacity rendah; tidak menangkap klik.
- Mempertahankan CSS hover kartu, efek hero, dan layout hero tema yang telah dibuat. Gaming tetap menggunakan latar arcade khusus yang sudah ada.
- Tidak mengubah data, skema, alur ujian, atau Production. Menunggu Preview terbaru dan QA pengguna.


## 2026-11-08 — Penyelarasan latar dotted dan hero seluruh tema
- Mengembalikan pola titik-titik sebagai ciri latar seluruh tema non-Gaming, dengan warna dasar dan titik yang berbeda untuk tiap tema.
- Menggunakan kembali prinsip visual Gaming untuk pola latar, serta mempertahankan kombinasi kartu/tombol Cartoon 3D sebagai acuan kedalaman dan kontras.
- Menambahkan hero bergaya ilustratif untuk Space, Jungle, Ocean, Disney, dan School; hero Cartoon 3D serta Arcade Gaming dipertahankan.
- Hero tema umum kini memiliki tombol ajakan belajar dan ornamen ringan berbasis emoji/CSS; tanpa gambar eksternal, library, WebGL, atau animasi latar.
- Perubahan hanya pada homepage CSS/JSX; tidak mengubah skema database, penilaian, CBT, API, atau Production. Menunggu Preview build dan QA pengguna.

# Roadmap, Arsip Perjalanan, dan Inventaris Rich Text Editor

Terakhir diperbarui: 7 November 2026

## Aturan kerja proyek

- Branch kerja sementara: `editor-test`.
- Branch produksi: `main`; **jangan diubah, di-merge, atau dipromosikan tanpa persetujuan eksplisit pengguna**.
- Laboratorium editor yang dipertahankan: `app/font-test/page.tsx`. Jangan membuat laboratorium pengganti.
- Kerjakan satu tahap pada satu waktu. Setiap tahap harus memiliki: tujuan, file yang diperiksa/diubah, hasil build, hasil uji pengguna, masalah yang ditemukan, perbaikan, dan langkah berikutnya.
- Catat fitur hanya sebagai "berhasil diuji" setelah ada konfirmasi uji pengguna. Build berhasil tidak sama dengan fitur berhasil diuji.
- Sebelum mengubah file, periksa isi dan SHA terbaru. Jangan mengulang fitur yang sudah berhasil; lanjutkan dari catatan ini.
- Jangan mengubah database, skema, penilaian, atau alur ujian kecuali memang diperlukan dan disetujui.

## Status ringkas saat ini

Tahap aktif: **QA integrasi editor pada halaman admin, lalu peningkatan kompatibilitas paste Microsoft Word**.

RichTextEditor sudah diterapkan pada dua halaman admin yang berbeda:
- `app/admin/exams/[id]/questions/page.tsx` — pengelolaan bank soal/latihan.
- `app/admin/exam/[id]/page.tsx` — pengelolaan soal pada ujian; editor teks, opsi, pernyataan matriks, dan pembahasan sudah diganti dengan RichTextEditor.

Pengguna telah mengonfirmasi tampilan editor pada halaman ujian dan desain toolbar ringkas terbaru sudah sesuai. Namun, pengujian menyeluruh alur simpan/buka ulang seluruh tipe soal tetap menjadi QA berikutnya.

Copy-paste teks Arab dan Aksara Jawa dari Word telah berhasil. Paste gambar Word dan konversi rumus Office Math/OMML masih menjadi pekerjaan terpisah.

## Milestone yang telah dikonfirmasi pengguna

| Fitur | Status |
|---|---|
| Font Arab Noto Naskh dan Aksara Jawa tampil benar | Berhasil diuji |
| Autosave konten laboratorium `font-test` ke localStorage | Berhasil diuji; hanya penyimpanan lokal browser |
| Upload gambar komputer ke Google Drive | Berhasil diuji |
| Galeri gambar Google Drive | Berhasil diuji |
| Sisipkan gambar dari URL | Berhasil diuji |
| Ekstraksi URL gambar dari halaman hasil Yahoo Images | Berhasil diuji |
| Paste gambar langsung dari hasil pencarian Yahoo pada editor | Berhasil diuji |
| Resize gambar | Berhasil diuji |
| Alignment kiri/tengah/kanan | Berhasil diuji |
| Text wrapping kiri/kanan | Berhasil diuji |
| Rotasi kiri/kanan dan reset | Berhasil diuji |
| Crop gambar dan simpan hasil ke Google Drive | Berhasil diuji untuk sumber yang mendukung; gambar asli tetap ada |
| Crop gambar dari galeri Google Drive melalui proxy same-origin | Berhasil diuji pengguna; hasil tampil di editor dan tersimpan sebagai gambar baru |
| Paste teks Arab dan Aksara Jawa dari Word | Berhasil diuji |
| Integrasi RichTextEditor pada halaman bank soal/latihan | Sudah terintegrasi; build Preview pernah berhasil; QA alur lengkap masih perlu dipastikan |
| Integrasi RichTextEditor pada halaman editor ujian | Sudah terintegrasi; pengguna mengonfirmasi tampilan editor; QA simpan/buka ulang semua tipe soal masih perlu dilakukan |
| Paste gambar langsung dari Microsoft Word | Belum didukung/diuji berhasil |
| Paste rumus matematika Word (Office Math/OMML) | Belum didukung/diuji berhasil |

## Inventaris kode

| File | Fungsi / status |
|---|---|
| `app/font-test/page.tsx` | Laboratorium font dan editor; autosave lokal |
| `components/editor/RichTextEditor.tsx` | Mesin Tiptap; extension teks, matematika, gambar, tabel, alignment, subscript/superscript, warna/font |
| `components/editor/EditorToolbar.tsx` | Toolbar ringkas satu baris (B, I, U, gambar, rumus, Lainnya) dan toolbar lengkap yang dapat dibuka; tombol pangkat/indeks tetap tersedia di toolbar lengkap |
| `components/editor/MathFormulaDialog.tsx` | Dialog rumus; mendukung pemicu ringkas berupa ikon ∑ dan mode tombol lengkap |
| `components/editor/ImageDialog.tsx` | Upload komputer, galeri Drive, dan URL gambar |
| `components/editor/ResizableImage.tsx` | Resize, alignment, wrapping, rotasi, dan crop |
| `components/editor/ImageCropDialog.tsx` | Seleksi area crop, canvas, upload hasil ke Drive |
| `components/editor/editor.css` | Gaya editor dan kontrol gambar |
| `components/editor/FontSize.ts` | Extension ukuran font |
| `components/editor/TableControls.tsx` | Kontrol tabel |
| `components/MathRenderer.tsx` | Renderer matematika lama yang tetap dipakai di tampilan lain |
| `app/admin/exams/[id]/questions/page.tsx` | Integrasi RichTextEditor pada pengelolaan bank soal/latihan; build berhasil |
| `app/admin/exam/[id]/page.tsx` | RichTextEditor sudah terintegrasi untuk pertanyaan, opsi, pernyataan matriks, dan pembahasan; field gambar lama dan struktur payload dipertahankan |
| `app/api/google-drive/upload/route.ts` | Upload gambar ke Google Drive |
| `app/api/google-drive/images/route.ts` | Daftar gambar galeri Drive |
| `app/api/google-drive/image/[id]/route.ts` | Proxy same-origin untuk membaca gambar Drive saat crop |
| `lib/google-drive/token-encryption.ts` | Enkripsi/dekripsi token Google Drive |
| `docs/EDITOR-CHANGELOG.md` | Arsip, inventaris, catatan masalah, dan roadmap ini |

## Arsip masalah, percobaan, dan solusi

### A. Crop gambar Google Drive — masalah CORS dan konfigurasi runtime

- Gejala: gambar thumbnail Drive terlihat di editor, tetapi browser canvas tidak dapat membaca gambar karena CORS.
- Solusi: endpoint `app/api/google-drive/image/[id]/route.ts` mengambil byte gambar dari Google Drive melalui server TKA Platform; dialog crop menggunakan endpoint same-origin untuk sumber Drive.
- Kesalahan build berulang pada commit `7baf406`, `ae16d30`, `3fcd40b`, dan `59f1db6`: `Route segment config "runtime" is not compatible with nextConfig.cacheComponents`; penyebabnya deklarasi `export const runtime = 'nodejs'`.
- Pelajaran/perbaikan: pada proyek ini dengan `cacheComponents` aktif, jangan menambahkan deklarasi `runtime` pada Route Handler tersebut. Node.js adalah runtime default. Hapus deklarasi itu; build Preview kemudian berhasil.
- Status: crop melalui galeri Drive dikonfirmasi berhasil oleh pengguna. Sumber eksternal non-Drive tetap dapat gagal jika host tidak mengizinkan CORS.

### B. Integrasi editor bank soal — JSX duplicate attribute

- Commit `b9bc997` gagal TypeScript: `app/admin/exams/[id]/questions/page.tsx(842,239): TS17001 JSX elements cannot have multiple attributes with the same name`.
- Penyebab: prop `placeholder` terpasang dua kali pada satu komponen editor.
- Perbaikan: commit `9623d37` menghapus placeholder duplikat.
- Hasil: deployment Vercel Preview berikutnya berhasil melewati kompilasi, pemeriksaan TypeScript, pembuatan halaman, dan deployment.
- Aturan pencegahan: sebelum commit integrasi JSX, periksa komponen yang baru dipasang agar setiap prop hanya muncul sekali. Jangan menganggap compile sukses saja sebagai bukti semua fungsi sudah benar.

### C. Peringatan saat prerender Google Drive API routes

Pada deployment yang berhasil, log menampilkan pesan saat prerender:
- `/api/google-drive/callback`: penggunaan `request.nextUrl.searchParams) menghasilkan `NEXT_PRERENDER_INTERRUPTED`.
- `/api/google-drive/connect` dan `/api/google-drive/images`: pesan `cookies()` / `HANGING_PROMISE_REJECTION` ketika prerender selesai.

Build tetap berlanjut, seluruh 27 halaman selesai dibuat, route API tercatat sebagai Dynamic (`ƒ`), dan deployment selesai. Jadi ini **bukan build failure** pada deployment tersebut. Namun catat sebagai peringatan runtime/prerender yang perlu ditinjau bila alur OAuth atau galeri Drive menunjukkan masalah; jangan mengubahnya tanpa reproduksi yang jelas.

### D. Peringatan instalasi npm

Log menampilkan:
- `Unknown env config "cache-dir"`.
- `unrs-resolver` install script belum masuk daftar allowScripts.

Pada log yang tersedia, keduanya berupa warning dan tidak menghentikan build. Jangan mengubah konfigurasi dependency hanya untuk menghilangkan warning tanpa memeriksa dampaknya.

## Dokumen uji Microsoft Word

Dokumen yang diserahkan pengguna: **LATIHAN ASSESMENT SUMATIF MATEMATIKA.docx**.

Hasil inspeksi yang dicatat pada sesi sebelumnya:
- 3 halaman dan 25 nomor soal.
- 38 objek Office Math (OMML), termasuk 30 struktur pecahan.
- 5 file gambar tertanam; ditemukan 6 referensi gambar di struktur dokumen.
- Contoh konten mencakup perkalian/pembagian pecahan dan soal cerita.
- Teks Arab dan Aksara Jawa sudah dapat disalin ke editor; gambar dan rumus belum.
- Dokumen ini menjadi fixture/patokan uji utama. Pertahankan rumus dan gambar dari sumber; jangan mengubah atau menyederhanakan isi soal saat menguji konversi.

## Audit Tahap 1 — halaman editor ujian (7 November 2026)

Status: **audit selesai; belum ada perubahan kode aplikasi pada tahap audit ini**.

File utama diperiksa:
- `app/admin/exam/[id]/page.tsx` — SHA saat audit: `165e159d1932f9e1796b6dfa3bcf406a76c565a6` (1.582 baris).
- `components/editor/RichTextEditor.tsx` — SHA: `684dafecb9de3caf8ade8c8a4701f09b0a88e895`.
- `components/MathRenderer.tsx` — SHA: `32a96323ca52fd6fcc0f8544338e15301ddf55db`.
- `components/editor/EditorToolbar.tsx` — SHA: `f7fe59fa3b0061cb4cd67ab1151748953e562c5e`.
- `app/admin/exams/[id]/questions/page.tsx` — SHA: `662ab2155d0781b9db3ac28df97c55262b1bddf7` (referensi integrasi editor yang sudah ada).

Temuan alur dan struktur:
1. Halaman `app/admin/exam/[id]/page.tsx` adalah halaman Kelola Soal untuk ujian pada URL `/admin/exam/[id]`. Komponen utamanya `QuestionManagerContent`; halaman ini memang yang terlihat pada screenshot pengguna dan masih menggunakan Dual-View HTML/LaTeX.
2. State editor: `questionText`, `explanation`, `options` (4 objek A-D dengan `key`, `text`, `image_url`), `statements` (objek `id`, `text`, `image_url`, `correct_val`), `imageUrl`, `questionType`, `maxScore`, serta kunci jawaban single/complex.
3. Load edit mengambil `questions` berdasarkan `exam_id`; `handleEditClick` memetakan `question_text`, `explanation`, `options`, `correct_answers`, `correct_option`, `image_url`, dan `max_score` ke state.
4. Save menulis tabel `questions`: `exam_id`, `question_type`, `question_text`, `image_url`, `max_score`, `explanation`; PG dan PG kompleks menyimpan array opsi dan kunci; matriks menyimpan pernyataan pada `options` serta object kunci per ID; essay menyimpan `options=[]`, `correct_option='ESSAY'`, `correct_answers=null`.
5. Daftar soal, print/PDF, export Excel, dan pratinjau memakai field database yang sama. Tampilan soal dan opsi memakai `MathRenderer`; integrasi editor harus mempertahankan field dan bentuk payload tersebut.
6. `RichTextEditor` menerima `content`, `onChange(html)`, `placeholder`, `editable`, `className`, `minHeight`. Editor mengeluarkan HTML Tiptap. `prepareEditorContent` mengonversi delimiter rumus lama `$...# Roadmap, Arsip Perjalanan, dan Inventaris Rich Text Editor

Terakhir diperbarui: 7 November 2026

## Aturan kerja proyek

- Branch kerja sementara: `editor-test`.
- Branch produksi: `main`; **jangan diubah, di-merge, atau dipromosikan tanpa persetujuan eksplisit pengguna**.
- Laboratorium editor yang dipertahankan: `app/font-test/page.tsx`. Jangan membuat laboratorium pengganti.
- Kerjakan satu tahap pada satu waktu. Setiap tahap harus memiliki: tujuan, file yang diperiksa/diubah, hasil build, hasil uji pengguna, masalah yang ditemukan, perbaikan, dan langkah berikutnya.
- Catat fitur hanya sebagai "berhasil diuji" setelah ada konfirmasi uji pengguna. Build berhasil tidak sama dengan fitur berhasil diuji.
- Sebelum mengubah file, periksa isi dan SHA terbaru. Jangan mengulang fitur yang sudah berhasil; lanjutkan dari catatan ini.
- Jangan mengubah database, skema, penilaian, atau alur ujian kecuali memang diperlukan dan disetujui.

## Status ringkas saat ini

Tahap aktif: **integrasi RichTextEditor ke halaman editor ujian `app/admin/exam/[id]/page.tsx`**.

Yang sudah terintegrasi pada branch ini adalah halaman pengelolaan bank soal/latihan `app/admin/exams/[id]/questions/page.tsx`. Halaman editor ujian `app/admin/exam/[id]/page.tsx` masih memakai Dual-View dan editor HTML/LaTeX lama. Keduanya adalah halaman berbeda; jangan menyatakan integrasi editor ujian selesai sebelum halaman kedua diperbarui dan diuji.

Copy-paste teks Arab dan Aksara Jawa dari Word telah berhasil bagi pengguna. Copy-paste gambar dan rumus matematika Word belum berhasil/ belum didukung dengan benar.

## Milestone yang telah dikonfirmasi pengguna

| Fitur | Status |
|---|---|
| Font Arab Noto Naskh dan Aksara Jawa tampil benar | Berhasil diuji |
| Autosave konten laboratorium `font-test` ke localStorage | Berhasil diuji; hanya penyimpanan lokal browser |
| Upload gambar komputer ke Google Drive | Berhasil diuji |
| Galeri gambar Google Drive | Berhasil diuji |
| Sisipkan gambar dari URL | Berhasil diuji |
| Ekstraksi URL gambar dari halaman hasil Yahoo Images | Berhasil diuji |
| Paste gambar langsung dari hasil pencarian Yahoo pada editor | Berhasil diuji |
| Resize gambar | Berhasil diuji |
| Alignment kiri/tengah/kanan | Berhasil diuji |
| Text wrapping kiri/kanan | Berhasil diuji |
| Rotasi kiri/kanan dan reset | Berhasil diuji |
| Crop gambar dan simpan hasil ke Google Drive | Berhasil diuji untuk sumber yang mendukung; gambar asli tetap ada |
| Crop gambar dari galeri Google Drive melalui proxy same-origin | Berhasil diuji pengguna; hasil tampil di editor dan tersimpan sebagai gambar baru |
| Paste teks Arab dan Aksara Jawa dari Word | Berhasil diuji |
| Integrasi RichTextEditor pada halaman bank soal/latihan | Kode diterapkan; Vercel Preview build berhasil; uji fungsi menyeluruh belum selesai |
| Integrasi RichTextEditor pada halaman editor ujian | Belum dikerjakan |
| Paste gambar langsung dari Microsoft Word | Belum didukung/diuji berhasil |
| Paste rumus matematika Word (Office Math/OMML) | Belum didukung/diuji berhasil |

## Inventaris kode

| File | Fungsi / status |
|---|---|
| `app/font-test/page.tsx` | Laboratorium font dan editor; autosave lokal |
| `components/editor/RichTextEditor.tsx` | Mesin Tiptap; extension teks, matematika, gambar, tabel, alignment, subscript/superscript, warna/font |
| `components/editor/EditorToolbar.tsx` | Toolbar editor dan pemanggilan dialog |
| `components/editor/MathFormulaDialog.tsx` | Dialog penyisipan/pengeditan rumus |
| `components/editor/ImageDialog.tsx` | Upload komputer, galeri Drive, dan URL gambar |
| `components/editor/ResizableImage.tsx` | Resize, alignment, wrapping, rotasi, dan crop |
| `components/editor/ImageCropDialog.tsx` | Seleksi area crop, canvas, upload hasil ke Drive |
| `components/editor/editor.css` | Gaya editor dan kontrol gambar |
| `components/editor/FontSize.ts` | Extension ukuran font |
| `components/editor/TableControls.tsx` | Kontrol tabel |
| `components/MathRenderer.tsx` | Renderer matematika lama yang tetap dipakai di tampilan lain |
| `app/admin/exams/[id]/questions/page.tsx` | Integrasi RichTextEditor pada pengelolaan bank soal/latihan; build berhasil |
| `app/admin/exam/[id]/page.tsx` | Editor ujian; masih Dual-View/editor HTML-LaTeX lama |
| `app/api/google-drive/upload/route.ts` | Upload gambar ke Google Drive |
| `app/api/google-drive/images/route.ts` | Daftar gambar galeri Drive |
| `app/api/google-drive/image/[id]/route.ts` | Proxy same-origin untuk membaca gambar Drive saat crop |
| `lib/google-drive/token-encryption.ts` | Enkripsi/dekripsi token Google Drive |
| `docs/EDITOR-CHANGELOG.md` | Arsip, inventaris, catatan masalah, dan roadmap ini |

## Arsip masalah, percobaan, dan solusi

### A. Crop gambar Google Drive — masalah CORS dan konfigurasi runtime

- Gejala: gambar thumbnail Drive terlihat di editor, tetapi browser canvas tidak dapat membaca gambar karena CORS.
- Solusi: endpoint `app/api/google-drive/image/[id]/route.ts` mengambil byte gambar dari Google Drive melalui server TKA Platform; dialog crop menggunakan endpoint same-origin untuk sumber Drive.
- Kesalahan build berulang pada commit `7baf406`, `ae16d30`, `3fcd40b`, dan `59f1db6`: `Route segment config "runtime" is not compatible with nextConfig.cacheComponents`; penyebabnya deklarasi `export const runtime = 'nodejs'`.
- Pelajaran/perbaikan: pada proyek ini dengan `cacheComponents` aktif, jangan menambahkan deklarasi `runtime` pada Route Handler tersebut. Node.js adalah runtime default. Hapus deklarasi itu; build Preview kemudian berhasil.
- Status: crop melalui galeri Drive dikonfirmasi berhasil oleh pengguna. Sumber eksternal non-Drive tetap dapat gagal jika host tidak mengizinkan CORS.

### B. Integrasi editor bank soal — JSX duplicate attribute

- Commit `b9bc997` gagal TypeScript: `app/admin/exams/[id]/questions/page.tsx(842,239): TS17001 JSX elements cannot have multiple attributes with the same name`.
- Penyebab: prop `placeholder` terpasang dua kali pada satu komponen editor.
- Perbaikan: commit `9623d37` menghapus placeholder duplikat.
- Hasil: deployment Vercel Preview berikutnya berhasil melewati kompilasi, pemeriksaan TypeScript, pembuatan halaman, dan deployment.
- Aturan pencegahan: sebelum commit integrasi JSX, periksa komponen yang baru dipasang agar setiap prop hanya muncul sekali. Jangan menganggap compile sukses saja sebagai bukti semua fungsi sudah benar.

### C. Peringatan saat prerender Google Drive API routes

Pada deployment yang berhasil, log menampilkan pesan saat prerender:
- `/api/google-drive/callback`: penggunaan `request.nextUrl.searchParams) menghasilkan `NEXT_PRERENDER_INTERRUPTED`.
- `/api/google-drive/connect` dan `/api/google-drive/images`: pesan `cookies()` / `HANGING_PROMISE_REJECTION` ketika prerender selesai.

Build tetap berlanjut, seluruh 27 halaman selesai dibuat, route API tercatat sebagai Dynamic (`ƒ`), dan deployment selesai. Jadi ini **bukan build failure** pada deployment tersebut. Namun catat sebagai peringatan runtime/prerender yang perlu ditinjau bila alur OAuth atau galeri Drive menunjukkan masalah; jangan mengubahnya tanpa reproduksi yang jelas.

### D. Peringatan instalasi npm

Log menampilkan:
- `Unknown env config "cache-dir"`.
- `unrs-resolver` install script belum masuk daftar allowScripts.

Pada log yang tersedia, keduanya berupa warning dan tidak menghentikan build. Jangan mengubah konfigurasi dependency hanya untuk menghilangkan warning tanpa memeriksa dampaknya.

## Dokumen uji Microsoft Word

Dokumen yang diserahkan pengguna: **LATIHAN ASSESMENT SUMATIF MATEMATIKA.docx**.

Hasil inspeksi yang dicatat pada sesi sebelumnya:
- 3 halaman dan 25 nomor soal.
- 38 objek Office Math (OMML), termasuk 30 struktur pecahan.
- 5 file gambar tertanam; ditemukan 6 referensi gambar di struktur dokumen.
- Contoh konten mencakup perkalian/pembagian pecahan dan soal cerita.
- Teks Arab dan Aksara Jawa sudah dapat disalin ke editor; gambar dan rumus belum.
- Dokumen ini menjadi fixture/patokan uji utama. Pertahankan rumus dan gambar dari sumber; jangan mengubah atau menyederhanakan isi soal saat menguji konversi.

6. `prepareEditorContent` mengonversi delimiter rumus lama `$...# Roadmap, Arsip Perjalanan, dan Inventaris Rich Text Editor

Terakhir diperbarui: 7 November 2026

## Aturan kerja proyek

- Branch kerja sementara: `editor-test`.
- Branch produksi: `main`; **jangan diubah, di-merge, atau dipromosikan tanpa persetujuan eksplisit pengguna**.
- Laboratorium editor yang dipertahankan: `app/font-test/page.tsx`. Jangan membuat laboratorium pengganti.
- Kerjakan satu tahap pada satu waktu. Setiap tahap harus memiliki: tujuan, file yang diperiksa/diubah, hasil build, hasil uji pengguna, masalah yang ditemukan, perbaikan, dan langkah berikutnya.
- Catat fitur hanya sebagai "berhasil diuji" setelah ada konfirmasi uji pengguna. Build berhasil tidak sama dengan fitur berhasil diuji.
- Sebelum mengubah file, periksa isi dan SHA terbaru. Jangan mengulang fitur yang sudah berhasil; lanjutkan dari catatan ini.
- Jangan mengubah database, skema, penilaian, atau alur ujian kecuali memang diperlukan dan disetujui.

## Status ringkas saat ini

Tahap aktif: **QA integrasi editor pada halaman admin, lalu peningkatan kompatibilitas paste Microsoft Word**.

RichTextEditor sudah diterapkan pada dua halaman admin yang berbeda:
- `app/admin/exams/[id]/questions/page.tsx` — pengelolaan bank soal/latihan.
- `app/admin/exam/[id]/page.tsx` — pengelolaan soal pada ujian; editor teks, opsi, pernyataan matriks, dan pembahasan sudah diganti dengan RichTextEditor.

Pengguna telah mengonfirmasi tampilan editor pada halaman ujian dan desain toolbar ringkas terbaru sudah sesuai. Namun, pengujian menyeluruh alur simpan/buka ulang seluruh tipe soal tetap menjadi QA berikutnya.

Copy-paste teks Arab dan Aksara Jawa dari Word telah berhasil. Paste gambar Word dan konversi rumus Office Math/OMML masih menjadi pekerjaan terpisah.

## Milestone yang telah dikonfirmasi pengguna

| Fitur | Status |
|---|---|
| Font Arab Noto Naskh dan Aksara Jawa tampil benar | Berhasil diuji |
| Autosave konten laboratorium `font-test` ke localStorage | Berhasil diuji; hanya penyimpanan lokal browser |
| Upload gambar komputer ke Google Drive | Berhasil diuji |
| Galeri gambar Google Drive | Berhasil diuji |
| Sisipkan gambar dari URL | Berhasil diuji |
| Ekstraksi URL gambar dari halaman hasil Yahoo Images | Berhasil diuji |
| Paste gambar langsung dari hasil pencarian Yahoo pada editor | Berhasil diuji |
| Resize gambar | Berhasil diuji |
| Alignment kiri/tengah/kanan | Berhasil diuji |
| Text wrapping kiri/kanan | Berhasil diuji |
| Rotasi kiri/kanan dan reset | Berhasil diuji |
| Crop gambar dan simpan hasil ke Google Drive | Berhasil diuji untuk sumber yang mendukung; gambar asli tetap ada |
| Crop gambar dari galeri Google Drive melalui proxy same-origin | Berhasil diuji pengguna; hasil tampil di editor dan tersimpan sebagai gambar baru |
| Paste teks Arab dan Aksara Jawa dari Word | Berhasil diuji |
| Integrasi RichTextEditor pada halaman bank soal/latihan | Sudah terintegrasi; build Preview pernah berhasil; QA alur lengkap masih perlu dipastikan |
| Integrasi RichTextEditor pada halaman editor ujian | Sudah terintegrasi; pengguna mengonfirmasi tampilan editor; QA simpan/buka ulang semua tipe soal masih perlu dilakukan |
| Paste gambar langsung dari Microsoft Word | Belum didukung/diuji berhasil |
| Paste rumus matematika Word (Office Math/OMML) | Belum didukung/diuji berhasil |

## Inventaris kode

| File | Fungsi / status |
|---|---|
| `app/font-test/page.tsx` | Laboratorium font dan editor; autosave lokal |
| `components/editor/RichTextEditor.tsx` | Mesin Tiptap; extension teks, matematika, gambar, tabel, alignment, subscript/superscript, warna/font |
| `components/editor/EditorToolbar.tsx` | Toolbar ringkas satu baris (B, I, U, gambar, rumus, Lainnya) dan toolbar lengkap yang dapat dibuka; tombol pangkat/indeks tetap tersedia di toolbar lengkap |
| `components/editor/MathFormulaDialog.tsx` | Dialog rumus; mendukung pemicu ringkas berupa ikon ∑ dan mode tombol lengkap |
| `components/editor/ImageDialog.tsx` | Upload komputer, galeri Drive, dan URL gambar |
| `components/editor/ResizableImage.tsx` | Resize, alignment, wrapping, rotasi, dan crop |
| `components/editor/ImageCropDialog.tsx` | Seleksi area crop, canvas, upload hasil ke Drive |
| `components/editor/editor.css` | Gaya editor dan kontrol gambar |
| `components/editor/FontSize.ts` | Extension ukuran font |
| `components/editor/TableControls.tsx` | Kontrol tabel |
| `components/MathRenderer.tsx` | Renderer matematika lama yang tetap dipakai di tampilan lain |
| `app/admin/exams/[id]/questions/page.tsx` | Integrasi RichTextEditor pada pengelolaan bank soal/latihan; build berhasil |
| `app/admin/exam/[id]/page.tsx` | RichTextEditor sudah terintegrasi untuk pertanyaan, opsi, pernyataan matriks, dan pembahasan; field gambar lama dan struktur payload dipertahankan |
| `app/api/google-drive/upload/route.ts` | Upload gambar ke Google Drive |
| `app/api/google-drive/images/route.ts` | Daftar gambar galeri Drive |
| `app/api/google-drive/image/[id]/route.ts` | Proxy same-origin untuk membaca gambar Drive saat crop |
| `lib/google-drive/token-encryption.ts` | Enkripsi/dekripsi token Google Drive |
| `docs/EDITOR-CHANGELOG.md` | Arsip, inventaris, catatan masalah, dan roadmap ini |

## Arsip masalah, percobaan, dan solusi

### A. Crop gambar Google Drive — masalah CORS dan konfigurasi runtime

- Gejala: gambar thumbnail Drive terlihat di editor, tetapi browser canvas tidak dapat membaca gambar karena CORS.
- Solusi: endpoint `app/api/google-drive/image/[id]/route.ts` mengambil byte gambar dari Google Drive melalui server TKA Platform; dialog crop menggunakan endpoint same-origin untuk sumber Drive.
- Kesalahan build berulang pada commit `7baf406`, `ae16d30`, `3fcd40b`, dan `59f1db6`: `Route segment config "runtime" is not compatible with nextConfig.cacheComponents`; penyebabnya deklarasi `export const runtime = 'nodejs'`.
- Pelajaran/perbaikan: pada proyek ini dengan `cacheComponents` aktif, jangan menambahkan deklarasi `runtime` pada Route Handler tersebut. Node.js adalah runtime default. Hapus deklarasi itu; build Preview kemudian berhasil.
- Status: crop melalui galeri Drive dikonfirmasi berhasil oleh pengguna. Sumber eksternal non-Drive tetap dapat gagal jika host tidak mengizinkan CORS.

### B. Integrasi editor bank soal — JSX duplicate attribute

- Commit `b9bc997` gagal TypeScript: `app/admin/exams/[id]/questions/page.tsx(842,239): TS17001 JSX elements cannot have multiple attributes with the same name`.
- Penyebab: prop `placeholder` terpasang dua kali pada satu komponen editor.
- Perbaikan: commit `9623d37` menghapus placeholder duplikat.
- Hasil: deployment Vercel Preview berikutnya berhasil melewati kompilasi, pemeriksaan TypeScript, pembuatan halaman, dan deployment.
- Aturan pencegahan: sebelum commit integrasi JSX, periksa komponen yang baru dipasang agar setiap prop hanya muncul sekali. Jangan menganggap compile sukses saja sebagai bukti semua fungsi sudah benar.

### C. Peringatan saat prerender Google Drive API routes

Pada deployment yang berhasil, log menampilkan pesan saat prerender:
- `/api/google-drive/callback`: penggunaan `request.nextUrl.searchParams) menghasilkan `NEXT_PRERENDER_INTERRUPTED`.
- `/api/google-drive/connect` dan `/api/google-drive/images`: pesan `cookies()` / `HANGING_PROMISE_REJECTION` ketika prerender selesai.

Build tetap berlanjut, seluruh 27 halaman selesai dibuat, route API tercatat sebagai Dynamic (`ƒ`), dan deployment selesai. Jadi ini **bukan build failure** pada deployment tersebut. Namun catat sebagai peringatan runtime/prerender yang perlu ditinjau bila alur OAuth atau galeri Drive menunjukkan masalah; jangan mengubahnya tanpa reproduksi yang jelas.

### D. Peringatan instalasi npm

Log menampilkan:
- `Unknown env config "cache-dir"`.
- `unrs-resolver` install script belum masuk daftar allowScripts.

Pada log yang tersedia, keduanya berupa warning dan tidak menghentikan build. Jangan mengubah konfigurasi dependency hanya untuk menghilangkan warning tanpa memeriksa dampaknya.

## Dokumen uji Microsoft Word

Dokumen yang diserahkan pengguna: **LATIHAN ASSESMENT SUMATIF MATEMATIKA.docx**.

Hasil inspeksi yang dicatat pada sesi sebelumnya:
- 3 halaman dan 25 nomor soal.
- 38 objek Office Math (OMML), termasuk 30 struktur pecahan.
- 5 file gambar tertanam; ditemukan 6 referensi gambar di struktur dokumen.
- Contoh konten mencakup perkalian/pembagian pecahan dan soal cerita.
- Teks Arab dan Aksara Jawa sudah dapat disalin ke editor; gambar dan rumus belum.
- Dokumen ini menjadi fixture/patokan uji utama. Pertahankan rumus dan gambar dari sumber; jangan mengubah atau menyederhanakan isi soal saat menguji konversi.

## Audit Tahap 1 — halaman editor ujian (7 November 2026)

Status: **audit selesai; belum ada perubahan kode aplikasi pada tahap audit ini**.

File utama diperiksa:
- `app/admin/exam/[id]/page.tsx` — SHA saat audit: `165e159d1932f9e1796b6dfa3bcf406a76c565a6` (1.582 baris).
- `components/editor/RichTextEditor.tsx` — SHA: `684dafecb9de3caf8ade8c8a4701f09b0a88e895`.
- `components/MathRenderer.tsx` — SHA: `32a96323ca52fd6fcc0f8544338e15301ddf55db`.
- `components/editor/EditorToolbar.tsx` — SHA: `f7fe59fa3b0061cb4cd67ab1151748953e562c5e`.
- `app/admin/exams/[id]/questions/page.tsx` — SHA: `662ab2155d0781b9db3ac28df97c55262b1bddf7` (referensi integrasi editor yang sudah ada).

Temuan alur dan struktur:
1. Halaman `app/admin/exam/[id]/page.tsx` adalah halaman Kelola Soal untuk ujian pada URL `/admin/exam/[id]`. Komponen utamanya `QuestionManagerContent`; halaman ini memang yang terlihat pada screenshot pengguna dan masih menggunakan Dual-View HTML/LaTeX.
2. State editor: `questionText`, `explanation`, `options` (4 objek A-D dengan `key`, `text`, `image_url`), `statements` (objek `id`, `text`, `image_url`, `correct_val`), `imageUrl`, `questionType`, `maxScore`, serta kunci jawaban single/complex.
3. Load edit mengambil `questions` berdasarkan `exam_id`; `handleEditClick` memetakan `question_text`, `explanation`, `options`, `correct_answers`, `correct_option`, `image_url`, dan `max_score` ke state.
4. Save menulis tabel `questions`: `exam_id`, `question_type`, `question_text`, `image_url`, `max_score`, `explanation`; PG dan PG kompleks menyimpan array opsi dan kunci; matriks menyimpan pernyataan pada `options` serta object kunci per ID; essay menyimpan `options=[]`, `correct_option='ESSAY'`, `correct_answers=null`.
5. Daftar soal, print/PDF, export Excel, dan pratinjau memakai field database yang sama. Tampilan soal dan opsi memakai `MathRenderer`; integrasi editor harus mempertahankan field dan bentuk payload tersebut.
6. `RichTextEditor` menerima `content`, `onChange(html)`, `placeholder`, `editable`, `className`, `minHeight`. Editor mengeluarkan HTML Tiptap. `prepareEditorContent` mengonversi delimiter rumus lama `$...# Roadmap, Arsip Perjalanan, dan Inventaris Rich Text Editor

Terakhir diperbarui: 7 November 2026

## Aturan kerja proyek

- Branch kerja sementara: `editor-test`.
- Branch produksi: `main`; **jangan diubah, di-merge, atau dipromosikan tanpa persetujuan eksplisit pengguna**.
- Laboratorium editor yang dipertahankan: `app/font-test/page.tsx`. Jangan membuat laboratorium pengganti.
- Kerjakan satu tahap pada satu waktu. Setiap tahap harus memiliki: tujuan, file yang diperiksa/diubah, hasil build, hasil uji pengguna, masalah yang ditemukan, perbaikan, dan langkah berikutnya.
- Catat fitur hanya sebagai "berhasil diuji" setelah ada konfirmasi uji pengguna. Build berhasil tidak sama dengan fitur berhasil diuji.
- Sebelum mengubah file, periksa isi dan SHA terbaru. Jangan mengulang fitur yang sudah berhasil; lanjutkan dari catatan ini.
- Jangan mengubah database, skema, penilaian, atau alur ujian kecuali memang diperlukan dan disetujui.

## Status ringkas saat ini

Tahap aktif: **integrasi RichTextEditor ke halaman editor ujian `app/admin/exam/[id]/page.tsx`**.

Yang sudah terintegrasi pada branch ini adalah halaman pengelolaan bank soal/latihan `app/admin/exams/[id]/questions/page.tsx`. Halaman editor ujian `app/admin/exam/[id]/page.tsx` masih memakai Dual-View dan editor HTML/LaTeX lama. Keduanya adalah halaman berbeda; jangan menyatakan integrasi editor ujian selesai sebelum halaman kedua diperbarui dan diuji.

Copy-paste teks Arab dan Aksara Jawa dari Word telah berhasil bagi pengguna. Copy-paste gambar dan rumus matematika Word belum berhasil/ belum didukung dengan benar.

## Milestone yang telah dikonfirmasi pengguna

| Fitur | Status |
|---|---|
| Font Arab Noto Naskh dan Aksara Jawa tampil benar | Berhasil diuji |
| Autosave konten laboratorium `font-test` ke localStorage | Berhasil diuji; hanya penyimpanan lokal browser |
| Upload gambar komputer ke Google Drive | Berhasil diuji |
| Galeri gambar Google Drive | Berhasil diuji |
| Sisipkan gambar dari URL | Berhasil diuji |
| Ekstraksi URL gambar dari halaman hasil Yahoo Images | Berhasil diuji |
| Paste gambar langsung dari hasil pencarian Yahoo pada editor | Berhasil diuji |
| Resize gambar | Berhasil diuji |
| Alignment kiri/tengah/kanan | Berhasil diuji |
| Text wrapping kiri/kanan | Berhasil diuji |
| Rotasi kiri/kanan dan reset | Berhasil diuji |
| Crop gambar dan simpan hasil ke Google Drive | Berhasil diuji untuk sumber yang mendukung; gambar asli tetap ada |
| Crop gambar dari galeri Google Drive melalui proxy same-origin | Berhasil diuji pengguna; hasil tampil di editor dan tersimpan sebagai gambar baru |
| Paste teks Arab dan Aksara Jawa dari Word | Berhasil diuji |
| Integrasi RichTextEditor pada halaman bank soal/latihan | Kode diterapkan; Vercel Preview build berhasil; uji fungsi menyeluruh belum selesai |
| Integrasi RichTextEditor pada halaman editor ujian | Belum dikerjakan |
| Paste gambar langsung dari Microsoft Word | Belum didukung/diuji berhasil |
| Paste rumus matematika Word (Office Math/OMML) | Belum didukung/diuji berhasil |

## Inventaris kode

| File | Fungsi / status |
|---|---|
| `app/font-test/page.tsx` | Laboratorium font dan editor; autosave lokal |
| `components/editor/RichTextEditor.tsx` | Mesin Tiptap; extension teks, matematika, gambar, tabel, alignment, subscript/superscript, warna/font |
| `components/editor/EditorToolbar.tsx` | Toolbar editor dan pemanggilan dialog |
| `components/editor/MathFormulaDialog.tsx` | Dialog penyisipan/pengeditan rumus |
| `components/editor/ImageDialog.tsx` | Upload komputer, galeri Drive, dan URL gambar |
| `components/editor/ResizableImage.tsx` | Resize, alignment, wrapping, rotasi, dan crop |
| `components/editor/ImageCropDialog.tsx` | Seleksi area crop, canvas, upload hasil ke Drive |
| `components/editor/editor.css` | Gaya editor dan kontrol gambar |
| `components/editor/FontSize.ts` | Extension ukuran font |
| `components/editor/TableControls.tsx` | Kontrol tabel |
| `components/MathRenderer.tsx` | Renderer matematika lama yang tetap dipakai di tampilan lain |
| `app/admin/exams/[id]/questions/page.tsx` | Integrasi RichTextEditor pada pengelolaan bank soal/latihan; build berhasil |
| `app/admin/exam/[id]/page.tsx` | Editor ujian; masih Dual-View/editor HTML-LaTeX lama |
| `app/api/google-drive/upload/route.ts` | Upload gambar ke Google Drive |
| `app/api/google-drive/images/route.ts` | Daftar gambar galeri Drive |
| `app/api/google-drive/image/[id]/route.ts` | Proxy same-origin untuk membaca gambar Drive saat crop |
| `lib/google-drive/token-encryption.ts` | Enkripsi/dekripsi token Google Drive |
| `docs/EDITOR-CHANGELOG.md` | Arsip, inventaris, catatan masalah, dan roadmap ini |

## Arsip masalah, percobaan, dan solusi

### A. Crop gambar Google Drive — masalah CORS dan konfigurasi runtime

- Gejala: gambar thumbnail Drive terlihat di editor, tetapi browser canvas tidak dapat membaca gambar karena CORS.
- Solusi: endpoint `app/api/google-drive/image/[id]/route.ts` mengambil byte gambar dari Google Drive melalui server TKA Platform; dialog crop menggunakan endpoint same-origin untuk sumber Drive.
- Kesalahan build berulang pada commit `7baf406`, `ae16d30`, `3fcd40b`, dan `59f1db6`: `Route segment config "runtime" is not compatible with nextConfig.cacheComponents`; penyebabnya deklarasi `export const runtime = 'nodejs'`.
- Pelajaran/perbaikan: pada proyek ini dengan `cacheComponents` aktif, jangan menambahkan deklarasi `runtime` pada Route Handler tersebut. Node.js adalah runtime default. Hapus deklarasi itu; build Preview kemudian berhasil.
- Status: crop melalui galeri Drive dikonfirmasi berhasil oleh pengguna. Sumber eksternal non-Drive tetap dapat gagal jika host tidak mengizinkan CORS.

### B. Integrasi editor bank soal — JSX duplicate attribute

- Commit `b9bc997` gagal TypeScript: `app/admin/exams/[id]/questions/page.tsx(842,239): TS17001 JSX elements cannot have multiple attributes with the same name`.
- Penyebab: prop `placeholder` terpasang dua kali pada satu komponen editor.
- Perbaikan: commit `9623d37` menghapus placeholder duplikat.
- Hasil: deployment Vercel Preview berikutnya berhasil melewati kompilasi, pemeriksaan TypeScript, pembuatan halaman, dan deployment.
- Aturan pencegahan: sebelum commit integrasi JSX, periksa komponen yang baru dipasang agar setiap prop hanya muncul sekali. Jangan menganggap compile sukses saja sebagai bukti semua fungsi sudah benar.

### C. Peringatan saat prerender Google Drive API routes

Pada deployment yang berhasil, log menampilkan pesan saat prerender:
- `/api/google-drive/callback`: penggunaan `request.nextUrl.searchParams) menghasilkan `NEXT_PRERENDER_INTERRUPTED`.
- `/api/google-drive/connect` dan `/api/google-drive/images`: pesan `cookies()` / `HANGING_PROMISE_REJECTION` ketika prerender selesai.

Build tetap berlanjut, seluruh 27 halaman selesai dibuat, route API tercatat sebagai Dynamic (`ƒ`), dan deployment selesai. Jadi ini **bukan build failure** pada deployment tersebut. Namun catat sebagai peringatan runtime/prerender yang perlu ditinjau bila alur OAuth atau galeri Drive menunjukkan masalah; jangan mengubahnya tanpa reproduksi yang jelas.

### D. Peringatan instalasi npm

Log menampilkan:
- `Unknown env config "cache-dir"`.
- `unrs-resolver` install script belum masuk daftar allowScripts.

Pada log yang tersedia, keduanya berupa warning dan tidak menghentikan build. Jangan mengubah konfigurasi dependency hanya untuk menghilangkan warning tanpa memeriksa dampaknya.

## Dokumen uji Microsoft Word

Dokumen yang diserahkan pengguna: **LATIHAN ASSESMENT SUMATIF MATEMATIKA.docx**.

Hasil inspeksi yang dicatat pada sesi sebelumnya:
- 3 halaman dan 25 nomor soal.
- 38 objek Office Math (OMML), termasuk 30 struktur pecahan.
- 5 file gambar tertanam; ditemukan 6 referensi gambar di struktur dokumen.
- Contoh konten mencakup perkalian/pembagian pecahan dan soal cerita.
- Teks Arab dan Aksara Jawa sudah dapat disalin ke editor; gambar dan rumus belum.
- Dokumen ini menjadi fixture/patokan uji utama. Pertahankan rumus dan gambar dari sumber; jangan mengubah atau menyederhanakan isi soal saat menguji konversi.

 dan `$...$` menjadi node matematika Tiptap ketika konten dibuka.
7. `MathRenderer` mendukung node Tiptap `data-type="inline-math"/"block-math"` serta delimiter matematika lama. Ini jalur kompatibilitas yang harus dipertahankan.
8. Editor ujian memiliki field gambar terpisah `image_url`, opsi dan pernyataan juga memiliki `image_url`. Saat RichTextEditor mendukung gambar inline, jangan hapus field lama; dua cara penyimpanan gambar perlu tetap terbaca.
9. Halaman bank soal/latihan `app/admin/exams/[id]/questions/page.tsx` sudah menjadi contoh integrasi RichTextEditor, tetapi bukan halaman yang sama dengan `/admin/exam/[id]`.

Keputusan implementasi Tahap 1:
- Ganti area Dual-View pertanyaan dengan RichTextEditor.
- Gunakan RichTextEditor untuk teks opsi A-D, teks pernyataan matriks, dan pembahasan.
- Pertahankan radio/checkbox/select kunci jawaban, bobot nilai, tipe soal, URL gambar lama, dan bentuk payload database.
- Jangan mengubah proses load, export, print, delete, atau perhitungan skor kecuali ditemukan kebutuhan yang terbukti.
- Gunakan `MathRenderer` yang sudah ada untuk output daftar/cetak; verifikasi HTML hasil Tiptap tampil benar di sana.
- Formula lama harus tetap bisa diedit dan disimpan tanpa konversi destruktif.

Batasan yang ditemukan:
- Konversi regex di `prepareEditorContent` hanya mengenali delimiter dolar; itu **belum** merupakan parser Office Math/OMML.
- Paste gambar Word dan OMML belum boleh dinyatakan didukung hanya karena editor dapat menyisipkan gambar atau rumus melalui toolbar.
- Tidak ada file kode aplikasi yang diubah selama audit ini; belum ada deployment baru dari tahap audit.

Langkah berikutnya: implementasi integrasi RichTextEditor ke halaman `app/admin/exam/[id]/page.tsx` sebagai perubahan terpisah. Setelah perubahan, build Preview dan uji simpan/buka ulang semua tipe soal sebelum lanjut ke paste gambar dan konversi OMML.

## Implementasi Tahap 1 — RichTextEditor pada halaman editor ujian (7 November 2026)

Status: **kode diterapkan di `editor-test`; menunggu hasil build Vercel Preview dan pengujian pengguna**.

Perubahan:
- Commit implementasi: `af55782080810ffd4e60f636763b3f60aac250b4`.
- Commit validasi konten dan penanganan pembahasan kosong: `60a674da9695bfe3b80944926e2fcbc19639c6f6`.
- File aplikasi yang diubah: `app/admin/exam/[id]/page.tsx`.
- Menambahkan import dan 5 pemakaian `RichTextEditor`: stimulus/pertanyaan, pilihan A-D (dua cabang UI PG dan PG kompleks), pernyataan matriks, dan pembahasan.
- Menghapus UI Dual-View/textarea HTML-LaTeX dan helper sisip kode lama dari form pertanyaan.
- Menambahkan validasi konten rich text untuk pertanyaan, pilihan A-D, dan pernyataan. Konten teks, gambar inline, serta node matematika dihitung sebagai konten.
- Pembahasan kosong tetap disimpan sebagai `null`, bukan HTML kosong.

Yang sengaja dipertahankan:
- Nama dan bentuk kolom database `questions`.
- `question_type`, `max_score`, `image_url`, `explanation`.
- Bentuk `options` sebagai array objek A-D atau pernyataan matriks.
- `correct_option` dan `correct_answers` untuk PG tunggal, PG kompleks, matriks, dan essay.
- Field URL gambar lama pada soal, opsi, dan pernyataan.
- Alur load/edit, daftar soal, MathRenderer, export Excel, cetak, dan hapus.
- Tidak ada perubahan skema/database dan tidak ada perubahan pada branch `main`.

Pemeriksaan kode setelah perubahan:
- Dual-View dan textarea lama pada field pertanyaan/pembahasan sudah tidak ada.
- Lima instance RichTextEditor ditemukan.
- Pemeriksaan struktur kode menunjukkan payload opsi dan kunci jawaban lama tetap dipakai.
- Pemeriksaan ini bukan pengganti TypeScript build dan uji browser.

Hasil build: **belum diketahui** pada saat catatan dibuat.
Hasil uji pengguna: **belum dilakukan**.
Masalah baru: belum ada error build yang dikonfirmasi dari perubahan ini.
Langkah berikutnya: tunggu Preview READY; lalu uji load soal lama, tambah/edit PG, PG kompleks, matriks, essay, simpan, buka ulang, preview/cetak. Jangan lanjut paste Word/OMML sebelum tahap ini lolos.

## Catatan deployment integrasi editor ujian — 7 November 2026

### Deployment gagal: commit `af55782080810ffd4e60f636763b3f60aac250b4`
- Status: **ERROR saat parsing source**, sebelum TypeScript.
- File: `app/admin/exam/[id]/page.tsx`, baris 64.
- Pesan: `Expected unicode escape`.
- Akar masalah: regex pada helper `hasRichContent` tersimpan dengan jumlah backslash berlebih, sehingga pola regex menjadi sintaks JavaScript tidak valid.
- Ini adalah kesalahan penulisan kode saat membangun helper validasi, bukan masalah Tiptap atau data database.
- Pencegahan: setelah menulis regex melalui GitHub API/serialisasi string, periksa isi file mentah yang tersimpan (jumlah backslash) sebelum menunggu deployment. Untuk pola HTML sederhana, gunakan regex yang lebih sederhana atau hindari escaping berlapis.

### Deployment berhasil: commit `14569617419b67681d9ce9f05dc6aae8d3d60a03`
- Status: **READY / Deployment completed** berdasarkan log yang diberikan pengguna.
- Build berhasil: Turbopack compile, TypeScript selesai, static pages selesai, dan output berhasil di-deploy.
- Route `/admin/exam/[id]` terdaftar sebagai Partial Prerender.
- Route API Google Drive terdaftar sebagai Dynamic (`ƒ`).
- Log saat static generation menampilkan pesan `NEXT_PRERENDER_INTERRUPTED` pada callback dan pesan cookies/prerender pada connect/images. Meskipun demikian, proses build berlanjut sampai selesai dan deployment sukses. Catat sebagai pesan saat prerender, bukan kegagalan build; tetap pantau fungsi OAuth/galeri saat diuji langsung.
- Peringatan npm `Unknown env config "cache-dir"` dan `unrs-resolver install-scripts` bukan penyebab kegagalan pada dua log ini.

### Pelajaran yang harus dipakai untuk langkah berikutnya
1. Bedakan error yang menghentikan build dari warning/pesan prerender yang tidak menghentikan build.
2. Jangan menyebut sebuah perubahan sukses hanya karena commit ada; cek status deployment READY.
3. Catat commit gagal dan penyebab spesifiknya agar tidak mengulang diagnosis.
4. Commit `1456961` hanya membuktikan build/deployment sukses, belum membuktikan semua interaksi editor dan penyimpanan soal berfungsi. Uji browser tetap wajib.

## Roadmap berurutan

### Tahap 0 — Arsip dan inventaris
- [x] Menetapkan `editor-test` sebagai branch kerja sementara.
- [x] Menetapkan `main` tidak disentuh.
- [x] Mengarsipkan milestone, inventaris file, build failure, warning, dan solusi pada dokumen ini.
- [x] Memastikan perbedaan halaman bank soal dan halaman editor ujian tercatat.

### Tahap 1 — Integrasi halaman editor ujian
- [x] Audit alur state, load/save, tipe soal, pilihan, pernyataan benar-salah, pembahasan, renderer, dan validasi; hasil dicatat pada bagian Audit Tahap 1.
- [x] Integrasikan RichTextEditor pada pertanyaan, opsi, pernyataan matriks, dan pembahasan tanpa mengganti struktur payload; Preview build READY pada commit `1456961`, uji browser masih menunggu.
- [ ] Pertahankan kompatibilitas konten lama HTML/LaTeX.
- [ ] Cek JSX agar tidak ada prop duplikat sebelum commit.
- [ ] Deploy Preview; catat commit dan hasil build.
- [ ] Pengguna menguji membuat, mengedit, menyimpan, dan membuka ulang soal.

### Tahap 2 — Paste gambar Word
- [ ] Audit clipboard paste Tiptap saat ini.
- [ ] Deteksi item gambar dari clipboard (mis. image/png) dan/atau HTML Word.
- [ ] Upload gambar clipboard ke endpoint Google Drive yang sudah ada.
- [ ] Masukkan URL gambar hasil upload di posisi kursor.
- [ ] Uji beberapa gambar, ukuran besar, dan paste berulang; pastikan tidak membuat duplikasi yang tidak perlu.

### Tahap 3 — Konversi rumus Word (OMML)
- [ ] Ambil struktur OMML dari dokumen uji dan petakan elemen yang benar-benar digunakan.
- [ ] Tentukan parser/konverter OMML ke representasi matematika yang diterima Tiptap/KaTeX.
- [ ] Implementasikan konversi bertahap, mulai pecahan, operasi, pangkat, akar, dan tanda kurung.
- [ ] Jangan menghapus atau merusak rumus yang belum didukung; sediakan fallback yang jelas.
- [ ] Bandingkan hasil editor dan hasil tampilan siswa dengan dokumen sumber.

### Tahap 4 — QA kompatibilitas
- [ ] Soal lama HTML/LaTeX.
- [ ] Semua tipe soal dan opsi/kunci jawaban.
- [ ] Gambar, rumus, tabel, Arab, Aksara Jawa, dan paste Word.
- [ ] Simpan, buka ulang, dan edit ulang.
- [ ] Renderer tampilan siswa, hasil ujian, analisis, dan cetak.
- [ ] Pastikan skor, bobot, dan penilaian tidak berubah.

### Tahap 5 — Penutupan
- [ ] Arsipkan hasil uji dan daftar file final.
- [ ] Pastikan seluruh Preview test lulus.
- [ ] Minta persetujuan eksplisit sebelum merge/promosi ke `main`.

## Format catatan untuk setiap tahap berikutnya

Setiap penyelesaian tahap harus menambahkan:
1. Tanggal dan nomor tahap.
2. Tujuan.
3. File yang diperiksa/diubah.
4. Commit SHA dan tautan Preview (jika ada).
5. Hasil build (lulus/gagal dan pesan error utama).
6. Hasil pengujian pengguna (jangan klaim lulus sebelum dikonfirmasi).
7. Masalah yang muncul, penyebab, solusi, dan cara mencegah pengulangan.
8. Roadmap tahap berikutnya.



## Penyederhanaan form editor ujian — 7 November 2026

Status: **implementasi tersimpan di `editor-test`; menunggu build Preview dan uji pengguna**.

Commit:
- `f08e091dccbcb919bcd1b0d1c533f3344fa77309` — penyederhanaan form dan dropdown pembahasan.
- `9c7c95c46eb4ede5fc97519da90650c7b3a903a6` — menghapus sisa input URL gambar opsi PG kompleks.

File aplikasi diubah:
- `app/admin/exam/[id]/page.tsx`.

Perubahan:
- Input URL gambar soal dihilangkan dari form.
- Input URL gambar pilihan A-D dihilangkan dari kedua cabang UI (PG biasa dan PG kompleks).
- Input URL gambar pernyataan matriks dihilangkan.
- Gambar lama yang masih memiliki `image_url` tetap ditampilkan sebagai pratinjau.
- RichTextEditor pembahasan/pedoman penskoran ditempatkan di dropdown `details/summary`, tertutup secara default.
- Gambar baru diarahkan melalui tombol gambar pada RichTextEditor.

Kompatibilitas yang dipertahankan:
- State dan payload `image_url` lama tetap ada.
- Fungsi normalisasi masih membaca gambar lama pada opsi/pernyataan.
- Render daftar soal/cetak yang membaca `image_url` tidak diubah.
- Tidak ada perubahan skema database, tipe soal, kunci, bobot, atau penilaian.

Verifikasi kode setelah perubahan:
- Input URL gambar soal, opsi, dan pernyataan sudah tidak ada pada form.
- Dropdown pembahasan ditemukan.
- Field legacy `image_url` tetap dimuat/disimpan.
- Build Preview dan uji browser: **menunggu**.

### Rencana editor jawaban siswa (tahap terpisah)

Audit awal menemukan:
- Halaman siswa: `app/exam/[id]/page.tsx`.
- Jawaban uraian sekarang menggunakan `textarea`.
- Handler `handleEssayChange` menyimpan string ke state dan menggunakan mekanisme autosave ke `answers.user_answer`, dengan cadangan localStorage.
- Skema jawaban yang ada dapat menampung string HTML tanpa kolom baru, tetapi perlu uji kompatibilitas pada halaman rekap dan koreksi.
- `app/admin/exam/[id]/results/page.tsx` dan `app/exam/[id]/summary/page.tsx` perlu diperiksa untuk memastikan jawaban HTML/rumus dirender sebagai konten, bukan teks mentah.
- Implementasi yang direncanakan: textarea tetap menjadi mode sederhana; siswa dapat membuka editor matematika saat dibutuhkan. Toolbar siswa harus lebih terbatas daripada toolbar guru, tanpa kontrol admin/galeri gambar.
- Belum ada perubahan pada halaman siswa; belum ada perubahan database.

Langkah berikutnya:
1. Tunggu Preview READY untuk commit penyederhanaan form.
2. Uji form guru: tambah/edit soal, gambar inline, gambar legacy, dan buka/tutup pembahasan.
3. Setelah tahap form lolos, kerjakan editor jawaban siswa sebagai tahap tersendiri.


## Toolbar RichTextEditor ringkas dan responsif — 7 November 2026

Status: **kode diterapkan pada branch `editor-test`; menunggu build Vercel Preview dan uji browser pengguna**.

Commit:
- `5cfcda56d6d46a323594c2ce20969a0c3bffea3e` — implementasi toolbar satu baris dan dropdown.
- `3405bc6ca60f664374087ae9e322910d8507c18f` — perbaikan penulisan template literal JSX setelah inspeksi file tersimpan.

File aplikasi diubah:
- `components/editor/EditorToolbar.tsx`.

Perubahan tampilan:
- Toolbar sekarang tertutup secara default.
- Baris ringkas selalu satu baris (`flex-nowrap`) dan dapat digeser horizontal bila lebar layar sangat sempit.
- Tombol cepat: tebal, miring, garis bawah, pangkat, dan indeks bawah.
- Tombol `Lainnya ⌄` membuka empat baris toolbar lengkap yang sudah ada; tombol berubah menjadi `Tutup ⌃`.
- Kontrol tabel kontekstual hanya tampil saat toolbar lengkap dibuka.
- Dialog gambar tetap dipasang dan perilaku upload/galeri/crop tidak diubah.

Kompatibilitas yang dipertahankan:
- Semua kontrol lengkap sebelumnya tetap ada: coretan, jenis paragraf, font, ukuran, warna, sorotan, perataan, daftar, tabel, gambar, rumus, undo, dan redo.
- Tidak mengubah mesin Tiptap, konten HTML, autosave, penyimpanan, database, atau penilaian.
- Tidak mengubah `editor.css` karena tata letak toolbar ditangani oleh kelas responsif pada komponen.
- Tidak mengubah branch `main`.

Pemeriksaan kode setelah perubahan:
- Toolbar state awal `false` (tertutup).
- Baris ringkas memakai `flex-nowrap` dan `overflow-x-auto`.
- Tombol dropdown memiliki `aria-expanded`.
- Empat baris lama dirender kondisional saat dropdown terbuka.
- Dialog gambar tetap tersedia.
- Pemeriksaan ini adalah inspeksi struktur kode, **bukan** hasil TypeScript build.

Hasil build Vercel Preview: **menunggu**.
Hasil uji pengguna desktop/HP: **menunggu**.
Masalah build baru: belum diketahui.

Langkah uji setelah deployment READY:
1. Buka halaman editor soal dan pastikan toolbar awal hanya satu baris.
2. Tekan `Lainnya`; pastikan empat baris lengkap tampil.
3. Tekan `Tutup`; pastikan kembali ringkas.
4. Uji tombol cepat B, I, U, x², dan x₂.
5. Uji fitur lengkap terutama font Arab/Jawa, warna, rumus, gambar, tabel, undo/redo.
6. Uji lebar layar HP; pastikan toolbar tidak membungkus menjadi beberapa baris. Bila tombol tidak muat, geser baris secara horizontal.

Roadmap:
- Tunggu Preview READY dan uji tampilan ringkas/lengkap pada desktop serta HP.
- Jika lolos, lanjutkan tahap berikutnya sesuai roadmap editor; jangan merge/promosikan ke `main` tanpa persetujuan eksplisit.


## Tombol cepat toolbar: gambar dan rumus matematika — 7 November 2026

Status: **diterapkan pada branch `editor-test`; menunggu Vercel Preview READY dan uji pengguna**.

Commit:
- `6a0c52a33b9066923ddd785f796faf80e8cfbb3e` — dukungan tombol ringkas pada pemicu dialog rumus.
- `5a8b1fa93e2dd4a18324540f3fa0d0d1989eb702` — tombol cepat gambar dan rumus menggantikan pangkat/indeks bawah.

File diubah:
- `components/editor/EditorToolbar.tsx`
- `components/editor/MathFormulaDialog.tsx`

Perubahan:
- Baris ringkas kini berisi Tebal, Miring, Garis bawah, Sisipkan gambar, Rumus matematika (∑), dan Lainnya.
- Tombol gambar membuka dialog gambar yang sudah ada; alur upload, galeri Google Drive, URL, dan crop tidak diubah.
- Tombol ∑ membuka dialog rumus yang sama dengan semua jenis rumus yang telah tersedia.
- Tombol pangkat dan indeks bawah tetap tersedia di toolbar lengkap; hanya dipindahkan dari baris ringkas.
- Pemicu rumus mendukung mode ringkas melalui prop opsional `compact`; penggunaan lama tetap menampilkan label “∑ Rumus Matematika”.

Pemeriksaan kode:
- Tombol cepat gambar terhubung ke `setImageOpen(true)`.
- Tombol cepat rumus menggunakan `MathFormulaDialog` yang sama.
- Pangkat dan indeks bawah tetap ada pada toolbar lengkap.
- Pemeriksaan struktur file lolos; ini bukan pengganti build Vercel.

Build Vercel Preview: **menunggu**.
Uji pengguna: **menunggu**.
Tidak ada perubahan database, konten, autosave, scoring, atau branch `main`.

Langkah uji:
1. Pastikan baris ringkas menampilkan ikon gambar dan ∑, bukan x²/x₂.
2. Klik ikon gambar dan uji dialog gambar.
3. Klik ∑ dan pastikan dialog rumus terbuka serta dapat menyisipkan pecahan/akar/simbol.
4. Buka Lainnya dan pastikan pangkat serta indeks bawah masih tersedia.
5. Uji pada layar HP.


## Pembaruan status dan hasil uji — toolbar ringkas (7 November 2026)

Status: **berhasil diuji dan disetujui pengguna**.

Pengguna mengonfirmasi bahwa toolbar ringkas terbaru sudah sesuai dengan kebutuhan. Ini memperbarui catatan toolbar sebelumnya.

Desain akhir toolbar:
- Baris ringkas selalu satu baris dan dapat digeser horizontal pada layar sempit/HP.
- Tombol cepat: **B** (tebal), **I** (miring), **U** (garis bawah), **▧** (sisipkan gambar), **∑** (rumus matematika), dan **Lainnya**.
- Tombol **Lainnya** membuka toolbar lengkap yang mempertahankan fitur format lanjutan, termasuk pangkat dan indeks bawah.
- Tombol gambar membuka `ImageDialog` yang sudah ada; tidak membuat alur upload baru.
- Tombol rumus memakai `MathFormulaDialog` yang sama dengan toolbar lengkap, hanya pemicunya dibuat ringkas.
- Toolbar lengkap dapat ditutup kembali melalui tombol **Tutup**.

File dan perubahan:
- `components/editor/EditorToolbar.tsx`: toolbar ringkas, tombol gambar, tombol Lainnya, serta toolbar lengkap yang dapat dibuka/tutup.
- `components/editor/MathFormulaDialog.tsx`: prop opsional `compact`; mode ringkas menampilkan ikon ∑ dengan label aksesibilitas dan tetap memakai dialog rumus yang sama.
- `docs/EDITOR-CHANGELOG.md`: inventaris dan catatan progres.
- Commit kode toolbar: `5a8b1fa93e2dd4a18324540f3fa0d0d1989eb702`.
- Commit dukungan pemicu rumus ringkas: `6a0c52a33b9066923ddd785f796faf80e8cfbb3e`.
- Commit dokumentasi terbaru: `a06d59c309fd27f7a3917c738cca5f3b98061151`.

Pemeriksaan deployment:
- Vercel Preview untuk commit dokumentasi terbaru `a06d59c309fd27f7a3917c738cca5f3b98061151` berstatus **READY**.
- URL deployment spesifik: https://grisan-mqkxz7f3l-heins14.vercel.app
- Deployment untuk commit perantara `5a8b1fa` berstatus CANCELED karena deployment berikutnya berjalan; bukan kegagalan build yang perlu diperbaiki.
- Deployment commit `6a0c52a` berstatus READY.
- Pengguna telah menguji hasil terbaru dan menyatakan sudah sesuai.
- Branch `main`, database, skema, scoring, dan alur penyimpanan soal tidak diubah oleh pekerjaan toolbar ini.

## Inventaris toolbar terkini

| Bagian | Implementasi aktif | Status |
|---|---|---|
| Toolbar cepat | B / I / U / ▧ / ∑ / Lainnya | Berhasil diuji pengguna |
| Sisip gambar | Memanggil `ImageDialog` yang sudah ada | Berhasil diuji pengguna dari toolbar |
| Rumus matematika | Memanggil `MathFormulaDialog` dalam mode compact | Berhasil diuji pengguna sebagai bagian toolbar |
| Toolbar lengkap | Format teks, font, warna, alignment, list, tabel, pangkat, indeks bawah, dan kontrol lanjutan | Pengguna mengonfirmasi tombol-tombol yang dicoba berfungsi; uji simpan/buka ulang lintas tipe soal masih terpisah |
| Tampilan HP | Satu baris, horizontal scroll; toolbar lengkap tersembunyi sampai Lainnya ditekan | Berhasil diuji pengguna secara tampilan |

## Roadmap aktif yang telah ditinjau ulang

Urutan kerja berikut menggantikan status lama yang tertinggal di bagian roadmap sebelumnya. Jangan mengulang pekerjaan yang sudah ditandai berhasil.

### Tahap 1A — QA editor admin dan toolbar
- [x] Uji tombol Lainnya/Tutup: toolbar lengkap dapat dibuka dan ditutup kembali — berhasil dikonfirmasi pengguna.
- [x] Uji tombol/fitur toolbar lengkap lainnya yang dicoba pengguna; dikonfirmasi berfungsi.
- [x] Uji tombol rumus ringkas: tambah rumus pecahan pada soal yang sudah ada, simpan, buka ulang, dan pastikan rumus tetap tampil benar — berhasil dikonfirmasi pengguna.
- [x] Uji tombol gambar dari toolbar ringkas — pengguna mengonfirmasi berfungsi.
- [ ] Uji lebih lanjut perilaku selection/kursor saat menyisipkan gambar dan rumus.
- [ ] Uji simpan, buka ulang, dan edit ulang untuk PG tunggal, PG kompleks, matriks benar-salah, dan essay; uji toolbar pada PG kompleks, matriks, dan essay sudah dikonfirmasi, tetapi roundtrip simpan/buka ulang per tipe belum dicatat.
- [ ] Pastikan gambar inline, node matematika, HTML lama, dan pembahasan tetap tampil pada daftar/pratinjau/cetak.
- [ ] Pastikan bobot, kunci jawaban, struktur opsi, dan skor tidak berubah.

### Tahap 2 — Paste gambar Microsoft Word
- [ ] Audit event paste dan clipboard yang diterima oleh Tiptap saat ini.
- [ ] Gunakan dokumen uji `LATIHAN ASSESMENT SUMATIF MATEMATIKA.docx` sebagai fixture.
- [ ] Uji paste gambar dari Word; tentukan apakah clipboard membawa file gambar, HTML dengan blob, atau referensi internal.
- [ ] Jika perlu, implementasikan penanganan gambar clipboard yang aman dan unggah hasilnya ke Google Drive melalui alur yang sudah ada.
- [ ] Pastikan kegagalan upload/paste tidak menghapus teks atau konten yang sudah ada.

### Tahap 3 — Paste rumus Microsoft Word (OMML)
- [ ] Audit isi clipboard/struktur OMML dari dokumen uji.
- [ ] Tentukan parser/konverter OMML ke representasi matematika yang diterima Tiptap/KaTeX.
- [ ] Implementasikan bertahap, mulai pecahan, operasi, pangkat, akar, dan tanda kurung.
- [ ] Untuk struktur yang belum didukung, tampilkan fallback yang aman; jangan diam-diam membuang rumus.
- [ ] Bandingkan hasil dengan sumber Word dan tampilan siswa.

### Tahap 4 — QA kompatibilitas lintas aplikasi
- [ ] Soal lama HTML/LaTeX tetap terbaca dan dapat diedit.
- [ ] Gambar, rumus, tabel, Arab, Aksara Jawa, dan paste Word.
- [ ] Simpan, buka ulang, dan edit ulang seluruh tipe soal.
- [ ] Periksa renderer halaman siswa, ringkasan ujian, hasil/koreksi guru, analisis, export, dan cetak.
- [ ] Pastikan tidak ada perubahan skema, scoring, bobot, atau penilaian otomatis.

### Tahap 5 — Editor jawaban matematika siswa (rencana terpisah)
- [ ] Setelah editor admin stabil, tinjau `app/exam/[id]/page.tsx`, `app/admin/exam/[id]/results/page.tsx`, dan `app/exam/[id]/summary/page.tsx`.
- [ ] Tambahkan opsi editor matematika untuk jawaban essay saja; textarea biasa tetap menjadi default.
- [ ] Pertahankan autosave, pemulihan localStorage, dan penyimpanan `answers.user_answer`.
- [ ] Pastikan guru dapat membaca jawaban HTML/rumus pada koreksi dan ringkasan.
- [ ] Tidak mengubah skema database kecuali benar-benar diperlukan dan disetujui.

### Tahap 6 — Penutupan dan rilis
- [ ] Uji seluruh perubahan pada Vercel Preview.
- [ ] Arsipkan hasil uji, commit, dan inventaris final.
- [ ] Minta persetujuan eksplisit sebelum merge/promosi ke `main`.



## Hasil QA pengguna — rumus pecahan dan kontrol toolbar (7 November 2026)

Status: **berhasil untuk cakupan pengujian yang dicatat**.

Pengguna mengonfirmasi bahwa:
1. Rumus pecahan yang ditambahkan ke soal yang sudah ada berhasil disimpan.
2. Setelah soal dibuka kembali, rumus pecahan tetap tampil dengan benar.
3. Tombol **Lainnya** membuka toolbar lengkap.
4. Tombol **Tutup** mengembalikan toolbar ke tampilan ringkas.
5. Tombol **Rumus (∑)** berfungsi dan membuka alur penyisipan rumus.

Cakupan yang sudah terbukti:
- Penyisipan rumus pecahan melalui tombol rumus ringkas.
- Penyimpanan dan pemuatan ulang konten rumus pada soal yang diedit.
- Buka/tutup toolbar lengkap.
- Tombol rumus ringkas dapat digunakan.

Batas cakupan:
- Belum menguji kontrol toolbar lengkap satu per satu (pangkat, indeks bawah, font, alignment, tabel, warna, dan kontrol lainnya).
- Belum menguji gambar dari toolbar ringkas pada sesi QA ini.
- Belum menguji soal baru, seluruh tipe soal, tampilan siswa/koreksi/cetak, atau seluruh variasi rumus.

Roadmap Tahap 1A diperbarui:
- [x] Tambahkan rumus pecahan pada soal yang sudah ada dan simpan.
- [x] Buka ulang soal dan pastikan rumus pecahan tetap tampil benar.
- [x] Uji tombol Lainnya/Tutup dan tombol Rumus (∑).
- [ ] Uji kontrol toolbar lengkap lainnya.
- [ ] Uji tombol gambar dan perilaku selection/kursor.
- [ ] Uji rumus pada soal baru dan tipe soal lain.
- [ ] Lanjutkan QA simpan/buka ulang seluruh tipe soal dan kompatibilitas tampilan.

Tidak ada perubahan kode aplikasi, database, skema, scoring, atau branch `main` pada langkah pengujian ini.


## Hasil QA pengguna — tombol gambar dan toolbar pada berbagai tipe soal (7 November 2026)

Status: **berhasil untuk fungsi toolbar yang dicoba pengguna**.

Pengguna mengonfirmasi:
1. Tombol gambar pada toolbar berfungsi.
2. Tombol/fitur toolbar lainnya yang telah dicoba juga berfungsi.
3. Pengujian dilakukan pada berbagai tipe soal, termasuk PG kompleks, matriks benar-salah, dan essay.

Cakupan yang sudah terbukti:
- Pemanggilan fitur gambar melalui toolbar.
- Fungsi kontrol toolbar lainnya yang dicoba.
- Toolbar dapat digunakan pada editor untuk tipe soal PG kompleks, matriks benar-salah, dan essay.

Batas cakupan:
- Konfirmasi ini membuktikan fungsi toolbar pada tipe soal tersebut; belum otomatis membuktikan seluruh data soal berhasil disimpan, dibuka ulang, dan diedit ulang untuk setiap tipe.
- Belum ada konfirmasi terpisah untuk tampilan siswa, hasil/koreksi, analisis, export, dan cetak.
- Perilaku pemeliharaan selection/kursor saat penyisipan gambar/rumus masih dapat diuji lebih lanjut bila ditemukan gejala.

Roadmap Tahap 1A:
- [x] Uji tombol gambar dari toolbar.
- [x] Uji kontrol toolbar lain yang dicoba pengguna.
- [x] Pastikan toolbar dapat digunakan pada PG kompleks, matriks benar-salah, dan essay.
- [ ] Uji simpan, buka ulang, dan edit ulang seluruh tipe soal.
- [ ] Periksa gambar/rumus/pembahasan pada daftar, pratinjau, tampilan siswa, dan cetak.
- [ ] Pastikan bobot, kunci jawaban, struktur opsi, dan skor tidak berubah.

Tidak ada perubahan kode aplikasi, database, skema, scoring, atau branch `main` pada pengujian ini.


## Hasil QA pengguna — tampilan siswa, hasil ujian, cetak, dan kebutuhan editor essay (7 November 2026)

Status: **sebagian besar kompatibilitas tampilan berhasil; tiga tindak lanjut ditemukan**.

Pengguna menguji hasil pengeditan melalui halaman siswa dan melaporkan:
- Soal yang baru diedit tampil sesuai perubahan, termasuk rumus, gambar, dan pemformatan.
- Soal-soal lain yang tidak diedit tetap tidak berubah.
- Hasil ujian tetap baik dan tidak mengalami perubahan yang tidak diharapkan.
- Pada halaman hasil siswa, bagian highlight jawaban dan pembahasan sulit dibaca karena warna highlight hijau/merah transparan, warna teks putih hingga abu-abu, dan latar belakang abu-abu.
- Pada tampilan cetak, pernyataan di tipe soal matriks benar-salah yang diformat tebal masih menampilkan kode HTML mentah seperti `<b>...</b>`, bukan teks tebal.
- RichTextEditor belum muncul saat siswa menulis jawaban essay.

### Kesimpulan dan batas cakupan
- Tampilan siswa untuk soal yang diedit: **berhasil diuji** untuk rumus, gambar, dan pemformatan yang dicoba.
- Regresi pada soal lain: **tidak ditemukan** pada pengujian pengguna.
- Hasil ujian/penilaian: pengguna melaporkan tetap baik dan tidak berubah secara tidak diharapkan. Ini bukan klaim bahwa seluruh variasi penilaian sudah diuji.
- Cetak matriks benar-salah: **masalah ditemukan**, HTML tebal tampil sebagai teks mentah.
- Kontras halaman hasil siswa: **perlu perbaikan visual**; jangan mengubah logika penilaian.
- Editor jawaban essay siswa: **belum terintegrasi**; halaman siswa masih perlu implementasi terpisah dari editor soal guru.

### Urutan tindak lanjut
1. Audit jalur render/print untuk pernyataan matriks dan tentukan mengapa HTML `<b>` tidak diproses. Perbaiki hanya renderer cetak yang relevan; pertahankan kompatibilitas soal lama dan jangan mengubah isi atau penilaian.
2. Audit kelas CSS/komponen highlight jawaban dan pembahasan pada halaman hasil siswa. Tingkatkan kontras teks, latar, dan status benar/salah agar jelas pada tema yang digunakan, tanpa mengubah penentuan benar/salah.
3. Audit `app/exam/[id]/page.tsx` dan handler jawaban essay. Rencanakan RichTextEditor khusus jawaban essay dengan toolbar terbatas; pertahankan autosave, pemulihan localStorage, dan penyimpanan `answers.user_answer`. Periksa juga tampilan jawaban pada ringkasan/koreksi sebelum implementasi.

File yang perlu diperiksa pada tahap perbaikan (belum diubah pada QA ini):
- File halaman cetak/komponen print yang dipakai untuk soal matriks benar-salah (perlu ditelusuri dari pemanggil print).
- `app/admin/exam/[id]/results/page.tsx` dan komponen/style terkait tampilan hasil siswa.
- `app/exam/[id]/page.tsx` untuk area jawaban essay.
- `app/exam/[id]/summary/page.tsx` untuk kompatibilitas pembacaan jawaban HTML/rumus bila editor essay diterapkan.

Tidak ada perubahan kode aplikasi, database, skema, scoring, atau branch `main` dalam pengujian ini. Catatan ini hanya merekam hasil yang dilaporkan pengguna dan rencana pemeriksaan; belum ada klaim bahwa tiga masalah di atas telah diperbaiki.


## Audit awal sistem cetak naskah soal — 7 November 2026

Status: **akar masalah utama telah ditemukan; implementasi perbaikan belum dilakukan**.

File utama yang menghasilkan cetakan:
- `app/admin/exam/[id]/page.tsx` — SHA saat audit: `46915e67dcb44e20a3fc06ef993e652bad15fa0f`.
- Fungsi `handleExportPDF` hanya memanggil `window.print()`; tidak ada langkah pengaturan atau pratinjau sebelumnya.
- Dokumen cetak saat ini berada pada elemen `.print-only` yang disembunyikan pada media layar, sehingga tidak bisa dilihat sebagai pratinjau.
- CSS cetak mengatur A4 portrait dan naskah dua kolom secara tetap.

Temuan terverifikasi dari kode:
1. **Logo sekolah:** kop cetak belum memiliki elemen `img`. Aset logo tersedia pada branch ini: `public/logo-sd-getasan.png` (SHA `0144577ff0d7a6d2cc92ba844f652cbbbc953315`). File logo alternatif `public/logo-sd.png` memiliki SHA yang sama. Jadi logo tidak muncul karena belum dipasang pada kop cetak, bukan karena file aset tidak ada.
2. **HTML tebal pada matriks:** sel pernyataan mencetak `{st.text}` sebagai teks React biasa. Perlu diganti ke `MathRenderer`, agar HTML aman, format tebal, dan rumus mengikuti renderer yang sudah dipakai untuk pertanyaan serta pembahasan.
3. **Identitas kelas/fase:** teks `KELAS / FASE` saat ini di-hardcode menjadi `SD Negeri Getasan`. Ini salah tempat. Nama sekolah harus tetap di kop; identitas peserta, kelas, dan fase harus menjadi kolom/garis identitas tersendiri.
4. **Pengaturan/pratinjau:** belum ada state atau UI pengaturan cetak; tombol langsung membuka dialog browser. Rencana alur: tombol membuka panel pratinjau, pengguna mengisi kelas/fase dan memilih opsi cetak, kemudian menekan tombol Cetak untuk memanggil `window.print()`.
5. **Konten kunci/pembahasan:** halaman kunci dan pembahasan saat ini selalu ikut dicetak. Rencana pengaturan memberi pilihan untuk menyertakan kunci jawaban dan pembahasan secara terpisah.
6. **Kolom naskah:** dua kolom saat ini selalu aktif. Rencana pengaturan menyediakan pilihan satu atau dua kolom.

Rencana perbaikan yang dibatasi pada halaman cetak:
- Tambahkan logo sekolah yang sudah ada pada kop cetak.
- Gunakan `MathRenderer` untuk teks pernyataan matriks.
- Tambahkan kolom Nama Peserta, Kelas, dan Fase; kelas/fase dapat diisi melalui pengaturan pratinjau, sedangkan nama peserta disediakan garis kosong untuk diisi.
- Tambahkan pratinjau sebelum cetak, pengaturan kelas/fase, satu/dua kolom, sertakan kunci, dan sertakan pembahasan.
- Pertahankan data soal, opsi, kunci, bobot, database, dan perhitungan skor. Jangan mengubah branch `main`.

File aplikasi yang diperiksa:
- `app/admin/exam/[id]/page.tsx`
- `components/MathRenderer.tsx` — mendukung HTML yang disanitasi, node matematika Tiptap, dan delimiter LaTeX lama.

Belum ada perubahan kode aplikasi pada audit ini. Hasil build dan uji pengguna menunggu implementasi.


## Implementasi tahap cetak — pengaturan, pratinjau, logo, dan identitas (7 November 2026)

Status: **kode diterapkan pada `editor-test`; menunggu hasil build Preview dan pengujian pengguna**.

Commit aplikasi:
- `ad3ae4d4b4bf2edc4b26e0af89f0d5066cce7f04` — `Add print preview settings and fix school exam sheet layout`.

File aplikasi diubah:
- `app/admin/exam/[id]/page.tsx`.

Perubahan yang diterapkan:
1. Tombol cetak sekarang membuka panel **Pengaturan & Pratinjau Cetak** terlebih dahulu, bukan langsung memanggil dialog browser.
2. Panel menyediakan input Kelas dan Fase, pilihan tata letak satu/dua kolom, pilihan menyertakan kunci jawaban, dan pilihan menyertakan pembahasan.
3. Dokumen yang terlihat pada pratinjau adalah elemen dokumen yang sama dengan yang dicetak. Tombol **Cetak / Simpan PDF** baru memanggil `window.print()`.
4. Logo sekolah `/logo-sd-getasan.png` ditambahkan ke kop; file aset sudah diverifikasi tersedia pada branch ini.
5. Pernyataan matriks benar-salah kini menggunakan `MathRenderer`, bukan teks React biasa, agar HTML seperti `<b>` dan rumus dirender.
6. Informasi sekolah tetap berada di kop. Kolom identitas peserta sekarang terpisah: Nama Peserta (garis kosong), Kelas, dan Fase. Kelas/Fase memakai nilai pengaturan pratinjau; bila kosong, tersedia garis kosong.
7. Kunci jawaban dapat dikeluarkan dari cetakan; pembahasan dapat dimatikan terpisah.

Batas perubahan:
- Tidak mengubah isi data soal, opsi, kunci, bobot, query Supabase, skema database, atau penilaian.
- Tidak mengubah `main`.
- Tidak mengubah halaman hasil siswa, CSS highlight hasil, atau editor jawaban essay; itu tetap menjadi tahap terpisah.

Pemeriksaan sumber setelah commit:
- Tombol cetak membuka state pratinjau.
- Logo sekolah ditautkan ke aset yang tersedia.
- Pernyataan matriks menggunakan `MathRenderer`.
- Nama peserta, kelas, dan fase memiliki area identitas tersendiri.
- Pilihan satu/dua kolom serta kunci/pembahasan terhubung ke dokumen pratinjau.
- Pemeriksaan ini adalah inspeksi kode, bukan hasil build atau uji cetak browser.

Vercel Preview untuk commit aplikasi: **BUILDING saat catatan ini dibuat**.
Uji pengguna: **menunggu**. Belum boleh dinyatakan berhasil sampai pengguna memeriksa pratinjau dan hasil cetak fisik/PDF.

### Checklist QA setelah Preview READY
- [ ] Buka tombol Pratinjau & Cetak; pastikan tidak langsung membuka dialog browser.
- [ ] Pastikan logo sekolah terlihat pada kop.
- [ ] Pastikan nama sekolah/alamat/email benar dan tidak tertukar dengan kelas/fase.
- [ ] Pastikan kolom Nama Peserta, Kelas, dan Fase terlihat.
- [ ] Isi kelas dan fase, lalu pastikan nilainya masuk ke pratinjau.
- [ ] Pastikan teks tebal pada pernyataan matriks tampil tebal, bukan kode `<b>`.
- [ ] Pastikan rumus, gambar, dan pemformatan soal tetap tampil.
- [ ] Uji satu kolom dan dua kolom.
- [ ] Uji cetak dengan dan tanpa kunci jawaban; dengan dan tanpa pembahasan.
- [ ] Tekan Cetak / Simpan PDF dan pastikan dialog cetak hanya muncul setelah pratinjau.
- [ ] Pastikan halaman admin kembali normal setelah dialog cetak dibatalkan/ditutup.

Tahap berikutnya setelah QA cetak: perbaiki kontras halaman hasil siswa; setelah itu integrasi editor jawaban essay siswa secara terpisah.


## Penyempurnaan pengaturan tata letak cetak — 7 November 2026

Status: **kode diterapkan pada `editor-test`; menunggu build Preview dan uji pengguna**.

Commit aplikasi:
- `18fcf1e37b2a2ccdd11926d39728b647515c24f1` — pengaturan font, kerapatan, kop/identitas ringkas, footer, dan ucapan penutup.
- `0099ff3ca45d6ce887b64789e1b7ff5d514e7cfb` — ukuran font matriks mengikuti pengaturan font soal.

File aplikasi:
- `app/admin/exam/[id]/page.tsx`.

Perubahan:
1. Menambahkan pengaturan ukuran logo, font kop, font identitas, font soal, dan font footer.
2. Menambahkan pengaturan spasi baris, jarak antarsoal, dan jarak antarkolom. Nilai awal dibuat rapat: spasi baris 1, jarak antarsoal 3 mm, dan jarak antarkolom 5 mm.
3. Memadatkan kop sekolah dan mengurangi ukuran logo awal menjadi 14 mm; ukuran tetap dapat diubah melalui panel.
4. Memadatkan informasi ujian dan identitas. Nama peserta, kelas, dan fase kini sejajar/rapat, dengan garis identitas yang lebih proporsional; kelas/fase tetap berasal dari input pengaturan.
5. Memasang footer berukuran kecil yang memuat nama ujian dan nomor halaman melalui CSS page counter.
6. Menambahkan ucapan penutup statis `☺ Selamat Mengerjakan, Semoga Sukses ☺` setelah naskah soal.
7. Ukuran teks tabel matriks benar-salah mengikuti pengaturan font soal.

Nilai awal:
- Logo 14 mm; kop 9 pt; identitas 8 pt; soal 10 pt; footer 6 pt.
- Spasi baris 1; jarak antarsoal 3 mm; jarak antarkolom 5 mm.
- Tata letak awal tetap dua kolom; pilihan satu kolom tetap tersedia.

Batas perubahan:
- Hanya file halaman pengelolaan/cetak soal yang diubah.
- Tidak mengubah data soal, query/database, skema, kunci jawaban, bobot, atau logika penilaian.
- Tidak mengubah halaman hasil siswa maupun editor jawaban essay.
- Branch `main` tidak disentuh.

Pemeriksaan:
- Kode sudah diperbarui pada branch `editor-test`.
- Build Vercel Preview dan uji pratinjau/cetak pengguna **belum dikonfirmasi**. Nomor halaman menggunakan CSS `counter(page)`; wajib diperiksa pada dialog cetak browser dan hasil PDF karena dukungan dapat berbeda antarbrowser.

Checklist QA:
- [ ] Preview menampilkan kop dan logo dengan ukuran ringkas.
- [ ] Ubah ukuran font logo/kop/identitas/soal/footer; pastikan pratinjau ikut berubah.
- [ ] Ubah spasi baris, jarak soal, dan jarak kolom; pastikan tata letak mengikuti nilai.
- [ ] Pastikan identitas Nama Peserta, Kelas, dan Fase rapat dan tidak memakan banyak ruang.
- [ ] Pastikan teks tebal matriks tetap dirender dan ukuran font matriks mengikuti pengaturan.
- [ ] Pastikan footer memuat nama ujian dan nomor halaman pada setiap halaman hasil PDF.
- [ ] Pastikan ucapan penutup muncul setelah seluruh soal.
- [ ] Uji soal panjang/multihalaman dan kombinasi satu/dua kolom.



## Perbaikan lanjutan footer dan blok identitas cetak — 7 November 2026

Status: **kode diterapkan pada `editor-test`; menunggu build Preview dan QA pengguna**.

Commit:
- `6c8716309793cdec7d6d8c084cf1df973ebaa176` — `Fix print footer flow and compact exam identity block`.

File aplikasi:
- `app/admin/exam/[id]/page.tsx`.

Perubahan:
1. Footer cetak tidak lagi memakai `position: fixed` dan offset negatif di bawah halaman. Posisi fixed sebelumnya berisiko berulang/bergeser pada pergantian halaman dan menimpa area soal.
2. Footer dipindahkan ke alur dokumen normal, tepat setelah ucapan penutup naskah soal dan sebelum halaman opsional kunci jawaban/pembahasan. Footer dibuat tidak terpotong di tengah (`break-inside: avoid`) dan tetap memuat nama ujian serta nomor halaman CSS.
3. Metadata dan identitas peserta digabung menjadi grid tiga kolom dan dua baris:
   - Baris pertama: Mata Pelajaran, Nama Ujian, Alokasi Waktu.
   - Baris kedua: Jumlah Soal, Nama, Kelas/Fase.
4. Identitas nama peserta memakai garis kosong yang lebih pendek. Kelas dan fase ditampilkan sebagai satu label KELAS/FASE, menggunakan nilai dari pengaturan cetak.

Batas perubahan:
- Hanya file halaman pengelolaan/cetak soal dan catatan changelog yang diubah.
- Tidak mengubah database, skema, isi soal, kunci, bobot, atau logika penilaian.
- Branch `main` tidak disentuh.

Pemeriksaan kode:
- Footer lama dengan posisi fixed dan offset negatif telah dihapus.
- Hanya satu elemen footer dokumen tersisa.
- Footer berada setelah ucapan penutup naskah soal, sebelum bagian kunci jawaban opsional.
- Grid identitas menggunakan tiga kolom.
- Ini adalah pemeriksaan sumber; build Preview dan hasil PDF belum dikonfirmasi.

Checklist QA:
- [ ] Pastikan footer tidak menimpa soal pada halaman pertama maupun halaman lanjutan.
- [ ] Pastikan footer muncul setelah bagian soal/ucapan penutup, bukan menyela konten.
- [ ] Pastikan nama ujian dan nomor halaman terbaca pada hasil PDF.
- [ ] Pastikan enam informasi tercetak dalam susunan tiga kolom × dua baris.
- [ ] Pastikan Nama Peserta, Kelas/Fase cukup ruang dan tidak bertabrakan pada ukuran font berbeda.
- [ ] Uji dokumen satu halaman dan beberapa halaman, satu kolom dan dua kolom.



## Keputusan akhir footer cetak — footer dihapus (7 November 2026)

Status: **footer dihapus dari tampilan dan hasil cetak pada branch `editor-test`**.

Commit aplikasi:
- `66ff69699838a5d89c439c3f6c143076fa0557bb` — `Remove unreliable print footer and keep closing message`.

Alasan:
- Footer yang diletakkan setelah seluruh soal bukan footer halaman yang andal. Pada cetak beberapa halaman, browser dapat memecah alur dokumen dan menempatkannya pada halaman berikutnya atau membuatnya tampak bertabrakan dengan konten.
- Nomor halaman melalui CSS `counter(page)` pada elemen biasa tidak dapat dijamin konsisten pada seluruh browser.

Perubahan:
1. Menghapus elemen footer dari dokumen pratinjau/cetak.
2. Menghapus aturan CSS footer untuk layar dan media cetak.
3. Menghapus pengaturan ukuran font footer yang tidak lagi digunakan.
4. Mempertahankan ucapan penutup `☺ Selamat Mengerjakan, Semoga Sukses ☺` sebagai bagian normal di akhir naskah soal, bukan di footer.
5. Susunan identitas tiga kolom × dua baris tetap dipertahankan.

Batas perubahan:
- Hanya file halaman cetak dan changelog yang berubah.
- Tidak mengubah data, database, skema, kunci, bobot, atau logika penilaian.
- Branch `main` tidak disentuh.

Pemeriksaan sumber:
- Tidak ada lagi elemen/class/CSS atau pengaturan `print-footer`.
- Ucapan penutup tetap ada setelah daftar soal.
- Build Preview dan hasil PDF setelah penghapusan masih menunggu QA.



## Perbaikan kontras halaman hasil ujian siswa — 7 November 2026

Status: **kode diterapkan pada `editor-test`; menunggu build Preview dan QA pengguna**.

Commit aplikasi:
- `ca84c9593eb3ea7f07b896d0d93fb3605e05ce6e` — `Improve contrast in student exam review`.

File aplikasi:
- `app/exam/[id]/summary/page.tsx`.

Masalah yang ditangani:
- Highlight jawaban benar/salah sebelumnya menggunakan latar transparan dan teks hijau/merah muda yang kurang terbaca, terutama ketika kartu berada di atas latar tema yang gelap atau abu-abu.
- Panel jawaban essay dan pembahasan juga menggunakan warna teks terang/transparan yang kontrasnya tidak konsisten.

Perubahan:
1. Kartu soal benar/salah memakai latar solid hijau muda/merah muda dengan border yang jelas.
2. Opsi jawaban benar memakai latar hijau muda dan teks hijau gelap; opsi yang dipilih tetapi salah memakai latar merah muda dan teks merah gelap; opsi netral memakai latar abu-abu muda dan teks gelap.
3. Badge status benar, salah, dan tidak dijawab memakai warna solid dengan teks gelap.
4. Tabel matriks memakai latar putih, header abu-abu muda, garis pembatas netral, dan status jawaban dengan warna solid.
5. Panel jawaban essay memakai latar abu-abu muda dan teks gelap.
6. Panel pembahasan memakai latar kuning muda dan teks cokelat gelap.
7. Perubahan hanya pada presentasi/kelas CSS. Fungsi evaluasi jawaban, filter, skor, kunci, dan penyimpanan tidak diubah.

Batas perubahan:
- Hanya `app/exam/[id]/summary/page.tsx` dan changelog.
- Tidak mengubah database, skema, scoring, bobot, atau penilaian otomatis.
- Branch `main` tidak disentuh.

Pemeriksaan sumber:
- Kelas transparan lama untuk highlight opsi hijau/merah telah diganti.
- Panel pembahasan dan jawaban essay kini memakai latar solid serta teks gelap.
- Build Preview dan uji pengguna belum dikonfirmasi.

Checklist QA:
- [ ] Buka halaman hasil siswa pada tema yang biasa digunakan.
- [ ] Pastikan kartu soal benar dan salah mudah dibedakan dan teks terbaca.
- [ ] Pastikan opsi kunci jawaban dan jawaban siswa terlihat jelas.
- [ ] Pastikan tabel matriks benar/salah terbaca.
- [ ] Pastikan jawaban essay dan pembahasan terbaca.
- [ ] Uji filter Semua, Benar, dan Salah; pastikan jumlah dan hasilnya tetap sesuai.
- [ ] Pastikan skor dan status jawaban tidak berubah.



## Student essay editor and exam-session lifecycle hardening — 7 November 2026

Status: **implemented on `editor-test`; Vercel Preview build and end-to-end user QA pending**.

Scope:
- Integrate a reduced WYSIWYG editor for student essay responses.
- Improve autosave queue recovery and final answer snapshot handling.
- Require an explicit start action before creating a new exam session.
- Align Live Proctor timer calculations with the student timer.

Files changed:
- `app/exam/[id]/page.tsx`
- `app/admin/exam/[id]/monitor/page.tsx`
- `components/ExamTokenModal.tsx`
- `components/editor/RichTextEditor.tsx`
- `components/editor/EditorToolbar.tsx`
- `app/exam/[id]/summary/page.tsx`
- `app/admin/exam/[id]/results/page.tsx`

Changes:
1. Student essay responses now use `RichTextEditor` with a reduced toolbar: bold, italic, underline, and mathematics. Image upload and the full formatting toolbar are hidden in this mode.
2. Essay content remains HTML in `answers.user_answer`; the existing summary and teacher result pages render it through `MathRenderer` so formatted text and supported math nodes are readable.
3. Autosave queue now recovers after a failed write instead of remaining permanently rejected. Final flush retries the latest snapshot up to three times before reporting a failure.
4. Final submit merges the localStorage backup with the latest in-memory answer and flag refs; in-memory values take precedence. Existing answer upsert still completes before the session status is changed to `completed`.
5. The token modal sends a one-time `start=1` intent and blocks duplicate submit clicks. The exam page creates a new session only with that explicit intent; without it, the page may resume an existing active session but will not silently create a new attempt.
6. After a session is found/created, the start marker is removed from the URL. Reload therefore resumes an active session; after reset/deletion, the student returns to the home page and must deliberately start again.
7. A load guard prevents repeated initial effects from creating duplicate sessions during development/Strict Mode.
8. Live Proctor timer now accounts for accumulated pauses, current pause duration, and extra time, matching the student-side calculation.

Important limits:
- No database table, column, constraint, RPC, trigger, grading formula, or scoring rule was changed.
- Student-side timeout can submit automatically while the exam page is running and the browser can reach Supabase. If the device/browser is fully closed or offline at the deadline, a browser-only timer cannot perform a remote submit; a server-side scheduled fallback would be a separate approved task.
- Live Proctor still displays an expired active session as expired until the student client completes submission or a proctor uses its existing controls. The timer mismatch is fixed, but this change does not add server-side auto-finalization.
- Build READY is not equivalent to successful student/teacher end-to-end QA.

QA checklist:
- [ ] Preview build succeeds.
- [ ] Start a new test from the token modal; exactly one session appears in Live Proctor.
- [ ] Reload an ongoing exam; the same session resumes and no new row appears.
- [ ] Use Reset Session; the page must not silently create a replacement session. A deliberate new start creates exactly one new session.
- [ ] Pause/resume and add extra time; Live Proctor countdown matches the student countdown.
- [ ] Answer an essay using text formatting and a formula; navigate away and back; content remains.
- [ ] Reload the exam; essay content restores from Supabase/localStorage.
- [ ] Allow the timer to expire with the page open; answers are flushed and session becomes completed.
- [ ] Check essay formatting/math in student summary and teacher grading.
- [ ] Simulate one transient autosave failure followed by a successful save; subsequent queue operations must recover.
- [ ] Confirm objective scores, manual essay scoring, answer keys, and existing sessions remain unchanged.

Open follow-up:
- Consider a server-side deadline finalizer for sessions whose browser is closed/offline at expiry. This requires an explicitly approved server-side design and must preserve saved answers before changing session status.


### Follow-up timeout saat membuka kembali halaman ujian — 7 November 2026

Pemeriksaan lanjutan menemukan kasus penting: bila siswa membuka kembali halaman setelah deadline, timer dapat langsung dimuat sebagai `00:00`. Efek countdown sebelumnya tidak berjalan pada nilai nol sehingga submit otomatis tidak selalu terpanggil.

Perbaikan tambahan:
- Halaman siswa kini memanggil proses submit otomatis saat sesi aktif dipulihkan dengan `timeLeft === 0`.
- Proses tersebut memakai mekanisme flush/retry autosave dan snapshot gabungan ref terbaru serta localStorage yang sudah ditambahkan pada commit sebelumnya.
- Submit ganda tetap dicegah oleh `isSubmittingRef`.

Batasan tetap sama: halaman harus dibuka dan dapat terhubung ke Supabase untuk melakukan submit. Penutupan browser/perangkat saat deadline masih memerlukan mekanisme server-side terjadwal.

Build Preview dan uji pengguna masih menunggu.


### QA pengguna — editor esai dan alur resume ujian — 7 November 2026

Status: **sebagian QA fungsional dikonfirmasi pengguna pada Preview `editor-test`**.

Hasil yang telah dikonfirmasi:
- [x] Fungsi ujian yang sudah ada tetap berjalan aman menurut pengujian pengguna.
- [x] Dialog peringatan muncul ketika siswa mencoba keluar/menutup browser.
- [x] Setelah browser ditutup lalu halaman ujian dibuka kembali, siswa dapat melanjutkan sesi (resume), bukan memulai sesi baru secara otomatis.
- [x] Jawaban yang sudah disimpan tetap tersedia ketika sesi dilanjutkan.
- [x] `RichTextEditor` tampil pada kolom jawaban essay siswa.

Belum diklaim lulus karena belum ada konfirmasi khusus:
- [ ] Format tebal/miring/garis bawah dan rumus tersimpan serta tampil benar di hasil siswa dan panel koreksi guru.
- [ ] Pengiriman otomatis tepat saat timer habis dan status sesi berubah menjadi `completed`.
- [ ] Pemulihan ketika ada kegagalan jaringan/autosave.
- [ ] Kesesuaian countdown siswa dan Live Proctor ketika pause dan tambahan waktu digunakan.
- [ ] Tidak ada sesi ganda pada pengujian start/reset berulang.

Catatan: dialog peringatan saat keluar browser dan kemampuan resume telah diuji secara langsung oleh pengguna. Keduanya tidak digantikan oleh mekanisme server-side deadline finalizer; finalizer tetap menjadi agenda terpisah untuk menangani sesi yang melewati deadline ketika browser tertutup/offline.


## Perbaikan containment gambar pada daftar soal aktif — 8 November 2026

Status: **kode diterapkan pada `editor-test`; menunggu build Preview dan konfirmasi QA pengguna**.

File aplikasi:
- `app/admin/exams/[id]/questions/page.tsx`.

Masalah:
- Gambar yang diatur mengalir di kiri/kanan teks menggunakan CSS float.
- Pada daftar soal aktif, float dapat keluar dari area konten pertanyaan dan berpotensi bertumpuk dengan elemen setelahnya sehingga guru kesulitan membaca soal secara utuh.

Perubahan:
1. Menambahkan kelas tata letak `flow-root` pada perender pertanyaan, opsi jawaban, dan pembahasan di kartu daftar soal aktif.
2. Kelas tersebut membuat setiap area konten membentuk konteks tata letak tersendiri sehingga float gambar tetap berada dalam area konten yang benar.
3. Pengaturan gambar kiri/kanan dan pembungkusan teks tetap dipertahankan; perubahan tidak memaksa gambar menjadi rata tengah atau mengubah susunan konten yang disimpan.
4. Tidak mengubah `MathRenderer`, `RichTextEditor`, format HTML, URL gambar, data soal, query Supabase, skema database, kunci jawaban, atau penilaian.

Pemeriksaan kode:
- Keempat pemanggilan `MathRenderer` pada daftar soal aktif diberi `className="flow-root"`: pertanyaan, opsi, pembahasan flashcard, dan pembahasan quiz.
- Perubahan dibatasi pada halaman daftar soal bank latihan.
- Pemeriksaan ini belum menggantikan build Preview dan uji visual browser.

Checklist QA Preview:
- [ ] Buka modul latihan yang memiliki soal dengan gambar di kiri dan teks di kanan.
- [ ] Pastikan teks di samping gambar terbaca utuh dan tidak tertutup.
- [ ] Pastikan bagian opsi dan pembahasan tidak naik/menimpa gambar atau teks pertanyaan.
- [ ] Uji gambar rata kiri, tengah, kanan, wrap-left, dan wrap-right.
- [ ] Uji soal tanpa gambar dan soal lama; pastikan tampilannya tidak berubah secara merugikan.
- [ ] Pastikan tombol Edit, Hapus, tambah soal, dan navigasi daftar tetap berfungsi.
- [ ] Pastikan preview dan hasil cetak yang sebelumnya sudah benar tetap tidak berubah.

Hasil build dan QA pengguna: **menunggu**.


## Perbaikan ukuran tata letak gambar setelah rotasi pada daftar soal — 8 November 2026

Status: **kode diterapkan pada `editor-test`; menunggu build Preview dan QA visual pengguna**.

Masalah:
- Rotasi gambar disimpan sebagai `data-rotation` dan CSS `transform: rotate(...)`.
- CSS transform mengubah tampilan visual tetapi tidak menukar ukuran kotak tata letak gambar.
- Pada rotasi 90°/270°, gambar dapat menutupi teks di sampingnya dan elemen berikutnya seperti pilihan/kunci jawaban.

Perubahan:
1. `MathRenderer` mendapat prop opsional `normalizeRotatedImages`, default `false`, sehingga halaman lain tidak berubah perilakunya.
2. Sanitizer hasil akhir mempertahankan atribut `data-rotation` agar orientasi gambar dapat dikenali.
3. Pada empat area daftar soal aktif (pertanyaan, opsi, pembahasan flashcard, pembahasan quiz), prop tersebut diaktifkan.
4. Untuk gambar dengan rotasi 90°/270°, renderer mengukur ukuran gambar sebelum transform, lalu membuat wrapper tata letak dengan lebar/tinggi tertukar. Gambar diposisikan dan diputar di dalam wrapper tersebut.
5. Float, margin, dan clear dari gambar asli dipindahkan ke wrapper agar pengaturan gambar di kiri/kanan serta pembungkusan teks tetap berjalan.
6. Ukuran dihitung ulang saat lebar area daftar berubah melalui ResizeObserver.

Batas perubahan:
- Tidak mengubah data soal, format HTML tersimpan, URL gambar, editor, rotasi yang tersimpan, database, query Supabase, kunci jawaban, atau penilaian.
- Perilaku normalisasi hanya diaktifkan pada daftar soal aktif.
- Gambar dengan rotasi 0°/180° tidak memerlukan pertukaran lebar/tinggi.
- Perubahan `flow-root` sebelumnya tetap dipertahankan.

Pemeriksaan kode:
- Perubahan renderer bersifat opt-in.
- Empat pemanggilan MathRenderer pada daftar soal aktif mengaktifkan normalisasi.
- Build Preview dan pemeriksaan browser masih menunggu.

Checklist QA Preview:
- [ ] Soal dengan gambar persegi panjang diputar 90°: teks di sebelahnya tetap terbaca.
- [ ] Soal dengan gambar diputar 270°: teks dan area soal tidak bertumpuk.
- [ ] Pilihan jawaban dan pembahasan di bawah gambar tidak tertutup.
- [ ] Gambar wrap-left dan wrap-right tetap membungkus teks dengan benar.
- [ ] Gambar tanpa rotasi serta rotasi 180° tetap normal.
- [ ] Uji pada lebar desktop dan jendela browser yang lebih sempit.
- [ ] Preview dan hasil cetak tetap seperti sebelumnya.
- [ ] Tombol edit dan simpan soal tetap bekerja.

Hasil build dan QA pengguna: **menunggu**.


### Penyempurnaan normalisasi rotasi — pengukuran responsif dan pemuatan gambar

Penyempurnaan implementasi:
- Gaya asli gambar disimpan sementara di DOM agar pengukuran dapat diulang dengan benar saat ukuran kolom berubah.
- Normalisasi menunggu gambar selesai dimuat sebelum membaca ukuran intrinsiknya.
- Wrapper menukar dimensi setelah rotasi 90°/270° dan mengecilkan gambar secara proporsional bila lebar hasil rotasi melebihi ruang konten.
- Pengukuran ulang saat resize mengembalikan gaya asli terlebih dahulu sehingga tidak mengukur ukuran hasil transform sebelumnya.

Catatan: penyimpanan gaya asli hanya berupa atribut sementara pada elemen DOM; tidak mengubah HTML/data yang tersimpan di database.


### Pemeriksaan urutan hook dan sanitasi atribut rotasi

- Atribut `data-rotation` kini diizinkan pada tahap sanitasi pertama dan terakhir agar nilai rotasi tidak hilang sebelum proses layout.
- `useEffect` selalu dipanggil sebelum kondisi konten kosong mengembalikan `null`, sehingga jumlah hook konsisten antar-render.


## Implementasi awal kompatibilitas paste Microsoft Word — 8 November 2026

Status: **kode diterapkan pada `editor-test`; menunggu build Preview dan QA pengguna**.

File aplikasi:
- `components/editor/RichTextEditor.tsx`.

Perubahan:
1. Menambahkan handler paste khusus pada Tiptap untuk mendeteksi konten clipboard yang membawa Office Math/OMML atau gambar.
2. Konversi OMML ke LaTeX untuk struktur umum: teks matematika, pecahan, pangkat, indeks bawah, pangkat-indeks gabungan, akar (termasuk akar berindeks), operator jumlah/integral/produk, tanda kurung matematika, garis atas, aksen, dan fungsi.
3. Hasil rumus dimasukkan sebagai node matematika inline atau block Tiptap dengan atribut `data-type` dan `data-latex`, sehingga mengikuti renderer matematika yang sudah ada.
4. Gambar clipboard berbentuk data URI atau file clipboard diunggah melalui endpoint Google Drive yang sudah ada (`/api/google-drive/upload`). URL hasil upload dipasang kembali pada elemen gambar.
5. Bila clipboard hanya menyediakan file gambar, gambar tetap dapat ditempelkan; teks biasa dari clipboard dipertahankan jika tersedia.
6. HTML clipboard yang tidak mengandung OMML/gambar tetap menggunakan perilaku paste bawaan Tiptap agar teks, tabel, format, Arab, dan Aksara Jawa yang sebelumnya sudah berjalan tidak diambil alih handler baru.

Batas dan catatan:
- Tidak menambah dependency dan tidak mengubah database, endpoint upload, skema, struktur payload soal, kunci jawaban, atau penilaian.
- Upload gambar mengikuti batas dan validasi endpoint yang sudah ada: JPG/PNG/WEBP/GIF, maksimal 8 MB, dan memerlukan koneksi Google Drive admin.
- Konversi OMML ini merupakan dukungan awal untuk struktur umum, bukan jaminan seluruh variasi objek Word (misalnya SmartArt, shape, text box, persamaan kompleks tertentu, atau gambar tertaut eksternal).
- Gambar yang disalin sebagai objek clipboard browser bergantung pada format yang disediakan Microsoft Word/browser. Bila Word tidak memberikan byte gambar pada clipboard, gambar tersebut tidak dapat diunggah otomatis.
- Kode belum dianggap lulus sebelum build Preview dan pengujian dengan dokumen Word contoh pengguna.

Checklist QA Preview:
- [ ] Paste gambar dari Word: gambar muncul di editor dan URL tersimpan berasal dari Google Drive.
- [ ] Simpan soal, buka ulang, pastikan gambar tetap tampil.
- [ ] Paste beberapa gambar dan teks campuran; pastikan urutan serta isi teks tidak hilang.
- [ ] Paste pecahan, pangkat, indeks, akar, dan operasi matematika dari Word; pastikan pratinjau rumus terbaca.
- [ ] Simpan dan buka ulang rumus; pastikan node matematika tetap utuh.
- [ ] Periksa hasil pada daftar soal, tampilan siswa, pembahasan, hasil/koreksi, dan cetak.
- [ ] Pastikan paste teks biasa, tabel, bold/italic/underline, Arab, dan Aksara Jawa tetap berfungsi.
- [ ] Pastikan kegagalan upload menampilkan pesan dan tidak menghapus konten soal yang sudah ada.

Hasil build dan QA pengguna: **menunggu**.


### Tindak lanjut penanganan clipboard Word — 8 November 2026

Perbaikan setelah pengujian pengguna melaporkan gambar tidak muncul dan pecahan tidak terkonversi:

1. Nilai LaTeX sekarang diberikan langsung ke atribut DOM `data-latex`; escaping dilakukan oleh DOM saat serialisasi HTML, bukan sebelum `setAttribute`.
2. Pengambilan file gambar clipboard memeriksa `DataTransfer.items` sekaligus `DataTransfer.files`, serta menghindari file duplikat.
3. Parser clipboard mengenali referensi gambar Office VML (`imagedata`) dan DrawingML (`blip`), lalu mengganti pembungkus Office dengan elemen gambar yang dapat diproses editor.
4. Referensi gambar non-HTTP seperti `file:`, `cid:`, `blob:`, dan path relatif dipasangkan dengan byte gambar clipboard dan diunggah melalui endpoint Google Drive yang sudah ada.
5. File gambar clipboard yang tersisa tetap ditambahkan ke konten, bukan diabaikan.
6. Jika Word hanya memberikan referensi gambar tanpa byte gambar, editor menampilkan pesan yang menjelaskan keterbatasan clipboard alih-alih menyimpan URL lokal yang rusak.

Batas pemeriksaan:
- Arsip dokumen contoh tersedia sebagai hasil ekstraksi teks dan render halaman; akses raw OOXML/DOCX tidak tersedia melalui arsip ini. Karena itu, perubahan ini memperkuat penanganan variasi clipboard Word, tetapi belum membuktikan struktur clipboard dari semua objek pada dokumen contoh.
- Konversi OMML masih mencakup struktur matematika umum; hasil harus diverifikasi melalui paste langsung dari Word pada Preview.
- Tidak ada perubahan database, API upload, skema soal, format penyimpanan jawaban, kunci jawaban, atau penilaian.

Status: **perubahan kode pada `editor-test`; menunggu build Preview dan QA langsung pengguna**.


### Catatan build Preview untuk perbaikan clipboard — 8 November 2026

- Dua build antara gagal pada parsing TypeScript karena pola regex URL ditulis dengan escape garis miring yang berlebih. Log Vercel menunjukkan `Expression expected` / `Expected unicode escape` pada `RichTextEditor.tsx`.
- Penyebab diperbaiki dengan mengganti regex tersebut menjadi pemeriksaan eksplisit `startsWith('http://')` dan `startsWith('https://')`.
- Build pada commit `ad422a60da53de8353649267aee5f9aecb63bdc3` telah mencapai status **READY** di Vercel Preview.
- Status READY hanya membuktikan proses build berhasil. Paste gambar dan konversi rumus dari Word masih menunggu pengujian langsung pengguna.


### Diagnostik clipboard Word sementara — 8 November 2026

- Pengguna mengonfirmasi pengujian dilakukan pada alias Preview branch `editor-test` yang benar; alias tersebut terhubung ke deployment READY commit `975be5b4e9e7b98036c6e595f734e5371f934455`.
- Karena gambar dan rumus tetap tidak terkonversi, ditambahkan diagnostik sementara pada event paste untuk menampilkan jenis clipboard, panjang HTML/teks, jumlah OMML/MathML/IMG/VML/DrawingML, serta tipe dan ukuran file gambar.
- Diagnostik hanya menampilkan metadata/jumlah, tidak menampilkan isi soal atau teks clipboard.
- Diagnostik ini bersifat sementara untuk mengidentifikasi format yang benar-benar dikirim Word/browser. Setelah penyebab diketahui, diagnostik akan dihapus dan diganti penanganan clipboard yang sesuai.
- Perubahan hanya pada branch `editor-test`; tidak mengubah Production, database, API upload, atau mekanisme penilaian.
- Build Preview dan hasil diagnostik pengguna: **menunggu**.


### Hasil diagnostik clipboard Word dan pemeriksaan lanjutan — 8 November 2026

Pengguna mengonfirmasi pengujian dilakukan pada alias Preview aktif:
- `https://grisan-git-editor-test-heins14.vercel.app`
- Deployment alias tersebut berada pada branch `editor-test`; pemeriksaan Vercel menunjukkan deployment READY.

Hasil diagnostik pertama dari paste langsung Microsoft Word:
- Clipboard menyediakan `text/plain`, `text/html`, dan `text/rtf`.
- HTML berukuran 61.914 karakter; teks biasa 130 karakter.
- OMML = 0 dan MathML = 0.
- HTML berisi 5 elemen `img`.
- Tidak ditemukan VML `imagedata` maupun DrawingML `blip`.
- Tidak ada file gambar pada `DataTransfer.items` atau `DataTransfer.files`; item yang tersedia semuanya berupa string.

Interpretasi:
- Handler saat ini tidak dapat mengonversi rumus karena hanya mencari OMML di HTML; data rumus mungkin disediakan melalui RTF atau bentuk markup HTML lain.
- Lima elemen gambar memang ada di HTML, tetapi belum diketahui apakah sumbernya berupa data URI, URL, referensi lokal, atau kosong.
- Karena tidak ada byte gambar pada clipboard, editor belum dapat mengunggah gambar ke Google Drive. Keberadaan elemen `img` saja tidak membuktikan bahwa data gambar ikut disediakan browser.

Tindak lanjut diagnostik:
1. Menambahkan pemeriksaan kategori sumber `src` pada kelima elemen gambar tanpa menampilkan isi dokumen.
2. Menambahkan pemeriksaan jumlah token RTF yang umum untuk matematika Word (`mmath`, `mfrac`, `msup`, `msub`, `mrad`) dan objek gambar (`pict`, `shppict`, `nonshppict`, `objdata`).
3. Diagnostik tetap hanya menampilkan jumlah/kategori, bukan isi teks atau data clipboard mentah.

Tahap ini belum mengubah algoritme konversi rumus maupun upload gambar. Setelah hasil diagnostik kedua diterima, implementasi akan diarahkan berdasarkan format yang benar-benar tersedia.

Status: **diagnostik lanjutan diterapkan pada `editor-test`; menunggu build Preview dan hasil paste pengguna**.


### Temuan diagnostik RTF tahap kedua — 8 November 2026

Hasil paste terbaru dari pengguna:
- Format clipboard: `text/plain`, `text/html`, `text/rtf`.
- RTF berukuran 4.883.286 karakter.
- RTF memuat 10 penanda `\\mmath`.
- RTF memuat 10 penanda `\\pict`, 4 `\\shppict`, dan 4 `\\nonshppict`.
- Penanda `\\mfrac`, `\\msup`, `\\msub`, `\\mrad`, serta `\\objdata` tidak ditemukan.
- Kelima elemen gambar pada HTML memakai sumber `file://`; clipboard tidak menyertakan file gambar.

Kesimpulan sementara: data matematika dan gambar tampaknya tersedia dalam RTF, tetapi struktur grup internalnya belum diketahui. Belum aman untuk menulis konverter berdasarkan hitungan penanda saja.

Tindak lanjut: diagnostik tambahan mengumpulkan **nama control word RTF saja** di sekitar maksimal 3 grup `\\mmath` dan 5 grup `\\pict`. Isi teks soal dan payload gambar tidak ditampilkan. Hasil ini diperlukan untuk memastikan struktur matematika Word dan jenis payload gambar (misalnya PNG/JPEG/metafile) sebelum parser dibuat.

Status: **menunggu Preview READY dan hasil struktur RTF dari pengguna**. Belum ada perubahan konversi atau penyimpanan gambar.


## 2026-11-08 — Perbaikan diagnostik struktur RTF Word

- Pengujian pengguna menunjukkan token `\\mmath` dan `\\pict` terdeteksi, tetapi ringkasan struktur kosong.
- Penyebabnya ada pada pola RegExp diagnostik yang tidak meng-escape karakter backslash RTF dengan benar.
- Diagnostik diperbaiki dengan memecah sampel berdasarkan backslash lalu membaca control word di awal setiap segmen.
- Perubahan hanya menyentuh diagnostik sementara; belum mengubah konversi rumus/gambar, penyimpanan soal, API, atau database.
- Commit: `6fe28fceb2af5d8575501f159fd56f9269505e73`.


## 2026-11-08 — Ekstraksi PNG dari clipboard RTF Word (tahap awal)

- Menambahkan pembaca grup RTF berimbang untuk menemukan grup `\\pict` berformat `\\pngblip`.
- Data heksadesimal dikumpulkan hanya dari isi utama grup gambar, dikonversi menjadi byte, lalu divalidasi dengan signature PNG sebelum dijadikan `File`.
- File PNG RTF dipasangkan berurutan ke elemen gambar HTML yang masih memiliki referensi lokal/file URL, kemudian memakai endpoint upload Google Drive yang sudah ada.
- Diagnostik kini menampilkan jumlah dan ukuran PNG yang berhasil diekstrak; tidak menampilkan isi gambar atau dokumen.
- Format WMF/JPEG dan konversi rumus RTF belum diaktifkan. Jika PNG tidak lolos validasi, mekanisme lama tetap berlaku.
- Perlu pengujian Preview menggunakan dokumen Word yang sama untuk memastikan hasil ekstraksi, jumlah gambar, dan upload.
- Commit kode: `76f097f15646dd2927c2dfc5186ae7fec4afc1b6`.


## 2026-11-08 — Memisahkan gambar soal dari fallback rumus Word

- Memperbaiki ekstraksi RTF agar gambar yang berada di dalam grup `\\mmathPict` (gambar cadangan visual rumus) tidak dianggap sebagai gambar soal.
- Menambahkan deduplikasi berdasarkan payload PNG identik, sehingga representasi cadangan yang sama tidak diunggah berulang.
- Ekstraksi tetap hanya menerima payload dengan signature PNG valid; WMF belum diproses.
- Tujuan pengujian berikutnya: untuk dokumen berisi satu rumus pecahan dan satu gambar bentuk, jumlah PNG non-rumus yang terbaca seharusnya mendekati satu. Hasil akhir tetap harus dikonfirmasi lewat Preview dan tampilan editor.
- Commit kode: `2847ea28fe4b571a02c43c8ff6eddb332d7bbe7b`.


## 2026-11-08 — Memulihkan gambar fallback Equation Word pada paste

- Pengujian pengguna mengonfirmasi empat PNG yang sebelumnya berhasil diekstrak merupakan representasi visual objek Equation Word: `10:1/5`, `50`, `20`, dan `2`; bukan empat diagram tambahan.
- Filter yang mengecualikan seluruh grup di bawah `\\mmathPict` membuat hasil ekstraksi menjadi nol dan menyebabkan placeholder rumus kembali kosong.
- Filter tersebut dihapus. Ekstraksi PNG RTF kembali menerima gambar fallback Equation Word, dengan validasi signature PNG dan deduplikasi payload tetap dipertahankan.
- PNG dipasangkan ke placeholder gambar HTML sesuai urutan clipboard seperti pada build sebelumnya. Ini memulihkan tampilan visual rumus sementara; konversi ke rumus Tiptap yang dapat diedit belum selesai.
- Diagram yang menggunakan format non-PNG (misalnya WMF) belum ditangani pada tahap ini.
- Perubahan hanya pada branch `editor-test`; tidak mengubah Production, database, API upload, atau penilaian.
- Commit kode: `f21d0a9cbaa2dc346afcaf3008596181e752c73b`.
- Status: menunggu build Preview dan QA pengguna.


## 2026-11-08 — Menjaga teks Word tetap ter-paste saat upload gambar gagal

- Pengujian terbaru menunjukkan empat PNG fallback Equation berhasil diekstrak dari RTF, tetapi seluruh isi paste tidak muncul di editor.
- Ditemukan bahwa proses paste sebelumnya menunggu semua upload gambar selesai sebelum memasukkan HTML/teks ke editor. Satu kegagalan upload dapat membatalkan seluruh proses.
- Setiap upload gambar sekarang ditangani secara terpisah. Jika satu gambar gagal dibaca atau diunggah, placeholder gambar tersebut dilewati dan proses tetap melanjutkan gambar lain serta memasukkan teks/format HTML.
- Kegagalan gambar dicatat di console browser untuk pemeriksaan teknis, tanpa menghentikan paste keseluruhan.
- Perubahan hanya pada branch `editor-test`; tidak mengubah Production, database, API upload, atau penilaian.
- Commit kode: `ad075e03a613909bcdabea3ec99af525204240a8`.
- Status: menunggu build Preview dan QA pengguna.


## 2026-11-08 — Performa paste Word dan ukuran gambar rumus

Status: **kode diterapkan pada branch `editor-test`; menunggu build Preview dan QA pengguna**.

Perubahan pada `components/editor/RichTextEditor.tsx`:
1. Menghapus popup diagnostik clipboard sementara setelah format Word berhasil diidentifikasi. Ini juga menghindari pekerjaan diagnostik tambahan saat setiap paste.
2. Upload gambar dari clipboard Word dijalankan bersamaan (`Promise.all`) alih-alih satu per satu, sehingga beberapa gambar tidak perlu menunggu antrean upload berurutan.
3. Gambar PNG fallback objek Equation Word dibatasi menjadi lebar 140 px (tetap responsif maksimal 100% area editor), agar rumus tidak tampil selebar halaman.
4. Jika terdapat file gambar tambahan yang tidak memiliki placeholder HTML, gambar juga ditambahkan dengan ukuran awal 140 px agar tidak memenuhi editor.
5. Kegagalan upload tetap ditangani per gambar; teks dan gambar lain tidak dibatalkan hanya karena satu upload gagal.
6. Menonaktifkan opsi underline bawaan StarterKit karena ekstensi Underline sudah tidak ditambahkan terpisah. Ini menghilangkan sumber peringatan nama ekstensi duplikat.

Batas perubahan:
- Pembatasan 140 px diterapkan pada PNG fallback rumus Word dan gambar tambahan hasil ekstraksi RTF. Gambar normal yang sudah memiliki URL HTTP/HTTPS tidak diubah ukurannya.
- Belum mengubah parser RTF untuk mengonversi struktur rumus menjadi node matematika Tiptap yang dapat diedit; saat ini gambar fallback rumus tetap berupa gambar.
- Tidak mengubah database, API Google Drive, format HTML soal, kunci jawaban, atau penilaian.

Checklist QA Preview:
- [ ] Paste dokumen Word yang sama; teks harus tetap muncul.
- [ ] Empat gambar fallback rumus tampil kecil dan tidak memenuhi lebar editor.
- [ ] Waktu paste beberapa gambar lebih singkat dibanding upload berurutan.
- [ ] Diagram soal (jika berhasil diekstrak) tetap dapat diperbesar melalui kontrol editor.
- [ ] Simpan dan buka ulang soal; gambar tetap tampil dari Google Drive.
- [ ] Peringatan Tiptap duplicate extension `underline` tidak muncul lagi.
- [ ] Paste teks biasa, tabel, Arab, Aksara Jawa, dan rumus yang sebelumnya sudah bekerja tetap normal.

Hasil build Preview dan QA pengguna: **menunggu**.

- Penyempurnaan: ukuran awal gambar rumus disimpan sebagai `style.width: 140px` (bukan atribut HTML `width` numerik), agar parser node gambar membaca satuan CSS dengan benar.

## 2026-11-08 — Ukuran gambar rumus mengikuti ukuran asli Word

- Ekstraksi PNG dari RTF kini membaca `\\picwgoal` (ukuran target gambar dalam twips) pada grup gambar, lalu mengonversinya ke piksel CSS (96 dpi: twips ÷ 15). Contoh ukuran target 470 twips menjadi sekitar 31 px, dan 270 twips menjadi sekitar 18 px.
- PNG fallback Equation tidak lagi diberi lebar tetap 140 px; ukuran tampil mengikuti ukuran yang direkam Word. Ukuran dibatasi dalam rentang 16–80 px untuk mencegah nilai ekstrim.
- Node view gambar kini menghormati `width` dari atribut CSS inline, bukan hanya atribut `width` tersendiri. Ini memastikan ukuran yang dibaca dari clipboard tetap terlihat setelah masuk ke Tiptap.
- Belum menangani diagram WMF-only. Diagnostik sebelumnya menunjukkan ada grup `\\wmetafile8` tanpa fallback PNG; browser tidak dapat menampilkan WMF secara langsung. Perlu konverter WMF ke PNG/SVG untuk mengambil diagram tersebut.
- Tidak mengubah skema database, API upload, konten lama, atau penilaian.
- Status: kode pada `editor-test`; menunggu build Preview dan QA pengguna.

## 2026-11-08 — Perbaikan tipe data clipboard setelah audit build

- Empat deployment Preview gagal pada pemeriksaan TypeScript karena fungsi `getClipboardImageFiles` mendeklarasikan array sebagai `ExtractedRtfImage[]`, padahal fungsi tersebut mengumpulkan file clipboard biasa bertipe `File`.
- Tipe array dikoreksi menjadi `File[]`. Objek hasil ekstraksi RTF tetap memakai tipe `ExtractedRtfImage` yang menyimpan pasangan `file` dan `widthPx`.
- Perubahan ini memperbaiki ketidakcocokan tipe yang ditunjukkan log Vercel; hasil build ulang masih harus diperiksa.
- Gambar diagram Word yang hanya tersedia sebagai WMF belum dapat dikonversi oleh parser saat ini. Ekstraksi PNG yang tersedia saat ini terutama mencakup fallback rumus, sehingga diagram soal kedua belum boleh dianggap teratasi.
- Ukuran fallback rumus menggunakan nilai target dari RTF (twips ÷ 15) dengan batas 16–80 px; perlu QA tampilan karena nilai aktual harus dibandingkan dengan ukuran teks pada editor.
- Tidak ada perubahan pada Production, database, endpoint upload, skema soal, atau penilaian.
- Commit perbaikan tipe: `511f6bc5df317099b91679c4e568b479f8a10225`.
- Status: menunggu deployment Preview dan pengujian pengguna.

## 2026-11-08 — Tahap awal ekstraksi dan konversi diagram WMF Word

- Menambahkan ekstraksi grup `\\wmetafile8` dari RTF clipboard Word, dengan pemeriksaan header WMF standar atau placeable WMF sebelum data diterima.
- Ekstraksi melewati fallback WMF yang berada di dalam konteks `\\mmath` / `\\mmathPict`, agar representasi cadangan Equation tidak ikut diperlakukan sebagai diagram.
- Menambahkan pustaka browser `emf-converter` versi `4.24.0` melalui entry browser paket utama `emf-converter` (dipilih otomatis oleh bundler). Konversi dilakukan di browser menjadi PNG, lalu memakai endpoint upload Google Drive yang sudah tersedia.
- Jika satu WMF gagal diekstrak, dikonversi, atau diunggah, proses paste teks dan gambar lainnya tetap berjalan.
- PNG fallback Equation yang sudah ada tidak diubah; ukuran tampilannya bukan sasaran tahap ini.
- Pengujian perlu memastikan diagram asli dokumen Word dua soal dapat dipasangkan ke placeholder gambar yang benar, tampil dengan proporsi wajar, tersimpan, dan tetap ada setelah soal dibuka ulang.
- Perubahan hanya pada branch `editor-test`; tidak mengubah Production, skema/database, endpoint upload, format soal, kunci jawaban, atau penilaian.
- Status: **implementasi awal; menunggu build Preview dan QA pengguna**.


## 2026-11-08 — Koreksi integrasi konverter WMF pada Preview

- Build Preview pertama menunjukkan bahwa versi npm `4.24.0` tidak menyediakan deklarasi subpath `emf-converter/lite` yang dapat ditemukan TypeScript pada konfigurasi proyek ini.
- Impor dinamis diarahkan ke entry paket utama `emf-converter`, yang menyediakan fungsi `convertMetafileToDataUrl` dan entry browser melalui resolusi bundler.
- Memperbaiki satu sisa nama variabel ukuran gambar pada cabang paste yang menggunakan placeholder tanpa `src`.
- Perbaikan ini menindaklanjuti dua kesalahan TypeScript yang tercatat di log Vercel. Build Preview berikutnya masih harus diverifikasi.
- Tidak ada perubahan database, endpoint upload, Production, atau mekanisme penilaian.


## 2026-11-08 — Tahap 2 awal: konversi rumus Word dari RTF

Status: **implementasi awal pada branch `editor-test`; menunggu build Preview dan QA pengguna**.

- Menambahkan pembaca grup matematika RTF Word (`\\mmath` / `\\mmathPara`) karena pemeriksaan clipboard sebelumnya menunjukkan OMML tidak tersedia pada HTML, sedangkan struktur rumus tersedia di RTF.
- Parser awal mendukung teks matematika, pecahan (`\\mf`), pangkat (`\\msSup`), indeks bawah (`\\msSub`), kombinasi pangkat/indeks (`\\msSubSup`), akar (`\\mrad`), operator jumlah/integral/hasil kali (`\\mnary`), tanda kurung matematika (`\\md`), aksen, garis atas/bawah, dan fungsi.
- Untuk clipboard Word yang memiliki PNG fallback Equation, placeholder gambar rumus diganti dengan node matematika Tiptap yang menyimpan LaTeX. PNG fallback yang sudah dikonversi tidak ikut diunggah lagi. Gambar biasa/diagram yang tersisa tetap mengikuti alur upload Google Drive yang telah ada.
- Jalur konversi OMML dari HTML tetap dipertahankan sebagai prioritas jika format tersebut tersedia.
- Parser ini merupakan tahap awal dan belum dianggap mendukung seluruh variasi objek matematika Word, matriks, persamaan bertingkat, atau semua simbol khusus. Perlu QA menggunakan dokumen Word yang sama, khususnya rumus `10:1/5`, opsi angka, pecahan, pangkat, dan akar.
- Tidak mengubah database, skema soal, endpoint upload, penyimpanan konten lama, kunci jawaban, atau penilaian.
- Commit implementasi: `f7951b72ad5c3dd4ddd63b9d1f62264c0be51e7b`.


## 2026-11-08 — Perbaikan pemisahan rumus dan gambar fallback Word

- Menindaklanjuti QA pengguna: pecahan `10:1/5` tampil, tetapi dialog edit tidak mengenali LaTeX karena atribut `data-latex` ikut berisi metadata bentuk Word dan payload gambar PNG/WMF.
- Parser RTF sekarang mengabaikan grup visual Equation Word (`mmathPict`, `pict`, `shppict`, `nonshppict`, dan grup metadata bentuk terkait) saat membentuk LaTeX.
- Tujuan perubahan: hanya struktur matematika yang masuk ke `data-latex`; fallback gambar Equation tidak menjadi bagian dari rumus. Gambar diagram non-matematika tetap diproses oleh alur paste yang ada.
- Belum diverifikasi pengguna. Menunggu build Preview dan pengujian ulang rumus serta diagram.
- Commit: `229fd39a23486655c7cb8a6647c99ec84000cc65`.

## 2026-11-08 — Tata letak gambar hasil paste Word (wrap text)

- Menindaklanjuti QA pengguna: gambar diagram berhasil muncul, tetapi berada di atas teks dengan ukuran terlalu besar; posisi kiri/kanan dari Word belum dipertahankan.
- Saat paste, editor sekarang mencoba membaca petunjuk posisi dari style, atribut alignment, dan metadata elemen pembungkus gambar Word untuk menentukan sisi kiri atau kanan.
- Gambar diagram hasil ekstraksi RTF/WMF kini memakai tata letak mengambang (*float*) dengan teks mengalir di sampingnya, bukan otomatis memenuhi satu baris penuh.
- Jika clipboard Word tidak memberikan petunjuk sisi yang dapat dikenali, posisi default adalah kanan. Pengguna tetap dapat memilih tata letak kiri/kanan melalui kontrol gambar editor.
- Lebar awal gambar dibatasi maksimum 360 px dan 42% area editor, dengan tinggi otomatis agar rasio gambar tetap terjaga. Pengguna masih dapat mengubah ukuran melalui pegangan gambar.
- Perubahan hanya pada branch `editor-test`; tidak mengubah Production, database, API upload, format soal, kunci jawaban, atau penilaian.
- Commit kode: `cb9678d596ab1101be258007b6bbceeacdaca06a`.
- Status: menunggu build Preview dan QA pengguna. Perlu diuji apakah teks benar-benar mengalir di samping gambar pada paragraf yang sama; jika HTML clipboard Word memisahkan gambar dan teks ke paragraf berbeda, tahap lanjutan mungkin perlu menyatukan struktur paragraf secara selektif.


## 2026-11-08 — Membaca informasi crop gambar Word dari RTF

- Ekstraksi diagram WMF dari clipboard RTF kini membaca metadata crop Word: `\\piccropl`, `\\piccropr`, `\\piccropt`, dan `\\piccropb`, bersama ukuran target `\\picwgoal` / `\\pichgoal`.
- Setelah WMF dikonversi menjadi PNG, crop diterapkan pada bitmap di browser sebelum gambar diunggah ke Google Drive. Jika metadata crop tidak tersedia atau tidak valid, file asli dipertahankan agar proses paste tidak gagal.
- Perubahan ini ditujukan untuk mempertahankan area gambar yang terlihat di Word; hasil crop tetap perlu dibandingkan langsung dengan dokumen sumber karena variasi clipboard Word dapat menggunakan unit atau struktur yang berbeda.
- Tata letak Wrap Text, ukuran gambar, konversi rumus RTF, dan alur upload yang sudah ada tetap dipertahankan.
- Tidak mengubah database, skema soal, API upload, kunci jawaban, atau penilaian.
- Commit kode: `7d32e44f448194a0845c4708e2dd11dd43e853c8`.
- Status: implementasi pada branch `editor-test`; menunggu build Preview dan QA pengguna.


## 2026-11-08 — Penyesuaian skala crop gambar Word

- QA pengguna menunjukkan crop sudah diterapkan, tetapi hasil yang terlihat masih lebih luas daripada crop di Word.
- Perhitungan crop RTF disesuaikan: nilai crop kiri/kanan dibandingkan langsung dengan `picwgoal`, dan atas/bawah dengan `pichgoal`. Perhitungan sebelumnya menambahkan nilai crop ke penyebut sehingga hasil potongan lebih ringan.
- Fallback tetap mempertahankan gambar asli bila metadata crop tidak valid atau hasil crop terlalu kecil.
- Perubahan ini masih memerlukan perbandingan visual dengan dokumen Word yang sama; angka perhitungan belum dianggap QA final.
- Tidak mengubah Wrap Text, rumus, database, API upload, atau penilaian.
- Commit kode: `b64275216046deb6a1d458ce887d6d74774e1881`.
- Status: menunggu Preview dan QA pengguna.

## 2026-11-08 — QA pengguna: crop gambar Microsoft Word sesuai

- Pengguna mengonfirmasi hasil crop gambar yang dipaste dari Microsoft Word kini sudah sesuai dengan area/tampilan crop pada dokumen sumber.
- Catatan tambahan: ukuran gambar hasil paste masih sekitar 4 kali lebih besar daripada ukuran yang diharapkan, tetapi pengguna menyatakan ukuran tersebut masih dapat disesuaikan melalui kontrol ukuran gambar editor.
- Status crop Word: **berhasil diuji pengguna**. Ketidaksesuaian ukuran awal dicatat sebagai penyempurnaan terpisah dan bukan penghambat fungsi crop.
- Perubahan ini hanya memperbarui dokumentasi QA pada branch `editor-test`; tidak mengubah kode aplikasi, Production, database, API, atau penilaian.


## 2026-11-08 — Penyesuaian ukuran awal diagram Word (WMF)

- Menindaklanjuti QA pengguna: hasil crop sudah sesuai dengan Microsoft Word, tetapi ukuran awal gambar hasil paste tampak sekitar 4 kali lebih besar dari ukuran yang diharapkan.
- Koreksi skala diterapkan khusus pada lebar tampilan diagram WMF hasil ekstraksi RTF: nilai target `picwgoal` dibagi 60 (sebelumnya dibagi 15), dengan batas aman 24–400 px.
- Nilai `widthGoal` mentah tetap dipakai untuk perhitungan crop. Algoritme crop, posisi wrap, dan rasio gambar tidak diubah.
- PNG fallback rumus Word serta gambar clipboard biasa tidak terkena penyesuaian ini.
- Tidak mengubah database, API Google Drive, format soal, kunci jawaban, penilaian, atau Production.
- Status: perubahan kode pada branch `editor-test`; menunggu build Preview dan QA pengguna. Jika ukuran diagram menjadi terlalu kecil/besar, skala dapat disetel berdasarkan hasil uji visual.


## 2026-11-08 — Penyesuaian lanjutan ukuran awal diagram Word (WMF)

- Pengukuran pengguna berdasarkan tinggi relatif terhadap teks: di Word gambar setinggi sekitar 6 baris teks, sedangkan di editor menjadi sekitar 11 baris.
- Skala lebar tampilan WMF disesuaikan dari pembagi 60 menjadi 110. Faktor ini menargetkan tinggi tampilan sekitar 6/11 dari ukuran Preview sebelumnya, dengan rasio gambar tetap otomatis.
- Batas minimum ukuran tampilan diturunkan dari 24 px menjadi 12 px agar batas bawah tidak menghalangi pengecilan diagram kecil. Batas maksimum 400 px tetap dipertahankan.
- Metadata crop mentah (widthGoal / heightGoal) tidak diubah; algoritme crop, wrap kiri/kanan, PNG fallback rumus, gambar clipboard biasa, penyimpanan, dan penilaian tidak diubah.
- Status: perubahan kode pada branch editor-test; menunggu build Preview dan QA pengguna. Target verifikasi: tinggi diagram sekitar 6 baris teks, sebanding dengan Word.


## 2026-11-08 — QA pengguna: ukuran awal diagram Word sesuai

- Pengguna mengonfirmasi penyesuaian skala terbaru sudah menghasilkan ukuran gambar sesuai harapan berdasarkan perbandingan tinggi terhadap teks di Word.
- Tahap penyesuaian ukuran awal diagram WMF dinyatakan **lulus QA pengguna**.
- Crop dan wrap yang sebelumnya telah diuji tetap dipertahankan.
- Tidak ada perubahan kode pada catatan QA ini; tidak mengubah Production, database, API, atau penilaian.

## 2026-11-08 — QA pengguna: simpan dan buka ulang soal Word

- Pengguna mengonfirmasi bahwa setelah soal disimpan, halaman ditinggalkan, lalu soal yang sama dibuka kembali, seluruh konten tetap konsisten.
- Elemen yang diperiksa: teks, rumus, gambar, ukuran gambar, dan posisi gambar.
- Kelima aspek tersebut tetap sama setelah pemuatan ulang; tahap **simpan dan buka ulang soal dinyatakan lulus QA pengguna**.
- Hasil ini berlaku untuk skenario soal yang diuji dan tidak otomatis menyatakan seluruh tipe soal atau semua variasi konten telah diuji.
- Tidak ada perubahan kode aplikasi, database, skema, API, penilaian, atau Production pada tahap QA ini. Catatan ditambahkan pada branch `editor-test`.
- Langkah berikutnya: lanjutkan QA kompatibilitas pada tipe soal lain dan tampilan siswa/print, tanpa mengubah alur penilaian.


## 2026-11-08 — QA pengguna: tiga perbaikan tampilan dan RichTextEditor

Pengguna mengonfirmasi ketiga masalah yang sebelumnya dilaporkan telah selesai diperbaiki dan diuji pada Preview:

1. **Cetak soal matriks:** tag HTML `<b>...</b>` tidak lagi tampil sebagai teks mentah pada hasil cetak.
2. **Hasil ujian:** highlight jawaban dan pembahasan kini memiliki kontras yang jelas dan dapat dibaca.
3. **Jawaban esai siswa:** RichTextEditor sudah tampil pada bagian jawaban esai siswa.

Status ketiga item: **berhasil diuji dan dikonfirmasi pengguna** pada 8 November 2026.

Catatan: ini merupakan konfirmasi QA pengguna, bukan perubahan kode aplikasi. Tidak ada perubahan pada Production, database, skema, API, atau mekanisme penilaian.


## 2026-11-08 — QA pengguna: kompatibilitas soal lama

- Pengguna mengonfirmasi soal-soal yang dibuat sebelum RichTextEditor diterapkan tetap tampil normal saat dibuka pada editor baru.
- Status kompatibilitas tampilan soal lama: **berhasil diuji dan dikonfirmasi pengguna**.
- Catatan ini hanya mencakup tampilan saat dibuka; pengujian simpan/buka ulang untuk setiap tipe soal tetap dicatat terpisah pada roadmap QA.
- Tidak ada perubahan kode aplikasi, database, skema, API, penilaian, atau Production.


## 2026-11-08 — Keputusan ruang lingkup QA: paste satu dokumen Word lengkap

- Pengguna memutuskan pengujian copy-paste satu dokumen Word lengkap (dokumen panjang dengan banyak soal) boleh dilewati karena membutuhkan waktu besar dan pada praktiknya menyerupai proses import.
- Pengujian dokumen Word lengkap **bukan syarat penghambat** untuk penyelesaian editor dan persiapan penerapan ke `main`.
- Batasan yang tetap dicatat: paste Word telah diuji pada contoh teks, rumus, gambar/diagram, crop, wrap, ukuran, serta simpan/buka ulang yang telah dikonfirmasi pengguna; tidak ada klaim bahwa satu dokumen panjang telah diuji menyeluruh.
- QA akhir tetap mencakup pemeriksaan terarah pada tipe soal, tampilan siswa/guru, export/cetak, dan tidak berubahnya kunci, bobot, serta penilaian.
- Keputusan ini tidak mengubah kode aplikasi, database, skema, API, atau Production.


## 2026-11-08 — Audit kode QA roundtrip, tampilan, export, dan penilaian (tanpa perubahan aplikasi)

Branch audit: `editor-test`. Pemeriksaan dilakukan pada kode terbaru dengan SHA:
- `app/admin/exam/[id]/page.tsx`: `329826bffc10ef6371fcf0137b6c86560c5bedba`
- `app/exam/[id]/page.tsx`: `22a32f8d7b3e8f78dbb44c2ea4efdb66e6d3b110`
- `app/admin/exam/[id]/results/page.tsx`: `c456fcc7e19d4a43b2f16ac07719fe3f06faec14`
- `app/exam/[id]/summary/page.tsx`: `ed959ddc377f4bf764b1b2f4494901c748d6778f`

### Hasil audit alur simpan dan pemuatan

1. Form editor ujian menyimpan `max_score`, `question_type`, `options`, `correct_option`, dan `correct_answers` sesuai tipe soal:
   - PG: satu kunci pada `correct_option` dan array satu elemen pada `correct_answers`.
   - PG kompleks: array opsi dan array kunci jawaban.
   - Matriks: array pernyataan dan object kunci berdasarkan ID pernyataan.
   - Essay: `options=[]`, `correct_option='ESSAY'`, `correct_answers=null`.
2. Handler edit memuat kembali bobot, isi, opsi, pernyataan, dan kunci sesuai tipe. Kompatibilitas field lama `image_url` masih dipertahankan.
3. Halaman siswa menyimpan jawaban PG pada `selected_option`, jawaban PG kompleks/matriks pada `selected_answers`, dan semua jawaban dalam `user_answer` (teks HTML untuk essay; JSON untuk struktur pilihan). Saat pemulihan, nilai JSON diparse kembali.
4. Jawaban essay RichTextEditor disimpan sebagai HTML pada `user_answer`; penilaian guru tersimpan terpisah pada `answers.teacher_score`.
5. Penilaian guru membatasi nilai essay pada rentang 0 sampai `max_score`. Nilai akhir, bonus, dan override disimpan pada `exam_sessions.score`, `bonus_points`, dan `score_override`.

Kesimpulan audit kode: bentuk payload lama dan jalur penyimpanan kunci/bobot masih dipertahankan. Ini pemeriksaan kode, bukan bukti roundtrip browser untuk setiap tipe soal.

### Hasil audit tampilan dan output

- Halaman siswa merender pertanyaan, opsi, pernyataan matriks, dan jawaban essay melalui `MathRenderer` atau RichTextEditor.
- Ringkasan siswa merender pertanyaan, pilihan, pernyataan, jawaban essay, dan pembahasan melalui `MathRenderer`.
- Hasil/koreksi guru memakai `MathRenderer` untuk pertanyaan, pembahasan, serta jawaban siswa; bagian cetak soal memakai `MathRenderer` untuk pertanyaan, opsi, pernyataan matriks, dan pembahasan.
- Export Excel daftar soal mempertahankan teks pertanyaan, opsi/pernyataan, pembahasan, tipe soal, dan bobot.
- Export rekap guru memuat rekap siswa dan analisis butir. Untuk analisis matriks, kolom kunci saat ini ditampilkan sebagai label umum “Matriks”, bukan rincian kunci per pernyataan.

### Temuan yang perlu ditangani/diuji sebelum penutupan

1. **Temuan export daftar soal matriks (perbaikan disarankan):** fungsi export Excel di `app/admin/exam/[id]/page.tsx` membaca `correct_answers` jika berbentuk array atau object pada `correct_option`. Pada soal matriks, kunci sebenarnya berada di object `correct_answers`, sedangkan `correct_option` berisi string `MATRIX`. Akibatnya, export saat ini berpotensi menulis “MATRIX”, bukan pasangan ID pernyataan dan Benar/Salah. Tidak memengaruhi data database atau penilaian; hanya keluaran Excel.
2. **Statistik ringkasan siswa untuk essay:** `evaluateQuestion` menganggap essay terisi sebagai jawaban menunggu penilaian (bukan benar), dan `calculatedScore` ringkasan menghitung nilai otomatis tanpa membaca `teacher_score`. Header “Skor Akhir” memprioritaskan `sessionData.score` yang tersimpan, tetapi kartu “Akurasi Nilai” dan hitungan benar/salah berasal dari perhitungan lokal tersebut. Setelah essay dinilai guru, statistik lokal dapat berbeda dari nilai akhir tersimpan. Perlu dipastikan apakah label/statistik ini memang dimaksudkan hanya untuk penilaian otomatis atau perlu diselaraskan; jangan mengubah formula penilaian tanpa persetujuan.
3. **Konsistensi evaluasi PG kompleks:** rumus skor parsial ada di halaman siswa, ringkasan, dan hasil guru. Struktur dasarnya sama (benar dikurangi salah dibagi jumlah kunci), tetapi implementasi memiliki sedikit perbedaan normalisasi/pembatasan rasio. Perlu uji pembanding menggunakan satu set jawaban yang sama untuk memastikan hasil identik; tidak ada perubahan scoring pada audit ini.

### QA pengguna yang masih perlu dilakukan

- Roundtrip simpan/buka ulang per tipe: PG tunggal, PG kompleks, matriks, dan essay. Catatan satu skenario Word roundtrip yang telah lulus tidak menggantikan empat tipe tersebut.
- Cek tampilan halaman siswa, hasil/koreksi guru, ringkasan, cetak, dan kedua jenis export pada contoh yang mewakili tipe soal.
- Bandingkan bobot, kunci, skor otomatis, nilai essay manual, bonus, dan override terhadap nilai yang diharapkan pada satu ujian uji. Jangan memakai data ujian aktif/produksi untuk percobaan yang dapat mengubah nilai siswa.

Status: **audit kode selesai untuk empat file di atas; tidak ada file aplikasi yang diubah, tidak ada build/deployment baru, tidak ada perubahan database/skema/API/scoring atau branch `main`**.


## 2026-11-08 — QA akhir pengguna dan persiapan rilis

### Konfirmasi QA pengguna
- Pengguna telah melakukan pengujian langsung untuk tampilan siswa, koreksi guru, ringkasan, cetak, dan kedua jenis export; hasil yang dilaporkan normal.
- Pengguna juga telah mencoba alur pengerjaan soal dan memeriksa hasilnya, termasuk penilaian essay secara manual; hasil yang dilaporkan normal.
- Pengujian dokumen Word panjang secara keseluruhan tetap dilewati sesuai keputusan pengguna. Pengujian contoh teks, rumus, gambar/diagram, crop, wrap, resize, dan simpan/buka ulang yang telah dikonfirmasi tetap menjadi cakupan QA.
- Temuan rincian kunci matriks pada export Excel daftar soal tidak diperbaiki karena pengguna menyatakan export kunci Excel belum menjadi kebutuhan penting. Temuan ini hanya berdampak pada format export, bukan penyimpanan kunci atau mekanisme penilaian.

### Penutupan audit
- Pemeriksaan kode sebelumnya pada alur simpan/muat, render siswa/guru, cetak, export, dan pemisahan nilai essay manual tetap berlaku.
- Tidak ada perubahan database, skema, RPC, trigger, API penilaian, maupun formula scoring pada tahap audit akhir.
- Halaman laboratorium `app/font-test/page.tsx` sengaja dipertahankan sebagai alat uji editor sesuai aturan proyek.
- Berkas sementara `tka-content-audit.txt` dihapus dari branch karena merupakan hasil audit lokal, bukan bagian dari aplikasi.
- Preview terakhir yang diperiksa berstatus **READY**, branch `editor-test`, commit `6dd341a99defdd7531364a38d7b143569379ba71`. Penghapusan artefak audit dan catatan QA ini memerlukan Preview baru sebelum merge.
- Status: **QA pengguna untuk cakupan yang disebutkan telah dikonfirmasi; siap melanjutkan pemeriksaan Preview pasca-pembersihan dan proses Pull Request ke `main`**.


---

## Pengembangan homepage, Arcade Game Hub, dan katalog sumber belajar (8 November 2026)

Status: **implementasi awal selesai di branch Preview; menunggu build dan QA pengguna**.

Branch kerja: `homepage-arcade-catalog` (berbasis `main`). Branch produksi `main` belum diubah.

### Temuan sebelum implementasi
- Form CMS `study_materials` hanya menyimpan `title`, `file_url`, `description`, `subject`, dan `author_display_name` (serta `created_by` saat insert).
- Query homepage/admin menggunakan `study_materials` dan relasi penulis.
- Tidak ditemukan penanda tipe yang membedakan Materi dan Modul Ajar pada payload CMS yang diperiksa.
- Karena itu, implementasi ini memperlakukan koleksi sebagai **Sumber Belajar**. Tidak menambahkan tab Materi/Modul Ajar yang akan memberi klasifikasi palsu, dan tidak mengubah skema database.

### Perubahan kode
- `app/page.tsx`
  - Mengganti daftar kartu materi panjang menjadi pratinjau ringkas maksimal tiga sumber belajar.
  - Menambahkan pencarian ringkas, filter mata pelajaran, pengurutan, dan tautan ke katalog penuh.
  - Mengubah tema Gaming dari nuansa galaksi menjadi arah Arcade Game Hub dengan arena warna, pola pixel, dan pesan misi/XP.
  - Mempertahankan query materi, data penulis, tautan file, widget XP/level, pengumuman, dan alur ujian.
- `app/materi/page.tsx` (baru)
  - Katalog sumber belajar dengan pencarian judul/deskripsi/penulis.
  - Filter mata pelajaran, pengurutan, dan pagination 10 item per halaman.
  - Mempertahankan tautan file, deskripsi MathRenderer, dan nama penulis.
- Database, scoring, RPC, RLS, login, CBT, dan alur admin tidak diubah.

### Status verifikasi
- Implementasi kode: selesai.
- Build Vercel Preview: menunggu hasil.
- QA tampilan desktop/mobile, pencarian, filter, pagination, tautan file, dan tema Gaming: belum dikonfirmasi pengguna.
- Belum di-merge ke `main`.


## Pendalaman tema 3D Cartoon dan Arcade Game Hub (8 November 2026)

Status: **implementasi tambahan di branch Preview; menunggu build dan QA**.

### Tema Cartoon 3D
- Hero homepage dibuat lebih ekspresif dengan maskot 3D bergaya kartun, bayangan berlapis, perspektif, dan animasi mengambang.
- Tombol utama memiliki efek tekan/timbul agar terasa seperti objek fisik.

### Tema Gaming — Arcade Game Hub
- Hero diganti menjadi dashboard arcade dengan mesin permainan 3D berbasis CSS, layar bercahaya, tombol mesin, koin XP mengambang, dan animasi maskot.
- Menambahkan panel pemilihan tiga misi yang benar-benar interaktif: Latihan Otak, Jelajah Buku, dan Tantangan TKA.
- Kartu misi dapat dipilih; panel konfirmasi berubah mengikuti pilihan, lalu tombol membawa pengguna ke halaman latihan, katalog sumber belajar, atau bagian ujian.
- Menampilkan XP dan level dari profil yang sudah dimuat; tidak menambahkan sistem hadiah atau klaim XP palsu.
- Menambahkan kedalaman perspektif/hover pada kartu di tema Gaming.
- Animasi menghormati pengaturan `prefers-reduced-motion`.

### Implementasi teknis dan batasan
- Efek 3D dibuat dengan CSS transforms, perspective, layered shadows, dan keyframes; tidak menambah library 3D atau beban WebGL.
- Tidak mengubah sistem XP, scoring, database, autentikasi, CBT, atau alur ujian.
- QA visual dan interaksi desktop/mobile belum dikonfirmasi. Build Preview harus READY terlebih dahulu.


## 2026-11-08 — Penyatuan profil pemain dan papan peringkat Arcade Game Hub

- Identitas pada hero Gaming kini menampilkan avatar, nama lengkap, username, dan kelas dari profil siswa. Label kecil Arcade Game Hub juga menampilkan username ketika tersedia; pengguna tamu diarahkan untuk masuk.
- Status gamifikasi yang sebelumnya berada pada kartu terpisah di bawah hero dipindahkan ke hero: total XP, level, gelar level, dan hingga empat badge yang tersimpan pada profil.
- Ditambahkan gelar visual berdasarkan level yang sudah tersimpan: Petualang Pemula, Penjelajah Cerdas, Ksatria Pengetahuan, Master Ilmu, dan Legenda Getasan. Gelar hanya untuk presentasi; tidak mengubah perhitungan XP atau level.
- Ditambahkan pratinjau tiga besar papan peringkat dengan pilihan Global dan Kelas. Data menggunakan tabel `profiles`, urutan XP menurun, dan pengecualian akun kelas Guru, mengikuti pendekatan query leaderboard pada halaman latihan.
- Pesan penyemangat berubah sesuai kondisi: pemain yang masuk tiga besar mendapat apresiasi; pemain lain mendapat dorongan sesuai gelar level. Papan peringkat lengkap tetap dapat dibuka melalui halaman latihan.
- Kartu status gamifikasi lama tetap ditampilkan pada tema non-Gaming; pada tema Gaming kartu tersebut disatukan dengan hero agar tidak berulang.
- Tidak mengubah skema/database, sistem pemberian XP, formula level, badge, scoring, RPC, login, atau CBT.
- Commit kode: `8ecbea6a0b302c8f4fa0320c92f17da5f0c6f90f` (penyesuaian pesan penyemangat berdasarkan posisi 1, 2, atau 3).
- Status: implementasi pada branch `homepage-arcade-catalog`; menunggu build Preview dan QA pengguna. Angka peringkat ditampilkan sebagai tiga besar yang benar-benar dikembalikan query; tidak mengarang posisi siswa di luar daftar tersebut.


## 2026-11-08 — Gelar Arcade dinamis berdasarkan distribusi XP siswa

- Menghapus patokan gelar berdasarkan level tetap (misalnya level 5, 10, 20, atau 30). Level dan XP tinggi, termasuk level di atas 1.000, tidak lagi membuat gelar berhenti berkembang pada batas tertentu.
- Gelar sekarang ditentukan dari posisi relatif XP pemain di antara seluruh profil siswa yang bukan akun Guru. Sistem mengambil kolom minimum `id`, `class_code`, dan `xp`, lalu menghitung persentil posisi pemain.
- Tingkatan gelar adaptif terhadap jumlah dan perkembangan peserta: Legenda Arena (1% teratas), Grandmaster (5% teratas), Master Pengetahuan (15% teratas), Ksatria Cendekia (35% teratas), Penjelajah Tangguh (65% teratas), dan Calon Juara (kelompok berikutnya). Jika baru ada satu peserta, digunakan gelar Perintis Arena; jika profil tidak ditemukan, Petualang Baru.
- Pesan penyemangat tetap mengikuti golongan dinamis. XP dan level yang sudah tersimpan tidak diubah; tidak ada perubahan skema, sistem pemberian XP, rumus level, badge, scoring, RPC, login, atau CBT.
- Commit implementasi: `7e4eae2362ac66d992e96ebf893dcb49cd1094f4`.
- Status: menunggu Preview build dan QA pengguna. Peringkat dinamis bergantung pada data profil siswa yang dapat dibaca melalui kebijakan akses Supabase saat ini.

## 2026-11-08 — Koreksi gelar untuk peringkat pertama leaderboard

- Pemeriksaan ulang menemukan bahwa aturan sebelumnya menetapkan Legenda Arena hanya untuk persentil 1% teratas. Akibatnya, siswa peringkat pertama masih bisa mendapat Grandmaster ketika jumlah peserta membuat posisinya lebih dari 1% (misalnya peringkat 1 dari 20 siswa = 5%).
- Aturan diperbaiki: siswa dengan XP tertinggi (peringkat 1) selalu mendapat **Legenda Arena**, berapa pun jumlah siswa.
- Peringkat dihitung berdasarkan jumlah siswa yang memiliki XP lebih tinggi daripada pemain. Dengan demikian, siswa yang memiliki nilai XP sama memperoleh peringkat dan gelar yang sama (tie-aware), bukan dibedakan hanya oleh urutan baris.
- Gelar untuk peringkat berikutnya tetap adaptif berdasarkan persentase posisi: Grandmaster (5% teratas), Master Pengetahuan (15%), Ksatria Cendekia (35%), Penjelajah Tangguh (65%), dan Calon Juara.
- Perubahan hanya menyentuh perhitungan gelar di homepage. XP, level, papan peringkat, database, skema, scoring, RPC, RLS, login, dan CBT tidak diubah.
- Commit kode: `6a393245b395b69bf0048064d0385ef9ce49b324`.
- Status: menunggu build Vercel Preview dan QA pengguna; belum di-merge ke `main` dan belum mengubah Production.


## 2026-11-08 — Penyegaran visual homepage untuk tema non-Gaming

- Menambahkan kelas tema pada pembungkus homepage agar styling tiap tema dapat ditargetkan secara terpisah.
- Menyegarkan latar halaman Space, Jungle, Ocean, Disney, Cartoon 3D, dan School dengan gradasi lembut sesuai warna identitas tema.
- Memperkuat hero tema standar dengan lapisan cahaya dan bayangan yang lebih halus.
- Menambahkan umpan balik hover ringan pada kartu dan penyesuaian ruang vertikal untuk layar kecil.
- Tema Gaming sengaja dikecualikan agar identitas Arcade Game Hub tetap utuh.
- Tidak mengubah konten/data, navigasi, login, leaderboard, XP, filter, pencarian, katalog, ujian, CBT, database, skema, API, atau scoring.
- Status: perubahan berada di branch `homepage-arcade-catalog`; menunggu build Preview dan QA pengguna. Belum di-merge ke `main` dan belum mengubah Production.

## 2026-11-08 — Penyegaran latar belakang homepage (Soft Glow + Soft Geometric)

- Arah desain disepakati pengguna: gabungan Soft Glow dan Soft Geometric; visual harus lebih hidup tetapi tetap ringan dan ramah anak.
- Tema Space dan Jungle dibuat lebih ceria: Space menggunakan dasar biru yang lebih terang dengan aksen ungu/cyan serta bintang statis yang samar; Jungle menggunakan hijau segar dengan aksen lime/turquoise dan cahaya hangat.
- Ocean, Disney, Cartoon 3D, dan School mempertahankan karakter warna yang telah disepakati. Gaming tidak disentuh agar identitas Arcade Game Hub tetap utuh.
- Latar menggunakan CSS gradient statis; tidak menambahkan gambar latar, font, library, dependensi, video, WebGL, maupun animasi latar baru.
- Mengubah `background-attachment` dari `fixed` menjadi `scroll` untuk menghindari perilaku fixed-background yang tidak diperlukan, khususnya saat scroll pada perangkat mobile.
- Mempertahankan efek hover kartu, hero glow yang sudah ada, dan dukungan `prefers-reduced-motion`.
- Ruang lingkup hanya CSS latar belakang homepage; tidak mengubah fitur, konten, navigasi, database, skema, API, login, XP, leaderboard, ujian, CBT, maupun scoring.
- Status implementasi: perubahan dikirim ke branch `homepage-arcade-catalog`; menunggu build Vercel Preview dan QA pengguna. Belum di-merge ke `main` dan belum mengubah Production.


## 2026-11-08 — Perbaikan animasi maskot hero tema non-Gaming

- Audit menemukan aturan CSS sebelumnya menghentikan seluruh animasi maskot ketika pointer berada di atas hero. Kondisi ini membuat maskot terlihat diam saat pengguna mengarahkan kursor ke area tersebut.
- Menghapus perilaku jeda animasi saat hover; hover kini hanya memperkuat pencahayaan/bayangan tanpa menghentikan gerakan.
- Memperjelas gerakan karakter utama dengan siklus naik-turun, sedikit rotasi, dan perubahan skala; ornamen bintang dan aksen tetap bergerak terpisah.
- Mempertahankan maskot/emoji, warna tema, bentuk kartu, latar belakang, konten, dan navigasi yang telah disepakati.
- Tetap menghormati preferensi aksesibilitas `prefers-reduced-motion`.
- Perubahan hanya pada CSS homepage; tidak mengubah database, skema, API, XP, leaderboard, login, ujian, CBT, atau scoring.
- Commit CSS: aa0ff3747474d94c8ecf5eec33e3507ec9b195ba.
- Status: menunggu build Vercel Preview dan QA pengguna; belum di-merge ke `main` dan belum mengubah Production.

## 2026-11-08 — Pengarsipan sementara maskot 3D realistis homepage

- Pengembangan homepage dihentikan sementara sesuai keputusan pengguna; tidak ada perubahan lanjutan pada layout, warna, latar, kartu, tombol, atau navigasi homepage pada tahap berikutnya.
- Konsep maskot ilustrasi 3D realistis untuk tema Space, Jungle, Ocean, Disney, dan School disimpan sebagai backlog visual. Pekerjaan ini menunggu ketersediaan pembuatan aset gambar.
- Animasi sementara berbasis emoji dan CSS yang telah dikirim pada branch `homepage-arcade-catalog` dipertahankan; tidak dihapus atau diganti pada tahap ini.
- Halaman Practice / Latihan menjadi fokus peninjauan berikutnya. Tahap awal hanya audit kode dan rekomendasi; belum ada perubahan aplikasi, database, skema, API, XP, leaderboard, atau scoring.
- Status homepage: belum dinyatakan final untuk Production dan belum di-merge ke `main`; keputusan rilis tetap menunggu QA pengguna dan persetujuan eksplisit.

## 2026-11-08 — Practice Tahap 1: pusat misi latihan

- Fokus pengembangan dialihkan dari homepage ke halaman Practice sesuai persetujuan pengguna.
- Audit awal mencakup `app/practice/page.tsx`, `app/practice/[id]/page.tsx`, `app/admin/practice/page.tsx`, `components/games/MazeGameEngine.tsx`, dan `components/games/FlashcardEngine.tsx`.
- Implementasi Tahap 1 pada `app/practice/page.tsx`:
  - Menambahkan pencarian judul, deskripsi, subtes, dan jenis aktivitas.
  - Menambahkan filter jenis aktivitas: Kuis, Flashcard, dan Game Labirin.
  - Menambahkan filter mata pelajaran/subtes berdasarkan nilai `exams.subtest` yang memang tersedia pada data saat ini; tidak membuat kolom atau skema baru.
  - Menambahkan pengurutan Terbaru, Terlama, dan Nama A–Z.
  - Menetapkan identitas warna/ikon kartu berdasarkan `activity_type`, bukan urutan kartu, agar jenis aktivitas konsisten.
  - Menambahkan jumlah hasil dan keadaan kosong saat pencarian/filter tidak menemukan latihan, termasuk tombol reset.
- Perubahan hanya pada katalog frontend Practice; tidak mengubah database, API, RPC, XP, level, badge, scoring, mesin soal, Maze, atau Flashcard.
- Status: implementasi dikirim ke branch `homepage-arcade-catalog`; menunggu hasil Vercel Preview dan QA pengguna. Belum di-merge ke `main` dan bukan rilis Production.
- Urutan lanjutan: (1) verifikasi Preview dan QA Tahap 1; (2) perbaiki berdasarkan temuan QA; (3) setelah disetujui, lanjut audit/desain pengerjaan soal; (4) baru setelah itu penyempurnaan Maze/Flashcard dan audit XP/attempt.


## 2026-11-08 — Verifikasi commit Practice dan Preview

- Menindaklanjuti pengecekan pengguna bahwa commit terbaru belum terlihat pada tampilan GitHub.
- Memastikan isi `app/practice/page.tsx` pada branch `homepage-arcade-catalog` sudah memuat katalog Practice dengan pencarian, filter aktivitas/subtes, pengurutan, dan empty state.
- Memastikan catatan implementasi Practice Tahap 1 juga sudah ada pada changelog.
- Memperbarui catatan verifikasi ini agar menghasilkan commit GitHub baru yang mudah dikenali dan memicu pemeriksaan deployment Preview dari branch yang sama.
- Belum melakukan merge ke `main`; belum mengubah database, API, RPC, XP, scoring, atau mesin soal.


## 2026-11-08 — QA Practice Tahap 1: penyegaran visual Arcade

### Masukan QA pengguna
- Katalog sudah tampil, tetapi kartu dalam jenis aktivitas yang sama perlu variasi visual agar tidak monoton.
- Tiga peringkat teratas leaderboard membutuhkan latar yang lebih kuat dan kontras teks putih yang terbaca.
- Identitas pemain dan koleksi badge belum terasa seperti kartu karakter/arcade; badge statis dan belum menonjol.
- Seluruh halaman Practice perlu lebih konsisten dengan bahasa visual Arcade Game Hub di homepage.

### Perbaikan yang diterapkan
- Menambahkan empat variasi gradasi dan ornamen untuk setiap jenis aktivitas (Kuis, Game Labirin, Flashcard). Warna dasar tiap jenis tetap dalam keluarga warna yang sama.
- Mengubah tiga baris teratas leaderboard menjadi podium gold, silver, dan bronze dengan latar lebih gelap/saturasi tinggi serta teks putih berkontras.
- Mempertegas profil sebagai Player Card: ID username, avatar, nama, kelas, XP, level, dan koleksi pencapaian.
- Mengubah badge menjadi medali visual berbentuk kartu kecil dengan animasi mengambang dan respons hover; keadaan belum memiliki badge juga diberi tampilan khusus.
- Menambahkan ornamen pixel, kedalaman, dan aksen gerak ringan pada profil serta footer agar halaman lebih konsisten dengan Arcade Game Hub.
- Animasi mengikuti `prefers-reduced-motion`.
- Tidak mengubah query leaderboard, data profil, XP, level, badge yang tersimpan, scoring, mesin latihan, database, skema, API, atau RPC.

Status: implementasi visual dikirim ke branch `homepage-arcade-catalog`; menunggu Vercel Preview build dan QA ulang pengguna. Belum di-merge ke `main` dan belum mengubah Production.
