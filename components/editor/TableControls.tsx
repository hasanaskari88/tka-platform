'use client'

import type { Editor } from '@tiptap/react'

interface TableControlsProps {
  editor: Editor | null
}

export default function TableControls({ editor }: TableControlsProps) {
  if (!editor || !editor.isActive('table')) return null

  const buttonClass =
    'rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100'

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 p-2">
      <span className="mr-1 text-xs font-semibold text-slate-500">
        TABEL
      </span>

      <button
        type="button"
        className={buttonClass}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        + Baris
      </button>

      <button
        type="button"
        className={buttonClass}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        + Kolom
      </button>

      <button
        type="button"
        className={buttonClass}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        Hapus Baris
      </button>

      <button
        type="button"
        className={buttonClass}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        Hapus Kolom
      </button>

      <button
        type="button"
        className="rounded border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        Hapus Tabel
      </button>
    </div>
  )
}