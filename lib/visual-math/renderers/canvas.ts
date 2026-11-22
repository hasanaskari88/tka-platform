import type {
  CategoryOfTotalIntent,
  EqualSharingIntent,
  FractionPartitionIntent,
  VisualIntent,
} from '../types'
import { formatFraction, formatMixedNumber, rational } from '../math/rational'
import { calculateVisualIntent } from '../math/calculator'

type FruitKind = 'apel' | 'jeruk' | 'pisang'
type ObjectKind = FruitKind | 'round' | 'candy'

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
  return null
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

  if (kind === 'round') {
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

async function createCategoryOfTotalImage(
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
  drawHeader(context, 'BAGIAN DARI SELURUH BUAH')

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

async function createEqualSharingImage(
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

async function createFractionPartitionImage(
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

  const isCircularWhole = /pizza|piza|pai|lingkaran|roti bundar/i.test(intent.wholeLabel)
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
  context.fillText(
    intent.selectedParts + ' dari ' + intent.totalParts + ' bagian = ' + formatFraction(value),
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

export async function createVisualMathImage(intent: VisualIntent): Promise<Blob | null> {
  switch (intent.type) {
    case 'category_of_total':
      return createCategoryOfTotalImage(intent)
    case 'equal_sharing':
      return createEqualSharingImage(intent)
    case 'fraction_partition':
      return createFractionPartitionImage(intent)
    default:
      return null
  }
}
