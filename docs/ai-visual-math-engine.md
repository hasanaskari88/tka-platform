# AI Visual Math Engine

## Tujuan dan prinsip

Visual Math Engine menjadi satu sumber kebenaran matematika untuk analisis soal,
pemeriksaan pilihan/kunci, dan pembuatan diagram. AI mengenali maksud serta
mengambil fakta dari teks. Program memvalidasi fakta, menghitung nilai secara
deterministik, lalu menggambar dari intent yang lolos validasi.

Prinsip wajib:

1. Hasil hitung AI tidak pernah dipakai sebagai jawaban final.
2. Fakta hasil AI harus memiliki kutipan bukti yang benar-benar terdapat dalam
   teks soal.
3. Struktur, rentang angka, satuan, dan relasi intent diperiksa oleh program.
4. Fakta yang tidak lengkap, bertentangan, atau tidak terbukti tidak boleh
   menghasilkan gambar.
5. Soal lama, formulir Asisten AI, alur gambar nonmatematika, dan sistem skor
   yang sudah ada harus tetap kompatibel.
6. Tidak ada perubahan skema database atau aturan penilaian sebagai bagian dari
   pekerjaan Visual Math Engine.

## Intent yang didukung

- category_of_total: satu kategori dari keseluruhan kategori.
- equal_sharing: pembagian sejumlah objek ke beberapa kelompok.
- fraction_partition: partisi satu keseluruhan menjadi bagian yang sama.
- number_comparison: perbandingan dua bilangan rasional.
- number_line: garis bilangan dengan rentang dan titik yang eksplisit.
- geometry: gambar bangun datar/ruang dengan ukuran yang disebutkan.
- chart_table: diagram batang, piktograf, atau tabel dari data eksplisit.

Intent geometri hanya memvisualisasikan bentuk dan ukuran yang tersedia. Mesin
tidak boleh menyimpulkan luas, keliling, atau volume jika operasi yang diminta
dan data yang diperlukan belum didefinisikan secara eksplisit.

## Kontrak nilai dan satuan

Bilangan rasional disimpan sebagai string pembilang dan penyebut integer.
Operasi internal memakai BigInt agar tidak terkena pembulatan floating point.
Parser menerima pecahan, pecahan campuran, LaTeX, desimal, persen, dan simbol
pecahan Unicode umum. Input terlalu panjang, penyebut nol, atau format ambigu
ditolak.

Quantity parser mendukung satuan panjang, massa, waktu, volume, dan beberapa
jenis hitungan. Satuan yang berbeda tidak boleh dianggap setara tanpa aturan
konversi yang eksplisit.

## Alur analisis

1. Endpoint hanya dapat dipanggil admin tepercaya dan memeriksa same-origin.
2. Pola yang sudah dikenal diproses deterministik terlebih dahulu.
3. Untuk pola lain, AI mengembalikan intent, fakta terstruktur, confidence, dan
   kutipan bukti dari teks soal.
4. Program memastikan kutipan benar-benar muncul di teks soal, memeriksa
   fakta dan batasnya, lalu menjalankan validateVisualIntent.
5. calculateVisualIntent menghitung nilai atau memastikan data visual siap.
6. Renderer dipilih berdasarkan intent tervalidasi. Hasil kosong atau renderer
   yang gagal tidak boleh diunggah.
7. Jika satu tahap gagal, guru menerima alasan dan tidak dibuatkan gambar
   matematika yang menebak.

AI tidak diberi wewenang menentukan hasil hitung. Confidence minimum untuk
intent AI adalah 0,85; confidence bukan pengganti pemeriksaan fakta.

## Batas implementasi

Batas input saat ini sengaja konservatif: kategori buah/objek maksimum 4
kategori dan total 40 objek; pembagian sama rata maksimum 40 objek dan 12
kelompok; partisi maksimum 20 bagian; garis bilangan maksimum 10 titik;
geometri maksimum 4 ukuran; data diagram/tabel maksimum 10 kategori dengan
nilai maksimum 100.

Renderer memakai simbol objek generik jika nama objek tidak memiliki gambar
khusus. Label asli tetap ditampilkan. Jika bentuk atau data tidak dapat
divisualisasikan dengan aman, renderer mengembalikan hasil kosong dan proses
gambar dihentikan.

## Validasi dan pengujian

Regression test harus mencakup:
- aritmetika rasional, desimal, pecahan campuran, persen, dan satuan;
- ekstraksi bahasa Indonesia yang didukung dan contoh ambigu;
- bukti AI yang valid, kutipan yang tidak ada, serta fakta yang tidak cocok;
- tujuh jenis intent, batas ukuran, dan kalkulasi/perbandingan;
- renderer untuk setiap jenis intent dan penanganan hasil kosong;
- pilihan setara dan kunci jawaban pada soal yang polanya didukung;
- kompatibilitas tipe soal dan alur gambar Asisten AI.

Pemeriksaan akhir lokal/otomatis dilakukan pada main. Tidak diperlukan
deployment preview. Build dan tes tidak boleh dianggap sebagai pengganti
pemeriksaan perilaku pada aplikasi yang dijalankan guru.

## Strategi kerja dan rilis

main adalah satu-satunya sumber kerja. Analisis dan desain dilakukan sebelum
implementasi; regression test, ESLint, dan build dilakukan setelah implementasi
selesai. Perubahan dikomit langsung ke main setelah pemeriksaan akhir.
Tidak membuat branch kerja, deployment preview, atau deployment produksi untuk
pekerjaan ini. Pengujian penggunaan aplikasi dilakukan oleh pemilik proyek
langsung dari main.
