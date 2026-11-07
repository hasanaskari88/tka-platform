
'use client'

import { useEffect, useId } from 'react'
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

function escapeMathAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/\"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeMathText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Ubah rumus format lama menjadi node matematika Tiptap saat dibuka di editor. */
function prepareEditorContent(value: string): string {
  return value.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, (_match, blockLatex, inlineLatex) => {
    const isBlock = blockLatex !== undefined
    const latex = String(isBlock ? blockLatex : inlineLatex).trim()
    const tag = isBlock ? 'div' : 'span'
    const type = isBlock ? 'block-math' : 'inline-math'
    return '<' + tag + ' data-type=\"' + type + '\" data-latex=\"' + escapeMathAttribute(latex) + '\">' + escapeMathText(latex) + '</' + tag + '>'
  })
}
interface RichTextEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  minHeight?: number
}

export default function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Tuliskan teks di sini...',
  editable = true,
  className = '',
  minHeight = 220,
}: RichTextEditorProps) {
  const editorId = useId()
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
                  editorId,
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
                  editorId,
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

    content: prepareEditorContent(content),
    immediatelyRender: false,
    editable,

    editorProps: {
      attributes: {
        class:
          'editor-content w-full p-4 outline-none text-slate-800 leading-relaxed',
        style: `min-height: ${minHeight}px`,
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

    const preparedContent = prepareEditorContent(content || '')
    const currentContent = editor.getHTML()

    if (preparedContent !== currentContent) {
      editor.commands.setContent(preparedContent, {
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
      {editable && <EditorToolbar editor={editor} editorId={editorId} />}

      <EditorContent editor={editor} />
    </div>
  )
}
