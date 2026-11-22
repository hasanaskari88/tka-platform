/**
 * Reusable teaching-material blueprints.
 *
 * These are authoring frameworks, not official verbatim CP/ATP text.
 * Teachers should adapt sequence, depth, examples, and assessment to the
 * school's ATP and the learners' needs.
 */
import { getCurriculumTopics, type CurriculumTrack } from './curriculum-catalog'

export type MaterialBlueprint = {
  id: string
  track: CurriculumTrack
  subject: string
  topicId: string
  title: string
  sourceBasis: 'CURRICULUM_CATALOG_SUMMARY'
  intendedLevel: string
  learningObjectives: string[]
  prerequisites: string[]
  coreConcepts: string[]
  lessonFlow: { stage: string; teacherGuidance: string; studentActivity: string }[]
  workedExamples: { prompt: string; solutionSteps: string[]; answer: string }[]
  commonMisconceptions: { misconception: string; clarification: string }[]
  practiceDesign: { format: string; purpose: string }[]
  differentiation: { support: string[]; extension: string[] }
  teacherAdaptation: string[]
  qualityChecks: string[]
}

const GRADE_6_FRACTIONS: MaterialBlueprint = {
  id: 'g6-mtk-pecahan-material-v1',
  track: 'GRADE_6',
  subject: 'Matematika',
  topicId: 'g6-mtk-pecahan',
  title: 'Pecahan dan Operasi Pecahan',
  sourceBasis: 'CURRICULUM_CATALOG_SUMMARY',
  intendedLevel: 'Kelas 6 SD dalam cakupan Fase C; sesuaikan kedalaman dengan ATP sekolah.',
  learningObjectives: [
    'Membandingkan dan mengurutkan pecahan dengan strategi yang sesuai.',
    'Menjelaskan makna penjumlahan dan pengurangan pecahan melalui model atau garis bilangan.',
    'Menyelesaikan masalah kontekstual yang melibatkan penjumlahan dan pengurangan pecahan.',
    'Menggunakan perkalian atau pembagian pecahan dengan bilangan asli pada konteks yang sesuai.',
    'Menjelaskan langkah penyelesaian dan memeriksa kewajaran jawaban.',
  ],
  prerequisites: [
    'Memahami pecahan sebagai bagian dari satu keseluruhan dan sebagai bilangan.',
    'Mengenali pembilang dan penyebut.',
    'Menentukan pecahan senilai dan menyederhanakan pecahan sederhana.',
    'Menguasai perkalian dan pembagian bilangan cacah dasar.',
  ],
  coreConcepts: [
    'Pecahan menyatakan nilai; pembilang dan penyebut harus ditafsirkan sebagai satu kesatuan.',
    'Pecahan senilai memiliki nilai yang sama meskipun ditulis dengan pembilang dan penyebut berbeda.',
    'Penjumlahan dan pengurangan pecahan memerlukan satuan bagian yang sejenis; penyebut disamakan bila diperlukan.',
    'Perkalian pecahan dapat dimaknai sebagai bagian dari suatu kuantitas.',
    'Pembagian pecahan dengan bilangan asli dapat dimaknai sebagai membagi suatu kuantitas pecahan menjadi beberapa bagian sama besar.',
    'Model gambar, garis bilangan, dan simbol membantu murid menghubungkan makna dengan prosedur.',
  ],
  lessonFlow: [
    {
      stage: 'Apersepsi dan diagnosis',
      teacherGuidance: 'Periksa pemahaman pecahan, pecahan senilai, dan perkalian bilangan cacah melalui pertanyaan singkat tanpa langsung mengajarkan prosedur.',
      studentActivity: 'Murid membaca model gambar pecahan, menyebutkan pembilang dan penyebut, serta menjelaskan pecahan senilai.',
    },
    {
      stage: 'Eksplorasi konsep',
      teacherGuidance: 'Gunakan potongan kertas, gambar pita, atau garis bilangan untuk menunjukkan mengapa satuan bagian perlu sama saat menjumlahkan atau mengurangkan pecahan.',
      studentActivity: 'Murid membandingkan model, menggambar situasi, dan menjelaskan hubungan antarpecahan.',
    },
    {
      stage: 'Pemodelan strategi',
      teacherGuidance: 'Tunjukkan lebih dari satu strategi yang masuk akal, lalu hubungkan model konkret ke bentuk simbolik secara bertahap.',
      studentActivity: 'Murid mengikuti contoh, memberi alasan pada setiap langkah, dan memeriksa hasil dengan perkiraan.',
    },
    {
      stage: 'Latihan terbimbing dan mandiri',
      teacherGuidance: 'Mulai dari soal representasi, lanjut ke operasi, lalu masalah kontekstual dengan tingkat kompleksitas bertahap.',
      studentActivity: 'Murid menyelesaikan soal, membandingkan strategi, dan memperbaiki langkah yang belum tepat.',
    },
    {
      stage: 'Refleksi dan asesmen',
      teacherGuidance: 'Gunakan satu soal penjelasan singkat untuk memeriksa pemahaman, bukan hanya ketepatan hasil hitung.',
      studentActivity: 'Murid menjelaskan strategi dan menilai apakah jawabannya masuk akal.',
    },
  ],
  workedExamples: [
    {
      prompt: 'Ibu menggunakan 1/4 kg tepung pada pagi hari dan 2/4 kg pada sore hari. Berapa kilogram tepung yang digunakan seluruhnya?',
      solutionSteps: [
        'Kedua pecahan memiliki penyebut yang sama, yaitu 4.',
        'Jumlahkan pembilang: 1 + 2 = 3.',
        'Penyebut tetap 4 karena satuan bagiannya sama.',
        'Periksa dengan model: satu bagian dari empat ditambah dua bagian dari empat menjadi tiga bagian dari empat.',
      ],
      answer: '3/4 kg',
    },
    {
      prompt: 'Sebuah pita panjangnya 3/4 meter. Pita itu dipotong menjadi 3 bagian sama panjang. Berapa meter panjang setiap potongan?',
      solutionSteps: [
        'Situasi ini berarti 3/4 dibagi 3.',
        'Membagi 3/4 menjadi 3 bagian sama besar menghasilkan 1/4 untuk setiap bagian.',
        'Periksa: 1/4 + 1/4 + 1/4 = 3/4.',
      ],
      answer: '1/4 meter',
    },
  ],
  commonMisconceptions: [
    {
      misconception: 'Menjumlahkan pembilang dan penyebut sekaligus, misalnya 1/4 + 2/4 = 3/8.',
      clarification: 'Jika penyebut sama, satuan bagiannya sudah sama. Jumlahkan pembilang dan pertahankan penyebut: 1/4 + 2/4 = 3/4.',
    },
    {
      misconception: 'Menganggap penyebut yang lebih besar selalu berarti pecahan lebih besar.',
      clarification: 'Untuk keseluruhan yang sama, semakin banyak bagian sama besar justru membuat setiap bagian lebih kecil. Gunakan gambar atau garis bilangan.',
    },
    {
      misconception: 'Menghafal langkah operasi tanpa memahami konteks dan satuan.',
      clarification: 'Minta murid menggambar atau menceritakan arti pecahan dan memeriksa apakah hasilnya masuk akal dalam konteks soal.',
    },
  ],
  practiceDesign: [
    { format: 'Representasi gambar atau garis bilangan', purpose: 'Memeriksa makna pecahan dan pecahan senilai sebelum prosedur hitung.' },
    { format: 'Pilihan ganda dengan pengecoh berbasis miskonsepsi', purpose: 'Mengidentifikasi pemahaman dan kesalahan umum secara diagnostik.' },
    { format: 'Jawaban singkat dengan langkah penyelesaian', purpose: 'Menilai ketepatan prosedur sekaligus alasan matematis.' },
    { format: 'Masalah kontekstual terbuka', purpose: 'Menilai pemilihan operasi, pemodelan, dan kewajaran jawaban.' },
  ],
  differentiation: {
    support: [
      'Gunakan benda konkret atau gambar yang dibagi menjadi bagian sama besar.',
      'Mulai dari penyebut sama sebelum mengenalkan penyebut berbeda.',
      'Sediakan garis bilangan dan langkah penyelesaian bertahap.',
    ],
    extension: [
      'Minta murid menyelesaikan satu masalah dengan dua strategi dan membandingkannya.',
      'Berikan masalah beberapa langkah yang meminta murid memilih operasi sendiri.',
      'Minta murid membuat soal kontekstual beserta model dan pembahasannya.',
    ],
  },
  teacherAdaptation: [
    'Urutan submateri dan alokasi waktu harus mengikuti ATP sekolah, bukan dianggap urutan nasional yang wajib.',
    'Sesuaikan bilangan, konteks, dan banyaknya langkah dengan hasil asesmen awal murid.',
    'Gunakan konteks dekat dengan kehidupan murid dan hindari konteks yang memerlukan pengetahuan di luar tujuan belajar.',
    'Contoh dan latihan pada blueprint ini adalah bahan pengembangan, bukan soal resmi pemerintah.',
  ],
  qualityChecks: [
    'Setiap tujuan belajar terhubung dengan kegiatan dan asesmen.',
    'Semua contoh hitung telah diperiksa ulang secara matematis.',
    'Satuan keseluruhan dan satuan bagian dijelaskan dengan konsisten.',
    'Tidak ada klaim bahwa urutan materi merupakan ketentuan semester nasional.',
    'Bahasa, angka, dan konteks sesuai dengan kemampuan murid kelas 6.',
  ],
}

export const MATERIAL_BLUEPRINTS: MaterialBlueprint[] = [GRADE_6_FRACTIONS]

export function getMaterialBlueprint(
  track: CurriculumTrack,
  subject: string,
  topicId: string,
): MaterialBlueprint | undefined {
  return MATERIAL_BLUEPRINTS.find(
    (item) => item.track === track && item.subject === subject && item.topicId === topicId,
  )
}

export function validateMaterialBlueprint(blueprint: MaterialBlueprint): string[] {
  const issues: string[] = []
  const topicExists = getCurriculumTopics(blueprint.track, blueprint.subject).some(
    (topic) => topic.id === blueprint.topicId,
  )
  if (!topicExists) issues.push('TOPIC_NOT_IN_CURRICULUM_CATALOG')
  if (!blueprint.learningObjectives.length) issues.push('LEARNING_OBJECTIVES_EMPTY')
  if (!blueprint.prerequisites.length) issues.push('PREREQUISITES_EMPTY')
  if (!blueprint.coreConcepts.length) issues.push('CORE_CONCEPTS_EMPTY')
  if (blueprint.lessonFlow.length < 3) issues.push('LESSON_FLOW_INCOMPLETE')
  if (!blueprint.workedExamples.length) issues.push('WORKED_EXAMPLES_EMPTY')
  if (!blueprint.commonMisconceptions.length) issues.push('MISCONCEPTIONS_EMPTY')
  if (!blueprint.practiceDesign.length) issues.push('PRACTICE_DESIGN_EMPTY')
  if (!blueprint.teacherAdaptation.length) issues.push('TEACHER_ADAPTATION_EMPTY')
  if (!blueprint.qualityChecks.length) issues.push('QUALITY_CHECKS_EMPTY')
  return issues
}
