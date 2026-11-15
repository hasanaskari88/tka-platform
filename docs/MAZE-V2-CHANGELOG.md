# Arsip Perubahan Maze V2

Tanggal: 15 November 2026  
Cabang: `main`

## Tujuan

Merapikan pengalaman Maze V2 tanpa mengubah sistem XP lama atau konfigurasi proyek lain.

## Perubahan

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

Build dan lint perlu dijalankan pada lingkungan proyek. Perubahan melalui GitHub API tidak menjalankan build lokal secara otomatis; status pemeriksaan akan dilaporkan terpisah dan tidak akan diklaim lulus tanpa hasil nyata.
