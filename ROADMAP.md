# ROADMAP TKA PLATFORM — SUMBER STATUS UTAMA

Pembaruan: 10 November 2026  
Repository: `hasanaskari88/tka-platform`  
Branch pengembangan/Preview: `homepage-arcade-catalog`  
Branch Production: `main`

Dokumen ini menggantikan checklist lama yang saling bertumpuk. Riwayat QA editor tetap disimpan di `docs/EDITOR-CHANGELOG.md`; detail rancangan keamanan tetap di `docs/SECURITY-HARDENING-REVIEW.md`.

## 1. Aturan kerja agar tidak berputar

1. Catatan atau saran baru dari pemilik proyek masuk **Catatan Pengembangan Berikutnya**. Tidak otomatis menjadi pekerjaan rilis.
2. Pekerjaan rilis hanya mencakup fungsi dasar, keamanan yang menjadi penghalang, dan perbaikan yang mencegah kegagalan/data hilang.
3. Jangan mengulang QA fitur yang sudah dikonfirmasi dan tidak berubah kodenya.
4. Build READY hanya membuktikan proses build berhasil; bukan bukti seluruh fungsi runtime sudah lulus.
5. Preview dan Production memakai proyek Supabase yang sama. Jangan melakukan uji tulis, migration, perubahan RLS/policy/grant/function/trigger, atau operasi data tanpa persetujuan khusus.
6. Jangan mengubah, menghapus, reset, rebase, atau menimpa perubahan lokal Codespace yang belum terlihat di GitHub.
7. Tidak ada merge ke `main` atau deployment Production tanpa persetujuan eksplisit.
8. Setelah daftar pekerjaan dasar ditutup, ruang lingkup rilis dibekukan. Catatan kosmetik dan fitur tambahan masuk backlog.

## 2. Posisi repository dan deployment saat audit

| Komponen | Kondisi terverifikasi |
|---|---|
| Production | `main` — `924a1b4895f911f7c4d6307474e79926aef2084e` |
| Deployment Production | READY — `dpl_4VCs1NvSD5KV9ZuoTnCd3mWsKgkh` |
| Preview | `homepage-arcade-catalog` — `bb6808251e4477c7a4d5812912b774842ac4271e` |
| Deployment Preview | Status deployment untuk HEAD terbaru belum diverifikasi |
| Selisih branch | Preview berada di depan `main`, 0 commit di belakang (jumlah commit tidak dijadikan ukuran kesiapan rilis) |
| Pull Request | PR #2 masih OPEN; metadata `mergeable` berubah antara `true` dan `false` pada pembacaan berurutan. Status mergeability dianggap belum pasti dan harus diperiksa kembali setelah ruang lingkup kode ditetapkan. |
| Perbedaan file | 29 file berubah pada perbandingan `main...homepage-arcade-catalog` |

Preview bukan berarti semua perubahan di dalamnya sudah disetujui untuk Production. PR #2 memuat beberapa kelompok pekerjaan yang lebih luas daripada judul PR-nya.

### Kelompok perubahan yang ditemukan pada perbandingan

- Homepage, tema, Arcade Game Hub, katalog sumber belajar, dan halaman materi.
- Perombakan dashboard admin yang cukup besar.
- Halaman bank soal serta beberapa halaman admin tambahan.
- Pengelolaan akun dan endpoint server-side.
- Perubahan Flashcard/Maze dan migration progres latihan.
- Dokumentasi audit, changelog, serta konfigurasi terkait.

**Kesimpulan:** jangan merge PR #2 dalam kondisi sekarang hanya karena Preview berhasil build. Ruang lingkup PR perlu dirapikan lebih dahulu agar perubahan yang belum siap tidak ikut terbawa.

## 3. Yang sudah dikerjakan dan tidak perlu diulang tanpa alasan

### Production — editor dan alur ujian

- [x] WYSIWYG editor soal sudah masuk Production melalui PR #1.
- [x] Catatan QA pengguna di `docs/EDITOR-CHANGELOG.md` menyatakan tampilan siswa, koreksi guru, ringkasan, cetak, ekspor, pengerjaan soal, dan penilaian essay manual berjalan normal.
- [x] Contoh teks, rumus, gambar/diagram, crop, wrap, resize, dan simpan/buka ulang telah diperiksa sesuai cakupan QA yang dicatat.
- [x] Dokumen Word panjang tidak diuji; ini bukan alasan untuk mengulang seluruh QA yang sudah lulus.
- [x] Keterbatasan rincian kunci matriks pada ekspor Excel sudah dicatat sebagai hal non-kritis dan sebelumnya diputuskan tidak menjadi prioritas.
- [x] Production deployment untuk commit editor berstatus READY.

### Preview — pengelolaan akun

- [x] UI pembuatan akun tunggal memanggil `POST /api/admin/users`.
- [x] UI edit dan hapus akun memanggil endpoint server-side.
- [x] UI impor massal memanggil `POST /api/admin/users/bulk`.
- [x] Data cetak kartu diambil melalui endpoint server-side; query daftar profil di browser tidak meminta kolom `plain_password`.
- [x] API memakai `requireTrustedAdmin()`, pemeriksaan same-origin untuk mutasi, dan service-role hanya setelah otorisasi lolos.
- [x] Bulk import memiliki validasi dan upaya membatalkan akun yang sempat dibuat jika proses gagal.
- [ ] Status konfigurasi Vercel `ADMIN_USER_IDS` belum dapat dipastikan dari isi repository. Helper sengaja fail-closed: bila allowlist kosong, API admin menolak akses.
- [ ] Belum ada bukti uji runtime untuk akses anonim, siswa, admin allowlist, create/edit/delete, bulk import, dan cetak kartu pada Preview. Jangan melakukan uji tulis memakai data sekolah asli.

## 4. Pekerjaan dasar yang masih menentukan kelayakan rilis

Urutan ini menjadi jalur kerja tunggal. Jangan menambah pekerjaan lain sebelum urutan ini selesai.

### P0 — Rekonsiliasi Preview dengan Codespace

- [ ] Periksa apakah perubahan lokal Codespace sudah menyelesaikan atau mengubah pekerjaan yang terlihat di Preview.
- [ ] Jangan menganggap perubahan lokal belum ada hanya karena belum masuk GitHub.
- [ ] Jangan menimpa atau menghapus perubahan lokal.
- [ ] Setelah kondisi lokal diketahui, tentukan satu versi kode yang menjadi kandidat rilis.

**Batas kemampuan audit:** GitHub dan Vercel hanya memperlihatkan kode/commit yang sudah dikirim. Perubahan lokal Codespace yang belum di-commit/push tidak dapat dibaca dari layanan tersebut atau dari akun ChatGPT lain.

### P1 — Amankan dan sederhanakan ruang lingkup PR #2

- [ ] Tinjau 29 file berdasarkan fungsi, bukan berdasarkan jumlah commit.
- [ ] Pertahankan hanya perubahan yang memang diperlukan untuk rilis dasar dan sudah memiliki bukti yang cukup.
- [ ] Jangan membawa fitur tambahan, halaman admin baru, atau perombakan besar yang belum dibutuhkan hanya demi ikut rilis.
- [ ] Jangan menggabungkan perubahan Flashcard/Maze yang bergantung pada migration yang belum diverifikasi.
- [ ] Pastikan status PR dan konflik/ketidakcocokan merge diselesaikan sebelum meminta persetujuan rilis.

### P2 — Pastikan jalur dasar admin dan siswa tidak terganggu

Cakupan fungsi dasar yang menjadi acuan:
1. Login dan pembatasan akses siswa/admin.
2. Dashboard admin dan pengelolaan paket ujian/materi.
3. Pengelolaan soal dan kunci jawaban.
4. Siswa membuka paket, mengerjakan, menyimpan jawaban, dan mengirim ujian.
5. Guru membuka hasil, memberi nilai essay manual, dan menyimpan penilaian.
6. Siswa/guru melihat ringkasan serta menggunakan cetak/ekspor.

QA yang telah dikonfirmasi di changelog tetap berlaku selama kode terkait tidak berubah. Pemeriksaan ulang hanya untuk bagian yang berubah pada kandidat rilis.

### P3 — Tutup ketergantungan database yang belum aman

- [ ] Migration `20261108000100_practice_attempt_progress.sql` masih staged dan belum terbukti diterapkan pada database bersama.
- [ ] Perubahan Flashcard/Maze memanggil RPC progres yang disediakan migration tersebut. Jangan menganggap fungsi ini tersedia hanya karena file SQL ada.
- [ ] Dua migration lain terkait pengaturan dokumen dan penandatangan juga harus dicocokkan dengan skema aktual sebelum fitur yang bergantung padanya dianggap siap.
- [ ] Review statis SQL boleh dilakukan; menjalankan migration atau mengubah database tetap memerlukan persetujuan khusus dan rencana aman.
- [ ] Audit RLS/policy/grant/trigger untuk data profil, ujian, soal, jawaban, XP, materi, dan pengumuman belum dianggap selesai.

### P4 — Satu pemeriksaan akhir kandidat rilis

- [ ] Pastikan deployment Preview untuk commit kandidat berstatus READY.
- [ ] Lakukan smoke test terbatas pada alur yang berubah dan jalur utama yang terdampak.
- [ ] Gunakan hasil QA sebelumnya untuk bagian yang tidak berubah; jangan mengulang semua skenario dari awal.
- [ ] Catat hanya blocker yang nyata. Perbaikan kosmetik dan permintaan fitur baru masuk backlog.
- [ ] Setelah laporan akhir, minta satu persetujuan rilis. Merge dan Production hanya setelah persetujuan tersebut.

## 5. Pekerjaan yang sengaja ditunda

| Pekerjaan | Alasan penundaan |
|---|---|
| Google Drive OAuth/upload dari Preview | Preview dan Production berbagi database/token; uji dapat memengaruhi koneksi Production |
| Penerapan migration dan perubahan RLS/database | Belum ada persetujuan eksekusi dan database uji terisolasi |
| Perubahan Flashcard/Maze yang bergantung pada migration progres | Fungsi database belum diverifikasi; perubahan engine tidak boleh dianggap siap |
| Uji create/bulk import akun dengan data nyata | Risiko membuat/mengubah akun sekolah; perlu prosedur uji aman |
| Penyempurnaan ekspor kunci matriks Excel | Sudah diketahui non-kritis dan sebelumnya ditunda atas keputusan pengguna |
| Paste satu dokumen Word panjang | Belum diuji; tidak menghalangi fungsi dasar yang sudah dikonfirmasi |
| Penyempurnaan visual, animasi, dan fitur tambahan | Tidak boleh memperlebar ruang lingkup rilis dasar |

## 6. Catatan Pengembangan Berikutnya

Catatan baru dari pengguna dicatat di sini terlebih dahulu. Catatan tidak otomatis menjadi pekerjaan rilis dan tidak mengubah kode sampai dipilih sebagai prioritas pada siklus berikutnya.

- Belum ada catatan baru yang dimasukkan ke daftar rilis.
- Catatan tampilan/fungsi yang ditemukan saat meninjau Preview perlu dibandingkan dengan kondisi Codespace sebelum dinyatakan belum dikerjakan.
- Jangan membuat ulang pekerjaan yang sudah selesai di Codespace atau sudah tercatat lulus QA.

## 7. Keputusan rilis saat ini

**Status: BELUM SIAP MERGE.**

Alasan yang terukur:
1. PR #2 memuat 29 file dari beberapa kelompok pekerjaan. status mergeability dari GitHub belum konsisten, dan ruang lingkup serta ketergantungan database belum siap untuk disetujui rilis.
2. Perubahan engine latihan bergantung pada migration yang belum diverifikasi.
3. Status allowlist admin dan uji runtime endpoint belum terkonfirmasi.
4. Kondisi lokal Codespace belum terlihat dalam GitHub sehingga rekonsiliasi belum lengkap.

**Langkah berikutnya:** rekonsiliasi perubahan Codespace, rapikan ruang lingkup PR #2, selesaikan hanya blocker dasar, lalu satu kali QA terarah. Jangan menambah fitur baru ke jalur rilis.

## 8. Batas audit dan perubahan

Pembaruan ini berdasarkan perbandingan GitHub, isi file Preview, changelog, metadata PR, dan riwayat deployment Vercel pada 9 November 2026. Ini bukan audit runtime penuh dan tidak membaca workspace lokal Codespace.

Tidak ada perubahan pada:
- branch `main` atau deployment Production;
- database, schema, migration, RLS, policy, grant, function, trigger, atau data siswa;
- environment variable, token Google Drive, maupun akun pengguna;
- kode aplikasi pada pembaruan roadmap ini.


## 9. Pembaruan keputusan — 10 November 2026

### Catatan sistem roadmap (tetap satu sumber per jalur)

- Dokumen ini adalah **satu-satunya catatan pengembangan untuk jalur Preview** pada branch `homepage-arcade-catalog`.
- `main` memiliki satu `ROADMAP.md sendiri untuk status Production. Kedua dokumen memakai nama dan struktur yang sama, tetapi isinya mengikuti fungsi branch masing-masing.
- Jangan membuat roadmap/checklist baru per fitur, per batch, atau per branch tambahan. Catatan teknis lama seperti `docs/EDITOR-CHANGELOG.md` tetap arsip riwayat, bukan roadmap kedua.
- Setiap file Codespace yang dikirim pengguna dicatat di bagian inventaris/backlog dokumen ini: tujuan, status penting/tidak, keputusan (masuk batch/ditunda/jangan diubah), dependensi, dan risiko. Pengiriman kode bukan izin untuk mengubahnya.
- Perbarui roadmap setelah ada keputusan baru, hasil pemeriksaan file, hasil QA pengguna, perubahan status Preview/Production, dan sebelum/sesudah evaluasi rilis. Jangan meminta pengguna mengulang informasi yang sudah tercatat.

### Batch produksi pertama — Dashboard Admin dan Live Monitor

**Prioritas aktif.** Tujuan awal adalah menyelesaikan inventaris perubahan lokal Codespace, lalu menilai perubahan dashboard dan pemantauan ujian sebagai satu paket Preview yang terarah.

Batas cakupan awal:
- Penyempurnaan dashboard admin dan ringkasan tindak lanjut.
- Informasi sesi ujian yang belum selesai dan essay yang belum dinilai, jika memang sudah ada dalam perubahan lokal dan query-nya aman.
- Filter kategori serta akses cepat ke Live Monitoring.
- Utamakan UI/navigasi. Jangan memperluas ke perubahan skema, RLS, RPC, XP, penilaian, atau alur CBT tanpa temuan dan persetujuan khusus.
- Jangan menimpa perubahan Codespace yang belum direkonsiliasi.

Urutan kerja:
1. Terima dan catat file lokal satu per satu; jangan mengubahnya.
2. Setelah inventaris cukup, bandingkan dengan Preview dan tetapkan isi Batch 1.
3. Tinjau dampak, dependensi, dan risiko; minta persetujuan sebelum implementasi.
4. Siapkan satu kandidat Preview, build, lalu uji bagian yang berubah.
5. Catat hasil dan putuskan batch berikutnya. Production tetap menunggu persetujuan rilis tersendiri.

### Inventaris file masuk — `components/BulkUploadModal.tsx`

| Bagian | Penilaian awal | Keputusan |
|---|---|---|
| Import Excel/XLSX/CSV | Fungsi inti impor | Pertahankan; bukan fokus Batch 1 |
| Import Aiken TXT | Fungsi inti impor | Pertahankan; bukan fokus Batch 1 |
| Import Moodle XML | Fungsi inti impor | Pertahankan; bukan fokus Batch 1 |
| Import JSON | Fungsi inti impor | Pertahankan; bukan fokus Batch 1 |
| DOCX dipilih lalu ditolak | Dinonaktifkan secara sengaja menurut konfirmasi pengguna | **Jangan diaktifkan atau dianggap bug** |
| Parser DOCX, pemeriksaan OMML, dan upload gambar Word | Kode tersisa untuk rencana/fitur DOCX; belum menjadi pekerjaan aktif | Catat untuk audit batch import di kemudian hari |
| Template dan preview impor | Pendukung alur impor | Pertahankan; evaluasi saat batch import dibuka |

Catatan penting: meskipun parser DOCX dan fungsi upload gambar masih ada di file, handler pemilihan file memang menolak DOCX. Ini keputusan produk yang disengaja. Tidak ada perubahan kode yang dilakukan pada file ini.

### Status CBT Production

- [x] Perbaikan pemulihan sesi CBT telah masuk ke `main` pada commit `924a1b4895f911f7c4d6307474e79926aef2084e`.
- [x] Deployment Production berstatus READY.
- [x] Pengguna mengonfirmasi pengujian selesai: sesi normal dan jawaban tidak hilang.
- [x] CBT tidak perlu diubah lagi tanpa bukti masalah baru.

### Keputusan prioritas saat ini

**Lanjutkan Batch 1 — Dashboard Admin dan Live Monitor.** File `BulkUploadModal.tsx` sudah diinventarisasi tetapi bukan prioritas sekarang. Jangan mengubah DOCX. Tidak ada kode aplikasi, database, atau konfigurasi yang diubah dalam pembaruan catatan ini.


## 10. Komitmen kerja dan tata cara inventaris (disepakati 10 November 2026)

Ini adalah prosedur tetap untuk melanjutkan proyek. Asisten berkomitmen untuk:
1. **Tidak langsung mengubah kode** saat pengguna mengirim saran atau file. Baca, pahami, dan catat lebih dahulu.
2. Menilai setiap usulan dengan kategori: **Penting untuk batch aktif / Perlu diperbaiki / Penyempurnaan / Pengembangan berikutnya / Sengaja dinonaktifkan-jangan diubah**.
3. Untuk setiap catatan, tulis tujuan, alasan penilaian, arah implementasi yang disarankan, dependensi, risiko, dan batch tujuan. Bila belum penting, tetap inventarisasikan secara rinci di backlog dokumen ini agar tidak ditanyakan atau dianalisis ulang.
4. Sebelum mengusulkan perubahan, periksa catatan roadmap dan status kode/QA yang sudah ada. Jangan mengulang proses atau meminta pengujian yang sudah dinyatakan lulus kecuali kode terkait berubah atau ada bukti masalah baru.
5. Minta persetujuan yang jelas sebelum implementasi yang mengubah kode. Minta persetujuan terpisah untuk operasi berisiko: database/migration/RLS, merge, dan Production.
6. Jangan membuat branch baru, roadmap kedua, checklist per fitur, atau catatan pengembangan paralel. Hanya dua file utama bernama `ROADMAP.md`: satu di `homepage-arcade-catalog` untuk Preview/pengembangan dan satu di `main` untuk Production.
7. Perbarui roadmap yang sesuai setiap kali ada file baru yang diinventarisasi, keputusan prioritas berubah, pekerjaan selesai, QA dikonfirmasi, atau status deployment/rilis berubah.
8. Jangan mengklaim telah membaca workspace Codespace yang belum dibagikan. File yang dikirim pengguna hanya menjadi bahan audit sampai ada persetujuan perubahan.
9. Jangan mengubah fungsi yang sengaja dinonaktifkan tanpa keputusan baru dari pengguna. Khusus DOCX pada `BulkUploadModal.tsx`, tetap nonaktif.
10. Jaga cakupan batch. Temuan di luar batch aktif dicatat untuk nanti, bukan disisipkan diam-diam ke pekerjaan berjalan.

### Format wajib untuk setiap item inventaris

| Field | Yang harus dicatat |
|---|---|
| File/fitur | Nama file atau area yang diperiksa |
| Tujuan/perubahan yang ditemukan | Perilaku atau perubahan yang dimaksud |
| Penilaian | Penting / Perlu diperbaiki / Penyempurnaan / Pengembangan berikutnya / Jangan diubah |
| Alasan | Dampak terhadap fungsi inti, keamanan, data, pengguna, atau alasan ditunda |
| Arah pengembangan | Apa yang kelak dilakukan; cukup spesifik agar tidak dianalisis ulang |
| Dependensi/risiko | Database, API, auth, scoring, XP, CBT, integrasi, atau risiko lainnya |
| Keputusan | Batch tujuan dan apakah perlu persetujuan khusus |

**Aturan pencatatan:** satu file dapat memiliki beberapa item dengan keputusan berbeda. Inventaris bukan persetujuan implementasi.


## 11. Sinkronisasi status catatan Production — 10 November 2026

- [x] Satu-satunya `ROADMAP.md` Production telah dibuat di branch `main`.
- [x] Commit pembuatan: `00d620881aa76e5c42fd7776411a86b02ca536a9`.
- [x] Vercel mendeteksi commit dokumentasi, tetapi build otomatis diabaikan oleh konfigurasi *Ignored Build Step* (deployment tercatat CANCELED). Tidak ada kode aplikasi yang berubah dan deployment CBT READY sebelumnya tetap aktif.
- [x] Pembaruan dokumen Production berikutnya mencatat status ini; tidak perlu melakukan tindakan deployment tambahan untuk file dokumentasi.


## 12. Inventaris dashboard dan rekonsiliasi branch — 10 November 2026

### Snapshot GitHub terbaru yang diperiksa

Snapshot ini memperbarui angka perbandingan pada bagian 2 yang berasal dari audit sebelumnya. Angka lama tetap menjadi riwayat audit, tetapi tidak dipakai sebagai posisi branch terkini.

| Item | Nilai terverifikasi |
|---|---|
| HEAD Production saat perbandingan | `main` — `22f0f005921dcc5bc3e2f595951e3dc11de394e7` |
| HEAD Preview saat perbandingan | `homepage-arcade-catalog` — `fd4988e8434364342223e2ea1eb931084210f4a7` |
| Status perbandingan | `diverged` |
| Commit Preview lebih maju | 176 |
| Commit Preview tertinggal dari main | 3 |
| File berbeda pada perbandingan | 30 |
| Merge base | `9979e3523e3d296d51cb1b650c97e1f9edebac27` |

**Makna:** Preview tidak sekadar berada di depan Production. Kedua branch sudah bercabang: terdapat 3 commit di `main` yang belum ada di Preview. Karena itu, sebelum memilih kandidat rilis atau menyusun batch, kita perlu memeriksa perubahan dari kedua sisi dan mengidentifikasi kemungkinan konflik. Jumlah commit bukan ukuran kesiapan fitur.

### Inventaris — `app/admin/page.tsx`

**Sumber file yang diperiksa:** isi yang dikirim pengguna dan file GitHub Preview. Keduanya cocok. File Production juga diperiksa sebagai pembanding. Tidak ada file Codespace lain yang diasumsikan telah diperiksa.

| Field | Hasil pemeriksaan |
|---|---|
| File/fitur | `app/admin/page.tsx` — Dashboard Pengelola |
| Versi Production | Dashboard lama sekitar 82 ribu karakter; memuat pengelolaan paket ujian, subtes, pengumuman, materi, filter ujian/latihan, dan CMS di dashboard |
| Versi Preview | Dashboard ringkasan sekitar 27,5 ribu karakter; berisi statistik, pekerjaan tertunda, peringkat, filter peserta, pagination, dan pintasan ke halaman admin terpisah |
| Perbedaan terukur | GitHub compare menunjukkan 191 penambahan dan 1.852 penghapusan (2.043 baris berubah) |
| Penilaian | **Penting untuk Batch 1 — perlu rekonsiliasi fungsi sebelum implementasi/rilis** |
| Alasan | Ringkasan dashboard dan pekerjaan tertunda sesuai tujuan Batch 1. Namun, perubahan ini juga mengganti struktur dashboard secara besar dan mengalihkan beberapa fungsi lama ke halaman terpisah. Perlu dipastikan semua fungsi lama tetap tersedia pada rute pengganti. |
| Keputusan | Pertahankan sebagai kandidat Batch 1 di Preview; belum disetujui untuk perubahan kode atau Production |

#### Fungsi yang ditemukan pada versi Preview

- Ringkasan jumlah peserta, paket ujian/latihan, bank soal, dan materi.
- Panel `Perlu Ditindaklanjuti`: sesi yang belum selesai dan essay yang belum dinilai.
- Filter daftar pekerjaan tertunda.
- Peringkat XP latihan dan nilai ujian dengan filter cakupan, paket, kelas, dan tipe tes.
- Pencarian peserta, pengurutan, pagination, ringkasan kelas, serta grafik performa.
- Pintasan ke Bank Soal & Ujian, Konten Website, Data Peserta, Mode Latihan, Raport & Sertifikat, dan Pengaturan Dokumen.

#### Temuan yang perlu ditindaklanjuti sebelum menyatakan dashboard siap

1. **Fungsi dashboard lama:** periksa rute pengganti untuk pengelolaan subtes, paket ujian, pengumuman, dan materi. Jangan menganggap fungsi hilang sebelum halaman tujuan diperiksa; jangan pula menganggap sudah pindah hanya karena ada tautan menu.
2. **Live Monitor:** pada file ini belum terlihat tautan atau komponen bernama Live Monitor/Live Monitoring. Panel tindak lanjut mengarahkan pengguna ke halaman hasil ujian `/admin/exam/[id]/results`. Pastikan apakah halaman hasil tersebut memang memenuhi kebutuhan pemantauan langsung atau masih ada bagian lain yang harus diinventarisasi.
3. **Beban query:** dashboard mengambil seluruh baris `practice_attempts` dan `exam_sessions` melalui `select('*')`, seluruh metadata soal, lalu jawaban untuk kumpulan session ID. Ini perlu diperiksa terhadap volume data, batas hasil Supabase, dan pola RLS sebelum dipakai pada skala produksi. Belum ada bukti bahwa query ini gagal; ini catatan risiko performa dan kelengkapan data.
4. **Ketergantungan data:** pembacaan `credited_xp`, `total_xp`, `score_override`, `teacher_score`, status sesi, tipe soal essay/uraian, serta `target_mode` dan `activity_type` memengaruhi ringkasan dan peringkat. Jangan mengubah rumus XP, nilai, atau skema sebagai bagian dari pekerjaan UI tanpa audit dan persetujuan terpisah.
5. **Kelengkapan hasil:** karena query memuat banyak baris, periksa apakah pagination/default row limit dapat membuat ringkasan atau peringkat hanya menghitung sebagian data. Jangan mengubahnya dengan RPC/migration sebelum kebutuhan dan risikonya disepakati.

#### Arah penyesuaian yang disarankan

- Pertahankan konsep panel tindak lanjut dan ringkasan sebagai inti Batch 1.
- Buat daftar pemetaan fungsi lama → halaman tujuan Preview, khususnya subtes, paket ujian, pengumuman, dan materi.
- Verifikasi kebutuhan Live Monitor secara terpisah dari panel tugas tertunda.
- Audit query dan RLS secara baca/statis terlebih dahulu; tidak melakukan perubahan database.
- Pisahkan perubahan UI dari perubahan perhitungan XP/nilai/CBT. Perubahan perhitungan memerlukan persetujuan khusus.

**Dependensi/risiko:** tabel `profiles`, `practice_attempts`, `exam_sessions`, `exams`, `questions`, `answers`; RLS dan batas query Supabase; perhitungan XP/nilai; halaman hasil ujian; navigasi halaman admin. Tidak ada perubahan schema, RPC, policy, data, atau kode yang dilakukan dalam audit ini.

### Status Batch 1 setelah inventaris dashboard

- [x] File `app/admin/page.tsx` dari pengguna telah diperiksa.
- [x] Versi Preview dan Production telah dibandingkan.
- [ ] Pemetaan fungsi lama ke halaman pengganti belum selesai.
- [ ] Kebutuhan Live Monitor belum dikonfirmasi dari keseluruhan file/halaman terkait.
- [ ] Audit query dan kelengkapan data belum selesai.
- [ ] Implementasi belum disetujui dan tidak ada kode yang diubah.

**Keputusan sementara:** file ini penting untuk Batch 1, tetapi belum boleh langsung diganti/diubah sebelum pemetaan fungsi dan risiko query selesai.

### Aturan pencatatan perbedaan branch dan batch

Mulai snapshot ini, inventaris lintas branch memakai tiga lapisan:
1. **Snapshot branch:** SHA HEAD `main`, SHA HEAD Preview, merge base, status ahead/behind, dan daftar file berbeda.
2. **Inventaris per file:** versi Production, versi Preview, tujuan/perilaku, perbedaan, dependensi, risiko, keputusan batch, dan status QA.
3. **Riwayat rilis:** ketika perubahan benar-benar masuk Production, catat commit rilis, deployment, file/batch yang masuk, ringkasan, dan hasil QA. Tandai item Preview yang sudah dirilis; sisanya tetap menjadi backlog Preview.

Jangan menyimpulkan Preview sudah sinkron hanya dari jumlah commit. Periksa perbandingan file dan perubahan di kedua sisi setiap kali akan menentukan kandidat rilis.


### Koreksi inventaris setelah pemeriksaan isi lengkap pengguna — 10 November 2026

Pemeriksaan ulang terhadap kedua bagian `app/admin/page.tsx` yang dikirim pengguna menemukan bahwa isi tersebut adalah versi dashboard lama yang memuat CMS pengumuman, CMS materi, master subtes, dan pengelolaan bank soal/ujian.

Pencocokan penanda kode dengan file GitHub menunjukkan:
- **Production (`main`)**: 82.037 karakter; memiliki CMS modal, master subtes, alias penulis, dan struktur halaman lama yang sesuai dengan bagian yang dikirim.
- **Preview (`homepage-arcade-catalog`)**: 27.538 karakter; merupakan dashboard ringkasan baru dengan panel “Perlu Ditindaklanjuti”; tidak memiliki CMS modal/master subtes di file ini.

Dengan demikian, pernyataan pada inventaris sebelumnya bahwa isi yang dikirim pengguna cocok dengan file Preview **perlu dikoreksi**. Isi yang dikirim cocok dengan versi Production/halaman lama, bukan dashboard Preview saat ini. Fungsi CMS dan master subtes tidak boleh dianggap hilang dari produk hanya karena tidak ada lagi di `app/admin/page.tsx` Preview; pemetaan ke rute pengganti tetap harus diverifikasi.

**Penilaian:** penting untuk rekonsiliasi Batch 1, bukan izin mengembalikan halaman lama atau mengubah kode.

**Arah tindak lanjut:**
1. Petakan fungsi lama (paket ujian/bank soal, subtes, pengumuman, materi) ke halaman tujuan yang tersedia di Preview.
2. Verifikasi apakah semua alur edit/simpan/hapus dan alias penulis tetap tersedia di halaman tujuan.
3. Pisahkan fungsi yang memang dipindahkan dari fungsi yang benar-benar hilang; jangan menganggap salah satunya tanpa memeriksa rute tujuan.
4. Kebutuhan Live Monitor tetap menjadi pemeriksaan terpisah; bagian halaman lama yang dikirim ini belum membuktikan kebutuhan pemantauan langsung pada dashboard Preview.

**Batas bukti:** pemeriksaan ini membandingkan isi yang dikirim pengguna dengan file GitHub `main` dan `homepage-arcade-catalog`. Ini tidak memberi akses ke workspace Codespace saat ini dan tidak membuktikan daftar perubahan lokal terkini. Tidak ada kode aplikasi atau database yang diubah.


### Audit file hasil ujian dan penilaian — 10 November 2026

**File:** `app/admin/exam/[id]/results/page.tsx`

**Perbandingan branch:**
- Preview `homepage-arcade-catalog`: SHA `c456fcc7e19d4a43b2f16ac07719fe3f06faec14`.
- Production `main`: SHA `c456fcc7e19d4a43b2f16ac07719fe3f06faec14`.
- Kedua file identik; bagian yang dikirim pengguna cocok dengan implementasi yang sudah ada di kedua branch. Tidak ada perubahan kode yang dilakukan.

**Inventaris fungsi yang tampak pada file:**
- Rekap nilai, analisis butir, dan daftar sesi ujian.
- Penilaian essay/uraian per peserta serta mode penilaian per soal untuk seluruh peserta.
- Nilai bonus dan override nilai akhir.
- Filter jenis soal dan status nilai.
- Pengaturan kop, KKM, tanggal/tempat terbit, penandatangan (kepala sekolah/guru), dan tanda tangan orang tua/wali.
- Live preview rapor/sertifikat, cetak sertifikat tunggal/massal, serta cetak rapor massal.

**Temuan statis yang perlu disimpan:**
1. Filter status non-essay memakai `evaluateAnswer`. Jawaban kosong dikeluarkan sebelum cabang status, sehingga pilihan “Semua Status” untuk soal otomatis tidak menampilkan jawaban kosong. Ini perlu dipastikan sebagai perilaku yang diinginkan; jangan mengubah tanpa persetujuan.
2. Filter essay mendasarkan “Belum Dinilai” pada `teacher_score` yang belum tersimpan, bukan pada apakah siswa sudah menjawab. Skor tersimpan 0 tetap dianggap sudah dinilai dan masuk “Salah / Nilai 0”.
3. Fungsi simpan massal per soal memproses peserta satu per satu: memperbarui `answers.teacher_score`, menghitung ulang skor, lalu memperbarui `exam_sessions.score`. Jika proses gagal di tengah loop, sebagian peserta mungkin sudah tersimpan sementara peserta berikutnya belum. Perlu perhatian saat audit ketahanan penyimpanan; jangan mengubah alur nilai/DB tanpa persetujuan khusus.
4. Penilaian dan rekap bergantung pada `questions`, `exam_sessions`, `profiles`, dan `answers`; query memakai `select('*')`. Kelengkapan data, RLS, batas jumlah baris, dan konsistensi hasil harus dipertimbangkan sebelum optimasi.

**Klasifikasi dan batch:**
- Pengaturan dokumen, preview, dan cetak: **Penyempurnaan**; bukan target Batch 1.
- Filter status nilai dan penyimpanan penilaian massal: **Perlu diperbaiki / audit lanjutan**, tetapi di luar Batch 1 Dashboard Admin dan Live Monitor. Pertahankan rumus nilai dan perilaku tersimpan sampai ada persetujuan khusus.
- Tidak ada perubahan schema, RLS, RPC, trigger, data, kode, atau QA baru dalam audit ini.

**Bukti dan batasan:** audit membandingkan file GitHub pada dua branch dan meninjau fungsi terkait secara statis. Belum membuktikan keadaan workspace lokal Codespace saat ini atau hasil uji runtime.


### Audit file callback Google Drive — 10 November 2026

**File:** `app/api/google-drive/callback/route.ts`

**Perbandingan GitHub dan kode yang dikirim:**
- Production `main`: SHA `a583469a89a1a8d223d75c437f8e7509d7b359f6`.
- Preview `homepage-arcade-catalog`: SHA `b312a83f98a4f5ee95e5bc5d2fc8fa0943099452`.
- Kedua branch berbeda.
- Kode yang dikirim pengguna paling dekat dengan versi Production: alur OAuth, pemeriksaan state, otorisasi admin, pertukaran code, pembacaan token lama, enkripsi refresh token, dan upsert Supabase sama. Kode kiriman menambahkan import `connection` dan memanggil `await connection()` sebelum blok `try`.

**Perbedaan perilaku yang terverifikasi:**
1. Kode kiriman memanggil `connection()` di luar `try`. Preview memanggilnya di dalam `try`, sehingga error dari pemanggilan tersebut ikut masuk ke penanganan error callback. Jika kelak ada perubahan, pertahankan pemanggilan di dalam `try`.
2. Production menyusun `redirectUri` dari `NEXT_PUBLIC_SITE_URL` dengan fallback domain Production `https://grisan.vercel.app`. Preview menyusun URI dari host `request.url`. Perbedaan ini penting karena redirect URI yang dipakai saat menukar authorization code harus cocok dengan URI yang didaftarkan/digunakan saat memulai OAuth. Host Preview dinamis belum tentu terdaftar pada Google Cloud Console.
3. Kedua versi mempertahankan pola keamanan utama: validasi cookie/state, pemeriksaan admin, penggunaan service-role hanya di server setelah otorisasi, penyimpanan refresh token terenkripsi, dan mempertahankan refresh token lama bila Google tidak mengirim token baru.

**Inventaris dan klasifikasi:**

| Bagian | Penilaian | Keputusan |
|---|---|---|
| Pemeriksaan OAuth state dan CSRF | Penting untuk fungsi dan keamanan integrasi | Pertahankan; jangan longgarkan |
| Pemeriksaan `requireAdmin()` | Penting untuk keamanan | Pertahankan |
| Enkripsi dan penyimpanan refresh token | Penting untuk keamanan dan koneksi | Pertahankan; tidak diuji tulis |
| Pemanggilan `connection()` | Perlu dirapikan bila kode ini kelak dipilih | Tempatkan di dalam `try` agar kegagalan tertangani |
| Penentuan `redirectUri` Production vs Preview | Perlu diverifikasi sebelum integrasi diuji | Cocokkan dengan route connect dan daftar Authorized redirect URIs Google; jangan mengasumsikan host Preview terdaftar |

**Arah tindak lanjut:** sebelum Google Drive OAuth diaktifkan atau diuji, audit bersama `connect/route.ts`, konfigurasi OAuth Google, variabel `NEXT_PUBLIC_SITE_URL`, dan alamat callback yang benar-benar didaftarkan. Tentukan satu kebijakan redirect URI yang konsisten untuk Production dan Preview. Jangan mengubah token, koneksi Google Drive, atau database bersama sebagai bagian dari audit ini.

**Dependensi/risiko:** Google OAuth client ID/secret dan daftar redirect URI; `NEXT_PUBLIC_SITE_URL`; `requireAdmin()`; `SUPABASE_SERVICE_ROLE_KEY`; tabel `google_drive_tokens`; fungsi `encryptToken`; cookie OAuth state. Preview dan Production berbagi proyek/database Supabase, sehingga uji koneksi atau penyimpanan token berpotensi memengaruhi koneksi Production.

**Batch/keputusan:** **Pengembangan berikutnya — integrasi Google Drive**, bukan Batch 1 Dashboard Admin dan Live Monitor. Uji runtime ditunda sampai ada rencana aman dan persetujuan khusus. Tidak ada kode, database, token, konfigurasi OAuth, atau deployment yang diubah dalam audit ini.


### Audit file pemulai OAuth Google Drive — 10 November 2026

**File:** `app/api/google-drive/connect/route.ts`

**Perbandingan GitHub dan kode yang dikirim:**
- Production `main`: SHA `55fe87e7589514515af0d10f1b7b10d3feb12205`.
- Preview `homepage-arcade-catalog`: SHA `0473a5a53bf0254a3eead4e6fa62d3d58851ac87`.
- Kedua branch berbeda.
- Kode yang dikirim cocok dengan struktur Production, dengan tambahan import dan pemanggilan `connection()` sebelum blok `try`.

**Perbedaan terverifikasi:**
1. Production tidak memakai `connection()`. Kode kiriman memanggilnya sebelum `try`; Preview memanggilnya di dalam `try`. Bila pemanggilan ini dipertahankan, letakkan di dalam `try` agar error tertangani.
2. Production membangun `redirectUri` dari `NEXT_PUBLIC_SITE_URL` dengan fallback `https://grisan.vercel.app`. Preview menggunakan `new URL('/api/google-drive/callback', request.url).toString()`.
3. Preview menerima `request: NextRequest` untuk membentuk URI berdasarkan host request. Production tidak membutuhkan parameter request.
4. Parameter OAuth lainnya sama pada kedua versi: `access_type: 'offline'`, `prompt: 'consent'`, scope `drive.file`, `crypto.randomUUID()`, cookie HTTP-only dengan `sameSite: 'lax'`, path `/api/google-drive`, dan masa berlaku 600 detik.

**Kecocokan pasangan connect/callback:**
- Production connect dan callback sama-sama memakai `NEXT_PUBLIC_SITE_URL` dengan fallback domain Production.
- Preview connect dan callback sama-sama memakai host dari `request.url`.
- Karena itu, jangan mencampur route connect dari satu branch dengan callback branch lain tanpa menyamakan redirect URI. URI yang dikirim saat memulai OAuth harus sama dengan URI saat menukar authorization code dan cocok dengan Authorized redirect URI di Google Cloud Console.

**Inventaris dan klasifikasi:**

| Bagian | Penilaian | Keputusan |
|---|---|---|
| Pemeriksaan admin sebelum membuat URL OAuth | Penting untuk keamanan | Pertahankan |
| State acak dan cookie HTTP-only | Penting untuk perlindungan CSRF | Pertahankan |
| Scope `drive.file` dan mode offline | Penting untuk fungsi integrasi | Pertahankan; jangan memperluas scope tanpa alasan |
| Penentuan `redirectUri` | Perlu diverifikasi bersama callback dan Google Cloud Console | Pilih kebijakan per lingkungan dan pastikan pasangan route konsisten |
| `connection()` | Penyempurnaan teknis bila diperlukan oleh Next.js | Jika dipakai, letakkan di dalam `try` |

**Arah tindak lanjut:** audit kedua route connect/callback bersama konfigurasi Google OAuth, daftar Authorized redirect URIs, dan variabel environment. Pastikan alamat Preview memang didaftarkan bila Preview hendak diuji. Jangan menganggap host Preview otomatis diizinkan oleh Google.

**Dependensi/risiko:** Google OAuth client ID/secret dan Authorized redirect URIs; `NEXT_PUBLIC_SITE_URL`; host deployment; `requireAdmin()`; cookie state; callback route. Preview dan Production berbagi database Supabase, sehingga uji OAuth/token berpotensi memengaruhi koneksi Production.

**Batch/keputusan:** **Pengembangan berikutnya — integrasi Google Drive**, bukan Batch 1 Dashboard Admin dan Live Monitor. Tidak ada kode, konfigurasi, token, database, atau deployment yang diubah. Belum dilakukan uji OAuth runtime.


### Audit file upload gambar Google Drive — 10 November 2026

**File:** `app/api/google-drive/upload/route.ts`

**Perbandingan GitHub dan kode yang dikirim:**
- Production `main`: SHA `4d414c629401dcb1abe12a91ee719df05b932efa`.
- Preview `homepage-arcade-catalog`: SHA `4d414c629401dcb1abe12a91ee719df05b932efa`.
- Kedua branch identik; kode yang dikirim juga cocok dengan keduanya.
- Tidak ada perbedaan kode upload antara Production dan Preview pada snapshot yang diperiksa.

**Inventaris fungsi yang ditemukan:**
1. Otorisasi admin melalui `requireAdmin()` sebelum proses upload.
2. Menerima satu file dari field form `file`.
3. Mengizinkan MIME type JPG, PNG, WEBP, dan GIF; ukuran harus lebih dari 0 dan maksimal 8 MiB.
4. Memeriksa signature dasar file: JPEG, PNG, GIF, dan WEBP.
5. Menyaring nama file melalui `safeFileName()`.
6. Membaca konfigurasi OAuth, kunci enkripsi, URL Supabase, dan service-role key.
7. Mengambil refresh token terenkripsi dan `drive_folder_id` dari baris `google_drive_tokens` dengan ID `primary`.
8. Mendekripsi refresh token, menginisialisasi Google OAuth client dan Drive API.
9. Membuat folder `TKA Platform - Gambar Soal` bila belum ada, lalu menyimpan ID folder ke Supabase.
10. Mengunggah gambar ke folder tersebut, membuat izin `anyone` sebagai `reader`, lalu mengembalikan URL thumbnail dan metadata file.

**Temuan dan risiko statis:**

| Bagian | Penilaian | Alasan dan arah tindak lanjut |
|---|---|---|
| Pemeriksaan admin | Penting untuk fungsi dan keamanan | Pertahankan sebelum membaca/mengunggah file |
| Daftar MIME, batas ukuran, signature dasar | Penting; perlu penguatan | Pertahankan batas 8 MiB dan jenis file. Pemeriksaan signature saat ini hanya mengenali header dasar, belum memvalidasi seluruh struktur/dekode gambar |
| Pembacaan `request.formData()` sebelum batas ukuran request | Perlu diperbaiki/audit | Batas `file.size` diperiksa setelah body multipart diparsing. Evaluasi batas request di platform dan strategi pembatasan body sebelum parsing; jangan menganggap batas file ini otomatis membatasi seluruh request |
| `safeFileName()` | Penyempurnaan | Sudah menyaring karakter nama; pertimbangkan nama unik agar dua file dengan nama sama tidak membingungkan. Bukan blocker fungsi inti |
| Service-role dan tabel token | Penting untuk keamanan | Tetap server-only; jangan mengekspos token atau service-role ke browser |
| Folder ID disimpan ke tabel token | Penting untuk integrasi | Pertahankan; penulisan terjadi saat folder baru dibuat. Tidak diuji karena database bersama |
| Izin `anyone: reader` | Keputusan produk/keamanan yang perlu disadari | File dapat diakses publik oleh siapa pun yang memperoleh tautan. Cocok untuk gambar yang memang harus tampil pada halaman/soal siswa, tetapi jangan gunakan untuk gambar/dokumen rahasia. Perubahan ke akses privat memerlukan desain penyajian gambar dan persetujuan |
| Kegagalan setelah upload sebelum izin publik | Perlu diperbaiki/audit ketahanan | Jika upload sukses tetapi pembuatan permission gagal, file mungkin tertinggal di Drive tanpa URL sukses. Rancang penanganan/cleanup yang aman; jangan hapus file Drive apa pun saat audit |
| URL thumbnail Drive | Penyempurnaan/audit kompatibilitas | Pastikan format thumbnail dapat dimuat pada konteks editor, siswa, cetak, dan ekspor; belum ada uji runtime pada audit ini |

**Dependensi/risiko:** Google Drive API dan OAuth client; refresh token terenkripsi; `GOOGLE_TOKEN_ENCRYPTION_KEY`; `SUPABASE_SERVICE_ROLE_KEY`; tabel `google_drive_tokens`; folder ID; izin publik Drive; limit ukuran request Vercel/Next.js; komponen editor dan halaman siswa yang memakai URL gambar. Preview dan Production memakai database Supabase yang sama sehingga upload atau pembuatan folder dari Preview dapat menulis ke koneksi/folder yang digunakan Production.

**Arah pengembangan:** pertahankan alur upload inti dan otorisasi. Jika integrasi dibuka kembali, audit batas request, validasi gambar berbasis decoding, kebijakan akses publik, penanganan file yatim, dan kompatibilitas URL secara terpisah. Jangan mengubah scope OAuth, tabel, token, folder, permission, atau perilaku penyimpanan tanpa persetujuan khusus.

**Klasifikasi/batch:** alur dasar upload merupakan **Pengembangan berikutnya — integrasi Google Drive**; penguatan validasi, batas request, permission, dan cleanup termasuk **Perlu diperbaiki/audit lanjutan** sebelum pemakaian luas. Bukan Batch 1 Dashboard Admin dan Live Monitor. Tidak ada kode, database, token, file Drive, permission, konfigurasi, atau deployment yang diubah dan tidak ada uji upload runtime.


### Audit file daftar gambar Google Drive — 10 November 2026

**File:** `app/api/google-drive/images/route.ts`

**Perbandingan GitHub dan kode yang dikirim:**
- Production `main`: SHA `1b4495c2e429783a33c29cb87fcbe357f918be4a`.
- Preview `homepage-arcade-catalog`: SHA `fe9c8178f6c9c96709953928cb87a51e615f96c7`.
- Production dan Preview berbeda.
- Kode kiriman tidak identik dengan salah satu branch: polanya memakai redirect URI Production berbasis `NEXT_PUBLIC_SITE_URL`, tetapi menambahkan `connection()` bernama `connection` sebelum blok `try`.
- Preview mengimpor `connection as waitForRequest`, memanggilnya di dalam `try`, dan membentuk callback URI dari `request.url`. Production tidak memanggil `connection()` dan memakai `NEXT_PUBLIC_SITE_URL` dengan fallback Production.

**Inventaris fungsi:**
1. Memastikan admin melalui `requireAdmin()`.
2. Memastikan variabel OAuth, encryption key, Supabase URL, dan service-role key tersedia.
3. Mengambil `refresh_token_encrypted` dan `drive_folder_id` dari `google_drive_tokens` dengan ID `primary`.
4. Jika belum ada folder, mengembalikan daftar kosong dengan sukses.
5. Mendekripsi refresh token dan membuat Google Drive client.
6. Membaca `pageToken` dari query string.
7. Meminta daftar file gambar dalam folder aplikasi, maksimal 100 per halaman, diurutkan berdasarkan nama dan tidak termasuk file yang masuk trash.
8. Mengembalikan metadata gambar, URL thumbnail, webViewLink, dan nextPageToken.

**Temuan dan risiko statis:**

| Bagian | Penilaian | Alasan dan arah tindak lanjut |
|---|---|---|
| Otorisasi admin | Penting untuk keamanan | Pertahankan; route memakai service-role key untuk membaca token dan Drive |
| Redirect URI | Penting untuk konsistensi OAuth | Harus tetap konsisten dengan connect/callback yang digunakan untuk membuat token. Jangan mencampur route antar-branch |
| Pemanggilan `connection()` sebelum `try` pada kode kiriman | Perlu diperbaiki/audit | Jika fungsi melempar error, penanganan `catch` route tidak akan menangkapnya. Pada Preview, pemanggilan ada di dalam `try` |
| Paginasi | Penting untuk fungsi daftar | API mengambil 100 file per halaman dan mengembalikan `nextPageToken`; UI pemanggil perlu meneruskan token untuk halaman berikutnya. Belum diverifikasi dari komponen pemanggil |
| Filter folder dan MIME | Penting untuk fungsi daftar | Query membatasi ke folder aplikasi, tipe gambar, dan file yang tidak di-trash. Tidak menghapus atau mengubah file Drive |
| Akses thumbnail | Perlu diverifikasi | Route membuat URL thumbnail, tetapi tidak memeriksa permission tiap file. Upload baru memberi izin anyone-reader; gambar lama/ditambahkan manual mungkin memiliki permission berbeda |
| Pengurutan berdasarkan nama | Penyempurnaan | Daftar tidak diurutkan berdasarkan tanggal terbaru; pertimbangkan kebutuhan UI sebelum mengubah |
| Error handling | Penyempurnaan/audit | Error detail hanya dicatat di server dan respons memberi pesan umum; perlu pemeriksaan log saat uji runtime yang disetujui |

**Dependensi/risiko:** Google Drive API; OAuth redirect URI; refresh token terenkripsi; `GOOGLE_TOKEN_ENCRYPTION_KEY`; `SUPABASE_SERVICE_ROLE_KEY`; tabel `google_drive_tokens`; folder ID; izin akses file dan thumbnail; komponen UI yang memanggil route dan mengelola `nextPageToken`. Preview dan Production menggunakan database Supabase yang sama sehingga jangan menguji atau mengganti token/folder pada Preview tanpa rencana aman yang disetujui.

**Arah pengembangan:** pilih satu strategi redirect URI yang konsisten pada seluruh route OAuth untuk masing-masing environment. Pertahankan paginasi dan filter folder. Sebelum aktivasi, telusuri komponen pemanggil route untuk memastikan paginasi, empty state, thumbnail gagal dimuat, serta akses gambar lama tertangani. Jangan mengubah permission, token, folder, database, atau konfigurasi selama inventarisasi.

**Klasifikasi/batch:** **Pengembangan berikutnya — integrasi Google Drive**; penanganan `connection()`, konsistensi redirect URI, serta akses thumbnail menjadi **Perlu diperbaiki/audit lanjutan** sebelum uji integrasi. Bukan Batch 1 Dashboard Admin dan Live Monitor. Tidak ada kode, database, token, file Drive, permission, konfigurasi, atau deployment yang diubah; tidak ada uji runtime.


### Audit lanjutan Google Drive: komponen editor dan route proxy gambar — 10 November 2026

Pemeriksaan ini dilanjutkan langsung dari struktur file GitHub Preview setelah empat route utama selesai diinventarisasi. Pengguna tidak perlu mengirim ulang file route.

**File yang diperiksa dan perbandingan branch:**

| File | Production SHA | Preview SHA | Status |
|---|---|---|---|
| `app/api/google-drive/image/[id]/route.ts` | `ad5c7e349c13c6f1109e469d4040cf1588365908` | `ad5c7e349c13c6f1109e469d4040cf1588365908` | Identik |
| `components/editor/ImageDialog.tsx` | `51e761e847f2bdd381b88f7b90157b42461832d8` | `51e761e847f2bdd381b88f7b90157b42461832d8` | Identik |
| `components/editor/RichTextEditor.tsx` | `9030c09d60ed1c9f8db62beaacfa2b3f4fd7fb7e` | `9030c09d60ed1c9f8db62beaacfa2b3f4fd7fb7e` | Identik |
| `components/editor/ResizableImage.tsx` | `eb546dcec40171f655289ecabecd95951d1864a6` | `eb546dcec40171f655289ecabecd95951d1864a6` | Identik |

**1. Komponen galeri dan upload — `components/editor/ImageDialog.tsx`**
- Dialog memiliki tiga sumber gambar: upload baru, pustaka/galeri Google Drive, dan URL eksternal.
- Saat mode galeri dibuka, komponen memanggil `GET /api/google-drive/images`, membaca `files` dan `nextPageToken`.
- Tombol muat berikutnya meneruskan `pageToken` dan menggabungkan hasil ke daftar yang sudah ada.
- Upload baru mengirim multipart field `file` ke `POST /api/google-drive/upload`.
- Setelah upload berhasil, komponen memasukkan `result.file.imageUrl` ke dokumen Tiptap.
- Pemilihan gambar dari galeri juga menggunakan URL gambar dari hasil API; perlu uji tampilan thumbnail pada kondisi izin Drive yang berbeda.
- URL eksternal dibatasi ke HTTP/HTTPS dan memiliki penanganan khusus untuk tautan hasil pencarian Yahoo Images.

**2. Paste gambar dari Microsoft Word — `components/editor/RichTextEditor.tsx`**
- Fungsi `uploadPastedImage()` mengirim file ke endpoint upload yang sama.
- Jalur paste Word menangani gambar data URL, file hasil ekstraksi RTF, gambar fallback rumus Word/WMF yang dikonversi, dan file gambar tambahan.
- Beberapa upload dijalankan paralel dengan `Promise.all`.
- Jika upload gambar tertentu gagal pada jalur ekstraksi Word, gambar tersebut dapat dilewati/dihapus dari hasil paste dan dicatat melalui console warning. Ini perlu diperhatikan agar kegagalan upload tidak membuat guru mengira semua gambar berhasil tersimpan.
- Kode editor dan jalur paste ini identik pada Production dan Preview.

**3. Route proxy — `app/api/google-drive/image/[id]/route.ts`**
- Route ini belum termasuk empat route yang sebelumnya dikirim, dan ditemukan melalui inventaris tree branch Preview.
- Route mewajibkan admin, memvalidasi bentuk ID, mengambil refresh token dari tabel `google_drive_tokens`, meminta metadata file dari Drive, memastikan MIME type dimulai dengan `image/`, lalu mengunduh media dan mengembalikan byte gambar.
- Header respons meliputi Content-Type, Content-Length, `Cache-Control: private, max-age=300`, dan `X-Content-Type-Options: nosniff`.
- Pada komponen pemanggil yang diperiksa (`ImageDialog`, `RichTextEditor`, dan `ResizableImage`), URL yang digunakan berasal dari `imageUrl` thumbnail Drive atau URL gambar yang dipilih; tidak ditemukan pemanggilan ke route proxy `/api/google-drive/image/[id]` pada file-file tersebut. Belum diklaim sebagai pencarian menyeluruh seluruh repo.
- Risiko desain: karena route mewajibkan admin, route ini tidak dapat langsung dipakai sebagai sumber gambar untuk halaman siswa. Selain itu, ID hanya divalidasi formatnya dan route tidak membatasi file agar berasal dari folder aplikasi; pemanggil yang berwenang dapat meminta file gambar Drive lain jika mengetahui ID-nya. Route membaca seluruh media ke memori tanpa batas ukuran eksplisit. Jangan mengubah route sebelum dipastikan apakah memang dimaksudkan untuk jalur gambar privat.

**Temuan lintas alur:**
1. Alur aktif yang terlihat pada editor adalah upload ke Drive → izin publik saat upload → URL thumbnail → disimpan sebagai `src` gambar dalam konten editor.
2. Galeri membaca daftar file dari folder aplikasi dan memakai URL thumbnail yang sama.
3. Route proxy privat terpisah dan belum terbukti digunakan oleh komponen editor yang diperiksa.
4. Paginasi API telah ditangani oleh `ImageDialog` melalui `nextPageToken`.
5. URL eksternal tetap bisa disisipkan, jadi tidak semua gambar di dokumen otomatis disimpan di Drive.
6. Perlu QA terarah untuk upload satu gambar, galeri dengan lebih dari 100 file, thumbnail file lama, gambar yang gagal mendapat permission publik, paste Word dengan beberapa gambar, dan tampilan gambar pada siswa/cetak/ekspor. QA sebelumnya untuk editor umum tidak otomatis membuktikan seluruh skenario Google Drive aktif karena integrasi ini belum diuji runtime.

**Klasifikasi dan batch:**
- `ImageDialog.tsx` dan `RichTextEditor.tsx`: **Penting untuk integrasi Google Drive bila fitur diaktifkan**, tetapi keseluruhan integrasi tetap **Pengembangan berikutnya**, bukan Batch 1.
- Paginasi galeri: perilaku sudah ada dan harus dipertahankan; perlu QA, bukan perubahan yang diasumsikan perlu.
- Penanganan kegagalan paste/upload: **Perlu diperbaiki/audit lanjutan** agar kegagalan gambar terlihat jelas dan tidak diam-diam menghilangkan gambar dari konten.
- `image/[id]` proxy: **Perlu keputusan desain/audit keamanan**; jangan dipakai untuk siswa atau dihapus sebelum tujuan route dipastikan.
- Risiko dependensi tetap mencakup Google OAuth, refresh token terenkripsi, service-role key, tabel `google_drive_tokens`, folder ID, Drive permissions, batas body/runtime, dan penyimpanan URL gambar di konten soal.

**Batas tindakan:** hanya membaca kode GitHub dan memperbarui roadmap. Tidak ada perubahan aplikasi, database, token, permission, file Drive, konfigurasi, deployment, atau pengujian runtime.


### Audit Batch 1: Live Monitor — 10 November 2026

**File:** `app/admin/exam/[id]/monitor/page.tsx`

**Perbandingan branch:**
- Production `main`: SHA `889ea265e9370540ca9b5ef777e1847f868aac74`.
- Preview `homepage-arcade-catalog`: SHA `889ea265e9370540ca9b5ef777e1847f868aac74`.
- File identik pada kedua branch; panjang isi 36.113 karakter.
- Audit ini membaca versi GitHub Preview/Production, bukan mengklaim membaca file lokal Codespace.

**Perilaku saat ini:**
1. Memuat satu data ujian dari `exams`, jumlah soal dari `questions`, seluruh sesi ujian untuk `exam_id` dari `exam_sessions`, serta profil dari `profiles`.
2. Mengambil ulang data setiap 5 detik saat Auto-Refresh aktif; jam/timer live diperbarui setiap detik.
3. Memiliki dua mode: Semua Sesi Real-Time dan Ringkasan Siswa & Multi-Attempt.
4. Filter sesi berdasarkan status, kelas, dan pencarian nama/username; mode ringkasan memakai filter kelas dan pencarian.
5. Menampilkan jumlah peserta, sesi ongoing/paused, rata-rata best score, dan persentase KKM (ambang 75).
6. Menghitung sisa waktu berdasarkan start time, durasi, waktu pause akumulatif, status pause, dan extra time.
7. Aksi proktor: pause sesi, resume sesi, force submit, reset sesi (menghapus session dan jawaban terkait melalui asumsi ON DELETE CASCADE), serta fungsi tambah waktu 10 menit.
8. Ekspor ringkasan multi-attempt ke Excel.
9. Tautan ke halaman Rekap Sesi.

**Temuan statis dan klasifikasi:**

| Temuan | Klasifikasi | Alasan / arah tindak lanjut |
|---|---|---|
| Pemanggilan `select('*')` pada sessions dan profiles | Perlu diperbaiki/audit | Mengambil seluruh kolom dan seluruh profil tanpa filter kelas/peserta; evaluasi kebutuhan kolom, RLS, volume data, dan batas hasil sebelum mengubah query |
| Auto-refresh seluruh data tiap 5 detik | Penyempurnaan | Potensi beban query saat jumlah sesi/profil besar. Pertimbangkan query lebih ramping atau strategi refresh yang tetap menjaga status live; jangan mengubah mekanisme sesi/CBT tanpa persetujuan |
| Penanganan error fetchData | Perlu diperbaiki/audit | Query tidak memeriksa/menampilkan error; kegagalan fetch dapat menghasilkan tampilan kosong atau data lama tanpa status kesalahan yang jelas |
| Status dan timer live | Penting untuk fungsi proktor | Perhitungan waktu memakai `start_time`, `paused_duration_seconds`, `paused_at`, dan `extra_time_seconds`; harus dijaga konsisten dengan alur CBT |
| Pause/resume | Penting; sensitif | Menulis `exam_sessions.status`, `paused_at`, dan `paused_duration_seconds`; butuh QA CBT dan pemeriksaan RLS sebelum perubahan |
| Force Submit | Penting; sensitif | Mengubah status ke completed dan menulis `completed_at`, `submitted_at`, `end_time`; harus mempertahankan perilaku submit dan penilaian yang sudah ada |
| Reset sesi | Penting; tindakan destruktif | Menghapus baris `exam_sessions`; kode mengandalkan ON DELETE CASCADE untuk jawaban. Tidak boleh diubah/diuji pada data nyata tanpa persetujuan dan skenario aman |
| Fungsi tambah waktu 10 menit | Perlu diperiksa | Fungsi `handleExtendTime` ada dan memperbarui `extra_time_seconds`, tetapi pada file yang diperiksa tidak ditemukan pemanggilan handler dari JSX; kemungkinan fitur belum terhubung ke tombol UI |
| Estimasi jumlah benar dari score | Perlu diperiksa | Jika `total_correct` kosong, kode memperkirakan jumlah benar dari score/100 dikali jumlah soal; estimasi dapat menyesatkan untuk bobot atau skor parsial |
| Ambang KKM 75 | Perlu keputusan produk | Ambang 75 ditulis tetap untuk pass rate dan ekspor, bukan dibaca dari konfigurasi ujian; jangan ubah tanpa keputusan pemilik produk |
| Ekspor Excel | Penyempurnaan | Memakai daftar ringkasan yang sudah difilter kelas/pencarian; perlu QA hasil ekspor bila tampilan/filter diubah |

**Dependensi/risiko:** tabel `exams`, `questions`, `exam_sessions`, `profiles`; kolom status, start/pause/complete timestamps, extra time, score, total_correct; kebijakan RLS; relasi ON DELETE CASCADE untuk answers; perilaku CBT siswa; format ekspor XLSX. Tidak ada perubahan skema, RLS, RPC, scoring, XP, atau data yang dilakukan.

**Batch:** file ini memang bagian **Batch 1: Dashboard Admin dan Live Monitor**. Arah Batch 1 sebaiknya memprioritaskan keterbacaan, ringkasan, navigasi, dan informasi tindak lanjut tanpa mengubah aksi proktor, perhitungan timer, force submit, reset, maupun alur CBT. Temuan data/query dan fitur tambah waktu dicatat untuk audit/perbaikan terpisah jika diperlukan.

**QA:** audit statis GitHub saja; tidak menjalankan Live Monitor, tidak melakukan pause/resume/force submit/reset, tidak menguji refresh terhadap database, dan tidak mengubah kode maupun database. QA runtime tetap menunggu implementasi Batch 1 yang disetujui dan hanya perlu menguji perilaku yang benar-benar berubah.


## Rancangan pelaksanaan Batch 1 — Dashboard Admin dan Live Monitor (10 November 2026)

**Status:** rancangan siap ditinjau; belum ada persetujuan perubahan kode. Persetujuan pengguna untuk "lanjutkan" pada tahap ini ditafsirkan sebagai melanjutkan penyusunan rencana, bukan izin mengedit aplikasi.

### Baseline yang dipakai
- Preview dashboard `app/admin/page.tsx`: SHA `5f01d99fda70055b96918f1ed2d6c83e6ab8de87`.
- Live Monitor `app/admin/exam/[id]/monitor/page.tsx`: SHA `889ea265e9370540ca9b5ef777e1847f868aac74`, identik dengan Production pada snapshot audit.
- Dashboard Preview sudah memiliki ringkasan angka, ranking, daftar peserta, dan panel `Perlu Ditindaklanjuti`; panel tersebut saat ini menampilkan maksimal 8 item dan semua item diarahkan ke halaman hasil.
- Data dashboard sudah memuat sesi, metadata paket ujian, jawaban essay, dan profil siswa. Rencana awal memanfaatkan data yang telah tersedia agar tidak perlu menambah query atau mengubah database.
- Live Monitor sudah memiliki dua mode, filter status/kelas/pencarian, auto-refresh 5 detik, timer 1 detik, statistik, ekspor Excel, dan aksi proktor.

### File yang diusulkan untuk Batch 1

| File | Perubahan yang direncanakan | Klasifikasi | Batasan khusus |
|---|---|---|---|
| `app/admin/page.tsx` | Merapikan hierarki bagian dashboard; menambahkan filter kategori pada panel tindak lanjut; menyediakan akses Live Monitor per paket yang memang memiliki sesi ongoing/paused, dengan jumlah status yang bersumber dari data sesi yang sudah dimuat; membedakan tindakan pantau sesi dan penilaian essay | Penting untuk batch aktif | Gunakan state/data yang ada terlebih dahulu; jangan menambah query, mengubah rumus skor/XP, atau mengubah penentuan status sesi tanpa audit dan persetujuan |
| `app/admin/exam/[id]/monitor/page.tsx` | Merapikan keterbacaan header, ringkasan status, kontrol filter, dan tampilan tabel agar mudah dipakai di desktop maupun layar kecil; memperjelas navigasi kembali ke dashboard/rekap | Penting untuk batch aktif | Pertahankan persis perilaku timer, auto-refresh 5 detik, filter, kalkulasi, ekspor, dan aksi pause/resume/force submit/reset; jangan menambah atau mengaktifkan aksi proktor baru |

### Rincian UX yang diusulkan

**A. Dashboard Admin**
1. Pertahankan bagian statistik, ranking, peserta, dan pintasan pengelolaan yang telah ada; fokus pada hierarki dan keterbacaan, bukan menghapus fitur.
2. Panel `Perlu Ditindaklanjuti` memiliki kategori filter: Semua, Sesi belum selesai, dan Essay belum dinilai. Angka kategori dihitung dari `pendingWork` yang sudah dibentuk kode saat ini.
3. Item yang mempunyai sesi belum selesai menyediakan tautan `Pantau Live` ke `/admin/exam/{examId}/monitor`.
4. Item yang mempunyai essay belum dinilai menyediakan tautan `Buka Penilaian` ke `/admin/exam/{examId}/results`. Jika kedua kondisi berlaku, kedua tindakan ditampilkan dengan label yang berbeda.
5. Tambahkan ringkasan `Live Monitor` per paket ujian hanya untuk paket yang memiliki sesi berstatus `ongoing` atau `paused`; tampilkan jumlah sesi aktif dan dipause serta tautan menuju monitor paket tersebut. Sumbernya data `examRows` dan `examMeta` yang sudah tersedia di state, tanpa query tambahan.
6. Loading, empty state, dan warning yang sudah ada tetap dipertahankan; tidak menutupi pesan kegagalan.

**B. Live Monitor**
1. Perjelas identitas paket ujian, waktu pembaruan, dan status auto-refresh pada header.
2. Susun kartu statistik dan filter supaya label mudah dibaca dan kontrol tetap dapat dipakai di layar kecil.
3. Pertahankan dua mode tampilan: sesi real-time dan ringkasan siswa/multi-attempt.
4. Pertahankan kolom, data, timer, ekspor, serta semua tombol aksi proktor tanpa mengubah makna atau perilakunya. Perubahan Batch 1 di file ini dibatasi pada tata letak dan keterbacaan.
5. Tidak menambahkan tombol `Tambah Waktu` pada batch ini. Audit menemukan handler `handleExtendTime` belum terlihat dipanggil dari JSX; perlu keputusan dan QA terpisah sebelum fitur tersebut diaktifkan.

### Di luar cakupan Batch 1
- Perubahan Supabase schema, RLS, policy, grant, RPC, trigger, atau data.
- Perubahan query dashboard/monitor, pemilihan kolom, pagination backend, atau strategi refresh.
- Perubahan scoring, XP, perhitungan KKM 75, status CBT, timer, atau penyimpanan jawaban.
- Perubahan perilaku pause, resume, force submit, reset sesi, dan tambah waktu.
- Perbaikan fitur grading/results yang sudah tercatat sebagai audit lanjutan.
- Integrasi Google Drive.
- Merge ke `main`, deployment Production, perubahan environment/config, atau pembuatan branch.

### Risiko dan dependensi yang harus dijaga
- Dashboard membaca `profiles`, `practice_attempts`, `exam_sessions`, `exams`, `questions`, `answers`, `study_materials`, dan `announcements`; jangan mengubah query atau asumsi kompatibilitas kolom `credited_xp` dalam pekerjaan tata letak.
- Ringkasan sesi mengandalkan `exam_sessions.status`, `exam_id`, `user_id`, dan jawaban essay/teacher_score.
- Monitor bergantung pada `start_time`, `paused_at`, `paused_duration_seconds`, `extra_time_seconds`, `score`, `total_correct`, dan relasi penghapusan jawaban saat reset.
- Rute monitor harus selalu menerima ID paket ujian yang benar. Jangan membuat tautan global tanpa exam ID.
- Perubahan komponen monitor dapat berdampak pada tindakan langsung terhadap peserta ujian; aksi proktor tidak boleh diuji sembarangan pada sesi nyata.

### Rencana QA Preview setelah implementasi disetujui
1. Build/lint sesuai script yang tersedia; catat hasil nyata, jangan menganggap build lulus sebelum dijalankan.
2. Dashboard: loading, warning, data kosong, tiga filter kategori, jumlah badge, serta tautan `Pantau Live` dan `Buka Penilaian` menuju ID paket yang benar.
3. Dashboard: daftar Live Monitor hanya menampilkan paket dengan sesi ongoing/paused; jumlah tiap status cocok dengan data yang terlihat.
4. Monitor: buka paket uji yang aman; pastikan dua mode, filter status/kelas, pencarian, auto-refresh, dan waktu pembaruan tetap berfungsi.
5. Pastikan tampilan tabel dan kontrol tetap dapat digunakan pada desktop dan layar kecil.
6. Jangan melakukan pause/resume/force submit/reset pada sesi siswa nyata. Gunakan paket/sesi uji yang disetujui bila aksi tersebut memang perlu diverifikasi.
7. QA yang sudah pernah dinyatakan lulus tidak diminta ulang kecuali perubahan baru menyentuh perilaku tersebut.

### Gerbang persetujuan
Sebelum kode diubah, minta persetujuan eksplisit atas dua file dan ruang lingkup di atas. Jika disetujui, perubahan hanya dilakukan pada branch Preview `homepage-arcade-catalog`; tidak membuat branch baru, tidak menyentuh Production, dan tidak melakukan perubahan database/config. Kode lokal Codespace yang belum diserahkan tetap tidak diasumsikan sama dengan GitHub.


## Pelaksanaan Batch 1 — Dashboard Admin dan Live Monitor (10 November 2026)

**Status:** implementasi awal selesai pada branch Preview; menunggu build dan QA runtime. Tidak ada perubahan Production.

### Commit implementasi

| File | Commit | Perubahan |
|---|---|---|
| `app/admin/page.tsx` | `43e285ea55ed3cd089284cf766526066cd4650f6` | Filter tindak lanjut Semua / Sesi belum selesai / Essay belum dinilai; aksi `Pantau Live` untuk sesi belum selesai; aksi `Buka Penilaian` untuk essay yang belum dinilai; ringkasan Live Monitor per paket dengan jumlah ongoing dan paused |
| `app/admin/exam/[id]/monitor/page.tsx` | `9c26c8066b89c634e3fb7ea15097a0ac36ee0b91` | Tata letak header, statistik, mode, dan filter dirapikan agar lebih responsif; ditambahkan navigasi kembali ke Dashboard |

### Batas perubahan yang diverifikasi secara statis

- Kedua file diubah hanya pada branch `homepage-arcade-catalog`.
- Query dashboard/monitor tidak diubah; tidak ada perubahan database, schema, RLS, policy, grant, RPC, trigger, atau data.
- Rumus XP/scoring/KKM, timer, auto-refresh 5 detik, ticker 1 detik, dua mode monitor, filter, ekspor, serta handler aksi proktor tetap ada.
- Tidak menambahkan tombol untuk mengaktifkan `handleExtendTime`; tidak mengubah aksi pause/resume/force submit/reset.
- Dashboard menampilkan tautan monitor dan penilaian secara terpisah sesuai kondisi item.
- Pemeriksaan pasca-commit menemukan state filter kategori, ringkasan Live Monitor, kedua jenis tautan, tautan Dashboard, timer/refresh, dan handler proktor tetap ada pada file terbaru.

### QA dan hal yang belum diklaim

- [x] Verifikasi ulang isi kedua file dari GitHub setelah commit.
- [x] Pemeriksaan statis bahwa filter kategori dan tautan yang direncanakan tersedia.
- [x] Pemeriksaan statis bahwa interval 5 detik dan 1 detik serta handler proktor tetap dipertahankan.
- [ ] Build `npm run build` belum dijalankan oleh asisten.
- [ ] Deployment Preview untuk commit terbaru belum diverifikasi.
- [ ] QA browser dashboard dan Live Monitor (desktop/mobile, data nyata/safe test) belum dilakukan.
- [ ] Tidak ada aksi proktor destruktif yang diuji; jangan menguji reset/force submit/pause/resume pada sesi siswa nyata.

**Langkah berikutnya:** verifikasi deployment Preview dan build; setelah READY, lakukan QA browser terbatas sesuai daftar QA Batch 1. Status ini tidak berarti Batch 1 sudah lulus QA atau siap dirilis ke Production.


### Catatan build dan koreksi sintaks — 10 November 2026

- Deployment pertama untuk commit `9c26c8066b89c634e3fb7ea15097a0ac36ee0b91` berstatus **ERROR**. Log build menunjukkan kesalahan parser JSX pada tombol Auto-Refresh di `app/admin/exam/[id]/monitor/page.tsx:473`: penutup ekspresi event handler terlewat saat penyusunan layout.
- Kesalahan tersebut diperbaiki dengan menambahkan penutup `}` pada handler; tidak mengubah perilaku Auto-Refresh.
- Koreksi tersimpan pada commit Preview `0c008ba0a1c52a5326c2ef64d746f330a24e8918` dengan pesan `fix(admin): correct live monitor refresh button JSX`.
- Deployment ulang: `dpl_Dd5XveAWQrPnon4hjiLbY8FtATpV` — URL `https://grisan-cvjb3ia72-heins14.vercel.app`. Pada pemeriksaan terakhir status masih **BUILDING**; kompilasi Next.js berhasil dan proses sedang menjalankan pemeriksaan TypeScript. Belum boleh ditandai READY sampai status final terverifikasi.
- Catatan QA Batch 1 di atas tetap berlaku: belum ada QA browser/runtime, dan belum ada uji aksi proktor pada sesi nyata.


### Hasil build Preview — 10 November 2026

- [x] Deployment Preview untuk commit `0c008ba0a1c52a5326c2ef64d746f330a24e8918` berstatus **READY**.
- [x] Log build mengonfirmasi `Compiled successfully` dan pemeriksaan TypeScript selesai hingga deployment READY.
- [ ] QA browser oleh pengguna masih diperlukan untuk tampilan dashboard, filter tindak lanjut, tautan monitor/penilaian, Live Monitor dua mode, filter/pencarian, dan tata letak desktop/mobile.
- [ ] Belum ada pengujian terhadap data sesi siswa nyata atau aksi proktor. Jangan menjalankan aksi pause/resume/force submit/reset pada sesi nyata.
- Preview URL: https://grisan-git-homepage-arcade-catalog-heins14.vercel.app/
- Deployment ID: `dpl_Dd5XveAWQrPnon4hjiLbY8FtATpV` (READY).
- Status Batch 1: **build lulus; QA browser belum selesai; belum siap diminta rilis Production**.


## Inventaris usulan UI dropdown dashboard — 10 November 2026

**Status:** usulan/backlog saja. Belum disetujui untuk implementasi dan tidak ada kode aplikasi yang diubah dalam inventaris ini.

### Temuan pada kode Preview terbaru

File yang diperiksa: `app/admin/page.tsx` — SHA `e083d220d953488cd78737e08f2d5373d2c0f6b0`.

- Panel `Perlu Ditindaklanjuti` yang baru masuk Batch 1 memakai tiga tombol kategori: `Semua`, `Sesi belum selesai`, dan `Essay belum dinilai`. Tidak memakai elemen dropdown.
- Dashboard sebenarnya sudah mempunyai beberapa dropdown di bagian lain: lingkup ranking, paket ranking, kelas, tipe aktivitas, filter kelas daftar siswa, urutan/sortir, dan jumlah baris per halaman.
- Jadi temuan ini bukan ketiadaan dropdown secara umum; yang belum ada adalah dropdown khusus untuk mengganti tiga kategori pada panel `Perlu Ditindaklanjuti`.
- Live Monitor sudah mempunyai dropdown untuk filter status dan kelas.

### Usulan item

| Field | Catatan |
|---|---|
| File | `app/admin/page.tsx` |
| Tujuan file/area | Panel tindak lanjut dashboard admin; memilih kategori pekerjaan yang ditampilkan |
| Temuan | Tiga tombol kategori berfungsi sebagai filter, tetapi bukan dropdown |
| Klasifikasi | Peningkatan UX / kosmetik-terarah; bukan blocker fungsi |
| Alasan | Dropdown dapat menghemat ruang, terutama pada layar sempit; tombol saat ini lebih mudah terlihat dan cepat dipilih pada desktop |
| Arah implementasi | Evaluasi kontrol responsif: tombol/segmented control tetap pada desktop dan dropdown dengan label serta jumlah item pada layar kecil, atau dropdown tunggal jika hasil uji menunjukkan lebih sederhana. Jangan mengubah logika filter, sumber hitungan, tautan, atau data |
| Dependensi | State `pendingFilter` dan data `pendingWork` yang sudah ada; tidak perlu query baru atau perubahan database |
| Risiko | Jangan membuat dua kontrol yang membingungkan atau state tidak sinkron; pastikan label/jumlah kategori konsisten dan aksesibilitas keyboard tetap baik |
| Kelompok batch | **Usulan Batch 2 — Penyempurnaan UX Dashboard Admin**, digabung dengan permintaan UI dashboard lain jika muncul; tidak perlu batch mandiri |
| Persetujuan | Persetujuan kode diperlukan sebelum implementasi. Tidak ada persetujuan yang diberikan pada tahap inventaris ini |

### Rekomendasi keputusan

Jangan mengubah Batch 1 yang sudah build READY hanya untuk mengganti bentuk kontrol. Simpan item ini di backlog Batch 2 dan putuskan bersama usulan dashboard lain setelah inventaris terkumpul. Prioritas rendah-menengah: fungsi filter sudah tersedia dan berjalan sebagai tombol; perubahan dropdown hanya mengubah cara memilih kategori.

**Batas inventaris:** pemeriksaan dilakukan pada file GitHub Preview. Tidak mengklaim telah memeriksa perubahan lokal Codespace. Tidak ada perubahan kode, database, konfigurasi, deployment, atau Production.


## Penilaian kandidat rilis ke Production — Homepage, Admin, dan Practice (10 November 2026)

**Status:** audit awal selesai; belum disetujui untuk merge/push ke `main`. Tidak ada kode aplikasi, database, konfigurasi, atau deployment yang diubah dalam penilaian ini.

### Snapshot branch terbaru
- `main` dan `homepage-arcade-catalog` berstatus **diverged**.
- Preview: **193 commit ahead, 5 commit behind** dari `main` pada saat audit.
- Perbandingan menampilkan 31 file berbeda (termasuk roadmap dan migration). Karena branch menyimpang cukup jauh, merge seluruh branch Preview tidak aman sebagai cara merilis tiga halaman.
- Lima commit Production yang belum ada di Preview wajib direkonsiliasi sebelum merge; jangan menganggap Preview otomatis berisi semua perbaikan Production.

### Audit kandidat file dan dependensi

| Area kandidat | Perbedaan terverifikasi | Dependensi/risiko | Rekomendasi |
|---|---|---|---|
| Homepage `app/page.tsx` | Main 48,477 karakter; Preview 69,698. Import langsung relatif sederhana, tetapi Preview memakai `app/globals.css` yang juga berbeda besar (Main 2,654; Preview 18,387 karakter). | CSS global dapat memengaruhi seluruh situs, bukan homepage saja. Perlu petakan class/token yang dipakai homepage dan halaman lain sebelum menyalin CSS. | Bisa menjadi kandidat rilis tersendiri setelah ekstraksi CSS terpakai dan QA homepage + halaman lain yang terdampak. Jangan salin global CSS secara membabi buta. |
| Admin `app/admin/page.tsx` | Main 82,037 karakter; Preview 31,193 karakter. Preview dashboard berbeda jauh dan jauh lebih ringkas. | Risiko fitur Production yang sudah ada (CMS/modal, subtest, author display, dan pintasan pengelolaan) tertimpa atau hilang bila file Preview menggantikan file Main. Batch 1 dashboard/monitor hanya mengubah file Preview ini dan halaman monitor. | Jangan replace file Production dengan versi Preview. Lakukan rekonsiliasi fitur satu per satu, pertahankan kemampuan Production, lalu terapkan peningkatan Batch 1 secara selektif. |
| Practice hub `app/practice/page.tsx` | Main 26,199 karakter; Preview 40,426 karakter. | Halaman detail `app/practice/[id]/page.tsx` juga berbeda (Main 29,737; Preview 37,745), dan memanggil RPC `start_practice_attempt`. Mesin Flashcard juga memanggil RPC `start_practice_attempt` dan `finish_practice_attempt`. | Tidak aman merilis hub saja. Perlu satu paket Practice terkoordinasi dengan halaman detail dan komponen game yang memang diperlukan. |
| Komponen game | `FlashcardEngine.tsx`: Main 8,072; Preview 12,971. `MazeGameEngine.tsx`: Main 23,515; Preview 27,622. | Keduanya memiliki perubahan perilaku; bukan sekadar tampilan. | Masukkan hanya jika fitur Practice Preview yang dirilis memerlukannya, dan uji alur lengkap Maze/Flashcard. |
| Migration progres Practice | Preview menambahkan `20261108000100_practice_attempt_progress.sql`; tidak ada di Main. | Menambah kolom progres/XP dan membuat RPC `start_practice_attempt`, `save_practice_attempt_progress`, `finish_practice_attempt`. Ini perubahan database/XP yang berdampak pada data dan fungsi. | Migration adalah gerbang rilis tersendiri: audit SQL, pastikan status database target, rencana rollback/kompatibilitas, dan minta persetujuan eksplisit sebelum menjalankan di Production. Jangan menganggap merge file migration otomatis menjalankannya. |

### Kesimpulan rilis
1. **Batch 1 Dashboard Admin + Live Monitor belum selesai QA dan belum siap Production.** Build Preview READY, tetapi QA browser pengguna belum dicatat selesai.
2. Homepage, Admin Page, dan Practice Page dapat dirilis ke Production secara bertahap, tetapi **tidak aman dengan merge seluruh branch Preview** dan tidak aman pula dengan menyalin tiga file halaman secara terpisah.
3. Rekomendasi pemecahan kandidat: (A) Homepage + CSS terpilih setelah audit dampak; (B) Admin dengan rekonsiliasi fitur Production dan peningkatan dashboard/monitor; (C) Practice sebagai paket frontend + RPC/migration yang ditinjau terpisah.
4. Sebelum membuat kandidat merge, rekonsiliasi 5 commit Main yang tertinggal, audit seluruh file pendukung, bandingkan behavior Main vs Preview, dan jalankan build serta QA regresi yang sesuai.
5. Tidak ada PR, cherry-pick, merge, push ke Main, migration, atau deployment Production yang dilakukan.

### Persetujuan yang masih diperlukan
- Persetujuan eksplisit untuk pekerjaan persiapan kandidat rilis (tanpa merge) dapat diberikan per area.
- Persetujuan terpisah wajib diminta sebelum merge/push ke `main` dan sebelum perubahan database/migration Production.


### Pembaruan snapshot sebelum persiapan Kandidat A — 10 November 2026

- Pemeriksaan ulang setelah pembaruan roadmap menunjukkan branch telah berubah: `homepage-arcade-catalog` sekarang **194 commit ahead dan 6 commit behind** dari `main`; status tetap `diverged`; merge base `9979e3523e3d296d51cb1b650c97e1f9edebac27`.
- Perbandingan masih menunjukkan 31 file berbeda, termasuk Admin, Practice, CSS global, tiga migration, API, komponen game, dan dokumentasi. Perubahan angka dari snapshot sebelumnya disebabkan commit dokumentasi yang baru masuk ke kedua branch.
- Kandidat A tetap dibatasi pada Homepage dan dependensi visual yang benar-benar diperlukan. PR langsung dari branch Preview saat ini akan mencakup perubahan lain yang belum disetujui, sehingga **tidak dibuat**.
- Belum ada branch baru atau PR kandidat karena proses proyek saat ini menetapkan tidak membuat branch baru. Menyiapkan PR terisolasi membutuhkan pengecualian eksplisit untuk membuat branch rilis sementara; alternatif push langsung ke `main` tidak direkomendasikan untuk rilis ini.
- Tidak ada kode aplikasi, database, deployment, atau konfigurasi Production yang diubah.


## Keputusan proses yang ditegaskan pengguna — 10 November 2026

Keputusan ini **menggantikan usulan sebelumnya** tentang branch rilis sementara untuk Kandidat A.

- Pengguna menegaskan agar tidak membuat branch baru/perantara karena akan menambah kompleksitas dan memperlebar selisih branch.
- Lanjutkan pekerjaan yang dimaksud (Kandidat A — Homepage) langsung di branch Preview yang sudah ada: `homepage-arcade-catalog`. Tidak perlu branch tambahan.
- Tidak membuat PR atau merge ke `main` dalam pekerjaan Preview ini. Jangan mengubah Production atau database.
- Jangan membuat dokumen roadmap/arsip/checklist baru. Catatan ini sengaja disisipkan di roadmap Preview yang sudah ada.
- Snapshot GitHub saat catatan ini ditulis: Preview `fa4722737228087fb531ccc7f7f45a0e924ff5ef`; Main `e34abf3f8383a028b66c5c2e1cba7c7216660267`; status `diverged`; Preview 195 commit ahead dan 7 commit behind; merge base `9979e3523e3d296d51cb1b650c97e1f9edebac27`.
- Snapshot sebelumnya yang menyebut 194/6 dan rekomendasi meminta izin membuat branch rilis adalah catatan historis. **Keputusan branch rilis sementara tersebut dibatalkan dan tidak boleh diajukan kembali.**
- Lanjutkan pengembangan di Preview yang sama sesuai lingkup Kandidat A. Periksa dampak CSS global dan lakukan QA yang relevan; jangan memasukkan pekerjaan Admin/Practice atau migration ke pekerjaan Homepage.

**Instruksi operasional:** semua commit pengembangan selanjutnya untuk lingkup ini diarahkan ke `homepage-arcade-catalog`. Tidak ada branch baru, PR, merge, atau deployment Production.
