/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const test = require('node:test')
const ts = require('typescript')

// Load the engine's TypeScript source directly without adding a test dependency.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  })
  module._compile(compiled.outputText, filename)
}

const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options)
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && parent && !path.extname(request)) {
      const candidate = path.resolve(path.dirname(parent.filename), request + '.ts')
      if (fs.existsSync(candidate)) return candidate
    }
    throw error
  }
}

const root = path.resolve(__dirname, '..')
const rational = require(path.join(root, 'lib/visual-math/math/rational.ts'))
const quantity = require(path.join(root, 'lib/visual-math/math/quantity.ts'))
const knownPatterns = require(path.join(root, 'lib/visual-math/analysis/known-patterns.ts'))
const calculator = require(path.join(root, 'lib/visual-math/math/calculator.ts'))
const optionValidation = require(path.join(root, 'lib/visual-math/validation/validate-options.ts'))
const answerValidation = require(path.join(root, 'lib/visual-math/validation/validate-answer.ts'))
const intentValidation = require(path.join(root, 'lib/visual-math/analysis/validate-intent.ts'))
const aiIntentBuilder = require(path.join(root, 'lib/visual-math/analysis/build-ai-intent.ts'))
const factGraphBuilder = require(path.join(root, 'lib/visual-math/semantic/build-fact-graph.ts'))
const semanticValidation = require(path.join(root, 'lib/visual-math/semantic/validate-fact-graph.ts'))
const operationPlanner = require(path.join(root, 'lib/visual-math/math/operation-planner.ts'))
const pictographScale = require(path.join(root, 'lib/visual-math/renderers/pictograph-scale.ts'))
const rendererRegistry = require(path.join(root, 'lib/visual-math/renderers/registry.ts'))
const artifactQuality = require(path.join(root, 'lib/visual-math/quality/validate-artifact.ts'))
const visualLayoutQuality = require(path.join(root, 'lib/visual-math/quality/validate-visual-layout.ts'))
const visualRenderer = require(path.join(root, 'lib/visual-math/renderers/canvas.ts'))

const equalSharingQuestion =
  'Kotak pertama berisi 6 buah jeruk. Jika kotak tersebut dibagi menjadi 5 bagian yang sama, berapa buah jeruk terdapat di satu bagian? Tuliskan dalam bentuk pecahan.'
const categoryQuestion =
  'Dari total 6 jeruk, 8 pisang, dan 10 apel, berapa bagian yang merupakan apel?'

test('rational parser normalizes equivalent fraction forms', () => {
  const expected = '6/5'
  for (const value of [
    '6/5',
    '1 1/5',
    '1\\frac{1}{5}',
    '\\frac{6}{5}',
    '1.2',
    '1,2',
    '120%',
    '1⅕',
  ]) {
    assert.equal(rational.formatFraction(rational.parseRational(value)), expected, value)
  }
})

test('rational parser handles common Unicode fractions and mixed signs', () => {
  assert.equal(rational.formatFraction(rational.parseRational('½')), '1/2')
  assert.equal(rational.formatFraction(rational.parseRational('¾')), '3/4')
  assert.equal(rational.formatMixedNumber(rational.parseRational('-1 1/5')), '-1 1/5')
  assert.equal(rational.formatMixedNumber(rational.parseRational('-0 1/5')), '-1/5')
})

test('invalid and ambiguous rational inputs are rejected without throwing', () => {
  assert.equal(rational.parseRational('1/0'), null)
  assert.equal(rational.parseRational('\\frac{1}{0}'), null)
  assert.equal(rational.parseRational('1.000'), null)
  assert.equal(rational.parseRational('not a number'), null)
})

test('rational arithmetic simplifies exact results', () => {
  assert.equal(rational.formatFraction(rational.add(rational.rational(1, 2), rational.rational(1, 3))), '5/6')
  assert.equal(rational.formatFraction(rational.subtract(rational.rational(3, 4), rational.rational(1, 4))), '1/2')
  assert.equal(rational.formatFraction(rational.multiply(rational.rational(2, 3), rational.rational(3, 4))), '1/2')
  assert.equal(rational.formatFraction(rational.divide(rational.rational(6, 5), rational.rational(2, 1))), '3/5')
})

test('quantity parser converts compatible units and preserves dimensions', () => {
  assert.equal(
    quantity.areQuantitiesEquivalent(quantity.parseQuantity('100 cm'), quantity.parseQuantity('1 m')),
    true,
  )
  assert.equal(
    quantity.areQuantitiesEquivalent(quantity.parseQuantity('1 kg'), quantity.parseQuantity('1000 g')),
    true,
  )
  assert.equal(
    quantity.areQuantitiesEquivalent(quantity.parseQuantity('1 jam'), quantity.parseQuantity('60 menit')),
    true,
  )
  assert.equal(
    quantity.areQuantitiesEquivalent(quantity.parseQuantity('1 1/5 buah jeruk'), quantity.parseQuantity('6/5')),
    true,
  )
  assert.equal(
    quantity.areQuantitiesEquivalent(quantity.parseQuantity('1 orang'), quantity.parseQuantity('1 buah')),
    false,
  )
  assert.equal(
    quantity.areQuantitiesEquivalent(quantity.parseQuantity('1 kg'), quantity.parseQuantity('1 m')),
    false,
  )
})

test('equivalent option checker rejects duplicate fraction and decimal forms', () => {
  const result = optionValidation.validateNumericOptionSet([
    { id: 'A', label: 'A', rawValue: '6/5' },
    { id: 'B', label: 'B', rawValue: '1 1/5' },
    { id: 'C', label: 'C', rawValue: '5/6' },
    { id: 'D', label: 'D', rawValue: '7/5' },
  ])
  assert.equal(result.valid, false)
  assert.equal(result.equivalentPairs.length, 1)

  const decimalPercent = optionValidation.validateNumericOptionSet([
    { id: 'A', label: 'A', rawValue: '1.2' },
    { id: 'B', label: 'B', rawValue: '120%' },
    { id: 'C', label: 'C', rawValue: '1.5' },
    { id: 'D', label: 'D', rawValue: '2' },
  ])
  assert.equal(decimalPercent.valid, false)
})

test('known equal-sharing question extracts exact facts and answer', () => {
  const intent = knownPatterns.extractKnownVisualIntent(equalSharingQuestion)
  assert.equal(intent.type, 'equal_sharing')
  assert.equal(intent.totalObjects, 6)
  assert.equal(intent.groupCount, 5)
  assert.equal(intent.selectedGroupCount, 1)

  const result = calculator.calculateVisualIntent(intent)
  assert.equal(result.status, 'ready')
  assert.equal(rational.formatMixedNumber(result.value), '1 1/5')
})

test('known category-of-total question calculates 10 of 24 as 5/12', () => {
  const intent = knownPatterns.extractKnownVisualIntent(categoryQuestion)
  assert.equal(intent.type, 'category_of_total')
  assert.deepEqual(
    intent.categories.map((item) => [item.id, item.count]),
    [['jeruk', 6], ['pisang', 8], ['apel', 10]],
  )
  assert.equal(intent.targetCategoryId, 'apel')

  const result = calculator.calculateVisualIntent(intent)
  assert.equal(result.status, 'ready')
  assert.equal(rational.formatFraction(result.value), '5/12')
})

test('fraction partition derives remaining parts from eaten parts', () => {
  const intent = knownPatterns.extractKnownVisualIntent(
    'Pizza dibagi menjadi 8 bagian sama besar. Tiga bagian dimakan. Berapa bagian yang tersisa?',
  )
  assert.equal(intent.type, 'fraction_partition')
  assert.equal(intent.totalParts, 8)
  assert.equal(intent.selectedParts, 5)
  assert.equal(intent.selectedMeaning, 'remaining')
  assert.equal(rational.formatFraction(calculator.calculateVisualIntent(intent).value), '5/8')
})

test('fraction partition subtracts colored parts when asking for the remainder', () => {
  const intent = knownPatterns.extractKnownVisualIntent(
    'Pizza dibagi menjadi 8 bagian sama besar. Tiga bagian diwarnai. Berapa bagian yang tersisa?',
  )
  assert.equal(intent.type, 'fraction_partition')
  assert.equal(intent.totalParts, 8)
  assert.equal(intent.selectedParts, 5)
  assert.equal(intent.selectedMeaning, 'remaining')
  assert.equal(rational.formatFraction(calculator.calculateVisualIntent(intent).value), '5/8')
})

test('fraction partition preserves an explicitly stated remaining count', () => {
  const intent = knownPatterns.extractKnownVisualIntent(
    'Pizza dibagi menjadi 8 bagian sama besar. Sisa 3 bagian belum dimakan.',
  )
  assert.equal(intent.type, 'fraction_partition')
  assert.equal(intent.selectedParts, 3)
  assert.equal(intent.selectedMeaning, 'remaining')
  assert.equal(rational.formatFraction(calculator.calculateVisualIntent(intent).value), '3/8')
})

test('fraction partition calculates uncolored parts from the colored count', () => {
  const intent = knownPatterns.extractKnownVisualIntent(
    'Pizza dibagi menjadi 8 bagian sama besar. Tiga bagian diwarnai. Berapa bagian yang belum diwarnai?',
  )
  assert.equal(intent.type, 'fraction_partition')
  assert.equal(intent.selectedParts, 5)
  assert.equal(intent.selectedMeaning, 'remaining')
  assert.equal(rational.formatFraction(calculator.calculateVisualIntent(intent).value), '5/8')
})

test('fraction partition accepts an explicitly stated uncolored count', () => {
  const intent = knownPatterns.extractKnownVisualIntent(
    'Pizza dibagi menjadi 8 bagian sama besar. Tiga bagian tidak diwarnai.',
  )
  assert.equal(intent.type, 'fraction_partition')
  assert.equal(intent.selectedParts, 3)
  assert.equal(intent.selectedMeaning, 'remaining')
  assert.equal(rational.formatFraction(calculator.calculateVisualIntent(intent).value), '3/8')
})

test('ambiguous questions asking for two fruit categories are not guessed', () => {
  assert.equal(
    knownPatterns.extractKnownVisualIntent(
      'Dari total 6 jeruk, 8 pisang, dan 10 apel, berapa bagian yang merupakan apel dan jeruk?',
    ),
    null,
  )
})

test('unsupported or incomplete language patterns are not guessed', () => {
  assert.equal(
    knownPatterns.extractKnownVisualIntent('Ada beberapa benda di atas meja. Berapa jumlahnya?'),
    null,
  )
  assert.equal(
    knownPatterns.extractKnownVisualIntent('Pizza dibagi menjadi beberapa bagian. Berapa bagian yang dimakan?'),
    null,
  )
})

test('known answer validator accepts correct values and rejects wrong keys or units', () => {
  assert.equal(
    answerValidation.validateKnownNumericAnswer(equalSharingQuestion, '1 1/5 buah jeruk').status,
    'valid',
  )
  assert.equal(
    answerValidation.validateKnownNumericAnswer(equalSharingQuestion, '1.2').status,
    'valid',
  )
  assert.equal(
    answerValidation.validateKnownNumericAnswer(equalSharingQuestion, '5/6').reasonCode,
    'ANSWER_KEY_MISMATCH',
  )
  assert.equal(
    answerValidation.validateKnownNumericAnswer(equalSharingQuestion, '1 1/5 kg').reasonCode,
    'UNIT_MISMATCH',
  )
  assert.equal(
    answerValidation.validateKnownNumericAnswer(categoryQuestion, '5/12').status,
    'valid',
  )
})

test('unsupported answer patterns remain marked for teacher review', () => {
  const result = answerValidation.validateKnownNumericAnswer(
    'Bandingkan panjang dua pita berikut.',
    '10',
  )
  assert.equal(result.status, 'not_supported')
  assert.equal(result.reasonCode, 'NEEDS_TEACHER_REVIEW')
})


test('deterministic Canvas renderers create PNG output with the calculated labels', async () => {
  const originalDocument = global.document
  const renderedTexts = []
  const context = new Proxy(
    {
      fillText: (value) => renderedTexts.push(String(value)),
    },
    {
      get(target, property) {
        if (property in target) return target[property]
        return () => undefined
      },
      set(target, property, value) {
        target[property] = value
        return true
      },
    },
  )

  global.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob: (callback) => callback(new Blob(['test-png'], { type: 'image/png' })),
    }),
  }

  try {
    const categoryIntent = knownPatterns.extractKnownVisualIntent(categoryQuestion)
    const categoryBlob = await visualRenderer.createVisualMathImage(categoryIntent)
    assert.ok(categoryBlob instanceof Blob)
    assert.equal(categoryBlob.type, 'image/png')
    assert.ok(renderedTexts.some((value) => value.includes('Total seluruh buah = 6 + 8 + 10 = 24')))
    assert.ok(renderedTexts.some((value) => value.includes('apel = 10/24 = 5/12')))

    renderedTexts.length = 0
    const sharingIntent = knownPatterns.extractKnownVisualIntent(equalSharingQuestion)
    const sharingBlob = await visualRenderer.createVisualMathImage(sharingIntent)
    assert.ok(sharingBlob instanceof Blob)
    assert.ok(renderedTexts.some((value) => value.includes('Setiap kelompok mendapat 1 1/5 jeruk')))

    renderedTexts.length = 0
    const fractionIntent = knownPatterns.extractKnownVisualIntent(
      'Pizza dibagi menjadi 8 bagian sama besar. Tiga bagian dimakan. Berapa bagian yang tersisa?',
    )
    const fractionBlob = await visualRenderer.createVisualMathImage(fractionIntent)
    assert.ok(fractionBlob instanceof Blob)
    assert.ok(renderedTexts.some((value) => value.includes('5 dari 8 bagian = 5/8')))

    const genericObjectBlob = await visualRenderer.createVisualMathImage({
      type: 'equal_sharing',
      objectLabel: 'gajah',
      totalObjects: 6,
      groupCount: 5,
      selectedGroupCount: 1,
    })
    assert.ok(genericObjectBlob instanceof Blob)
  } finally {
    if (originalDocument === undefined) delete global.document
    else global.document = originalDocument
  }
})


test('number comparison intent extracts fractions only when the question clearly asks to compare', () => {
  const intent = knownPatterns.extractKnownVisualIntent(
    'Bandingkan 1/2 dan 3/4. Manakah yang lebih besar?',
  )
  assert.equal(intent.type, 'number_comparison')
  assert.equal(rational.formatFraction(intent.first), '1/2')
  assert.equal(rational.formatFraction(intent.second), '3/4')
  const result = calculator.calculateVisualIntent(intent)
  assert.equal(result.status, 'ready')
  assert.equal(result.comparison, -1)
  assert.equal(knownPatterns.extractKnownVisualIntent('Ada angka 1/2 dan 3/4 pada cerita.')?.type, undefined)
})

test('number line, geometry, and chart/table intents pass strict validation', () => {
  const numberLine = intentValidation.validateVisualIntent({
    type: 'number_line',
    minimum: { numerator: '0', denominator: '1' },
    maximum: { numerator: '1', denominator: '1' },
    points: [{ label: 'A', value: { numerator: '1', denominator: '2' } }],
  })
  assert.equal(numberLine.type, 'number_line')
  assert.equal(calculator.calculateVisualIntent(numberLine).status, 'ready')

  const geometry = intentValidation.validateVisualIntent({
    type: 'geometry',
    shape: 'rectangle',
    measurements: [
      { label: 'panjang', value: { numerator: '8', denominator: '1' }, unit: 'cm' },
      { label: 'lebar', value: { numerator: '4', denominator: '1' }, unit: 'cm' },
    ],
  })
  assert.equal(geometry.type, 'geometry')
  assert.equal(calculator.calculateVisualIntent(geometry).status, 'ready')

  const chart = intentValidation.validateVisualIntent({
    type: 'chart_table',
    chartType: 'bar',
    categories: [{ label: 'apel', value: 4 }, { label: 'jeruk', value: 3 }],
  })
  assert.equal(chart.type, 'chart_table')
  assert.equal(calculator.calculateVisualIntent(chart).status, 'ready')
})

test('intent validation rejects unsafe values and unsupported bounds', () => {
  assert.equal(intentValidation.validateVisualIntent({
    type: 'number_line',
    minimum: { numerator: '0', denominator: '1' },
    maximum: { numerator: '1', denominator: '1' },
    points: Array.from({ length: 11 }, (_, index) => ({
      label: String(index),
      value: { numerator: '1', denominator: '2' },
    })),
  }), null)
  assert.equal(intentValidation.validateVisualIntent({
    type: 'category_of_total',
    categories: [
      { id: 'a', label: 'apel', count: 30 },
      { id: 'b', label: 'jeruk', count: 20 },
    ],
    targetCategoryId: 'a',
  }), null)
  assert.equal(rational.parseRational('9'.repeat(100)), null)
})

test('Canvas renderers cover comparison, number line, geometry, and chart/table', async () => {
  const originalDocument = global.document
  const renderedTexts = []
  const context = new Proxy(
    { fillText: (value) => renderedTexts.push(String(value)) },
    {
      get(target, property) {
        if (property in target) return target[property]
        return () => undefined
      },
      set(target, property, value) {
        target[property] = value
        return true
      },
    },
  )
  global.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob: (callback) => callback(new Blob(['test-png'], { type: 'image/png' })),
    }),
  }
  try {
    const intents = [
      {
        type: 'number_comparison',
        first: { numerator: '1', denominator: '2' },
        second: { numerator: '3', denominator: '4' },
        requestedRelation: 'compare',
      },
      {
        type: 'number_line',
        minimum: { numerator: '0', denominator: '1' },
        maximum: { numerator: '1', denominator: '1' },
        points: [{ label: 'A', value: { numerator: '1', denominator: '2' } }],
      },
      {
        type: 'geometry',
        shape: 'rectangle',
        measurements: [
          { label: 'panjang', value: { numerator: '8', denominator: '1' }, unit: 'cm' },
          { label: 'lebar', value: { numerator: '4', denominator: '1' }, unit: 'cm' },
        ],
      },
      {
        type: 'chart_table',
        chartType: 'bar',
        categories: [{ label: 'apel', value: 4 }, { label: 'jeruk', value: 3 }],
      },
      {
        type: 'chart_table',
        chartType: 'pictograph',
        categories: [{ label: 'apel', value: 4 }, { label: 'jeruk', value: 3 }],
      },
      {
        type: 'chart_table',
        chartType: 'table',
        categories: [{ label: 'apel', value: 4 }, { label: 'jeruk', value: 3 }],
      },
      {
        type: 'fraction_partition',
        wholeLabel: 'apel',
        totalParts: 4,
        selectedParts: 2,
        selectedMeaning: 'selected',
      },
      {
        type: 'fraction_partition',
        wholeLabel: 'jam analog',
        totalParts: 12,
        selectedParts: 3,
        selectedMeaning: 'selected',
      },
      {
        type: 'fraction_partition',
        wholeLabel: 'kelereng',
        totalParts: 8,
        selectedParts: 3,
        selectedMeaning: 'selected',
      },
      {
        type: 'fraction_partition',
        wholeLabel: 'garis bilangan',
        totalParts: 5,
        selectedParts: 2,
        selectedMeaning: 'selected',
      },
    ]
    for (const intent of intents) {
      const blob = await visualRenderer.createVisualMathImage(intent)
      assert.ok(blob instanceof Blob, intent.type + ' ' + (intent.chartType || ''))
      assert.ok(blob.size > 0)
      assert.equal(blob.type, 'image/png')
    }
    assert.ok(renderedTexts.includes('<'))
  } finally {
    if (originalDocument === undefined) delete global.document
    else global.document = originalDocument
  }
})

test('AI facts are accepted only when evidence is a literal and supports the facts', () => {
  const valid = aiIntentBuilder.buildAiVisualIntent({
    intentType: 'number_comparison',
    confidence: 0.94,
    evidence: 'Bandingkan 1/2 dan 3/4.',
    facts: JSON.stringify({
      first: { numerator: '1', denominator: '2' },
      second: { numerator: '3', denominator: '4' },
      requestedRelation: 'compare',
    }),
  }, 'Bandingkan 1/2 dan 3/4. Manakah yang lebih besar?')
  assert.equal(valid.intent.type, 'number_comparison')
  assert.equal(valid.reasonCode, null)

  const unicodeFraction = aiIntentBuilder.buildAiVisualIntent({
    intentType: 'number_comparison',
    evidence: 'Bandingkan ½ dan ¾.',
    facts: JSON.stringify({
      first: { numerator: '1', denominator: '2' },
      second: { numerator: '3', denominator: '4' },
      requestedRelation: 'compare',
    }),
  }, 'Bandingkan ½ dan ¾.')
  assert.equal(unicodeFraction.intent.type, 'number_comparison')

  const inventedQuote = aiIntentBuilder.buildAiVisualIntent({
    intentType: 'number_comparison',
    evidence: 'Bandingkan 1/3 dan 3/4.',
    facts: JSON.stringify({
      first: { numerator: '1', denominator: '3' },
      second: { numerator: '3', denominator: '4' },
      requestedRelation: 'compare',
    }),
  }, 'Bandingkan 1/2 dan 3/4.')
  assert.equal(inventedQuote.intent, null)
  assert.equal(inventedQuote.reasonCode, 'FACTS_INCOMPLETE')

  const mismatchedFact = aiIntentBuilder.buildAiVisualIntent({
    intentType: 'equal_sharing',
    evidence: '6 jeruk dibagikan sama rata kepada 5 anak.',
    facts: JSON.stringify({
      objectLabel: 'jeruk',
      totalObjects: 6,
      groupCount: 4,
      selectedGroupCount: 1,
    }),
  }, '6 jeruk dibagikan sama rata kepada 5 anak.')
  assert.equal(mismatchedFact.intent, null)
  assert.equal(mismatchedFact.reasonCode, 'FACTS_INCOMPLETE')
})

test('AI intent builder rejects malformed JSON and facts outside supported limits', () => {
  const malformed = aiIntentBuilder.buildAiVisualIntent({
    intentType: 'number_comparison',
    evidence: 'Bandingkan 1 dan 2.',
    facts: '{broken json',
  }, 'Bandingkan 1 dan 2.')
  assert.equal(malformed.reasonCode, 'AI_RESPONSE_INVALID')

  const tooManyPoints = aiIntentBuilder.buildAiVisualIntent({
    intentType: 'number_line',
    evidence: 'Garis bilangan dari 0 sampai 1.',
    facts: JSON.stringify({
      minimum: { numerator: '0', denominator: '1' },
      maximum: { numerator: '1', denominator: '1' },
      points: Array.from({ length: 11 }, (_, index) => ({
        label: 'A' + index,
        value: { numerator: '1', denominator: '2' },
      })),
    }),
  }, 'Garis bilangan dari 0 sampai 1.')
  assert.equal(tooManyPoints.intent, null)
  assert.equal(tooManyPoints.reasonCode, 'AI_RESPONSE_INVALID')
})

test('AI intent builder validates evidence for every supported visual intent', () => {
  const cases = [
    {
      intentType: 'category_of_total',
      question: 'Ada 6 jeruk, 8 pisang, dan 10 apel. Berapa bagian apel dari total buah?',
      facts: {
        categories: [
          { id: 'jeruk', label: 'jeruk', count: 6 },
          { id: 'pisang', label: 'pisang', count: 8 },
          { id: 'apel', label: 'apel', count: 10 },
        ],
        targetCategoryId: 'apel',
      },
    },
    {
      intentType: 'equal_sharing',
      question: '6 jeruk dibagikan sama rata kepada 3 anak.',
      facts: { objectLabel: 'jeruk', totalObjects: 6, groupCount: 3, selectedGroupCount: 1 },
    },
    {
      intentType: 'fraction_partition',
      question: 'Pizza dibagi menjadi 8 bagian sama besar. 3 bagian dimakan.',
      facts: { wholeLabel: 'pizza', totalParts: 8, selectedParts: 3, selectedMeaning: 'removed' },
    },
    {
      intentType: 'number_comparison',
      question: 'Bandingkan 1/2 dan 3/4. Manakah yang lebih besar?',
      facts: {
        first: { numerator: '1', denominator: '2' },
        second: { numerator: '3', denominator: '4' },
        requestedRelation: 'compare',
      },
    },
    {
      intentType: 'number_line',
      question: 'Letakkan titik A bernilai 1/2 pada garis bilangan dari 0 sampai 1.',
      facts: {
        minimum: { numerator: '0', denominator: '1' },
        maximum: { numerator: '1', denominator: '1' },
        points: [{ label: 'A', value: { numerator: '1', denominator: '2' } }],
      },
    },
    {
      intentType: 'geometry',
      question: 'Persegi panjang memiliki panjang 8 cm dan lebar 4 cm.',
      facts: {
        shape: 'rectangle',
        measurements: [
          { label: 'panjang', value: { numerator: '8', denominator: '1' }, unit: 'cm' },
          { label: 'lebar', value: { numerator: '4', denominator: '1' }, unit: 'cm' },
        ],
      },
    },
    {
      intentType: 'chart_table',
      question: 'Data jumlah buah: apel 4 dan jeruk 3. Buat diagram batang.',
      facts: {
        chartType: 'bar',
        categories: [{ label: 'apel', value: 4 }, { label: 'jeruk', value: 3 }],
      },
    },
  ]

  for (const item of cases) {
    const result = aiIntentBuilder.buildAiVisualIntent({
      intentType: item.intentType,
      evidence: item.question,
      facts: JSON.stringify(item.facts),
    }, item.question)
    assert.equal(result.intent?.type, item.intentType, item.intentType)
    assert.equal(result.reasonCode, null, item.intentType)
  }
})

test('semantic fact graph accepts only source-backed facts and required relations', () => {
  const { validateFactGraph } = require(path.join(root, 'lib/visual-math/semantic/validate-fact-graph.ts'))
  const question = '6 jeruk dibagikan sama rata kepada 3 anak.'
  const excerpt = (quote) => {
    const start = question.indexOf(quote)
    return { source: 'question', start, end: start + quote.length, quote }
  }
  const graph = {
    requestedGoal: 'equal_sharing',
    facts: [
      { id: 'total', role: 'total_objects', value: { kind: 'integer', value: 6 }, source: excerpt('6 jeruk') },
      { id: 'groups', role: 'group_count', value: { kind: 'integer', value: 3 }, source: excerpt('3 anak') },
    ],
    relations: [
      { type: 'divided_into', from: 'total', to: 'groups', source: excerpt('dibagikan sama rata') },
      { type: 'equal_share_of', from: 'total', to: 'groups', source: excerpt('dibagikan sama rata') },
    ],
  }
  assert.equal(validateFactGraph(graph, { question }).status, 'accepted')

  const unsupportedQuote = structuredClone(graph)
  unsupportedQuote.facts[0].source.quote = '6 apel'
  assert.equal(validateFactGraph(unsupportedQuote, { question }).status, 'rejected')

  const missingRelation = structuredClone(graph)
  missingRelation.relations.pop()
  assert.equal(validateFactGraph(missingRelation, { question }).status, 'rejected')

  const brokenReference = structuredClone(graph)
  brokenReference.relations[0].to = 'missing'
  assert.equal(validateFactGraph(brokenReference, { question }).status, 'rejected')

  const duplicateId = structuredClone(graph)
  duplicateId.facts[1].id = 'total'
  assert.equal(validateFactGraph(duplicateId, { question }).status, 'rejected')

  const wrongRelationRoles = structuredClone(graph)
  wrongRelationRoles.relations[0].from = 'groups'
  wrongRelationRoles.relations[0].to = 'total'
  assert.equal(validateFactGraph(wrongRelationRoles, { question }).status, 'rejected')
})

test('semantic graph validates derived integer provenance and rejects dependency cycles', () => {
  const { validateFactGraph } = require(path.join(root, 'lib/visual-math/semantic/validate-fact-graph.ts'))
  const question = '6 jeruk dibagikan sama rata kepada 3 anak.'
  const excerpt = (quote) => {
    const start = question.indexOf(quote)
    return { source: 'question', start, end: start + quote.length, quote }
  }
  const graph = {
    requestedGoal: 'equal_sharing',
    facts: [
      { id: 'total', role: 'total_objects', value: { kind: 'integer', value: 6 }, source: excerpt('6 jeruk') },
      { id: 'groups', role: 'group_count', value: { kind: 'integer', value: 3 }, source: excerpt('3 anak') },
      {
        id: 'per_child',
        role: 'objects_per_group',
        value: { kind: 'integer', value: 2 },
        provenance: { kind: 'derived', operation: 'divide', inputFactIds: ['total', 'groups'] },
      },
    ],
    relations: [
      { type: 'divided_into', from: 'total', to: 'groups', source: excerpt('dibagikan sama rata') },
      { type: 'equal_share_of', from: 'total', to: 'groups', source: excerpt('dibagikan sama rata') },
    ],
  }
  assert.equal(validateFactGraph(graph, { question }).status, 'accepted')

  const wrongValue = structuredClone(graph)
  wrongValue.facts[2].value.value = 3
  assert.equal(validateFactGraph(wrongValue, { question }).reasonCode, 'FACTS_CONFLICT')

  const cycle = structuredClone(graph)
  cycle.facts[0].provenance = {
    kind: 'derived',
    operation: 'add',
    inputFactIds: ['per_child', 'groups'],
  }
  assert.equal(validateFactGraph(cycle, { question }).reasonCode, 'FACTS_CONFLICT')
})

test('semantic graph recomputes derived rational values with exact BigInt arithmetic', () => {
  const { validateFactGraph } = require(path.join(root, 'lib/visual-math/semantic/validate-fact-graph.ts'))
  const question = '6 jeruk dibagikan sama rata kepada 3 anak.'
  const excerpt = (quote) => {
    const start = question.indexOf(quote)
    return { source: 'question', start, end: start + quote.length, quote }
  }
  const graph = {
    requestedGoal: 'equal_sharing',
    facts: [
      { id: 'total', role: 'total_objects', value: { kind: 'integer', value: 6 }, source: excerpt('6 jeruk') },
      { id: 'groups', role: 'group_count', value: { kind: 'integer', value: 3 }, source: excerpt('3 anak') },
      { id: 'large_a', role: 'input_a', value: { kind: 'integer', value: 9007199254740991 }, source: excerpt('6 jeruk') },
      { id: 'large_b', role: 'input_b', value: { kind: 'integer', value: 9007199254740990 }, source: excerpt('3 anak') },
      {
        id: 'exact_ratio',
        role: 'derived_ratio',
        value: { kind: 'rational', value: { numerator: '9007199254740991', denominator: '9007199254740990' } },
        provenance: { kind: 'derived', operation: 'divide', inputFactIds: ['large_a', 'large_b'] },
      },
    ],
    relations: [
      { type: 'divided_into', from: 'total', to: 'groups', source: excerpt('dibagikan sama rata') },
      { type: 'equal_share_of', from: 'total', to: 'groups', source: excerpt('dibagikan sama rata') },
    ],
  }
  assert.equal(validateFactGraph(graph, { question }).status, 'accepted')

  const wrongValue = structuredClone(graph)
  wrongValue.facts[4].value.value.numerator = '1'
  assert.equal(validateFactGraph(wrongValue, { question }).reasonCode, 'FACTS_CONFLICT')
})

test('semantic fact graph detects contradictory fraction partition counts', () => {
  const { validateFactGraph } = require(path.join(root, 'lib/visual-math/semantic/validate-fact-graph.ts'))
  const question = 'Pizza dibagi menjadi 8 bagian sama besar. 9 bagian dipilih.'
  const excerpt = (quote) => {
    const start = question.indexOf(quote)
    return { source: 'question', start, end: start + quote.length, quote }
  }
  const result = validateFactGraph({
    requestedGoal: 'fraction_partition',
    facts: [
      { id: 'whole', role: 'whole', value: { kind: 'text', value: 'pizza' }, source: excerpt('Pizza') },
      { id: 'total', role: 'total_parts', value: { kind: 'integer', value: 8 }, source: excerpt('8 bagian') },
      { id: 'selected', role: 'selected_parts', value: { kind: 'integer', value: 9 }, source: excerpt('9 bagian') },
    ],
    relations: [
      { type: 'divided_into', from: 'whole', to: 'total', source: excerpt('dibagi menjadi') },
      { type: 'equal_parts', from: 'whole', to: 'total', source: excerpt('bagian sama besar') },
    ],
  }, { question })
  assert.equal(result.status, 'rejected')
  assert.equal(result.reasonCode, 'FACTS_CONFLICT')
})

test('fraction calculator distinguishes selected, removed, and remaining parts', () => {
  const base = {
    type: 'fraction_partition',
    wholeLabel: 'pizza',
    totalParts: 8,
    selectedParts: 3,
  }
  assert.equal(
    rational.formatFraction(calculator.calculateVisualIntent({ ...base, selectedMeaning: 'selected' }).value),
    '3/8',
  )
  assert.equal(
    rational.formatFraction(calculator.calculateVisualIntent({ ...base, selectedMeaning: 'removed' }).value),
    '5/8',
  )
  assert.equal(
    rational.formatFraction(calculator.calculateVisualIntent({
      ...base,
      selectedParts: 5,
      selectedMeaning: 'remaining',
    }).value),
    '5/8',
  )
})

test('semantic graph adapter and operation planner cover all supported intent families', () => {
  const cases = [
    {
      question: 'Dari total 6 jeruk dan 8 apel, berapa bagian apel?',
      intent: {
        type: 'category_of_total',
        categories: [
          { id: 'jeruk', label: 'jeruk', count: 6 },
          { id: 'apel', label: 'apel', count: 8 },
        ],
        targetCategoryId: 'apel',
      },
    },
    {
      question: '6 jeruk dibagikan sama rata kepada 3 anak.',
      intent: { type: 'equal_sharing', objectLabel: 'jeruk', totalObjects: 6, groupCount: 3 },
    },
    {
      question: 'Pizza dibagi menjadi 8 bagian sama besar. 3 bagian dimakan.',
      intent: {
        type: 'fraction_partition',
        wholeLabel: 'pizza',
        totalParts: 8,
        selectedParts: 3,
        selectedMeaning: 'removed',
      },
    },
    {
      question: 'Bandingkan 1/2 dan 3/4.',
      intent: {
        type: 'number_comparison',
        first: { numerator: '1', denominator: '2' },
        second: { numerator: '3', denominator: '4' },
        requestedRelation: 'compare',
      },
    },
    {
      question: 'Garis bilangan dari 0 sampai 1. Letakkan titik A pada 1/2.',
      intent: {
        type: 'number_line',
        minimum: { numerator: '0', denominator: '1' },
        maximum: { numerator: '1', denominator: '1' },
        points: [{ label: 'A', value: { numerator: '1', denominator: '2' } }],
      },
    },
    {
      question: 'Persegi panjang memiliki panjang 8 cm dan lebar 4 cm.',
      intent: {
        type: 'geometry',
        shape: 'rectangle',
        measurements: [
          { label: 'panjang', value: { numerator: '8', denominator: '1' }, unit: 'cm' },
          { label: 'lebar', value: { numerator: '4', denominator: '1' }, unit: 'cm' },
        ],
      },
    },
    {
      question: 'Data jumlah buah: apel 4 dan jeruk 3. Buat diagram batang.',
      intent: {
        type: 'chart_table',
        chartType: 'bar',
        categories: [{ label: 'apel', value: 4 }, { label: 'jeruk', value: 3 }],
      },
    },
  ]

  for (const item of cases) {
    const built = factGraphBuilder.buildFactGraphFromIntent(item.intent, item.question, item.question)
    assert.ok(built.graph, item.intent.type + ' graph')
    assert.equal(
      semanticValidation.validateFactGraph(built.graph, built.sources).status,
      'accepted',
      item.intent.type + ' semantic validation',
    )
    const plan = operationPlanner.planVisualMathOperation(item.intent, built.graph, built.sources)
    assert.equal(plan.semanticValidation.status, 'accepted', item.intent.type + ' plan gate')
    assert.equal(plan.calculation.status, 'ready', item.intent.type + ' deterministic calculation')
  }
})

test('semantic graph adapter refuses paraphrased or missing source excerpts', () => {
  const intent = {
    type: 'equal_sharing',
    objectLabel: 'jeruk',
    totalObjects: 6,
    groupCount: 3,
  }
  const missing = factGraphBuilder.buildFactGraphFromIntent(
    intent,
    'Enam jeruk dibagi rata kepada tiga anak.',
    '6 jeruk dibagikan sama rata kepada 3 anak.',
  )
  assert.equal(missing.graph, null)
  assert.match(missing.reason, /sama persis/)
})

test('operation planner blocks calculation when semantic facts are incomplete', () => {
  const question = '6 jeruk dibagikan sama rata kepada 3 anak.'
  const built = factGraphBuilder.buildFactGraphFromIntent({
    type: 'equal_sharing',
    objectLabel: 'jeruk',
    totalObjects: 6,
    groupCount: 3,
  }, question, question)
  const invalidGraph = structuredClone(built.graph)
  invalidGraph.relations.pop()
  const plan = operationPlanner.planVisualMathOperation(
    { type: 'equal_sharing', objectLabel: 'jeruk', totalObjects: 6, groupCount: 3 },
    invalidGraph,
    built.sources,
  )
  assert.equal(plan.semanticValidation.status, 'rejected')
  assert.equal(plan.calculation.status, 'invalid')
  assert.equal(plan.calculation.value, null)
})

test('AI intent builder returns a validated fact graph before an intent can be planned', () => {
  const question = '6 jeruk dibagikan sama rata kepada 3 anak.'
  const built = aiIntentBuilder.buildAiVisualIntent({
    intentType: 'equal_sharing',
    evidence: question,
    facts: JSON.stringify({
      objectLabel: 'jeruk',
      totalObjects: 6,
      groupCount: 3,
      selectedGroupCount: 1,
    }),
  }, question)
  assert.equal(built.reasonCode, null)
  assert.equal(built.intent.type, 'equal_sharing')
  assert.ok(built.factGraph)
  assert.equal(
    semanticValidation.validateFactGraph(built.factGraph, built.factGraphSources).status,
    'accepted',
  )
  const plan = operationPlanner.planVisualMathOperation(
    built.intent,
    built.factGraph,
    built.factGraphSources,
  )
  assert.equal(plan.operation.kind, 'divide_equally')
  assert.equal(plan.calculation.status, 'ready')
  assert.equal(rational.formatFraction(plan.calculation.value), '2')
})



test('pictograph scale represents every value exactly without hidden rounding', () => {
  assert.equal(pictographScale.getExactPictographUnit([13, 7]), 1)
  assert.equal(pictographScale.getExactPictographUnit([100, 50]), 50)
  assert.equal(pictographScale.getExactPictographUnit([0, 12, 18]), 6)
  assert.equal(pictographScale.getExactPictographUnit([16, 7]), null)
  assert.equal(pictographScale.getExactPictographUnit([0, 0]), null)
})

test('pictograph renderer draws an exact symbol count and abstains when it cannot fit', async () => {
  const originalDocument = global.document
  let symbolCount = 0
  const renderedTexts = []
  const context = new Proxy(
    { fillText: (value) => renderedTexts.push(String(value)) },
    {
      get(target, property) {
        if (property in target) return target[property]
        if (property === 'arc') return () => { symbolCount += 1 }
        return () => undefined
      },
      set(target, property, value) {
        target[property] = value
        return true
      },
    },
  )
  global.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob: (callback) => callback(new Blob(['test-png'], { type: 'image/png' })),
    }),
  }
  try {
    const image = await visualRenderer.createVisualMathImage({
      type: 'chart_table',
      chartType: 'pictograph',
      categories: [{ label: 'apel', value: 13 }, { label: 'jeruk', value: 7 }],
    })
    assert.ok(image instanceof Blob)
    assert.equal(symbolCount, 20)
    assert.ok(renderedTexts.includes('1 simbol = 1 satuan'))

    const unsupported = await visualRenderer.createVisualMathImage({
      type: 'chart_table',
      chartType: 'pictograph',
      categories: [{ label: 'apel', value: 16 }, { label: 'jeruk', value: 7 }],
    })
    assert.equal(unsupported, null)
  } finally {
    if (originalDocument === undefined) delete global.document
    else global.document = originalDocument
  }
})


test('renderer registry returns versioned artifacts and rejects unsupported output sizes', async () => {
  const originalDocument = global.document
  const context = new Proxy(
    { fillText: () => undefined },
    {
      get(target, property) {
        if (property in target) return target[property]
        return () => undefined
      },
      set(target, property, value) {
        target[property] = value
        return true
      },
    },
  )
  global.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob: (callback) => callback(new Blob(['test-png'], { type: 'image/png' })),
    }),
  }
  try {
    const result = await rendererRegistry.renderVisualMathArtifact({
      type: 'chart_table',
      chartType: 'table',
      categories: [{ label: 'apel', value: 4 }, { label: 'jeruk', value: 3 }],
    })
    assert.equal(result.status, 'accepted')
    assert.equal(result.artifact.rendererId, 'chart-table-canvas')
    assert.equal(result.artifact.rendererVersion, 1)
    assert.equal(result.artifact.width, 1600)
    assert.deepEqual(result.artifact.representedValues, ['apel=4', 'jeruk=3'])

    const wrongSize = await rendererRegistry.renderVisualMathArtifact({
      type: 'chart_table',
      chartType: 'table',
      categories: [{ label: 'apel', value: 4 }],
    }, { width: 800, height: 600, locale: 'id-ID' })
    assert.equal(wrongSize.status, 'rejected')
    assert.equal(wrongSize.reasonCode, 'INVALID_DIMENSIONS')
  } finally {
    if (originalDocument === undefined) delete global.document
    else global.document = originalDocument
  }
})

test('render artifact quality gate rejects empty blobs and incomplete metadata', () => {
  const base = {
    blob: new Blob(['ok'], { type: 'image/png' }),
    mimeType: 'image/png',
    width: 1600,
    height: 900,
    elementCount: 2,
    representedValues: ['apel=4'],
    rendererId: 'chart-table-canvas',
    rendererVersion: 1,
  }
  assert.equal(artifactQuality.validateRenderArtifact(base).status, 'accepted')
  assert.equal(
    artifactQuality.validateRenderArtifact({ ...base, blob: new Blob([], { type: 'image/png' }) }).reasonCode,
    'BLOB_EMPTY',
  )
  assert.equal(
    artifactQuality.validateRenderArtifact({ ...base, representedValues: [] }).reasonCode,
    'MISSING_REPRESENTED_VALUES',
  )
})


test('renderer registry rejects malformed runtime intents before drawing', async () => {
  const malformed = await rendererRegistry.renderVisualMathArtifact({
    type: 'equal_sharing',
    objectLabel: 'jeruk',
    totalObjects: 0,
    groupCount: 3,
  })
  assert.equal(malformed.status, 'rejected')
  assert.equal(malformed.reasonCode, 'INVALID_INTENT')

  const unknown = await rendererRegistry.renderVisualMathArtifact({
    type: 'unregistered_visual',
  })
  assert.equal(unknown.status, 'rejected')
  assert.equal(unknown.reasonCode, 'INVALID_INTENT')
})

test('renderer registry converts unexpected canvas exceptions into a safe rejection', async () => {
  const originalDocument = global.document
  global.document = {
    createElement: () => { throw new Error('simulated canvas failure') },
  }
  try {
    const result = await rendererRegistry.renderVisualMathArtifact({
      type: 'chart_table',
      chartType: 'table',
      categories: [{ label: 'apel', value: 4 }],
    })
    assert.equal(result.status, 'rejected')
    assert.equal(result.reasonCode, 'RENDER_FAILED')
  } finally {
    if (originalDocument === undefined) delete global.document
    else global.document = originalDocument
  }
})


test('fraction layout quality gate rejects segments too narrow to read', () => {
  assert.equal(visualLayoutQuality.validateFractionPartitionLayout({
    type: 'fraction_partition',
    wholeLabel: 'pizza',
    totalParts: 20,
    selectedParts: 5,
    selectedMeaning: 'selected',
  }), true)
  assert.equal(visualLayoutQuality.validateFractionPartitionLayout({
    type: 'fraction_partition',
    wholeLabel: 'pizza',
    totalParts: 40,
    selectedParts: 5,
    selectedMeaning: 'selected',
  }), false)
})

test('number line layout assigns five label lanes and rejects overlapping labels', () => {
  const spaced = visualLayoutQuality.planNumberLinePointLayout({
    type: 'number_line',
    minimum: { numerator: '0', denominator: '1' },
    maximum: { numerator: '10', denominator: '1' },
    points: Array.from({ length: 5 }, (_, index) => ({
      label: 'Titik ' + (index + 1),
      value: { numerator: String(index * 2 + 1), denominator: '1' },
    })),
  })
  assert.ok(spaced)
  assert.deepEqual(spaced.map((point) => point.lane), [0, 1, 2, 3, 4])

  const crowded = visualLayoutQuality.planNumberLinePointLayout({
    type: 'number_line',
    minimum: { numerator: '0', denominator: '1' },
    maximum: { numerator: '100', denominator: '1' },
    points: [
      { label: 'Titik yang sangat dekat A', value: { numerator: '50', denominator: '1' } },
      { label: 'Titik yang sangat dekat B', value: { numerator: '501', denominator: '10' } },
      { label: 'Titik yang sangat dekat C', value: { numerator: '502', denominator: '10' } },
      { label: 'Titik yang sangat dekat D', value: { numerator: '503', denominator: '10' } },
      { label: 'Titik yang sangat dekat E', value: { numerator: '504', denominator: '10' } },
      { label: 'Titik yang sangat dekat F', value: { numerator: '505', denominator: '10' } },
    ],
  })
  assert.equal(crowded, null)
})

test('renderer registry rejects layouts whose labels would overlap', async () => {
  const result = await rendererRegistry.renderVisualMathArtifact({
    type: 'number_line',
    minimum: { numerator: '0', denominator: '1' },
    maximum: { numerator: '100', denominator: '1' },
    points: [
      { label: 'Nilai A', value: { numerator: '50', denominator: '1' } },
      { label: 'Nilai B', value: { numerator: '501', denominator: '10' } },
      { label: 'Nilai C', value: { numerator: '502', denominator: '10' } },
      { label: 'Nilai D', value: { numerator: '503', denominator: '10' } },
      { label: 'Nilai E', value: { numerator: '504', denominator: '10' } },
      { label: 'Nilai F', value: { numerator: '505', denominator: '10' } },
    ],
  })
  assert.equal(result.status, 'rejected')
  assert.equal(result.reasonCode, 'INVALID_LAYOUT')
})


test('number line tick labels preserve exact rational values', async () => {
  const originalDocument = global.document
  const renderedTexts = []
  const context = new Proxy(
    { fillText: (value) => renderedTexts.push(String(value)) },
    {
      get(target, property) {
        if (property in target) return target[property]
        return () => undefined
      },
      set(target, property, value) {
        target[property] = value
        return true
      },
    },
  )
  global.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob: (callback) => callback(new Blob(['test-png'], { type: 'image/png' })),
    }),
  }
  try {
    const image = await visualRenderer.createNumberLineImage({
      type: 'number_line',
      minimum: { numerator: '0', denominator: '1' },
      maximum: { numerator: '1', denominator: '3' },
      points: [{ label: 'Titik A', value: { numerator: '1', denominator: '6' } }],
    })
    assert.ok(image instanceof Blob)
    assert.ok(renderedTexts.includes('0'))
    assert.ok(renderedTexts.includes('1/6'))
    assert.ok(renderedTexts.includes('1/3'))
    assert.ok(!renderedTexts.includes('0.167'))
    assert.ok(!renderedTexts.includes('0.333'))
  } finally {
    if (originalDocument === undefined) delete global.document
    else global.document = originalDocument
  }
})
