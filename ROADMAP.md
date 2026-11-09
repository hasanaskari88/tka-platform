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
