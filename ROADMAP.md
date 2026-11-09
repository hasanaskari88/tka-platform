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
