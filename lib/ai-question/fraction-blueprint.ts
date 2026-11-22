import type {
  AssessmentQuestionType,
  CognitiveLevel,
  GradeBand,
  QuestionBlueprint,
} from './contracts'

export type FractionCompetency =
  | 'equal_sharing'
  | 'recognize_half'
  | 'recognize_quarter'
  | 'represent_unit_fraction'
  | 'compare_unit_fractions'
  | 'identify_fraction_parts'
  | 'compare_same_denominator'
  | 'recognize_equivalent_fractions'
  | 'solve_fraction_context'

export type FractionCompetencyDefinition = {
  id: FractionCompetency
  label: string
  grade: GradeBand
  description: string
  suggestedCognitiveLevels: CognitiveLevel[]
  visualRequirement: 'required' | 'optional' | 'none'
}

/**
 * Grade 2 follows Phase A: equal sharing, half and quarter through concrete
 * contexts. Formal numerator/denominator terminology is deliberately excluded.
 * Grades 3-4 are an illustrative progression within Phase B, not a nationally
 * mandated grade-by-grade split; schools may sequence these objectives locally.
 */
export const FRACTION_COMPETENCIES: FractionCompetencyDefinition[] = [
  { id: 'equal_sharing', label: 'Membagi benda sama banyak', grade: 2, description: 'Siswa memahami satu benda utuh atau kumpulan benda melalui kegiatan berbagi sama banyak.', suggestedCognitiveLevels: ['C1', 'C2'], visualRequirement: 'required' },
  { id: 'recognize_half', label: 'Mengenali setengah', grade: 2, description: 'Siswa mengenali satu dari dua bagian sama besar sebagai setengah melalui benda konkret dan gambar.', suggestedCognitiveLevels: ['C1', 'C2'], visualRequirement: 'required' },
  { id: 'recognize_quarter', label: 'Mengenali seperempat', grade: 2, description: 'Siswa mengenali satu dari empat bagian sama besar sebagai seperempat melalui benda konkret dan gambar.', suggestedCognitiveLevels: ['C1', 'C2'], visualRequirement: 'required' },
  { id: 'represent_unit_fraction', label: 'Merepresentasikan pecahan unit', grade: 3, description: 'Siswa menghubungkan model konkret atau visual dengan pecahan unit seperti 1/2, 1/4, dan 1/8.', suggestedCognitiveLevels: ['C2', 'C3'], visualRequirement: 'required' },
  { id: 'compare_unit_fractions', label: 'Membandingkan pecahan berpembilang satu', grade: 3, description: 'Siswa membandingkan ukuran pecahan unit menggunakan model konkret, gambar, atau garis bilangan.', suggestedCognitiveLevels: ['C2', 'C3'], visualRequirement: 'required' },
  { id: 'identify_fraction_parts', label: 'Menghubungkan bagian dengan lambang pecahan', grade: 3, description: 'Siswa menghubungkan banyak bagian yang dipilih dengan keseluruhan dan lambang pecahan sederhana.', suggestedCognitiveLevels: ['C2', 'C3'], visualRequirement: 'required' },
  { id: 'compare_same_denominator', label: 'Membandingkan pecahan berpenyebut sama', grade: 4, description: 'Siswa membandingkan dan mengurutkan pecahan dengan penyebut sama menggunakan model dan alasan.', suggestedCognitiveLevels: ['C2', 'C3', 'C4'], visualRequirement: 'optional' },
  { id: 'recognize_equivalent_fractions', label: 'Mengenali pecahan senilai', grade: 4, description: 'Siswa mengenali pecahan senilai melalui model bagian sama besar dan representasi visual.', suggestedCognitiveLevels: ['C2', 'C3', 'C4'], visualRequirement: 'required' },
  { id: 'solve_fraction_context', label: 'Menyelesaikan masalah pecahan sederhana', grade: 4, description: 'Siswa menggunakan model pecahan untuk menjelaskan atau menyelesaikan masalah kontekstual sederhana.', suggestedCognitiveLevels: ['C3', 'C4'], visualRequirement: 'optional' },
]

export const FRACTION_PILOT_BLUEPRINT: Array<{
  grade: GradeBand
  questionType: AssessmentQuestionType
  competency: FractionCompetency
  cognitiveLevel: CognitiveLevel
  subtopic: string
  indicator: string
  visualRequirement: 'required' | 'optional' | 'none'
}> = [
  { grade: 2, questionType: 'multiple_choice', competency: 'equal_sharing', cognitiveLevel: 'C2', subtopic: 'Membagi sama banyak', indicator: 'Disajikan benda atau kumpulan benda, siswa mengenali pembagian menjadi kelompok sama banyak.', visualRequirement: 'required' },
  { grade: 2, questionType: 'complex_multiple_choice', competency: 'recognize_half', cognitiveLevel: 'C2', subtopic: 'Mengenali setengah', indicator: 'Siswa memilih semua model yang menunjukkan satu dari dua bagian sama besar.', visualRequirement: 'required' },
  { grade: 2, questionType: 'true_false_matrix', competency: 'recognize_quarter', cognitiveLevel: 'C2', subtopic: 'Mengenali seperempat', indicator: 'Siswa menilai pernyataan sederhana tentang satu dari empat bagian sama besar.', visualRequirement: 'required' },
  { grade: 2, questionType: 'essay', competency: 'equal_sharing', cognitiveLevel: 'C2', subtopic: 'Menjelaskan berbagi adil', indicator: 'Siswa menjelaskan dengan kata-kata atau gambar mengapa bagian hasil pembagian harus sama banyak.', visualRequirement: 'required' },
  { grade: 3, questionType: 'multiple_choice', competency: 'represent_unit_fraction', cognitiveLevel: 'C2', subtopic: 'Model pecahan unit', indicator: 'Disajikan model bagian sama besar, siswa memilih lambang pecahan unit yang sesuai.', visualRequirement: 'required' },
  { grade: 3, questionType: 'complex_multiple_choice', competency: 'compare_unit_fractions', cognitiveLevel: 'C3', subtopic: 'Membandingkan pecahan unit', indicator: 'Siswa memilih semua pernyataan yang benar saat membandingkan pecahan berpembilang satu.', visualRequirement: 'required' },
  { grade: 3, questionType: 'true_false_matrix', competency: 'identify_fraction_parts', cognitiveLevel: 'C2', subtopic: 'Bagian dan keseluruhan', indicator: 'Siswa menilai pernyataan tentang bagian yang dipilih dan jumlah seluruh bagian pada model.', visualRequirement: 'required' },
  { grade: 3, questionType: 'essay', competency: 'represent_unit_fraction', cognitiveLevel: 'C3', subtopic: 'Menjelaskan model pecahan', indicator: 'Siswa menjelaskan hubungan satu bagian dengan jumlah bagian sama besar pada satu keseluruhan.', visualRequirement: 'required' },
  { grade: 4, questionType: 'multiple_choice', competency: 'compare_same_denominator', cognitiveLevel: 'C3', subtopic: 'Membandingkan penyebut sama', indicator: 'Siswa menentukan pecahan yang lebih besar ketika penyebut kedua pecahan sama.', visualRequirement: 'optional' },
  { grade: 4, questionType: 'complex_multiple_choice', competency: 'recognize_equivalent_fractions', cognitiveLevel: 'C4', subtopic: 'Pecahan senilai', indicator: 'Siswa memilih semua representasi visual yang menunjukkan nilai pecahan yang sama.', visualRequirement: 'required' },
  { grade: 4, questionType: 'true_false_matrix', competency: 'compare_same_denominator', cognitiveLevel: 'C3', subtopic: 'Mengurutkan pecahan', indicator: 'Siswa menilai pernyataan tentang urutan pecahan dengan penyebut sama.', visualRequirement: 'optional' },
  { grade: 4, questionType: 'essay', competency: 'solve_fraction_context', cognitiveLevel: 'C4', subtopic: 'Masalah kontekstual pecahan', indicator: 'Siswa menjelaskan strategi menggunakan model pecahan untuk menyelesaikan masalah sederhana.', visualRequirement: 'optional' },
]

export function createFractionQuestionBlueprint(
  index: number,
  options: {
    subject?: string
    topic?: string
    blueprintIdPrefix?: string
  } = {},
): QuestionBlueprint {
  const item = FRACTION_PILOT_BLUEPRINT[index]
  if (!item) throw new Error('Indeks blueprint pilot pecahan tidak tersedia.')

  const definition = FRACTION_COMPETENCIES.find((entry) => entry.id === item.competency)
  if (!definition || definition.grade !== item.grade) {
    throw new Error('Kompetensi blueprint tidak sesuai dengan tingkat kelas.')
  }

  return {
    blueprintVersion: 1,
    blueprintId: (options.blueprintIdPrefix || 'fraction-pilot') + '-' + String(index + 1).padStart(2, '0'),
    grade: item.grade,
    subject: options.subject || 'Matematika',
    topic: options.topic || 'Bagian dari keseluruhan',
    subtopic: item.subtopic,
    competency: item.competency,
    indicator: item.indicator,
    cognitiveLevel: item.cognitiveLevel,
    questionType: item.questionType,
    visualRequirement: item.visualRequirement,
  }
}
