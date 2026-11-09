# Review Keamanan — Admin API dan Role Signup

Tanggal: 9 November 2026  
Branch: `security-hardening-admin-api`  
Status: review kode; tidak ada perubahan database.

## Tujuan

Menutup akses tidak sah pada API pengelolaan akun tanpa mengubah database bersama, mempertahankan alur admin yang sah, dan menyiapkan desain perubahan database untuk review terpisah.

## Perubahan kode yang disiapkan

### 1. Trusted admin allowlist

File: `lib/supabase/trusted-admin.ts`

- Memvalidasi identitas melalui `supabase.auth.getUser()` pada server.
- Otorisasi menggunakan daftar UUID server-only `ADMIN_USER_IDS`, bukan `profiles.role`.
- Menolak semua akses bila allowlist belum dikonfigurasi (fail closed).
- Menolak konfigurasi service-role yang tidak lengkap.
- Service-role client hanya dibuat setelah pengguna lolos pemeriksaan.

Format variabel:
`ADMIN_USER_IDS=uuid-admin-1,uuid-admin-2`

Nilai harus berisi hanya UUID akun admin yang diverifikasi langsung oleh pemilik proyek. Jangan mengisi otomatis dari semua baris `profiles.role='admin'`, karena policy database yang sedang diaudit memungkinkan perubahan role oleh client. Variabel ini belum dikonfigurasi pada Vercel.

### 2. API pengelolaan akun

File: `app/api/admin/users/route.ts`

- PUT dan DELETE mewajibkan origin same-site, sesi Auth yang valid, dan UUID yang ada di allowlist.
- Service-role key tidak lagi fallback ke anon key.
- Validasi UUID, nama, kode kelas, role, dan panjang password.
- Mencegah admin menghapus akun sendiri.
- Mencegah akun allowlist dihapus atau diturunkan role melalui endpoint biasa.
- Delete Auth mengandalkan foreign key `profiles.id_fkey` yang telah diverifikasi menggunakan `ON DELETE CASCADE`.
- Menambahkan POST server-side untuk pembuatan akun admin; endpoint ini belum digunakan oleh halaman admin sampai integrasi UI diselesaikan.

### 3. Batas yang belum selesai

- Pembuatan akun dan bulk import pada `app/admin/users/page.tsx` masih perlu dipindahkan ke API server. Pengambilan daftar profil sudah dibatasi ke kolom non-password, dan pembaruan `plain_password` saat reset password kini dilakukan oleh API server.
- Pendaftaran publik saat ini tidak mengirim role pada UI resmi, tetapi trigger database masih membaca role dari `raw_user_meta_data`. Permintaan Auth yang dibuat manual dapat mengirim metadata role. Ini tidak bisa ditutup tuntas hanya dengan mengubah UI; trigger perlu diperbaiki di database.
- Admin UI dan helper `requireAdmin()` masih menggunakan `profiles.role`. Perbaikan database dan penyesuaian seluruh route admin masih diperlukan.
- Bulk import akun masih melakukan operasi langsung dari browser dan perlu diaudit/dipindahkan ke endpoint server.

## Draft desain database untuk review — JANGAN JALANKAN

K3 hanya mengizinkan review, bukan eksekusi. SQL berikut adalah arah perubahan, bukan migration yang telah disetujui atau siap dijalankan.

Trigger signup harus mengabaikan role dari user metadata dan selalu membuat profil baru sebagai student. Role admin hanya boleh diberikan melalui server-side Admin API setelah allowlist diverifikasi.

Contoh inti perubahan fungsi trigger (perlu dicocokkan dengan definisi fungsi aktual dan seluruh kolom wajib sebelum menjadi migration):

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    username,
    full_name,
    class_code,
    role
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name',
    upper(new.raw_user_meta_data ->> 'class_code'),
    'student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
```

Catatan review:
- Pastikan kolom yang memiliki NOT NULL/default cocok dengan daftar insert di atas.
- Pertahankan trigger yang sudah ada; jangan membuat trigger kedua.
- `search_path` dikunci kosong dan seluruh objek harus memakai schema-qualified name.
- Admin API melakukan upsert role setelah Auth user dibuat oleh server tepercaya.
- Review grants dan seluruh policy lama pada `profiles`; policy permissive yang tersisa dapat tetap membatalkan perlindungan.
- Batasi UPDATE/INSERT kolom role agar client tidak dapat menaikkan privilege.
- Siapkan policy terpisah untuk siswa dan admin; jangan mengaktifkan RLS atau menghapus policy sebelum matriks akses per fitur lengkap.

## Rencana pengujian sebelum rilis

1. Tanpa login: PUT/POST/DELETE ditolak.
2. Login sebagai student: PUT/POST/DELETE ditolak.
3. Login sebagai UUID yang tidak ada dalam allowlist: ditolak.
4. Login sebagai admin allowlist: dapat membuat dan mengedit akun melalui server API.
5. Admin tidak dapat menghapus akun sendiri.
6. Admin allowlist tidak dapat dihapus atau diturunkan role melalui endpoint biasa.
7. Password Auth dan `plain_password` hanya berubah melalui server API; pastikan halaman kartu akun tetap bekerja.
8. Uji pembuatan student/admin dan login masing-masing.
9. Uji bulk import setelah desain endpoint server selesai.

## Persetujuan dan larangan

- Tidak ada SQL yang dijalankan.
- Tidak ada perubahan data Supabase.
- Tidak ada environment variable Vercel yang diubah.
- Tidak ada merge ke `main`.
- `ADMIN_USER_IDS` harus diisi hanya setelah pemilik proyek memverifikasi daftar admin yang benar.
- Semua perubahan harus lolos build dan QA Preview sebelum dipertimbangkan untuk merge.


## Perluasan perlindungan server admin

- `lib/supabase/admin.ts` sekarang mendelegasikan pemeriksaan ke `requireTrustedAdmin()`.
- Semua route Google Drive yang memakai helper `requireAdmin()` otomatis memakai allowlist server-side yang sama.
- Tidak ada route Google Drive yang diuji atau dihubungkan pada Preview; kebijakan K5 tetap berlaku.
- Halaman admin/layout client masih menggunakan `profiles.role` untuk mengatur tampilan. Ini bukan pengganti otorisasi server dan masih menunggu perbaikan database/peninjauan akses tabel.


## Perubahan lanjutan — cetak kartu melalui server tepercaya

Branch kerja: `security-print-cards-server`

- Ditambahkan `POST /api/admin/users/print-cards`.
- Endpoint memeriksa Origin, sesi Supabase Auth, dan allowlist `ADMIN_USER_IDS` sebelum membaca data kredensial.
- Endpoint hanya menerima 1–100 UUID pengguna yang dipilih, menolak ID tidak valid/duplikat, dan mengambil hanya `id, username, full_name, class_code, plain_password`.
- Respons memakai header `Cache-Control: no-store`; password tidak dimasukkan ke respons daftar profil biasa.
- Halaman kelola pengguna tidak lagi memakai `.select('*')`; daftar profil hanya mengambil `id, username, full_name, class_code, role`.
- Tombol cetak meminta data kartu dari endpoint server, lalu mempertahankan desain dan tampilan password kartu seperti sebelumnya.
- Setelah dialog cetak selesai, data kartu dihapus dari state halaman.
- Reset password kini memperbarui Auth password dan `profiles.plain_password` di API server, bukan melakukan update `plain_password` dari browser.

### Batas dan pengujian yang masih diperlukan

- `plain_password` sengaja dipertahankan agar password tetap dapat dibaca dan dicetak. Endpoint ini membatasi jalur pengambilannya, tetapi nilai di database masih berupa teks biasa; enkripsi-at-rest merupakan pekerjaan terpisah dan tidak boleh dilakukan sebelum alur cetak serta login diuji.
- Pembuatan akun dan bulk import masih memakai jalur client-side lama dan belum dianggap aman.
- Uji cetak kartu nyata, cetak banyak siswa, akun dengan `plain_password` kosong, dan penolakan endpoint untuk anonim/siswa harus dilakukan di Preview. Jangan gunakan data valid untuk operasi tulis karena Preview berbagi Supabase Production.
- Tidak ada SQL yang dijalankan, data Supabase yang diubah, merge ke `main`, atau deployment Production dalam pekerjaan ini.
