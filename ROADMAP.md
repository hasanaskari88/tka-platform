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
