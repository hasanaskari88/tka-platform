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
