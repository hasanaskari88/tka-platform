# ROADMAP TKA PLATFORM — PRODUCTION (MAIN)

Pembaruan: 10 November 2026  
Repository: `hasanaskari88/tka-platform`  
Branch Production: `main`  
URL Production: https://grisan.vercel.app/

Dokumen ini adalah **satu-satunya catatan utama untuk kondisi Production**. Dokumen `ROADMAP.md` pada branch `homepage-arcade-catalog` adalah satu-satunya catatan utama pengembangan/Preview. Jangan membuat roadmap atau checklist paralel per fitur/batch.

## 1. Tujuan dan aturan perubahan Production

Production adalah versi layanan yang digunakan siswa dan guru. Prioritasnya stabilitas, integritas jawaban/nilai, keamanan akses, dan ketersediaan fungsi pembelajaran.

1. Tidak ada perubahan kode Production tanpa persetujuan eksplisit pengguna.
2. Tidak ada merge PR, deployment, rollback, atau perubahan konfigurasi Production tanpa persetujuan eksplisit.
3. Tidak ada perubahan database: schema, migration, RLS, policy, grant, function, trigger, maupun data tanpa persetujuan khusus.
4. Perubahan yang sedang disiapkan untuk Preview tidak otomatis menjadi bagian Production.
5. Catatan kosmetik, fitur tambahan, dan saran baru masuk ke roadmap Preview/backlog; tidak langsung dikerjakan di Production.
6. Sebelum perubahan apa pun, periksa catatan ini dan roadmap Preview untuk memastikan status, keputusan, dan QA terdahulu. Jangan mengulang pekerjaan yang sudah selesai tanpa alasan baru.
7. Setelah rilis atau QA dikonfirmasi, perbarui dokumen ini dengan commit/deployment dan hasil sebenarnya.

## 2. Status Production terkini

| Komponen | Status |
|---|---|
| Branch | `main` |
| Commit | `924a1b4895f911f7c4d6307474e79926aef2084e` |
| Commit message | `fix: make CBT session recovery resilient` |
| Deployment | READY |
| Deployment ID | `dpl_4VCs1NvSD5KV9ZuoTnCd3mWsKgkh` |
| URL utama | https://grisan.vercel.app/ |
| Region | `iad1` |

### Pembaruan dokumentasi 10 November 2026

- [x] File Production `ROADMAP.md` dibuat pada commit `00d620881aa76e5c42fd7776411a86b02ca536a9`.
- [x] Vercel mendeteksi commit dokumentasi, tetapi deployment otomatis berstatus CANCELED karena konfigurasi *Ignored Build Step*; tidak ada build aplikasi baru.
- [x] Deployment READY sebelumnya untuk commit CBT tetap menjadi deployment Production aktif; pembaruan ini hanya menambah dokumentasi, bukan mengubah kode aplikasi.

## 3. Fungsi Production yang telah dikonfirmasi

### WYSIWYG editor soal

- [x] Editor WYSIWYG untuk teks soal, pilihan, kunci, dan pembahasan telah masuk Production melalui rilis sebelumnya.
- [x] QA pengguna mencakup tampilan siswa, koreksi guru, ringkasan, cetak, ekspor, pengerjaan ujian, dan penilaian essay manual.
- [x] Teks, rumus, gambar/diagram, crop, wrap, resize, simpan, dan buka ulang telah dinyatakan berjalan normal dalam cakupan pengujian.
- [x] Font Arab dan Aksara Jawa telah diuji di halaman font test dan tampil dengan benar.
- [ ] Dokumen Word yang sangat panjang belum diuji; ini bukan blocker untuk fungsi editor yang sudah lulus.
- [ ] Detail kunci matriks pada ekspor daftar soal Excel belum disempurnakan; sebelumnya dinyatakan bukan prioritas.

**Aturan:** jangan mengulang QA editor yang sudah lulus jika kode terkait tidak berubah. Jika ada perubahan editor di kandidat Preview, uji hanya area yang terdampak dan kompatibilitas yang relevan.

### CBT dan pemulihan sesi

- [x] Perbaikan pemulihan sesi CBT masuk ke `main` melalui commit `924a1b4895f911f7c4d6307474e79926aef2084e`.
- [x] Polling sesi tidak lagi memanggil verifikasi login berulang setiap tiga detik.
- [x] Ketika sesi sementara tidak ditemukan, jawaban lokal tidak langsung dihapus dan halaman tidak otomatis memaksa navigasi ulang.
- [x] Ditambahkan tampilan pemulihan/error dan penanganan status sesi.
- [x] Deployment Production berhasil berstatus READY.
- [x] Pengguna telah menyelesaikan pengujian langsung dan mengonfirmasi sesi normal serta jawaban tidak hilang.

**Keputusan:** CBT dinyatakan normal berdasarkan pengujian pengguna. Jangan mengubah atau mengulang pengujian CBT tanpa bukti masalah baru atau perubahan kode yang berdampak.

## 4. Garis kerja pengembangan berikutnya

Pengembangan fitur berikutnya dilakukan melalui branch Preview, bukan langsung di Production.

### Prioritas pengembangan pertama — Dashboard Admin dan Live Monitor

Status: **sedang disiapkan di roadmap Preview; belum menjadi perubahan Production.**

Arah yang sedang dievaluasi:
- Ringkasan dashboard admin dan informasi tindak lanjut yang mudah dibaca.
- Informasi ujian/sesi yang belum selesai dan essay yang belum dinilai jika tersedia pada perubahan lokal dan query aman.
- Filter kategori dan akses cepat menuju Live Monitoring.
- Utamakan UI, navigasi, dan keterbacaan.
- Hindari perubahan schema, RLS, RPC, XP, scoring, dan alur CBT kecuali ada temuan nyata dan persetujuan khusus.

Rincian inventaris file dan keputusan batch disimpan hanya di `ROADMAP.md` pada branch Preview. Setelah kandidat Preview disetujui dan benar-benar dirilis ke Production, bagian ini diperbarui dengan versi dan hasil aktual.

### Kelompok pengembangan berikutnya

| Area | Status Production | Arah keputusan |
|---|---|---|
| Practice Mode | Belum ada rilis baru yang disetujui dari paket Preview | Evaluasi di Preview setelah Batch 1 |
| Maze dan Flashcard | Perubahan Preview bergantung pada pemeriksaan migration progres | Jangan rilis sebelum dependensi database diverifikasi dan disetujui |
| Import DOCX | Dinonaktifkan secara sengaja pada UI import | Tetap nonaktif sampai pengguna memutuskan membuka kembali pekerjaan ini |
| Google Drive upload | Integrasi sedang disiapkan/ditinjau di jalur pengembangan | Jangan uji atau ubah koneksi/token Production tanpa rencana dan persetujuan |
| Penyempurnaan ekspor | Ada catatan non-kritis dari QA sebelumnya | Masuk backlog, bukan blocker |

## 5. Catatan yang sengaja tidak dikerjakan di Production

- DOCX import tidak diaktifkan hanya karena parser DOCX masih ada di file.
- Tidak menjalankan migration dari branch Preview ke database Production.
- Tidak melakukan uji tulis akun, impor massal, atau upload Drive menggunakan data nyata tanpa rencana aman.
- Tidak mengubah penilaian, kunci jawaban, XP, badge, atau penyimpanan jawaban sebagai bagian dari penyempurnaan visual.
- Tidak memasukkan permintaan fitur baru ke Production sebelum dievaluasi dan diuji di Preview.

## 6. Komitmen proses pengembangan

Asisten berkomitmen untuk:
1. Membaca roadmap Production dan Preview sebelum memberi arahan atau melakukan tindakan pada proyek.
2. Menerima file/saran Codespace satu per satu, mengaudit dan mencatat terlebih dahulu; bukan langsung mengubah.
3. Menilai kepentingan, alasan, arah pengembangan, dependensi, dan risiko setiap temuan.
4. Menyimpan hal yang belum prioritas sebagai backlog rinci pada satu roadmap Preview agar tidak perlu ditanyakan ulang.
5. Tidak mengklaim telah membaca file lokal yang belum diberikan.
6. Tidak membuat branch baru atau dokumen roadmap paralel.
7. Meminta persetujuan sebelum perubahan kode, operasi database, merge, dan rilis Production.
8. Memperbarui kedua roadmap ketika keputusan/status lintas jalur berubah.
9. Memakai bukti QA yang sudah ada; tidak meminta pengguna mengulang pengujian yang tidak terdampak.
10. Melaporkan dengan jujur apa yang sudah diperiksa, diubah, diuji, dan apa yang belum.

## 7. Riwayat perubahan Production

| Tanggal | Commit / perubahan | Hasil |
|---|---|---|
| 10 Nov 2026 | CBT session recovery — `924a1b4895f911f7c4d6307474e79926aef2084e` | Deployment READY; pengujian pengguna normal dan jawaban tidak hilang |
| Sebelumnya | WYSIWYG question editor | QA pengguna dinyatakan normal sesuai catatan `docs/EDITOR-CHANGELOG.md` |

## 8. Status keputusan rilis saat ini

**Production stabil berdasarkan status dan pengujian yang telah dilaporkan. Tidak ada batch perubahan Production yang sedang disetujui.**

Pekerjaan berikutnya adalah inventaris dan persiapan Batch 1 di Preview. Setelah Preview selesai diuji, keputusan rilis Production akan diminta secara terpisah. Pembuatan atau pembaruan dokumen roadmap tidak berarti persetujuan merge fitur Preview.

---

Terakhir diperbarui: 10 November 2026.  
Dokumen ini hanya diubah ketika status Production, keputusan rilis, atau komitmen lintas jalur berubah.


## 9. Sinkronisasi roadmap dan riwayat rilis — 10 November 2026

### Fungsi utama roadmap Production

Dokumen ini menjadi catatan versi aplikasi yang benar-benar sudah dirilis. Setiap deployment Production yang membawa perubahan aplikasi harus menambahkan satu entri riwayat rilis/batch yang berisi:
- tanggal dan nama/nomor batch;
- commit SHA Production sebelum dan sesudah rilis;
- deployment ID, status, dan URL deployment/alias Production;
- daftar file yang berubah atau tautan perbandingan commit;
- ringkasan fitur/perbaikan yang benar-benar masuk;
- dependensi dan keputusan khusus (misalnya database/API) yang telah disetujui;
- hasil build dan QA yang benar-benar dilakukan, termasuk pengujian pengguna;
- catatan rollback atau tindak lanjut jika ada.

Deployment dokumentasi saja dicatat sebagai pembaruan dokumentasi dan **tidak** dihitung sebagai rilis aplikasi. Status build READY tidak otomatis berarti runtime lulus QA.

### Hubungan dengan roadmap Preview

- `main/ROADMAP.md` adalah catatan Production dan riwayat rilis.
- `homepage-arcade-catalog/ROADMAP.md` adalah catatan Preview, inventaris file, perbedaan branch, batch aktif, dan backlog.
- Setelah setiap rilis Production, kedua roadmap diselaraskan: item yang terbukti masuk Production ditandai dirilis dengan commit/deployment; item yang belum masuk tetap terbuka di Preview.
- Sebelum menyetujui rilis, catat snapshot SHA HEAD kedua branch, merge base, ahead/behind, dan daftar file yang berbeda. Jangan hanya mengandalkan nomor commit atau status PR.
- Perbedaan branch harus dianalisis dari kedua sisi. Jika branch diverged, periksa commit Production yang belum ada di Preview dan perubahan Preview yang belum ada di Production untuk mencegah penimpaan atau konflik.
- Inventaris per file mencatat versi Production, versi Preview, perilaku, perbedaan, dependensi, risiko, keputusan batch, dan status QA. Kode lokal Codespace hanya ditambahkan setelah benar-benar diberikan/dapat diakses.

### Snapshot rekonsiliasi GitHub — 10 November 2026

| Item | Nilai terverifikasi |
|---|---|
| HEAD Production | `main` — `22f0f005921dcc5bc3e2f595951e3dc11de394e7` |
| HEAD Preview | `homepage-arcade-catalog` — `fd4988e8434364342223e2ea1eb931084210f4a7` |
| Status branch | Diverged |
| Preview ahead / behind | 176 commit ahead, 3 commit behind |
| File berbeda | 30 |
| Merge base | `9979e3523e3d296d51cb1b650c97e1f9edebac27` |

**Catatan:** snapshot ini menunjukkan posisi GitHub saat audit, bukan status Codespace lokal. Perbedaan tiga commit Production yang belum ada di Preview harus diperiksa sebelum menyusun kandidat rilis berikutnya.

### Riwayat deployment aplikasi

Belum ada rilis aplikasi baru yang disetujui pada pembaruan roadmap ini. Status Production yang berlaku tetap deployment CBT READY pada commit `924a1b4895f911f7c4d6307474e79926aef2084e` seperti tercatat di bagian 2 dan 7. Commit `22f0f005921dcc5bc3e2f595951e3dc11de394e7` adalah pembaruan dokumentasi roadmap; bukan bukti deployment aplikasi baru.

### Status audit dashboard

File `app/admin/page.tsx` Preview telah dibandingkan dengan Production pada 10 November 2026. Perubahan dashboard dicatat sebagai kandidat Batch 1 di roadmap Preview. Belum ada perubahan aplikasi atau rilis Production yang dilakukan.


### Status Preview Batch 1 — 10 November 2026

- Implementasi awal Dashboard Admin dan Live Monitor telah dilakukan hanya pada branch `homepage-arcade-catalog`; tidak ada perubahan pada Production.
- Build Preview untuk commit `0c008ba0a1c52a5326c2ef64d746f330a24e8918` berstatus READY (deployment `dpl_Dd5XveAWQrPnon4hjiLbY8FtATpV`).
- QA browser masih menunggu konfirmasi pengguna. Batch 1 belum dianggap lulus QA dan belum menjadi kandidat rilis Production.
- Rincian file, commit, koreksi build, dan checklist QA tetap diarsipkan pada `homepage-arcade-catalog/ROADMAP.md`.


## Penilaian kandidat rilis Preview — 10 November 2026

- Audit terbaru membandingkan `main` dengan `homepage-arcade-catalog`: branch diverged, Preview 193 commit ahead dan 5 commit behind; terdapat 31 file berbeda pada snapshot audit.
- Tidak ada merge/push ke Production yang dilakukan. Batch 1 Dashboard Admin + Live Monitor masih menunggu QA browser dan belum siap dirilis.
- Homepage, Admin, dan Practice mungkin dirilis bertahap, tetapi merge seluruh branch Preview tidak aman. Homepage bergantung pada perubahan CSS global; Admin Preview jauh lebih ringkas daripada Admin Production sehingga fitur Production harus direkonsiliasi; Practice bergantung pada halaman detail, mesin game, dan migration/RPC progres Practice.
- Migration `20261108000100_practice_attempt_progress.sql` belum ada di Main dan mengubah kolom serta RPC terkait progres/XP. Tidak boleh diterapkan di Production tanpa audit dan persetujuan database terpisah.
- Rekomendasi: siapkan kandidat terpisah untuk (A) Homepage + CSS terpilih, (B) Admin hasil rekonsiliasi fitur Production, dan (C) Practice sebagai paket frontend/backend yang ditinjau tersendiri. Rekonsiliasi 5 commit Main yang tertinggal sebelum menyiapkan merge.
- Rincian file, SHA, dependensi, dan risiko dicatat pada `homepage-arcade-catalog/ROADMAP.md`. Status Production dan database tidak berubah.


### Pembaruan snapshot sebelum persiapan Kandidat A — 10 November 2026

- Pemeriksaan ulang setelah pembaruan roadmap menunjukkan branch telah berubah: `homepage-arcade-catalog` sekarang **194 commit ahead dan 6 commit behind** dari `main`; status tetap `diverged`; merge base `9979e3523e3d296d51cb1b650c97e1f9edebac27`.
- Perbandingan masih menunjukkan 31 file berbeda, termasuk Admin, Practice, CSS global, tiga migration, API, komponen game, dan dokumentasi. Perubahan angka dari snapshot sebelumnya disebabkan commit dokumentasi yang baru masuk ke kedua branch.
- Kandidat A tetap dibatasi pada Homepage dan dependensi visual yang benar-benar diperlukan. PR langsung dari branch Preview saat ini akan mencakup perubahan lain yang belum disetujui, sehingga **tidak dibuat**.
- Belum ada branch baru atau PR kandidat karena proses proyek saat ini menetapkan tidak membuat branch baru. Menyiapkan PR terisolasi membutuhkan pengecualian eksplisit untuk membuat branch rilis sementara; alternatif push langsung ke `main` tidak direkomendasikan untuk rilis ini.
- Tidak ada kode aplikasi, database, deployment, atau konfigurasi Production yang diubah.


## Keputusan proses yang ditegaskan pengguna — 10 November 2026

Keputusan ini **menggantikan usulan sebelumnya** tentang pembuatan branch rilis sementara untuk Kandidat A.

- Tidak membuat branch baru, branch sementara, atau branch perantara. Jangan meminta pengecualian untuk aturan ini lagi.
- Pekerjaan lanjutan Kandidat A (Homepage) tetap dilakukan langsung pada branch Preview yang sudah ada: `homepage-arcade-catalog`.
- Tidak membuat PR/merge ke `main` sebagai bagian dari pekerjaan Preview ini. Production tetap tidak disentuh; rilis ke Production hanya dibahas jika pengguna kemudian memintanya secara eksplisit.
- Jangan menyalin seluruh Preview ke `main`, jangan melakukan push langsung ke `main`, dan jangan mencoba mengakali perbedaan branch dengan membuat jalur rilis lain.
- Catatan keputusan disisipkan di roadmap yang sudah ada. Jangan membuat roadmap, arsip, atau checklist baru untuk keputusan ini.
- Snapshot pembandingan terbaru saat catatan ini ditulis: Preview `fa4722737228087fb531ccc7f7f45a0e924ff5ef`; Main `e34abf3f8383a028b66c5c2e1cba7c7216660267`; status `diverged`; Preview 195 commit ahead dan 7 commit behind; merge base `9979e3523e3d296d51cb1b650c97e1f9edebac27`. Angka ini hanya snapshot, bukan alasan untuk membuat branch tambahan.
- Semua pengembangan berikutnya yang dimaksud pengguna dilakukan di Preview yang sama, dengan cakupan yang sudah disepakati. Perubahan database dan Production tetap memerlukan persetujuan khusus.

**Instruksi operasional:** sebelum perubahan berikutnya, baca kedua roadmap, periksa HEAD Preview terkini, lalu kerjakan hanya di `homepage-arcade-catalog`. Perbarui roadmap yang sama setelah tindakan nyata. Jangan mengulang pertanyaan tentang branch sementara.


## Keputusan alur kerja terbaru — 10 November 2026

Keputusan ini menggantikan instruksi lama yang mewajibkan semua pekerjaan baru masuk Preview terlebih dahulu atau melarang push selektif langsung ke `main`.

- `main` adalah acuan utama aplikasi dan tempat rilis/pengujian untuk perubahan kecil dengan risiko rendah.
- Perubahan kecil, terisolasi, tanpa dampak database, autentikasi, scoring, penyimpanan jawaban, alur CBT, atau dependensi lintas fitur boleh dikerjakan langsung pada `main` setelah ruang lingkupnya jelas. Build dan QA dilakukan pada deployment Production setelah perubahan masuk; pantau hasilnya dan perbaiki segera bila deployment/error ditemukan.
- Perubahan besar atau berisiko — termasuk perubahan lintas halaman, CSS global, arsitektur, autentikasi, alur ujian/nilai/jawaban, API penting, dan dependensi database — tetap direncanakan serta diuji di branch Preview `homepage-arcade-catalog` sebelum dipertimbangkan untuk rilis.
- Preview berfungsi sebagai ruang rencana, inventaris, dan persiapan batch; tidak perlu menampung perbaikan kecil yang aman. Jangan menambah pekerjaan Preview hanya demi mengikuti alur yang kaku.
- Pertahankan hanya dua branch yang ada: `main` dan `homepage-arcade-catalog`. Jangan membuat branch baru atau branch perantara.
- Jangan merge seluruh PR #2 secara otomatis. Pilih hanya file/commit yang memang disetujui; jaga perubahan Production yang tidak terkait. Perubahan database tetap memerlukan persetujuan khusus.
- Arsipkan perubahan pada dokumen yang sudah ada: `main/ROADMAP.md` mencatat rilis yang benar-benar masuk Production; `homepage-arcade-catalog/ROADMAP.md` mencatat rencana, inventaris, risiko, dan batch Preview. Riwayat editor tetap di `docs/EDITOR-CHANGELOG.md`. Jangan membuat dokumen arsip/roadmap/checklist baru.
- Setiap catatan rilis penting mencantumkan tanggal, alasan, file/area, commit sebelum-sesudah, deployment/status, hasil build, QA yang dilakukan, dan tindak lanjut/rollback bila ada. Bedakan tegas antara build READY dan QA runtime yang lulus.
- Persetujuan pengguna pada percakapan 10 November 2026 mencakup jalur push selektif langsung ke `main` untuk perubahan kecil/risiko rendah. Persetujuan ini bukan izin umum untuk migration/database, perubahan besar, atau mengganti seluruh branch Preview.

**Prioritas operasional:** jangan menambah fitur baru ke Preview sebelum ada kebutuhan batch yang jelas. Untuk setiap permintaan berikutnya, klasifikasikan risiko terlebih dahulu dan pilih jalur paling pendek yang aman.


## Protokol eksekusi cepat dan pengamanan rilis — 10 November 2026

Protokol ini adalah instruksi operasional default untuk pekerjaan berikutnya; asisten harus menerapkannya tanpa meminta pengguna mengulang aturan.

### Jalur cepat perubahan berisiko rendah
1. Audit singkat perubahan yang diminta: file terdampak, dependensi/import, dampak data/API, dan kemungkinan regresi.
2. Jika perubahan benar-benar kecil dan terisolasi, tidak menyentuh database/migration/RLS, auth/role, scoring/nilai, penyimpanan jawaban, timer/sesi CBT, atau alur proktor, kerjakan langsung pada `main` tanpa Preview dan tanpa branch baru.
3. Periksa diff sebelum commit. Hindari refactor atau format massal yang tidak diperlukan.
4. Commit perubahan terfokus ke `main`. Integrasi Git Vercel yang sudah terhubung menjadi jalur deployment otomatis; jangan membuat deployment manual kedua kecuali diperlukan untuk pemulihan.
5. Pantau status deployment yang cocok dengan SHA commit. Pastikan alias Production tetap menunjuk deployment READY. Setelah build READY, lakukan smoke test sesuai area yang berubah; READY bukan pengganti QA runtime.
6. Jika build gagal, deployment tidak menjadi rilis READY; baca log, perbaiki penyebab pada `main` dengan commit koreksi terfokus, lalu verifikasi ulang. Jika runtime bermasalah setelah rilis, hentikan perubahan lain, gunakan deployment READY sebelumnya sebagai kandidat rollback, dan minta/ikuti persetujuan pengguna untuk rollback bila tindakan diperlukan.
7. Catat commit, deployment, hasil pemeriksaan, smoke test, dan tindak lanjut pada roadmap Production yang sama.

### Gerbang wajib ke Preview / persetujuan khusus
- Perubahan banyak file, lintas halaman, CSS global/layout, dependency besar, auth/security, API kontrak, data siswa, CBT/penilaian/jawaban, atau fitur baru yang kompleks harus disiapkan dan diuji di Preview.
- Semua migration, SQL, schema, RLS/policy/grant/function/trigger, perubahan data, dan operasi pada koneksi Google Drive/akun nyata memerlukan audit serta persetujuan khusus terpisah.
- Jangan menyalin seluruh Preview atau merge PR #2 secara otomatis. Pilih perubahan yang telah disetujui dan pertahankan perbaikan khusus Production.
- Jangan menambah branch, membuat arsip/roadmap/checklist baru, atau menjalankan deployment manual ganda tanpa alasan.

### Status otomatisasi yang diperiksa
- Project Vercel `grisan` terhubung dengan deployment Git untuk branch `main`; riwayat deployment memperlihatkan commit dokumentasi `e8f017a` otomatis menghasilkan deployment Production yang berstatus CANCELED karena perubahan hanya dokumentasi/konfigurasi Ignored Build Step. Ini bukan build aplikasi yang gagal.
- Deployment aplikasi READY terakhir yang terverifikasi tetap commit CBT `924a1b4895f911f7c4d6307474e79926aef2084e`, deployment `dpl_4VCs1NvSD5KV9ZuoTnCd3mWsKgkh`, alias `grisan.vercel.app`.
- Belum ada GitHub Actions workflow pada lokasi `.github/workflows` yang dapat diakses/ditemukan dalam pemeriksaan ini; branch protection juga tidak dapat dibaca melalui integrasi saat ini. Karena itu jangan mengklaim CI gate atau perlindungan branch sudah aktif.
- Keputusan percepatan: manfaatkan Git-to-Vercel auto deployment yang sudah ada terlebih dahulu. Jangan menambahkan workflow CI/deploy yang membutuhkan token/secret atau men-deploy ulang secara paralel sebelum konfigurasi, hak akses, dan kebutuhan build diverifikasi. Otomatisasi tambahan harus menjadi pemeriksaan kualitas/health check yang tidak dapat mengubah data atau mempromosikan deployment tanpa izin.

**Prinsip utama:** jalur tercepat yang aman adalah satu commit terfokus ke `main` → satu deployment otomatis Vercel → verifikasi status dan smoke test → arsipkan hasil. Kecepatan tidak boleh mengorbankan stabilitas situs dan integritas jawaban/nilai.


### Hasil pemeriksaan akses branch — 10 November 2026

- Endpoint GitHub branch menunjukkan `main.protected = false`; required status checks belum dikonfigurasi. Integrasi yang tersedia dapat membaca status ini, tetapi tidak memiliki akses untuk mengubah aturan proteksi branch.
- Artinya, push langsung ke `main` memang dapat dilakukan sesuai jalur cepat yang disetujui, tetapi belum ada pemeriksaan GitHub yang memblokir commit bermasalah sebelum Vercel mulai membangun. Karena itu, pemeriksaan diff sebelum commit dan pemantauan deployment/smoke test setelah commit menjadi wajib.
- Jangan mengaktifkan proteksi yang mewajibkan PR tanpa keputusan baru, karena itu akan bertentangan dengan jalur langsung ke `main` yang baru disepakati.
- Tidak ada perubahan kode aplikasi atau konfigurasi branch protection dalam pemeriksaan ini.


## Koreksi keputusan dan komitmen kerja terbaru — 10 November 2026

Catatan ini menegaskan maksud pengguna dan **mengoreksi asumsi audit sebelumnya**. Jangan mengulang asumsi yang keliru pada sesi berikutnya.

### Makna perubahan Admin di Preview
- Perubahan Admin pada Preview dimaksudkan sebagai **penataan ulang/redistribusi fitur ke halaman-halaman baru**, bukan menghapus kemampuan Admin Production.
- Dashboard yang lebih ringkas bukan bukti bahwa fitur lama hilang. Sebagian fungsi pengelolaan dipindahkan ke halaman khusus (misalnya Bank Soal, Konten Website, Data Peserta, Practice, Raport, dan Pengaturan Dokumen) agar dashboard menjadi pusat ringkasan dan pintasan.
- Saat membandingkan Main dengan Preview, periksa keseluruhan alur dan seluruh halaman tujuan, bukan hanya membandingkan satu file `app/admin/page.tsx`. Jika satu komponen tidak lagi berada di dashboard, telusuri apakah fungsinya tersedia/lebih lengkap pada halaman baru atau komponen lain.
- Jangan menyimpulkan fitur Production terhapus hanya karena tidak tampak pada file dashboard Preview. Catat pemetaan: fungsi lama → lokasi baru → bukti implementasi → status. Nyatakan sebagai benar-benar hilang hanya setelah menelusuri seluruh halaman/route/komponen terkait dan memastikan tidak ada pengganti.
- Pengguna telah meminta pekerjaan Preview yang sudah dicoba/dibangun dimanfaatkan; jangan mengabaikan hasil uji atau meminta pengguna mengulang dari awal. Gunakan riwayat commit, deployment READY, catatan QA, serta perbandingan kode sebagai bukti yang tersedia. Bedakan dengan jujur bagian yang sudah diuji dari yang belum.

### Cara kerja yang dipercepat — Preview sebagai sumber, bukan gerbang wajib
1. `main` adalah tujuan utama rilis. Untuk pekerjaan berikutnya, periksa hasil implementasi terbaru di `homepage-arcade-catalog` dan riwayat QA/deployment yang sudah ada, lalu manfaatkan kode yang sudah selesai alih-alih membangun ulang.
2. Jika perubahan/halaman sudah dibuat dan dicoba di Preview, jalur default adalah **porting selektif langsung ke `main`**, termasuk penataan ulang Admin atau penambahan halaman baru. Tidak perlu mengulang tahap Preview atau meminta persetujuan ulang untuk pekerjaan yang sudah jelas diminta pengguna.
3. Jangan terlalu konservatif atau memperlambat rilis dengan audit berulang. Lakukan perbandingan yang terarah: route dan halaman, komponen yang dipakai, fungsi lama dan lokasi barunya, import/dependensi, kontrak data/API, serta kebutuhan migration. Fokus pada hal yang benar-benar dapat menyebabkan regresi.
4. Bila ada fitur yang tampak hilang dari satu halaman, cari penggantinya di halaman baru/komponen lain sebelum menyimpulkan kehilangan. Tujuan perubahan adalah menyusun ulang dan melengkapi pengalaman, bukan mengurangi kemampuan yang telah ada.
5. Pertahankan fitur Production yang tidak termasuk dalam penataan ulang; gabungkan dengan versi Preview bila memang masih diperlukan. Jangan mengganti file besar secara buta jika pemetaan menunjukkan ada kemampuan yang belum dipindahkan.
6. Setelah pemetaan singkat dan dependensi dipahami, kerjakan porting dalam batch yang masuk akal langsung pada `main`; jangan membuat branch atau PR baru. Gunakan hanya dua branch yang sudah ada.
7. Database migration/SQL, perubahan schema/RLS/policy/grant/function/trigger/data, kredensial, dan operasi akun/Google Drive nyata tetap memerlukan persetujuan khusus. Untuk area lain, jangan memakai label "berisiko" sebagai alasan otomatis untuk mengulang pekerjaan di Preview; pilih jalur terpendek yang didukung bukti.
8. Arsipkan kode sebelum perubahan melalui commit SHA stabil Git. Setelah perubahan lolos build dan QA, catat commit sebelum/sesudah, file/route yang dibawa, fungsi yang dipindah/dilengkapi, deployment ID/status, QA yang benar-benar dilakukan, dan tindak lanjut di roadmap yang sudah ada. Git adalah arsip kode lengkap; tidak perlu membuat salinan folder atau dokumen arsip baru.
9. Build/deployment READY bukan bukti semua fungsi runtime lulus. Namun jangan meminta pengujian ulang yang sudah tercatat dan tidak terdampak; lakukan smoke test hanya untuk alur yang berubah dan regresi yang relevan.

### Instruksi operasional untuk asisten
- Terapkan keputusan ini otomatis pada semua pekerjaan berikutnya tanpa meminta pengguna mengingatkan.
- Jangan menyatakan bahwa halaman Preview menghapus fitur Production sebelum menelusuri halaman baru yang menggantikannya.
- Jangan menyarankan mengulang pembuatan halaman yang sudah ada dan telah diuji di Preview.
- Prioritaskan hasil nyata yang cepat masuk `main`, dengan catatan versi yang rapi dan pemeriksaan yang proporsional.


## Porting Admin dari Preview ke Production — 10 November 2026

- **Sebelum:** `1391a3310cd8dacd9146a952e00bf7c54066071b`
- **Sesudah:** `d9881e4ed1c8d8f608aeec7e76cd02a25ed8a0eb`
- **Commit:** `feat(admin): reorganize dashboard and add dedicated admin pages`
- Porting selektif: `app/admin/page.tsx`, `app/admin/bank-soal/page.tsx`, `app/admin/konten/page.tsx`, `app/admin/pengaturan-dokumen/page.tsx`, `app/admin/peserta/[id]/page.tsx`, dan `app/admin/raport/page.tsx`.
- Fungsi dashboard yang dipindah ke halaman khusus: pengelolaan paket/soal/subtes, konten/pengumuman/materi, riwayat peserta, raport, dan pengaturan dokumen.
- Fitur Production yang tetap dipertahankan: halaman pengguna `/admin/users` beserta API Production, halaman Practice, Live Monitor, layout/admin guard, hasil ujian/penilaian, dan integrasi Google Drive. Tidak dilakukan penggantian massal terhadap API pengguna, library Supabase, CSS global, atau mesin game.
- **Batas database:** tidak ada migration/SQL atau perubahan Supabase yang dijalankan. Halaman Raport dan Pengaturan Dokumen sudah tersedia, tetapi penyimpanan identitas sekolah/penandatangan membutuhkan migration dan RPC yang belum diterapkan pada Production; halaman akan menampilkan peringatan sampai perubahan database disetujui dan dijalankan terpisah.
- Build dan QA runtime belum dikonfirmasi pada saat pencatatan ini. Status commit bukan klaim bahwa seluruh halaman telah lulus QA.



## Otomatisasi sinkronisasi Main → Preview — 10 November 2026

- Workflow aktif: `.github/workflows/sync-main-to-preview.yml`.
- Tujuan: setiap push ke `main` otomatis menggabungkan perubahan Main ke `homepage-arcade-catalog`, tanpa membuat branch/PR tambahan.
- Perbaikan: percobaan pertama (`42713464301`) gagal karena konflik konten `ROADMAP.md`; log memastikan tidak ada konflik kode pada percobaan tersebut.
- Workflow diperbaiki pada commit `a6ec3b45519120c1b3b427515c660e3e27d8b999`: jika satu-satunya konflik adalah `ROADMAP.md`, pertahankan roadmap Preview karena dokumen itu menyimpan rencana dan QA Preview. Konflik file lain tetap menghentikan sinkronisasi agar tidak memilih kode secara otomatis.
- Eksekusi berhasil: run `42714873123`, job `129493670281`, status **success**.
- HEAD Main saat sinkronisasi: `a6ec3b45519120c1b3b427515c660e3e27d8b999`.
- HEAD Preview sebelum: `cb29aec2d6f7461ec7746b32e4e23b6a69325657`; sesudah: `267cc112fd59017943f1d2ce4b3ae5c8a24ece02`.
- Hasil verifikasi: Preview sudah memuat Main sebagai ancestor; compare menunjukkan `ahead 203 / behind 0`. Perubahan khusus Preview tetap dipertahankan.
- Workflow hanya menyinkronkan kode Git. Tidak menjalankan migration/SQL, mengubah data Supabase, mengubah token Google Drive, atau mempromosikan deployment Production.



## Promosi Preview ke Main dengan perlindungan alur peserta — 10 November 2026

- Strategi operasional disederhanakan: pengujian dilakukan sambil website digunakan; temuan dicatat dan perbaikannya langsung masuk ke `main`.
- Commit Main sebelum promosi: `1cd2679e4f913a43811803e3b8c0ac31b4e7143c`.
- Commit Preview yang dipromosikan: `dbee96b5245cb91462fb1e0ec3dcf3752fa92c63`.
- Commit merge Main: `b629e2794d34285bfd01b69bd01e3329969839ce`.
- Perubahan Preview lainnya dibawa ke Main sebagai satu merge Git, dengan riwayat kedua branch tetap tersambung.
- Untuk menjaga alur latihan peserta Production pada tahap pertama, empat file berikut dipertahankan persis dari Main sebelum promosi:
  - `app/practice/page.tsx`
  - `app/practice/[id]/page.tsx`
  - `components/games/FlashcardEngine.tsx`
  - `components/games/MazeGameEngine.tsx`
- Alur ujian peserta Production sudah berada pada versi Main yang tersinkron ke Preview sebelumnya; tidak ada file inti ujian peserta yang diganti dalam promosi ini.
- `ROADMAP.md` Main dipertahankan sebagai catatan rilis Production. Workflow mengembalikan roadmap Preview setelah sinkronisasi sehingga catatan QA Preview tidak hilang.
- File migration SQL yang ada di Preview ikut menjadi bagian repositori, tetapi **tidak dijalankan**. Tidak ada perubahan schema/RLS/data Supabase, token Google Drive, atau operasi akun eksternal.
- Verifikasi Git pascapromosi: Preview memuat Main sebagai ancestor (behind 0); dua commit di atas Main adalah sinkronisasi dan pemulihan roadmap Preview.
- Status deployment Vercel dan QA runtime alur ujian/latihan harus dicatat setelah hasil aktual tersedia. Merge commit bukan klaim bahwa seluruh aplikasi sudah lulus pengujian.
- Pola uji berjalan: lakukan smoke test satu siklus ujian dan satu siklus latihan; kumpulkan temuan dari penggunaan nyata; perbaiki langsung di Main; workflow otomatis menyinkronkan hasilnya ke Preview.


## Perbaikan dashboard tindak lanjut, Live Monitor, dan penilaian manual — 10 November 2026

**Status implementasi:** perubahan langsung pada `main`; menunggu hasil akhir deployment dan QA runtime.

- Commit sebelum perubahan: `b629e2794d34285bfd01b69bd01e3329969839ce`.
- Commit implementasi berurutan:
  - `3a0912fe0d29f6942b7636b2b0d30a41c07f37a3` — dashboard: menu samping yang dapat diciutkan, dropdown Perlu Ditindaklanjuti dan Live Monitor, penanda waktu sesi habis, serta tautan yang membawa ID sesi/peserta.
  - `1b8472130abda681fad02fac7a48ae3dc3b5fcd1` — halaman hasil: tautan dashboard dapat membuka tab penilaian dan modal peserta yang dipilih dengan filter essay.
  - `6b8af4b4fafa1b646ad4607721bd1ab8ecda7a0f` — Live Monitor: fokus dan sorot baris sesi dari parameter `sessionId`.
  - `bf28d6cba24f0495293530dc9b48eeefdac6be45` — footer global disembunyikan khusus pada halaman hasil/penilaian ujian.
- File berubah: `app/admin/page.tsx`, `app/admin/exam/[id]/results/page.tsx`, `app/admin/exam/[id]/monitor/page.tsx`, `components/Footer.tsx`.
- Timer sesi dashboard memakai durasi ujian, total jeda, jeda aktif, dan tambahan waktu; sesi kedaluwarsa hanya ditandai untuk tindak lanjut. Submit tetap manual melalui Live Monitor.
- Tidak ada perubahan scoring, penyimpanan jawaban, schema, migration, RLS, RPC, atau data Supabase.
- Build Vercel untuk commit terakhir sedang berjalan saat catatan ini dibuat; hasil TypeScript dan status READY belum dikonfirmasi. QA browser/runtime belum dilakukan.
- Setelah deployment selesai, verifikasi dashboard, buka-tutup kedua dropdown, menu samping desktop/mobile, tautan penilaian essay ke peserta yang benar, fokus sesi pada Live Monitor, submit manual, dan visibilitas tombol simpan tanpa footer.
- Tindak lanjut smoke-check Production sebelumnya tetap diparkir dan dilanjutkan setelah pekerjaan ini selesai.
