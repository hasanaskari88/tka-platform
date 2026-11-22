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

    const unsupportedBlob = await visualRenderer.createVisualMathImage({
      type: 'equal_sharing',
      objectLabel: 'gajah',
      totalObjects: 6,
      groupCount: 5,
      selectedGroupCount: 1,
    })
    assert.equal(unsupportedBlob, null)
  } finally {
    if (originalDocument === undefined) delete global.document
    else global.document = originalDocument
  }
})
