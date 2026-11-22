/**
 * Curated starter curriculum catalog for teacher-friendly topic selection.
 * National phase guidance is separated from suggested grade-level sequencing.
 * Source: Kemendikdasmen, Panduan Mata Pelajaran Matematika (2025).
 */
export type CurriculumGradeGuidance = {
  phase: 'A' | 'B'
  phaseLabel: string
  coreFocus: string
  learningSequence: string[]
  explicitTerms: string[]
  avoidAtThisStage: string[]
  teacherNote: string
}

export const FRACTION_CURRICULUM_FRAMEWORK = {
  id: 'math-fractions-part-whole',
  version: 1,
  subject: 'Matematika',
  title: 'Pecahan sebagai Bagian dari Keseluruhan',
  summary: 'Memahami satu keseluruhan, membaginya menjadi bagian sama besar, mengenali bagian, dan menghubungkan model konkret, gambar, serta lambang pecahan secara bertahap.',
  source: {
    title: 'Panduan Mata Pelajaran Matematika Fase A–F dan Fase F Tingkat Lanjut',
    publisher: 'Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kemendikdasmen',
    year: 2025,
    reference: 'Keputusan Kepala BSKAP Nomor 046/H/KR/2025 untuk CP; panduan mata pelajaran Matematika 2025 untuk pemetaan materi esensial.',
    url: 'https://repositori.kemendikdasmen.go.id/33608/1/5.%20Final%20Panduan%20Mata%20Pelajaran%20Matematika_12_09_2025_Revisi%203.pdf',
    status: 'Rujukan nasional yang ditinjau pada 22 November 2026. CP mata pelajaran selain Agama dan Budi Pekerti dinyatakan tetap mengacu pada Keputusan 046/H/KR/2025 melalui siaran pers 23 Juni 2026.',
  },
  stableConcepts: [
    'Satu benda atau kumpulan benda dapat dipandang sebagai satu keseluruhan.',
    'Pembagian yang adil menghasilkan kelompok atau bagian yang sama banyak.',
    'Pecahan menunjukkan hubungan bagian terhadap keseluruhan.',
    'Model konkret dan gambar membantu murid memahami makna sebelum berfokus pada simbol.',
    'Jawaban perlu disertai alasan atau bukti yang sesuai dengan tahap perkembangan murid.',
  ],
  gradeGuidance: {
    2: {
      phase: 'A',
      phaseLabel: 'Fase A (umumnya kelas I–II)',
      coreFocus: 'Berbagi sama banyak serta mengenali setengah dan seperempat melalui benda konkret, gambar, dan pengalaman sehari-hari.',
      learningSequence: [
        'Mengenali satu benda atau kumpulan sebagai satu keseluruhan.',
        'Membagi benda atau kumpulan benda menjadi dua kelompok sama banyak.',
        'Mengenali satu dari dua bagian sama besar sebagai setengah.',
        'Membagi benda menjadi empat bagian sama besar dan mengenali seperempat.',
        'Menjelaskan pembagian adil dengan benda, gambar, atau bahasa sederhana.',
      ],
      explicitTerms: ['utuh', 'sama banyak', 'setengah', 'seperempat', 'bagian'],
      avoidAtThisStage: ['Menuntut hafalan istilah pembilang dan penyebut.', 'Operasi hitung pecahan formal.', 'Pecahan senilai secara simbolik.'],
      teacherNote: 'Panduan Fase A menekankan konteks pembagian sama banyak dan menyebut setengah serta seperempat. Istilah pembilang dan penyebut tidak dijadikan target eksplisit pada pengenalan awal.',
    },
    3: {
      phase: 'B',
      phaseLabel: 'Fase B (umumnya kelas III–IV)',
      coreFocus: 'Memperkuat pecahan sebagai bagian dari keseluruhan melalui pecahan unit dan representasi konkret/visual; mulai membandingkan pecahan unit.',
      learningSequence: [
        'Menghubungkan satu keseluruhan dengan bagian-bagian yang sama besar.',
        'Merepresentasikan pecahan unit seperti 1/2, 1/4, dan 1/8 dengan benda atau gambar.',
        'Menghubungkan banyak bagian yang dipilih dengan lambang pecahan sederhana.',
        'Membandingkan ukuran pecahan berpembilang satu dengan model konkret atau garis bilangan.',
        'Menjelaskan mengapa bagian dari keseluruhan berubah ketika jumlah bagian sama besar berubah.',
      ],
      explicitTerms: ['pecahan', 'pembilang', 'penyebut', 'pecahan unit', 'bagian', 'keseluruhan'],
      avoidAtThisStage: ['Mengandalkan aturan simbol tanpa model atau alasan.', 'Operasi pecahan yang belum menjadi tujuan pembelajaran sekolah.'],
      teacherNote: 'Panduan nasional menetapkan materi pada tingkat fase, bukan membagi secara kaku semua tujuan ke kelas III atau IV. Urutan kelas III pada katalog ini adalah rekomendasi awal yang dapat disesuaikan ATP sekolah.',
    },
    4: {
      phase: 'B',
      phaseLabel: 'Fase B (umumnya kelas III–IV)',
      coreFocus: 'Memperluas pemahaman pecahan unit ke perbandingan/pengurutan pecahan berpenyebut sama dan pengenalan pecahan senilai.',
      learningSequence: [
        'Menguatkan representasi pecahan unit dengan model.',
        'Membandingkan dan mengurutkan pecahan dengan penyebut sama.',
        'Menjelaskan perbandingan menggunakan gambar, model, atau alasan sederhana.',
        'Mengenali pecahan senilai melalui model bagian sama besar.',
        'Menerapkan pemahaman pecahan dalam masalah kontekstual sederhana.',
      ],
      explicitTerms: ['pecahan', 'pembilang', 'penyebut', 'penyebut sama', 'pecahan senilai', 'lebih besar', 'lebih kecil'],
      avoidAtThisStage: ['Mengajarkan algoritma tanpa pemahaman makna.', 'Menganggap semua murid kelas IV harus berada pada urutan yang sama tanpa melihat hasil asesmen awal.'],
      teacherNote: 'Ini rekomendasi urutan pembelajaran dalam Fase B, bukan pembagian resmi nasional yang mengunci materi tertentu hanya untuk kelas IV.',
    },
  } satisfies Record<2 | 3 | 4, CurriculumGradeGuidance>,
  assessmentEvidence: [
    'Murid dapat mengenali keseluruhan dan bagian yang sama besar.',
    'Murid dapat menunjukkan atau memilih model yang sesuai dengan situasi.',
    'Murid dapat menghubungkan gambar dengan istilah atau lambang yang sudah dipelajari.',
    'Murid dapat menjelaskan alasan sederhana sesuai tingkat kelas.',
  ],
  commonMisconceptions: [
    'Menganggap bagian yang bentuknya berbeda tetap sama besar.',
    'Menghitung banyak bagian yang diwarnai tanpa memperhatikan jumlah seluruh bagian.',
    'Mengira semakin besar penyebut selalu berarti pecahan semakin besar.',
    'Menyebut pecahan hanya dari banyak bagian yang dipilih tanpa membandingkannya dengan keseluruhan.',
  ],
  teacherEditable: ['redaksi CP', 'TP', 'ATP', 'indikator', 'konteks lokal', 'kedalaman materi', 'istilah yang digunakan sekolah'],
} as const
