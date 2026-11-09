# ROADMAP TKA PLATFORM — SUMBER STATUS UTAMA

Pembaruan: 9 November 2026  
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
| Production | `main` — `9979e3523e3d296d51cb1b650c97e1f9edebac27` |
| Deployment Production | READY — `dpl_3mSqU3a8j2bgcZD7zwSZ3tNa3d1F` |
| Preview | `homepage-arcade-catalog` — `c5972884d9c8e2b2c2d0d2cffa6d806afa5b5f4e` |
| Deployment Preview | READY — `dpl_VVx5g4KeAuBmdSicGzbh4gbpueeu` |
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
