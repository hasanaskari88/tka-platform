import type {
  CategoryOfTotalIntent,
  EqualSharingIntent,
  FractionPartitionIntent,
  GeometryIntent,
  NumberComparisonIntent,
  NumberLineIntent,
  ChartTableIntent,
  VisualIntent,
} from '../types'
import { formatFraction, formatMixedNumber, rational } from '../math/rational'
import { calculateVisualIntent } from '../math/calculator'
import { getExactPictographUnit } from './pictograph-scale'
import { planNumberLinePointLayout } from '../quality/validate-visual-layout'

type FruitKind = 'apel' | 'jeruk' | 'pisang'
type ObjectKind = FruitKind | 'round' | 'candy' | 'generic'

const FRUIT_COLORS: Record<FruitKind, { fill: string; stroke: string }> = {
  apel: { fill: '#ef4444', stroke: '#991b1b' },
  jeruk: { fill: '#f97316', stroke: '#c2410c' },
  pisang: { fill: '#facc15', stroke: '#a16207' },
}

function createCanvas(width = 1600, height = 900) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  return context ? { canvas, context } : null
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

function normalizeObjectLabel(label: string): ObjectKind | null {
  const value = label.toLocaleLowerCase('id-ID').trim()
  if (/apel|apple/.test(value)) return 'apel'
  if (/jeruk|orange/.test(value)) return 'jeruk'
  if (/pisang|banana/.test(value)) return 'pisang'
  if (/bola|kelereng|koin|coin|marble/.test(value)) return 'round'
  if (/permen|candy/.test(value)) return 'candy'
  return 'generic'
}

function drawObject(
  context: CanvasRenderingContext2D,
  kind: ObjectKind,
  x: number,
  y: number,
  size: number,
  muted = false,
) {
  context.save()
  context.translate(x, y)
  context.lineWidth = Math.max(2, size * 0.045)

  if (kind === 'candy') {
    context.rotate(-0.12)
    context.fillStyle = muted ? '#e2e8f0' : '#ec4899'
    context.strokeStyle = muted ? '#94a3b8' : '#9d174d'
    context.beginPath()
    context.moveTo(-size * 0.48, -size * 0.16)
    context.lineTo(-size * 0.28, -size * 0.38)
    context.lineTo(-size * 0.2, -size * 0.18)
    context.lineTo(size * 0.2, -size * 0.18)
    context.lineTo(size * 0.28, -size * 0.38)
    context.lineTo(size * 0.48, -size * 0.16)
    context.lineTo(size * 0.48, size * 0.16)
    context.lineTo(size * 0.28, size * 0.38)
    context.lineTo(size * 0.2, size * 0.18)
    context.lineTo(-size * 0.2, size * 0.18)
    context.lineTo(-size * 0.28, size * 0.38)
    context.lineTo(-size * 0.48, size * 0.16)
    context.closePath()
    context.fill()
    context.stroke()
    context.restore()
    return
  }

  if (kind === 'round' || kind === 'generic') {
    context.beginPath()
    context.arc(0, 0, size * 0.38, 0, Math.PI * 2)
    context.fillStyle = muted ? '#cbd5e1' : '#60a5fa'
    context.fill()
    context.strokeStyle = '#334155'
    context.stroke()
    context.restore()
    return
  }

  const colors = FRUIT_COLORS[kind]
  const fill = muted ? '#e2e8f0' : colors.fill
  context.fillStyle = fill
  context.strokeStyle = muted ? '#94a3b8' : colors.stroke

  if (kind === 'jeruk') {
    context.beginPath()
    context.arc(0, 0, size * 0.36, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.beginPath()
    context.ellipse(size * 0.14, -size * 0.37, size * 0.17, size * 0.07, -0.5, 0, Math.PI * 2)
    context.fillStyle = muted ? '#cbd5e1' : '#16a34a'
    context.fill()
  } else if (kind === 'apel') {
    context.beginPath()
    context.moveTo(0, -size * 0.1)
    context.bezierCurveTo(-size * 0.45, -size * 0.55, -size * 0.8, -size * 0.05, -size * 0.48, size * 0.42)
    context.bezierCurveTo(-size * 0.2, size * 0.75, -size * 0.04, size * 0.62, 0, size * 0.58)
    context.bezierCurveTo(size * 0.04, size * 0.62, size * 0.2, size * 0.75, size * 0.48, size * 0.42)
    context.bezierCurveTo(size * 0.8, -size * 0.05, size * 0.45, -size * 0.55, 0, -size * 0.1)
    context.closePath()
    context.fill()
    context.stroke()
    context.beginPath()
    context.moveTo(0, -size * 0.1)
    context.lineTo(size * 0.04, -size * 0.42)
    context.strokeStyle = '#854d0e'
    context.lineWidth = Math.max(3, size * 0.05)
    context.stroke()
    context.beginPath()
    context.ellipse(size * 0.18, -size * 0.34, size * 0.17, size * 0.07, -0.4, 0, Math.PI * 2)
    context.fillStyle = muted ? '#cbd5e1' : '#16a34a'
    context.fill()
  } else {
    context.beginPath()
    context.moveTo(-size * 0.42, -size * 0.12)
    context.bezierCurveTo(-size * 0.12, -size * 0.4, size * 0.25, -size * 0.35, size * 0.43, -size * 0.08)
    context.bezierCurveTo(size * 0.18, size * 0.04, -size * 0.08, size * 0.22, -size * 0.4, size * 0.16)
    context.closePath()
    context.fill()
    context.stroke()
  }

  context.restore()
}

function drawFruitCount(
  context: CanvasRenderingContext2D,
  kind: ObjectKind,
  count: number,
  centerX: number,
  startY: number,
  maxWidth: number,
  maxHeight: number,
  muted = false,
) {
  if (count <= 0) return
  const columns = Math.min(6, Math.max(1, Math.ceil(Math.sqrt(count))))
  const rows = Math.ceil(count / columns)
  const cellWidth = maxWidth / columns
  const cellHeight = maxHeight / rows
  const size = Math.min(72, cellWidth * 0.66, cellHeight * 0.66)

  for (let index = 0; index < count; index += 1) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = centerX - maxWidth / 2 + cellWidth * (column + 0.5)
    const y = startY + cellHeight * (row + 0.5)
    drawObject(context, kind, x, y, size, muted)
  }
}

function drawHeader(context: CanvasRenderingContext2D, title: string) {
  context.fillStyle = '#f8fafc'
  context.fillRect(0, 0, 1600, 900)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#172554'
  context.font = 'bold 48px Arial, sans-serif'
  context.fillText(title, 800, 72)
}

export async function createCategoryOfTotalImage(
  intent: CategoryOfTotalIntent,
): Promise<Blob | null> {
  if (intent.categories.length < 2 || intent.categories.length > 4) return null
  const total = intent.categories.reduce((sum, item) => sum + item.count, 0)
  if (!Number.isSafeInteger(total) || total <= 0 || total > 40) return null

  const kinds = intent.categories.map((item) => normalizeObjectLabel(item.label))
  if (kinds.some((kind) => kind === null)) return null

  const targetIndex = intent.categories.findIndex((item) => item.id === intent.targetCategoryId)
  if (targetIndex < 0) return null

  const created = createCanvas()
  if (!created) return null
  const { canvas, context } = created
  drawHeader(context, 'BAGIAN DARI SELURUH OBJEK')

  const columns = intent.categories.length
  const sectionWidth = 1380 / columns
  const startX = 800 - (sectionWidth * columns) / 2

  intent.categories.forEach((category, index) => {
    const centerX = startX + sectionWidth * (index + 0.5)
    const selected = index === targetIndex
    const kind = kinds[index] as ObjectKind

    context.fillStyle = selected ? '#c2410c' : '#334155'
    context.font = 'bold 36px Arial, sans-serif'
    context.fillText(
      category.label.toLocaleUpperCase('id-ID') + ' (' + category.count + ')',
      centerX,
      165,
    )

    context.strokeStyle = selected ? '#f97316' : '#cbd5e1'
    context.lineWidth = selected ? 8 : 3
    context.beginPath()
    context.moveTo(centerX - sectionWidth * 0.36, 205)
    context.lineTo(centerX + sectionWidth * 0.36, 205)
    context.stroke()

    drawFruitCount(
      context,
      kind,
      category.count,
      centerX,
      250,
      sectionWidth * 0.82,
      340,
    )

    if (selected) {
      context.fillStyle = '#fff7ed'
      context.strokeStyle = '#f97316'
      context.lineWidth = 4
      context.beginPath()
      context.roundRect(centerX - 145, 635, 290, 58, 18)
      context.fill()
      context.stroke()
      context.fillStyle = '#c2410c'
      context.font = 'bold 26px Arial, sans-serif'
      context.fillText('YANG DITANYAKAN', centerX, 664)
    }

    if (index < columns - 1) {
      context.save()
      context.setLineDash([8, 12])
      context.strokeStyle = '#cbd5e1'
      context.lineWidth = 3
      context.beginPath()
      context.moveTo(startX + sectionWidth * (index + 1), 225)
      context.lineTo(startX + sectionWidth * (index + 1), 710)
      context.stroke()
      context.restore()
    }
  })

  const target = intent.categories[targetIndex]
  const value = calculateVisualIntent(intent).value
  if (!value) return null
  context.fillStyle = '#0f172a'
  context.font = 'bold 36px Arial, sans-serif'
  context.fillText(
    'Total seluruh buah = ' + intent.categories.map((item) => item.count).join(' + ') + ' = ' + total,
    800,
    770,
  )
  context.fillStyle = '#c2410c'
  context.font = 'bold 42px Arial, sans-serif'
  context.fillText(
    target.label + ' = ' + target.count + '/' + total + ' = ' + formatFraction(value),
    800,
    835,
  )
  return canvasToBlob(canvas)
}

export async function createEqualSharingImage(
  intent: EqualSharingIntent,
): Promise<Blob | null> {
  const kind = normalizeObjectLabel(intent.objectLabel)
  const selectedGroupCount = intent.selectedGroupCount ?? 1
  if (
    !kind ||
    intent.totalObjects < 1 ||
    intent.totalObjects > 40 ||
    intent.groupCount < 2 ||
    intent.groupCount > 12 ||
    selectedGroupCount < 1 ||
    selectedGroupCount > intent.groupCount
  ) {
    return null
  }

  const wholePerGroup = Math.floor(intent.totalObjects / intent.groupCount)
  const remainderPerGroup = intent.totalObjects % intent.groupCount
  const created = createCanvas()
  if (!created) return null
  const { canvas, context } = created
  drawHeader(context, 'MEMBAGI ' + intent.totalObjects + ' ' + intent.objectLabel.toLocaleUpperCase('id-ID'))

  const columns = intent.groupCount <= 4 ? intent.groupCount : Math.ceil(Math.sqrt(intent.groupCount))
  const rows = Math.ceil(intent.groupCount / columns)
  const gapX = 22
  const gapY = 22
  const cardWidth = Math.min(300, (1400 - (columns - 1) * gapX) / columns)
  const cardHeight = Math.min(230, (510 - (rows - 1) * gapY) / rows)
  const totalWidth = columns * cardWidth + (columns - 1) * gapX
  const totalHeight = rows * cardHeight + (rows - 1) * gapY
  const startX = (1600 - totalWidth) / 2
  const startY = 165 + Math.max(0, (510 - totalHeight) / 2)

  for (let group = 0; group < intent.groupCount; group += 1) {
    const column = group % columns
    const row = Math.floor(group / columns)
    const x = startX + column * (cardWidth + gapX)
    const y = startY + row * (cardHeight + gapY)
    const selected = group < selectedGroupCount

    context.fillStyle = selected ? '#ecfdf5' : '#ffffff'
    context.strokeStyle = selected ? '#059669' : '#94a3b8'
    context.lineWidth = selected ? 7 : 3
    context.beginPath()
    context.roundRect(x, y, cardWidth, cardHeight, 20)
    context.fill()
    context.stroke()

    context.fillStyle = '#1e293b'
    context.font = 'bold 25px Arial, sans-serif'
    context.textAlign = 'center'
    context.fillText('Kelompok ' + (group + 1), x + cardWidth / 2, y + 32)

    drawFruitCount(
      context,
      kind,
      wholePerGroup,
      x + cardWidth / 2,
      y + 55,
      cardWidth * 0.78,
      85,
      false,
    )

    if (remainderPerGroup > 0) {
      const barWidth = Math.min(150, cardWidth * 0.58)
      const barHeight = 22
      const barX = x + (cardWidth - barWidth) / 2
      const barY = y + cardHeight - 72
      const segmentWidth = barWidth / intent.groupCount

      for (let part = 0; part < intent.groupCount; part += 1) {
        context.fillStyle = part < remainderPerGroup ? '#f97316' : '#e2e8f0'
        context.fillRect(barX + part * segmentWidth, barY, segmentWidth - 2, barHeight)
        context.strokeStyle = '#475569'
        context.lineWidth = 1.5
        context.strokeRect(barX + part * segmentWidth, barY, segmentWidth - 2, barHeight)
      }
      context.fillStyle = '#334155'
      context.font = 'bold 18px Arial, sans-serif'
      context.fillText(
        remainderPerGroup + '/' + intent.groupCount + ' bagian ' + intent.objectLabel,
        x + cardWidth / 2,
        barY + 42,
      )
    } else {
      context.fillStyle = '#334155'
      context.font = 'bold 20px Arial, sans-serif'
      context.fillText(
        wholePerGroup + ' ' + intent.objectLabel,
        x + cardWidth / 2,
        y + cardHeight - 34,
      )
    }
  }

  const share = calculateVisualIntent(intent).value
  if (!share) return null
  const perGroupShare = rational(intent.totalObjects, intent.groupCount)
  context.fillStyle = '#0f172a'
  context.font = 'bold 36px Arial, sans-serif'
  context.fillText(
    selectedGroupCount === 1
      ? 'Setiap kelompok mendapat ' + formatMixedNumber(perGroupShare) + ' ' + intent.objectLabel
      : 'Jumlah untuk ' + selectedGroupCount + ' kelompok = ' + formatMixedNumber(share) + ' ' + intent.objectLabel,
    800,
    760,
  )
  context.fillStyle = '#047857'
  context.font = 'bold 26px Arial, sans-serif'
  context.fillText(
    'Jumlah kelompok yang ditanyakan: ' + selectedGroupCount,
    800,
    820,
  )
  return canvasToBlob(canvas)
}

function drawApplePartition(
  context: CanvasRenderingContext2D,
  totalParts: number,
  selectedParts: number,
) {
  const bounds = { left: 500, right: 1100, top: 220, bottom: 760 }
  const applePath = () => {
    context.beginPath()
    context.moveTo(800, 280)
    context.bezierCurveTo(690, 190, 520, 245, 510, 410)
    context.bezierCurveTo(495, 575, 625, 735, 760, 750)
    context.bezierCurveTo(785, 755, 790, 735, 800, 735)
    context.bezierCurveTo(810, 735, 815, 755, 840, 750)
    context.bezierCurveTo(975, 735, 1105, 575, 1090, 410)
    context.bezierCurveTo(1080, 245, 910, 190, 800, 280)
    context.closePath()
  }

  applePath()
  context.fillStyle = '#fecaca'
  context.fill()
  let boundaries = Array.from({ length: totalParts + 1 }, (_, index) =>
    bounds.top + (bounds.bottom - bounds.top) * index / totalParts,
  )
  try {
    const pixels = context.getImageData(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)?.data
    if (pixels) {
      const rowAreas: number[] = []
      let totalArea = 0
      for (let y = 0; y < bounds.bottom - bounds.top; y++) {
        let area = 0
        for (let x = 0; x < bounds.right - bounds.left; x++) {
          const pixel = (y * (bounds.right - bounds.left) + x) * 4
          if (pixels[pixel + 3] > 0) area++
        }
        rowAreas.push(area)
        totalArea += area
      }
      if (totalArea > 0) {
        boundaries = [bounds.top]
        for (let part = 1; part < totalParts; part++) {
          const targetArea = totalArea * part / totalParts
          let accumulated = 0
          let boundary = 0
          for (; boundary < rowAreas.length; boundary++) {
            accumulated += rowAreas[boundary]
            if (accumulated >= targetArea) break
          }
          boundaries.push(bounds.top + boundary + 1)
        }
        boundaries.push(bounds.bottom)
      }
    }
  } catch {
    // If pixel inspection is unavailable, use equal-height bands as a safe fallback.
  }

  context.save()
  applePath()
  context.clip()
  for (let part = 0; part < totalParts; part++) {
    const top = boundaries[part]
    const bottom = boundaries[part + 1]
    context.fillStyle = part < selectedParts ? '#ef4444' : '#fecaca'
    context.fillRect(bounds.left, top, bounds.right - bounds.left, bottom - top)
  }
  for (let part = 1; part < totalParts; part++) {
    context.beginPath()
    context.moveTo(bounds.left, boundaries[part])
    context.lineTo(bounds.right, boundaries[part])
    context.strokeStyle = '#7f1d1d'
    context.lineWidth = 5
    context.stroke()
  }
  context.restore()
  applePath()
  context.strokeStyle = '#7f1d1d'
  context.lineWidth = 12
  context.stroke()
  context.beginPath()
  context.moveTo(800, 285)
  context.quadraticCurveTo(785, 225, 815, 190)
  context.strokeStyle = '#854d0e'
  context.lineWidth = 22
  context.lineCap = 'round'
  context.stroke()
  context.beginPath()
  context.ellipse(865, 220, 58, 24, -0.35, 0, Math.PI * 2)
  context.fillStyle = '#16a34a'
  context.fill()
  context.strokeStyle = '#166534'
  context.lineWidth = 5
  context.stroke()
}

export async function createFractionPartitionImage(
  intent: FractionPartitionIntent,
): Promise<Blob | null> {
  if (
    intent.totalParts < 2 ||
    intent.totalParts > 20 ||
    intent.selectedParts < 0 ||
    intent.selectedParts > intent.totalParts
  ) {
    return null
  }

  const created = createCanvas()
  if (!created) return null
  const { canvas, context } = created
  drawHeader(context, 'MEMBAGI SATU KESELURUHAN')

  const isClockWhole = /jam dinding|jam analog/i.test(intent.wholeLabel)
  const isCircularWhole = /pizza|piza|pai|lingkaran|roti bundar/i.test(intent.wholeLabel) || isClockWhole
  const isAppleWhole = /apel|apple/i.test(intent.wholeLabel)
  const isObjectCollection = /kelereng|permen|stiker/i.test(intent.wholeLabel)
  const isLineWhole = /garis lurus|garis bilangan/i.test(intent.wholeLabel)

  if (isCircularWhole) {
    const centerX = 800
    const centerY = 445
    const radius = 265
    const startAngle = -Math.PI / 2

    for (let part = 0; part < intent.totalParts; part += 1) {
      const angleStart = startAngle + (part * Math.PI * 2) / intent.totalParts
      const angleEnd = startAngle + ((part + 1) * Math.PI * 2) / intent.totalParts
      const selected = part < intent.selectedParts
      context.beginPath()
      context.moveTo(centerX, centerY)
      context.arc(centerX, centerY, radius, angleStart, angleEnd)
      context.closePath()
      context.fillStyle = selected ? '#f59e0b' : '#f1f5f9'
      context.fill()
      context.strokeStyle = '#78350f'
      context.lineWidth = 5
      context.stroke()
    }

    if (isClockWhole) {
      context.beginPath()
      context.arc(centerX, centerY, radius + 22, 0, Math.PI * 2)
      context.strokeStyle = '#334155'
      context.lineWidth = 16
      context.stroke()
      for (let hour = 0; hour < 12; hour++) {
        const angle = (hour * Math.PI * 2) / 12 - Math.PI / 2
        context.beginPath()
        context.moveTo(centerX + Math.cos(angle) * (radius - 28), centerY + Math.sin(angle) * (radius - 28))
        context.lineTo(centerX + Math.cos(angle) * (radius - 55), centerY + Math.sin(angle) * (radius - 55))
        context.strokeStyle = '#334155'
        context.lineWidth = 7
        context.stroke()
      }
    }
  } else if (isAppleWhole) {
    drawApplePartition(context, intent.totalParts, intent.selectedParts)
  } else if (isObjectCollection) {
    const kind = normalizeObjectLabel(intent.wholeLabel) || 'generic'
    const columns = Math.min(5, Math.ceil(Math.sqrt(intent.totalParts)))
    const rows = Math.ceil(intent.totalParts / columns)
    const cellWidth = 980 / columns
    const cellHeight = 500 / rows
    for (let index = 0; index < intent.totalParts; index++) {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = 800 - 490 + cellWidth * (column + 0.5)
      const y = 245 + cellHeight * (row + 0.5)
      drawObject(context, kind, x, y, Math.min(90, cellWidth * 0.55, cellHeight * 0.55), index >= intent.selectedParts)
    }
  } else if (isLineWhole) {
    const left = 180
    const top = 390
    const width = 1240
    const height = 120
    const partWidth = width / intent.totalParts
    for (let part = 0; part < intent.totalParts; part++) {
      context.fillStyle = part < intent.selectedParts ? '#60a5fa' : '#e2e8f0'
      context.fillRect(left + part * partWidth, top, partWidth - 5, height)
      context.strokeStyle = '#334155'
      context.lineWidth = 4
      context.strokeRect(left + part * partWidth, top, partWidth - 5, height)
    }
    context.strokeStyle = '#334155'
    context.lineWidth = 5
    context.beginPath()
    context.moveTo(left, top - 20)
    context.lineTo(left + width, top - 20)
    context.stroke()
  } else {
    const left = 180
    const top = 365
    const width = 1240
    const height = 160
    const partWidth = width / intent.totalParts
    for (let part = 0; part < intent.totalParts; part += 1) {
      context.fillStyle = part < intent.selectedParts ? '#60a5fa' : '#e2e8f0'
      context.fillRect(left + part * partWidth, top, partWidth - 5, height)
      context.strokeStyle = '#334155'
      context.lineWidth = 4
      context.strokeRect(left + part * partWidth, top, partWidth - 5, height)
    }
  }

  const value = calculateVisualIntent(intent).value
  if (!value) return null
  context.fillStyle = '#0f172a'
  context.font = 'bold 40px Arial, sans-serif'
  const representedParts = intent.selectedMeaning === 'removed'
    ? intent.totalParts - intent.selectedParts
    : intent.selectedParts
  context.fillText(
    representedParts + ' dari ' + intent.totalParts + ' bagian = ' + formatFraction(value) +
      (intent.selectedMeaning === 'removed' ? ' (tersisa)' : ''),
    800,
    735,
  )
  context.fillStyle = '#475569'
  context.font = '26px Arial, sans-serif'
  context.fillText(
    'Bagian yang ditanyakan: ' + intent.selectedMeaning,
    800,
    800,
  )
  return canvasToBlob(canvas)
}


function rationalToNumber(value: { numerator: string; denominator: string }): number {
  return Number(BigInt(value.numerator)) / Number(BigInt(value.denominator))
}

function formatMeasure(value: { numerator: string; denominator: string }, unit?: string): string {
  return formatMixedNumber(value) + (unit ? ' ' + unit : '')
}

export async function createNumberComparisonImage(intent: NumberComparisonIntent): Promise<Blob | null> {
  const created = createCanvas()
  if (!created) return null
  const { canvas, context } = created
  drawHeader(context, 'MEMBANDINGKAN BILANGAN')
  const comparison = compareValues(intent.first, intent.second)
  const relation = comparison > 0 ? '>' : comparison < 0 ? '<' : '='
  const firstText = formatMixedNumber(intent.first)
  const secondText = formatMixedNumber(intent.second)
  const drawCard = (x: number, value: string, selected: boolean) => {
    context.fillStyle = selected ? '#eff6ff' : '#ffffff'
    context.strokeStyle = selected ? '#2563eb' : '#94a3b8'
    context.lineWidth = 7
    context.beginPath()
    context.roundRect(x, 285, 420, 260, 28)
    context.fill()
    context.stroke()
    context.fillStyle = '#0f172a'
    context.font = 'bold 76px Arial, sans-serif'
    context.textAlign = 'center'
    context.fillText(value, x + 210, 415)
  }
  drawCard(190, firstText, comparison >= 0)
  drawCard(990, secondText, comparison <= 0)
  context.fillStyle = '#7c3aed'
  context.font = 'bold 100px Arial, sans-serif'
  context.fillText(relation, 800, 415)
  context.fillStyle = '#334155'
  context.font = 'bold 32px Arial, sans-serif'
  context.fillText(
    comparison === 0 ? 'Kedua bilangan sama besar' : comparison > 0 ? firstText + ' lebih besar' : secondText + ' lebih besar',
    800,
    675,
  )
  return canvasToBlob(canvas)
}

function compareValues(
  first: { numerator: string; denominator: string },
  second: { numerator: string; denominator: string },
): -1 | 0 | 1 {
  const left = BigInt(first.numerator) * BigInt(second.denominator)
  const right = BigInt(second.numerator) * BigInt(first.denominator)
  return left < right ? -1 : left > right ? 1 : 0
}

export async function createNumberLineImage(intent: NumberLineIntent): Promise<Blob | null> {
  if (intent.points.length < 1 || intent.points.length > 10) return null
  const pointLayouts = planNumberLinePointLayout(intent)
  if (!pointLayouts) return null
  const min = rationalToNumber(intent.minimum)
  const max = rationalToNumber(intent.maximum)
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null
  const created = createCanvas()
  if (!created) return null
  const { canvas, context } = created
  drawHeader(context, 'GARIS BILANGAN')
  const left = 180, right = 1420, axisY = 470
  context.strokeStyle = '#334155'
  context.lineWidth = 8
  context.beginPath()
  context.moveTo(left, axisY)
  context.lineTo(right, axisY)
  context.stroke()
  context.beginPath()
  context.moveTo(right - 24, axisY - 18)
  context.lineTo(right, axisY)
  context.lineTo(right - 24, axisY + 18)
  context.stroke()
  const range = max - min
  const ticks = Math.min(10, Math.max(2, Math.ceil(range) + 1))
  for (let i = 0; i <= ticks; i++) {
    const x = left + (right - left) * i / ticks
    context.beginPath()
    context.moveTo(x, axisY - 16)
    context.lineTo(x, axisY + 16)
    context.strokeStyle = '#475569'
    context.lineWidth = 4
    context.stroke()
    const value = min + range * i / ticks
    context.fillStyle = '#334155'
    context.font = '20px Arial, sans-serif'
    context.textAlign = 'center'
    context.fillText(Number(value.toFixed(3)).toString(), x, axisY + 55)
  }
  intent.points.forEach((point, index) => {
    const value = rationalToNumber(point.value)
    if (!Number.isFinite(value) || value < min || value > max) return
    const { x, lane } = pointLayouts[index]
    const y = axisY - 85 - lane * 65
    context.strokeStyle = '#2563eb'
    context.lineWidth = 4
    context.beginPath()
    context.moveTo(x, axisY - 8)
    context.lineTo(x, y + 25)
    context.stroke()
    context.beginPath()
    context.arc(x, axisY, 15, 0, Math.PI * 2)
    context.fillStyle = '#2563eb'
    context.fill()
    context.fillStyle = '#1e3a8a'
    context.font = 'bold 23px Arial, sans-serif'
    context.textAlign = 'center'
    context.fillText(point.label + ' (' + formatMixedNumber(point.value) + ')', x, y)
  })
  return canvasToBlob(canvas)
}

export async function createGeometryImage(intent: GeometryIntent): Promise<Blob | null> {
  if (!intent.measurements.length || intent.measurements.length > 4 || intent.shape === 'other') return null
  const created = createCanvas()
  if (!created) return null
  const { canvas, context } = created
  drawHeader(context, 'BANGUN GEOMETRI')
  context.save()
  context.strokeStyle = '#2563eb'
  context.fillStyle = '#dbeafe'
  context.lineWidth = 12
  context.lineJoin = 'round'
  if (intent.shape === 'circle') {
    context.beginPath(); context.arc(800, 420, 190, 0, Math.PI * 2); context.fill(); context.stroke()
  } else if (intent.shape === 'triangle') {
    context.beginPath(); context.moveTo(800, 190); context.lineTo(570, 630); context.lineTo(1030, 630); context.closePath(); context.fill(); context.stroke()
  } else if (intent.shape === 'square' || intent.shape === 'rectangle') {
    const width = intent.shape === 'square' ? 380 : 520
    const height = intent.shape === 'square' ? 380 : 280
    context.beginPath(); context.roundRect(800 - width / 2, 420 - height / 2, width, height, 8); context.fill(); context.stroke()
  } else {
    const x = 620, y = 300, w = 390, h = 280, depth = 120
    context.beginPath()
    context.moveTo(x, y); context.lineTo(x + w, y); context.lineTo(x + w, y + h); context.lineTo(x, y + h); context.closePath()
    context.moveTo(x, y); context.lineTo(x + depth, y - depth * 0.55); context.lineTo(x + w + depth, y - depth * 0.55); context.lineTo(x + w, y)
    context.moveTo(x + w, y); context.lineTo(x + w + depth, y - depth * 0.55); context.lineTo(x + w + depth, y + h - depth * 0.55); context.lineTo(x + w, y + h)
    context.stroke()
  }
  context.restore()
  context.fillStyle = '#0f172a'
  context.font = 'bold 30px Arial, sans-serif'
  context.textAlign = 'center'
  const labels = intent.measurements.map((item) => item.label + ': ' + formatMeasure(item.value, item.unit))
  context.fillText(labels.join('   •   ').slice(0, 110), 800, 760)
  return canvasToBlob(canvas)
}

export async function createChartTableImage(intent: ChartTableIntent): Promise<Blob | null> {
  if (!intent.categories.length || intent.categories.length > 10) return null
  const created = createCanvas()
  if (!created) return null
  const { canvas, context } = created
  drawHeader(context, intent.chartType === 'bar' ? 'DIAGRAM BATANG' : intent.chartType === 'pictograph' ? 'PIKTOGRAF' : 'TABEL DATA')
  if (intent.chartType === 'table') {
    const rowHeight = Math.min(64, 560 / intent.categories.length)
    const top = 190
    intent.categories.forEach((item, index) => {
      const y = top + index * rowHeight
      context.fillStyle = index % 2 ? '#f8fafc' : '#e0f2fe'
      context.fillRect(260, y, 1080, rowHeight - 3)
      context.fillStyle = '#0f172a'
      context.font = 'bold 27px Arial, sans-serif'
      context.textAlign = 'left'
      context.fillText(item.label.slice(0, 35), 300, y + rowHeight / 2)
      context.textAlign = 'right'
      context.fillText(String(item.value), 1290, y + rowHeight / 2)
    })
  } else if (intent.chartType === 'bar') {
    const maxValue = Math.max(1, ...intent.categories.map((item) => item.value))
    const slot = 1120 / intent.categories.length
    intent.categories.forEach((item, index) => {
      const height = item.value / maxValue * 420
      const x = 240 + index * slot + slot * 0.18
      context.fillStyle = '#60a5fa'
      context.fillRect(x, 680 - height, slot * 0.64, height)
      context.fillStyle = '#0f172a'
      context.font = 'bold 22px Arial, sans-serif'
      context.textAlign = 'center'
      context.fillText(String(item.value), x + slot * 0.32, 650 - height)
      context.font = '20px Arial, sans-serif'
      context.fillText(item.label.slice(0, 16), x + slot * 0.32, 725)
    })
    context.strokeStyle = '#334155'
    context.lineWidth = 4
    context.beginPath(); context.moveTo(200, 680); context.lineTo(1400, 680); context.stroke()
  } else {
    const unit = getExactPictographUnit(intent.categories.map((item) => item.value))
    if (unit === null) return null
    const top = 190
    intent.categories.forEach((item, index) => {
      const y = top + index * 65
      context.fillStyle = '#0f172a'
      context.font = 'bold 22px Arial, sans-serif'
      context.textAlign = 'left'
      context.fillText(item.label.slice(0, 20), 190, y + 20)
      const icons = Math.ceil(item.value / unit)
      for (let i = 0; i < icons; i++) {
        context.beginPath()
        context.arc(620 + i * 54, y + 12, 15, 0, Math.PI * 2)
        context.fillStyle = '#f59e0b'
        context.fill()
      }
      context.fillStyle = '#334155'
      context.textAlign = 'right'
      context.fillText(String(item.value), 1410, y + 20)
    })
    context.fillStyle = '#475569'
    context.font = '20px Arial, sans-serif'
    context.textAlign = 'center'
    context.fillText('1 simbol = ' + unit + ' satuan', 800, 850)
  }
  return canvasToBlob(canvas)
}

export async function createVisualMathImage(intent: VisualIntent): Promise<Blob | null> {
  let blob: Blob | null = null
  switch (intent.type) {
    case 'category_of_total':
      blob = await createCategoryOfTotalImage(intent)
      break
    case 'equal_sharing':
      blob = await createEqualSharingImage(intent)
      break
    case 'fraction_partition':
      blob = await createFractionPartitionImage(intent)
      break
    case 'number_comparison':
      blob = await createNumberComparisonImage(intent)
      break
    case 'number_line':
      blob = await createNumberLineImage(intent)
      break
    case 'geometry':
      blob = await createGeometryImage(intent)
      break
    case 'chart_table':
      blob = await createChartTableImage(intent)
      break
  }
  return blob && blob.size > 0 && blob.type === 'image/png' ? blob : null
}
