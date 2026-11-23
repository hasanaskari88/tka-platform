# Rancangan Induk: Pusat Pengaturan Beranda

Status: **Rancangan teknis matang — menunggu persetujuan sebelum implementasi**
Tanggal audit: 23 November 2026
Repository: `hasanaskari88/tka-platform`
Target kerja: branch `main` saja; tidak membuat branch/PR dan tidak menggunakan Preview.
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
- `show_results !== false` sesuai aturan halaman saat ini;
- `target_mode` kosong/default yang kompatibel, `PRACTICE_ONLY`, atau `BOTH`.

Practice mengenali `activity_type`, antara lain:
- `QUIZ`
- `MAZE_GAME`
- `MAZE_GAME_V2`
- `FLASHCARD`
- kemungkinan alias/tipe lain yang telah dinormalisasi di kode.

Filter daftar Practice saat ini meliputi:
- pencarian;
- tipe aktivitas (`missionType`);
- subjek untuk daftar Quiz (`missionSubject`);
- pilihan urutan (`missionSort`: judul, terlama, terbaru).

Practice juga memuat data riwayat/rekap untuk menghitung aktivitas dan progres. Fitur pin tidak boleh mengubah query, pemetaan, atau perhitungan tersebut.

**Keputusan kategori Practice:** untuk tahap pertama, kategori prioritas Practice menggunakan nilai `exams.subtest` yang sudah ada sebagai label kelompok, tanpa menambahkan relasi baru. Filter subjek saat ini memang khusus ketika tipe yang dipilih adalah Quiz. Karena itu UI pusat harus menjelaskan bahwa prioritas kategori Practice mengelompokkan daftar aktivitas berdasarkan nilai subtest, sedangkan filter subjek yang ada tetap mengikuti perilaku lama. Sebelum implementasi, pastikan tampilan Practice benar-benar menampilkan/mengelompokkan kategori untuk semua tipe; jika tidak, kategori pin Practice dapat ditunda dan hanya pin item digunakan. Jangan menciptakan konsep kategori baru diam-diam.

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
| Ujian | Subtes + paket ujian individual | Hanya daftar CBT |
| Materi | Subject + materi individual | Hanya daftar materi |
| Practice | Kategori subtest (jika cocok dengan UI) + aktivitas individual | Hanya `/practice` |
| Pengumuman | Pengumuman individual | Hanya bagian pengumuman beranda |

Di setiap tab:
1. Area **Sedang diprioritaskan**.
2. Daftar **Konten lainnya** dengan pencarian/filter.
3. Tombol pin/lepas pin.
4. Tombol naik/turun untuk mengatur urutan (lebih sederhana dan aksesibel daripada drag-and-drop pada versi pertama).
5. Tombol **Simpan perubahan** bila urutan diedit secara batch.
6. Status loading, kosong, gagal memuat, dan berhasil menyimpan yang jelas.
7. Konfirmasi ketika melepas pin atau ketika perubahan berpotensi mengubah urutan yang sudah diatur.

Batas UX:
- Jangan menerapkan batas jumlah pin yang arbitrer pada versi pertama. Berikan indikator jumlah item yang dipin. Batas dapat ditambahkan kemudian jika performa atau desain beranda membutuhkannya.
- Item yang dipin harus mudah ditemukan melalui filter pencarian.
- Jangan menaruh editor urutan lengkap di WYSIWYG/editor soal atau editor isi materi.
- Pintasan Pin/Lepas Pin di daftar Bank Soal, Practice, Materi, dan Pengumuman boleh ditambahkan setelah pusat stabil. Semua pintasan wajib memakai API dan sumber data yang sama.
- Menu pusat harus bisa diakses hanya oleh admin sesuai pola layout admin yang sudah ada.

---

## 4. Aturan tampilan dan prioritas

Setiap surface memiliki ruang urutannya sendiri. Satu item yang sama boleh memiliki pin CBT dan pin Practice secara independen karena kedua tampilan memakai record `exams` yang sama.

### 4.1 Ujian (CBT)

1. Terapkan filter kelayakan CBT yang sudah ada, termasuk publikasi dan target mode.
2. Terapkan pencarian dan filter yang dipilih pengguna.
3. Item yang dipin individual muncul sebelum kelompok lain, sesuai `sort_order`.
4. Konten dari subtes yang dipin mengikuti urutan subtes, lalu tanggal terbaru.
5. Konten lain mengikuti urutan default saat ini (terbaru).
6. Item yang dipin individual tidak boleh muncul dua kali di kelompok subtes.
7. Filter subtes yang dipilih pengguna tetap membatasi hasil; pin tidak boleh membatalkan filter.

Catatan: jika halaman depan memakai pengelompokan visual berdasarkan subtes, paket individual yang dipin perlu ditempatkan di bagian **Paket Prioritas** di atas kelompok, agar benar-benar tampil lebih dahulu dan tidak merusak struktur kelompok.

### 4.2 Materi

1. Terapkan aturan publikasi/visibilitas materi yang sudah ada.
2. Terapkan pencarian dan filter subject.
3. Item pin individual lebih dahulu menurut urutan.
4. Materi dalam subject yang dipin menyusul, dengan urutan terbaru di dalam kategori.
5. Materi lain mengikuti urutan default saat ini.
6. Terapkan urutan sebelum pagination tiga item per halaman.
7. Hindari duplikasi antara pin individual dan kategori.

### 4.3 Practice

1. Terapkan filter kelayakan Practice yang sudah ada; jangan ubah `show_results`, `target_mode`, atau normalisasi `activity_type`.
2. Terapkan pencarian, filter tipe, dan filter subjek sesuai perilaku saat ini.
3. Pin item Practice disimpan terpisah dari pin CBT, walaupun menunjuk ke UUID `exams.id` yang sama.
4. Kategori hanya diterapkan jika model daftar Practice menampilkan kelompok kategori yang sama. Jika halaman tetap berupa satu daftar campuran berdasarkan tipe aktivitas, kategori pin tidak boleh membuat struktur tampilan baru tanpa desain UI yang disetujui.
5. Aktivitas individual yang dipin dapat berada di atas daftar sesuai urutan pin.
6. Jenis aktivitas dan navigasi ke halaman pengerjaan tidak berubah.

**Aturan pilihan sort:** ketika pengguna memilih sort eksplisit `TITLE` atau `OLDEST`, pilihan eksplisit itu harus dihormati. Mode prioritas pin menjadi urutan default (atau pilihan sort bernama **Prioritas**) dan tidak diam-diam menimpa pilihan sort pengguna. Pada versi pertama, rekomendasi adalah menambahkan opsi sort **Prioritas** sebagai default, dengan opsi judul/terlama/terbaru tetap bekerja seperti sebelumnya.

### 4.4 Pengumuman

1. Hanya `is_active = true` yang dapat tampil.
2. Pengumuman pin individual muncul lebih dahulu sesuai urutan manual.
3. Pengumuman lain tetap terbaru lebih dahulu.
4. Pin tidak mengubah status aktif atau konten.
5. Jika tidak ada pengumuman pin, tampilan persis mengikuti urutan lama.

---

## 5. Arsitektur data yang direkomendasikan

### 5.1 Prinsip

Gunakan tabel metadata prioritas terpisah; jangan menambahkan kolom pin ke `exams`, `study_materials`, atau `announcements`. Dengan demikian data operasional konten tidak tercampur dengan metadata tata letak.

Nama tabel usulan: `homepage_content_pins`.

Skema konseptual yang lebih aman daripada satu `target_key` polimorfik:

| Kolom | Tipe usulan | Catatan |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `surface` | text/check | `cbt`, `practice`, `material`, `announcement` |
| `scope` | text/check | `item` atau `category` |
| `exam_id` | UUID nullable FK | Item CBT/Practice; `ON DELETE CASCADE` |
| `material_id` | UUID nullable FK | Item materi; `ON DELETE CASCADE` |
| `announcement_id` | UUID nullable FK | Item pengumuman; `ON DELETE CASCADE` |
| `category_key` | text nullable | Kategori dinormalisasi untuk surface terkait |
| `sort_order` | integer | Angka kecil tampil lebih dahulu |
| `created_at` | timestamptz | Audit dasar |
| `updated_at` | timestamptz | Audit perubahan |
| `updated_by` | UUID nullable | Admin pelaku perubahan |

Constraint yang harus dibuat pada migration:
- `surface` hanya menerima empat nilai yang didukung.
- `scope` hanya menerima `item` atau `category`.
- Untuk `scope = item`, tepat satu FK konten harus terisi dan harus cocok dengan surface:
  - `cbt` / `practice` → `exam_id`;
  - `material` → `material_id`;
  - `announcement` → `announcement_id`.
- Untuk `scope = category`, semua FK konten harus NULL dan `category_key` wajib terisi.
- Kategori hanya diizinkan pada `cbt`, `practice`, dan `material`; tidak untuk `announcement`.
- Unique partial index untuk satu item per surface dan satu kategori per surface.
- Index pada `(surface, scope, sort_order)`.
- FK item memakai `ON DELETE CASCADE`, sehingga konten yang dihapus tidak meninggalkan pin yatim.
- `sort_order` harus positif dan unik per surface/scope (gunakan unique partial index atau strategi pengurutan transaksional yang sesuai).

Penting: ini rancangan, bukan SQL final. Sebelum migration, validasi dukungan constraint/indeks pada PostgreSQL dan pastikan tidak ada duplikasi data yang menghalangi constraint.

### 5.2 Kategori

Sumber kategori yang benar:
- CBT: nilai teks `exams.subtest`; jangan menganggap foreign key ke `subtests.id`.
- Practice: nilai teks `exams.subtest`, tetapi hanya dipakai bila sesuai dengan struktur UI Practice.
- Materi: nilai teks `study_materials.subject`; jangan menganggap foreign key ke `subtests.id`.
- Pengumuman: tidak ada kategori pin pada versi pertama.

Normalisasi kategori untuk pencocokan:
- trim spasi di awal/akhir;
- normalisasi spasi berulang;
- perbandingan tidak peka huruf besar/kecil;
- simpan key stabil, dan tampilkan label asli yang diambil dari data konten.
- Jangan mengganti nilai asli `subtest`/`subject` pada konten.
- Jangan otomatis menggabungkan nama yang hanya tampak mirip tanpa tinjauan admin.

### 5.3 Mengapa bukan kolom di tabel konten?

- Satu paket `BOTH` perlu urutan CBT dan Practice yang berbeda.
- Menambah satu `pin_order` pada `exams` tidak dapat mewakili dua surface.
- Menambah beberapa kolom ke tabel konten memperluas perubahan pada tabel operasional yang sudah dipakai mesin pengerjaan.
- Tabel metadata terpisah memudahkan penambahan surface lain di masa depan dan dapat dihapus/diubah tanpa menyentuh data konten.

---

## 6. Keamanan dan akses

Audit sebelumnya menemukan policy/grant luas pada beberapa tabel operasional. Temuan ini perlu dicatat sebagai pekerjaan keamanan terpisah, bukan diperbaiki diam-diam dalam migration fitur pin.

**Larangan untuk scope fitur ini:**
- Jangan mengubah RLS, policy, grant, trigger, atau function pada `exams`, `questions`, `exam_sessions`, tabel jawaban, atau tabel percobaan Practice.
- Jangan mengubah RPC `start_practice_attempt` / `finish_practice_attempt` atau fungsi XP.
- Jangan mengubah `private.is_admin()` atau pola autentikasi admin yang sudah ada.
- Jangan memperluas hak tulis anon/authenticated pada tabel pin.

Rancangan keamanan:
- RLS aktif pada `homepage_content_pins`.
- Pengunjung/siswa hanya diberi hak SELECT yang diperlukan untuk membaca prioritas yang tidak sensitif.
- INSERT/UPDATE/DELETE dibatasi untuk admin terverifikasi.
- Jalur tulis utama melalui route handler server, menggunakan pemeriksaan admin server-side yang sudah dipakai proyek (setelah nama helper dan pola pemakaiannya diverifikasi ulang).
- Server memvalidasi surface, scope, ID target, status konten, dan kelayakan target untuk surface sebelum menyimpan.
- Jangan mempercayai `isAdmin`, role, atau ID pengguna dari payload browser.
- Untuk operasi reorder, gunakan transaksi/RPC khusus yang mengunci daftar per surface, memvalidasi semua ID dan urutan, lalu menyimpan perubahan atomik. Jangan melakukan banyak update independen yang dapat meninggalkan urutan setengah tersimpan.
- Jangan menggunakan service-role key di browser.
- Endpoint harus memvalidasi origin/CSRF mengikuti helper keamanan proyek, serta autentikasi admin.

Catatan: hak SELECT publik harus diselaraskan dengan RLS konten yang sudah berlaku. Bila membaca pin publik menyingkap metadata yang tidak perlu, gunakan server-side read atau batasi kolom/permukaan sesuai kebijakan proyek.

---

## 7. Rancangan kode lengkap — struktur file

Nama file berikut adalah usulan implementasi, belum dibuat.

### 7.1 File baru

| File | Tanggung jawab |
|---|---|
| `app/admin/pengaturan-beranda/page.tsx` | UI pusat empat tab |
| `components/admin/homepage-settings/HomepageSettings.tsx` | State tab, loading, error, refresh |
| `components/admin/homepage-settings/PriorityList.tsx` | Daftar prioritas dan tombol naik/turun |
| `components/admin/homepage-settings/ContentPicker.tsx` | Pencarian/filter item yang dapat dipin |
| `components/admin/homepage-settings/PinStatus.tsx` | Label pin dan status simpan |
| `lib/homepage-pins/types.ts` | Union type surface/scope dan DTO |
| `lib/homepage-pins/normalize.ts` | Normalisasi key kategori dan helper sort murni |
| `lib/homepage-pins/server.ts` | Baca/tulis metadata dari server; validasi target |
| `app/api/admin/homepage-pins/route.ts` | GET konfigurasi admin dan PUT reorder/bulk save |
| `app/api/admin/homepage-pins/item/route.ts` | POST pin/unpin satu item/kategori (opsional jika API tunggal tidak cukup) |
| `supabase/migrations/<timestamp>_create_homepage_content_pins.sql` | Tabel, constraint, index, RLS, policy tabel baru saja |

Rekomendasi API sederhana: satu route `/api/admin/homepage-pins` dengan GET dan PUT untuk konfigurasi per surface, serta PATCH untuk aksi pin/unpin jika lebih jelas. Hindari membuat banyak endpoint kecil tanpa kebutuhan.

### 7.2 File yang diintegrasikan

| File | Perubahan terbatas |
|---|---|
| `app/page.tsx` | Memuat metadata prioritas dan mengurutkan daftar CBT, materi, pengumuman |
| `app/practice/page.tsx` | Memuat metadata surface Practice dan mengurutkan daftar aktivitas |
| `components/admin/AdminSidebar.tsx` | Menambahkan menu Pengaturan Beranda |
| `app/admin/bank-soal/page.tsx` | Opsional: pintasan pin CBT, tidak mengubah form paket |
| `app/admin/practice/page.tsx` | Opsional: pintasan pin Practice, tidak mengubah editor aktivitas |
| `app/admin/konten/page.tsx` | Opsional: pintasan pin materi/pengumuman, tidak mengubah isi editor |

Untuk rilis pertama, saya merekomendasikan **pusat pengaturan saja**. Pintasan di tiga halaman pengelolaan dapat ditambahkan setelah alur pusat terbukti stabil. Ini mengurangi jumlah file yang berubah pada rilis awal dan mempermudah diagnosis.

### 7.3 File yang dilarang berubah dalam scope fitur

- `app/exam/[id]/page.tsx`
- `app/practice/[id]/page.tsx`
- komponen engine CBT/Practice;
- tabel `questions`, `exam_sessions`, jawaban CBT;
- tabel percobaan/jawaban Practice;
- RPC pengerjaan, penilaian, XP, badge, dan progres;
- editor WYSIWYG soal/materi.

Jika implementasi ternyata membutuhkan perubahan salah satu file tersebut, hentikan dan minta persetujuan baru beserta analisis dampaknya.

---

## 8. Kontrak tipe dan algoritma

### 8.1 Tipe domain

Rancangan tipe TypeScript:

```ts
export type HomepageSurface =
  | 'cbt'
  | 'practice'
  | 'material'
  | 'announcement'

export type HomepagePinScope = 'item' | 'category'

export type HomepagePin = {
  id: string
  surface: HomepageSurface
  scope: HomepagePinScope
  exam_id: string | null
  material_id: string | null
  announcement_id: string | null
  category_key: string | null
  sort_order: number
  updated_at: string
}

export type HomepagePinUpdate = {
  surface: HomepageSurface
  scope: HomepagePinScope
  itemIds?: string[]
  categoryKeys?: string[]
}
```

DTO UI sebaiknya menambahkan label dan ringkasan dari query konten, tetapi jangan menyimpan judul sebagai sumber kebenaran di tabel pin.

### 8.2 Normalisasi kategori

```ts
export function normalizeCategory(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\\s+/g, ' ')
    .toLocaleLowerCase('id-ID')
}
```

Normalisasi hanya untuk membandingkan kategori. Jangan menulis hasil normalisasi kembali ke kolom konten.

### 8.3 Algoritma pengurutan

Buat helper murni yang tidak melakukan query dan tidak mengubah objek asli:

```ts
type SortableContent = {
  id: string
  created_at?: string | null
  category?: string | null
}

type SortMode = 'PRIORITY' | 'NEWEST' | 'OLDEST' | 'TITLE'

function applyHomepagePriority<T extends SortableContent>(
  rows: T[],
  itemOrder: Map<string, number>,
  categoryOrder: Map<string, number>,
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
    const aItem = itemOrder.get(a.id)
    const bItem = itemOrder.get(b.id)
    const aPinned = aItem !== undefined
    const bPinned = bItem !== undefined

    if (aPinned !== bPinned) return aPinned ? -1 : 1
    if (aPinned && bPinned && aItem !== bItem) return aItem! - bItem!

    const aCategory = normalizeCategory(a.category)
    const bCategory = normalizeCategory(b.category)
    const aCategoryOrder = categoryOrder.get(aCategory)
    const bCategoryOrder = categoryOrder.get(bCategory)
    const aCategoryPinned = aCategoryOrder !== undefined
    const bCategoryPinned = bCategoryOrder !== undefined

    if (aCategoryPinned !== bCategoryPinned) {
      return aCategoryPinned ? -1 : 1
    }
    if (
      aCategoryPinned &&
      bCategoryPinned &&
      aCategoryOrder !== bCategoryOrder
    ) {
      return aCategoryOrder! - bCategoryOrder!
    }

    const dateDelta =
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    return dateDelta || a.id.localeCompare(b.id)
  })
}
```

Catatan:
- Fungsi di atas adalah rancangan algoritma, bukan kode siap tempel tanpa integrasi.
- Untuk judul, gunakan judul aktual dari tiap tipe data.
- Untuk CBT, filter target mode harus dijalankan sebelum helper.
- Untuk Practice, filter target mode, `show_results`, tipe aktivitas, pencarian dan filter subject harus dijalankan sesuai urutan perilaku sekarang. Mode PRIORITY menjadi default baru; sort eksplisit TITLE/OLDEST/NEWEST tetap bekerja seperti sekarang.
- Untuk materi, filter dan sort prioritas dijalankan sebelum pagination.
- Untuk pengumuman, filter `is_active` dijalankan sebelum helper.
- Jangan mengandalkan urutan hasil query pin dari database; map dibuat dari `sort_order` yang sudah divalidasi.
- ID menjadi pemecah seri akhir agar urutan stabil.

### 8.4 Kegagalan metadata pin

Buat helper pembaca yang mengembalikan daftar kosong jika query pin gagal, sambil mencatat error untuk observabilitas. Jangan melempar error pin ke boundary pemuatan konten utama.

Pola konseptual:

```ts
const [contentResult, pinResult] = await Promise.all([
  loadVisibleContent(),
  loadHomepagePins(surface).catch(() => [])
])

const pins = Array.isArray(pinResult) ? pinResult : []
const visibleContent = applyExistingVisibilityRules(contentResult)
const orderedContent = applyHomepagePriority(
  visibleContent,
  buildItemOrder(pins),
  buildCategoryOrder(pins),
  'PRIORITY',
  getContentTitle
)
```

Jangan mengganti seluruh logika pemuatan halaman dengan contoh ringkas ini. Pertahankan error handling, auth/profile loading, dan filter yang sudah ada.

---

## 9. API dan penyimpanan urutan

### 9.1 API yang disarankan

`GET /api/admin/homepage-pins?surface=cbt`
- Hanya admin.
- Mengembalikan daftar pin dan daftar konten yang dapat dipilih untuk surface.
- Pagination/search untuk picker bila jumlah konten besar.

`PUT /api/admin/homepage-pins`
- Hanya admin.
- Menerima satu surface dan daftar item/category dalam urutan final.
- Validasi tidak ada ID duplikat.
- Validasi semua target memang milik surface dan layak diprioritaskan.
- Menyimpan seluruh urutan secara atomik.
- Mengembalikan konfigurasi final yang tersimpan.

Untuk tombol pintas di masa depan, gunakan endpoint yang sama melalui payload reorder/single-item yang tervalidasi. Jangan buat jalur database berbeda.

### 9.2 Validasi server

- Surface harus salah satu dari empat nilai resmi.
- Scope harus cocok dengan surface.
- ID harus UUID valid.
- CBT hanya menerima exam yang published dan tidak `PRACTICE_ONLY`.
- Practice hanya menerima exam yang published, memenuhi syarat Practice yang ada, dan bukan `CBT_ONLY`.
- Materi harus memenuhi aturan tampil materi yang ada.
- Pengumuman harus `is_active = true`.
- Kategori harus benar-benar ada pada data yang eligible.
- Batas payload dan jumlah ID perlu ditetapkan untuk mencegah request berlebihan.
- Jangan mengubah publication/active/target_mode dari endpoint pin.

### 9.3 Reorder atomik

Urutan tidak boleh disimpan dengan loop update browser-side. Rekomendasi:
- endpoint server menerima array urutan final;
- transaksi database/RPC khusus mengunci baris daftar surface terkait;
- validasi dan tulis urutan dalam satu transaksi;
- gunakan nomor urut rapat (1..N) setelah setiap save;
- rollback seluruh operasi jika satu target tidak valid;
- update `updated_at` dan `updated_by`.

Jangan membuat RPC security-definer sebelum meninjau search_path, grant EXECUTE, dan validasi role. Pilih satu pola server-side yang konsisten dengan keamanan proyek.

---

## 10. Rencana migration

Migration hanya membuat tabel baru dan policy untuk tabel baru. Migration tidak boleh memodifikasi tabel operasional yang telah ada.

Checklist migration:
1. Pastikan nama tabel belum dipakai.
2. Buat tabel dan CHECK constraints.
3. Buat foreign key nullable dengan `ON DELETE CASCADE`.
4. Buat unique partial indexes sesuai surface/scope.
5. Buat index pencarian berdasarkan surface/scope/order.
6. Aktifkan RLS.
7. Buat policy SELECT sesuai kebutuhan tampilan publik.
8. Batasi write; tidak ada policy publik `WITH CHECK (true)`.
9. Berikan grant minimum.
10. Pastikan tidak ada trigger/function yang menyentuh tabel ujian, soal, sesi, atau Practice.
11. Uji rollback pada lingkungan pengujian database yang tersedia sebelum migration produksi. Jika tidak ada lingkungan terpisah, lakukan pemeriksaan SQL statis dan backup/restore plan; jangan menganggap Preview Vercel sebagai pengganti pengujian database.

Migration harus idempoten sejauh pola migration proyek mengizinkan, tetapi jangan memakai `IF NOT EXISTS` untuk menyembunyikan konflik skema yang tidak dipahami.

---

## 11. File-by-file implementation plan

### Tahap A — domain dan server
1. `lib/homepage-pins/types.ts`: tipe surface, scope, record, DTO.
2. `lib/homepage-pins/normalize.ts`: normalisasi kategori dan helper urutan murni.
3. `lib/homepage-pins/server.ts`: fungsi baca, validasi target, simpan atomik.
4. `app/api/admin/homepage-pins/route.ts`: GET/PUT.
5. Migration tabel metadata pin dan RLS baru.

### Tahap B — pusat admin
6. `app/admin/pengaturan-beranda/page.tsx`.
7. Komponen tab, picker, daftar prioritas, tombol naik/turun, pesan error/sukses.
8. Tambahkan menu ke `components/admin/AdminSidebar.tsx`.
9. Tidak menambah pintasan pada halaman pengelolaan lama di rilis pertama.

### Tahap C — integrasi tampilan
10. `app/page.tsx`: CBT, materi, pengumuman.
11. `app/practice/page.tsx`: Practice.
12. Pastikan sort mode prioritas tidak menghapus pilihan sort lama.
13. Pastikan pagination dan filter berjalan setelah eligibility rules.

### Tahap D — pintasan opsional (rilis berikutnya)
14. `app/admin/bank-soal/page.tsx`.
15. `app/admin/practice/page.tsx`.
16. `app/admin/konten/page.tsx`.

Tahap D sengaja tidak masuk rilis awal agar jumlah file dan risiko integrasi lebih kecil. Pusat admin tetap sudah dapat mengatur semua empat surface.

---

## 12. Matriks risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Pin CBT ikut mengubah Practice karena tabel exams sama | Urutan salah di salah satu halaman | Simpan surface terpisah dan uji paket BOTH |
| Draft/hidden muncul karena pin | Konten yang belum boleh tampil terlihat | Visibility filter selalu lebih dahulu; validasi server |
| Pin mengubah token/jadwal/konfigurasi | Gangguan CBT | Tidak mengubah tabel exams; metadata terpisah |
| Mesin CBT terdampak | Siswa gagal ujian | Tidak mengubah route pengerjaan/session/answers |
| Mesin Practice terdampak | Progres/XP hilang | Tidak mengubah route pengerjaan/RPC/attempts |
| Kategori berbeda kapitalisasi | Pin tidak cocok | Normalisasi key untuk pencocokan, label asli dipertahankan |
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
- [ ] Filter tipe, pencarian dan filter subjek tetap bekerja.
- [ ] Quiz, Maze, Maze V2, Flashcard dapat dimulai dan diselesaikan.
- [ ] Progres, XP, streak, badge, attempt dan jawaban tetap utuh.

### Materi
- [ ] Aturan status/visibilitas yang sekarang tidak berubah.
- [ ] Pin item dan kategori tidak menampilkan duplikat.
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

## 16. Keputusan yang sudah ditetapkan dan yang masih terbuka

### Sudah disepakati
- Satu pusat admin bernama Pengaturan Beranda.
- Empat tab: Ujian, Materi, Practice, Pengumuman.
- CBT dan Practice memiliki prioritas yang terpisah walaupun memakai tabel `exams` yang sama.
- Pin hanya metadata tampilan.
- Mesin pengerjaan CBT dan Practice harus tetap tidak berubah.
- Tidak menggunakan Preview atau branch lain.
- Mengutamakan satu rangkaian perubahan agar hemat deployment.

### Perlu dikunci sebelum coding
1. Apakah kategori pin Practice akan ditampilkan sebagai kelompok UI atau hanya item pin? Rekomendasi: hanya aktifkan kategori bila sesuai dengan struktur UI Practice yang nyata; jika tidak, rilis pertama item pin saja.
2. Apakah pengumuman perlu pin item saja? Rekomendasi: ya.
3. Apakah pilihan sort Practice `PRIORITY` dijadikan default baru dengan opsi lama tetap tersedia? Rekomendasi: ya.
4. Apakah pusat admin saja cukup untuk rilis pertama tanpa tombol pintas di halaman pengelolaan lama? Rekomendasi: ya, demi mengurangi risiko dan file berubah.

---

## 17. Batas status dokumen

Dokumen ini adalah rancangan teknis untuk ditinjau. Pada tahap ini:
- belum ada file aplikasi yang diubah;
- belum ada migration dibuat atau dijalankan;
- belum ada policy/RLS/grant database yang diubah;
- belum ada data pin yang ditulis;
- belum ada commit implementasi;
- belum ada deployment atau uji runtime.

Implementasi hanya dimulai setelah rancangan kode, SQL migration, dan daftar file yang berubah disetujui secara eksplisit.
