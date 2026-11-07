
'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'

import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Highlight from '@tiptap/extension-highlight'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Mathematics from '@tiptap/extension-mathematics'
import { TextStyle } from '@tiptap/extension-text-style'

import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from '@tiptap/extension-table'

import EditorToolbar from './EditorToolbar'
import { FontSize } from './FontSize'
import ResizableImage from './ResizableImage'
import Underline from '@tiptap/extension-underline'

import 'katex/dist/katex.min.css'
import './editor.css'

interface RichTextEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export default function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Tuliskan teks di sini...',
  editable = true,
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,

      TextStyle,
      FontSize,
      Color,
      FontFamily,

      Highlight.configure({
        multicolor: true,
      }),

      Superscript,
      Subscript,

      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),

      ResizableImage,

      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),

      TableRow,
      TableHeader,
      TableCell,

      Mathematics.configure({
        inlineOptions: {
          onClick: (node, pos) => {
            window.dispatchEvent(
              new CustomEvent('tiptap-math-edit', {
                detail: {
                  latex: String(node.attrs.latex ?? ''),
                  pos,
                  displayMode: false,
                },
              }),
            )
          },
        },
        blockOptions: {
          onClick: (node, pos) => {
            window.dispatchEvent(
              new CustomEvent('tiptap-math-edit', {
                detail: {
                  latex: String(node.attrs.latex ?? ''),
                  pos,
                  displayMode: true,
                },
              }),
            )
          },
        },
        katexOptions: {
          throwOnError: false,
          strict: 'ignore',
        },
      }),
    ],

    content,
    immediatelyRender: false,
    editable,

    editorProps: {
      attributes: {
        class:
          'editor-content min-h-[220px] w-full p-4 outline-none text-slate-800 leading-relaxed',
        'data-placeholder': placeholder,
        spellcheck: 'true',
      },
    },

    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return

    const currentContent = editor.getHTML()

    if (content !== currentContent) {
      editor.commands.setContent(content || '', {
        emitUpdate: false,
      })
    }
  }, [content, editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  return (
    <div
      className={`rich-text-editor overflow-hidden rounded-xl border border-slate-300 bg-white ${className}`}
    >
      {editable && <EditorToolbar editor={editor} />}

      <EditorContent editor={editor} />
    </div>
  )
}
