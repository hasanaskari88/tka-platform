# AI Visual Math Engine

## Tujuan

Membangun satu sumber kebenaran matematika yang deterministik untuk validasi
soal AI dan pembuatan visual matematika. AI membantu mengklasifikasikan maksud
soal; program mengekstrak fakta yang sudah didukung, menghitung, memvalidasi,
dan menggambar.

## Aturan utama

1. Jangan mempercayai hasil hitung AI tanpa pemeriksaan deterministik.
2. Formatter tampilan tidak boleh mengubah makna angka.
3. Jangan membuat diagram dari fakta yang tidak lengkap atau bertentangan.
4. Bedakan kategori dari total, pembagian sama rata, dan partisi satu keseluruhan.
5. Jangan membuang satuan ketika membandingkan besaran.
6. Pertahankan kompatibilitas soal lama dan sistem penilaian yang sudah ada.
7. Kasus yang belum didukung harus dinyatakan secara eksplisit; jangan membuat
   gambar tebakan.

## Kontrak nilai matematika

Bilangan rasional disimpan sebagai string pembilang dan penyebut bilangan bulat.
Operasi internal menggunakan BigInt agar tidak terkena pembulatan floating point.

Bentuk 6/5, 1 1/5, 1.2, 1,2, dan 120% dapat dinormalisasi ke nilai rasional
yang sama. Bentuk dengan pemisah ribuan/desimal yang ambigu seperti 1.000
ditolak daripada ditebak.

Quantity parser mendukung konversi satuan umum panjang, massa, waktu, dan volume.
Satuan hitungan yang berbeda seperti buah, orang, ekor, lembar, buku, dan kotak
tidak otomatis dianggap sama. Nilai tanpa satuan dapat dibandingkan dengan
satuan hitungan dalam konteks pilihan jawaban; satuan panjang atau massa tidak
dapat dibandingkan dengan angka tanpa satuan.

## Jenis intent

- category_of_total: satu kategori dipilih dari beberapa kategori. Contoh:
  10 apel dari 6 jeruk, 8 pisang, dan 10 apel. Hasil 10/24 = 5/12.
- equal_sharing: sejumlah benda dibagikan sama rata ke beberapa kelompok.
  Contoh: 6 jeruk dibagi 5 bagian. Hasil setiap bagian 6/5.
- fraction_partition: satu keseluruhan dibagi menjadi bagian sama besar.
  Contoh: pizza dibagi 8 bagian, 3 bagian ditandai.
- number_comparison: membandingkan dua nilai rasional.
- number_line: menempatkan nilai pada garis bilangan.
- geometry: bangun datar dan bangun ruang dengan ukuran eksplisit.
- chart_table: menyajikan data tanpa menambahkan observasi.

## Alur sistem

1. Normalisasi teks soal tanpa mengubah makna.
2. AI mengklasifikasikan intent untuk pola yang belum dikenali secara langsung.
3. Ekstraksi deterministik membaca pola yang sudah didukung langsung dari teks;
   fakta hasil parser menjadi sumber kebenaran, bukan angka dari AI.
4. Mesin matematika menghitung hasil dengan bilangan rasional eksak.
5. Pilihan jawaban diperiksa untuk nilai setara dan kunci diperiksa untuk pola
   soal yang dapat dihitung deterministik.
6. Renderer dipilih berdasarkan intent yang tervalidasi.
7. Hasil gambar diperiksa sebelum diunggah dan ditampilkan.
8. Setiap tahap mencatat kode diagnosis yang aman.

## Yang sudah diimplementasikan pada branch fitur

- Kontrak TypeScript untuk RationalValue, VisualIntent, VisualMathResult,
  NumericOption, dan kode diagnosis.
- Operasi rasional BigInt: penyederhanaan, tambah, kurang, kali, bagi,
  perbandingan, dan format pecahan campuran.
- Parser angka bulat, pecahan, pecahan campuran, LaTeX, desimal, persen,
  dan simbol pecahan Unicode umum.
- Parser quantity dengan konversi satuan umum serta perlindungan satuan berbeda.
- Pemeriksaan pilihan jawaban yang nilainya setara.
- Validasi struktur intent dari respons AI.
- Ekstraksi fakta deterministik untuk pola bahasa Indonesia yang didukung:
  kategori buah, pembagian sama rata, dan partisi pecahan sederhana.
- Kalkulasi deterministik untuk kategori dari total, pembagian sama rata,
  partisi pecahan, dan perbandingan dua nilai rasional.
- Renderer Canvas untuk kategori buah, pembagian sama rata, dan partisi pecahan.
- Endpoint analisis intent visual baru yang memprioritaskan ekstraksi fakta
  deterministik, menggunakan AI hanya sebagai pengklasifikasi pola yang belum
  didukung, dan menghasilkan trace diagnosis.
- Integrasi awal ke halaman Asisten AI: soal matematika dianalisis meskipun
  image_prompt kosong; soal matematika yang ambigu tidak dialihkan ke generator
  gambar bebas.
- Validasi kunci jawaban deterministik pada soal pilihan ganda untuk pola
  matematika yang sudah dapat diekstrak.
- Formatter pilihan jawaban tidak lagi menebak penyebut dari kalimat soal.
- Regression suite tanpa dependency pengujian tambahan melalui `npm run test:visual-math`, mencakup rasional, satuan, pilihan setara, dua contoh utama, partisi sisa dari bagian dimakan/diwarnai/tidak diwarnai, target kategori ambigu, validasi kunci, dan jalur renderer Canvas.

## Batas dukungan saat ini

Ekstraksi deterministik belum mencakup seluruh variasi bahasa Indonesia atau
semua jenis objek. Renderer kategori saat ini mendukung jeruk, pisang, dan apel.
Renderer pembagian sama rata mendukung apel, jeruk, pisang, bola, kelereng, permen, dan koin. Renderer
partisi mendukung model lingkaran untuk pizza/pai dan model batang abstrak.

Pola yang tidak dikenali akan ditandai belum didukung atau perlu pemeriksaan
guru. Jangan memperluas parser dengan regex baru tanpa fixture uji yang
menunjukkan makna dan batas polanya.

## Tahap berikutnya

- Lengkapi ekstraksi angka dan bahasa untuk variasi soal yang lebih luas.
- Tambahkan dukungan unit/objek yang lebih lengkap jika dibutuhkan.
- Implementasikan number comparison, number line, geometry, dan chart/table.
- Validasi pembahasan dan pilihan jawaban untuk lebih banyak tipe soal.
- Perluas regression test setiap kali pola bahasa atau renderer baru ditambahkan.
- Lakukan pemeriksaan visual di browser pada lingkungan lokal/terisolasi sebelum merge; tidak perlu membuat deployment preview.
- Pertahankan fallback data soal lama; jangan mengubah skema tabel atau sistem
  penilaian yang ada tanpa kebutuhan terpisah.

## Strategi rilis

Pekerjaan berlangsung pada branch fitur terpisah. Jangan gabungkan ke main atau
mengubah produksi sebelum regression suite dan integrasi lolos pemeriksaan.
