'use client'

import { useState } from 'react'
import { Bot, Sparkles, Loader2, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'

type QuestionType = 'multiple_choice' | 'complex_multiple_choice' | 'true_false_matrix' | 'essay'
type GeneratedQuestion = {
  question_type: QuestionType
  question: string
  explanation: string
  options?: { A: string; B: string; C: string; D: string }
  answer?: 'A' | 'B' | 'C' | 'D'
  answers?: string[]
  statements?: { id: string; text: string; answer: 'Benar' | 'Salah' }[]
  model_answer?: string
  rubric?: string
  max_score?: number
  image_prompt?: string
  image_url?: string
  image_status?: 'none' | 'pending' | 'generating' | 'ready' | 'failed'
  image_error?: string
}

const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Pilihan ganda',
  complex_multiple_choice: 'Pilihan ganda kompleks',
  true_false_matrix: 'Benar / Salah (Matriks)',
  essay: 'Uraian',
}

function formatMathOption(value: string, context: string): string {
  // Ubah pecahan biasa menjadi format KaTeX bertingkat.
  let formatted = value.trim()
  const denominatorMatch = context.match(/(?:(?:dibagi|terbagi)\s+menjadi|terdiri\s+dari|penyebut(?:nya)?\s*(?:adalah)?|per\s*)\s*(\d{1,2})/i)
  const denominator = denominatorMatch?.[1]
  if (denominator && new RegExp('^([1-9])\\s*' + denominator + '$').test(formatted)) {
    formatted = formatted.replace(new RegExp('^([1-9])\\s*(' + denominator + ')$'), '$1/$2')
  }
  return formatted.replace(/(\d{1,3})\s*\/\s*(\d{1,3})/g, (_match, numerator, bottom) => '$\\frac{' + numerator + '}{' + bottom + '}$')
}
function extractNumberComparison(question: string): [number, number] | null {
  const normalized = question
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Jangan membuat visual perbandingan hanya karena dua angka terhubung kata "dan".
  // Harus ada instruksi yang jelas untuk membandingkan atau mengurutkan bilangan.
  const hasComparisonIntent = /\b(bandingkan|perbandingan|lebih besar|lebih kecil|paling besar|paling kecil|urutkan|manakah yang lebih|mana yang lebih)\b/i.test(normalized)
  if (!hasComparisonIntent) return null

  const match = normalized.match(/(\d{1,3})\s*(?:atau|dan|dibandingkan dengan|dengan|versus)\s*(\d{1,3})/i)
  if (!match) return null

  const first = Number(match[1])
  const second = Number(match[2])
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(second) || first < 0 || second < 0) return null
  return [first, second]
}


type ExactFractionVisual = {
  shape: 'circle' | 'rectangle' | 'line'
  total: number
  colored: number
  color: string
  columns?: number
}

type AnalyzedVisualSpec = {
  visualType: 'fraction_partition'
  shape: 'circle' | 'rectangle' | 'line' | 'objects'
  totalParts: number
  selectedParts: number
  meaning: 'selected' | 'removed' | 'remaining'
  visibleParts: number
  objectLabel?: string
  confidence: number
  highlightColor: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'gray'
}

function parseIndonesianNumber(value: string): number | null {
  const normalized = value.toLocaleLowerCase('id').trim()
  if (/^\d+$/.test(normalized)) return Number(normalized)
  const words: Record<string, number> = {
    satu: 1, sebuah: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
    enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
    sebelas: 11, 'dua belas': 12, 'tiga belas': 13, 'empat belas': 14,
    'lima belas': 15, 'enam belas': 16, 'tujuh belas': 17, 'delapan belas': 18,
    'sembilan belas': 19, 'dua puluh': 20,
  }
  return words[normalized] ?? null
}

function extractExactFractionVisual(item: GeneratedQuestion): ExactFractionVisual | null {
  // Fakta jumlah selalu diambil dari teks soal, bukan dari pembahasan atau tebakan AI.
  const source = item.question.toLocaleLowerCase('id').replace(/<[^>]*>/g, ' ')
  const numberPattern = '(\\d{1,2}|dua puluh|sembilan belas|delapan belas|tujuh belas|enam belas|lima belas|empat belas|tiga belas|dua belas|sebelas|sepuluh|sembilan|delapan|tujuh|enam|lima|empat|tiga|dua|satu|sebuah)'

  const totalMatch =
    source.match(new RegExp('(?:dibagi|terbagi|dipotong) menjadi\\s*' + numberPattern + '\\s*(?:bagian|potong|irisan|sektor|kotak|kolom|kuadran|jam)')) ||
    source.match(new RegExp('(?:terdiri dari|tersusun (?:atas|dari)|berisi)\\s*' + numberPattern + '\\s*(?:kotak kecil|kotak|bagian|sektor|kelereng|permen|stiker|jam)')) ||
    source.match(new RegExp(numberPattern + '\\s*(?:kotak kecil|kotak|bagian|sektor|kolom|kuadran|kelereng|permen|stiker|jam)\\s*(?:yang sama|sama besar|sama panjang)?')) ||
    source.match(new RegExp('ada\\s*' + numberPattern + '\\s*(?:kelereng|permen|stiker)'))

  if (!totalMatch) return null
  const total = parseIndonesianNumber(totalMatch[1])
  if (total === null || total < 2 || total > 20) return null

  const eatenMatch =
    source.match(new RegExp(numberPattern + '\\s*(?:potong|irisan|kotak)\\s*(?:sudah\\s*)?dimakan')) ||
    source.match(new RegExp('dimakan\\s*' + numberPattern + '\\s*(?:potong|irisan|kotak)'))

  const markedMatch =
    source.match(new RegExp(numberPattern + '\\s*(?:bagian|sektor|kotak|kolom|kuadran|jam)\\s*(?:(?:yang\\s*)?(?:di\\s*antaranya\\s*)?)?(?:sudah\\s*)?(?:diwarnai|diberi warna|berwarna|terisi|diisi|ditandai)')) ||
    source.match(new RegExp(numberPattern + '\\s*(?:di\\s*antaranya\\s*)?(?:berwarna|berbentuk|ditandai)'))

  const asksRemaining = /sisa|tersisa|masih ada|belum dimakan/.test(source)
  let colored: number
  if (asksRemaining && eatenMatch) {
    const eaten = parseIndonesianNumber(eatenMatch[1])
    if (eaten === null || eaten <= 0 || eaten >= total) return null
    colored = total - eaten
  } else if (eatenMatch) {
    colored = parseIndonesianNumber(eatenMatch[1]) ?? 0
  } else if (markedMatch) {
    colored = parseIndonesianNumber(markedMatch[1]) ?? 0
  } else {
    return null
  }
  if (colored < 1 || colored > total) return null

  const shape: ExactFractionVisual['shape'] =
    /garis lurus|garis bilangan/.test(source) ? 'line' :
    /pizza|pai|lingkaran|roti bundar|jam dinding|jam analog/.test(source) ? 'circle' : 'rectangle'
  const columns = /kolom/.test(source) ? total : /kuadran/.test(source) ? 2 : undefined
  return { shape, total, colored, color: '#2584e8', columns }
}

async function createExactFractionImage(item: GeneratedQuestion, analyzedSpec?: AnalyzedVisualSpec | null): Promise<Blob | null> {
  const visual: ExactFractionVisual | null = analyzedSpec
    ? { shape: analyzedSpec.shape === 'circle' ? 'circle' : analyzedSpec.shape === 'line' ? 'line' : 'rectangle', total: analyzedSpec.totalParts, colored: analyzedSpec.visibleParts, color: ({ red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e', blue: '#2584e8', purple: '#a855f7', pink: '#ec4899', brown: '#92400e', gray: '#64748b' } as const)[analyzedSpec.highlightColor] }
    : extractExactFractionVisual(item)
  if (!visual) return null

  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 900
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (visual.shape === 'circle') {
    const centerX = 800
    const centerY = 440
    const radius = 285
    const start = -Math.PI / 2
    const questionText = item.question.toLocaleLowerCase('id')
    const isPizza = /pizza|piza/.test(questionText) || /pizza|piza/.test(analyzedSpec?.objectLabel || '')

    if (isPizza) {
      // Satu pizza utuh dibagi tepat sesuai penyebut; tidak menggambar potongan pizza terpisah.
      for (let part = 0; part < visual.total; part++) {
        const a0 = start + (part * Math.PI * 2) / visual.total
        const a1 = start + ((part + 1) * Math.PI * 2) / visual.total
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius - 13, a0, a1)
        ctx.closePath()
        ctx.clip()

        ctx.fillStyle = part < visual.colored ? '#fbbf24' : '#fde68a'
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2)

        // Topping berada di atas permukaan pizza yang sama dan terpotong mengikuti batas tiap bagian.
        const toppings = [
          [-0.42, -0.43], [-0.08, -0.48], [0.28, -0.39],
          [-0.48, -0.08], [-0.16, -0.12], [0.18, -0.10], [0.46, -0.04],
          [-0.36, 0.27], [-0.02, 0.24], [0.34, 0.30],
          [-0.08, 0.48], [0.48, 0.42],
        ]
        for (const [dx, dy] of toppings) {
          const x = centerX + dx * radius
          const y = centerY + dy * radius
          if (Math.hypot(x - centerX, y - centerY) > radius - 25) continue
          ctx.beginPath()
          ctx.arc(x, y, 13, 0, Math.PI * 2)
          ctx.fillStyle = '#b91c1c'
          ctx.fill()
          ctx.strokeStyle = '#7f1d1d'
          ctx.lineWidth = 3
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2)
          ctx.fillStyle = '#fecaca'
          ctx.fill()
        }
        ctx.restore()
      }

      // Kulit pizza dan garis pembagi menyatu dalam satu lingkaran penuh.
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2)
      ctx.strokeStyle = '#b45309'
      ctx.lineWidth = 28
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius - 20, 0, Math.PI * 2)
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 7
      ctx.stroke()
      for (let part = 0; part < visual.total; part++) {
        const angle = start + (part * Math.PI * 2) / visual.total
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX + Math.cos(angle) * (radius - 8), centerY + Math.sin(angle) * (radius - 8))
        ctx.strokeStyle = '#78350f'
        ctx.lineWidth = 5
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#92400e'
      ctx.fill()
    } else {
      for (let part = 0; part < visual.total; part++) {
        const a0 = start + (part * Math.PI * 2) / visual.total
        const a1 = start + ((part + 1) * Math.PI * 2) / visual.total
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, a0, a1)
        ctx.closePath()
        ctx.fillStyle = part < visual.colored ? visual.color : '#f1f5f9'
        ctx.fill()
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 6
        ctx.stroke()
      }
    }
    if (/jam dinding|jam analog/.test(questionText)) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius + 24, 0, Math.PI * 2)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 18
      ctx.stroke()
      for (let hour = 0; hour < 12; hour++) {
        const angle = (hour * Math.PI * 2) / 12 - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(centerX + Math.cos(angle) * (radius - 28), centerY + Math.sin(angle) * (radius - 28))
        ctx.lineTo(centerX + Math.cos(angle) * (radius - 52), centerY + Math.sin(angle) * (radius - 52))
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 7
        ctx.stroke()
      }
    }
else if (visual.shape === 'line') {
    const left = 170
    const right = 1430
    const y = 450
    const segmentWidth = (right - left) / visual.total
    for (let part = 0; part < visual.total; part++) {
      ctx.fillStyle = part < visual.colored ? visual.color : '#e2e8f0'
      ctx.fillRect(left + part * segmentWidth + 3, y - 55, segmentWidth - 6, 110)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 4
      ctx.strokeRect(left + part * segmentWidth + 3, y - 55, segmentWidth - 6, 110)
    }
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(left, y - 75)
    ctx.lineTo(right, y - 75)
    ctx.stroke()
  } else {
    let columns = visual.columns ?? Math.ceil(Math.sqrt(visual.total))
    columns = Math.min(columns, visual.total)
    const rows = Math.ceil(visual.total / columns)
    const gap = 12
    const cellWidth = Math.min(210, 1180 / columns)
    const cellHeight = Math.min(170, 520 / rows)
    const width = columns * cellWidth + (columns - 1) * gap
    const height = rows * cellHeight + (rows - 1) * gap
    const left = (canvas.width - width) / 2
    const top = (canvas.height - height) / 2
    for (let part = 0; part < visual.total; part++) {
      const col = part % columns
      const row = Math.floor(part / columns)
      ctx.fillStyle = part < visual.colored ? visual.color : '#f1f5f9'
      ctx.fillRect(left + col * (cellWidth + gap), top + row * (cellHeight + gap), cellWidth, cellHeight)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 5
      ctx.strokeRect(left + col * (cellWidth + gap), top + row * (cellHeight + gap), cellWidth, cellHeight)
    }
  }
  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

function isMathematicsVisual(item: GeneratedQuestion, subject: string, topic: string): boolean {
  const text = (subject + ' ' + topic + ' ' + item.question + ' ' + item.explanation).toLocaleLowerCase('id')
  return /matematika|pecahan|bilangan|penjumlahan|pengurangan|perkalian|pembagian|bangun datar|bangun ruang|keliling|luas|volume|sudut|pola bilangan|diagram|grafik|perbandingan angka|jam analog|nilai tempat|desimal|persen/.test(text)
}

async function createExactNumberComparisonImage(question: string): Promise<Blob | null> {
  const numbers = extractNumberComparison(question)
  if (!numbers) return null

  const [first, second] = numbers
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 900
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createLinearGradient(0, 0, 1600, 900)
  gradient.addColorStop(0, '#eff6ff')
  gradient.addColorStop(1, '#f5f3ff')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1600, 900)

  ctx.fillStyle = '#172554'
  ctx.font = 'bold 54px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('AYO BANDINGKAN ANGKA', 800, 135)

  const drawCard = (x: number, value: number, fill: string, border: string) => {
    const y = 270
    const w = 440
    const h = 430
    ctx!.fillStyle = 'rgba(30, 41, 59, 0.10)'
    ctx!.beginPath()
    ctx!.roundRect(x + 8, y + 14, w, h, 38)
    ctx!.fill()
    ctx!.fillStyle = fill
    ctx!.strokeStyle = border
    ctx!.lineWidth = 10
    ctx!.beginPath()
    ctx!.roundRect(x, y, w, h, 38)
    ctx!.fill()
    ctx!.stroke()
    ctx!.fillStyle = '#0f172a'
    ctx!.font = 'bold 250px Arial, sans-serif'
    ctx!.textAlign = 'center'
    ctx!.textBaseline = 'middle'
    ctx!.fillText(String(value), x + w / 2, y + h / 2 + 12)
  }

  drawCard(180, first, '#ffffff', '#60a5fa')
  drawCard(980, second, '#ffffff', '#a78bfa')

  ctx.fillStyle = '#334155'
  ctx.font = 'bold 58px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ATAU', 800, 485)

  ctx.fillStyle = '#475569'
  ctx.font = '36px Arial, sans-serif'
  ctx.fillText('Perhatikan kedua angka', 800, 790)

  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

export default function AsistenAIPage() {
  const [grade, setGrade] = useState('Kelas 6 SD')
  const [subject, setSubject] = useState('Bahasa Indonesia')
  const [topic, setTopic] = useState('Kalimat sederhana dan penggunaan tanda baca')
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['multiple_choice'])
  const [countsByType, setCountsByType] = useState<Record<QuestionType, number>>({ multiple_choice: 5, complex_multiple_choice: 3, true_false_matrix: 3, essay: 4 })
  const [indicator, setIndicator] = useState('')
  const [cognitiveLevel, setCognitiveLevel] = useState('AUTO')
  const [shortAnswerCount, setShortAnswerCount] = useState(10)
  const [shortAnswerMaxScore, setShortAnswerMaxScore] = useState(2)
  const [longEssayMaxScore, setLongEssayMaxScore] = useState(3)
  const [includeImages, setIncludeImages] = useState(false)
  const [imageStyle, setImageStyle] = useState('3d_cartoon')
  const [imageType, setImageType] = useState('auto')
  const [imageAspectRatio, setImageAspectRatio] = useState('16:9')
  const [imageCustomInstruction, setImageCustomInstruction] = useState('')
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('Menghubungi penyedia AI...')

  async function generateImageForQuestion(index: number, item: GeneratedQuestion, analyzedSpec?: AnalyzedVisualSpec | null) {
    setQuestions((current) => current.map((question, itemIndex): GeneratedQuestion => itemIndex === index
      ? { ...question, image_status: 'generating', image_error: undefined }
      : question))

    try {
      // Visual angka dan pecahan dibuat dengan geometri terprogram agar nilainya tepat.
      const exactComparisonBlob = await createExactNumberComparisonImage(item.question)
      const exactFractionBlob = exactComparisonBlob ? null : await createExactFractionImage(item, analyzedSpec)
      const exactMathBlob = exactComparisonBlob || exactFractionBlob
      if (exactMathBlob) {
        setLoadingMessage('Membuat visual matematika dengan angka dan pembagian yang tepat...')
        const formData = new FormData()
        formData.append('file', new File([exactMathBlob], 'visual-matematika-soal-' + (index + 1) + '.png', { type: 'image/png' }))
        const uploadResponse = await fetch('/api/media/upload', { method: 'POST', body: formData })
        const uploadPayload = await uploadResponse.json()
        if (!uploadResponse.ok || !uploadPayload.file?.imageUrl) {
          throw new Error(uploadPayload.error || 'Visual matematika dibuat, tetapi gagal disimpan ke Google Drive.')
        }
        setQuestions((current) => current.map((question, itemIndex): GeneratedQuestion => itemIndex === index
          ? { ...question, image_url: uploadPayload.file.imageUrl, image_status: 'ready', image_error: undefined }
          : question))
        return
      }

      // Jangan meminta FLUX menggambar matematika yang belum memiliki renderer presisi.
      // Lebih aman tidak menampilkan gambar daripada memberi diagram/pecahan yang salah.
      if (isMathematicsVisual(item, subject, topic)) {
        setQuestions((current) => current.map((question, itemIndex): GeneratedQuestion => itemIndex === index
          ? { ...question, image_status: 'failed', image_error: 'Visual matematika untuk tipe soal ini belum didukung. Gambar otomatis dihentikan agar tidak menghasilkan angka, pecahan, atau diagram yang keliru.' }
          : question))
        return
      }

      setLoadingMessage('AI sedang merancang ilustrasi sesuai isi soal...')
      const planResponse = await fetch('/api/admin/ai/plan-question-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          subject,
          topic,
          indicator,
          questionType: item.question_type,
          question: item.question,
          options: item.options,
          answer: item.answer,
          answers: item.answers,
          statements: item.statements,
          explanation: item.explanation,
          modelAnswer: item.model_answer,
          teacherImageBrief: item.image_prompt || '',
          imageType,
          customInstruction: imageCustomInstruction,
        }),
      })
      const planPayload = await planResponse.json()
      if (!planResponse.ok || !planPayload.imagePrompt) {
        throw new Error(planPayload.error || 'AI belum berhasil merancang ilustrasi.')
      }

      setLoadingMessage('Cloudflare sedang menggambar sesuai rancangan AI...')
      const imageResponse = await fetch('/api/admin/ai/generate-question-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: planPayload.imagePrompt,
          style: imageStyle,
          imageType,
          aspectRatio: imageAspectRatio,
          customInstruction: imageCustomInstruction,
        }),
      })
      const imagePayload = await imageResponse.json()
      if (!imageResponse.ok) throw new Error(imagePayload.error || 'Gagal membuat gambar.')
      if (!imagePayload.imageBase64 || !imagePayload.mimeType) {
        throw new Error('Cloudflare tidak mengirimkan data gambar yang dapat disimpan.')
      }

      const imageBlob = await (await fetch(`data:${imagePayload.mimeType};base64,${imagePayload.imageBase64}`)).blob()
      const extension = imagePayload.mimeType === 'image/jpeg' ? 'jpg' : imagePayload.mimeType === 'image/webp' ? 'webp' : 'png'
      const formData = new FormData()
      formData.append('file', new File([imageBlob], `ai-soal-${index + 1}.${extension}`, { type: imagePayload.mimeType }))

      const uploadResponse = await fetch('/api/media/upload', { method: 'POST', body: formData })
      const uploadPayload = await uploadResponse.json()
      if (!uploadResponse.ok || !uploadPayload.file?.imageUrl) {
        throw new Error(uploadPayload.error || 'Gambar dibuat, tetapi gagal disimpan ke Google Drive.')
      }

      setQuestions((current) => current.map((item, itemIndex): GeneratedQuestion => itemIndex === index
        ? { ...item, image_url: uploadPayload.file.imageUrl, image_status: 'ready', image_error: undefined }
        : item))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal membuat gambar.'
      setQuestions((current) => current.map((item, itemIndex): GeneratedQuestion => itemIndex === index
        ? { ...item, image_status: 'failed', image_error: message }
        : item))
    }
  }

  async function generateQuestions(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const totalCount = selectedTypes.reduce((sum, type) => sum + countsByType[type], 0)
    if (!selectedTypes.length) { setError('Pilih minimal satu bentuk soal.'); return }
    if (totalCount > 15) { setError('Jumlah seluruh soal maksimal 15 agar proses tetap ringan.'); return }
    if (selectedTypes.includes('essay') && countsByType.essay < 2) {
      setError('Untuk tipe uraian, pilih minimal 2 soal agar kelompok isian singkat dan uraian panjang dapat dibuat.')
      return
    }
    setLoading(true); setError(''); setQuestions([])
    try {
      const allQuestions: GeneratedQuestion[] = []
      const usedModels: string[] = []
      // Diproses berurutan agar tidak membebani kuota AI sekaligus.
      for (let typeIndex = 0; typeIndex < selectedTypes.length; typeIndex++) {
        const type = selectedTypes[typeIndex], typeCount = countsByType[type]
        setLoadingMessage(`Membuat ${questionTypeLabels[type].toLowerCase()} (${typeIndex + 1}/${selectedTypes.length})...`)
        const response = await fetch('/api/admin/ai/generate-questions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grade, subject, topic, count: typeCount, indicator, cognitiveLevel, questionType: type,
            shortAnswerCount: Math.min(shortAnswerCount, typeCount - 1), shortAnswerMaxScore, longEssayMaxScore, includeImages, imageType }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(`${questionTypeLabels[type]}: ${payload.error || 'Gagal membuat soal.'}`)
        if (!Array.isArray(payload.questions)) throw new Error(`AI tidak mengirimkan daftar ${questionTypeLabels[type].toLowerCase()}.`)
        if (payload.provider || payload.model) usedModels.push([payload.provider, payload.model].filter(Boolean).join(' · '))
        allQuestions.push(...(payload.questions as GeneratedQuestion[]).map((item) => ({
          ...item, question_type: type,
          image_status: includeImages && item.image_prompt?.trim() ? 'pending' as const : 'none' as const,
        })))
        setQuestions([...allQuestions])
      }
      setModel(Array.from(new Set(usedModels)).join(' / ') || 'AI')
      setLoadingMessage('Semua tipe soal berhasil dibuat. Memeriksa kebutuhan gambar...')
      if (includeImages) {
        const imageTargets = allQuestions.map((item, index) => ({ index, prompt: item.image_prompt?.trim() || '' })).filter((item) => item.prompt)
        if (!imageTargets.length) setLoadingMessage('Soal selesai. Tidak ada soal yang memerlukan gambar penyerta.')
        else {
          setLoadingMessage('AI sedang memahami kebutuhan visual setiap soal...')
          let visualSpecs: Record<number, AnalyzedVisualSpec> = {}
          try {
            const analysisResponse = await fetch('/api/admin/ai/analyze-question-visual', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subject, topic, questions: imageTargets.map(({ index }) => ({
                question: allQuestions[index].question, explanation: allQuestions[index].explanation,
              })) }),
            })
            const analysisPayload = await analysisResponse.json()
            if (analysisResponse.ok && Array.isArray(analysisPayload.results)) {
              for (const entry of analysisPayload.results as Array<{ index?: number; spec?: AnalyzedVisualSpec | null }>) {
                if (!Number.isInteger(entry.index) || entry.spec?.visualType !== 'fraction_partition') continue
                const target = imageTargets[entry.index as number]
                if (target) visualSpecs[target.index] = entry.spec
              }
            }
          } catch (analysisError) { console.warn('AI visual analyzer failed; legacy exact renderer will be used.', analysisError) }
          let nextTarget = 0, finishedImages = 0
          const worker = async () => {
            while (nextTarget < imageTargets.length) {
              const target = imageTargets[nextTarget++]
              setLoadingMessage(`Membuat gambar penyerta ${finishedImages + 1} dari ${imageTargets.length}...`)
              await generateImageForQuestion(target.index, allQuestions[target.index], visualSpecs[target.index] || null)
              finishedImages++
              setLoadingMessage(`${finishedImages} dari ${imageTargets.length} gambar selesai diproses...`)
            }
          }
          await Promise.all(Array.from({ length: Math.min(2, imageTargets.length) }, () => worker()))
        }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Terjadi kesalahan.') }
    finally { setLoading(false) }
  }
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-600 p-5 text-white shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-3"><Bot size={28} /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">Fitur percobaan</p>
              <h1 className="text-2xl font-black sm:text-3xl">Asisten AI Guru</h1>
              <p className="mt-1 text-sm text-indigo-100">Bantu guru menyiapkan soal pembelajaran dengan Groq dan Gemini cadangan.</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="text-violet-600" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Uji coba membuat soal</h2>
          </div>

          <form onSubmit={generateQuestions} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Kelas
              <input value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={40} required className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Mata pelajaran
              <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={80} required className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
              Materi / topik
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={300} required rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Contoh: penjumlahan bilangan sampai 100" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
              Indikator soal <span className="font-normal text-slate-400">(opsional)</span>
              <textarea value={indicator} onChange={(e) => setIndicator(e.target.value)} maxLength={200} rows={2} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Contoh: Disajikan sebuah teks, siswa dapat menentukan gagasan pokok." />
            </label>
            <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 sm:col-span-2">
              <div>
                <p className="text-sm font-bold text-indigo-900">Pilih bentuk soal yang akan dibuat</p>
                <p className="mt-1 text-xs font-normal text-indigo-800">Centang satu atau beberapa tipe. Jumlah seluruh soal maksimal 15 dalam satu proses.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['multiple_choice', 'Pilihan ganda', 'Satu jawaban benar'],
                  ['complex_multiple_choice', 'Pilihan ganda kompleks', 'Lebih dari satu jawaban benar'],
                  ['true_false_matrix', 'Benar / Salah (Matriks)', '3–4 pernyataan per soal'],
                  ['essay', 'Uraian', 'Dilengkapi contoh jawaban dan rubrik'],
                ] as [QuestionType, string, string][]).map(([type, title, description]) => (
                  <div key={type} className="rounded-xl border border-indigo-100 bg-white p-3">
                    <label className="flex cursor-pointer items-start gap-2">
                      <input type="checkbox" checked={selectedTypes.includes(type)} onChange={(e) => setSelectedTypes((current) => e.target.checked ? [...current, type] : current.filter((item) => item !== type))} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-800">{title}</span>
                        <span className="block text-xs font-normal text-slate-500">{description}</span>
                      </span>
                    </label>
                    {selectedTypes.includes(type) && (
                      <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                        Jumlah
                        <input type="number" min={type === 'essay' ? 2 : 1} max={15} value={countsByType[type]} onChange={(e) => setCountsByType((current) => ({ ...current, [type]: Math.min(15, Math.max(type === 'essay' ? 2 : 1, Number(e.target.value) || 1)) }))} className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal" />
                        soal
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold text-indigo-900">Total yang dipilih: {selectedTypes.reduce((sum, type) => sum + countsByType[type], 0)} / 15 soal</p>
            </div>
            {selectedTypes.includes('essay') && (
              <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 sm:col-span-2">
                <div>
                  <p className="text-sm font-bold text-violet-900">Pengaturan kelompok skor uraian</p>
                  <p className="mt-1 text-xs font-normal text-violet-800">Semua soal tetap disimpan sebagai tipe uraian/essay agar kompatibel dengan CBT.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Jumlah soal isian singkat pertama
                    <input type="number" min={1} max={Math.max(1, countsByType.essay - 1)} value={Math.min(shortAnswerCount, Math.max(1, countsByType.essay - 1))} onChange={(e) => setShortAnswerCount(Math.min(Math.max(1, Number(e.target.value)), Math.max(1, countsByType.essay - 1)))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" />
                  </label>
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Skor maksimal isian singkat
                    <input type="number" min={1} max={100} value={shortAnswerMaxScore} onChange={(e) => setShortAnswerMaxScore(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" />
                  </label>
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Skor maksimal uraian panjang
                    <input type="number" min={1} max={100} value={longEssayMaxScore} onChange={(e) => setLongEssayMaxScore(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" />
                  </label>
                </div>
                <p className="text-xs text-violet-900">Kelompok pertama mendapat maksimal {shortAnswerMaxScore} poin per soal dan kelompok berikutnya maksimal {longEssayMaxScore} poin.</p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span>
                  <span className="block text-sm font-bold text-slate-800">Buat gambar penyerta otomatis</span>
                  <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-600">AI menentukan soal yang benar-benar membutuhkan gambar. Soal tanpa kebutuhan visual tidak akan dipaksakan memiliki gambar.</span>
                </span>
              </label>
              {includeImages && (
                <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Gaya gambar
                    <select value={imageStyle} onChange={(e) => setImageStyle(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal">
                      <option value="3d_cartoon">3D Modern / 3D Cartoon</option>
                      <option value="2d_flat">Ilustrasi 2D sederhana</option>
                      <option value="semi_realistic">Semi-realistis</option>
                      <option value="photo_realistic">Realistis seperti foto</option>
                      <option value="black_white">Hitam putih untuk LKPD</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Jenis gambar
                    <select value={imageType} onChange={(e) => setImageType(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal">
                      <option value="auto">Otomatis sesuai soal</option>
                      <option value="illustration">Ilustrasi penjelas</option>
                      <option value="object">Objek nyata</option>
                      <option value="nature">Alam / sains</option>
                      <option value="diagram">Diagram konseptual sederhana</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Bentuk gambar
                    <select value={imageAspectRatio} onChange={(e) => setImageAspectRatio(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal">
                      <option value="16:9">Horizontal (16:9)</option>
                      <option value="4:3">Landscape (4:3)</option>
                      <option value="1:1">Persegi (1:1)</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                    Instruksi khusus gambar <span className="font-normal text-slate-400">(opsional)</span>
                    <input value={imageCustomInstruction} onChange={(e) => setImageCustomInstruction(e.target.value)} maxLength={500} placeholder="Contoh: gunakan latar putih dan warna lembut" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" />
                  </label>
                  <p className="text-xs font-normal leading-relaxed text-slate-500 sm:col-span-2">Gambar dibuat menggunakan Cloudflare Workers AI (FLUX.1 Schnell) dan disimpan ke penyimpanan media. Diagram matematika dengan angka atau label presisi tetap perlu diperiksa guru. Penggunaan gambar dapat menambah biaya API.</p>
                </div>
              )}
            </div>

            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Level kognitif
              <select value={cognitiveLevel} onChange={(e) => setCognitiveLevel(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="AUTO">Otomatis sesuai materi</option>
                <option value="LOTS">LOTS — mengingat dan memahami</option>
                <option value="MOTS">MOTS — menerapkan</option>
                <option value="HOTS">HOTS — menganalisis dan menalar</option>
                <option value="C1">C1 — Mengingat</option>
                <option value="C2">C2 — Memahami</option>
                <option value="C3">C3 — Menerapkan</option>
                <option value="C4">C4 — Menganalisis</option>
                <option value="C5">C5 — Mengevaluasi</option>
                <option value="C6">C6 — Mencipta</option>
              </select>
            </label>
            <div className="space-y-1.5 text-sm font-semibold text-slate-700">
              Model AI
              <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal text-slate-700">
                <span className="font-semibold">Groq (utama)</span>
                <span className="ml-2 text-xs text-emerald-700">Gemini cadangan</span>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Jika Groq tidak tersedia atau kuotanya habis, sistem otomatis mencoba Gemini.</p>
              </div>
            </div>
            <div className="flex items-end sm:col-span-2">
              <button type="submit" disabled={loading || selectedTypes.length === 0 || selectedTypes.reduce((sum, type) => sum + countsByType[type], 0) > 15} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {loading ? 'AI sedang membuat soal...' : 'Buat semua soal dengan AI'}
              </button>
            </div>
          </form>

          {loading && <p className="mt-3 text-center text-xs text-slate-500" aria-live="polite">{loadingMessage}</p>}
          {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
        </section>

        {questions.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-black text-slate-800">Hasil dari Asisten AI</h2>
                <p className="text-sm text-slate-500">{questions.length} soal berhasil dibuat · {model} · {Array.from(new Set(questions.map((item) => questionTypeLabels[item.question_type]))).join(', ')}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> Berhasil</span>
            </div>

            {questions.map((item, index) => (
              <article key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-black text-indigo-700">{index + 1}</span>
                  <h3 className="pt-1 font-bold leading-relaxed text-slate-800">{item.question}</h3>
                </div>

                {item.image_prompt && (
                  <div className="ml-11 mt-3 space-y-2">
                    {item.image_url ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img src={item.image_url} alt={`Gambar penyerta soal nomor ${index + 1}`} className="max-h-80 w-full object-contain" />
                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
                          <span className="text-xs font-semibold text-emerald-700">Gambar tersimpan di penyimpanan media</span>
                          <button type="button" onClick={() => generateImageForQuestion(index, item)} disabled={item.image_status === 'generating'} className="text-xs font-bold text-indigo-700 hover:text-indigo-900 disabled:opacity-50">
                            Buat ulang gambar
                          </button>
                        </div>
                      </div>
                    ) : item.image_status === 'generating' ? (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs font-semibold text-indigo-700">Sedang membuat dan menyimpan gambar...</div>
                    ) : item.image_status === 'failed' ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs text-rose-700">
                        <span>{item.image_error || 'Gambar gagal dibuat.'}</span>
                        <button type="button" onClick={() => generateImageForQuestion(index, item)} className="font-bold underline">Coba lagi</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                        <span>Soal ini membutuhkan gambar penyerta.</span>
                        <button type="button" onClick={() => generateImageForQuestion(index, item)} className="font-bold text-indigo-700">Buat gambar</button>
                      </div>
                    )}
                  </div>
                )}

                {item.question_type === 'multiple_choice' && item.options && (
                  <div className="ml-11 grid gap-2 sm:grid-cols-2">
                    {(['A', 'B', 'C', 'D'] as const).map((key) => (
                      <div key={key} className={`rounded-lg border px-3 py-2.5 text-sm ${item.answer === key ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        <span className="mr-2 font-black">{key}.</span><MathRenderer content={formatMathOption(item.options?.[key] || '', item.question + ' ' + item.explanation)} className="inline-block align-middle" />
                        {item.answer === key && <CheckCircle2 size={15} className="ml-2 inline" />}
                      </div>
                    ))}
                  </div>
                )}

                {item.question_type === 'complex_multiple_choice' && item.options && (
                  <div className="ml-11 space-y-2">
                    {(['A', 'B', 'C', 'D'] as const).map((key) => {
                      const isCorrect = item.answers?.includes(key)
                      return <div key={key} className={`rounded-lg border px-3 py-2.5 text-sm ${isCorrect ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        <span className="mr-2 font-black">{key}.</span><MathRenderer content={formatMathOption(item.options?.[key] || '', item.question + ' ' + item.explanation)} className="inline-block align-middle" />
                        {isCorrect && <span className="ml-2 text-xs font-bold">✓ Kunci benar</span>}
                      </div>
                    })}
                    <p className="text-xs font-bold text-emerald-700">Kunci jawaban: {item.answers?.join(', ')}</p>
                  </div>
                )}

                {item.question_type === 'true_false_matrix' && (
                  <div className="ml-11 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 text-left">Pernyataan</th><th className="px-3 py-2 text-center">Kunci</th></tr></thead>
                      <tbody>{item.statements?.map((statement) => <tr key={statement.id} className="border-t border-slate-200"><td className="px-3 py-2">{statement.id}. {statement.text}</td><td className="px-3 py-2 text-center font-bold text-emerald-700">{statement.answer}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}

                {item.question_type === 'essay' && (
                  <div className="ml-11 space-y-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      <p className="font-bold">Contoh jawaban</p>
                      <p className="mt-1 whitespace-pre-wrap">{item.model_answer}</p>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                      <p className="font-bold">Pedoman penilaian · Skor maksimal {item.max_score ?? 10}</p>
                      <p className="mt-1 whitespace-pre-wrap">{item.rubric}</p>
                    </div>
                  </div>
                )}

                <div className="ml-11 mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-bold">Pembahasan</p>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.explanation}</p>
                </div>
              </article>
            ))}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <BookOpen size={18} className="mt-0.5 shrink-0" />
                <p><strong>Catatan:</strong> Hasil ini masih berupa draf dan belum disimpan ke bank soal. Guru perlu memeriksa isi, kunci jawaban, contoh jawaban, serta pedoman penilaian sebelum digunakan. Khusus soal uraian, nilai akhir tetap ditentukan oleh guru.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}