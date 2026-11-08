# Inventaris Proyek dan Audit Akses — TKA Platform

Tanggal pemeriksaan: 8 November 2026  
Branch sumber: `main`  
Commit sumber: `9979e3523e3d296d51cb1b650c97e1f9edebac27`  
Branch dokumentasi: `security-audit-inventory`

## 1. Tujuan dan batas pemeriksaan

Dokumen ini menjadi peta awal kode, alur aplikasi, struktur database, dan izin akses agar perapian RLS tidak merusak fungsi yang memang diperlukan.

Pemeriksaan mencakup:
- Seluruh pohon file GitHub pada commit sumber (80 file terdaftar).
- Penelusuran sumber utama aplikasi, API routes, helper Supabase, komponen editor/gim, dan konfigurasi paket.
- Inventaris tabel, kolom, relasi, RLS, policies, grants, fungsi PostgreSQL, trigger, dan hasil Supabase Security/Performance Advisors pada saat pemeriksaan.

Ini adalah audit statis dan pembacaan konfigurasi database, bukan penetration test. Tidak ada kode aplikasi, schema, data, policy, grant, trigger, function, akun, atau konfigurasi login yang diubah selama pemeriksaan.

## 2. Ringkasan arsitektur dan fungsi

Stack yang teridentifikasi dari repository:
- Next.js App Router 16.4.2, React 19.3.0, TypeScript.
- Supabase Auth + Postgres melalui `@supabase/ssr` dan `@supabase/supabase-js`.
- Tiptap 3.32.2 dan KaTeX 0.18.3 untuk editor teks kaya dan rumus.
- Google Drive API untuk penyimpanan gambar editor.
- XLSX untuk impor/ekspor data; canvas-confetti, Framer Motion, Lucide, Tailwind CSS.

Alur utama:
1. **Login/pendaftaran** — `app/login/page.tsx` memakai username yang dipetakan ke email internal `@grisan.com`; login memakai Supabase Auth. Pendaftaran publik mengirim nama, username, dan kode kelas.
2. **Beranda** — `app/page.tsx` membaca ujian terpublikasi, pengumuman aktif, materi belajar, dan profil pengguna.
3. **CBT siswa** — `app/exam/[id]/page.tsx` membaca ujian/soal, membuat sesi, menyimpan jawaban, autosave, dan menyelesaikan ujian. Ringkasan hasil ada di `app/exam/[id]/summary/page.tsx`.
4. **Latihan** — `app/practice` dan `app/practice/[id]` membaca modul/soal, memulai/menyelesaikan attempt, menghitung XP, dan membuka lencana. Mesin gim ada di `components/games`.
5. **Riwayat dan profil** — `app/history/page.tsx` membaca riwayat ujian/latihan; `app/profile/page.tsx` mengelola profil, avatar, dan perubahan password.
6. **Dashboard admin** — `app/admin/page.tsx` mengelola ujian, subtes, pengumuman, dan materi. Halaman admin ujian menyediakan pengelolaan soal, monitor peserta, analisis, cetak LJK, scanner, hasil, koreksi essay, ekspor, dan reset sesi. `app/admin/users/page.tsx` mengelola akun, impor massal, dan pencetakan kartu akun.
7. **Editor dan gambar** — `components/editor` menyediakan editor Tiptap, formula, tabel, font, gambar, crop, resize, dan integrasi Google Drive.
8. **Google Drive** — API connect/callback/upload/gallery/image memakai `requireAdmin()`; refresh token terenkripsi disimpan di tabel `google_drive_tokens`.

## 3. Inventaris kode GitHub

Jumlah pada commit sumber: 80 file:
- 40 file TSX, 13 file TS, 2 CSS, 5 JSON, 3 Markdown, 1 MJS.
- Aset: 5 SVG, 2 font TTF, 4 PNG, 1 ICO, 2 .gitkeep, 1 file tanpa ekstensi, dan 1 .gitignore.

### App routes
- `app/page.tsx` — beranda publik dan data yang tampil.
- `app/login/page.tsx` — login dan pendaftaran.
- `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/users/page.tsx` — gerbang UI admin, dashboard, dan pengelolaan akun.
- `app/admin/exam/[id]/page.tsx` — detail/pengelolaan ujian.
- `app/admin/exam/[id]/analysis/page.tsx` — analisis hasil.
- `app/admin/exam/[id]/ljk-print/page.tsx` — cetak LJK.
- `app/admin/exam/[id]/ljk-scanner/page.tsx` — pemindaian LJK.
- `app/admin/exam/[id]/monitor/page.tsx` — pemantauan sesi peserta.
- `app/admin/exam/[id]/results/page.tsx` — rekap, koreksi manual, nilai, ekspor, dan reset hasil.
- `app/admin/exams/[id]/questions/page.tsx` — bank/pengelolaan soal.
- `app/admin/practice/page.tsx` — pengelolaan modul latihan/gim.
- `app/exam/[id]/page.tsx`, `app/exam/[id]/summary/page.tsx` — pengerjaan CBT dan ringkasan.
- `app/practice/page.tsx`, `app/practice/[id]/page.tsx` — daftar dan pengerjaan latihan.
- `app/history/page.tsx` — riwayat siswa.
- `app/profile/page.tsx` — profil siswa.
- `app/font-test/page.tsx` — halaman lab/pengujian font; bukan bagian alur utama.
- `app/layout.tsx`, `app/globals.css`, `app/favicon.ico` — layout dan gaya global.

### API routes
- `app/api/admin/users/route.ts` — PUT profil/password dan DELETE akun.
- `app/api/google-drive/connect/route.ts` — memulai OAuth Google.
- `app/api/google-drive/callback/route.ts` — validasi state OAuth dan simpan token terenkripsi.
- `app/api/google-drive/upload/route.ts` — validasi dan unggah gambar ke Drive.
- `app/api/google-drive/images/route.ts` — daftar gambar di folder Drive.
- `app/api/google-drive/image/[id]/route.ts` — mengambil gambar berdasarkan ID.

### Komponen, helper, dan konfigurasi
- Komponen umum: `BulkUploadModal`, `ExamTokenModal`, `FocusModeButton`, `Footer`, `MathRenderer`, `Navbar`, `ThemeBackground`.
- Editor: `EditorToolbar`, `FontSize`, `ImageCropDialog`, `ImageDialog`, `MathFormulaDialog`, `ResizableImage`, `RichTextEditor`, `TableControls`, `editor.css`.
- Gim: `FlashcardEngine`, `MazeGameEngine`, `MazeGameV2Engine`, `QuizEngine`.
- Konteks/helper: `context/ThemeContext.tsx`, `lib/confetti.ts`, `lib/google-drive/token-encryption.ts`, `lib/supabase/admin.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`.
- Konfigurasi dan dokumen: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `README.md`, `AGENTS.md`, `docs/EDITOR-CHANGELOG.md`, `.vscode/launch.json`, `.vscode/settings.json`.
- Aset publik: `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`; font Arab `NotoNaskhArabic-Regular.ttf`; font Jawa `NotoSansJavanese-Regular.ttf`; logo `logo-sd-getasan.png`, `logo-sd-getasan2.png`, `logo-sd.png`, `logo-tka.png`.

## 4. Inventaris database Supabase

Project yang diperiksa: `twjdguiihtettgfwpivg`. Ditemukan 11 tabel pada schema `public`.

| Tabel | RLS | Peran dalam aplikasi / catatan |
|---|---:|---|
| `profiles` | ON | Identitas, role, username, kelas, XP, level, badges, avatar, dan `plain_password` untuk kartu akun. |
| `exams` | ON | Metadata paket CBT/latihan, jadwal, token, publikasi, mode aktivitas, pengaturan hasil, dan penulis. |
| `questions` | ON | Teks soal, opsi, kunci, penjelasan, tipe soal, skor, indikator, dan konfigurasi maze. |
| `exam_sessions` | ON | Sesi CBT, status, waktu, nilai, bonus, dan override nilai. |
| `answers` | ON | Jawaban siswa, pilihan, status ragu, nilai per jawaban, dan skor guru. |
| `subtests` | ON | Master daftar subtes. |
| `announcements` | **OFF** | Pengumuman beranda; publik membaca pengumuman aktif, admin mengelola. |
| `study_materials` | **OFF** | Materi belajar beranda; publik membaca, admin mengelola. |
| `practice_attempts` | ON | Riwayat dan progres latihan, status, nilai, XP. |
| `practice_attempt_answers` | ON | Tabel jawaban latihan; saat audit kosong dan tidak ditemukan pemakaian langsung di sumber aplikasi yang ditelusuri. |
| `google_drive_tokens` | ON | Token refresh Google terenkripsi dan ID folder; dipakai API server dengan service-role client. Tidak ada policy RLS, sehingga akses client biasa tertutup oleh RLS. |

### Relasi dan ketergantungan penting
- `profiles.id` terhubung ke `auth.users.id`.
- `exams` memiliki relasi penulis ke `profiles`; `questions` dan `exam_sessions` terkait ke `exams`.
- `answers` terkait ke `exam_sessions` dan `questions`.
- `practice_attempts` terkait ke `profiles` dan `exams`; `practice_attempt_answers` terkait ke attempt dan question.
- `study_materials.created_by` dan `exams.created_by` terhubung ke profil penulis.

## 5. Inventaris RLS dan policy yang ditemukan

Total policy pada tabel publik yang diperiksa: 38 policy. Nama policy yang berbeda tidak selalu berarti akses berbeda; policy permissive digabung dengan logika OR untuk role yang sama. Karena itu policy duplikat dapat memperluas akses dan membingungkan audit.

| Tabel | Jumlah policy | Temuan utama |
|---|---:|---|
| `profiles` | 8 | Ada `ALL` publik dengan kondisi true, public SELECT/INSERT, dan public UPDATE tanpa pembatasan baris. Policy UPDATE sendiri juga ada. |
| `exams` | 2 | `Public Write Exams` memberi ALL publik; SELECT publik untuk ujian terpublikasi juga ada. |
| `questions` | 3 | `Public Write Questions` memberi ALL publik; SELECT publik dan authenticated tersedia. |
| `exam_sessions` | 7 | Dua policy ALL publik, INSERT publik, SELECT publik berulang, dan UPDATE publik; policy milik siswa tertutup oleh policy permissive publik. |
| `answers` | 5 | Dua policy ALL publik, INSERT/SELECT publik, serta policy milik siswa; akses publik membuat pembatasan kepemilikan tidak efektif. |
| `subtests` | 2 | Policy ALL publik ditambah SELECT publik. |
| `announcements` | 4 | Ada policy CRUD publik, tetapi RLS tabel OFF sehingga policy tidak menjadi pembatas. |
| `study_materials` | 4 | Ada policy CRUD publik, tetapi RLS tabel OFF sehingga policy tidak menjadi pembatas. |
| `practice_attempts` | 3 | Policy authenticated untuk attempt milik siswa dan pembacaan admin; kondisi role bergantung pada `profiles.role`. |
| `practice_attempt_answers` | 0 | RLS ON tanpa policy; client biasa tidak dapat mengakses baris. |
| `google_drive_tokens` | 0 | RLS ON tanpa policy; pola yang sesuai untuk akses service-role server saja. |

Pada 10 tabel selain `google_drive_tokens`, role `anon` dan `authenticated` memiliki grant tabel yang luas (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER). Grant bukan satu-satunya lapisan keamanan: RLS/policy menentukan akses baris untuk operasi yang dicakup RLS. Namun TRUNCATE, REFERENCES, dan TRIGGER tidak dibatasi oleh RLS sehingga grant tersebut perlu dipertimbangkan saat merapikan izin.

### Kebutuhan fitur yang memang terlihat dari kode
- Beranda membutuhkan SELECT publik untuk ujian yang dipublikasikan, pengumuman aktif, materi, dan nama penulis.
- Siswa membutuhkan baca soal, membuat/memperbarui sesi sendiri, serta menyimpan jawaban saat CBT.
- Latihan memakai RPC untuk membuat dan menyelesaikan attempt, lalu memperbarui XP/lencana.
- Admin dashboard saat ini melakukan CRUD langsung dari browser untuk ujian, soal, subtes, pengumuman, dan materi. Jadi perubahan policy harus diselaraskan dengan alur ini atau kode admin perlu dialihkan ke endpoint server yang memeriksa admin.
- Halaman hasil/monitor admin membaca profil, sesi, soal, dan jawaban banyak siswa; koreksi dan reset mengubah/menghapus data tersebut.
- Kartu akun membaca `plain_password`; kolom ini dipertahankan sesuai kebutuhan operasional yang disampaikan pemilik proyek. Tidak ada instruksi untuk menghapus kolom atau mengubah alur pencetakan.

## 6. Fungsi PostgreSQL dan trigger

Fungsi publik yang ditemukan:
- `start_practice_attempt(uuid)` — SECURITY DEFINER; memerlukan login, memeriksa role student, dan membuat attempt milik pengguna saat ini. Dipakai alur latihan.
- `finish_practice_attempt(uuid, integer, integer, integer)` — SECURITY DEFINER; memeriksa login, role student, kepemilikan attempt, status, dan rentang input sebelum menyimpan skor/XP. Dipakai alur latihan.
- `abandon_practice_attempt(uuid)` — SECURITY DEFINER; mengubah attempt menjadi abandoned hanya jika milik `auth.uid()` dan masih in_progress. Dipakai MazeGameEngine.
- `add_user_xp(uuid, integer)` — SECURITY INVOKER; menerima user ID dan XP sebagai argumen, lalu memperbarui profil yang ID-nya diberikan. Dipakai FlashcardEngine dan QuizEngine untuk user yang sedang login, tetapi fungsi sendiri tidak mengikat target ID ke `auth.uid()`.
- `generate_exam_token()` — menghasilkan token 6 karakter; tidak ditemukan pemanggilan RPC dari kode aplikasi yang ditelusuri.
- `handle_new_user()` — SECURITY DEFINER; trigger `on_auth_user_created` pada `auth.users`, membuat profil dari metadata pendaftaran. Saat ini nilai role diambil dari metadata dan hanya fallback ke student jika metadata role kosong.
- `rls_auto_enable()` — event trigger untuk mengaktifkan RLS saat tabel baru dibuat pada schema public.

Temuan advisor juga menunjukkan EXECUTE untuk anon dan authenticated pada fungsi-fungsi tersebut. Perlu dibedakan: fungsi RPC yang dipakai alur latihan memang perlu tersedia bagi pengguna yang login; fungsi trigger/event-trigger bukan endpoint aplikasi biasa dan warning linter untuk keduanya tidak boleh ditindaklanjuti secara membabi buta.

## 7. Temuan kode dan risiko akses

### Prioritas sangat tinggi — endpoint kelola user belum memeriksa admin
`app/api/admin/users/route.ts`:
- PUT dan DELETE menerima `userId` dari request tanpa memanggil `requireAdmin()` atau memvalidasi sesi admin.
- Client dibuat dengan `SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Jika service-role key tersedia di environment server, request ke endpoint ini dapat menjalankan perubahan profil dan operasi Auth admin tanpa pemeriksaan admin di route.
- Ini bukan sekadar masalah UI: siapa pun yang dapat mengakses URL API dapat mencoba mengirim request langsung.
- Jika service-role key tidak tersedia, fallback anon tidak memberi hak Auth Admin, tetapi policy profil yang luas masih membuat jalur update profil perlu diaudit.
- Halaman `app/admin/users/page.tsx` memakai endpoint ini untuk edit role/password dan hapus akun; karena itu endpoint harus diamankan tanpa menghilangkan fungsi admin tersebut.

### Prioritas sangat tinggi — role admin dapat dipengaruhi dari jalur publik
- Policy `Public Update Profiles` mengizinkan UPDATE profil tanpa pembatasan baris.
- Fungsi trigger `handle_new_user()` mengambil `role` dari `raw_user_meta_data`.
- Form pendaftaran biasa tidak mengirim role, tetapi alur pembuatan akun dari halaman admin memang mengirim role melalui metadata. Karena metadata signup berasal dari pemanggil Auth, default student saja belum cukup untuk menjamin pengguna publik tidak meminta role admin.
- Helper `requireAdmin()` dan gerbang `app/admin/layout.tsx` sama-sama membaca `profiles.role`; keduanya tidak dapat dianggap sebagai batas keamanan yang kokoh selama role dapat dimodifikasi melalui jalur publik.
- RLS practice_attempts dan RPC latihan juga memeriksa `profiles.role`, sehingga risiko ini merambat ke fitur lain.

### Prioritas tinggi — data CBT dan kunci soal terbuka
- Policy publik ALL pada `exam_sessions` dan `answers` membuat data sesi/nilai/jawaban tidak dibatasi hanya kepada pemilik atau admin.
- Policy publik ALL pada `questions` memungkinkan operasi tulis publik; SELECT publik juga membaca semua baris.
- `app/exam/[id]/page.tsx` dan `app/practice/[id]/page.tsx` menggunakan `questions.select('*')`. Kolom kunci jawaban dan penjelasan ikut dikirim ke browser siswa. Ini sesuai dengan arsitektur client-side saat ini untuk sebagian alur penilaian/latihan, tetapi berarti kunci tidak rahasia dari pengguna yang dapat membaca network/API.
- `exams` memiliki policy ALL publik walaupun beranda hanya meminta ujian terpublikasi. Policy SELECT terpublikasi tidak mempersempit policy ALL yang permissive.
- Halaman admin hasil/monitor memerlukan akses luas lintas siswa untuk rekap, koreksi, dan reset; kebutuhan itu sebaiknya dipenuhi lewat pemeriksaan admin yang benar, bukan policy publik.

### Prioritas tinggi — XP dapat dimanipulasi
- `add_user_xp(user_id_input, xp_to_add)` tidak memeriksa `auth.uid()`, role, atau batas nilai XP.
- Aplikasi memanggilnya dengan ID user yang sedang login, tetapi fungsi publik dapat dipanggil langsung dengan ID target lain.
- Karena policy profil saat ini sangat luas, fungsi invoker ini berpotensi mengubah XP/level profil lain. Perlu pembatasan tanpa merusak reward Flashcard dan Quiz.

### Prioritas menengah — profil dan kartu akun
- `profiles` memiliki kolom `plain_password` yang dipakai untuk kartu akun; pemilik proyek meminta kolom dan fungsi cetaknya tetap ada.
- Beberapa halaman memakai `profiles.select('*')`; policy SELECT publik berarti kolom tersebut dapat ikut terbaca melalui Data API. Kebutuhan cetak kartu tidak otomatis mengharuskan setiap pengunjung membaca semua kolom profil.
- Perbaikan yang mungkin dievaluasi kemudian adalah membatasi siapa yang dapat membaca data sensitif dan mempersempit kolom query sesuai peran, tanpa menghapus kolom atau merombak kartu akun.

### Google Drive
- Connect, callback, upload, gallery, dan image API memanggil `requireAdmin()`.
- Upload membatasi ukuran 8 MB, MIME type, dan signature file gambar.
- File gambar yang diunggah diberi permission Google Drive `anyone: reader`; ini tampaknya diperlukan agar gambar soal dapat tampil bagi siswa tanpa login Google. Artinya tautan/ID gambar bukan konten privat.
- Refresh token dienkripsi AES-256-GCM dan tabel token tidak memiliki policy RLS; akses dilakukan dari server dengan service-role client.
- Karena `requireAdmin()` bergantung pada `profiles.role`, kualitas gerbang admin tetap terkait temuan role di atas.

## 8. Advisor Supabase saat pemeriksaan

### Security
- ERROR: RLS disabled pada `announcements` dan `study_materials`.
- INFO: RLS enabled tanpa policy pada `google_drive_tokens` dan `practice_attempt_answers`.
- WARN: mutable search_path pada `generate_exam_token`, `handle_new_user`, dan `add_user_xp`.
- WARN: fungsi SECURITY DEFINER dapat di-execute oleh anon/authenticated; perlu evaluasi per fungsi, khususnya membedakan RPC latihan yang memang dipakai, trigger, dan event trigger.
- WARN: leaked-password protection Supabase Auth belum aktif.

### Performance
- WARN: indeks duplikat pada `answers`: `answers_session_question_unique` dan `unique_session_question`. Jangan menghapus salah satunya sebelum memastikan constraint dan pemakaian query.
 
## 9. Urutan tindak lanjut yang disarankan

Tidak ada perubahan yang dilakukan dalam audit ini. Urutan aman yang disarankan:

1. **Amankan endpoint `/api/admin/users` terlebih dahulu** dengan autentikasi server dan pemeriksaan hak admin yang tidak bergantung pada nilai role yang dapat diedit publik. Pastikan fitur edit, reset password, ubah role, hapus akun, impor, dan cetak kartu tetap berjalan.
2. **Amankan sumber role**: pendaftaran publik harus selalu menjadi student; perubahan role hanya melalui jalur admin server yang terverifikasi. Pertahankan signup dan fitur admin create user.
3. **Petakan akses tabel per fitur**: bedakan SELECT publik, operasi siswa untuk data miliknya, dan operasi admin. Jangan mengaktifkan RLS pada announcements/materials sebelum policy pengganti siap karena halaman beranda dan dashboard mengaksesnya langsung.
4. **Amankan sesi dan jawaban CBT** tanpa memutus autosave, resume, pause, submit, monitor, koreksi, ekspor, dan reset.
5. **Tinjau paparan kunci soal dan profil**; perubahan desain mungkin diperlukan bila kunci soal atau password kartu perlu tetap tidak terlihat oleh client umum.
6. **Batasi RPC XP dan hak EXECUTE** dengan tetap mempertahankan fungsi latihan yang dipakai.
7. Rapikan policy duplikat/grants, search_path fungsi, dan indeks setelah dampak terhadap alur aplikasi teruji.

Untuk setiap perubahan: branch terpisah dari `main` → Vercel Preview → QA pengguna → persetujuan eksplisit → merge. Tidak ada perubahan schema, scoring, RPC, trigger, API, reset ujian, atau login tanpa persetujuan khusus.

## 10. Keputusan dan batasan pemilik proyek

- Pendaftaran siswa harus tetap berjalan.
- Pengelolaan akun admin (buat, edit, reset password, ubah role, hapus) harus tetap berjalan.
- `plain_password` dan pencetakan kartu akun dipertahankan; jangan menghapus kolom atau mengubah alur ini tanpa persetujuan baru.
- Fokus perbaikan adalah menutup akses yang tidak diperlukan sambil menjaga fungsi dan tujuan awal aplikasi komunitas.
- Tidak ada perubahan database atau kode perilaku dalam tahap audit/inventaris ini.
