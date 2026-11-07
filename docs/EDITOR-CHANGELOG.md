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

## Roadmap berurutan

### Tahap 0 — Arsip dan inventaris
- [x] Menetapkan `editor-test` sebagai branch kerja sementara.
- [x] Menetapkan `main` tidak disentuh.
- [x] Mengarsipkan milestone, inventaris file, build failure, warning, dan solusi pada dokumen ini.
- [x] Memastikan perbedaan halaman bank soal dan halaman editor ujian tercatat.

### Tahap 1 — Integrasi halaman editor ujian
- [x] Audit alur state, load/save, tipe soal, pilihan, pernyataan benar-salah, pembahasan, renderer, dan validasi; hasil dicatat pada bagian Audit Tahap 1.
- [ ] Integrasikan RichTextEditor pada field yang sesuai tanpa mengganti struktur data dan penilaian.
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

