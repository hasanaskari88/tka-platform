/**
 * Curated material catalog for TKA SD and Grade 6 learning.
 * Official references reviewed: 22 November 2026.
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
    sourceNote: 'Mengacu pada CP Bahasa Indonesia Fase C (umumnya kelas V–VI): menyimak, membaca dan memirsa, berbicara dan mempresentasikan, serta menulis.',
    groups: [
      { title: 'Menyimak dan Membaca', topics: [
        t('g6-bi-informasi', 'Menganalisis informasi teks nonsastra', 'Menemukan ciri objek, urutan proses, informasi penting, dan hubungan antaride dalam teks informasi.', 'Murid menganalisis informasi, ciri objek, atau urutan proses dari teks nonsastra.'),
        t('g6-bi-sastra', 'Menganalisis teks sastra', 'Memahami unsur cerita, peristiwa, nilai, pesan, dan perubahan tokoh dalam teks sastra.', 'Murid menganalisis tokoh, peristiwa, nilai, atau pesan dalam teks sastra.'),
        t('g6-bi-visual', 'Memahami teks visual dan audiovisual', 'Menafsirkan informasi dari bacaan, gambar, infografik, tayangan, atau gabungan teks dan visual.', 'Murid menggabungkan informasi dari teks dan unsur visual untuk menjawab pertanyaan.'),
        t('g6-bi-kosakata', 'Kosakata dan makna kontekstual', 'Memahami kosakata baru, makna denotatif dan konotatif terbatas, ungkapan, serta pilihan kata sesuai konteks.', 'Murid menentukan makna kata atau ungkapan berdasarkan konteks teks.'),
      ]},
      { title: 'Berbicara dan Menulis', topics: [
        t('g6-bi-presentasi', 'Menyampaikan pendapat dan presentasi', 'Menyampaikan gagasan, tanggapan, dan hasil pengamatan secara runtut dengan alasan yang sesuai.', 'Murid menyampaikan pendapat atau hasil pengamatan secara runtut dan didukung alasan.'),
        t('g6-bi-menulis', 'Menulis berbagai jenis teks', 'Menulis teks berdasarkan pengamatan atau pengalaman dengan kalimat kompleks, kosakata tepat, dan kaidah kebahasaan.', 'Murid menyusun teks yang runtut, jelas, dan sesuai tujuan serta kaidah kebahasaan.'),
        t('g6-bi-ringkasan', 'Meringkas dan menyajikan kembali informasi', 'Menyusun ringkasan, laporan, atau bagan berdasarkan informasi dari beberapa bagian teks.', 'Murid menyajikan kembali informasi utama secara ringkas tanpa mengubah makna.'),
      ]},
    ],
  },
  IPAS: {
    label: 'IPAS',
    sourceNote: 'Mengacu pada CP IPAS Fase C (umumnya kelas V–VI), meliputi pemahaman alam dan sosial serta keterampilan proses penyelidikan.',
    groups: [
      { title: 'Ilmu Pengetahuan Alam', topics: [
        t('g6-ipas-organ', 'Sistem organ tubuh dan kesehatan', 'Menghubungkan sistem organ manusia dengan fungsi tubuh, kebiasaan hidup sehat, dan upaya menjaga kesehatan.', 'Murid menjelaskan hubungan sistem organ dengan cara menjaga kesehatan tubuh.'),
        t('g6-ipas-ekosistem', 'Ekosistem dan hubungan makhluk hidup', 'Menganalisis hubungan komponen biotik dan abiotik serta dampak perubahan pada keseimbangan ekosistem.', 'Murid menganalisis hubungan komponen biotik dan abiotik dalam suatu ekosistem.'),
        t('g6-ipas-bunyi-cahaya', 'Gelombang bunyi dan cahaya', 'Menjelaskan sifat atau fenomena bunyi dan cahaya melalui peristiwa dalam kehidupan sehari-hari.', 'Murid menjelaskan fenomena bunyi atau cahaya berdasarkan pengamatan dan konsep sederhana.'),
        t('g6-ipas-energi', 'Energi, penghematan, dan perubahan iklim', 'Mengenali sumber energi, upaya penghematan, dan pemanfaatan energi alternatif untuk mengurangi dampak perubahan iklim.', 'Murid memilih atau menjelaskan tindakan penghematan energi dan pemanfaatan energi alternatif.'),
        t('g6-ipas-tatasurya', 'Tata surya, rotasi, dan revolusi bumi', 'Menjelaskan susunan tata surya dan kaitan rotasi serta revolusi bumi dengan gejala yang diamati.', 'Murid menjelaskan sistem tata surya dan akibat rotasi atau revolusi bumi.'),
      ]},
      { title: 'Ilmu Pengetahuan Sosial', topics: [
        t('g6-ipas-geografi', 'Letak dan kondisi geografis Indonesia', 'Menggunakan peta konvensional atau digital untuk memahami letak, wilayah, dan kondisi geografis Indonesia.', 'Murid membaca peta dan menjelaskan letak atau kondisi geografis Indonesia.'),
        t('g6-ipas-sejarah', 'Sejarah perjuangan bangsa dan tokoh', 'Meninjau peristiwa perjuangan bangsa, tokoh, perubahan, dan nilai yang dapat dipelajari dari sejarah.', 'Murid menghubungkan peristiwa sejarah dengan tokoh, sebab, akibat, atau nilai perjuangan.'),
        t('g6-ipas-sosial-ekonomi', 'Kegiatan ekonomi dan kehidupan masyarakat', 'Mempelajari kebutuhan, kegiatan ekonomi, interaksi sosial, serta perubahan kehidupan masyarakat di lingkungan sekitar.', 'Murid menganalisis hubungan kegiatan ekonomi atau interaksi sosial dengan kehidupan masyarakat.'),
      ]},
      { title: 'Keterampilan Proses', topics: [
        t('g6-ipas-penyelidikan', 'Mengamati dan merancang penyelidikan', 'Mengajukan pertanyaan, membuat prediksi, merencanakan langkah penyelidikan, dan menggunakan alat ukur sederhana.', 'Murid menentukan pertanyaan, prediksi, atau langkah penyelidikan yang sesuai.'),
        t('g6-ipas-data', 'Mengolah data dan mengomunikasikan hasil', 'Mengorganisasikan data, mengenali pola, membandingkan hasil dengan prediksi, membuat refleksi, dan menyampaikan temuan.', 'Murid membaca data hasil pengamatan dan menyusun simpulan berdasarkan bukti.'),
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
    sourceNote: 'Mengacu pada CP Bahasa Inggris Fase C; fokus komunikasi lisan dan tulisan tentang topik kehidupan sehari-hari dengan sasaran kemampuan dasar sekitar A1.',
    groups: [
      { title: 'Everyday Communication', topics: [
        t('g6-en-identity', 'Personal information and identity', 'Memahami dan menyampaikan informasi diri, keluarga, kesukaan, dan kegiatan sehari-hari.', 'Murid memahami atau menggunakan ungkapan sederhana untuk menyampaikan informasi diri.'),
        t('g6-en-routines', 'Daily routines and time', 'Memahami kosakata kegiatan harian, waktu, urutan aktivitas, dan kebiasaan.', 'Murid mengidentifikasi informasi tentang rutinitas dan waktu dari teks atau dialog sederhana.'),
        t('g6-en-description', 'Describing people, places, and things', 'Mendeskripsikan orang, tempat, benda, dan lingkungan dengan kosakata serta kalimat sederhana.', 'Murid memilih deskripsi yang sesuai dengan objek, tempat, atau orang.'),
        t('g6-en-instructions', 'Instructions and directions', 'Memahami instruksi, petunjuk, lokasi, dan arah sederhana dalam konteks sehari-hari.', 'Murid mengikuti atau menentukan petunjuk dan arah berdasarkan informasi sederhana.'),
        t('g6-en-reading', 'Reading short everyday texts', 'Memahami pesan, label, jadwal, pengumuman, dialog, atau paragraf pendek tentang kehidupan sehari-hari.', 'Murid menemukan informasi utama dan rincian dalam teks Bahasa Inggris sederhana.'),
        t('g6-en-writing', 'Writing simple messages and descriptions', 'Menulis pesan, kalimat, atau deskripsi sederhana dengan kosakata yang sesuai konteks.', 'Murid melengkapi atau menyusun kalimat sederhana sesuai tujuan komunikasi.'),
      ]},
    ],
  },

  'PJOK': {
    label: 'PJOK',
    sourceNote: 'Mengacu pada Panduan PJOK Fase C (umumnya kelas V–VI): keterampilan gerak, belajar melalui gerak, gaya hidup aktif, dan memilih hidup sehat. Materi praktik perlu disesuaikan dengan fasilitas, keselamatan, dan kondisi murid.',
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
  'Bahasa Jawa': {
    label: 'Bahasa Jawa',
    sourceNote: 'Muatan lokal Jawa Tengah, diselaraskan dengan CP Bahasa Jawa Fase C (kelas V–VI), Keputusan Gubernur Jawa Tengah Nomor 100.3.3.1/5 Tahun 2026 tentang buku teks muatan lokal, serta Perbup Kabupaten Semarang Nomor 14 Tahun 2022. Urutan dan kedalaman materi mengikuti buku yang digunakan sekolah dan ATP satuan pendidikan.',
    groups: [
      { title: 'Menyimak lan Mangerteni', topics: [
        t('g6-jawa-nyemak', 'Nyemak pawarta lan informasi', 'Memahami gagasan pokok, rincian, pesan, dan instruksi lisan berbahasa Jawa ngoko atau krama dalam konteks sehari-hari.', 'Murid nemtokake gagasan pokok, informasi wigati, utawa pesen saka teks lisan basa Jawa.'),
        t('g6-jawa-teks-informasi', 'Teks informasi babagan tradhisi lan budaya', 'Membaca dan mengolah informasi tentang tradisi, budaya, lingkungan, serta peristiwa di Jawa Tengah dan Kabupaten Semarang.', 'Murid nemokake informasi, urutan kedadeyan, lan nilai budaya saka teks informasi basa Jawa.'),
        t('g6-jawa-cerita', 'Crita legenda lan wayang', 'Memahami tokoh, watak, alur, konflik, dan nilai budi pekerti dalam cerita legenda serta kisah wayang Pandawa dan Punakawan.', 'Murid njlentrehake paraga, watak, kedadeyan, utawa piwulang saka crita legenda lan wayang.'),
        t('g6-jawa-geguritan', 'Geguritan lan tembang Macapat', 'Memahami isi, pilihan kata, suasana, pesan, dan unsur sederhana geguritan serta tembang Maskumambang dan Mijil.', 'Murid napsirake isi, swasana, utawa piwulang ing geguritan lan tembang Macapat.'),
      ]},
      { title: 'Maca lan Nggunakake Basa', topics: [
        t('g6-jawa-unggahungguh', 'Unggah-ungguh basa ngoko lan krama', 'Memilih ragam ngoko atau krama sesuai lawan bicara, tujuan, dan situasi komunikasi; membiasakan tutur santun kepada teman dan orang yang lebih tua.', 'Murid milih ukara ngoko utawa krama sing trep karo kahanan lan wong sing diajak guneman.'),
        t('g6-jawa-kosakata', 'Kosakata, paribasan, bebasan, lan saloka', 'Memahami kosakata dan ungkapan Jawa serta maknanya dalam percakapan, bacaan, dan situasi kehidupan sehari-hari.', 'Murid nemtokake teges tembung utawa ungkapan Jawa adhedhasar konteks ukara.'),
        t('g6-jawa-dialog', 'Pacelathon lan presentasi sederhana', 'Menyusun dialog, menyampaikan pendapat, bertanya, menanggapi, dan mempresentasikan informasi dengan pilihan kata serta intonasi santun.', 'Murid nglengkapi utawa nyusun pacelathon kanthi unggah-ungguh basa sing trep.'),
      ]},
      { title: 'Nulis lan Aksara Jawa', topics: [
        t('g6-jawa-nulis', 'Nulis teks narasi lan deskripsi', 'Menulis teks narasi atau deskripsi berbahasa Jawa dengan urutan gagasan, kosakata, dan unggah-ungguh yang sesuai.', 'Murid nyusun teks narasi utawa deskripsi basa Jawa kanthi runtut lan trep.'),
        t('g6-jawa-aksara', 'Aksara Jawa legena, pasangan, lan sandhangan', 'Membaca dan menulis kalimat sederhana menggunakan aksara Jawa legena, pasangan, sandhangan swara, serta sandhangan panyigeg wanda sesuai materi buku sekolah.', 'Murid maca utawa nulis ukara prasaja nganggo aksara Jawa lan sandhangan sing trep.'),
      ]},
      { title: 'Kabudayan lan Kearifan Lokal', topics: [
        t('g6-jawa-semarang', 'Tradhisi lan kearifan lokal Kabupaten Semarang', 'Mengenali cerita, kesenian, tradisi, lingkungan, dan potensi budaya Kabupaten Semarang sebagai bahan membaca, berdiskusi, dan menulis berbahasa Jawa.', 'Murid njlentrehake informasi utawa nilai becik saka tradhisi lan budaya ing Kabupaten Semarang.'),
        t('g6-jawa-kesenian', 'Kesenian tradisional Kabupaten Semarang', 'Mengenali ragam kesenian daerah seperti ketoprak, kuda lumping atau reog, rodat, karawitan, prajuritan, soreng, warokan, drumblek, pedalangan atau wayang kulit, campursari, dan kuntulan; murid menggunakannya sebagai bahan membaca, wawancara, dialog, dan tulisan berbahasa Jawa.', 'Murid ngenali jinis kesenian tradisional Kabupaten Semarang lan nyritakake fungsi, proses, utawa nilai gotong royong ing sajroning kesenian kasebut.')
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

  { id: 'guide-pjok-2025', title: 'Panduan Mata Pelajaran PJOK Fase A–F (2025)', publisher: 'Pusat Kurikulum dan Pembelajaran', url: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/Panduan%20Mata%20Pelajaran%20PJOK.pdf', reviewedAt: '2026-11-22' },
  { id: 'perbup-semarang-14-2022', title: 'Peraturan Bupati Semarang Nomor 14 Tahun 2022 tentang Muatan Lokal Bahasa Jawa', publisher: 'Pemerintah Kabupaten Semarang', url: 'https://peraturan.bpk.go.id/Details/211472/perbup-kab-semarang-no-14-tahun-2022', reviewedAt: '2026-11-22' },
  { id: 'kepgub-jateng-jawa-2026', title: 'Keputusan Gubernur Jawa Tengah Nomor 100.3.3.1/5 Tahun 2026 tentang Buku Teks Muatan Lokal Bahasa Jawa', publisher: 'Pemerintah Provinsi Jawa Tengah', url: 'https://jdih.jatengprov.go.id/inventarisasi-hukum/detail/kepgub_100-3-3-1-5_th_2026', reviewedAt: '2026-11-22' },
  { id: 'rkpd-semarang-2026', title: 'Rencana Kerja Pemerintah Daerah Kabupaten Semarang Tahun 2026 (data pelestarian seni budaya daerah)', publisher: 'Pemerintah Kabupaten Semarang', url: 'https://jdih.jatengprov.go.id/datacenter/files/inventarisasi-hukum/24/2025pb3322015.pdf', reviewedAt: '2026-11-22' },

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
    'Bahasa Indonesia': { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'guide-bahasa-indonesia-2025'], sequencePolicy: 'SCHOOL_ATP' },
    IPAS: { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'guide-ipas-2025'], sequencePolicy: 'SCHOOL_ATP' },
    'Pendidikan Pancasila': { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'guide-pancasila-2025'], sequencePolicy: 'SCHOOL_ATP' },
    'Bahasa Inggris': { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025'], sequencePolicy: 'SCHOOL_ATP' },
    PJOK: { basis: 'CP_PHASE_C', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'guide-pjok-2025'], sequencePolicy: 'SCHOOL_ATP' },
    'Bahasa Jawa': { basis: 'LOCAL_CONTENT', phase: 'C', sourceRefIds: ['cp-046-hk-2025', 'perbup-semarang-14-2022', 'kepgub-jateng-jawa-2026', 'rkpd-semarang-2026'], sequencePolicy: 'SCHOOL_ATP_AND_LOCAL_RULES' },
  },
}
