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

async function main() {
const {
  buildFractionRenderPlanV2,
  assessLegacyFractionForV2,
  extractKnownFractionPlanV2,
  buildAiFractionPlanV2,
} = require(path.join(__dirname, '../lib/visual-math/analysis/fraction-v2.ts'))

function evidence(question, quote) {
  const start = question.indexOf(quote)
  assert.notEqual(start, -1, 'test quote must occur in question')
  return { source: 'question', start, end: start + quote.length, quote }
}

function intent(question, statedSegments, askedFor = 'remaining', actionKey = 'eaten') {
  return {
    contractVersion: 2,
    type: 'fraction_partition',
    wholeLabel: 'pizza',
    totalParts: 8,
    totalEvidence: evidence(question, '8 bagian'),
    statedSegments,
    askedFor,
    actionKey,
  }
}

const question = 'Pizza dibagi menjadi 8 bagian sama besar. 3 bagian dimakan.'
const removed = { role: 'removed', count: 3, evidence: evidence(question, '3 bagian dimakan') }

{
  const result = buildFractionRenderPlanV2(intent(question, [removed]), question)
  assert.equal(result.status, 'accepted')
  assert.deepEqual(result.plan.segments, [
    { role: 'removed', count: 3 },
    { role: 'remaining', count: 5 },
  ])
  assert.deepEqual(result.plan.answer, { numerator: '5', denominator: '8' })
  assert.deepEqual(result.plan.formula.map((token) => token.value), [8, '-', 3, '=', 5])
  assert.equal(result.plan.operation, 'derive_complement')
}

{
  const q = 'Dari 8 bagian pizza, 5 bagian masih tersisa.'
  const stated = { role: 'remaining', count: 5, evidence: evidence(q, '5 bagian masih tersisa') }
  const result = buildFractionRenderPlanV2(intent(q, [stated], 'remaining', 'unknown'), q)
  assert.equal(result.status, 'accepted')
  assert.deepEqual(result.plan.segments, [
    { role: 'remaining', count: 5 },
    { role: 'other', count: 3 },
  ])
  assert.deepEqual(result.plan.answer, { numerator: '5', denominator: '8' })
}

{
  const q = 'Pizza dibagi menjadi 8 bagian. 3 bagian diwarnai.'
  const stated = { role: 'selected', count: 3, evidence: evidence(q, '3 bagian diwarnai') }
  const result = buildFractionRenderPlanV2(intent(q, [stated], 'selected', 'colored'), q)
  assert.equal(result.status, 'accepted')
  assert.equal(result.plan.operation, 'preserve_stated')
  assert.deepEqual(result.plan.formula.map((token) => token.value), [3, '=', 3])
  assert.deepEqual(result.plan.answer, { numerator: '3', denominator: '8' })
}

{
  const q = 'Pizza terdiri dari 8 bagian. 3 bagian diwarnai dan 5 bagian tidak diwarnai.'
  const selected = { role: 'selected', count: 3, evidence: evidence(q, '3 bagian diwarnai') }
  const unselected = { role: 'unselected', count: 5, evidence: evidence(q, '5 bagian tidak diwarnai') }
  const result = buildFractionRenderPlanV2(intent(q, [selected, unselected], 'unselected', 'colored'), q)
  assert.equal(result.status, 'accepted')
  assert.equal(result.plan.operation, 'preserve_stated')
  assert.deepEqual(result.plan.answer, { numerator: '5', denominator: '8' })

  const reversed = buildFractionRenderPlanV2(intent(q, [
    { role: 'unselected', count: 5, evidence: evidence(q, '5 bagian tidak diwarnai') },
    { role: 'selected', count: 3, evidence: evidence(q, '3 bagian diwarnai') },
  ], 'selected', 'colored'), q)
  assert.equal(reversed.status, 'accepted')
  assert.deepEqual(reversed.plan.answer, { numerator: '3', denominator: '8' })
}

{
  const q = 'Pizza terdiri dari 8 bagian. 3 bagian dimakan dan 4 bagian tersisa.'
  const a = { role: 'removed', count: 3, evidence: evidence(q, '3 bagian dimakan') }
  const b = { role: 'remaining', count: 4, evidence: evidence(q, '4 bagian tersisa') }
  assert.equal(buildFractionRenderPlanV2(intent(q, [a, b]), q).status, 'needs_teacher_review')
}

{
  const q = 'Pizza terdiri dari 8 bagian. 3 bagian dimakan.'
  const wrong = { role: 'removed', count: 3, evidence: { source: 'question', start: 0, end: 8, quote: '3 bagian' } }
  assert.equal(buildFractionRenderPlanV2(intent(q, [wrong]), q).status, 'needs_teacher_review')
}

{
  const q = 'Pizza terdiri dari 8 bagian. 3 bagian dimakan.'
  const wrong = { role: 'removed', count: 9, evidence: evidence(q, '3 bagian dimakan') }
  assert.equal(buildFractionRenderPlanV2(intent(q, [wrong]), q).status, 'needs_teacher_review')
}

{
  const legacy = {
    type: 'fraction_partition',
    totalParts: 8,
    selectedParts: 5,
    selectedMeaning: 'remaining',
  }
  assert.equal(assessLegacyFractionForV2(legacy).status, 'needs_teacher_review')
}



{
  const q = 'Pizza dibagi menjadi 8 bagian sama besar. 3 bagian dimakan. Berapa bagian tersisa?'
  const result = extractKnownFractionPlanV2(q)
  assert.equal(result.status, 'accepted')
  assert.deepEqual(result.plan.segments, [
    { role: 'removed', count: 3 },
    { role: 'remaining', count: 5 },
  ])
  assert.equal(result.plan.targetRole, 'remaining')
  assert.deepEqual(result.plan.answer, { numerator: '5', denominator: '8' })
}

{
  const q = 'Pizza dibagi menjadi delapan bagian sama besar. Tiga bagian dimakan. Berapa bagian tersisa?'
  const result = extractKnownFractionPlanV2(q)
  assert.equal(result.status, 'accepted')
  assert.deepEqual(result.plan.answer, { numerator: '5', denominator: '8' })
}

{
  const q = 'Pizza dibagi menjadi 8 bagian. 3 bagian dimakan. Berapa bagian yang tidak dimakan?'
  const result = extractKnownFractionPlanV2(q)
  assert.equal(result.status, 'accepted')
  assert.equal(result.plan.targetRole, 'remaining')
  assert.deepEqual(result.plan.answer, { numerator: '5', denominator: '8' })
}

{
  const q = 'Pizza dibagi menjadi 8 bagian. 3 bagian diwarnai. Berapa bagian yang tidak diwarnai?'
  const result = extractKnownFractionPlanV2(q)
  assert.equal(result.status, 'accepted')
  assert.equal(result.plan.targetRole, 'unselected')
  assert.deepEqual(result.plan.answer, { numerator: '5', denominator: '8' })
}

{
  const q = 'Pizza dibagi menjadi 8 bagian. 3 bagian diwarnai dan 5 bagian tidak diwarnai. Berapa bagian diwarnai?'
  const result = extractKnownFractionPlanV2(q)
  assert.equal(result.status, 'accepted')
  assert.equal(result.plan.targetRole, 'selected')
  assert.deepEqual(result.plan.answer, { numerator: '3', denominator: '8' })
}

{
  const q = 'Benda dibagi menjadi 8 bagian. 3 bagian dimakan. Berapa bagian tersisa?'
  const result = extractKnownFractionPlanV2(q)
  assert.equal(result.status, 'needs_teacher_review')
}

{
  const q = 'Pizza dibagi menjadi 8 bagian sama besar. 3 bagian dimakan. Berapa bagian tersisa?'
  const result = buildAiFractionPlanV2({
    wholeLabel: 'pizza',
    totalParts: 8,
    totalEvidenceQuote: 'dibagi menjadi 8 bagian',
    statedSegments: [{ role: 'removed', count: 3, evidenceQuote: '3 bagian dimakan' }],
    askedFor: 'remaining',
    actionKey: 'eaten',
  }, q)
  assert.equal(result.status, 'accepted')
  assert.deepEqual(result.plan.answer, { numerator: '5', denominator: '8' })

  const badQuote = buildAiFractionPlanV2({
    wholeLabel: 'pizza',
    totalParts: 8,
    totalEvidenceQuote: '8 bagian terbagi',
    statedSegments: [{ role: 'removed', count: 3, evidenceQuote: '3 bagian dimakan' }],
    askedFor: 'remaining',
    actionKey: 'eaten',
  }, q)
  assert.equal(badQuote.status, 'needs_teacher_review')
}

{
  const { renderVisualMathPlanV2 } = require(path.join(__dirname, '../lib/visual-math/renderers/registry.ts'))
  const originalDocument = global.document
  const context = new Proxy(
    {},
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
    const question = 'Pizza dibagi menjadi 8 bagian. 3 bagian dimakan. Berapa bagian tersisa?'
    const result = extractKnownFractionPlanV2(question)
    assert.equal(result.status, 'accepted')
    const rendered = await renderVisualMathPlanV2(result.plan)
    assert.equal(rendered.status, 'accepted')
    assert.equal(rendered.artifact.rendererId, 'fraction-partition-v2-canvas')
    assert.equal(rendered.artifact.rendererVersion, 2)
    assert.match(rendered.artifact.semanticSummary, /removed: 3/)
    assert.ok(rendered.artifact.representedValues.includes('answer=5/8'))
  } finally {
    if (originalDocument === undefined) delete global.document
    else global.document = originalDocument
  }
}

console.log('Fraction V2 contract tests passed.')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
