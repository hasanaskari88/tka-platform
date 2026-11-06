
'use client'

import { useState } from 'react'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

import MathFormulaDialog from './MathFormulaDialog'
import ImageDialog from './ImageDialog'
import TableControls from './TableControls'

interface EditorToolbarProps {
  editor: Editor | null
}

const buttonClass =
  'rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40'

const activeClass = 'border-blue-300 bg-blue-50 text-blue-700'

const fontOptions = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Font Arab', value: 'Noto Naskh Arabic' },
  { label: 'Aksara Jawa', value: 'Noto Sans Javanese' },
]

const sizeOptions = [
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  '28px',
  '32px',
]

const alignments = [
  { value: 'left', label: '≡ Kiri', title: 'Rata kiri' },
  { value: 'center', label: '≡ Tengah', title: 'Rata tengah' },
  { value: 'right', label: '≡ Kanan', title: 'Rata kanan' },
  { value: 'justify', label: '☰ Rata', title: 'Rata kiri-kanan' },
] as const

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const [imageOpen, setImageOpen] = useState(false)

  // Memantau perubahan format sesuai posisi kursor atau teks terpilih.
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null

      const textStyle = editor.getAttributes('textStyle')
      const highlight = editor.getAttributes('highlight')

      const paragraph = editor.getAttributes('paragraph')
      const heading = editor.getAttributes('heading')

      return {
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        underline: editor.isActive('underline'),
        strike: editor.isActive('strike'),
        superscript: editor.isActive('superscript'),
        subscript: editor.isActive('subscript'),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        heading: editor.isActive('heading', { level: 2 })
          ? 'h2'
          : editor.isActive('heading', { level: 3 })
            ? 'h3'
            : 'p',
        alignment:
          paragraph.textAlign || heading.textAlign || 'left',
        fontFamily: textStyle.fontFamily || '',
        fontSize: textStyle.fontSize || '',
        color: textStyle.color || '#000000',
        highlightColor: highlight.color || '#ffff00',
      }
    },
  })

  if (!editor) {
    return (
      <div className="border-b border-slate-200 p-3 text-sm text-slate-400">
        Menyiapkan toolbar...
      </div>
    )
  }

  const current = state

  const runAlignment = (
    alignment: 'left' | 'center' | 'right' | 'justify',
  ) => {
    editor.chain().focus().setTextAlign(alignment).run()
  }

  const addTable = () => {
    editor.chain().focus().insertTable({
      rows: 3,
      cols: 3,
      withHeaderRow: true,
    }).run()
  }

  return (
    <>
      <div className="space-y-2 border-b border-slate-200 bg-slate-50 p-3">

        {/* BARIS 1: FORMAT TEKS */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            title="Tebal"
            className={`${buttonClass} font-bold ${current?.bold ? activeClass : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>

          <button
            type="button"
            title="Miring"
            className={`${buttonClass} italic ${current?.italic ? activeClass : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </button>

          <button
            type="button"
            title="Garis bawah"
            className={`${buttonClass} underline ${current?.underline ? activeClass : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            U
          </button>

          <button
            type="button"
            title="Coret"
            className={`${buttonClass} line-through ${current?.strike ? activeClass : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            S
          </button>

          <span className="mx-1 h-6 border-l border-slate-300" />

          <button
            type="button"
            title="Pangkat"
            className={`${buttonClass} ${current?.superscript ? activeClass : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            x²
          </button>

          <button
            type="button"
            title="Indeks bawah"
            className={`${buttonClass} ${current?.subscript ? activeClass : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            x₂
          </button>

          <select
            aria-label="Jenis paragraf"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
            value={current?.heading || 'p'}
            onChange={(e) => {
              if (e.target.value === 'p') {
                editor.chain().focus().setParagraph().run()
              } else {
                editor.chain().focus().setHeading({
                  level: e.target.value === 'h2' ? 2 : 3,
                }).run()
              }
            }}
          >
            <option value="p">Paragraf</option>
            <option value="h2">Judul besar</option>
            <option value="h3">Judul kecil</option>
          </select>
        </div>

        {/* BARIS 2: FONT DAN WARNA */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            aria-label="Jenis huruf"
            className="max-w-44 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
            value={current?.fontFamily || ''}
            onChange={(e) => {
              const value = e.target.value
              const chain = editor.chain().focus()

              if (value) {
                chain.setFontFamily(value).run()
              } else {
                chain.unsetFontFamily().run()
              }
            }}
          >
            {fontOptions.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Ukuran huruf"
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
            value={current?.fontSize || ''}
            onChange={(e) => {
              const value = e.target.value
              const chain = editor.chain().focus()

              if (value) {
                chain.setFontSize(value).run()
              } else {
                chain.unsetFontSize().run()
              }
            }}
          >
            <option value="">Ukuran</option>
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size.replace('px', '')}
              </option>
            ))}
          </select>

          <label
            title="Warna tulisan"
            className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <span>A</span>
            <input
              type="color"
              aria-label="Warna tulisan"
              value={current?.color || '#000000'}
              className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
              onChange={(e) =>
                editor.chain().focus().setColor(e.target.value).run()
              }
            />
          </label>

          <label
            title="Warna sorotan"
            className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <span className="bg-yellow-200 px-1">Sorot</span>
            <input
              type="color"
              aria-label="Warna sorotan"
              value={current?.highlightColor || '#ffff00'}
              className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
              onChange={(e) =>
                editor.chain().focus().setHighlight({
                  color: e.target.value,
                }).run()
              }
            />
          </label>
        </div>

        {/* BARIS 3: PERATAAN, DAFTAR, DAN SISIPAN */}
        <div className="flex flex-wrap items-center gap-1.5">
          {alignments.map((item) => (
            <button
              key={item.value}
              type="button"
              title={item.title}
              className={`${buttonClass} ${
                current?.alignment === item.value ? activeClass : ''
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAlignment(item.value)}
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            title="Daftar berpoin"
            className={`${buttonClass} ${current?.bulletList ? activeClass : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • Daftar
          </button>

          <button
            type="button"
            title="Daftar bernomor"
            className={`${buttonClass} ${current?.orderedList ? activeClass : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. Daftar
          </button>

          <button
            type="button"
            title="Sisipkan tabel"
            className={buttonClass}
            onMouseDown={(e) => e.preventDefault()}
            onClick={addTable}
          >
            ▦ Tabel
          </button>

          <button
            type="button"
            title="Sisipkan gambar"
            className={buttonClass}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setImageOpen(true)}
          >
            ▧ Gambar
          </button>

          <MathFormulaDialog editor={editor} />
        </div>

        {/* BARIS 4: RIWAYAT */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            title="Urungkan"
            className={buttonClass}
            disabled={!editor.can().undo()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶ Urungkan
          </button>

          <button
            type="button"
            title="Ulangi"
            className={buttonClass}
            disabled={!editor.can().redo()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷ Ulangi
          </button>
        </div>
      </div>

      <TableControls editor={editor} />

      <ImageDialog
        editor={editor}
        open={imageOpen}
        onClose={() => setImageOpen(false)}
      />
    </>
  )
}
