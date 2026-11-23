# Rencana Fitur Pin Subtes dan Paket Konten

Status: **Rancangan — belum diimplementasikan**
Tanggal: 23 November 2026
Repository: `hasanaskari88/tka-platform`
Target implementasi yang disepakati pengguna: branch `main` saja; tidak menggunakan Preview atau branch lain.

## 1. Tujuan

Memberi admin kendali untuk menonjolkan materi dan paket ujian penting di halaman utama, tanpa bergantung pada tanggal pembuatan. Konten lama yang masih relevan dapat tetap berada di posisi atas.

Fitur terdiri dari dua tingkat yang dapat digunakan bersama:

- **A — Pin subtes/kategori:** menempatkan satu subtes lebih dahulu pada daftar yang sesuai.
- **B — Pin konten individual:** menempatkan paket ujian atau materi tertentu lebih dahulu, tanpa harus memindahkan seluruh subtesnya.

Pin hanya mengatur urutan tampilan. Pin tidak menerbitkan konten, tidak mengubah status aktif/publikasi, tidak mengubah mode ujian, dan tidak mengubah hak akses.

## 2. Perilaku yang diusulkan di halaman utama

Urutan untuk daftar ujian dan daftar materi dikelola secara terpisah:

1. Konten yang dipin secara individual, mengikuti urutan pin manual.
2. Konten dari subtes/kategori yang dipin, mengikuti urutan subtes manual.
3. Konten lain yang tidak dipin, mengikuti urutan terbaru seperti sekarang.

Di dalam kelompok yang sama, urutan default tetap terbaru lebih dahulu. Bila beberapa konten individual dipin, admin dapat mengatur urutannya.

Aturan tambahan:

- Pin paket individual memiliki prioritas tertinggi pada daftar jenis kontennya, meskipun subtesnya tidak dipin.
- Pin subtes tidak otomatis mem-pin semua paket satu per satu; ia hanya menaikkan kelompoknya.
- Jika suatu konten sekaligus berada di subtes yang dipin dan dipin individual, aturan pin individual yang menentukan posisinya.
- Filter pencarian, filter subtes, filter mode ujian/praktik, pagination, dan aturan publikasi yang sudah ada tetap berlaku.
- Konten yang tidak boleh tampil menurut aturan publikasi/akses saat ini tetap tidak ditampilkan, walaupun memiliki pin.
- Admin dapat melepas pin kapan saja. Konten kembali mengikuti urutan normal tanpa menghapus atau mengubah datanya.

## 3. Pengaturan admin yang diusulkan

### Pengaturan subtes

Pada pengelolaan subtes, sediakan pengaturan terpisah:

- Pin subtes di daftar ujian: aktif/nonaktif dan urutan.
- Pin kategori/subtes di daftar materi: aktif/nonaktif dan urutan.

Pemisahan ini penting agar admin dapat menonjolkan subtes untuk ujian tanpa harus menonjolkan kategori yang sama pada materi, atau sebaliknya.

### Pengaturan paket ujian dan materi

Pada setiap baris/kartu konten di admin:

- Tombol Pin / Lepas pin.
- Penanda status Dipin.
- Pengaturan urutan untuk konten yang sedang dipin.
- Pengaturan ini tidak menggantikan status publikasi, status aktif, atau target mode.

Sebaiknya tersedia aksi cepat di daftar admin dan pengaturan urutan yang jelas. Perubahan urutan tidak perlu mengubah tanggal pembuatan konten.

## 4. Rancangan data — masih konseptual

Kemungkinan kebutuhan data:

| Entitas | Data konseptual | Fungsi |
|---|---|---|
| Subtes/kategori | urutan pin daftar ujian | Prioritas kelompok pada daftar ujian |
| Subtes/kategori | urutan pin daftar materi | Prioritas kelompok pada daftar materi |
| Paket ujian | status pin dan urutan pin | Prioritas paket ujian individual |
| Materi | status pin dan urutan pin | Prioritas materi individual |

Pilihan implementasi yang disarankan setelah audit skema:

- Gunakan nilai urutan nullable (misalnya `exam_pin_order`, `material_pin_order`, `pin_order`). Nilai kosong berarti tidak dipin; angka lebih kecil berarti tampil lebih dahulu.
- Untuk paket ujian dan materi, kolom urutan pin nullable dapat sekaligus menjadi status pin. Dengan begitu tidak perlu menyimpan dua penanda yang bisa berbeda (misalnya `is_pinned` dan `pin_order`).
- Bila diperlukan untuk UI, status pin dapat diturunkan dari apakah nilai urutan pin terisi.
- Jangan menambahkan `pinned_at` kecuali ada kebutuhan audit yang nyata.

**Penting:** nama tabel, hubungan subtes dengan ujian, dan hubungan kategori dengan materi harus diperiksa langsung sebelum membuat migration. Kode halaman utama yang diperiksa saat perancangan membaca `exams.subtest` dan memuat `study_materials`, tetapi catatan ini belum memastikan bahwa materi memakai relasi subtes yang sama. Jangan menganggap kolom atau relasi tersebut sudah ada.

Jika materi tidak mempunyai relasi subtes yang konsisten, gunakan kategori materi yang memang sudah dipakai aplikasi; jangan membuat relasi baru secara spekulatif.

## 5. Aturan pengurutan teknis

Untuk masing-masing daftar secara terpisah:

1. Kelompokkan konten dengan pin individual terlebih dahulu, urutkan berdasarkan nomor pin.
2. Setelah itu, tampilkan konten dalam subtes/kategori yang dipin, urutkan berdasarkan prioritas subtes lalu tanggal terbaru.
3. Terakhir, tampilkan konten yang tidak dipin berdasarkan tanggal terbaru.
4. Tambahkan pemecah seri yang stabil (misalnya tanggal terbaru lalu ID) agar urutan tidak berubah-ubah.

Penerapan harus mempertahankan filter yang sudah aktif. Pin bukan alasan untuk menampilkan konten yang sebelumnya tersembunyi oleh filter.

Jika halaman memakai pagination di sisi server, pengurutan harus dilakukan sebelum pagination. Jika seluruh daftar sudah dimuat lalu difilter di browser, pengurutan dilakukan pada data hasil filter sebelum pagination. Jangan mengurutkan hanya halaman yang sedang terlihat karena hasilnya bisa keliru.

## 6. Kompatibilitas dan migrasi

- Nilai pin yang belum ada/kosong harus diperlakukan sebagai tidak dipin. Konten lama tetap tampil dengan urutan terbaru seperti sekarang.
- Migration harus aditif: menambah kolom yang diperlukan tanpa menghapus atau menulis ulang data konten.
- Default semua konten lama adalah tidak dipin.
- Pastikan query halaman utama tetap dapat membaca data ketika migration sudah diterapkan.
- Periksa RLS dan grant yang berlaku; jangan memperlebar akses publik hanya demi fitur pin.
- Pengubahan pin dilakukan melalui akses admin yang sudah ada. Jangan mempercayai nilai admin dari browser tanpa verifikasi server/database sesuai pola keamanan aplikasi.
- Jangan mengubah penilaian, sesi CBT, jawaban, XP, badge, atau relasi kepemilikan konten.

## 7. Tahapan implementasi yang disarankan

1. **Audit sebelum coding:** periksa struktur tabel subtes, exams, study_materials, query halaman utama, filter, pagination, serta halaman pengelolaan konten admin.
2. **Kunci rancangan data:** tentukan relasi kategori yang benar untuk materi dan ujian; baru susun migration aditif.
3. **Pengaturan admin:** buat kontrol pin subtes/kategori dan pin individual beserta pengurutan.
4. **Halaman utama:** terapkan pengurutan terpisah untuk daftar ujian dan materi, sambil mempertahankan filter serta status publikasi.
5. **Pemeriksaan:** verifikasi konten lama, konten baru, pin individual, pin subtes, kombinasi keduanya, lepas pin, filter, pagination, dan akses siswa/admin.
6. **Rilis:** perubahan kode dan database hanya dilakukan setelah rancangan serta migration disetujui pengguna.

## 8. Batas pekerjaan saat ini

- Belum ada kode aplikasi yang diubah.
- Belum ada migration atau perubahan database.
- Belum ada perubahan RLS, policy, grant, trigger, atau function.
- Belum ada deployment.
- Rancangan ini bukan persetujuan otomatis untuk menjalankan migration atau merilis fitur.

## 9. Keputusan yang perlu dikonfirmasi sebelum implementasi

1. Apakah urutan pin subtes untuk ujian dan materi memang perlu diatur secara terpisah? Rancangan ini merekomendasikan **ya**.
2. Apakah admin perlu mengatur nomor urut pin secara manual? Rancangan ini merekomendasikan **ya**, dengan angka kecil tampil lebih dahulu.
3. Apakah pin individual harus selalu berada di atas subtes yang dipin? Rancangan ini merekomendasikan **ya**.

