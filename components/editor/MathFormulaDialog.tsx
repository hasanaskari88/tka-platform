'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import katex from 'katex'

type FormulaType =
  | 'fraction'
  | 'mixed'
  | 'power'
  | 'subscript'
  | 'root'
  | 'symbol'
  | 'equation'
  | 'matrix'

interface MathFormulaDialogProps {
  editor: Editor
}

interface EditMathDetail {
  latex: string
  pos: number
  displayMode: boolean
}

const symbolOptions = [
  { label: '×', value: '\\times' },
  { label: '÷', value: '\\div' },
  { label: '±', value: '\\pm' },
  { label: '≠', value: '\\neq' },
  { label: '≤', value: '\\leq' },
  { label: '≥', value: '\\geq' },
  { label: 'π', value: '\\pi' },
  { label: '°', value: '^{\\circ}' },
  { label: '∞', value: '\\infty' },
  { label: '∑', value: '\\sum' },
  { label: '√', value: '\\sqrt{}' },
  { label: 'α', value: '\\alpha' },
  { label: 'β', value: '\\beta' },
  { label: 'θ', value: '\\theta' },
]

const operatorOptions = [
  { label: '+', value: '+' },
  { label: '−', value: '-' },
  { label: '×', value: '\\times' },
  { label: '÷', value: '\\div' },
]

function parseFormula(latex: string): {
  type: FormulaType
  values: string[]
  symbol?: string
  operator?: string
} | null {
  let match: RegExpMatchArray | null

  match = latex.match(/^\\frac\{([^{}]*)\}\{([^{}]*)\}$/)
  if (match) return { type: 'fraction', values: [match[1], match[2]] }

  match = latex.match(/^([^\\{}]+)\\frac\{([^{}]*)\}\{([^{}]*)\}$/)
  if (match) return { type: 'mixed', values: [match[1], match[2], match[3]] }

  match = latex.match(/^(.+?)\^\{([^{}]*)\}$/)
  if (match) return { type: 'power', values: [match[1], match[2]] }

  match = latex.match(/^(.+?)_\{([^{}]*)\}$/)
  if (match) return { type: 'subscript', values: [match[1], match[2]] }

  match = latex.match(/^\\sqrt\{([^{}]*)\}$/)
  if (match) return { type: 'root', values: [match[1]] }

  const foundSymbol = symbolOptions.find((item) => item.value === latex)
  if (foundSymbol) {
    return { type: 'symbol', values: [], symbol: foundSymbol.value }
  }

  match = latex.match(/^(.+?)\s*(\\times|\\div|\+|-)\s*(.+?)\s*=\s*(.+)$/)
  if (match) {
    return {
      type: 'equation',
      values: [match[1].trim(), match[3].trim(), match[4].trim()],
      operator: match[2],
    }
  }

  match = latex.match(/^\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}$/)
  if (match) {
    const cells = match[1].split('\\\\').flatMap((row) => row.split('&'))
    if (cells.length === 4) {
      return { type: 'matrix', values: cells.map((cell) => cell.trim()) }
    }
  }

  return null
}

export default function MathFormulaDialog({
  editor,
}: MathFormulaDialogProps) {
  const [open, setOpen] = useState(false)
  const [formulaType, setFormulaType] = useState<FormulaType>('fraction')
  const [a, setA] = useState('1')
  const [b, setB] = useState('2')
  const [c, setC] = useState('3')
  const [d, setD] = useState('4')
  const [symbol, setSymbol] = useState('\\times')
  const [operator, setOperator] = useState('+')
  const [displayMode, setDisplayMode] = useState(false)
  const [editTarget, setEditTarget] = useState<EditMathDetail | null>(null)
  const [unsupportedFormula, setUnsupportedFormula] = useState(false)

  useEffect(() => {
    const handleEdit = (event: Event) => {
      const customEvent = event as CustomEvent<EditMathDetail>
      const detail = customEvent.detail
      if (!detail) return

      const parsed = parseFormula(detail.latex)

      setEditTarget(detail)
      setDisplayMode(detail.displayMode)
      setUnsupportedFormula(!parsed)

      if (parsed) {
        setFormulaType(parsed.type)
        setA(parsed.values[0] ?? '')
        setB(parsed.values[1] ?? '')
        setC(parsed.values[2] ?? '')
        setD(parsed.values[3] ?? '')
        setSymbol(parsed.symbol ?? '\\times')
        setOperator(parsed.operator ?? '+')
      } else {
        setFormulaType('fraction')
        setA('')
        setB('')
        setC('')
        setD('')
      }

      setOpen(true)
    }

    window.addEventListener('tiptap-math-edit', handleEdit)
    return () => window.removeEventListener('tiptap-math-edit', handleEdit)
  }, [])

  const buildFormula = () => {
    switch (formulaType) {
      case 'fraction':
        return `\\frac{${a}}{${b}}`

      case 'mixed':
        return `${a}\\frac{${b}}{${c}}`

      case 'power':
        return `${a}^{${b}}`

      case 'subscript':
        return `${a}_{${b}}`

      case 'root':
        return `\\sqrt{${a}}`

      case 'symbol':
        return symbol

      case 'equation':
        return `${a} ${operator} ${b} = ${c}`

      case 'matrix':
        return `\\begin{bmatrix}${a} & ${b} \\\\ ${c} & ${d}\\end{bmatrix}`

      default:
        return ''
    }
  }

  const latex = buildFormula()

  const preview = useMemo(() => {
    try {
      return katex.renderToString(latex || '\\square', {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
        trust: false,
      })
    } catch {
      return '<span>Pratinjau rumus tidak tersedia</span>'
    }
  }, [latex])

  const resetDialog = () => {
    setOpen(false)
    setEditTarget(null)
    setUnsupportedFormula(false)
    setFormulaType('fraction')
    setA('1')
    setB('2')
    setC('3')
    setD('4')
    setSymbol('\\times')
    setOperator('+')
    setDisplayMode(false)
  }

  const insertFormula = () => {
    if (!latex.trim()) return

    if (editTarget) {
      if (editTarget.displayMode) {
        editor.commands.updateBlockMath({
          latex,
          pos: editTarget.pos,
        })
      } else {
        editor.commands.updateInlineMath({
          latex,
          pos: editTarget.pos,
        })
      }
    } else if (displayMode) {
      editor.chain().focus().insertBlockMath({ latex }).run()
    } else {
      editor.chain().focus().insertInlineMath({ latex }).run()
    }

    resetDialog()
  }

  const fieldClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  const labelClass = 'mb-1 block text-sm font-medium text-slate-700'

  const renderInput = (
    label: string,
    value: string,
    setter: (value: string) => void,
  ) => (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        className={fieldClass}
        value={value}
        onChange={(event) => setter(event.target.value)}
        placeholder="Masukkan angka atau simbol"
      />
    </label>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEditTarget(null)
          setUnsupportedFormula(false)
          setOpen(true)
        }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        ∑ Rumus Matematika
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editTarget ? 'Edit Rumus Matematika' : 'Buat Rumus Matematika'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Pilih bentuk rumus, lalu isi bagian yang tersedia.
                </p>
              </div>
              <button
                type="button"
                onClick={resetDialog}
                className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                aria-label="Tutup dialog"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className={labelClass}>Jenis rumus</label>
                <select
                  className={fieldClass}
                  value={formulaType}
                  onChange={(event) => {
                    setFormulaType(event.target.value as FormulaType)
                    setUnsupportedFormula(false)
                  }}
                >
                  <option value="fraction">Pecahan</option>
                  <option value="mixed">Pecahan campuran</option>
                  <option value="power">Pangkat</option>
                  <option value="subscript">Indeks bawah</option>
                  <option value="root">Akar kuadrat</option>
                  <option value="symbol">Simbol matematika</option>
                  <option value="equation">Persamaan</option>
                  <option value="matrix">Matriks 2 × 2</option>
                </select>
              </div>

              {unsupportedFormula && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  Rumus yang dipilih belum dikenali sebagai salah satu bentuk
                  visual yang tersedia. Pratinjau tetap ditampilkan, tetapi
                  untuk mengubahnya pilih salah satu jenis rumus dan isi ulang
                  bagian-bagiannya.
                </div>
              )}

              {formulaType === 'fraction' && (
                <div className="mx-auto grid max-w-xs grid-cols-1 gap-2">
                  {renderInput('Pembilang', a, setA)}
                  <div className="h-0.5 bg-slate-700" />
                  {renderInput('Penyebut', b, setB)}
                </div>
              )}

              {formulaType === 'mixed' && (
                <div className="grid grid-cols-3 gap-3">
                  {renderInput('Bilangan bulat', a, setA)}
                  {renderInput('Pembilang', b, setB)}
                  {renderInput('Penyebut', c, setC)}
                </div>
              )}

              {formulaType === 'power' && (
                <div className="grid grid-cols-2 gap-3">
                  {renderInput('Bilangan pokok', a, setA)}
                  {renderInput('Pangkat', b, setB)}
                </div>
              )}

              {formulaType === 'subscript' && (
                <div className="grid grid-cols-2 gap-3">
                  {renderInput('Simbol utama', a, setA)}
                  {renderInput('Indeks bawah', b, setB)}
                </div>
              )}

              {formulaType === 'root' && renderInput('Bilangan di dalam akar', a, setA)}

              {formulaType === 'symbol' && (
                <div className="grid grid-cols-4 gap-2">
                  {symbolOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSymbol(item.value)}
                      className={`rounded-lg border px-3 py-3 text-xl ${
                        symbol === item.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {formulaType === 'equation' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {renderInput('Bilangan pertama', a, setA)}
                    <label className="block">
                      <span className={labelClass}>Operasi</span>
                      <select
                        className={fieldClass}
                        value={operator}
                        onChange={(event) => setOperator(event.target.value)}
                      >
                        {operatorOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {renderInput('Bilangan kedua', b, setB)}
                  </div>
                  {renderInput('Hasil', c, setC)}
                </div>
              )}

              {formulaType === 'matrix' && (
                <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
                  {renderInput('Baris 1, kolom 1', a, setA)}
                  {renderInput('Baris 1, kolom 2', b, setB)}
                  {renderInput('Baris 2, kolom 1', c, setC)}
                  {renderInput('Baris 2, kolom 2', d, setD)}
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className={labelClass}>Pratinjau rumus</span>
                  <span className="text-xs text-slate-400">Diperbarui otomatis</span>
                </div>
                <div
                  className="flex min-h-24 items-center justify-center overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              </div>

              {!editTarget && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={displayMode}
                    onChange={(event) => setDisplayMode(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Tampilkan sebagai rumus terpisah di tengah
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={resetDialog}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={insertFormula}
                disabled={unsupportedFormula || !latex.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editTarget ? 'Simpan Perubahan' : 'Masukkan Rumus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}