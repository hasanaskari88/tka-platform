import type {
  AssessmentQuestionType,
  CognitiveLevel,
  GradeBand,
  QuestionBlueprint,
} from './contracts'

export type FractionCompetency =
  | 'whole_and_equal_parts'
  | 'identify_denominator'
  | 'identify_numerator'
  | 'read_shaded_parts'
  | 'read_unshaded_parts'
  | 'interpret_remaining_parts'
  | 'fraction_story_problem'
  | 'reason_about_unknown_parts'
  | 'check_fraction_consistency'

export type FractionCompetencyDefinition = {
  id: FractionCompetency
  label: string
  grade: GradeBand
  description: string
  suggestedCognitiveLevels: CognitiveLevel[]
  visualRequirement: 'required' | 'optional' | 'none'
}

export const FRACTION_COMPETENCIES: FractionCompetencyDefinition[] = [
  {
    id: 'whole_and_equal_parts',
    label: 'Mengenali benda utuh dan bagian sama besar',
    grade: 2,
    description: 'Siswa mengenali satu benda utuh dan membedakan bagian yang sama besar.',
    suggestedCognitiveLevels: ['C1', 'C2'],
    visualRequirement: 'required',
  },
  {
    id: 'identify_denominator',
    label: 'Mengenali penyebut',
    grade: 2,
    description: 'Siswa menentukan jumlah seluruh bagian sama besar sebagai penyebut.',
    suggestedCognitiveLevels: ['C1', 'C2'],
    visualRequirement: 'required',
  },
  {
    id: 'identify_numerator',
    label: 'Mengenali pembilang',
    grade: 2,
    description: 'Siswa menentukan banyak bagian yang diperhatikan sebagai pembilang.',
    suggestedCognitiveLevels: ['C1', 'C2'],
    visualRequirement: 'required',
  },
  {
    id: 'read_shaded_parts',
    label: 'Membaca bagian diarsir',
    grade: 2,
    description: 'Siswa menghitung bagian yang diarsir dari keseluruhan bagian sama besar.',
    suggestedCognitiveLevels: ['C1', 'C2'],
    visualRequirement: 'required',
  },
  {
    id: 'read_unshaded_parts',
    label: 'Membaca bagian tidak diarsir',
    grade: 3,
    description: 'Siswa menentukan banyak bagian yang tidak diarsir dan menghubungkannya dengan pecahan.',
    suggestedCognitiveLevels: ['C2', 'C3'],
    visualRequirement: 'required',
  },
  {
    id: 'interpret_remaining_parts',
    label: 'Menentukan bagian tersisa',
    grade: 3,
    description: 'Siswa menafsirkan bagian yang dimakan, digunakan, atau diambil dan menentukan bagian tersisa.',
    suggestedCognitiveLevels: ['C2', 'C3'],
    visualRequirement: 'required',
  },
  {
    id: 'fraction_story_problem',
    label: 'Menyelesaikan cerita pecahan sederhana',
    grade: 3,
    description: 'Siswa mengubah informasi cerita tentang bagian dan keseluruhan menjadi model pecahan.',
    suggestedCognitiveLevels: ['C2', 'C3', 'C4'],
    visualRequirement: 'optional',
  },
  {
    id: 'reason_about_unknown_parts',
    label: 'Menalar bagian yang belum diketahui',
    grade: 4,
    description: 'Siswa menentukan kelompok bagian yang belum diketahui dari informasi yang tersedia.',
    suggestedCognitiveLevels: ['C3', 'C4'],
    visualRequirement: 'required',
  },
  {
    id: 'check_fraction_consistency',
    label: 'Memeriksa kesesuaian informasi pecahan',
    grade: 4,
    description: 'Siswa memeriksa apakah kelompok bagian yang disebutkan konsisten dengan keseluruhan.',
    suggestedCognitiveLevels: ['C3', 'C4', 'C5'],
    visualRequirement: 'optional',
  },
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
  {
    grade: 2,
    questionType: 'multiple_choice',
    competency: 'identify_denominator',
    cognitiveLevel: 'C2',
    subtopic: 'Jumlah seluruh bagian',
    indicator: 'Disajikan satu benda yang dibagi sama besar, siswa menentukan jumlah seluruh bagian.',
    visualRequirement: 'required',
  },
  {
    grade: 2,
    questionType: 'complex_multiple_choice',
    competency: 'read_shaded_parts',
    cognitiveLevel: 'C2',
    subtopic: 'Bagian diarsir',
    indicator: 'Siswa mengidentifikasi informasi yang benar tentang bagian diarsir dan keseluruhan.',
    visualRequirement: 'required',
  },
  {
    grade: 2,
    questionType: 'true_false_matrix',
    competency: 'identify_numerator',
    cognitiveLevel: 'C2',
    subtopic: 'Pembilang dan penyebut',
    indicator: 'Siswa menilai pernyataan sederhana tentang pembilang dan penyebut berdasarkan model bagian sama besar.',
    visualRequirement: 'required',
  },
  {
    grade: 2,
    questionType: 'essay',
    competency: 'whole_and_equal_parts',
    cognitiveLevel: 'C2',
    subtopic: 'Bagian dari benda utuh',
    indicator: 'Siswa menjelaskan hubungan benda utuh dengan bagian-bagian sama besar.',
    visualRequirement: 'required',
  },
  {
    grade: 3,
    questionType: 'multiple_choice',
    competency: 'read_unshaded_parts',
    cognitiveLevel: 'C2',
    subtopic: 'Bagian tidak diarsir',
    indicator: 'Siswa menentukan pecahan yang mewakili bagian tidak diarsir.',
    visualRequirement: 'required',
  },
  {
    grade: 3,
    questionType: 'complex_multiple_choice',
    competency: 'interpret_remaining_parts',
    cognitiveLevel: 'C3',
    subtopic: 'Bagian yang tersisa',
    indicator: 'Siswa memilih semua pernyataan benar tentang bagian yang digunakan dan bagian tersisa.',
    visualRequirement: 'required',
  },
  {
    grade: 3,
    questionType: 'true_false_matrix',
    competency: 'fraction_story_problem',
    cognitiveLevel: 'C3',
    subtopic: 'Cerita pecahan',
    indicator: 'Siswa menilai kebenaran pernyataan berdasarkan informasi pecahan dalam cerita.',
    visualRequirement: 'optional',
  },
  {
    grade: 3,
    questionType: 'essay',
    competency: 'interpret_remaining_parts',
    cognitiveLevel: 'C3',
    subtopic: 'Menjelaskan bagian tersisa',
    indicator: 'Siswa menuliskan langkah menentukan bagian yang tersisa dari keseluruhan.',
    visualRequirement: 'required',
  },
  {
    grade: 4,
    questionType: 'multiple_choice',
    competency: 'reason_about_unknown_parts',
    cognitiveLevel: 'C3',
    subtopic: 'Bagian yang belum diketahui',
    indicator: 'Siswa menentukan jumlah bagian yang belum diketahui dari total dan bagian yang diketahui.',
    visualRequirement: 'required',
  },
  {
    grade: 4,
    questionType: 'complex_multiple_choice',
    competency: 'check_fraction_consistency',
    cognitiveLevel: 'C4',
    subtopic: 'Memeriksa konsistensi pecahan',
    indicator: 'Siswa memilih seluruh informasi yang konsisten dengan jumlah bagian keseluruhan.',
    visualRequirement: 'optional',
  },
  {
    grade: 4,
    questionType: 'true_false_matrix',
    competency: 'reason_about_unknown_parts',
    cognitiveLevel: 'C4',
    subtopic: 'Menalar model pecahan',
    indicator: 'Siswa menilai beberapa pernyataan tentang bagian diketahui dan bagian yang belum diketahui.',
    visualRequirement: 'required',
  },
  {
    grade: 4,
    questionType: 'essay',
    competency: 'check_fraction_consistency',
    cognitiveLevel: 'C4',
    subtopic: 'Menjelaskan kesesuaian data',
    indicator: 'Siswa menjelaskan apakah informasi jumlah bagian dalam suatu cerita saling sesuai.',
    visualRequirement: 'optional',
  },
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
