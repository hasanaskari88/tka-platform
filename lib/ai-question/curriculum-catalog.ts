/**
 * Curated material catalog for TKA SD and Grade 6 learning.
 * Official references reviewed: 23 November 2026.
 * TKA scope comes from Pusat Asesmen Pendidikan's SD assessment framework.
 * Grade 6 topics are mapped to Phase C (generally grades V-VI), not asserted
 * as a nationally fixed semester-by-semester sequence.
 */
export type CurriculumTrack = 'TKA' | 'GRADE_6'
export type CurriculumTopic = { id: string; title: string; description: string; indicator: string; contentStatus: 'CURATED_SUMMARY' }
export type CurriculumTopicGroup = { title: string; topics: CurriculumTopic[] }
export type CurriculumSubject = { label: string; sourceNote: string; groups: CurriculumTopicGroup[] }
export type CurriculumCatalog = Record<string, CurriculumSubject>
const t = (id: string, title: string, description: string, indicator: string): CurriculumTopic => ({ id, title, description, indicator, contentStatus: 'CURATED_SUMMARY' })

export const TKA_SD_CATALOG: CurriculumCatalog = {
  'Bahasa Indonesia': {
    label: 'Bahasa Indonesia',
    sourceNote: 'Kerangka TKA SD: fokus membaca teks informasi dan fiksi; kompetensi pemahaman tekstual, inferensial, serta evaluasi dan apresiasi.',
    groups: [
      { title: 'Teks Informasi', topics: [
        t('bi-info-tersurat', 'Menemukan informasi tersurat', 'Mengidentifikasi fakta, rincian, tokoh, tempat, waktu, sebab, atau proses yang dinyatakan langsung dalam teks informasi.', 'Disajikan teks informasi, murid menentukan informasi yang dinyatakan secara langsung.'),
        t('bi-info-kosakata', 'Memahami kosakata dalam konteks', 'Menentukan makna kata umum atau khusus berdasarkan konteks kalimat dan topik teks.', 'Disajikan teks informasi, murid menentukan makna kosakata berdasarkan konteks.'),
        t('bi-info-objek', 'Mengidentifikasi objek dan cirinya', 'Mengenali objek, karakteristik, fungsi, atau proses berdasarkan informasi dalam teks.', 'Disajikan teks informasi, murid mengidentifikasi objek atau cirinya berdasarkan informasi bacaan.'),
        t('bi-info-urutan', 'Menyusun urutan informasi atau proses', 'Mengurutkan tahapan, kejadian, atau informasi dan menyajikannya kembali dalam bentuk ringkasan atau bagan.', 'Disajikan teks informasi, murid menyusun kembali urutan kejadian atau proses secara tepat.'),
        t('bi-info-idepokok', 'Menentukan ide pokok dan gagasan pendukung', 'Menentukan gagasan utama paragraf atau teks serta informasi pendukungnya.', 'Disajikan teks informasi, murid menentukan ide pokok dan gagasan pendukung.'),
        t('bi-info-inferensi', 'Menyimpulkan informasi tersirat', 'Menarik kesimpulan berdasarkan petunjuk, hubungan sebab-akibat, atau gabungan beberapa informasi.', 'Disajikan teks informasi, murid menyimpulkan informasi yang tidak dinyatakan secara langsung.'),
        t('bi-info-faktaopini', 'Membedakan fakta dan opini', 'Menilai pernyataan berdasarkan bukti dalam teks serta membedakan fakta dan pendapat.', 'Disajikan teks informasi dan beberapa pernyataan, murid menilai kesesuaian pernyataan dengan bukti teks.'),
        t('bi-info-ikhtisar', 'Membuat ikhtisar atau bagan isi teks', 'Memilih ringkasan, judul, atau bagan yang paling mewakili isi teks.', 'Disajikan teks informasi, murid memilih ikhtisar atau bagan yang sesuai dengan isi bacaan.'),
      ]},
      { title: 'Teks Fiksi', topics: [
        t('bi-fiksi-unsur', 'Memahami tokoh, latar, dan peristiwa', 'Mengidentifikasi tokoh, watak, latar, urutan peristiwa, konflik, dan penyelesaian cerita.', 'Disajikan teks fiksi, murid mengidentifikasi unsur cerita berdasarkan informasi dalam teks.'),
        t('bi-fiksi-amanat', 'Menyimpulkan amanat dan nilai cerita', 'Menyimpulkan pesan, nilai, atau sikap tokoh berdasarkan tindakan dan peristiwa dalam cerita.', 'Disajikan teks fiksi, murid menyimpulkan amanat atau nilai yang tercermin dalam cerita.'),
        t('bi-fiksi-inferensi', 'Menyimpulkan perasaan dan motivasi tokoh', 'Menafsirkan perasaan, alasan tindakan, atau perubahan tokoh berdasarkan petunjuk cerita.', 'Disajikan teks fiksi, murid menyimpulkan perasaan atau alasan tindakan tokoh.'),
        t('bi-fiksi-ungkapan', 'Memahami ungkapan dan makna kontekstual', 'Menafsirkan ungkapan atau pilihan kata berdasarkan konteks cerita.', 'Disajikan teks fiksi, murid menentukan makna ungkapan sesuai konteks.'),
        t('bi-fiksi-evaluasi', 'Menilai relevansi dan respons terhadap cerita', 'Menghubungkan peristiwa cerita dengan pengalaman sehari-hari serta menilai sikap atau keputusan tokoh.', 'Disajikan teks fiksi, murid menilai relevansi peristiwa atau keputusan tokoh dengan kehidupan sehari-hari.'),
      ]},
      { title: 'Evaluasi dan Apresiasi', topics: [
        t('bi-evaluasi-kesesuaian', 'Menilai kesesuaian antar informasi', 'Memeriksa apakah pernyataan, alasan, atau simpulan sesuai dengan isi dan bukti teks.', 'Disajikan teks dan beberapa pernyataan, murid menilai kesesuaian setiap pernyataan dengan isi teks.'),
        t('bi-evaluasi-bahasa', 'Menanggapi penggunaan bahasa penulis', 'Menilai pilihan kata, ungkapan, atau cara penulis menyampaikan gagasan dan membangun suasana.', 'Disajikan teks, murid menilai dampak penggunaan ungkapan atau pilihan bahasa penulis.'),
      ]},
    ],
  },
  Matematika: {
    label: 'Matematika',
    sourceNote: 'Kerangka TKA SD mencakup Bilangan, Geometri dan Pengukuran, serta Data. Kompetensi meliputi pengetahuan, representasi, penalaran, pemecahan masalah, dan koneksi matematis.',
    groups: [
      { title: 'Bilangan', topics: [
        t('mtk-pecahan-senilai', 'Pecahan senilai', 'Mengenali dan menentukan pecahan senilai menggunakan gambar maupun simbol matematika.', 'Disajikan model gambar atau bilangan, murid menentukan pecahan yang senilai.'),
        t('mtk-banding-pecahan', 'Membandingkan dan mengurutkan pecahan', 'Membandingkan pecahan dengan penyebut atau pembilang berbeda melalui model dan strategi hitung.', 'Disajikan beberapa pecahan, murid membandingkan atau mengurutkannya dengan alasan yang tepat.'),
        t('mtk-relasi-pecahan', 'Hubungan pecahan, desimal, dan persen', 'Menghubungkan pecahan sederhana, bilangan desimal, dan persentase dalam berbagai representasi.', 'Disajikan suatu nilai dalam bentuk pecahan, desimal, atau persen, murid menentukan bentuk lain yang setara.'),
        t('mtk-operasi-cacah', 'Operasi bilangan cacah', 'Menyelesaikan penjumlahan, pengurangan, perkalian, dan pembagian bilangan cacah dalam konteks matematika dan kehidupan sehari-hari.', 'Disajikan masalah kontekstual, murid memilih atau menghitung hasil operasi bilangan cacah dengan tepat.'),
        t('mtk-operasi-pecahan', 'Operasi hitung pecahan', 'Menyelesaikan penjumlahan dan pengurangan pecahan serta perkalian atau pembagian pecahan dengan bilangan asli.', 'Disajikan masalah pecahan, murid menentukan hasil operasi dan menafsirkan hasilnya dalam konteks.'),
        t('mtk-kpk-fpb', 'Faktor, kelipatan, KPK, dan FPB', 'Menggunakan faktor, kelipatan, KPK, atau FPB untuk menyelesaikan masalah pengelompokan dan kejadian berulang.', 'Disajikan situasi sehari-hari, murid menentukan penggunaan faktor, kelipatan, KPK, atau FPB yang sesuai.'),
      ]},
      { title: 'Geometri dan Pengukuran', topics: [
        t('mtk-bangun-datar', 'Bentuk dan sifat bangun datar', 'Mengenali dan membandingkan segitiga, segiempat, dan segi banyak berdasarkan sifat-sifatnya.', 'Disajikan gambar atau ciri bangun datar, murid menentukan nama atau sifat bangun tersebut.'),
        t('mtk-bangun-ruang', 'Konstruksi dan visualisasi bangun ruang', 'Memahami kubus, balok, gabungannya, serta tampak depan, atas, dan samping.', 'Disajikan susunan bangun ruang, murid menentukan bentuk atau tampak dari arah tertentu.'),
        t('mtk-satuan-panjang', 'Satuan dan konversi panjang', 'Menggunakan satuan baku panjang dan hubungan mm, cm, dm, m, dam, hm, serta km.', 'Disajikan pengukuran atau situasi, murid mengonversi satuan panjang dan menyelesaikan masalah.'),
        t('mtk-satuan-berat', 'Satuan dan konversi berat', 'Menggunakan satuan baku berat dan hubungan mg, cg, dg, g, dag, hg, serta kg.', 'Disajikan data berat, murid mengonversi satuan atau membandingkan berat benda.'),
        t('mtk-satuan-volume', 'Satuan dan konversi volume', 'Menggunakan satuan baku volume dan hubungan ml, cl, dl, l, dal, hl, serta kl.', 'Disajikan situasi kapasitas atau volume, murid mengonversi satuan dan menghitung kebutuhan.'),
        t('mtk-waktu-kecepatan', 'Waktu dan kecepatan', 'Menggunakan hubungan detik, menit, jam, hari, pekan, bulan, dan tahun serta menyelesaikan masalah kecepatan.', 'Disajikan jadwal atau perjalanan, murid menentukan durasi, waktu, atau kecepatan.'),
        t('mtk-keliling-luas', 'Keliling dan luas bangun datar', 'Menghitung keliling dan luas segitiga, segiempat, segi banyak, atau gabungan bangun datar.', 'Disajikan gambar dan ukuran bangun datar, murid menentukan keliling atau luasnya.'),
        t('mtk-volume-ruang', 'Volume kubus, balok, dan gabungannya', 'Menghitung atau membandingkan volume kubus, balok, dan bangun gabungan.', 'Disajikan ukuran atau susunan bangun ruang, murid menentukan volume atau perubahan volumenya.'),
        t('mtk-sudut-taksiran', 'Besar sudut dan penaksiran ukuran', 'Mengenali besar sudut dan menaksir ukuran panjang, berat, kapasitas, luas, atau volume secara masuk akal.', 'Disajikan gambar atau konteks pengukuran, murid menentukan besar sudut atau taksiran ukuran yang wajar.'),
      ]},
      { title: 'Data', topics: [
        t('mtk-sajian-data', 'Membaca tabel dan diagram', 'Membaca dan membandingkan informasi pada tabel, diagram gambar, piktogram, dan diagram batang.', 'Disajikan tabel atau diagram, murid mengambil informasi dan membandingkan data.'),
        t('mtk-analisis-data', 'Menganalisis dan menggunakan data', 'Menggabungkan beberapa informasi data, menghitung jumlah atau selisih, dan membuat simpulan.', 'Disajikan data dalam tabel atau diagram, murid menganalisis pola dan menarik simpulan yang didukung data.'),
      ]},
    ],
  },
}

export const GRADE_6_CATALOG: CurriculumCatalog = {
  Matematika: {
    label: 'Matematika',
    sourceNote: 'Mengacu pada CP Matematika Fase C (umumnya kelas V–VI). Urutan semester dan kedalaman materi perlu diselaraskan dengan ATP sekolah.',
    groups: [
      { title: 'Bilangan dan Operasi', topics: [
        t('g6-mtk-bilangan', 'Bilangan cacah sampai 1.000.000', 'Membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, menyusun, dan menguraikan bilangan cacah.', 'Murid menentukan nilai tempat, membandingkan, mengurutkan, atau menyusun bilangan cacah sampai 1.000.000.'),
        t('g6-mtk-operasi', 'Operasi bilangan cacah sampai 100.000', 'Menyelesaikan penjumlahan, pengurangan, perkalian, dan pembagian bilangan cacah dalam soal rutin maupun kontekstual.', 'Murid menyelesaikan masalah yang melibatkan operasi hitung bilangan cacah sampai 100.000.'),
        t('g6-mtk-uang', 'Masalah yang berkaitan dengan uang', 'Menggunakan operasi hitung untuk menghitung harga, total belanja, uang kembali, tabungan, dan anggaran sederhana.', 'Murid menyelesaikan masalah sehari-hari yang melibatkan nilai uang dan beberapa operasi hitung.'),
        t('g6-mtk-kpkfpb', 'KPK dan FPB dalam kehidupan sehari-hari', 'Menggunakan kelipatan dan faktor untuk menyelesaikan masalah jadwal berulang, pembagian kelompok, atau pengemasan.', 'Murid menentukan KPK atau FPB yang sesuai dengan situasi dan menjelaskan maknanya.'),
        t('g6-mtk-pecahan', 'Pecahan dan operasi pecahan', 'Membandingkan dan mengurutkan pecahan, melakukan penjumlahan/pengurangan pecahan, serta perkalian/pembagian pecahan dengan bilangan asli.', 'Murid menyelesaikan masalah yang melibatkan perbandingan atau operasi pecahan.'),
        t('g6-mtk-desimal', 'Bilangan desimal dan konversi pecahan', 'Membandingkan dan mengurutkan desimal serta mengubah pecahan ke bentuk desimal.', 'Murid mengubah pecahan menjadi desimal dan membandingkan nilai desimal.'),
        t('g6-mtk-rasio', 'Rasio, proporsi, dan perbandingan', 'Menggunakan penalaran proporsional dan operasi perkalian atau pembagian pada situasi sehari-hari.', 'Murid menyelesaikan masalah rasio atau proporsi dengan strategi yang tepat.'),
        t('g6-mtk-pola', 'Pola bilangan', 'Mengidentifikasi, meniru, dan mengembangkan pola bilangan membesar yang melibatkan perkalian atau pembagian.', 'Murid menentukan aturan dan melanjutkan pola bilangan yang melibatkan perkalian atau pembagian.'),
      ]},
      { title: 'Geometri dan Pengukuran', topics: [
        t('g6-mtk-luas-keliling', 'Keliling dan luas bangun datar', 'Menentukan keliling dan luas berbagai bangun datar serta bangun gabungan.', 'Murid menghitung keliling atau luas bangun datar dan gabungannya dari informasi yang tersedia.'),
        t('g6-mtk-ruang', 'Bangun ruang dan visualisasi spasial', 'Mengonstruksi dan mengurai bangun ruang, membandingkan karakteristik, serta memahami tampak dan susunan ruang.', 'Murid menafsirkan susunan bangun ruang atau visualisasi dari beberapa arah.'),
        t('g6-mtk-peta', 'Lokasi pada peta berpetak', 'Menentukan dan menjelaskan lokasi menggunakan koordinat atau sistem petak sederhana.', 'Murid menentukan posisi atau rute pada peta yang menggunakan sistem berpetak.'),
      ]},
      { title: 'Data', topics: [
        t('g6-mtk-data', 'Penyajian dan analisis data', 'Mengurutkan, membandingkan, menyajikan, dan menganalisis data benda atau hasil pengukuran dalam tabel dan diagram.', 'Murid membaca, menyajikan, membandingkan, atau menarik simpulan dari data.'),
      ]},
    ],
  },
  'Bahasa Indonesia': {
    label: 'Bahasa Indonesia',
    sourceNote: 'Mengikuti buku siswa Anak-Anak yang Mengubah Dunia (Edisi Revisi 2025), ISBN 978-634-00-2617-7, dan Panduan Guru ISBN 978-634-00-2484-5. Empat bab menjadi struktur utama; topik adalah ringkasan materi.',
    groups: [
      { title: 'Bab 1 — Anak-Anak yang Mengubah Dunia', topics: [
        t('g6-bi-b1-eksplanasi', 'Teks eksplanasi dan perubahan iklim', 'Memahami proses perubahan iklim, dampak lingkungan, dan tindakan menjaga bumi.', 'Murid menemukan informasi dan menyusun teks eksplanasi sederhana.'),
        t('g6-bi-b1-bahasa', 'Kosakata, pola huruf, dan kata penghubung', 'Membaca kata berpola huruf beragam serta menggunakan kosakata dan kata penghubung.', 'Murid memahami kosakata dan menggunakan kata penghubung tepat.'),
        t('g6-bi-b1-visual', 'Teks visual dan audiovisual', 'Menemukan informasi tersurat dan inferensial dari gambar, komik, infografik, atau tayangan.', 'Murid menyimpulkan informasi dari teks visual.'),
      ]},
      { title: 'Bab 2 — Nusantara Berjuta Cerita', topics: [
        t('g6-bi-b2-rakyat', 'Cerita rakyat dan teks sastra bergambar', 'Mengenali unsur cerita, tokoh, peristiwa, nilai budaya, dan pesan cerita rakyat Nusantara.', 'Murid mengidentifikasi unsur dan pesan cerita.'),
        t('g6-bi-b2-makna', 'Makna denotatif dan konotatif', 'Membedakan makna sebenarnya dan makna kiasan berdasarkan konteks.', 'Murid menentukan makna kata berdasarkan konteks.'),
        t('g6-bi-b2-menulis', 'Menulis cerita rakyat sederhana', 'Menyampaikan tanggapan dan menulis cerita rakyat dengan pilihan kata bervariasi.', 'Murid menulis cerita runtut dengan pilihan kata sesuai.'),
      ]},
      { title: 'Bab 3 — Temukan Minat, Tunjukkan Bakat', topics: [
        t('g6-bi-b3-minat', 'Minat, bakat, dan cita-cita', 'Menggali informasi minat, bakat, pengalaman, prestasi, dan cita-cita melalui bacaan serta wawancara.', 'Murid menjelaskan hubungan minat, bakat, usaha, dan cita-cita.'),
        t('g6-bi-b3-wawancara', 'Wawancara dan kalimat langsung', 'Menyusun pertanyaan, melakukan wawancara, serta mengenali kalimat langsung dan tidak langsung.', 'Murid menyusun pertanyaan dan mengubah kalimat langsung.'),
        t('g6-bi-b3-presentasi', 'Menyajikan hasil wawancara', 'Mengolah hasil wawancara menjadi tulisan atau presentasi yang runtut.', 'Murid menyajikan hasil wawancara dengan bahasa santun.'),
      ]},
      { title: 'Bab 4 — Dari Hobi Menjadi Profesi', topics: [
        t('g6-bi-b4-profesi', 'Hobi, keterampilan, dan profesi', 'Menghubungkan hobi dengan keterampilan, ragam profesi, dan peluang pekerjaan.', 'Murid menjelaskan hubungan hobi dan profesi.'),
        t('g6-bi-b4-laporan', 'Teks laporan hasil pengamatan', 'Melakukan pengamatan, mencatat fakta, menyusun laporan, dan membedakan fakta dengan opini.', 'Murid menyusun laporan secara objektif dan runtut.'),
        t('g6-bi-b4-ejaan', 'Kalimat efektif dan ejaan', 'Mengembangkan paragraf padu serta menggunakan kosakata, huruf kapital, dan tanda baca.', 'Murid memperbaiki teks sesuai kaidah bahasa.'),
      ]},
    ],
  },
  'IPAS': {
    label: 'IPAS',
    sourceNote: 'Mengikuti buku siswa IPAS Kelas VI Edisi Revisi 2025, ISBN 978-634-00-2164-6, dan Panduan Guru ISBN 978-634-00-2168-4. Enam bab menjadi struktur utama.',
    groups: [
      { title: 'Bab 1 — Makanan Bergizi untuk Kesehatan Pencernaanmu', topics: [
        t('g6-ipas-b1-pencernaan', 'Sistem pencernaan manusia', 'Mengenali organ pencernaan, fungsi, perjalanan makanan, dan proses pencernaan.', 'Murid menjelaskan urutan organ dan proses pencernaan.'),
        t('g6-ipas-b1-gizi', 'Gizi dan kesehatan pencernaan', 'Menghubungkan kandungan gizi, pilihan makanan, gangguan pencernaan, dan kebiasaan sehat.', 'Murid memilih makanan dan kebiasaan untuk menjaga pencernaan.'),
      ]},
      { title: 'Bab 2 — Tarik dan Embuskan', topics: [
        t('g6-ipas-b2-pernapasan', 'Organ dan proses pernapasan', 'Mengenali organ pernapasan dan proses udara masuk serta keluar tubuh.', 'Murid menjelaskan jalur udara dan fungsi organ.'),
        t('g6-ipas-b2-sehat', 'Menjaga kesehatan pernapasan', 'Menganalisis pengaruh kebiasaan dan lingkungan terhadap kesehatan pernapasan.', 'Murid menentukan tindakan menjaga kesehatan pernapasan.'),
      ]},
      { title: 'Bab 3 — Jejak Sang Pahlawan', topics: [
        t('g6-ipas-b3-sejarah', 'Perjuangan dan peristiwa sejarah', 'Mempelajari peristiwa perjuangan bangsa, tokoh, kronologi, dan latar sejarah.', 'Murid mengurutkan peristiwa dan menjelaskan peran tokoh.'),
        t('g6-ipas-b3-teladan', 'Keteladanan tokoh perjuangan', 'Menghubungkan tindakan tokoh dengan keberanian, persatuan, tanggung jawab, dan cinta tanah air.', 'Murid menyimpulkan nilai keteladanan.'),
      ]},
      { title: 'Bab 4 — Kearifan Lokal, Warisan Leluhur untuk Persatuan Bangsa', topics: [
        t('g6-ipas-b4-budaya', 'Kearifan lokal dan warisan budaya', 'Mengenali tradisi, pengetahuan lokal, dan warisan budaya daerah.', 'Murid menjelaskan contoh dan manfaat kearifan lokal.'),
        t('g6-ipas-b4-persatuan', 'Keberagaman dan persatuan', 'Menganalisis hubungan keberagaman, sikap saling menghargai, dan persatuan.', 'Murid memilih sikap menjaga persatuan.'),
      ]},
      { title: 'Bab 5 — Energi untuk Masa Depan', topics: [
        t('g6-ipas-b5-listrik', 'Energi listrik dan pemanfaatannya', 'Memahami sumber energi listrik, pemanfaatan, dan keselamatan peralatan listrik.', 'Murid menjelaskan pemanfaatan listrik dan tindakan aman.'),
        t('g6-ipas-b5-energi', 'Penghematan dan energi masa depan', 'Mengenali sumber energi terbarukan dan penghematan energi.', 'Murid membandingkan sumber energi dan mengusulkan penghematan.'),
      ]},
      { title: 'Bab 6 — Mengembara di Jagat Raya', topics: [
        t('g6-ipas-b6-tatasurya', 'Tata surya dan benda langit', 'Mengenali Matahari, planet, satelit, dan susunan tata surya.', 'Murid mengidentifikasi anggota tata surya.'),
        t('g6-ipas-b6-bumi', 'Bumi, rotasi, dan revolusi', 'Memahami gerak Bumi dan kaitannya dengan siang-malam serta fenomena tahunan.', 'Murid menjelaskan akibat rotasi dan revolusi Bumi.'),
      ]},
    ],
  },
  'Pendidikan Pancasila': {
    label: 'Pendidikan Pancasila',
    sourceNote: 'Mengacu pada CP Pendidikan Pancasila Fase C: Pancasila, UUD NRI Tahun 1945, Bhinneka Tunggal Ika, dan NKRI.',
    groups: [
      { title: 'Pancasila', topics: [
        t('g6-pp-sejarah', 'Sejarah kelahiran Pancasila', 'Memahami kronologi perumusan dan kelahiran Pancasila serta keteladanan para perumusnya.', 'Murid mengurutkan peristiwa atau menjelaskan keteladanan tokoh perumus Pancasila.'),
        t('g6-pp-nilai', 'Makna dan penerapan nilai Pancasila', 'Menghubungkan sila-sila sebagai satu kesatuan serta menerapkan nilai Pancasila di keluarga, sekolah, dan masyarakat.', 'Murid menentukan perilaku yang sesuai dengan nilai sila Pancasila dalam suatu situasi.'),
      ]},
      { title: 'UUD NRI Tahun 1945', topics: [
        t('g6-pp-norma', 'Norma, hak, dan kewajiban', 'Memahami dan menerapkan norma, hak, serta kewajiban sebagai anggota keluarga, warga sekolah, dan warga negara.', 'Murid membedakan hak, kewajiban, dan norma serta memilih penerapannya dalam kehidupan.'),
        t('g6-pp-pembukaan', 'Pembukaan UUD NRI Tahun 1945', 'Mengenal Pembukaan UUD NRI Tahun 1945 dan nilai-nilai yang terkandung di dalamnya.', 'Murid mengidentifikasi informasi atau nilai penting dalam Pembukaan UUD NRI Tahun 1945.'),
        t('g6-pp-musyawarah', 'Musyawarah dan kesepakatan bersama', 'Mempraktikkan musyawarah untuk membuat kesepakatan dan aturan di keluarga maupun sekolah.', 'Murid menentukan cara bermusyawarah dan sikap yang tepat saat mencapai kesepakatan.'),
      ]},
      { title: 'Bhinneka Tunggal Ika dan NKRI', topics: [
        t('g6-pp-bhinneka', 'Keberagaman budaya Indonesia', 'Menghormati, menjaga, dan melestarikan keberagaman budaya di lingkungan sekitar.', 'Murid memilih tindakan yang menghormati dan melestarikan keberagaman budaya.'),
        t('g6-pp-nkri', 'Wilayah NKRI dan gotong royong', 'Mengenal kabupaten/kota dan provinsi sebagai bagian NKRI serta menunjukkan gotong royong untuk menjaga persatuan.', 'Murid menjelaskan hubungan wilayah dengan NKRI atau menentukan tindakan gotong royong yang tepat.'),
      ]},
    ],
  },
  'Bahasa Inggris': {
    label: 'Bahasa Inggris',
    sourceNote: 'Mengikuti buku English for Nusantara Kids Kelas VI cetakan 2024, ISBN 978-623-388-245-3. Enam bab menjadi struktur utama.',
    groups: [
      { title: 'Chapter 1 — Healthy Vegetables', topics: [
        t('g6-en-c1-veg', 'Vegetables and healthy food', 'Mengenal nama sayuran, warna, rasa, jumlah, dan ungkapan tentang makanan sehat.', 'Students identify vegetables and simple food descriptions.'),
        t('g6-en-c1-ask', 'Asking about vegetables', 'Menggunakan kosakata dan kalimat sederhana untuk bertanya serta memberi informasi tentang sayuran.', 'Students ask and answer simple questions about vegetables.'),
      ]},
      { title: 'Chapter 2 — Our Hygiene Habits', topics: [
        t('g6-en-c2-hygiene', 'Personal hygiene habits', 'Mengenal kosakata kebersihan diri dan kebiasaan menjaga kesehatan.', 'Students identify and describe personal hygiene habits.'),
        t('g6-en-c2-routine', 'Healthy daily routines', 'Memahami dan menyampaikan urutan kegiatan hidup bersih.', 'Students describe simple hygiene routines.'),
      ]},
      { title: 'Chapter 3 — A Trip to the Zoo', topics: [
        t('g6-en-c3-animals', 'Animals and their characteristics', 'Mengenal nama hewan, ciri fisik, habitat, makanan, dan perilaku.', 'Students identify animals and their characteristics.'),
        t('g6-en-c3-zoo', 'A visit to the zoo', 'Memahami informasi tentang tempat, kegiatan, dan pengalaman ke kebun binatang.', 'Students find information in short texts about a zoo visit.'),
      ]},
      { title: 'Chapter 4 — Let’s Play!', topics: [
        t('g6-en-c4-games', 'Games and play activities', 'Mengenal kosakata permainan dan ungkapan saat bermain.', 'Students identify games and expressions used during play.'),
        t('g6-en-c4-rules', 'Rules and instructions', 'Memahami instruksi, aturan, dan urutan langkah permainan.', 'Students follow simple game instructions.'),
      ]},
      { title: 'Chapter 5 — Having Fun in Our After-School Club', topics: [
        t('g6-en-c5-club', 'After-school clubs and hobbies', 'Mengenal kegiatan ekstrakurikuler, hobi, minat, dan aktivitas setelah sekolah.', 'Students describe after-school activities and hobbies.'),
        t('g6-en-c5-interest', 'Expressing interests', 'Menyampaikan kesukaan, pilihan, kemampuan, dan pengalaman kegiatan klub.', 'Students use simple expressions about interests.'),
      ]},
      { title: 'Chapter 6 — Our School Project', topics: [
        t('g6-en-c6-project', 'School projects and collaboration', 'Memahami kosakata dan ungkapan untuk merencanakan proyek bersama.', 'Students understand simple collaborative project instructions.'),
        t('g6-en-c6-present', 'Presenting a project', 'Menyampaikan informasi sederhana tentang hasil proyek sekolah.', 'Students communicate basic information about a school project.'),
      ]},
    ],
  },
  'PJOK': {
    label: 'PJOK',
    sourceNote: 'Mengacu pada buku siswa Pendidikan Jasmani, Olahraga, dan Kesehatan untuk SD/MI Kelas VI, Pusat Perbukuan, ISBN 978-634-00-3173-7, serta Panduan Mata Pelajaran PJOK Fase A–F (2025). Materi praktik perlu disesuaikan dengan fasilitas, keselamatan, dan kondisi murid.',
    groups: [
      { title: 'Terampil Bergerak', topics: [
        t('g6-pjok-gerak-lokomotor', 'Variasi dan kombinasi gerak dasar', 'Mempraktikkan variasi dan kombinasi gerak lokomotor, nonlokomotor, dan manipulatif dalam aktivitas permainan atau olahraga.', 'Murid memilih atau mempraktikkan kombinasi gerak yang tepat sesuai tujuan aktivitas.'),
        t('g6-pjok-permainan-bola', 'Permainan bola besar dan bola kecil', 'Menerapkan keterampilan gerak, aturan sederhana, dan strategi dalam permainan bola besar maupun bola kecil yang dimodifikasi.', 'Murid menentukan teknik, strategi, atau keputusan bermain yang tepat dalam situasi permainan.'),
        t('g6-pjok-atletik', 'Aktivitas atletik dan gerak berirama', 'Mempraktikkan kombinasi gerak dasar dalam aktivitas jalan, lari, lompat, lempar, serta gerak berirama sesuai kemampuan.', 'Murid mengidentifikasi urutan gerak atau prinsip keselamatan dalam aktivitas atletik dan gerak berirama.'),
        t('g6-pjok-senam', 'Aktivitas senam dan kebugaran gerak', 'Mempraktikkan rangkaian gerak senam sederhana dengan memperhatikan koordinasi, keseimbangan, kelenturan, dan keselamatan.', 'Murid memilih rangkaian gerak yang sesuai dengan unsur kebugaran dan prosedur keselamatan.'),
      ]},
      { title: 'Belajar Melalui Gerak', topics: [
        t('g6-pjok-strategi', 'Strategi dan modifikasi permainan', 'Menganalisis efektivitas strategi, memodifikasi aturan atau alat, dan memilih cara bermain yang aman serta inklusif.', 'Murid menentukan modifikasi aturan atau strategi yang meningkatkan keselamatan dan partisipasi semua pemain.'),
        t('g6-pjok-sportivitas', 'Kerja sama, fair play, dan tanggung jawab', 'Menunjukkan komunikasi, kerja sama tim, kepemimpinan, sportivitas, dan tanggung jawab dalam aktivitas jasmani.', 'Murid memilih sikap yang mencerminkan kerja sama, fair play, dan tanggung jawab saat beraktivitas.'),
      ]},
      { title: 'Bergaya Hidup Aktif', topics: [
        t('g6-pjok-kebugaran', 'Kebugaran jasmani dan aktivitas fisik', 'Memahami komponen kebugaran, menyusun aktivitas fisik teratur, serta mengenali manfaat gerak dan risiko perilaku sedenter.', 'Murid menghubungkan aktivitas fisik teratur dengan kebugaran dan memilih kebiasaan aktif yang sesuai.'),
      ]},
      { title: 'Memilih Hidup Sehat', topics: [
        t('g6-pjok-gizi', 'Pola makan sehat dan gizi seimbang', 'Mengenali ragam zat gizi, membaca informasi sederhana pada makanan, dan memilih pola makan yang mendukung aktivitas.', 'Murid memilih susunan makanan atau kebiasaan makan yang mendukung kesehatan dan aktivitas jasmani.'),
        t('g6-pjok-pencegahan', 'Pencegahan risiko kesehatan', 'Menghubungkan kebersihan diri, istirahat, hidrasi, aktivitas jasmani, dan kebiasaan sehat dengan pencegahan risiko kesehatan.', 'Murid menentukan tindakan pencegahan yang tepat untuk menjaga kesehatan saat beraktivitas.'),
        t('g6-pjok-cedera', 'Keselamatan aktivitas dan pertolongan pertama', 'Mengenali risiko cedera, melakukan langkah awal penanganan cedera sesuai tingkat keparahan, dan mengetahui kapan meminta bantuan orang dewasa atau tenaga kesehatan.', 'Murid menentukan tindakan aman saat terjadi cedera dan memilih kapan harus meminta pertolongan.'),
      ]},
    ],
  },
  'Pendidikan Agama Islam dan Budi Pekerti': {
    label: 'Pendidikan Agama Islam dan Budi Pekerti',
    sourceNote: 'Disusun berdasarkan CP Fase C pada Keputusan Kepala BSKAP Nomor 046/H/KR/2025 dan buku siswa PAI dan Budi Pekerti Kelas VI SIBI ISBN 978-602-244-676-7 (Edisi 1), beserta Panduan Guru ISBN 978-602-244-675-0. Cakupan Fase C: Al-Qur’an Hadis (surah pendek, ayat dan hadis tentang keragaman); Akidah (asmaulhusna, hari akhir, qada dan qadar); Akhlak (doa, tawakal, teman, tetangga, nonmuslim, hewan, tumbuhan); Fikih (puasa sunah, zakat, infak, sedekah, hadiah, halal-haram); Sejarah Peradaban Islam (periode Madinah dan Khulafaurasyidin). Topik ini adalah pemetaan CP Fase C, bukan klaim urutan bab buku.',
    groups: [
      { title: 'Al-Qur’an Hadis', topics: [
        t('g6-pai-quran-keragaman', 'Ayat Al-Qur’an dan hadis tentang keragaman', 'Memahami pesan ayat dan hadis tentang keberagaman serta menerapkannya dalam sikap saling menghormati.', 'Murid menjelaskan pesan ayat atau hadis tentang keragaman dan memberi contoh penerapannya.'),
        t('g6-pai-surah-pendek', 'Memahami surah-surah pendek', 'Membaca, memahami kandungan, dan mengambil pelajaran dari surah-surah pendek yang dipelajari sesuai buku dan bimbingan guru.', 'Murid menjelaskan kandungan surah pendek dan menghubungkannya dengan perilaku sehari-hari.'),
      ]},
      { title: 'Akidah', topics: [
        t('g6-pai-asmaulhusna', 'Asmaulhusna', 'Memahami makna beberapa Asmaulhusna dan meneladani nilai kebaikannya dalam kehidupan.', 'Murid menjelaskan makna Asmaulhusna yang dipelajari dan contoh perilaku yang sesuai.'),
        t('g6-pai-hari-akhir', 'Iman kepada hari akhir', 'Memahami iman kepada hari akhir dan pengaruhnya terhadap tanggung jawab serta pilihan perilaku.', 'Murid menghubungkan iman kepada hari akhir dengan sikap bertanggung jawab.'),
        t('g6-pai-qada-qadar', 'Qada dan qadar', 'Memahami qada dan qadar serta membedakan ikhtiar, doa, tawakal, dan menerima ketentuan Allah.', 'Murid menjelaskan hubungan ikhtiar, doa, tawakal, dan qada-qadar dalam contoh sederhana.'),
      ]},
      { title: 'Akhlak', topics: [
        t('g6-pai-doa-tawakal', 'Berdoa dan bertawakal kepada Allah', 'Memahami adab berdoa dan sikap tawakal setelah berusaha.', 'Murid menunjukkan contoh perilaku berdoa dan bertawakal dalam kehidupan.'),
        t('g6-pai-akhlak-sosial', 'Akhlak kepada teman, tetangga, dan nonmuslim', 'Membiasakan sikap santun, adil, menghormati perbedaan, serta menjaga hubungan baik dengan sesama.', 'Murid memilih sikap yang tepat dalam situasi pergaulan yang beragam.'),
        t('g6-pai-sayang-makhluk', 'Menyayangi hewan dan tumbuhan', 'Memahami tanggung jawab manusia untuk memperlakukan hewan dengan baik dan merawat tumbuhan serta lingkungan.', 'Murid menjelaskan tindakan nyata menyayangi hewan dan tumbuhan.'),
      ]},
      { title: 'Fikih', topics: [
        t('g6-pai-puasa-sunah', 'Puasa sunah', 'Mengenal contoh, tujuan, dan ketentuan puasa sunah sesuai materi yang dipelajari.', 'Murid menjelaskan tujuan dan contoh puasa sunah.'),
        t('g6-pai-ziswaf', 'Zakat, infak, sedekah, dan hadiah', 'Membedakan pengertian dan tujuan zakat, infak, sedekah, serta hadiah serta menumbuhkan kepedulian.', 'Murid membedakan zakat, infak, sedekah, dan hadiah melalui contoh.'),
        t('g6-pai-halal-haram', 'Makanan dan minuman halal dan haram', 'Memahami prinsip memilih makanan dan minuman halal serta menjauhi yang haram.', 'Murid mengidentifikasi contoh makanan dan minuman halal atau haram beserta alasannya.'),
      ]},
      { title: 'Sejarah Peradaban Islam', topics: [
        t('g6-pai-madinah', 'Perjuangan Nabi Muhammad saw. periode Madinah', 'Mempelajari peristiwa penting, keteladanan, dan kehidupan masyarakat pada periode Madinah.', 'Murid menceritakan peristiwa periode Madinah dan mengambil nilai keteladanannya.'),
        t('g6-pai-khulafaurasyidin', 'Keteladanan Khulafaurasyidin', 'Mengenal peran dan keteladanan Abu Bakar, Umar, Utsman, dan Ali dalam kepemimpinan serta perkembangan Islam.', 'Murid menyebutkan keteladanan Khulafaurasyidin dan penerapannya.'),
      ]},
    ],
  },
  'Pendidikan Agama Kristen dan Budi Pekerti': {
    label: 'Pendidikan Agama Kristen dan Budi Pekerti',
    sourceNote: 'Mengacu pada CP Pendidikan Agama Kristen Fase C dalam Keputusan Kepala BSKAP Nomor 046/H/KR/2025. SIBI yang ditemukan menyediakan Buku Panduan Guru Kelas VI ISBN 978-602-244-666-8 (Edisi 1); buku siswa kelas VI belum berhasil diverifikasi pada katalog saat peninjauan. Karena itu, topik di bawah adalah pemetaan CP Fase C, bukan urutan bab atau kutipan buku siswa. Guru perlu mencocokkan dengan buku siswa yang dipakai sekolah dan tradisi gereja setempat.',
    groups: [
      { title: 'Allah Berkarya', topics: [
        t('g6-pak-allah-pencipta', 'Allah berkarya melalui keluarga, sekolah, dan masyarakat', 'Memahami karya Allah Pencipta melalui keluarga, sekolah, dan masyarakat serta mensyukuri peran diri di dalamnya.', 'Murid memberi contoh karya Allah melalui keluarga, sekolah, dan masyarakat.'),
        t('g6-pak-allah-pemelihara', 'Allah memelihara seluruh umat manusia', 'Memahami pemeliharaan Allah bagi semua manusia, termasuk orang yang berkebutuhan khusus, dan menumbuhkan sikap peduli.', 'Murid menunjukkan contoh tindakan menghargai dan mendukung sesama.'),
        t('g6-pak-yesus-penyelamat', 'Allah menyelamatkan manusia melalui Yesus Kristus', 'Mengenal karya penyelamatan Allah melalui Yesus Kristus berdasarkan Alkitab dan pembelajaran gerejawi.', 'Murid menceritakan makna karya penyelamatan Yesus Kristus secara sederhana.'),
        t('g6-pak-allah-pembaru', 'Allah membarui hidup manusia', 'Memahami pembaruan hidup oleh Allah dan menghubungkannya dengan perubahan sikap ke arah kebaikan.', 'Murid memberi contoh perubahan sikap yang mencerminkan hidup yang diperbarui.'),
      ]},
      { title: 'Manusia dan Nilai-nilai Kristiani', topics: [
        t('g6-pak-hakikat-manusia', 'Manusia sebagai makhluk terbatas', 'Menerima keterbatasan diri dan orang lain serta memahami bahwa setiap orang tetap memiliki martabat.', 'Murid menunjukkan sikap rendah hati dan menghargai kemampuan maupun keterbatasan orang lain.'),
        t('g6-pak-buah-roh', 'Buah Roh dalam interaksi dengan sesama', 'Memahami dan mempraktikkan nilai buah Roh dalam hubungan dengan keluarga, teman, dan masyarakat.', 'Murid mengidentifikasi perilaku yang mencerminkan buah Roh dalam situasi sehari-hari.'),
      ]},
      { title: 'Gereja dan Masyarakat Majemuk', topics: [
        t('g6-pak-pelayanan', 'Pelayanan kepada sesama', 'Memahami pelayanan sebagai tanggung jawab orang beriman dan menerapkannya dalam kehidupan sehari-hari.', 'Murid merancang atau menceritakan tindakan pelayanan sederhana.'),
        t('g6-pak-toleransi', 'Hidup rukun dan toleransi dalam masyarakat majemuk', 'Menghargai perbedaan agama, budaya, dan latar belakang serta membangun hidup rukun.', 'Murid memilih tindakan yang menunjukkan toleransi dan penghormatan terhadap perbedaan.'),
      ]},
      { title: 'Alam dan Lingkungan Hidup', topics: [
        t('g6-pak-ciptaan-allah', 'Alam sebagai ciptaan Allah', 'Memahami alam sebagai ciptaan Allah dan mensyukuri keindahan serta manfaatnya.', 'Murid menjelaskan alasan alam perlu dihargai dan dijaga.'),
        t('g6-pak-lingkungan', 'Tanggung jawab memelihara lingkungan hidup', 'Menerapkan tanggung jawab orang beriman dalam merawat, mengelola, dan melestarikan lingkungan.', 'Murid menyusun tindakan nyata menjaga lingkungan rumah atau sekolah.'),
      ]},
    ],
  },
  'Pendidikan Agama Katolik dan Budi Pekerti': {
    label: 'Pendidikan Agama Katolik dan Budi Pekerti',
    sourceNote: 'Mengacu pada CP Pendidikan Agama Katolik Fase C dalam Keputusan Kepala BSKAP Nomor 046/H/KR/2025 dan buku siswa SIBI Pendidikan Agama Katolik dan Budi Pekerti untuk SD Kelas VI ISBN 978-602-244-690-3 (Edisi 1), penulis FX. Dapiyanta dan Marianus Didi Kasmudi. Cakupan Fase C dipetakan menurut empat elemen: Pribadi Peserta Didik, Yesus Kristus, Gereja, dan Masyarakat. Topik adalah ringkasan CP, bukan klaim urutan bab buku.',
    groups: [
      { title: 'Pribadi Peserta Didik', topics: [
        t('g6-pakatholik-pribadi', 'Diri sebagai citra Allah yang sederajat', 'Memahami diri sebagai perempuan atau laki-laki yang diciptakan secitra dengan Allah, sederajat, dan saling melengkapi.', 'Murid menunjukkan sikap menghargai martabat dan kesetaraan setiap pribadi.'),
        t('g6-pakatholik-warga', 'Hak dan kewajiban sebagai warga negara dan warga dunia', 'Memahami hak dan kewajiban, kebanggaan sebagai bangsa Indonesia, dan tanggung jawab sebagai warga dunia.', 'Murid memberi contoh pelaksanaan hak dan kewajiban secara bertanggung jawab.'),
      ]},
      { title: 'Yesus Kristus', topics: [
        t('g6-pakatholik-tokoh-alkitab', 'Keteladanan tokoh-tokoh Kitab Suci', 'Mengenal keteladanan Daud, Salomo, Ester, Maria, Elisabet, Elia, Amos, dan Yesaya sesuai CP Fase C.', 'Murid menjelaskan nilai keteladanan tokoh Kitab Suci yang dipelajari.'),
        t('g6-pakatholik-yesus', 'Yesus Kristus: pengampunan, wafat, dan kebangkitan', 'Memahami ketaatan Yesus kepada Allah, pengampunan, pewartaan Kerajaan Allah, sengsara, wafat, kebangkitan, dan pengutusan Roh Kudus.', 'Murid menceritakan peristiwa penting dalam karya dan kehidupan Yesus serta maknanya.'),
      ]},
      { title: 'Gereja', topics: [
        t('g6-pakatholik-gereja', 'Gereja sebagai persekutuan umat Allah', 'Memahami keterlibatan dalam kehidupan menggereja serta makna Gereja yang satu, kudus, katolik, dan apostolik.', 'Murid memberi contoh keterlibatan dalam kehidupan menggereja.'),
        t('g6-pakatholik-pengharapan', 'Persekutuan para kudus dan pengharapan iman', 'Mengenal persekutuan para kudus, pengampunan dosa, kebangkitan badan, dan kehidupan kekal sesuai ajaran Gereja Katolik.', 'Murid menjelaskan pokok iman yang dipelajari dengan bahasa sederhana.'),
      ]},
      { title: 'Masyarakat', topics: [
        t('g6-pakatholik-keadilan', 'Kejujuran, hati nurani, dan keadilan', 'Menerapkan kejujuran, menggunakan hati nurani, dan memperjuangkan keadilan dalam kehidupan sehari-hari.', 'Murid menentukan tindakan jujur dan adil dalam situasi konkret.'),
        t('g6-pakatholik-lingkungan', 'Pelestarian lingkungan dan dialog antarumat beragama', 'Memahami tanggung jawab menjaga lingkungan serta membangun dialog dan sikap hormat kepada pemeluk agama lain.', 'Murid merancang tindakan menjaga lingkungan dan menunjukkan sikap dialogis.'),
      ]},
    ],
  },
  'Bahasa Jawa': {
    label: 'Bahasa Jawa',
    sourceNote: 'Mengikuti buku Grengseng Basa Jawa Kelas VI, Muatan Lokal Wajib Provinsi Jawa Tengah, CV Media Karya Putra 2025, ISBN 978-623-287-482-4. Struktur mengikuti lima Pasinaon. Setiap Pasinaon memuat Pitakon Panggugah, Materi, Njembarake Kawruh, Pitutur Luhur, Dudutan, Assesmen Sumatif, dan Refleksi; gunakan susunan ini saat menyusun materi ajar.',
    groups: [
      { title: 'Pasinaon 1 — Ngajeni Guru', topics: [
        t('g6-jawa-p1-ngajeni', 'Ngajeni guru lan unggah-ungguh', 'Memahami sikap hormat marang guru, tata krama, unggah-ungguh basa, lan tumindak santun ing sekolah.', 'Murid bisa nerangake lan nindakake sikap ngajeni guru.'),
        t('g6-jawa-p1-pitutur', 'Pitutur luhur babagan ngajeni', 'Nggoleki piwulang becik lan tuladha tumindak saka materi ngajeni guru.', 'Murid bisa nyebutake pitutur luhur lan tuladha ing urip saben dina.'),
      ]},
      { title: 'Pasinaon 2 — Crita Wayang', topics: [
        t('g6-jawa-p2-wayang', 'Crita wayang lan paraga', 'Maca utawa nyemak crita wayang, ngenali paraga, watak, papan, lan urutan kedadeyan.', 'Murid bisa nyritakake maneh isi crita lan watak paraga.'),
        t('g6-jawa-p2-piwulang', 'Piwulang ing crita wayang', 'Nafsirake piwulang lan akibat saka tumindake paraga wayang.', 'Murid bisa njlentrehake piwulang luhur saka crita wayang.'),
      ]},
      { title: 'Pasinaon 3 — Tembang Macapat Mijil', topics: [
        t('g6-jawa-p3-mijil', 'Tembang Macapat Mijil', 'Ngenali ciri, paugeran, guru gatra, guru wilangan, lan guru lagu tembang Mijil.', 'Murid bisa ngenali paugeran tembang Mijil.'),
        t('g6-jawa-p3-teges', 'Teges lan pitutur tembang Mijil', 'Nyemak, maca, lan napsirake isi, kosakata, pesen, sarta pitutur luhur tembang Mijil.', 'Murid bisa nerangake teges lan piwulang tembang Mijil.'),
      ]},
      { title: 'Pasinaon 4 — Tradhisi', topics: [
        t('g6-jawa-p4-tradhisi', 'Tradhisi lan kabudayan Jawa', 'Ngenali tradhisi masyarakat Jawa, tata cara, wektu, papan, lan masyarakat sing melu.', 'Murid bisa njlentrehake tradhisi lan urutan kagiyatane.'),
        t('g6-jawa-p4-nilai', 'Nilai luhur ing tradhisi', 'Ngrembug gotong royong, rasa syukur, kerukunan, lan nguri-uri budaya.', 'Murid bisa nemokake nilai becik saka tradhisi.'),
      ]},
      { title: 'Pasinaon 5 — Sesaji Rewanda', topics: [
        t('g6-jawa-p5-sesaji', 'Sesaji Rewanda minangka tradhisi lokal', 'Mangerteni informasi, latar, pihak sing melu, lan urutan kagiyatan Sesaji Rewanda.', 'Murid bisa nyritakake informasi pokok lan urutan tradhisi.'),
        t('g6-jawa-p5-nilai', 'Kearifan lokal lan pitutur luhur Sesaji Rewanda', 'Nggoleki nilai budaya, rasa syukur, gotong royong, lan piwulang nguri-uri lingkungan.', 'Murid bisa nerangake nilai luhur lan ngajeni budaya lokal.'),
      ]},
    ],
  },
}

export const CURRICULUM_CATALOGS: Record<CurriculumTrack, CurriculumCatalog> = { TKA: TKA_SD_CATALOG, GRADE_6: GRADE_6_CATALOG }
export function getCurriculumTopics(track: CurriculumTrack, subject: string): CurriculumTopic[] {
  const selected = CURRICULUM_CATALOGS[track][subject]
  return selected ? selected.groups.flatMap((group) => group.topics) : []
}
export const CURRICULUM_SOURCE_REFERENCES = [
  { id: 'tka-sd-framework', title: 'Kerangka Asesmen TKA SD/MI/Sederajat', publisher: 'Pusat Asesmen Pendidikan, Kemendikdasmen', url: 'https://pusmendik.kemendikdasmen.go.id/tka/kerangka/sd/', reviewedAt: '2026-11-22' },
  { id: 'cp-046-hk-2025', title: 'Keputusan Kepala BSKAP Nomor 046/H/KR/2025 tentang Capaian Pembelajaran', publisher: 'Kemendikdasmen', url: 'https://kurikulum.kemendikdasmen.go.id/file/1753929861_manage_file.pdf', reviewedAt: '2026-11-22' },
  { id: 'guide-bahasa-indonesia-2025', title: 'Panduan Mata Pelajaran Bahasa Indonesia Fase A–F (2025)', publisher: 'Pusat Kurikulum dan Pembelajaran', url: 'https://repositori.kemendikdasmen.go.id/33598/1/4.%20Panduan%20Mata%20Pelajaran%20Bahasa%20Indonesia_16_09_2025_Revisi%203.pdf', reviewedAt: '2026-11-22' },
  { id: 'guide-matematika-2025', title: 'Panduan Mata Pelajaran Matematika Fase A–F (2025)', publisher: 'Pusat Kurikulum dan Pembelajaran', url: 'https://repositori.kemendikdasmen.go.id/33608/1/5.%20Final%20Panduan%20Mata%20Pelajaran%20Matematika_12_09_2025_Revisi%203.pdf', reviewedAt: '2026-11-22' },
  { id: 'guide-ipas-2025', title: 'Panduan Mata Pelajaran IPAS Fase A–C (2025)', publisher: 'Pusat Kurikulum dan Pembelajaran', url: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/7.%20Final%20Panduan%20Mata%20Pelajaran%20IPAS_03_10_2025_Revisi%204.pdf', reviewedAt: '2026-11-22' },
  { id: 'guide-pancasila-2025', title: 'Panduan Mata Pelajaran Pendidikan Pancasila Fase A–F (2025)', publisher: 'Pusat Kurikulum dan Pembelajaran', url: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/2.%20Final%20Panduan%20Mata%20Pelajaran%20Pendidikan%20Pancasila_12_09_2025_Revisi%203.pdf', reviewedAt: '2026-11-22' },

  { id: 'book-bi-grade6-rev-2025', title: 'Bahasa Indonesia Anak-Anak yang Mengubah Dunia Kelas VI Edisi Revisi 2025, ISBN 978-634-00-2617-7', publisher: 'Pusat Perbukuan Kemendikdasmen', url: 'https://buku.kemendikdasmen.go.id', reviewedAt: '2026-11-23' },
  { id: 'guide-bi-grade6-rev-2025', title: 'Panduan Guru Bahasa Indonesia Kelas VI Edisi Revisi 2025, ISBN 978-634-00-2484-5', publisher: 'Pusat Perbukuan Kemendikdasmen', url: 'https://buku.kemendikdasmen.go.id', reviewedAt: '2026-11-23' },
  { id: 'book-ipas-grade6-rev-2025', title: 'IPAS Kelas VI Edisi Revisi 2025, ISBN 978-634-00-2164-6', publisher: 'Pusat Perbukuan Kemendikdasmen', url: 'https://buku.kemendikdasmen.go.id', reviewedAt: '2026-11-23' },
  { id: 'guide-ipas-grade6-rev-2025', title: 'Panduan Guru IPAS Kelas VI Edisi Revisi 2025, ISBN 978-634-00-2168-4', publisher: 'Pusat Perbukuan Kemendikdasmen', url: 'https://buku.kemendikdasmen.go.id', reviewedAt: '2026-11-23' },
  { id: 'book-english-nusantara-kids-grade6-2024', title: 'English for Nusantara Kids Kelas VI 2024, ISBN 978-623-388-245-3', publisher: 'Pusat Perbukuan Kemendikbudristek', url: 'https://buku.kemdikbud.go.id', reviewedAt: '2026-11-23' },
  { id: 'book-grengseng-jawa-grade6-2025', title: 'Grengseng Basa Jawa Kelas VI 2025, ISBN 978-623-287-482-4', publisher: 'CV Media Karya Putra', url: 'https://jdih.jatengprov.go.id/inventarisasi-hukum/detail/kepgub_100-3-3-1-5_th_2026', reviewedAt: '2026-11-23' },
  { id: 'guide-pjok-2025', title: 'Panduan Mata Pelajaran PJOK Fase A–F (2025)', publisher: 'Pusat Kurikulum dan Pembelajaran', url: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/Panduan%20Mata%20Pelajaran%20PJOK.pdf', reviewedAt: '2026-11-23' },
  { id: 'book-pai-grade6', title: 'Pendidikan Agama Islam dan Budi Pekerti untuk SD/MI Kelas VI, ISBN 978-602-244-676-7, Edisi 1', publisher: 'Pusat Perbukuan Kemendikdasmen', url: 'https://buku.kemendikdasmen.go.id/katalog/pendidikan-agama-islam-dan-budi-pekerti-untuk-sdmi-kelas-vi', reviewedAt: '2026-11-23' },
  { id: 'guide-pai-grade6', title: 'Panduan Guru Pendidikan Agama Islam dan Budi Pekerti untuk SD/MI Kelas VI, ISBN 978-602-244-675-0, Edisi 1', publisher: 'Pusat Perbukuan Kemendikdasmen', url: 'https://buku.kemendikdasmen.go.id/katalog/buku-panduan-guru-pendidikan-agama-islam-dan-budi-pekerti-untuk-sdmi-kelas-vi', reviewedAt: '2026-11-23' },
  { id: 'guide-pak-grade6', title: 'Panduan Guru Pendidikan Agama Kristen dan Budi Pekerti untuk SD Kelas VI, ISBN 978-602-244-666-8, Edisi 1', publisher: 'Pusat Perbukuan Kemendikdasmen', url: 'https://buku.kemendikdasmen.go.id/katalog/buku-panduan-guru-pendidikan-agama-kristen-dan-budi-pekerti-untuk-sd-kelas-vi', reviewedAt: '2026-11-23' },
  { id: 'book-pakatolik-grade6', title: 'Pendidikan Agama Katolik dan Budi Pekerti untuk SD Kelas VI, ISBN 978-602-244-690-3, Edisi 1', publisher: 'Pusat Perbukuan Kemendikdasmen', url: 'https://buku.kemendikdasmen.go.id/katalog/pendidikan-agama-katolik-dan-budi-pekerti-untuk-sd-kelas-vi', reviewedAt: '2026-11-23' },
  { id: 'book-pjok-grade6-2026', title: 'Pendidikan Jasmani, Olahraga, dan Kesehatan untuk SD/MI Kelas VI, ISBN 978-634-00-3173-7', publisher: 'Pusat Perbukuan Kemendikdasmen', url: 'https://buku.kemendikdasmen.go.id/katalog/pendidikan-jasmani-olahraga-dan-kesehatan-untuk-sdmi-kelas-vi', reviewedAt: '2026-11-23' },
  { id: 'perbup-semarang-14-2022', title: 'Peraturan Bupati Semarang Nomor 14 Tahun 2022 tentang Muatan Lokal Bahasa Jawa', publisher: 'Pemerintah Kabupaten Semarang', url: 'https://peraturan.bpk.go.id/Details/211472/perbup-kab-semarang-no-14-tahun-2022', reviewedAt: '2026-11-23' },
  { id: 'kepgub-jateng-jawa-2026', title: 'Keputusan Gubernur Jawa Tengah Nomor 100.3.3.1/5 Tahun 2026 tentang Buku Teks Muatan Lokal Bahasa Jawa', publisher: 'Pemerintah Provinsi Jawa Tengah', url: 'https://jdih.jatengprov.go.id/inventarisasi-hukum/detail/kepgub_100-3-3-1-5_th_2026', reviewedAt: '2026-11-23' },
  { id: 'rkpd-semarang-2026', title: 'Rencana Kerja Pemerintah Daerah Kabupaten Semarang Tahun 2026 (data pelestarian seni budaya daerah)', publisher: 'Pemerintah Kabupaten Semarang', url: 'https://jdih.jatengprov.go.id/datacenter/files/inventarisasi-hukum/24/2025pb3322015.pdf', reviewedAt: '2026-11-23' },

] as const


/**
 * Subject-level provenance. Topic descriptions and indicators in this catalog are
 * curated summaries for authoring support, not verbatim official CP/assessment text.
 * School ATP and teaching materials remain the authority for local sequencing.
 */
export type CurriculumSubjectMetadata = {
  basis: 'TKA_FRAMEWORK' | 'CP_PHASE_C' | 'LOCAL_CONTENT'
  phase: 'TKA_SD' | 'C'
  sourceRefIds: string[]
  sequencePolicy: 'ASSESSMENT_FRAMEWORK' | 'SCHOOL_ATP' | 'SCHOOL_ATP_AND_LOCAL_RULES'
}
export const CURRICULUM_SUBJECT_METADATA: Record<CurriculumTrack, Record<string, CurriculumSubjectMetadata>> = {
  TKA: {
    'Bahasa Indonesia': { basis: 'TKA_FRAMEWORK', phase: 'TKA_SD', sourceRefIds: ['tka-sd-framework'], sequencePolicy: 'ASSESSMENT_FRAMEWORK' },
    Matematika: { basis: 'TKA_FRAMEWORK', phase: 'TKA_SD', sourceRefIds: ['tka-sd-framework'], sequencePolicy: 'ASSESSMENT_FRAMEWORK' },
  },
  GRADE_6: {
    Matematika: { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'guide-matematika-2025'], sequencePolicy: 'SCHOOL_ATP' },
    'Bahasa Indonesia': { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'book-bi-grade6-rev-2025', 'guide-bi-grade6-rev-2025'], sequencePolicy: 'SCHOOL_ATP' },
    IPAS: { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'book-ipas-grade6-rev-2025', 'guide-ipas-grade6-rev-2025'], sequencePolicy: 'SCHOOL_ATP' },
    'Pendidikan Pancasila': { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'guide-pancasila-2025'], sequencePolicy: 'SCHOOL_ATP' },
    'Bahasa Inggris': { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'book-english-nusantara-kids-grade6-2024'], sequencePolicy: 'SCHOOL_ATP' },
    PJOK: { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'guide-pjok-2025', 'book-pjok-grade6-2026'], sequencePolicy: 'SCHOOL_ATP' },
    'Pendidikan Agama Islam dan Budi Pekerti': { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'book-pai-grade6', 'guide-pai-grade6'], sequencePolicy: 'SCHOOL_ATP' },
    'Pendidikan Agama Kristen dan Budi Pekerti': { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'guide-pak-grade6'], sequencePolicy: 'SCHOOL_ATP' },
    'Pendidikan Agama Katolik dan Budi Pekerti': { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'book-pakatolik-grade6'], sequencePolicy: 'SCHOOL_ATP' },
    'Bahasa Jawa': { basis: 'LOCAL_CONTENT', phase: 'C', sourceRefIds: ['kepgub-jateng-jawa-2026', 'book-grengseng-jawa-grade6-2025'], sequencePolicy: 'SCHOOL_ATP_AND_LOCAL_RULES' },
  },
}
