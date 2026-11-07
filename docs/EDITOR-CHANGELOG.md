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
