'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'

export interface BulkUploadModalProps {
  examId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function BulkUploadModal({
  examId,
  isOpen,
  onClose,
  onSuccess,
}: BulkUploadModalProps) {
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  if (!isOpen) return null

  // -------------------------------------------------------------
  // FUNGSI UNDUH TEMPLATE CONTOH (MEMUAT 4 TIPE SOAL LENGKAP)
  // -------------------------------------------------------------

  // 1. Unduh Template Excel (.xlsx) - Memuat 4 Tipe Soal Lengkap
  const handleDownloadExcelTemplate = () => {
    const sampleData = [
      {
        question_type: 'multiple_choice',
        question_text: 'Berapakah hasil dari $2^3 \\times 2^2$?',
        max_score: 1,
        option_A: '16',
        option_B: '32',
        option_C: '64',
        option_D: '128',
        correct_option: 'B',
        statement_1: '',
        statement_1_key: '',
        statement_2: '',
        statement_2_key: '',
        explanation: 'Sifat eksponen: $a^m \\times a^n = a^{m+n}$, maka $2^{3+2} = 2^5 = 32$.',
      },
      {
        question_type: 'complex_multiple_choice',
        question_text: 'Manakah di antara bilangan berikut yang merupakan bilangan prima?',
        max_score: 2,
        option_A: '2',
        option_B: '4',
        option_C: '7',
        option_D: '9',
        correct_option: 'A,C',
        statement_1: '',
        statement_1_key: '',
        statement_2: '',
        statement_2_key: '',
        explanation: '2 dan 7 adalah bilangan prima karena hanya memiliki dua faktor pembagi.',
      },
      {
        question_type: 'true_false_matrix',
        question_text: 'Tentukan kebenaran dari pernyataan trigonometri berikut:',
        max_score: 2,
        option_A: '',
        option_B: '',
        option_C: '',
        option_D: '',
        correct_option: 'MATRIX',
        statement_1: 'Nilai dari $\\sin 90^\\circ$ adalah 1',
        statement_1_key: 'Benar',
        statement_2: 'Nilai dari $\\cos 0^\\circ$ adalah 0',
        statement_2_key: 'Salah',
        explanation: '$\\sin 90^\\circ = 1$ (Benar) dan $\\cos 0^\\circ = 1$ (Pernyataan senilai 0 adalah Salah).',
      },
      {
        question_type: 'essay',
        question_text: 'Jelaskan mengapa fotosintesis sangat penting bagi keberlangsungan ekosistem di bumi!',
        max_score: 5,
        option_A: '',
        option_B: '',
        option_C: '',
        option_D: '',
        correct_option: 'ESSAY',
        statement_1: '',
        statement_1_key: '',
        statement_2: '',
        statement_2_key: '',
        explanation: 'Pedoman Penskoran: Menjelaskan penghasil O2 (poin 2), penyerap CO2 (poin 2), dan produsen utama rantai makanan (poin 1).',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Soal TKA')

    worksheet['!cols'] = [
      { wch: 22 },
      { wch: 45 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 35 },
      { wch: 15 },
      { wch: 35 },
      { wch: 15 },
      { wch: 45 },
    ]

    XLSX.writeFile(workbook, 'Template_Import_Soal_Lengkap_TKA.xlsx')
  }

  // 2. Unduh Template Aiken (.txt)
  const handleDownloadAikenTemplate = () => {
    const sampleAiken = `Berapakah hasil dari $2^3 \\times 2^2$?
A. 16
B. 32
C. 64
D. 128
ANSWER: B

Manakah di antara bilangan berikut yang merupakan bilangan prima?
A. 2
B. 4
C. 7
D. 9
ANSWER: A
`
    const blob = new Blob([sampleAiken], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Template_Import_Soal_Aiken.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // 3. Unduh Template Moodle XML (.xml)
  const handleDownloadMoodleXMLTemplate = () => {
    const sampleMoodleXML = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="multichoice">
    <name>
      <text>Soal 1</text>
    </name>
    <questiontext format="html">
      <text><![CDATA[Berapakah hasil dari $2^3 \\times 2^2$?]]></text>
    </questiontext>
    <generalfeedback format="html">
      <text><![CDATA[Sifat eksponen: $a^m \\times a^n = a^{m+n}$, maka $2^{3+2} = 2^5 = 32$.]]></text>
    </generalfeedback>
    <defaultgrade>1.0000000</defaultgrade>
    <single>true</single>
    <shuffleanswers>true</shuffleanswers>
    <answernumbering>abc</answernumbering>
    <answer fraction="0" format="html">
      <text><![CDATA[16]]></text>
    </answer>
    <answer fraction="100" format="html">
      <text><![CDATA[32]]></text>
    </answer>
    <answer fraction="0" format="html">
      <text><![CDATA[64]]></text>
    </answer>
    <answer fraction="0" format="html">
      <text><![CDATA[128]]></text>
    </answer>
  </question>
</quiz>`
    const blob = new Blob([sampleMoodleXML], { type: 'application/xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Template_Import_Soal_Moodle.xml'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // 4. Unduh Template JSON (.json) - Memuat 4 Tipe Soal Lengkap
  const handleDownloadJSONTemplate = () => {
    const sampleJSON = [
      {
        question_type: 'multiple_choice',
        question_text: 'Berapakah hasil dari $2^3 \\times 2^2$?',
        max_score: 1,
        explanation: 'Sifat eksponen: $a^m \\times a^n = a^{m+n}$, maka $2^{3+2} = 2^5 = 32$.',
        options: [
          { key: 'A', text: '16' },
          { key: 'B', text: '32' },
          { key: 'C', text: '64' },
          { key: 'D', text: '128' }
        ],
        correct_option: 'B',
        correct_answers: ['B']
      },
      {
        question_type: 'complex_multiple_choice',
        question_text: 'Manakah di antara bilangan berikut yang merupakan bilangan prima?',
        max_score: 2,
        explanation: '2 dan 7 adalah bilangan prima karena hanya bisa dibagi 1 dan dirinya sendiri.',
        options: [
          { key: 'A', text: '2' },
          { key: 'B', text: '4' },
          { key: 'C', text: '7' },
          { key: 'D', text: '9' }
        ],
        correct_option: 'A,C',
        correct_answers: ['A', 'C']
      },
      {
        question_type: 'true_false_matrix',
        question_text: 'Tentukan kebenaran dari pernyataan trigonometri berikut:',
        max_score: 2,
        explanation: '$\\sin 90^\\circ = 1$ (Benar) dan $\\cos 0^\\circ = 1$ (Pernyataan senilai 0 adalah Salah).',
        options: [
          { id: '1', text: 'Nilai dari $\\sin 90^\\circ$ adalah 1', correct_val: 'Benar' },
          { id: '2', text: 'Nilai dari $\\cos 0^\\circ$ adalah 0', correct_val: 'Salah' }
        ],
        correct_option: 'MATRIX',
        correct_answers: { '1': 'Benar', '2': 'Salah' }
      },
      {
        question_type: 'essay',
        question_text: 'Jelaskan mengapa fotosintesis sangat penting bagi keberlangsungan ekosistem di bumi!',
        max_score: 5,
        explanation: 'Rubrik: Penghasil O2 (2 Poin), Penyerap CO2 (2 Poin), Produsen Rantai Makanan (1 Poin)',
        options: [],
        correct_option: 'ESSAY',
        correct_answers: null
      }
    ]
    const blob = new Blob([JSON.stringify(sampleJSON, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Template_Import_Soal_Lengkap_TKA.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // -------------------------------------------------------------
  // PARSER HELPER UNTUK AIKEN, MOODLE, EXCEL, JSON
  // -------------------------------------------------------------

  const parseAikenText = (text: string) => {
    const lines = text.split(/\r?\n/)
    const questions: any[] = []
    let currentQText: string[] = []
    let currentOptions: { key: string; text: string }[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const optMatch = line.match(/^([A-Z])[\.\)]\s*(.*)$/)
      const ansMatch = line.match(/^ANSWER:\s*([A-Z])$/i)

      if (ansMatch) {
        const key = ansMatch[1].toUpperCase()
        if (currentQText.length > 0 && currentOptions.length > 0) {
          questions.push({
            question_type: 'multiple_choice',
            question_text: currentQText.join(' '),
            max_score: 1,
            explanation: null,
            options: currentOptions,
            correct_option: key,
            correct_answers: [key],
          })
        }
        currentQText = []
        currentOptions = []
      } else if (optMatch) {
        currentOptions.push({
          key: optMatch[1].toUpperCase(),
          text: optMatch[2],
        })
      } else {
        currentQText.push(line)
      }
    }

    return questions
  }

  const parseMoodleXML = (xmlText: string) => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    const questionNodes = xmlDoc.querySelectorAll('question')
    const questions: any[] = []

    questionNodes.forEach((node) => {
      const qType = node.getAttribute('type')
      if (qType === 'category') return

      const qTextNode = node.querySelector('questiontext text')
      const qText = qTextNode ? qTextNode.textContent || '' : ''

      const feedbackNode = node.querySelector('generalfeedback text')
      const explanation = feedbackNode ? feedbackNode.textContent || '' : null

      const gradeNode = node.querySelector('defaultgrade')
      const maxScore = gradeNode ? parseFloat(gradeNode.textContent || '1') : 1

      if (qType === 'essay') {
        if (qText) {
          questions.push({
            question_type: 'essay',
            question_text: qText,
            max_score: maxScore,
            explanation: explanation,
            options: [],
            correct_option: 'ESSAY',
            correct_answers: null,
          })
        }
        return
      }

      const answerNodes = node.querySelectorAll('answer')
      const options: { key: string; text: string }[] = []
      const correctAnswers: string[] = []

      answerNodes.forEach((ansNode, index) => {
        const key = String.fromCharCode(65 + index)
        const textNode = ansNode.querySelector('text')
        const optText = textNode ? textNode.textContent || '' : ''
        const fraction = parseFloat(ansNode.getAttribute('fraction') || '0')

        options.push({ key, text: optText })
        if (fraction > 0) {
          correctAnswers.push(key)
        }
      })

      if (qText) {
        const isComplex = correctAnswers.length > 1
        questions.push({
          question_type: isComplex ? 'complex_multiple_choice' : 'multiple_choice',
          question_text: qText,
          max_score: maxScore,
          explanation: explanation,
          options: options,
          correct_option: correctAnswers.join(',').slice(0, 10),
          correct_answers: correctAnswers,
        })
      }
    })

    return questions
  }

  // -------------------------------------------------------------
  // HANDLER PEMBACAAN FILE UTAMA
  // -------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    setParsedQuestions([])
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()

    if (fileExt === 'json') {
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string)
          if (!Array.isArray(parsed)) throw new Error('Format JSON harus berupa Array [...]')
          setParsedQuestions(parsed)
        } catch (err: any) {
          setErrorMsg(`Gagal membaca file JSON: ${err.message}`)
        }
      }
      reader.readAsText(file)
    } else if (fileExt === 'txt') {
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          const parsed = parseAikenText(text)
          if (parsed.length === 0) {
            throw new Error('Tidak terdeteksi soal format Aiken yang valid. Pastikan ada baris "ANSWER: X".')
          }
          setParsedQuestions(parsed)
        } catch (err: any) {
          setErrorMsg(`Gagal membaca file Aiken (.txt): ${err.message}`)
        }
      }
      reader.readAsText(file)
    } else if (fileExt === 'xml') {
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          const parsed = parseMoodleXML(text)
          if (parsed.length === 0) {
            throw new Error('Tidak terdeteksi tag <question> Moodle XML yang valid.')
          }
          setParsedQuestions(parsed)
        } catch (err: any) {
          setErrorMsg(`Gagal membaca file Moodle XML (.xml): ${err.message}`)
        }
      }
      reader.readAsText(file)
    } else if (['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet)

          if (rawRows.length === 0) {
            throw new Error('File Excel tidak memuat data soal.')
          }

          const formattedQuestions = rawRows.map((row, idx) => {
            const rawType = String(row.question_type || '').toLowerCase().trim()

            if (!row.question_text) {
              throw new Error(`Baris ke-${idx + 2} tidak memiliki teks soal (question_text).`)
            }

            const isEssay = rawType.includes('essay') || rawType.includes('uraian') || rawType.includes('esai')
            const isMatrix = rawType.includes('matrix') || rawType.includes('matriks') || rawType.includes('true_false')

            if (isEssay) {
              // Parse Soal Essay dari Excel
              return {
                question_type: 'essay',
                question_text: String(row.question_text),
                max_score: Number(row.max_score) || 5,
                explanation: row.explanation ? String(row.explanation) : null,
                options: [],
                correct_option: 'ESSAY',
                correct_answers: null,
              }
            } else if (isMatrix) {
              // Parse Soal Matriks dari Excel
              const statements: any[] = []
              const answerObj: { [key: string]: string } = {}

              for (let i = 1; i <= 10; i++) {
                const stText = row[`statement_${i}`]
                const stKey = row[`statement_${i}_key`] || 'Benar'
                if (stText) {
                  const stId = String(i)
                  statements.push({ id: stId, text: String(stText) })
                  answerObj[stId] = String(stKey).trim()
                }
              }

              if (statements.length === 0) {
                const keys = ['A', 'B', 'C', 'D']
                keys.forEach((k, index) => {
                  const optText = row[`option_${k}`]
                  if (optText) {
                    const stId = String(index + 1)
                    statements.push({ id: stId, text: String(optText) })
                    answerObj[stId] = 'Benar'
                  }
                })
              }

              return {
                question_type: 'true_false_matrix',
                question_text: String(row.question_text),
                max_score: Number(row.max_score) || 1,
                explanation: row.explanation ? String(row.explanation) : null,
                options: statements,
                correct_option: 'MATRIX',
                correct_answers: answerObj,
              }
            } else {
              // Parse Soal PG & PG Kompleks dari Excel
              const isComplex = rawType.includes('complex') || rawType.includes('kompleks')

              const options = [
                { key: 'A', text: String(row.option_A || '') },
                { key: 'B', text: String(row.option_B || '') },
                { key: 'C', text: String(row.option_C || '') },
                { key: 'D', text: String(row.option_D || '') },
              ].filter((opt) => opt.text.trim() !== '')

              const rawCorrect = String(row.correct_option || 'A')
                .replace(/\s+/g, '')
                .toUpperCase()
              const correctAnswers = rawCorrect.split(',').filter(Boolean)

              return {
                question_type: isComplex ? 'complex_multiple_choice' : 'multiple_choice',
                question_text: String(row.question_text),
                max_score: Number(row.max_score) || 1,
                explanation: row.explanation ? String(row.explanation) : null,
                options: options,
                correct_option: rawCorrect.slice(0, 10),
                correct_answers: correctAnswers,
              }
            }
          })

          setParsedQuestions(formattedQuestions)
        } catch (err: any) {
          setErrorMsg(`Gagal membaca file Excel: ${err.message}`)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      setErrorMsg('Format file tidak didukung. Harap unggah file .xlsx, .csv, .txt, .xml, atau .json.')
    }
  }

  // -------------------------------------------------------------
  // SIMPAN BATCH KE DATABASE SUPABASE
  // -------------------------------------------------------------
  const handleUploadBatch = async () => {
    if (parsedQuestions.length === 0 || !examId) return
    setIsUploading(true)
    setErrorMsg(null)

    const supabase = createClient()

    const recordsToInsert = parsedQuestions.map((q) => {
      let finalCorrectOption = String(q.correct_option || 'A').trim()
      if (q.question_type === 'true_false_matrix') {
        finalCorrectOption = 'MATRIX'
      } else if (q.question_type === 'essay') {
        finalCorrectOption = 'ESSAY'
      } else {
        finalCorrectOption = finalCorrectOption.replace(/\s+/g, '').slice(0, 10)
      }

      return {
        exam_id: examId,
        question_type: q.question_type || 'multiple_choice',
        question_text: q.question_text,
        image_url: q.image_url || null,
        max_score: Number(q.max_score) || 1,
        explanation: q.explanation || null,
        options: q.options || [],
        correct_option: finalCorrectOption,
        correct_answers: q.correct_answers || (q.question_type === 'essay' ? null : [finalCorrectOption]),
      }
    })

    const { error } = await supabase.from('questions').insert(recordsToInsert)

    if (error) {
      setErrorMsg(`Gagal mengunggah ke database: ${error.message}`)
      setIsUploading(false)
    } else {
      setIsUploading(false)
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <span>📥</span>
            <span>Import Soal Massal (Excel / Aiken / Moodle XML / JSON)</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm"
            suppressHydrationWarning
          >
            ✕
          </button>
        </div>

        {/* Pilihan Unduh Template Contoh */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
          <p className="font-bold text-slate-700">📄 Unduh Contoh Template Format File:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors text-left flex items-center space-x-1"
              suppressHydrationWarning
            >
              <span>📊</span>
              <span>Template Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAikenTemplate}
              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-[11px] transition-colors text-left flex items-center space-x-1"
              suppressHydrationWarning
            >
              <span>📝</span>
              <span>Template Aiken (.txt)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMoodleXMLTemplate}
              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition-colors text-left flex items-center space-x-1"
              suppressHydrationWarning
            >
              <span>🎓</span>
              <span>Template Moodle (.xml)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJSONTemplate}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] transition-colors text-left flex items-center space-x-1"
              suppressHydrationWarning
            >
              <span>⚙️</span>
              <span>Template JSON (.json)</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Input Pilih File */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Pilih File Soal (.xlsx / .txt / .xml / .json)
          </label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv, .txt, .xml, .json"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border rounded-xl p-1"
            suppressHydrationWarning
          />
        </div>

        {/* Status Preview */}
        {parsedQuestions.length > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
            ✓ Terdeteksi <strong>{parsedQuestions.length}</strong> butir soal siap di-import dari file <em>{fileName}</em>.
          </div>
        )}

        <div className="flex space-x-2 pt-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            suppressHydrationWarning
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUploadBatch}
            disabled={isUploading || parsedQuestions.length === 0}
            className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
            suppressHydrationWarning
          >
            {isUploading ? 'Mengunggah...' : `Import ${parsedQuestions.length} Soal →`}
          </button>
        </div>
      </div>
    </div>
  )
}