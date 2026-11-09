# Arsip Keamanan Admin dan Cetak Kartu

Tanggal pembaruan: 9 November 2026  
Repository: `hasanaskari88/tka-platform`  
Branch pengembangan tunggal: `homepage-arcade-catalog`  
Production branch: `main`  
Commit kode yang diperiksa: `703d3fd4b262cc0672d887063e9c7dfedfad9c54`  
Preview: https://grisan-git-homepage-arcade-catalog-heins14.vercel.app/  
Status deployment: READY

> Dokumen ini adalah catatan status terbaru. Semua pekerjaan kode lanjutan dilakukan pada `homepage-arcade-catalog`; jangan membuat branch fitur baru.

## 1. Batas keselamatan yang disepakati

- `main` adalah Production. Tidak boleh diubah, di-merge, atau di-deploy tanpa persetujuan eksplisit pemilik proyek.
- Semua pengembangan dan QA dilakukan pada `homepage-arcade-catalog` dan satu alamat Preview di atas.
- Preview dan Production menggunakan proyek Supabase yang sama. Setiap operasi tulis dari Preview berpotensi mengubah data Production.
- Tidak ada SQL, migration, perubahan RLS/policy/grant/function/trigger, atau perubahan data Supabase yang dilakukan dalam pekerjaan ini.
- Jangan uji Google Drive OAuth dari Preview selama database masih berbagi dengan Production.
- Jangan menghapus atau mengubah branch lain secara otomatis. Branch keamanan lama bukan jalur pengembangan aktif.

## 2. Implementasi keamanan yang sudah tersimpan

### Trusted admin

File: `lib/supabase/trusted-admin.ts`

- Memvalidasi sesi menggunakan `supabase.auth.getUser()` di server.
- Memeriksa UUID pengguna terhadap environment server-only `ADMIN_USER_IDS`.
- Fail closed: jika allowlist tidak tersedia atau konfigurasi service-role tidak lengkap, akses ditolak.
- Service-role client hanya dibuat setelah sesi dan allowlist lolos.
- Otorisasi API tidak menggunakan `profiles.role` sebagai sumber kepercayaan.

Environment Vercel:
- Key: `ADMIN_USER_IDS`
- Target: Preview saja.
- Branch scope: `homepage-arcade-catalog`.
- Nilai berisi tujuh UUID admin yang telah diverifikasi sebelumnya. Nilai rahasia tidak boleh ditulis ke dokumentasi, log, atau chat.

### Admin users API

File: `app/api/admin/users/route.ts`

- POST, PUT, DELETE memeriksa Origin same-site, sesi Auth, dan allowlist admin tepercaya.
- Service-role key tidak fallback ke anon key.
- Input divalidasi; self-delete dicegah.
- Akun dalam allowlist tidak dapat dihapus atau diturunkan role melalui endpoint ini.
- POST server-side sudah tersedia, tetapi form pembuatan akun pada UI belum sepenuhnya dialihkan ke endpoint ini.
- Reset password melalui UI sudah memanggil API server; API memperbarui `profiles.plain_password` dan Auth password.

### Cetak kartu melalui server tepercaya

File endpoint: `app/api/admin/users/print-cards/route.ts`  
File UI: `app/admin/users/page.tsx`

Alur:
1. Halaman daftar pengguna hanya mengambil `id, username, full_name, class_code, role`; tidak mengambil `plain_password`.
2. Admin memilih siswa yang akan dicetak.
3. Browser mengirim ID pilihan ke `POST /api/admin/users/print-cards`.
4. Server memeriksa Origin, sesi Auth, dan allowlist sebelum membaca kolom kredensial.
5. Endpoint menerima 1–500 UUID unik dan mengambil hanya `id, username, full_name, class_code, plain_password`.
6. Respons menggunakan `Cache-Control: no-store`, `Pragma: no-cache`, dan `Vary: Cookie`.
7. UI menampilkan kartu dengan username dan password yang dapat dibaca, lalu menghapus data kartu dari state setelah event `afterprint`.

**Password tetap berupa teks biasa di database dan tetap ditampilkan pada kartu.** Ini dipertahankan sesuai kebutuhan operasional sekolah. Endpoint membatasi jalur pengambilan password, tetapi belum mengenkripsi nilai saat tersimpan di database. Jangan menghapus atau meng-hash `plain_password` sebelum ada rancangan pengganti dan pengujian login/cetak yang disetujui.

## 3. Bukti pemeriksaan dan status QA

### Sudah diverifikasi

- Pengujian endpoint admin users sebelumnya: anonim ditolak 401; student ditolak 403; admin tepercaya melewati otorisasi dan mencapai validasi payload 400 ketika body tidak lengkap.
- Tidak ada akun dibuat, diubah, atau dihapus dalam pengujian tersebut.
- Deployment Preview commit `703d3fd` berstatus READY.
- Build berhasil setelah deklarasi `dynamic = 'force-dynamic'` dihapus dari route cetak kartu karena tidak kompatibel dengan konfigurasi `cacheComponents` proyek.

### Belum diverifikasi secara fungsional

- Cetak satu kartu dengan username dan password yang benar.
- Cetak beberapa kartu sekaligus.
- Perilaku kartu ketika `plain_password` kosong.
- Penolakan endpoint cetak untuk anonim dan student.
- Penghapusan data kredensial dari state setelah dialog print ditutup.

Build READY bukan bukti bahwa alur cetak runtime sudah lulus. Lakukan QA visual/fungsional pada Preview sebelum menyatakan pekerjaan selesai.

## 4. Pekerjaan terbuka dan urutan berikutnya

1. QA cetak satu kartu dan batch kartu melalui UI Preview. Jangan melakukan operasi tulis ke database.
2. Uji endpoint cetak sebagai student dengan body kosong; harus ditolak 403 sebelum data dibaca. Uji anonim harus ditolak 401.
3. Setelah alur cetak lolos, pindahkan pembuatan akun tunggal dari `supabase.auth.signUp()` browser ke `POST /api/admin/users`.
4. Pindahkan bulk import dari `.from('profiles').insert(...)` browser ke endpoint server dengan validasi per baris dan hasil sukses/gagal yang jelas.
5. Putuskan alur pemberian role admin secara terpisah. Akun baru dengan role admin tidak otomatis menjadi trusted admin; perubahan allowlist harus dilakukan secara sengaja.
6. Setelah itu, audit akses database/RLS dan trigger signup hanya melalui review statis dan rancangan SQL. Jangan jalankan SQL pada database bersama tanpa persetujuan terpisah.

Penting: UI pembuatan akun tunggal masih menggunakan browser-side `auth.signUp()` dan mengirim metadata `role`; bulk import masih melakukan insert langsung ke tabel `profiles`. Dua jalur tersebut belum dianggap aman dan perlu dimigrasikan sebelum digunakan sebagai alur administrasi yang telah diamankan.

## 5. Pengaturan deployment Vercel

Project `grisan` menggunakan Git integration. Branch non-production secara default dapat memicu Preview deployment pada setiap push.

Untuk mengurangi build yang tidak perlu, project setting `Ignored Build Step` telah diatur dengan perintah:

```sh
git diff --quiet HEAD^ HEAD -- . ':(exclude)**/*.md' ':(exclude)docs/**'
```

Tujuannya:
- Perubahan yang hanya menyentuh file Markdown atau folder `docs/` dilewati tanpa menjalankan build/deployment baru.
- Perubahan kode, konfigurasi, dependency, aset, atau file aplikasi tetap memicu Preview agar bisa diuji.
- Commit yang berisi dokumentasi sekaligus kode tetap memicu build.
- Ini tidak mematikan Preview dan tidak mengubah Production.

Jika suatu commit dokumentasi tetap memicu build, periksa log Ignored Build Step sebelum mengubah command. Jangan menonaktifkan semua Preview deployment karena branch ini adalah satu-satunya tempat QA.

## 6. Riwayat kode dan file sumber

Seluruh kode aktif berada di branch `homepage-arcade-catalog`. File sumber utama:

- `lib/supabase/trusted-admin.ts`
- `lib/supabase/admin.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/print-cards/route.ts`
- `app/admin/users/page.tsx`
- `docs/SECURITY-HARDENING-REVIEW.md` (dokumen ini)

Commit penting:
- `703d3fd` — menghapus konfigurasi route yang menyebabkan build gagal.
- Riwayat sebelumnya pada branch keamanan telah dipindahkan secara fast-forward ke branch pengembangan tunggal; tidak perlu cherry-pick atau merge ulang.

## 7. Larangan rilis dan database

- Jangan merge PR #2 atau branch Preview ke `main` tanpa persetujuan eksplisit.
- Jangan jalankan migration atau mengubah Supabase.
- Jangan melakukan uji tulis akun di Preview karena database yang dipakai sama dengan Production.
- Jangan membuka Google Drive OAuth Preview.
- Jangan membuat branch pengembangan tambahan.
