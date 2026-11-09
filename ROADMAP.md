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
