/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  })
  module._compile(compiled.outputText, filename)
}

const { FRACTION_PILOT_BLUEPRINT, createFractionQuestionBlueprint } =
  require(path.join(__dirname, '../lib/ai-question/fraction-blueprint.ts'))
const { validateGeneratedAssessmentQuestion } =
  require(path.join(__dirname, '../lib/ai-question/validate-question.ts'))

function baseQuestion(index, overrides = {}) {
  const blueprint = createFractionQuestionBlueprint(index)
  const question = {
    contractVersion: 1,
    blueprint,
    questionType: blueprint.questionType,
    question: 'Pizza dibagi menjadi 8 bagian sama besar. 3 bagian diwarnai. Berapa bagian yang diwarnai?',
    explanation: 'Bagian diwarnai ada 3 dari 8 bagian.',
    visualSpec: {
      contractVersion: 2,
      type: 'fraction_partition',
      visualRequirement: blueprint.visualRequirement,
      wholeLabel: 'Pizza',
      totalParts: 8,
      totalEvidenceQuote: '8 bagian',
      statedSegments: [{ role: 'selected', count: 3, evidenceQuote: '3 bagian diwarnai' }],
      askedFor: 'selected',
      actionKey: 'colored',
    },
    options: { A: '3/8', B: '1/8', C: '5/8', D: '8/3' },
    answer: 'A',
    ...overrides,
  }
  return { blueprint, question }
}

const { TKA_SD_CATALOG, GRADE_6_CATALOG, getCurriculumTopics, CURRICULUM_SOURCE_REFERENCES, CURRICULUM_SUBJECT_METADATA } =
  require(path.join(__dirname, '../lib/ai-question/curriculum-catalog.ts'))

assert.equal(FRACTION_PILOT_BLUEPRINT.length, 12)
assert.deepEqual(Object.keys(TKA_SD_CATALOG).sort(), ['Bahasa Indonesia', 'Matematika'])
assert.ok(getCurriculumTopics('TKA', 'Matematika').some((item) => item.title === 'Pecahan senilai'))
assert.ok(getCurriculumTopics('TKA', 'Bahasa Indonesia').some((item) => item.title === 'Menyimpulkan informasi tersirat'))
assert.ok(getCurriculumTopics('GRADE_6', 'IPAS').some((item) => item.title === 'Sistem organ tubuh dan kesehatan'))
assert.ok(getCurriculumTopics('GRADE_6', 'Pendidikan Pancasila').some((item) => item.title === 'Sejarah kelahiran Pancasila'))
assert.ok(getCurriculumTopics('GRADE_6', 'Matematika').some((item) => item.title === 'Bilangan cacah sampai 1.000.000'))
assert.ok(Object.keys(GRADE_6_CATALOG).length >= 5)
assert.ok(Object.keys(GRADE_6_CATALOG).includes('PJOK'))
assert.ok(Object.keys(GRADE_6_CATALOG).includes('Bahasa Jawa'))
assert.ok(getCurriculumTopics('GRADE_6', 'PJOK').some((item) => item.title === 'Kebugaran jasmani dan aktivitas fisik'))
assert.ok(getCurriculumTopics('GRADE_6', 'PJOK').some((item) => item.title === 'Pola makan sehat dan gizi seimbang'))
assert.ok(getCurriculumTopics('GRADE_6', 'Bahasa Jawa').some((item) => item.title === 'Unggah-ungguh basa ngoko lan krama'))
assert.ok(getCurriculumTopics('GRADE_6', 'Bahasa Jawa').some((item) => item.title === 'Aksara Jawa legena, pasangan, lan sandhangan'))
assert.ok(getCurriculumTopics('GRADE_6', 'Bahasa Jawa').some((item) => item.title === 'Kesenian tradisional Kabupaten Semarang'))
assert.deepEqual(
  FRACTION_PILOT_BLUEPRINT.reduce((counts, item) => {
    counts[item.grade] = (counts[item.grade] || 0) + 1
    return counts
  }, {}),
  { 2: 4, 3: 4, 4: 4 },
)

{
  const { blueprint, question } = baseQuestion(0)
  const result = validateGeneratedAssessmentQuestion(question, blueprint)
  assert.equal(result.valid, true, JSON.stringify(result.issues))
}

{
  const { blueprint, question } = baseQuestion(0, {
    question: 'Pizza dibagi menjadi 8 bagian. 3 bagian dimakan dan 4 bagian tersisa.',
    visualSpec: {
      contractVersion: 2,
      type: 'fraction_partition',
      visualRequirement: 'required',
      wholeLabel: 'Pizza',
      totalParts: 8,
      totalEvidenceQuote: '8 bagian',
      statedSegments: [
        { role: 'removed', count: 3, evidenceQuote: '3 bagian dimakan' },
        { role: 'remaining', count: 4, evidenceQuote: '4 bagian tersisa' },
      ],
      askedFor: 'remaining',
      actionKey: 'eaten',
    },
  })
  const result = validateGeneratedAssessmentQuestion(question, blueprint)
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((issue) => issue.code === 'VISUAL_FACTS_CONTRADICT'))
}

{
  const { blueprint, question } = baseQuestion(0, {
    visualSpec: {
      contractVersion: 2,
      type: 'fraction_partition',
      visualRequirement: 'required',
      wholeLabel: 'Pizza',
      totalParts: 8,
      totalEvidenceQuote: 'delapan potong',
      statedSegments: [{ role: 'selected', count: 3, evidenceQuote: '3 bagian diwarnai' }],
      askedFor: 'selected',
      actionKey: 'colored',
    },
  })
  const result = validateGeneratedAssessmentQuestion(question, blueprint)
  assert.ok(result.issues.some((issue) => issue.code === 'VISUAL_EVIDENCE_MISSING'))
}

{
  const { blueprint, question } = baseQuestion(0, { answer: 'C' })
  const result = validateGeneratedAssessmentQuestion(question, blueprint)
  assert.ok(result.issues.some((issue) => issue.code === 'VISUAL_ANSWER_MISMATCH'))
}

{
  const { blueprint, question } = baseQuestion(3, {
    questionType: 'essay',
    modelAnswer: 'Benda dibagi menjadi 4 bagian sama besar.',
    maxScore: 4,
    rubric: [
      { criterion: 'Identifikasi keseluruhan', description: 'Menyebut benda utuh.', points: 1 },
      { criterion: 'Jumlah bagian', description: 'Menyebut empat bagian.', points: 1 },
      { criterion: 'Kesamaan bagian', description: 'Menjelaskan bagian sama besar.', points: 2 },
    ],
    options: undefined,
    answer: undefined,
    visualSpec: {
      contractVersion: 2,
      type: 'fraction_partition',
      visualRequirement: 'required',
      wholeLabel: 'Pizza',
      totalParts: 8,
      totalEvidenceQuote: '8 bagian',
      statedSegments: [{ role: 'selected', count: 3, evidenceQuote: '3 bagian diwarnai' }],
      askedFor: 'selected',
      actionKey: 'colored',
    },
  })
  const result = validateGeneratedAssessmentQuestion(question, blueprint)
  assert.equal(result.valid, true, JSON.stringify(result.issues))
}

{
  const { blueprint, question } = baseQuestion(3, {
    questionType: 'essay',
    modelAnswer: 'Jawaban contoh.',
    maxScore: 4,
    rubric: [{ criterion: 'Kriteria', description: 'Deskripsi', points: 3 }],
    options: undefined,
    answer: undefined,
    visualSpec: {
      contractVersion: 2,
      type: 'fraction_partition',
      visualRequirement: 'required',
      wholeLabel: 'Pizza',
      totalParts: 8,
      totalEvidenceQuote: '8 bagian',
      statedSegments: [{ role: 'selected', count: 3, evidenceQuote: '3 bagian diwarnai' }],
      askedFor: 'selected',
      actionKey: 'colored',
    },
  })
  const result = validateGeneratedAssessmentQuestion(question, blueprint)
  assert.ok(result.issues.some((issue) => issue.code === 'RUBRIC_INVALID'))
}


{
  const { blueprint, question } = baseQuestion(1, {
    questionType: 'complex_multiple_choice',
    answers: ['A', 'C'],
  })
  question.questionType = 'complex_multiple_choice'
  const result = validateGeneratedAssessmentQuestion(question, blueprint)
  assert.equal(result.valid, true, JSON.stringify(result.issues))
}

{
  const { blueprint, question } = baseQuestion(2, {
    questionType: 'true_false_matrix',
    statements: [
      { id: '1', text: 'Jumlah seluruh bagian adalah delapan.', answer: 'Benar' },
      { id: '2', text: 'Bagian diwarnai berjumlah tiga.', answer: 'Benar' },
      { id: '3', text: 'Bagian tidak diwarnai berjumlah lima.', answer: 'Benar' },
    ],
  })
  question.questionType = 'true_false_matrix'
  const result = validateGeneratedAssessmentQuestion(question, blueprint)
  assert.equal(result.valid, true, JSON.stringify(result.issues))
}


assert.equal(CURRICULUM_SUBJECT_METADATA.TKA['Bahasa Indonesia'].basis, 'TKA_FRAMEWORK')
assert.equal(CURRICULUM_SUBJECT_METADATA.TKA.Matematika.phase, 'TKA_SD')
assert.equal(CURRICULUM_SUBJECT_METADATA.GRADE_6.Matematika.phase, 'C')
assert.equal(CURRICULUM_SUBJECT_METADATA.GRADE_6['Bahasa Jawa'].sequencePolicy, 'SCHOOL_ATP_AND_LOCAL_RULES')
assert.ok(getCurriculumTopics('GRADE_6', 'Matematika').every((item) => item.contentStatus === 'CURATED_SUMMARY'))
const sourceIds = new Set(CURRICULUM_SOURCE_REFERENCES.map((item) => item.id))
for (const trackMetadata of Object.values(CURRICULUM_SUBJECT_METADATA)) {
  for (const subjectMetadata of Object.values(trackMetadata)) {
    for (const sourceId of subjectMetadata.sourceRefIds) {
      assert.ok(sourceIds.has(sourceId), `Missing curriculum source reference: ${sourceId}`)
    }
  }
}

console.log('AI question contract and blueprint tests passed.')


const { MATERIAL_BLUEPRINTS, getMaterialBlueprint, validateMaterialBlueprint } =
  require(path.join(__dirname, '../lib/ai-question/material-blueprints.ts'))
assert.equal(MATERIAL_BLUEPRINTS.length, 1)
const fractionMaterial = getMaterialBlueprint('GRADE_6', 'Matematika', 'g6-mtk-pecahan')
assert.ok(fractionMaterial, 'Grade 6 fraction material blueprint should be registered')
assert.equal(fractionMaterial.sourceBasis, 'CURRICULUM_CATALOG_SUMMARY')
assert.deepEqual(validateMaterialBlueprint(fractionMaterial), [])
assert.ok(fractionMaterial.learningObjectives.length >= 3)
assert.ok(fractionMaterial.lessonFlow.length >= 3)
assert.ok(fractionMaterial.workedExamples.length >= 1)
assert.ok(fractionMaterial.teacherAdaptation.some((item) => item.includes('ATP')))
assert.equal(getMaterialBlueprint('TKA', 'Matematika', 'g6-mtk-pecahan'), undefined)
