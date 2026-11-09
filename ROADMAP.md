# ROADMAP TKA PLATFORM

Pembaruan audit: 9 November 2026  
Repository: `hasanaskari88/tka-platform`  
Branch kerja: `homepage-arcade-catalog`  
Production branch: `main`

## Prinsip dan batas aman

- Semua perubahan fitur dikerjakan di branch Preview dan diverifikasi sebelum rilis.
- `main`/Production tidak boleh diubah, di-merge, atau di-deploy tanpa persetujuan eksplisit.
- Preview dan Production saat ini memakai proyek Supabase yang sama. Perlakukan semua operasi tulis dari Preview sebagai operasi terhadap data Production.
- Jangan jalankan migration, ubah RLS/policy/grant/function/trigger, reset ujian, hapus data, atau menghubungkan ulang Google Drive tanpa persetujuan khusus dan rencana keselamatan.
- Jangan menguji OAuth Google Drive dari Preview selama tabel token masih berbagi database Production.
- Pertahankan Quiz dan Maze lama. Flashcard/Maze V2 tetap dibekukan; perubahan engine perlu ditinjau sebelum dipertahankan.

## Ringkasan audit repository dan deployment

- [x] Repository dan branch berhasil diperiksa secara read-only.
- [x] `main` berada pada commit `9979e3523e3d296d51cb1b650c97e1f9edebac27`.
- [x] `main` adalah default branch dan memiliki deployment Production READY.
- [x] Branch `homepage-arcade-catalog` berada pada commit `46eeaf40287848af795a6f841a3508bc96d3b0fc`.
- [x] Branch Preview 141 commit di depan `main`, tidak tertinggal; perubahan belum masuk Production.
- [x] Pull Request #1 (editor + Google Drive) telah merged ke `main` pada 8 November 2026.
- [ ] Pull Request #2 (homepage + Arcade Game Hub + katalog) masih OPEN; jangan merge sebelum seluruh pemeriksaan dan persetujuan.
- [x] Deployment Preview terbaru untuk commit `46eeaf4` berstatus READY; 33/33 halaman statis berhasil dibuat dan TypeScript selesai.
- [x] Build mencatat peringatan npm konfigurasi `cache-dir` dan install-script `unrs-resolver`.
- [ ] Build log juga mencatat `HANGING_PROMISE_REJECTION` pada route Google Drive connect, callback, dan images saat prerender. Build tetap READY, tetapi route perlu diperiksa lebih lanjut sebelum uji OAuth.
- [x] Ada branch cadangan editor dan branch dokumentasi audit keamanan.

## Tahap 1 — Audit dan rekonsiliasi kode

- [x] Inventaris branch dan commit GitHub.
- [x] Bandingkan Preview dengan Production: Preview ahead 141 commits, behind 0.
- [x] Identifikasi PR yang sudah merged dan yang masih terbuka.
- [ ] Tinjau isi 141 commits/22 file PR #2 per kelompok fitur dan dampaknya.
- [ ] Tinjau perubahan pada `FlashcardEngine` dan `MazeGameEngine` terhadap keputusan membekukan V2.
- [ ] Periksa seluruh perubahan lokal Codespaces yang belum masuk GitHub; status lokal tidak dapat dipastikan dari GitHub saja.
- [ ] Buat ringkasan file yang aman dipertahankan, perlu diperbaiki, atau perlu dipisahkan.
- [ ] Jangan melakukan reset, rebase, force-push, atau penghapusan branch saat audit.

## Tahap 2 — Keamanan aplikasi dan database (prioritas tertinggi)

Dokumen audit statis tersedia pada branch `security-audit-inventory` di `docs/PROJECT-INVENTORY-SECURITY-AUDIT.md`. Audit tersebut tidak mengubah kode maupun database.

Temuan penting yang harus ditangani berurutan:

1. **Sangat tinggi — endpoint admin pengguna.** `app/api/admin/users/route.ts` dilaporkan menerima PUT/DELETE tanpa pemeriksaan admin server-side, padahal memakai service-role bila tersedia.
2. **Sangat tinggi — sumber role.** Policy profil publik dan metadata signup berpotensi membuka jalur perubahan role; role admin tidak boleh dapat diberikan oleh signup publik.
3. **Tinggi — data CBT.** Policy permissive pada `questions`, `exam_sessions`, dan `answers` berpotensi membuka soal, kunci, jawaban, dan sesi siswa.
4. **Tinggi — XP.** RPC `add_user_xp` menerima target user ID dan perlu dibatasi agar pengguna tidak dapat mengubah XP milik pengguna lain.
5. **Tinggi — profil.** Query profil luas dapat membuka kolom sensitif seperti `plain_password`; kebutuhan cetak kartu akun harus tetap dipertahankan dengan akses yang lebih tepat.
6. **Tinggi — RLS OFF.** `announcements` dan `study_materials` memiliki RLS OFF. Policy yang ada tidak membatasi akses selama RLS OFF.
7. **Menengah — grants, policy duplikat, search_path, leaked-password protection, dan indeks duplikat.** Tinjau satu per satu setelah alur utama aman.

Urutan implementasi yang direkomendasikan:
- Amankan endpoint admin users dan verifikasi admin di server.
- Pastikan signup publik selalu menghasilkan role student; perubahan role hanya lewat jalur admin tepercaya.
- Petakan akses publik, siswa pemilik data, dan admin untuk setiap tabel.
- Amankan sesi/jawaban CBT tanpa merusak autosave, resume, submit, monitor, koreksi, ekspor, dan reset.
- Batasi RPC XP sesuai pengguna yang sedang login.
- Tinjau akses profil, grants, policy, function search_path, dan advisor lainnya.

**Tidak ada perbaikan keamanan yang boleh diterapkan langsung ke database bersama.** Siapkan rancangan, review SQL, dan pengujian di database terisolasi terlebih dahulu. RLS OFF tidak boleh diubah sebelum policy pengganti dan dampak fitur diverifikasi.

## Tahap 3 — Database dan migration yang masih staged

Ditemukan tiga migration pada branch Preview:
- `20261108000100_practice_attempt_progress.sql`
- `20261108000200_school_document_settings.sql`
- `20261108000300_teacher_signatories.sql`

File migration menyatakan staged / hanya diterapkan setelah review dan pada database development terisolasi. Belum ada persetujuan untuk menjalankannya. Verifikasi keberadaan tabel/RPC di Supabase sebelum menganggap fitur yang bergantung padanya siap.

- [ ] Cocokkan migration dengan kode pemanggil dan skema aktual.
- [ ] Review SQL dan kebijakan RLS masing-masing migration.
- [ ] Siapkan jalur uji database tanpa biaya tambahan dan tanpa menyentuh data Production.
- [ ] Jalankan migration hanya setelah persetujuan eksplisit.

## Tahap 4 — Preview dan dashboard

- [x] Preview deployment READY.
- [x] Login admin, dashboard, daftar ujian, materi belajar, manajemen pengguna, halaman latihan, pengaturan dokumen, dan pengelola soal pernah dikonfirmasi dapat dibuka.
- [ ] QA ulang pada deployment Preview terbaru.
- [ ] Uji tampilan desktop/mobile, navigasi, pencarian, filter, pagination, dan kartu misi.
- [ ] Uji fungsi tulis hanya jika memakai data uji yang aman dan tidak memengaruhi data Production.

## Tahap 5 — Homepage, Arcade Game Hub, dan katalog

- [x] Implementasi berada pada PR #2 dan Preview.
- [ ] QA visual desktop/mobile.
- [ ] QA pemilihan misi dan tautan tujuan.
- [ ] QA pencarian, filter, urutan, dan pagination katalog.
- [ ] Review perubahan game engine agar tidak melanggar keputusan membekukan Flashcard/Maze V2.
- [ ] Persetujuan pengguna sebelum merge PR #2.

## Tahap 6 — Bank Soal, Bulk Upload, dan WYSIWYG

- [x] Editor Tiptap, toolbar, dialog rumus, tabel, gambar, crop/resize, font, dan MathRenderer tersedia.
- [x] Font Noto Naskh Arabic dan Noto Sans Javanese telah diuji tampil.
- [x] PR #1 editor telah masuk `main`; pengguna sebelumnya mengonfirmasi alur soal, tampilan siswa, koreksi manual, ringkasan, cetak, dan ekspor berjalan normal.
- [ ] QA pecahan, pangkat, akar, simbol, gambar pada soal/pilihan/pembahasan.
- [ ] QA Arab RTL dan harakat serta Aksara Jawa pada editor dan hasil cetak.
- [ ] QA paste Word yang dipilih pengguna; paste satu dokumen Word panjang sebelumnya tidak diuji.
- [ ] QA Bulk Upload dan kompatibilitas soal lama.
- [ ] Catat keterbatasan ekspor kunci Excel untuk soal matriks yang sebelumnya belum menjadi prioritas.

## Tahap 7 — Hasil ujian dan penilaian

- [ ] Uji nilai pilihan ganda, pilihan ganda kompleks, dan benar-salah matriks.
- [ ] Uji koreksi manual essay/uraian, nilai bonus, dan override.
- [ ] Periksa filter benar/salah yang sebelumnya pernah salah mengelompokkan item.
- [ ] Uji rekap, cetak, dan ekspor.
- [ ] Pastikan perubahan tidak mengubah formula scoring tanpa persetujuan.

## Tahap 8 — Google Drive (DITUNDA)

Alasan: Preview dan Production berbagi Supabase yang sama; OAuth Preview dapat menimpa baris token Production. Supabase Branch berbayar dan telah ditolak.

- [x] Endpoint OAuth, upload, galeri, dan image tersedia.
- [x] Tabel token menggunakan RLS ON dan akses server service-role.
- [ ] Perbaiki dan verifikasi warning prerender route Google Drive.
- [ ] Cari isolasi tanpa biaya tambahan.
- [ ] Uji OAuth, upload, galeri, dan akses gambar setelah isolasi aman tersedia.

**Larangan:** jangan klik Connect dari Preview atau menukar token Google Drive selama database masih berbagi dengan Production.

## Tahap 9 — QA menyeluruh dan rilis

- [ ] QA alur siswa dan admin.
- [ ] QA CBT, latihan, materi, profil, akun, cetak, dan ekspor.
- [ ] QA hak akses dan keamanan.
- [ ] Backup serta konfigurasi environment diperiksa.
- [ ] Semua temuan penting ditutup atau diterima secara sadar.
- [ ] Review PR dan persetujuan eksplisit.
- [ ] Merge ke `main` dan deployment Production hanya setelah persetujuan.

## Daftar persetujuan yang diperlukan

Persetujuan ini dikumpulkan sekaligus agar pekerjaan tidak berhenti berulang kali. Menyetujui rencana tidak berarti menjalankan tindakan berisiko tanpa tahap review dan laporan.

A. **Dokumentasi roadmap di branch Preview:** boleh membuat/memperbarui `ROADMAP.md` pada `homepage-arcade-catalog`. (Tidak mengubah Production atau database.)

B. **Perbaikan keamanan kode:** boleh membuat branch khusus, memperbaiki endpoint admin, signup/role, query profil, dan RPC XP, lalu membangun Preview. Tidak termasuk menjalankan SQL ke Supabase.

C. **Perubahan keamanan database:** belum disetujui. Memerlukan rencana SQL, dampak per fitur, dan persetujuan terpisah sebelum eksekusi pada database.

D. **Review dan penyesuaian migration staged:** boleh melakukan review statis dan menyiapkan rekomendasi; menjalankan migration memerlukan persetujuan terpisah dan database terisolasi.

E. **Perubahan Flashcard/Maze engine:** perlu keputusan apakah perubahan pada engine di PR #2 dipertahankan atau dikembalikan agar sesuai keputusan membekukan V2.

F. **Merge PR #2 / perubahan Production:** belum disetujui; wajib konfirmasi eksplisit setelah QA.

G. **Google Drive OAuth Preview:** tetap ditunda sampai isolasi aman tanpa biaya tambahan tersedia.

## Catatan operasional

- Setiap hasil audit harus mencatat tanggal, branch, commit, bukti verifikasi, risiko, dan tindakan berikutnya.
- Jangan menyatakan fitur selesai hanya karena build sukses atau halaman dapat dibuka; bedakan build, smoke test, dan QA fungsi.
- Jangan menganggap migration sudah diterapkan hanya karena file SQL ada di GitHub.


## Hasil pemeriksaan lanjutan — 9 November 2026

### Temuan yang diverifikasi langsung pada Preview

- [x] `app/api/admin/users/route.ts` pada Preview masih membuat client menggunakan `SUPABASE_SERVICE_ROLE_KEY` (dengan fallback anon) dan handler PUT/DELETE tidak memanggil `requireAdmin()`. Ini menguatkan temuan prioritas sangat tinggi: endpoint perlu ditutup sebelum fitur pengelolaan akun dianggap aman.
- [x] Form signup pada halaman login yang diperiksa hanya mengirim nama, username, dan kode kelas; tidak mengirim role. Namun trigger database tetap perlu diperiksa karena pemanggil Auth lain dapat mengirim metadata tambahan.
- [x] `requireAdmin()` dan layout admin memeriksa `profiles.role`; kekuatan pemeriksaan tersebut bergantung pada keamanan sumber role di database.
- [x] `FlashcardEngine` dan `MazeGameEngine` pada Preview menggunakan RPC `start_practice_attempt` / `finish_practice_attempt`; perubahan engine di PR #2 perlu ditinjau agar konsisten dengan keputusan membekukan V2.
- [x] Branch `main` dan Preview tidak memiliki branch protection yang aktif menurut metadata GitHub. Pertimbangkan proteksi `main` setelah persetujuan pemilik proyek.
- [x] Dokumen audit keamanan berada di branch `security-audit-inventory`; isinya adalah audit statis atas commit `main` tanggal 8 November dan belum mengubah kode/database.
- [x] Repository Preview tidak memiliki file roadmap sebelumnya; dokumen ini dibuat sebagai catatan terpusat.

### Status database dan migration

- [x] Tiga file migration ditemukan di Preview. Isi migration menyatakan staged/development-only dan tidak otomatis dijalankan oleh Vercel.
- [ ] Keberadaan tabel/RPC baru di database bersama harus diverifikasi sebelum halaman yang bergantung padanya dianggap berfungsi penuh.
- [ ] Belum ada migration yang dijalankan dalam rangka audit ini.

### Status deployment setelah pencatatan roadmap

- [x] Commit dokumentasi roadmap: `a9ced9498fdb7b8fe86fbc062c3abeedb7c9f425`.
- [ ] Deployment Preview otomatis untuk commit dokumentasi tersebut masih BUILDING saat pemeriksaan terakhir; tunggu READY dan cek build.
- [x] Deployment Preview sebelumnya untuk commit `46eeaf4` berstatus READY.
- [x] Deployment Production terakhir yang tercatat berstatus READY pada commit `9979e352`.

### Konfirmasi yang diperlukan sebelum pekerjaan berisiko

1. **Perbaikan keamanan kode (disarankan segera):** izinkan pembuatan branch keamanan terpisah dan perbaikan endpoint admin users, perlindungan signup/role, query profil sensitif, serta RPC XP. Batasnya: kode saja, tidak menjalankan SQL ke Supabase dan tidak merge ke `main`.
2. **Perubahan database/RLS:** belum disetujui. Sebelum eksekusi, berikan rancangan SQL lengkap, matriks akses per peran, dampak fitur, rencana rollback, dan metode uji database terisolasi.
3. **Migration fitur:** izinkan review dan persiapan saja; penerapan membutuhkan persetujuan terpisah setelah database terisolasi tersedia.
4. **Flashcard/Maze:** tentukan apakah perubahan pada engine yang ada di PR #2 dipertahankan atau dikembalikan agar sesuai status dibekukan.
5. **Merge PR #2 / Production:** belum disetujui. Perlu QA dan persetujuan eksplisit setelah seluruh temuan ditangani.
6. **Google Drive Preview OAuth:** tetap ditunda; jangan meminta konfirmasi ulang sampai ada opsi isolasi aman tanpa biaya tambahan.

### Batas audit ini

Pemeriksaan GitHub, isi file, riwayat PR, deployment, dan build log dilakukan secara read-only. Satu-satunya perubahan yang dibuat adalah penambahan file `ROADMAP.md` pada branch `homepage-arcade-catalog`. Tidak ada perubahan `main`, database, data siswa, token Google Drive, environment variable, atau deployment Production.


## Persetujuan pemilik proyek dan progres lanjutan — 9 November 2026

### Keputusan yang telah dikonfirmasi

- [x] K1 — Perbaikan keamanan kode disetujui, terbatas pada branch khusus, tanpa SQL dan tanpa merge Production.
- [x] K2 — Flashcard/Maze tetap dibekukan; perubahan yang sudah ada harus diaudit dahulu.
- [x] K3 — SQL/RLS hanya direview dan disiapkan; tidak boleh dieksekusi.
- [x] K4 — PR #2 tetap terbuka; tidak boleh merge.
- [x] K5 — Google Drive Preview OAuth tetap ditunda.

### Branch keamanan

- [x] Dibuat branch `security-hardening-admin-api` dari Preview commit `b64a9122`.
- [x] Ditambahkan helper `lib/supabase/trusted-admin.ts`.
- [x] Helper memverifikasi sesi server dengan `auth.getUser()`, lalu memeriksa UUID terhadap allowlist server-only `ADMIN_USER_IDS`.
- [x] Otorisasi endpoint tidak lagi bergantung pada `profiles.role` yang sedang diaudit.
- [x] Jika allowlist kosong, akses admin API ditolak (fail closed).
- [x] Service-role client hanya dibuat setelah admin lolos verifikasi; fallback ke anon key dihapus.
- [x] PUT/DELETE API diberi pemeriksaan same-origin, validasi input, pencegahan self-delete, dan perlindungan akun allowlist.
- [x] Ditambahkan POST server-side untuk pembuatan akun; halaman UI admin belum diintegrasikan ke POST tersebut.
- [x] Password dan `plain_password` disiapkan untuk diperbarui melalui server endpoint, bukan lewat browser, tetapi penghapusan jalur client-side pada halaman admin belum selesai.
- [x] Foreign key `profiles.id_fkey` diverifikasi memiliki ON DELETE CASCADE.
- [ ] Konfigurasi Vercel `ADMIN_USER_IDS` belum dibuat. Jangan memasukkan semua UUID dengan `profiles.role='admin'` secara otomatis; daftar itu harus diverifikasi pemilik proyek karena sumber role saat ini belum aman.
- [ ] Integrasikan `app/admin/users/page.tsx` ke POST dan hapus update `plain_password` dari browser. Percobaan edit file UI melalui GitHub ditolak pemeriksaan keselamatan tool; file UI belum berubah.
- [ ] Audit dan pindahkan bulk import akun ke endpoint server.
- [ ] Verifikasi helper dan route pada build terbaru.
- [ ] Uji akses anonymous, student, UUID non-allowlist, dan admin allowlist setelah allowlist diverifikasi dan dikonfigurasi.
- [ ] Audit seluruh route admin yang masih memakai `requireAdmin()` berbasis `profiles.role`.

### Review Flashcard dan Maze (K2)

- [x] Perubahan PR #2 pada `FlashcardEngine.tsx` dan `MazeGameEngine.tsx` dibandingkan dengan `main`.
- [x] Perubahan menambahkan penyimpanan progres, pemulihan sesi, dan tombol Simpan & Keluar; bukan perubahan pada file `MazeGameV2Engine.tsx`.
- [x] Flashcard kini memanggil `start_practice_attempt`, `save_practice_attempt_progress`, dan `finish_practice_attempt`.
- [x] Maze kini memanggil `save_practice_attempt_progress` dan menggunakan RPC attempt.
- [ ] Migration yang menyediakan `save_practice_attempt_progress` belum diverifikasi pada database dan belum dijalankan.
- [ ] Uji efek terhadap XP, progres lama, sesi yang ditinggalkan, penyelesaian, dan pemulihan sebelum perubahan engine dipertahankan.
- [ ] Jangan mengubah atau mengembalikan engine sampai audit dan keputusan berikutnya selesai.

### Review database (K3)

- [x] Tidak ada SQL yang dieksekusi dalam pekerjaan ini.
- [x] Dibuat dokumen `docs/SECURITY-HARDENING-REVIEW.md` berisi rancangan trigger signup yang selalu menetapkan role student, catatan policy/grants, dan rencana pengujian.
- [ ] Review fungsi trigger aktual dan seluruh kolom wajib sebelum rancangan menjadi migration.
- [ ] Buat matriks policy untuk profiles, exams, questions, exam_sessions, answers, announcements, study_materials, practice_attempts, dan tabel terkait.
- [ ] Siapkan rencana rollback dan database uji terisolasi sebelum meminta persetujuan eksekusi.

### Build Preview keamanan

- [x] Build awal menemukan masalah TypeScript pada tipe client Supabase di helper; masalah tipe telah diperbaiki pada commit berikutnya.
- [ ] Deployment untuk commit `6221135` sedang BUILDING pada pemeriksaan terakhir.
- [ ] Deployment untuk commit dokumentasi terakhir `58a6912` masih QUEUED pada pemeriksaan terakhir.
- [ ] Deployment terbaru harus mencapai READY sebelum QA route.
- [ ] Build READY bukan bukti keamanan runtime; perlu pengujian role dan endpoint setelah konfigurasi allowlist tersedia.

### Catatan batas perubahan

Semua perubahan kode dan dokumentasi di atas berada pada `security-hardening-admin-api`. Tidak ada perubahan pada `main`, PR #2, Supabase schema/data/policy/function/trigger, Vercel environment variables, token Google Drive, atau Production deployment.


### Verifikasi build dan catatan akhir sesi — 9 November 2026

- [x] Deployment untuk commit kode `6221135` berstatus READY.
- [x] Build menyelesaikan kompilasi Next.js dan TypeScript tanpa error.
- [x] Route `/api/admin/users` muncul dalam daftar route hasil build.
- [x] Build masih menampilkan warning lama pada route Google Drive callback saat prerender; warning tersebut tidak berasal dari perubahan keamanan ini dan belum ditangani karena OAuth Preview tetap ditunda.
- [x] Build pertama pada commit helper awal gagal karena tipe generik Supabase; perbaikannya dibuat dan build commit berikutnya berhasil.
- [ ] Commit dokumentasi setelah `6221135` masih perlu deployment/build terbaru; tidak ada perubahan kode setelah commit yang sudah READY.
- [ ] Belum ada pengujian runtime authenticated/unauthenticated terhadap endpoint.
- [ ] Endpoint PUT/POST/DELETE akan menolak admin API sampai `ADMIN_USER_IDS` dikonfigurasi. Ini disengaja (fail closed), bukan konfigurasi yang boleh dilewati dengan fallback `profiles.role`.
- [ ] Halaman admin users belum diubah; fungsi create user masih memakai client-side signup dan update password kartu akun masih dilakukan dari browser. Jadi perbaikan belum lengkap dan belum siap digunakan untuk alur pengelolaan akun.
- [ ] Sebelum uji admin: pemilik proyek perlu memverifikasi daftar akun admin tepercaya. Jangan mengambil semua baris `profiles.role='admin'` sebagai allowlist secara otomatis.
- [x] Kode, helper, dokumen review, dan roadmap tersimpan pada branch `security-hardening-admin-api`.
- [x] Tidak ada SQL, perubahan data, environment variable, merge PR, atau deployment Production yang dilakukan.


### Perluasan pemeriksaan admin server — 9 November 2026

- [x] `lib/supabase/admin.ts` kini memakai `requireTrustedAdmin()`.
- [x] Semua route Google Drive yang memakai `requireAdmin()` ikut memakai allowlist admin tepercaya.
- [x] Tidak ada pengujian OAuth atau operasi Google Drive yang dilakukan; K5 tetap dipatuhi.
- [x] Pemeriksaan build untuk commit `6006bf6` telah melewati kompilasi dan TypeScript; proses page-data/build lanjutan sedang berjalan saat pencatatan.
- [ ] Build untuk commit berikutnya `f39f4e6` dan dokumentasi terbaru perlu dipastikan READY.
- [ ] Integrasi UI admin users ke POST server-side dan penghapusan update password dari browser masih menjadi pekerjaan terbuka.
- [ ] Konfigurasi allowlist admin masih menunggu verifikasi pemilik proyek.


### Status verifikasi akhir pekerjaan kode — 9 November 2026

- [x] Deployment Preview untuk commit kode `f39f4e6` mencapai READY.
- [x] Next.js compile dan TypeScript selesai; route admin users dan route server Google Drive terdaftar dalam build.
- [x] Helper trusted-admin kini menggunakan tipe `User` Supabase dan mengembalikan sesi server terverifikasi untuk kompatibilitas helper lama.
- [x] `lib/supabase/admin.ts` telah dialihkan ke allowlist tepercaya, sehingga route Google Drive server tidak lagi memakai pemeriksaan role database sebagai otorisasi.
- [x] Terdapat 7 baris profil yang saat query read-only tercatat ber-role admin. Daftar itu belum dapat dianggap sebagai daftar tepercaya karena temuan policy role; tidak ada UUID yang dimasukkan otomatis ke allowlist.
- [ ] Konfirmasi pemilik proyek diperlukan untuk menentukan username akun yang sah menjadi admin tepercaya sebelum konfigurasi `ADMIN_USER_IDS`.
- [ ] Build dokumen terbaru setelah commit `f39f4e6` masih otomatis diproses Vercel; kode tidak berubah setelah build READY.
- [ ] Belum ada runtime QA terhadap operasi pembuatan/edit/hapus akun karena UI belum terintegrasi dan allowlist belum diisi.
- [ ] Pekerjaan ini belum boleh dianggap sebagai penutupan penuh temuan keamanan database. RLS/policy dan trigger signup masih menunggu review serta persetujuan terpisah.


---

## Pembaruan operasional terbaru — 9 November 2026

Bagian ini menggantikan catatan branch/deployment yang lebih lama jika terdapat perbedaan.

### Jalur Git yang berlaku

- [x] Satu-satunya branch pengembangan aktif: `homepage-arcade-catalog`.
- [x] Production tetap pada `main`.
- [x] Seluruh perubahan keamanan dan cetak kartu telah berada di branch pengembangan tunggal.
- [x] Commit kode yang diperiksa: `703d3fd4b262cc0672d887063e9c7dfedfad9c54`.
- [x] Branch `security-hardening-admin-api` sekarang identik dengan branch pengembangan tunggal; bukan jalur kerja terpisah.
- [x] Branch `security-print-cards-server` tertinggal dua commit dan tidak memiliki perubahan unik; jangan lanjutkan pekerjaan di sana.
- [ ] Jangan membuat branch baru, merge, cherry-pick, reset, force-push, atau menghapus branch tanpa alasan dan pemeriksaan yang jelas.

### Deployment Preview terbaru

- [x] Deployment ID: `dpl_D346b4BGuByLEWRoL2SmGAe7mEs1`.
- [x] Commit: `703d3fd4b262cc0672d887063e9c7dfedfad9c54`.
- [x] Status: READY.
- [x] Alias tetap: https://grisan-git-homepage-arcade-catalog-heins14.vercel.app/
- [x] Build diperbaiki dengan menghapus `export const dynamic = 'force-dynamic'` dari `app/api/admin/users/print-cards/route.ts`; konfigurasi itu tidak kompatibel dengan `cacheComponents`.

### Keamanan cetak kartu

- [x] Daftar profil di browser tidak lagi meminta `plain_password`.
- [x] Data kartu diambil melalui endpoint server setelah admin lolos allowlist.
- [x] Username dan password tetap dicetak sesuai kebutuhan; `plain_password` masih plaintext di database.
- [ ] QA cetak satu kartu dan batch pada Preview.
- [ ] QA penolakan anonim/student untuk endpoint cetak.
- [ ] QA kondisi password kosong dan pembersihan state setelah print.

### Batas pekerjaan admin users

- [x] PUT/DELETE API telah menggunakan trusted admin server-side.
- [x] POST server-side tersedia.
- [ ] Form create user tunggal masih memakai browser-side `auth.signUp()`; integrasikan ke POST.
- [ ] Bulk import masih melakukan insert langsung dari browser; pindahkan ke endpoint server.
- [ ] Jangan uji operasi tulis dengan data sekolah asli di Preview karena database Preview dan Production sama.

### Pengurangan build Vercel

- [x] Project setting Ignored Build Step diatur agar commit yang hanya mengubah Markdown atau `docs/` tidak menjalankan build.
- [x] Perubahan kode/dependency/konfigurasi tetap membangun Preview.
- [x] Preview tidak dinonaktifkan; satu Preview branch tetap dipakai untuk QA.
- [ ] Periksa hasil Ignored Build Step pada push dokumentasi pertama sebelum menganggap optimasi terverifikasi.

### Keselamatan tetap berlaku

- Tidak ada perubahan pada `main` atau deployment Production.
- Tidak ada SQL, migration, perubahan schema/RLS/policy/grant/function/trigger, atau data Supabase yang dilakukan.
- Google Drive OAuth Preview tetap ditunda.
- Merge PR #2 tetap menunggu QA dan persetujuan eksplisit.
