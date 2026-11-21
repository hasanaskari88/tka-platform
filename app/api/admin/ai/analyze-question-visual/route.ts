import { NextResponse } from 'next/server'
import { generateJsonWithFallback, AIProvidersUnavailableError } from '@/lib/ai/provider'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

export const maxDuration = 60

type VisualType = 'fraction_partition' | 'equal_groups' | 'none'
type Shape = 'circle' | 'rectangle' | 'line' | 'objects'
type Meaning = 'selected' | 'removed' | 'remaining'
type HighlightColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'gray'

type VisualSpec = {
  visualType: VisualType
  shape: Shape
  totalParts: number
  selectedParts: number
  meaning: Meaning
  objectLabel: string
  highlightColor: HighlightColor
  confidence: number
  totalObjects: number
  groupCount: number
  selectedGroups: number
  reason: string
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function validateSpec(value: unknown): VisualSpec | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  if (item.visualType === 'none') {
    return {
      visualType: 'none', shape: 'rectangle', totalParts: 0, selectedParts: 0,
      meaning: 'selected', objectLabel: '', highlightColor: 'blue', confidence: 0,
      totalObjects: 0, groupCount: 0, selectedGroups: 0, reason: cleanText(item.reason, 240),
    }
  }

  const confidence = Number(item.confidence)
  const allowedColors: HighlightColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'gray']
  const highlightColor = allowedColors.includes(item.highlightColor as HighlightColor) ? item.highlightColor as HighlightColor : 'blue'

  if (item.visualType === 'equal_groups') {
    const totalObjects = Number(item.totalObjects)
    const groupCount = Number(item.groupCount)
    const selectedGroups = Number(item.selectedGroups)
    if (!Number.isInteger(totalObjects) || totalObjects < 1 || totalObjects > 40 ||
        !Number.isInteger(groupCount) || groupCount < 2 || groupCount > 12 ||
        !Number.isInteger(selectedGroups) || selectedGroups < 1 || selectedGroups > groupCount ||
        totalObjects % groupCount !== 0 ||
        !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null
    return {
      visualType: 'equal_groups', shape: 'objects', totalParts: groupCount,
      selectedParts: selectedGroups, meaning: 'selected',
      objectLabel: cleanText(item.objectLabel, 60), highlightColor, confidence,
      totalObjects, groupCount, selectedGroups, reason: cleanText(item.reason, 240),
    }
  }

  const totalParts = Number(item.totalParts)
  const selectedParts = Number(item.selectedParts)
  const confidence = Number(item.confidence)
  const shape = item.shape
  const meaning = item.meaning
  const allowedColors: HighlightColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'gray']
  const highlightColor = allowedColors.includes(item.highlightColor as HighlightColor) ? item.highlightColor as HighlightColor : 'blue'
  if (
    item.visualType !== 'fraction_partition' ||
    !Number.isInteger(totalParts) || totalParts < 2 || totalParts > 20 ||
    !Number.isInteger(selectedParts) || selectedParts < 0 || selectedParts > totalParts ||
    !['circle', 'rectangle', 'line', 'objects'].includes(String(shape)) ||
    !['selected', 'removed', 'remaining'].includes(String(meaning)) ||
    !Number.isFinite(confidence) || confidence < 0 || confidence > 1
  ) return null

  const visibleParts = meaning === 'removed' ? totalParts - selectedParts : selectedParts
  if (visibleParts < 1 || visibleParts > totalParts) return null

  return {
    visualType: 'fraction_partition',
    shape: shape as Shape,
    totalParts,
    selectedParts,
    meaning: meaning as Meaning,
    objectLabel: cleanText(item.objectLabel, 60),
    highlightColor,
    confidence,
    reason: cleanText(item.reason, 240),
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
    }

    const auth = await requireTrustedAdmin()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json()
    const subject = cleanText(body.subject, 80)
    const topic = cleanText(body.topic, 300)
    const questions = Array.isArray(body.questions) ? body.questions.slice(0, 15) : []
    if (!questions.length) return NextResponse.json({ error: 'Daftar soal wajib dikirim.' }, { status: 400 })

    const safeQuestions = questions.map((question: unknown, index: number) => {
      const item = question && typeof question === 'object' ? question as Record<string, unknown> : {}
      return { index, question: cleanText(item.question, 3000), explanation: cleanText(item.explanation, 1500) }
    })
    if (safeQuestions.some((item: { index: number; question: string; explanation: string }) => !item.question)) {
      return NextResponse.json({ error: 'Teks soal tidak boleh kosong.' }, { status: 400 })
    }

    const prompt = `Anda adalah analis visual pendidikan dan penalaran matematika. Analisis setiap soal secara mandiri. Jangan terpaku pada kata-kata tertentu; pahami makna kalimat dalam bahasa Indonesia, termasuk sinonim, imbuhan, dan susunan kalimat yang berbeda.

KONTEKS:
Mata pelajaran: ${subject || 'Tidak disebutkan'}
Materi: ${topic || 'Tidak disebutkan'}

SOAL:
${JSON.stringify(safeQuestions)}

TUGAS:
Untuk setiap soal, tentukan apakah diagram hitung/pecahan yang presisi akan membantu. Fokus tahap pertama ini pada situasi pecahan atau bagian dari keseluruhan.
Jika cocok, ekstrak:
- totalParts: jumlah seluruh bagian/benda yang menjadi satu keseluruhan
- selectedParts: jumlah yang disebut dipilih, diwarnai, dimakan, ditanami, ditandai, atau jumlah kategori tertentu
- meaning: "selected" bila yang ditanyakan/digambarkan bagian terpilih; "removed" bila sejumlah bagian diambil/dimakan dan soal menanyakan sisa; "remaining" bila jumlah sisa dinyatakan langsung
- shape: "circle" untuk pizza/lingkaran, "line" untuk garis/ruas, "objects" untuk kumpulan benda lepas, selain itu "rectangle"
- objectLabel: nama objek sederhana dalam bahasa Indonesia, boleh kosong
- highlightColor: warna bagian yang disorot. Jika soal secara eksplisit menyebut warna (misalnya apel hijau, bagian merah, bola kuning), WAJIB gunakan warna itu. Pilihan hanya red, orange, yellow, green, blue, purple, pink, brown, gray. Jika soal tidak menyebut warna secara eksplisit, gunakan blue. Jangan menebak warna dari nama benda saja.
- confidence: keyakinan 0 sampai 1
Jangan mengarang angka. Bedakan jumlah keseluruhan dari jumlah yang ditanyakan. Jika ada lebih dari satu tafsir, informasi bertentangan, atau fakta jumlah tidak lengkap, pilih visualType "none". Jangan membuat diagram untuk sekadar dekorasi.

Jika soal meminta pecahan dari sekumpulan benda konkret yang dapat dibagi rata (misalnya 3/5 dari 10 apel), pilih visualType "equal_groups". Isi totalObjects (jumlah benda), groupCount (penyebut/jumlah kelompok), selectedGroups (pembilang/jumlah kelompok yang diambil), dan objectLabel. Pastikan totalObjects habis dibagi groupCount. Contoh 10 apel dan 3/5: totalObjects=10, groupCount=5, selectedGroups=3, sehingga setiap kelompok berisi 2 apel. Jangan menggambar lima bidang abstrak di atas satu buah apel. Jika fakta jumlah atau pembagian tidak jelas, pilih none.

KELUARAN: JSON saja. Kembalikan satu elemen untuk setiap soal dan pertahankan index yang sama.`

    const { data, provider } = await generateJsonWithFallback({
      task: 'analisis visual soal secara batch',
      prompt,
      maxOutputTokens: 2200,
      groqSchema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                index: { type: 'integer' },
                visualType: { type: 'string', enum: ['fraction_partition', 'equal_groups', 'none'] },
                shape: { type: 'string', enum: ['circle', 'rectangle', 'line', 'objects'] },
                totalParts: { type: 'integer' },
                selectedParts: { type: 'integer' },
                meaning: { type: 'string', enum: ['selected', 'removed', 'remaining'] },
                objectLabel: { type: 'string' },
                highlightColor: { type: 'string', enum: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'gray'] },
                confidence: { type: 'number' },
                totalObjects: { type: 'integer' },
                groupCount: { type: 'integer' },
                selectedGroups: { type: 'integer' },
                reason: { type: 'string' },
              },
              required: ['index', 'visualType', 'shape', 'totalParts', 'selectedParts', 'meaning', 'objectLabel', 'highlightColor', 'confidence', 'totalObjects', 'groupCount', 'selectedGroups', 'reason'],
              additionalProperties: false,
            },
          },
        },
        required: ['results'],
        additionalProperties: false,
      },
      geminiSchema: {
        type: 'OBJECT',
        properties: {
          results: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                index: { type: 'INTEGER' },
                visualType: { type: 'STRING', enum: ['fraction_partition', 'equal_groups', 'none'] },
                shape: { type: 'STRING', enum: ['circle', 'rectangle', 'line', 'objects'] },
                totalParts: { type: 'INTEGER' },
                selectedParts: { type: 'INTEGER' },
                meaning: { type: 'STRING', enum: ['selected', 'removed', 'remaining'] },
                objectLabel: { type: 'STRING' },
                highlightColor: { type: 'STRING', enum: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'gray'] },
                confidence: { type: 'NUMBER' },
                totalObjects: { type: 'INTEGER' },
                groupCount: { type: 'INTEGER' },
                selectedGroups: { type: 'INTEGER' },
                reason: { type: 'STRING' },
              },
              required: ['index', 'visualType', 'shape', 'totalParts', 'selectedParts', 'meaning', 'objectLabel', 'highlightColor', 'confidence', 'totalObjects', 'groupCount', 'selectedGroups', 'reason'],
            },
          },
        },
        required: ['results'],
      },
    })

    const rawResults = Array.isArray(data.results) ? data.results : []
    const results = safeQuestions.map((question: { index: number; question: string; explanation: string }, index: number) => {
      const raw = rawResults.find((entry: unknown) => entry && typeof entry === 'object' && Number((entry as Record<string, unknown>).index) === index)
      const spec = validateSpec(raw)
      if (!spec || spec.visualType === 'none' || spec.confidence < 0.75) {
        return { index, spec: null, reason: spec?.reason || 'Informasi visual belum cukup jelas.' }
      }
      const visibleParts = spec.meaning === 'removed' ? spec.totalParts - spec.selectedParts : spec.selectedParts
      if (visibleParts < 1 || visibleParts > spec.totalParts) {
        return { index, spec: null, reason: 'Hasil perhitungan bagian tidak valid.' }
      }
      return { index, spec: { ...spec, visibleParts }, reason: spec.reason }
    })

    return NextResponse.json({ success: true, provider, results })
  } catch (error) {
    console.error('Question visual analysis failed:', error)
    const status = error instanceof AIProvidersUnavailableError ? error.status : 500
    const message = error instanceof AIProvidersUnavailableError
      ? error.message
      : 'Gagal menganalisis kebutuhan visual soal.'
    return NextResponse.json({ error: message }, { status })
  }
}
