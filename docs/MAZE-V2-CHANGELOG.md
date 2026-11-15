# Arsip Perubahan Maze V2

Tanggal: 15 November 2026  
Cabang: `main`

## Tujuan

Merapikan pengalaman Maze V2 tanpa mengubah sistem XP lama atau konfigurasi proyek lain.

## Perubahan

### Revisi visual lanjutan

- Papan diberi alas pulau 3D hijau dengan sisi tebal agar keseluruhan labirin terlihat sebagai arena, bukan sekadar petak berwarna.
- Petak jalan diperbesar dan diberi permukaan krem terang dengan tepian serta pola tengah yang lebih tegas.
- Dinding dibuat lebih tinggi dan diberi detail susunan batu agar perbedaan jalan dan penghalang mudah dikenali.
- Legenda papan diperjelas dengan label teks untuk robot, titik mulai, tujuan, jalan yang dapat dilalui, dan dinding yang tidak boleh dilewati.
- Kontrol rotasi dipindahkan menjadi panel tersendiri yang terlihat jelas, dengan label Putar kiri 90 derajat, Kembalikan Posisi awal, Putar kanan 90 derajat, dan petunjuk bahwa rotasi hanya mengubah tampilan.

1. **Kategori aktivitas:** `MAZE_GAME_V2` dinormalisasi ke kategori Maze yang sudah ada (`MAZE_GAME`), termasuk perhitungan ringkasan aktivitas.
2. **Jalur labirin:** petak yang bisa dilalui memakai permukaan krem/kuning dengan garis pembatas kontras; dinding tetap memakai tampilan batu.
3. **Rotasi papan:** kontrol putar kiri/kanan 90 derajat. Koordinat robot, titik mulai, tujuan, dan dinding diputar bersama secara visual; aturan gerak tetap memakai koordinat asli.
4. **Pemulihan progres:** ID attempt dan daftar level selesai disimpan di penyimpanan lokal browser berdasarkan pengguna dan modul. Muat ulang pada browser yang sama akan melanjutkan attempt yang sama, bukan membuat attempt baru. Status akhir juga disimpan agar pemuatan ulang setelah selesai tidak memulai attempt baru.
5. **Pencegahan hadiah ganda:** finalisasi tetap menggunakan RPC `finish_practice_attempt` yang sudah ada; tidak menambah jalur pemberian XP baru. Pemanggilan ulang pada attempt yang sudah selesai mengikuti perilaku idempoten RPC tersebut.

## Batasan penyimpanan

Pemulihan progres lokal berlaku pada browser/perangkat yang sama dan selama data situs di browser tidak dihapus. Tidak ada perubahan skema database atau migrasi baru pada pekerjaan ini.

## Bagian yang sengaja tidak diubah

- Rumus XP, bonus penyelesaian, streak, dan RPC pemberian XP.
- Pengaturan keamanan, RLS, policy, grant, privilege, maupun OAuth.
- Mesin gerak dan aturan tabrakan robot, selain tampilan arah robot ketika papan diputar.

## Pemeriksaan

- **Build produksi Vercel:** berhasil (`READY`) untuk commit implementasi Maze V2.
- **Kompilasi Next.js:** berhasil.
- **Pemeriksaan TypeScript:** selesai tanpa error.
- **Pembuatan halaman statis:** berhasil, 38 dari 38 halaman.
- **Lint terpisah:** belum dijalankan sebagai perintah tersendiri.
- **Revisi visual isometrik sebelumnya:** build produksi Vercel terkonfirmasi `READY` pada 15 November 2026 (commit `02695ab47acb2e8e1f39fc08d5a3ee338baa760c`).
- **Revisi tampak atas berwarna-warni:** menunggu build produksi setelah commit revisi ini.

Catatan build dapat diverifikasi melalui riwayat deployment Vercel pada commit implementasi di cabang `main`.


---

## Pengembangan Maze V1 menjadi Blockly

Tanggal: 15 November 2026  
Cabang: `main`

### Keputusan arsitektur

- Maze V2 dipertahankan sebagai aktivitas terpisah dengan mesin dan papan yang sudah ada.
- Maze V1 (`MAZE_GAME`) dikembangkan menjadi permainan pemrograman visual Blockly.
- Kedua aktivitas tetap memakai tipe aktivitas dan mesin yang berbeda; perubahan Maze V1 tidak mengganti implementasi Maze V2.

### Perubahan Maze V1

- Area labirin diganti menjadi arena SVG 3D isometrik ringan dengan pulau rumput, jalur bertingkat, dinding batu, robot, titik mulai, dan portal tujuan.
- Gudang balok menyediakan perintah Maju, Belok Kiri, dan Belok Kanan.
- Balok dapat diseret dengan pointer (mouse atau sentuhan) ke rangkaian program dan dipindahkan urutannya.
- Balok juga dapat ditambahkan dengan ketukan sebagai alternatif aksesibilitas.
- Program dibatasi maksimal 30 blok.
- Mesin gerak, deteksi tabrakan, perpindahan misi, dan finalisasi tetap menggunakan alur Maze V1 yang sudah ada.
- RPC `start_practice_attempt`, `finish_practice_attempt`, dan `abandon_practice_attempt` tidak diubah. Tidak ada perubahan rumus XP atau mekanisme hadiah.

### Pemeriksaan

- Implementasi awal sudah ditulis ke cabang `main`.
- Build produksi Vercel terkonfirmasi `READY` untuk commit `f8c9ff1c6789693036931bee3819da829d3db5b7`.
- Next.js berhasil dikompilasi; pemeriksaan TypeScript selesai; 38 dari 38 halaman statis berhasil dibuat.
- Revisi awal yang mengalami kesalahan sintaks diperbaiki sebelum deployment `READY`.


### Perbaikan orientasi robot Maze V1

- Memperbaiki ilustrasi robot agar badan tetap tegak saat menghadap ke empat arah.
- Arah gerak sekarang ditunjukkan dengan kompas kecil di atas robot; badan robot tidak lagi ikut diputar hingga tampak rebah.
- Perubahan hanya menyentuh komponen papan Maze V1.


### Koreksi bentuk peta Maze V1 mengikuti Blockly Maze

- Mengganti proyeksi isometrik/menyerong dengan grid ortogonal: petak berbentuk persegi dan baris/kolom tegak lurus.
- Robot tetap tegak di atas petak; arah hadap ditampilkan terpisah.
- Jalur, titik mulai, tujuan, dan penghalang disajikan pada koordinat grid yang sama.
- Perubahan hanya pada visual papan Maze V1; mesin perintah, aturan gerak, penilaian, XP, dan Maze V2 tidak diubah.

### Blockly V1: kondisi, pengulangan, dan tema level

- Menambahkan editor program berbasis balok bertingkat untuk Maze V1.
- Balok kondisi **Jika jalan di depan terbuka** menjalankan perintah yang ditempatkan di dalam bagian **MAKA** hanya ketika petak di depan dapat dilalui.
- Balok **Ulangi** mendukung pilihan 2, 3, 4, 5, 6, 8, dan 10 kali; balok perintah dapat dimasukkan ke dalamnya.
- Balok di dalam kondisi/pengulangan dapat ditambah, dihapus, dan diubah urutannya.
- Mesin menjalankan blok secara rekursif dan membatasi eksekusi maksimal 120 langkah untuk mencegah pengulangan tak terkendali.
- Papan Maze V1 menggunakan grid tampak atas yang lurus, warna ceria, robot tegak, serta tema lingkungan berganti berdasarkan urutan level: padang, pantai, salju, kebun ajaib, dan hutan.
- Penghalang divisualisasikan rendah (sekitar seperempat tinggi karakter) agar tidak menutupi robot.
- Perubahan tidak menyentuh Maze V2, RPC attempt, formula XP, maupun sistem penilaian.
- Catatan kompatibilitas: data rintangan lama masih berupa koordinat petak (obstacles). Dinding antar-petak dengan koordinat sisi khusus memerlukan perluasan format data misi terpisah agar dapat diedit secara akurat tanpa menafsirkan ulang data lama.

## Audit dan penyegaran Maze V2

Tanggal: 15 November 2026  
Cabang: `main`

### Hasil audit

- Mesin Maze V2 dan Maze V1 tetap terpisah; Maze V1 tidak disentuh dalam revisi ini.
- Komponen papan juga dipakai oleh editor admin. Karena itu, kemampuan memilih petak, mengatur titik mulai/tujuan, dan mengelola rintangan tetap dipertahankan.
- Menghapus konstanta arah `ARROWS` yang tidak digunakan dari mesin V2.
- Menghapus properti `rotation` yang tidak memiliki implementasi maupun pemanggil dari kontrak papan V2.
- Mempertahankan penyimpanan progres lokal, pemulihan attempt, RPC mulai/selesai/tinggalkan latihan, serta penguncian finalisasi agar XP tidak diberikan melalui jalur baru.

### Penyegaran tampilan dan interaksi

- Merapikan layar menjadi panel peta petualangan, pemilih level, gudang perintah, dan area program yang lebih jelas.
- Menambahkan indikator progres lima level dan status level yang lebih mudah dibaca.
- Menambahkan seret-lepas untuk mengubah urutan blok perintah; tombol panah tetap tersedia sebagai alternatif untuk perangkat sentuh.
- Memperjelas tampilan blok Maju, Belok, Ulangi, dan Jika Jalan Terbuka dengan warna berbeda.
- Menambahkan lima suasana arena berdasarkan level: Pulau Langit, Lembah Pelangi, Gunung Es, Hutan Zamrud, dan Kawah Kristal.
- Tema yang sama ditampilkan di pratinjau editor admin.

### Validasi level

- Hadiah akhir hanya difinalisasi bila tersedia tepat satu misi untuk masing-masing Level 1–5.
- Jika ada level yang hilang atau ganda, layar menampilkan peringatan agar guru memperbaiki susunan level; data yang ada tidak dihapus otomatis.
- Tidak ada perubahan skema database, RLS, policy, grant, privilege, OAuth, rumus XP, atau RPC.
