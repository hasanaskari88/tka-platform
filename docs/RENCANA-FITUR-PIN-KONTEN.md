# Rancangan Induk: Pusat Pengaturan Beranda

Status: **Implementasi kode disiapkan — menunggu pemeriksaan build dan penerapan migration**
Tanggal audit: 23 November 2026
Repository: `hasanaskari88/tka-platform`
Target kerja: branch `main` saja; tidak membuat branch/PR dan tidak menggunakan Preview. Perubahan fitur disiapkan dalam satu commit.
Tujuan rilis: menggabungkan perubahan aplikasi dalam satu rangkaian commit agar deployment produksi tidak berulang-ulang.

> Dokumen ini menggantikan rancangan dua-tab sebelumnya. Belum ada kode aplikasi, migration, perubahan database, atau deployment yang dilakukan sebagai bagian dari rancangan ini.

---

## 1. Tujuan dan prinsip yang tidak boleh dilanggar

Membangun satu pusat admin untuk mengatur prioritas konten yang tampil pada beranda, dengan empat permukaan yang terpisah:

1. **Ujian (CBT)** — daftar ujian resmi di halaman depan.
2. **Materi** — daftar materi belajar di halaman depan.
3. **Practice (Latihan)** — daftar aktivitas di `/practice`.
4. **Pengumuman** — daftar pengumuman sekolah di halaman depan.

Fitur prioritas/pin hanya mengatur **urutan tampilan**. Fitur ini tidak boleh mengubah:

- konfigurasi ujian, token, jadwal, durasi, shuffle, hasil, pembahasan, atau target mode;
- mesin pengerjaan CBT, sesi ujian, jawaban, autosave, timer, dan penilaian;
- mesin Practice, jenis aktivitas, percobaan, jawaban, progres, XP, streak, badge, dan penyelesaian aktivitas;
- isi materi, status publikasi materi, file, atau akses;
- status aktif, isi, dan hak akses pengumuman;
- hak akses siswa/guru/admin yang sudah berlaku.

**Prinsip fail-open untuk tampilan:** jika tabel prioritas belum tersedia, gagal dibaca, atau berisi data tidak valid, halaman harus tetap menampilkan konten menggunakan urutan lama. Kegagalan fitur pin tidak boleh membuat halaman depan atau Practice gagal dimuat.

## 2. Audit kode dan skema yang telah diperiksa

Audit dilakukan terhadap file pada branch `main` dan struktur tabel Supabase yang tersedia saat pemeriksaan.

### 2.1 Halaman depan — Ujian, Materi, Pengumuman

File utama: `app/page.tsx`.

Query awal yang ditemukan:

- `exams`: mengambil data yang `is_published = true`, urutan `created_at DESC`.
- `announcements`: mengambil `is_active = true`, urutan `created_at DESC`.
- `study_materials`: mengambil data materi dan author; query saat ini mengurutkan `created_at DESC`.

Setelah pemuatan, halaman depan memiliki filter/urutan dan pagination materi. Materi menggunakan `MATERIALS_PER_PAGE = 3`. Ada beberapa bagian UI yang menautkan pengguna ke `/practice`.

Implikasi:
- Pin untuk daftar ujian harus tetap mempertahankan filter target mode yang sekarang diterapkan setelah data diambil.
- Pin materi harus diterapkan pada daftar hasil filter sebelum pemotongan halaman (pagination).
- Pengumuman saat ini hanya menampilkan `is_active = true`; pin tidak boleh membuat pengumuman nonaktif tampil.
- Halaman depan juga memiliki banyak bagian lain (profil, leaderboard, navigasi, dan area promosi Practice). Perubahan harus terlokalisasi pada pemuatan dan pemrosesan daftar konten, bukan merombak keseluruhan halaman.

### 2.2 CBT dan model data ujian

File pengerjaan: `app/exam/[id]/page.tsx`.
Pengelolaan: `app/admin/bank-soal/page.tsx`.

Tabel `exams` digunakan bersama oleh CBT dan Practice. Kolom penting yang terverifikasi:

- `id`, `title`, `description`, `subtest`, `duration_minutes`;
- `is_published`, `created_at`, `token`, `start_time`, `end_time`;
- `shuffle_questions`, `shuffle_options`, `show_results`, `show_explanations`;
- `target_mode` (default `BOTH`), `activity_type` (default `QUIZ`);
- `token_code`, `created_by`, `author_display_name`.

Nilai `target_mode` yang dipakai aplikasi:
- `CBT_ONLY`
- `PRACTICE_ONLY`
- `BOTH`

CBT tidak boleh menerima paket `PRACTICE_ONLY`. Logika ini harus tetap persis seperti filter yang sudah ada. Jangan mengubah target mode untuk memudahkan pin.

Pengerjaan CBT memiliki alur sesi dan jawaban tersendiri. File pengerjaan CBT tidak masuk daftar file implementasi fitur pin.


### 2.3 Practice

Halaman daftar: `app/practice/page.tsx`.
Pengelolaan: `app/admin/practice/page.tsx`.
Pengerjaan: `app/practice/[id]/page.tsx`.

Practice membaca tabel `exams`, tetapi hanya memasukkan paket yang:
- `is_published = true`;
- `show_results !== false`;
- `target_mode` kosong/default yang kompatibel, `PRACTICE_ONLY`, atau `BOTH`.

Practice mengenali `activity_type` seperti `QUIZ`, `MAZE_GAME`, `MAZE_GAME_V2`, `FLASHCARD`, serta alias yang dinormalisasi oleh kode.

Filter daftar saat ini:
- pencarian;
- tipe aktivitas;
- filter subjek yang hanya muncul untuk tipe Quiz;
- urutan terbaru, terlama, atau nama A–Z.

**Temuan tampilan yang mengunci desain:** daftar Practice saat ini adalah grid kartu aktivitas. `subtest` ditampilkan sebagai label pada kartu, bukan sebagai kelompok/section. Karena itu rilis pertama hanya mendukung pin aktivitas individual. Tidak ada pin kategori Practice dan tidak dibuat pengelompokan baru. Pengurutan prioritas hanya mengubah posisi kartu di grid setelah filter lama diterapkan.

Riwayat, statistik, progres, dan perhitungan badge tetap diproses dengan kode yang ada. Fitur pin tidak boleh mengubah query atau perhitungan tersebut.

### 2.4 Materi

Pengelolaan: `app/admin/konten/page.tsx` (tab materi dan pengumuman).
Tabel `study_materials` memiliki kolom terverifikasi:
- `id`, `title`, `description`, `file_url`, `subject`;
- `created_at`, `created_by`, `author_display_name`, `content_html`;
- `status`, `curriculum_track`, `grade`, `topic_id`, `updated_at`.

Kategori materi yang nyata adalah `study_materials.subject`. Pengelolaan materi saat ini mengambil nama dari `subtests.name` untuk pilihan subject, tetapi `study_materials.subject` sendiri berupa teks, bukan foreign key. Jangan menganggap `subject` mempunyai relasi FK ke `subtests.id`.

Halaman depan harus mempertahankan aturan materi yang berlaku sekarang. Dalam implementasi, status materi yang boleh tampil perlu dipastikan dari keseluruhan kode halaman dan RLS sebelum menambahkan kondisi baru; jangan menebak nilai status.

### 2.5 Pengumuman

Tabel `announcements` memiliki kolom:
- `id` (UUID), `title`, `content`, `category`;
- `is_active`, `created_at`.

Halaman depan mengambil hanya `is_active = true`, terbaru lebih dahulu. Pengelolaan pengumuman berada di tab announcement pada `app/admin/konten/page.tsx`; pengumuman juga memiliki pengelolaan di halaman Bank Soal lama. Saat implementasi, tentukan satu jalur UI utama dan jangan membuat dua sistem pin yang berbeda.

Keputusan:
- Pengumuman menjadi tab keempat di pusat Pengaturan Beranda.
- Tahap pertama hanya mendukung pin item pengumuman dan urutan manual; tidak ada pin kategori pengumuman karena belum ada kebutuhan kategori yang stabil.
- `is_active = false` selalu mengalahkan pin. Pengumuman nonaktif tidak boleh muncul di beranda.
- Pin tidak mengubah isi, kategori, atau status aktif pengumuman.

---


## 3. Rancangan UX pusat admin

Menu baru: **Admin → Pengaturan Beranda**.

Halaman memiliki empat tab:

| Tab | Konten yang dapat diprioritaskan | Cakupan |
|---|---|---|
| Ujian (CBT) | Paket ujian individual | Daftar ujian di beranda |
| Materi | Materi individual | Daftar materi di beranda |
| Practice | Aktivitas individual | Grid aktivitas di `/practice` |
| Pengumuman | Pengumuman individual | Daftar pengumuman di beranda |

Setiap tab menyediakan:
1. Area **Sedang diprioritaskan**.
2. Area **Konten lainnya** dengan pencarian.
3. Tombol pin/lepas pin.
4. Tombol naik/turun untuk mengatur urutan secara aksesibel.
5. Tombol **Simpan perubahan** untuk menyimpan urutan sekaligus.
6. Status loading, kosong, gagal memuat, dan berhasil menyimpan.
7. Penanda untuk konten yang sudah tidak memenuhi syarat tampil, agar admin dapat melepas pin yang sudah tidak berlaku.

**Rilis pertama hanya mendukung pin item individual.** Tidak ada pin kategori/subtes/subject. Ini disengaja agar fitur hanya mengatur urutan item dan tidak mengubah struktur pengelompokan atau filter yang telah dikenal pengguna.

Batas UX:
- Tidak ada batas jumlah pin arbitrer pada versi pertama.
- Pencarian harus dapat menemukan item yang sudah dipin.
- Item yang tidak lagi eligible tetap dapat dikenali admin untuk dilepas pin, tetapi tidak dikirim ke tampilan publik.
- Tidak ada drag-and-drop pada versi pertama; gunakan tombol naik/turun.
- Tidak ada pintasan di halaman Bank Soal, Practice, atau Konten pada rilis pertama. Pusat Pengaturan Beranda menjadi satu-satunya pengelola pin.
- Menu pusat mengikuti proteksi halaman admin yang ada, dan seluruh operasi tulis tetap diverifikasi ulang oleh server.


## 4. Aturan tampilan dan prioritas

Setiap surface mempunyai urutan pin yang independen. Satu record ujian `BOTH` dapat diprioritaskan secara terpisah untuk CBT dan Practice karena keduanya memiliki tampilan dan kebutuhan yang berbeda.

### 4.1 Ujian (CBT)

1. Jalankan filter kelayakan CBT yang sekarang: ujian harus terpublikasi dan target mode bukan `PRACTICE_ONLY`.
2. Terapkan pencarian, filter subtes, filter token, dan filter lain sesuai kode sekarang.
3. Pada mode **Prioritas**, tampilkan paket yang dipin dalam section **Ujian Prioritas** di atas kelompok subtes, mengikuti urutan pin.
4. Paket prioritas tidak boleh tampil dua kali di kelompok subtes reguler.
5. Ujian yang tidak dipin tetap mengikuti urutan lama.
6. Ketika pengguna memilih sort eksplisit selain Prioritas, pilihan pengguna dihormati dan pin tidak memaksakan urutan.
7. Filter subtes dan pencarian tetap membatasi hasil; pin tidak boleh membatalkan filter.

Section Ujian Prioritas hanya merupakan penyajian kartu yang sama di posisi lebih awal. Tidak ada perubahan ke paket, token, jadwal, konfigurasi, atau route pengerjaan CBT.

### 4.2 Materi

1. Pertahankan aturan visibilitas materi saat ini. Berdasarkan RLS aktif, materi publik yang dapat dibaca harus berstatus `published`.
2. Terapkan filter subject dan pencarian yang sekarang.
3. Pada mode **Prioritas**, materi yang dipin tampil lebih dahulu menurut urutan pin.
4. Materi yang tidak dipin mengikuti urutan lama.
5. Urutan prioritas diterapkan sebelum pagination tiga item per halaman.
6. Materi yang dipin tidak boleh muncul dua kali.
7. Sort eksplisit Nama A–Z, Penulis A–Z, Terlama, atau Terbaru tetap dihormati.

### 4.3 Practice

1. Pertahankan filter kelayakan Practice yang sekarang: `is_published`, `show_results !== false`, dan `target_mode` yang kompatibel.
2. Terapkan pencarian, filter tipe, dan filter subjek persis seperti perilaku sekarang.
3. Pada mode **Prioritas**, aktivitas yang dipin tampil di awal grid sesuai urutan pin.
4. Aktivitas yang tidak dipin mengikuti urutan terbaru.
5. Pilihan sort eksplisit Nama A–Z, Terlama, atau Terbaru tetap bekerja dan tidak ditimpa pin.
6. Tidak ada pin kategori, section kategori, atau perubahan ke struktur grid.
7. Satu ujian `BOTH` boleh memiliki urutan pin berbeda pada CBT dan Practice.

Pilihan sort **Prioritas** menjadi default daftar Practice pada rilis pertama. Pilihan sort lama tetap tersedia.

### 4.4 Pengumuman

1. Hanya pengumuman dengan `is_active = true` yang dapat tampil.
2. Pengumuman yang dipin tampil lebih dahulu mengikuti urutan pin.
3. Pengumuman lain tetap terbaru lebih dahulu.
4. Pengumuman nonaktif tidak pernah ditampilkan meskipun masih memiliki metadata pin.
5. Pin tidak mengubah status aktif, isi, atau kategori pengumuman.


## 5. Arsitektur data yang direkomendasikan

### 5.1 Prinsip

Gunakan satu tabel metadata terpisah bernama `homepage_content_pins`. Tabel ini hanya menyimpan urutan item yang diprioritaskan. Jangan menambahkan kolom pin ke `exams`, `study_materials`, atau `announcements`.

Skema final rilis pertama:

| Kolom | Tipe usulan | Catatan |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `surface` | text/check | `cbt`, `practice`, `material`, `announcement` |
| `exam_id` | UUID nullable FK | Item CBT atau Practice |
| `material_id` | UUID nullable FK | Item materi |
| `announcement_id` | UUID nullable FK | Item pengumuman |
| `sort_order` | integer | Angka kecil tampil lebih dahulu |
| `created_at` | timestamptz | Waktu dibuat |
| `updated_at` | timestamptz | Waktu perubahan |
| `updated_by` | UUID nullable | Admin pelaku perubahan |

Constraint dan index:
- `surface` hanya menerima empat nilai resmi.
- Setiap baris harus mengisi tepat satu FK item dan FK tersebut harus sesuai dengan surface.
- `sort_order` harus positif.
- Unique partial index pada pasangan `(surface, exam_id)`, `(surface, material_id)`, dan `(surface, announcement_id)`.
- Unique index pada `(surface, sort_order)` agar urutan dalam satu surface tidak bertabrakan.
- FK item memakai `ON DELETE CASCADE`.
- Tidak ada `scope` atau `category_key` pada rilis pertama. Jika suatu saat dibutuhkan pengaturan kategori, desainnya dibahas sebagai pengembangan terpisah setelah struktur UI dan kebutuhannya jelas.

Satu ujian `BOTH` dapat memiliki dua baris pin, satu untuk `cbt` dan satu untuk `practice`. Urutan kedua surface tidak saling memengaruhi.

### 5.2 Kelayakan item dan pembersihan metadata

- CBT: `is_published = true` dan target mode kosong/default yang kompatibel, `CBT_ONLY`, atau `BOTH`.
- Practice: `is_published = true`, `show_results !== false`, dan target mode kosong/default yang kompatibel, `PRACTICE_ONLY`, atau `BOTH`.
- Materi: status publikasi harus mengikuti aturan RLS sekarang; policy publik yang aktif mensyaratkan `status = 'published'`.
- Pengumuman: `is_active = true`.

Jika konten menjadi draft/nonaktif atau tidak lagi eligible, pin tidak boleh membuatnya tampil. Metadata pin boleh tetap tersimpan agar urutan tidak hilang ketika konten dipublikasikan kembali; admin harus melihat penanda **Tidak tersedia untuk publik** dan dapat melepas pin tersebut. Penghapusan konten akan membersihkan metadata melalui FK cascade.

### 5.3 Mengapa metadata dipisah?

- Satu paket `BOTH` perlu urutan CBT dan Practice yang berbeda.
- Tidak ada perubahan pada tabel operasional konten.
- Tidak ada risiko pin mengubah konfigurasi mesin pengerjaan.
- Struktur dapat diperluas di masa depan tanpa menambahkan kolom pin ke tabel inti.


## 6. Keamanan dan akses

Audit database menunjukkan tabel konten mempunyai aturan RLS masing-masing. Fitur ini tidak boleh mengubah policy/grant tabel konten yang sudah ada. Temuan policy luas pada tabel operasional juga tetap menjadi pekerjaan keamanan terpisah.

**Larangan untuk scope fitur ini:**
- Jangan mengubah RLS, policy, grant, trigger, atau function pada `exams`, `questions`, `exam_sessions`, tabel jawaban, tabel attempt Practice, atau tabel konten.
- Jangan mengubah RPC `start_practice_attempt` / `finish_practice_attempt` atau fungsi XP.
- Jangan mengubah `private.is_admin()` atau pola autentikasi admin yang sudah ada.
- Jangan memberi hak tulis kepada anon/authenticated pada tabel pin.
- Jangan menaruh service-role key di browser.

Rancangan keamanan:
- RLS diaktifkan pada `homepage_content_pins`.
- Tidak dibuat policy SELECT/INSERT/UPDATE/DELETE untuk `anon` atau `authenticated`; tidak ada akses langsung dari browser ke tabel pin.
- Hak minimum tabel diberikan hanya kepada role `service_role` yang digunakan server.
- Endpoint publik `GET /api/homepage-pins?surface=...` membaca melalui service-role di server, memeriksa ulang kelayakan item pada tabel sumber, lalu hanya mengembalikan ID dan urutan item yang eligible. Endpoint tidak mengembalikan data privat.
- Endpoint admin `GET/PUT /api/admin/homepage-pins` memanggil `requireTrustedAdmin()` dan memvalidasi same-origin sebelum operasi tulis.
- Server memvalidasi surface, UUID, duplikasi ID, status publikasi/aktif, dan target mode.
- Reorder disimpan atomik melalui satu RPC khusus yang hanya dapat dieksekusi `service_role`. Route memanggil RPC setelah admin terverifikasi; browser tidak dapat memanggil RPC tersebut.
- RPC menggunakan `SECURITY DEFINER` dengan `search_path` yang dikunci, validasi input, dan grant EXECUTE minimum hanya untuk `service_role`.
- Tidak ada perubahan policy/grant pada tabel ujian, soal, sesi, jawaban, materi, atau pengumuman.

Dengan pendekatan ini, halaman publik tidak membutuhkan akses langsung ke tabel pin dan service-role key tetap berada di server.


## 7. Rancangan kode lengkap — struktur file

### 7.1 File baru

| File | Tanggung jawab |
|---|---|
| `app/admin/pengaturan-beranda/page.tsx` | Halaman admin pusat empat tab |
| `components/admin/homepage-settings/HomepageSettings.tsx` | State tab, loading, error, refresh, dan save |
| `components/admin/homepage-settings/PriorityList.tsx` | Daftar pin dan tombol naik/turun |
| `components/admin/homepage-settings/ContentPicker.tsx` | Pencarian dan pemilihan konten eligible |
| `components/admin/homepage-settings/PinStatus.tsx` | Status tersedia/tidak tersedia dan status simpan |
| `lib/homepage-pins/types.ts` | Tipe surface, record, dan DTO |
| `lib/homepage-pins/normalize.ts` | Helper normalisasi ID dan pengurutan |
| `lib/homepage-pins/server.ts` | Service-role client server, validasi target, pembacaan dan penyimpanan |
| `app/api/homepage-pins/route.ts` | GET publik: hanya ID dan urutan pin yang eligible |
| `app/api/admin/homepage-pins/route.ts` | GET/PUT admin dengan trusted-admin dan same-origin |
| `supabase/migrations/<timestamp>_create_homepage_content_pins.sql` | Tabel metadata, index, RLS, function reorder, dan grant minimum |

### 7.2 File yang diintegrasikan

| File | Perubahan terbatas |
|---|---|
| `app/page.tsx` | Mengambil pin CBT, materi, pengumuman; mengurutkan tampilan tanpa mengubah query eligibility |
| `app/practice/page.tsx` | Mengambil pin Practice dan mengurutkan grid setelah filter lama |
| `components/admin/AdminSidebar.tsx` | Menambahkan menu Pengaturan Beranda |

Rilis pertama tidak menambahkan pintasan pin ke halaman Bank Soal, Practice, atau Konten. Seluruh pengelolaan pin dilakukan dari pusat baru agar hanya ada satu sumber perubahan.

### 7.3 File yang dilarang berubah dalam scope fitur

- `app/exam/[id]/page.tsx`
- `app/practice/[id]/page.tsx`
- komponen engine CBT/Practice;
- tabel `questions`, `exam_sessions`, jawaban CBT;
- tabel percobaan/jawaban Practice;
- RPC pengerjaan, penilaian, XP, badge, dan progres;
- editor WYSIWYG soal/materi.

Jika implementasi membutuhkan perubahan salah satu file tersebut, hentikan dan minta persetujuan baru beserta analisis dampaknya.


## 8. Kontrak tipe dan algoritma

### 8.1 Tipe domain

```ts
export type HomepageSurface =
  | 'cbt'
  | 'practice'
  | 'material'
  | 'announcement'

export type HomepagePin = {
  id: string
  surface: HomepageSurface
  exam_id: string | null
  material_id: string | null
  announcement_id: string | null
  sort_order: number
  updated_at: string
}

export type HomepagePinUpdate = {
  surface: HomepageSurface
  itemIds: string[]
}
```

DTO admin dapat menyertakan judul, deskripsi singkat, status eligible, dan label untuk picker. Data konten tetap bersumber dari tabel aslinya; judul tidak disimpan sebagai sumber kebenaran di tabel pin.

### 8.2 Algoritma pengurutan item

Helper pengurutan harus murni, tidak melakukan query, dan tidak mengubah array asli.

```ts
type SortMode = 'PRIORITY' | 'NEWEST' | 'OLDEST' | 'TITLE'

function applyItemPriority<T extends { id: string; created_at?: string | null }>(
  rows: T[],
  itemOrder: Map<string, number>,
  mode: SortMode,
  getTitle: (row: T) => string
): T[] {
  const copy = [...rows]

  if (mode !== 'PRIORITY') {
    return copy.sort((a, b) => {
      if (mode === 'TITLE') {
        return getTitle(a).localeCompare(getTitle(b), 'id')
      }
      const delta =
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      return mode === 'OLDEST' ? delta : -delta
    })
  }

  return copy.sort((a, b) => {
    const aOrder = itemOrder.get(a.id)
    const bOrder = itemOrder.get(b.id)
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder
    if (aOrder !== undefined) return -1
    if (bOrder !== undefined) return 1

    const dateDelta =
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    return dateDelta || a.id.localeCompare(b.id)
  })
}
```

Aturan integrasi:
- CBT: filter eligibility dan filter pengguna tetap dijalankan lebih dahulu. Pada mode PRIORITY, daftar pin dirender sebagai section Ujian Prioritas di atas kelompok subtes. Item yang dipin dikeluarkan dari kelompok reguler agar tidak duplikat. Mode sort eksplisit lama tetap berlaku.
- Materi: filter subject/pencarian dan mode sort dipertahankan. PRIORITY diterapkan sebelum pagination tiga item.
- Practice: filter tipe, pencarian, dan subjek tetap persis seperti sekarang. PRIORITY diterapkan ke grid sesudah filter; mode TITLE/OLDEST/NEWEST tetap bekerja.
- Pengumuman: filter `is_active = true` dijalankan sebelum urutan pin.
- Jika request metadata pin gagal, gunakan array pin kosong dan urutan lama.
- ID menjadi pemecah seri agar urutan stabil.

### 8.3 Kegagalan metadata pin

Pembacaan pin tidak boleh menjadi bagian yang dapat menggagalkan pemuatan konten utama. Gunakan request terpisah atau tangani error pin secara terisolasi. Bila API pin gagal, catat error untuk observabilitas, set pin kosong, dan lanjutkan dengan perilaku urutan lama.


## 9. API dan penyimpanan urutan

### 9.1 API publik

`GET /api/homepage-pins?surface=cbt`
- Tidak memerlukan login.
- Membaca tabel pin melalui service-role server-side.
- Memvalidasi ulang kelayakan setiap item pada tabel sumber.
- Mengembalikan hanya daftar `{ id, sort_order }` yang eligible.
- Tidak mengembalikan data konten yang tidak diperlukan.
- Gunakan `Cache-Control: no-store` pada rilis pertama agar perubahan admin segera terlihat.

### 9.2 API admin

`GET /api/admin/homepage-pins?surface=cbt`
- Wajib admin tepercaya.
- Mengembalikan daftar item eligible, daftar pin, serta item pinned yang tidak lagi eligible agar admin dapat melepas pin.

`PUT /api/admin/homepage-pins`
- Wajib admin tepercaya dan same-origin.
- Menerima satu surface dan array `itemIds` dalam urutan final.
- Memvalidasi UUID, ID duplikat, batas payload, surface, status publikasi/aktif, dan target mode.
- Menyimpan seluruh urutan secara atomik.
- Mengembalikan konfigurasi final yang tersimpan.

### 9.3 Reorder atomik

Jangan menyimpan urutan dengan loop update dari browser. Route admin memanggil satu RPC khusus yang:
- menerima surface, array UUID final, dan `updated_by` dari server;
- mengunci operasi untuk surface yang sama;
- memastikan target sesuai dengan surface;
- mengganti seluruh daftar urutan dalam satu transaksi;
- menyimpan nomor urut rapat 1..N;
- memperbarui `updated_at` dan `updated_by`;
- rollback seluruh operasi jika satu target tidak valid.

RPC hanya dapat dieksekusi oleh `service_role`. Route harus menjalankan `requireTrustedAdmin()` terlebih dahulu dan tidak pernah menerima `updated_by` dari payload browser.


## 10. Rencana migration

Migration hanya membuat tabel metadata pin, index, RLS, dan RPC reorder yang khusus untuk tabel baru. Migration tidak boleh memodifikasi tabel konten atau operasional yang sudah ada.

Checklist migration:
1. Pastikan nama tabel dan function belum digunakan.
2. Buat tabel dengan tiga FK nullable dan constraint tepat satu target sesuai surface.
3. Buat FK `ON DELETE CASCADE`.
4. Buat unique partial indexes per surface/target dan unique `(surface, sort_order)`.
5. Aktifkan RLS pada tabel pin.
6. Jangan buat policy untuk `anon` atau `authenticated`; jangan beri grant langsung kepada keduanya.
7. Berikan grant minimum pada `service_role`.
8. Buat RPC reorder dengan `SECURITY DEFINER`, `search_path` terkunci, validasi, dan EXECUTE hanya untuk `service_role`.
9. Pastikan tidak ada trigger/function/policy yang menyentuh tabel ujian, soal, sesi, jawaban, attempt, atau progres.
10. Cocokkan migration dengan konvensi timestamp yang sudah dipakai repo dan daftar migration Supabase.
11. Tinjau SQL statis sebelum menerapkan migration produksi. Tidak menggunakan Preview sebagai pengganti pengujian database.

Tidak ada policy atau grant pada tabel yang sudah ada yang boleh diubah.


## 11. File-by-file implementation plan

### Tahap A — fondasi server dan database
1. Susun migration tabel metadata pin, RLS tertutup, index, dan RPC atomik.
2. Buat tipe domain dan helper pengurutan murni.
3. Buat server helper yang menggunakan service-role hanya di server.
4. Buat GET publik yang hanya mengirim pin eligible.
5. Buat GET/PUT admin dengan `requireTrustedAdmin()` dan same-origin validation.

### Tahap B — pusat admin
6. Buat halaman `/admin/pengaturan-beranda` dengan empat tab.
7. Buat picker konten, daftar prioritas, tombol naik/turun, status tersedia/tidak tersedia, dan simpan batch.
8. Tambahkan menu pada `AdminSidebar.tsx`.
9. Tidak menambahkan pintasan pada halaman pengelolaan lama.

### Tahap C — integrasi tampilan
10. Integrasikan pin CBT, materi, dan pengumuman ke `app/page.tsx`.
11. Integrasikan pin Practice ke `app/practice/page.tsx`.
12. Tambahkan pilihan sort PRIORITY tanpa menghapus sort lama.
13. Pastikan semua filter dan pagination diterapkan pada urutan yang benar.

### Tahap D — review sebelum rilis
14. Tinjau diff seluruh file dan pastikan file mesin pengerjaan tidak berubah.
15. Validasi migration, constraints, grants, RLS, dan RPC.
16. Jalankan pemeriksaan statis/build yang tersedia sebelum commit.
17. Terapkan migration yang disetujui, lalu commit kode fitur ke `main` dalam satu rangkaian perubahan.
18. Periksa satu deployment produksi dan smoke test setelah persetujuan pengguna.

## 12. Matriks risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Pin CBT ikut mengubah Practice karena tabel exams sama | Urutan salah di salah satu halaman | Simpan surface terpisah dan uji paket BOTH |
| Draft/hidden muncul karena pin | Konten yang belum boleh tampil terlihat | Visibility filter selalu lebih dahulu; validasi server |
| Pin mengubah token/jadwal/konfigurasi | Gangguan CBT | Tidak mengubah tabel exams; metadata terpisah |
| Mesin CBT terdampak | Siswa gagal ujian | Tidak mengubah route pengerjaan/session/answers |
| Mesin Practice terdampak | Progres/XP hilang | Tidak mengubah route pengerjaan/RPC/attempts |
| ID pin duplikat atau urutan bertabrakan | Urutan tidak stabil | Unique index per surface dan validasi array pada API |
| Materi terpotong sebelum pin | Item prioritas tidak muncul di halaman pertama | Sort sebelum pagination |
| Pengurutan manual rusak oleh update bersamaan | Nomor urut ganda/acak | Transaksi atomik dan lock per surface |
| Query pin gagal | Beranda/Practice error | Fallback ke urutan lama |
| Konten dihapus tetapi pin tertinggal | Record yatim | FK ON DELETE CASCADE |
| Pengumuman nonaktif tetap tampil | Informasi tidak semestinya terlihat | Filter is_active sebelum prioritas |
| Admin bukan admin melakukan perubahan | Perubahan konten prioritas tanpa izin | Server-side admin check + RLS |

---

## 13. Checklist pengujian wajib sebelum rilis

### CBT
- [ ] `CBT_ONLY` dan `BOTH` tetap terlihat sesuai aturan.
- [ ] `PRACTICE_ONLY` tidak muncul di daftar CBT.
- [ ] Draft tetap tersembunyi.
- [ ] Pin CBT tidak memengaruhi daftar Practice.
- [ ] Paket dengan token, jadwal, durasi, shuffle, hasil dan pembahasan tetap sama.
- [ ] Filter pencarian/subtes dan sort lama tetap berfungsi.
- [ ] Memulai, menyimpan jawaban, melanjutkan dan menyelesaikan sesi CBT tetap berfungsi.
- [ ] Tidak ada perubahan pada `exam_sessions`, jawaban, atau penilaian.

### Practice
- [ ] `PRACTICE_ONLY` dan `BOTH` tetap terlihat sesuai aturan.
- [ ] `CBT_ONLY` tidak muncul.
- [ ] Aturan `show_results !== false` tetap dipertahankan.
- [ ] Semua activity_type/alias tetap dinormalisasi seperti sebelumnya.
- [ ] Pin Practice tidak memengaruhi urutan CBT.
- [ ] Sort TITLE/OLDEST/NEWEST tetap bekerja; PRIORITY menjadi pilihan default.
- [ ] Pin hanya mengubah urutan kartu; tidak membuat kelompok subtes baru.
- [ ] Filter tipe, pencarian dan filter subjek tetap bekerja.
- [ ] Quiz, Maze, Maze V2, Flashcard dapat dimulai dan diselesaikan.
- [ ] Progres, XP, streak, badge, attempt dan jawaban tetap utuh.

### Materi
- [ ] Aturan status/visibilitas yang sekarang tidak berubah.
- [ ] Pin item tidak menampilkan duplikat.
- [ ] Pencarian/filter subject tetap bekerja.
- [ ] Pagination tiga item per halaman benar setelah prioritas.
- [ ] Unpin kembali ke urutan default.

### Pengumuman
- [ ] Hanya `is_active = true` yang tampil.
- [ ] Pengumuman pin muncul sesuai urutan.
- [ ] Pengumuman nonaktif tetap tidak tampil.
- [ ] Konten dan status aktif tidak berubah.

### Admin, keamanan, dan ketahanan
- [ ] Non-admin tidak dapat membuka/mengubah konfigurasi.
- [ ] Reorder disimpan atomik.
- [ ] Dua admin menyimpan perubahan berdekatan tidak menghasilkan urutan korup.
- [ ] Kegagalan API pin tidak merusak halaman publik.
- [ ] Data pin rusak/tidak valid diabaikan aman dan tercatat.
- [ ] Penghapusan konten membersihkan pin terkait.
- [ ] Tidak ada perubahan RLS/policy/grant pada tabel operasional.
- [ ] Tidak ada perubahan file mesin pengerjaan CBT/Practice.

---

## 14. Strategi rilis hemat kuota deployment

Pengguna meminta menghemat kuota deployment dan tidak memakai Preview/branch lain.

Urutan kerja:
1. Audit dan rancangan (tahap sekarang).
2. Tinjau dan setujui rancangan serta migration.
3. Susun semua file implementasi secara lengkap.
4. Lakukan pemeriksaan statis/diff dan validasi SQL sebelum commit.
5. Terapkan migration yang sudah disetujui.
6. Commit seluruh perubahan kode fitur ke `main` dalam satu commit atau satu rangkaian yang tidak memicu build berulang.
7. Periksa satu deployment produksi dan lakukan uji smoke test yang disepakati.

Catatan penting:
- Perubahan dokumentasi saja biasanya tidak perlu membangun aplikasi bila konfigurasi Ignored Build Step memang mengecualikan docs, tetapi perilaku aktual harus diverifikasi; tidak dijanjikan mutlak.
- Migration database sendiri tidak memicu deployment Vercel.
- Jangan commit kode parsial hanya untuk mencoba build jika bisa diselesaikan dan ditinjau sebelum commit.
- Tidak menggunakan Preview, branch alternatif, atau PR.
- Jangan mengklaim pengujian runtime sudah lulus jika belum dijalankan.

---

## 15. Pekerjaan keamanan terpisah

Audit sebelumnya mengidentifikasi policy/grant luas pada beberapa tabel, termasuk tabel operasional. Itu perlu ditangani sebagai audit keamanan terpisah dengan rencana uji dan persetujuan tersendiri.

**Fitur pusat Pengaturan Beranda tidak boleh menjadi kendaraan untuk mengubah policy pada `exams`, `questions`, `exam_sessions`, tabel jawaban, atau tabel Practice.** Perubahan keamanan pada tabel-tabel tersebut dapat memengaruhi akses ujian/latihan yang sedang berjalan dan tidak termasuk scope ini.

---


## 16. Keputusan yang sudah ditetapkan

- Satu pusat admin bernama Pengaturan Beranda.
- Empat tab: Ujian, Materi, Practice, Pengumuman.
- Rilis pertama hanya pin item individual; tidak ada pin kategori.
- CBT dan Practice memiliki prioritas terpisah walaupun memakai tabel `exams` yang sama.
- Daftar CBT mempertahankan pengelompokan subtes yang ada; item prioritas ditampilkan lebih dahulu dalam section tersendiri.
- Practice tetap berupa grid aktivitas yang ada; hanya urutan kartu yang berubah.
- Materi dan pengumuman hanya berubah urutan itemnya.
- Sort PRIORITY menjadi default baru pada daftar yang memiliki kontrol sort; sort lama tetap tersedia.
- Pin hanya metadata tampilan; tidak mengubah status publikasi, status aktif, target mode, konfigurasi, atau mesin pengerjaan.
- Tabel pin tidak dapat diakses langsung oleh anon/authenticated; baca publik melalui API server yang mengembalikan pin eligible saja.
- Penulisan hanya melalui API admin setelah `requireTrustedAdmin()` dan validasi same-origin.
- Reorder dilakukan atomik melalui RPC khusus service-role.
- Tidak menggunakan Preview, branch lain, atau PR.
- Pusat admin saja untuk rilis pertama; pintasan di halaman pengelolaan lama ditunda.
- Mengutamakan satu rangkaian perubahan agar hemat deployment.

Tidak ada keputusan scope yang masih terbuka untuk rilis pertama. Pengembangan kategori, shortcut, atau perubahan layout lain harus menjadi pekerjaan terpisah.

---

## 18. Audit ulang kode aktual di `main` — pemeriksaan kesatuan sebelum implementasi

Pemeriksaan ini dilakukan kembali setelah rancangan awal, dengan mengambil isi file terbaru langsung dari branch `main`. Tujuannya memastikan desain benar-benar cocok dengan komponen dan perilaku yang sudah berjalan.

### 18.1 Beranda — `app/page.tsx`

Temuan kode:
- Beranda adalah Client Component (`'use client'`) dan mengambil data melalui `createClient()` dari `@/lib/supabase/client`.
- Query utama dimuat dalam satu `Promise.all`: auth, ujian terpublikasi, pengumuman aktif, dan materi. Query materi tidak menambahkan filter status di sisi client; policy RLS publik yang saat ini aktif membatasi ke `status = 'published'`.
- Pengumuman tidak memiliki kontrol pencarian/sortir di UI; hanya urutan array yang perlu diprioritaskan.
- Materi memiliki pencarian, filter subject, sortir Terbaru/Terlama/Nama A–Z/Penulis A–Z, lalu pagination tiga item. Karena itu pin harus diterapkan setelah filter dan sebelum `slice()`.
- Ujian memiliki filter subtes, akses token, pencarian, dan sortir Terbaru/Terlama/Nama A–Z/Penulis A–Z/Durasi terpendek/Durasi terpanjang.
- Ujian kemudian dikelompokkan menurut subtes dan dirender sebagai kartu.

Integrasi yang aman:
- Jangan memasukkan fetch metadata pin ke dalam `Promise.all` data utama. Ambil metadata secara terpisah agar API pin lambat/gagal tidak menunda atau menggagalkan beranda.
- Tambahkan state urutan pin dengan default kosong; saat endpoint berhasil, state diperbarui. Saat gagal, state kosong dan urutan lama tetap dipakai.
- Tambahkan opsi sortir **Prioritas** pada kontrol ujian dan materi. Pertahankan semua opsi lama. Default awal diubah ke Prioritas sesuai keputusan fitur, tetapi fallback saat endpoint gagal harus identik dengan urutan Terbaru yang lama.
- Saat sortir Prioritas aktif, buat daftar Ujian Prioritas dari hasil yang sudah lolos seluruh filter; keluarkan ID tersebut dari grup subtes reguler agar tidak muncul dua kali. Saat pengguna memilih sortir eksplisit lain, jangan pisahkan atau memaksakan pin.
- Untuk materi, urutan prioritas diterapkan pada hasil yang sudah lolos filter dan sebelum pagination. Jangan mengubah total halaman, jumlah sumber, atau reset halaman yang sekarang.
- Pengumuman cukup diurutkan berdasarkan daftar pin, lalu item non-pin berdasarkan tanggal terbaru.

### 18.2 Practice — `app/practice/page.tsx`

Temuan kode:
- Halaman adalah Client Component.
- Satu fungsi pemuatan memuat profil, riwayat attempt, sesi flashcard, daftar kelas, dan paket ujian.
- Paket eligible disaring dengan `is_published = true`, `show_results !== false`, dan `target_mode` yang kompatibel.
- Statistik aktivitas dan progres dihitung dari data ujian dan riwayat yang sama.
- Daftar kartu menggunakan filter pencarian, tipe aktivitas, dan subject untuk Quiz; hasil akhirnya diurutkan dengan `missionSort` (NEWEST/OLDEST/TITLE) lalu langsung dirender sebagai grid.
- Sort default saat ini NEWEST.

Integrasi yang aman:
- Jangan menyentuh query riwayat attempt, flashcard session, profil, XP, ranking, badge, atau statistik.
- Ambil metadata pin Practice secara terpisah dari pemuatan statistik dan data utama; jangan jadikan endpoint pin sebagai syarat `setLoading(false)`.
- Setelah filter yang sudah ada, terapkan urutan pin hanya saat sort PRIORITY. Sort TITLE/OLDEST/NEWEST tetap identik.
- Tambahkan pilihan PRIORITY ke kontrol sort dan jadikan default awal. Saat metadata gagal, comparator harus kembali persis ke perilaku NEWEST.
- Grid dan komponen kartu tidak perlu diganti; hanya urutan array yang masuk ke `map()` yang berubah.

### 18.3 Pengumuman dan materi — kebijakan akses aktual

Pemeriksaan policy Supabase menunjukkan:
- `announcements_read_active_or_admin`: publik dapat membaca pengumuman aktif; admin juga dapat membaca yang nonaktif.
- `study_materials_read_published_or_admin`: publik dapat membaca materi berstatus `published`; admin juga dapat membaca materi lain.
- `exams` memiliki policy publik yang mengizinkan SELECT terpublikasi, serta policy ALL luas yang sudah ada. Policy luas tersebut adalah temuan keamanan terpisah dan tidak disentuh oleh fitur pin.

Karena itu:
- API publik hanya mengembalikan ID dan urutan pin yang sudah diverifikasi eligible; tidak mengirim data draft/nonaktif.
- API admin boleh mengembalikan daftar konten nonpublik untuk keperluan pengelolaan, tetapi hanya setelah `requireTrustedAdmin()` lolos.
- Jangan mengandalkan UI admin/layout sebagai pengaman endpoint. Otorisasi server wajib di setiap GET admin dan PUT.

### 18.4 Helper keamanan yang sudah tersedia

File yang sudah ada dan dapat digunakan:
- `lib/supabase/trusted-admin.ts`: `requireTrustedAdmin()` memvalidasi sesi menggunakan `auth.getUser()`, lalu memverifikasi `profiles.role` melalui service-role client.
- `lib/security/request-origin.ts`: `isSameOriginRequest(request)` memvalidasi Origin dan host yang diizinkan, termasuk host Vercel.
- `lib/supabase/server.ts`: server client berbasis cookie.
- `lib/supabase/admin.ts`: wrapper `requireAdmin()`, tetapi helper trusted-admin memberi akses `adminClient` dan `userId` yang diperlukan API fitur.

Gunakan helper yang sudah ada; jangan membuat mekanisme admin kedua atau menyalin validasi origin berbeda.

### 18.5 Koreksi penting rancangan SQL dan API

1. **Function reorder wajib `SECURITY INVOKER`, bukan `SECURITY DEFINER`.** Service-role client server sudah memiliki hak untuk mengubah tabel metadata dan bypass RLS; fungsi tidak membutuhkan eskalasi privilege. Fungsi tetap harus memakai nama schema tabel yang eksplisit dan `search_path` kosong/terkunci.
2. Revoke `EXECUTE` dari `PUBLIC`, `anon`, dan `authenticated`; grant hanya kepada `service_role`. Jangan mengandalkan default privilege function.
3. Tabel baru mengaktifkan RLS tanpa policy publik/authenticated. Berikan grant tabel eksplisit hanya kepada `service_role` yang dipakai API server. Tidak ada grant SELECT ke anon/authenticated.
4. Reorder memakai satu transaksi/RPC: validasi seluruh array dan eligibility di dalam fungsi, lock berdasarkan surface, hapus daftar surface tersebut, lalu insert urutan final 1..N. Jika satu ID invalid, exception membatalkan seluruh transaksi.
5. API admin tetap memverifikasi admin dan same-origin sebelum memanggil RPC. Nilai `updated_by` berasal dari `auth.user.id` yang sudah diverifikasi, bukan body browser.
6. API publik menggunakan service-role hanya di server dan mengembalikan pasangan ID/urutan yang eligible. Service-role key tidak boleh masuk ke bundle client.
7. Karena Supabase mengubah default exposure Data API pada 30 Oktober 2026, migration harus memberikan hak minimum secara eksplisit kepada `service_role`; jangan memberi akses tabel/fungsi kepada `anon` atau `authenticated`. Lihat [pengumuman perubahan Data API](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) dan [panduan fungsi database](https://supabase.com/docs/guides/database/functions).

### 18.6 Catatan migration dan urutan kerja

- Daftar migration database terakhir yang tercatat adalah `20261123031203_restrict_profiles_plain_password_column_access`.
- Repository saat ini tidak memiliki `supabase/config.toml`. Folder migration memang ada, tetapi cara menghasilkan migration lokal yang konsisten belum dapat diverifikasi dari repository yang tersedia.
- Jangan menjalankan SQL DDL langsung pada database produksi selama tahap penyusunan/review ini.
- Sebelum membuat file migration final, pastikan lingkungan lokal Supabase CLI dan konfigurasi migration yang dipakai repo tersedia. Jika belum, siapkan file SQL final untuk ditinjau, tetapi jangan menerapkannya ke database.
- Belum ada file aplikasi atau database yang diubah pada audit ulang ini.

### 18.7 Urutan review implementasi terpadu

Sebelum satu commit ke `main`, seluruh diff harus diperiksa sebagai satu kesatuan:
1. migration dan privilege;
2. server helper dan API publik/admin;
3. tipe serta fungsi pengurutan murni;
4. halaman admin empat tab;
5. integrasi beranda dan Practice;
6. sidebar;
7. pemeriksaan TypeScript/ESLint/build;
8. review diff final memastikan tidak ada file mesin CBT/Practice atau tabel operasional yang tersentuh.

**Status audit ulang:** desain sudah disesuaikan dengan struktur kode aktual. Implementasi masih menunggu tahap penyusunan file dan review; tidak ada perubahan aplikasi, SQL produksi, atau deployment dari audit ini.

## 17. Batas status dokumen

Dokumen ini adalah rancangan teknis final untuk rilis pertama, sudah diaudit ulang terhadap kode aktual, dan menunggu persetujuan implementasi. Pada tahap ini:
- belum ada file aplikasi yang diubah;
- belum ada migration dibuat atau dijalankan;
- belum ada policy/RLS/grant database yang diubah;
- belum ada data pin yang ditulis;
- belum ada commit implementasi;
- belum ada deployment atau uji runtime.

Implementasi hanya dimulai setelah rancangan kode, SQL migration, dan daftar file yang berubah disetujui secara eksplisit.


## 12. Catatan implementasi dan verifikasi (23 November 2026)

Kode fitur telah disiapkan untuk branch `main` dalam satu commit, mencakup:
- tabel metadata pin dan RPC penggantian urutan secara atomik;
- API publik fail-open dan API admin dengan verifikasi `requireTrustedAdmin()`;
- halaman admin empat tab dengan tombol naik/turun, tambah, lepas, dan simpan;
- integrasi urutan prioritas pada beranda dan Practice;
- tautan menu admin.

Pemeriksaan build lokal belum dijalankan dari konektor GitHub. Hasil deployment Vercel dan penerapan migration harus diverifikasi setelah commit.

Catatan kompatibilitas: halaman depan yang saat ini ada memfilter target ujian dengan nilai `CBT_ONLY` dan `BOTH`, sedangkan formulir admin bank soal menggunakan `EXAM_ONLY` dan `BOTH`. Implementasi pin mempertahankan filter yang sudah berjalan pada masing-masing halaman agar fitur ini tidak diam-diam mengubah kelayakan konten. Ketidakkonsistenan nilai tersebut perlu ditangani sebagai perbaikan terpisah.
