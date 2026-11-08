
'use client'

import { useEffect, useId } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'

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

import 'katex/dist/katex.min.css'
import './editor.css'

function escapeMathAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
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

function ommlNodeToLatex(node: Element): string {
  const name = (node.localName || node.tagName).toLowerCase().split(':').pop() || ''
  const children = Array.from(node.children)
  const child = (wanted: string) => children.find((item) =>
    ((item.localName || item.tagName).toLowerCase().split(':').pop() || '') === wanted.toLowerCase()
  )
  const content = (element?: Element | null) =>
    element ? Array.from(element.children).map(ommlNodeToLatex).join('') || element.textContent || '' : ''
  const all = () => children.map(ommlNodeToLatex).join('')

  if (name === 't') return node.textContent || ''
  if (name === 'r') return Array.from(node.getElementsByTagName('*')).filter((item) =>
    ((item.localName || item.tagName).toLowerCase().split(':').pop() || '') === 't'
  ).map((item) => item.textContent || '').join('')
  if (['omath', 'omathpara', 'e', 'num', 'den', 'sup', 'sub', 'fname'].includes(name)) return all()
  if (name === 'f') return String.raw`\frac{${content(child('num'))}}{${content(child('den'))}}`
  if (name === 'ssup') return `{${content(child('e'))}}^{${content(child('sup'))}}`
  if (name === 'ssub') return `{${content(child('e'))}}_{${content(child('sub'))}}`
  if (name === 'ssubsup') return `{${content(child('e'))}}_{${content(child('sub'))}}^{${content(child('sup'))}}`
  if (name === 'rad') {
    const degree = content(child('deg'))
    const base = content(child('e'))
    return degree ? String.raw`\sqrt[${degree}]{${base}}` : String.raw`\sqrt{${base}}`
  }
  if (name === 'nary') {
    const properties = child('naryPr')
    const chrNode = properties ? Array.from(properties.getElementsByTagName('*')).find((item) =>
      ((item.localName || item.tagName).toLowerCase().split(':').pop() || '') === 'chr'
    ) : undefined
    const symbol = chrNode?.getAttribute('val') || '∑'
    const command = symbol === '∫' ? String.raw`\int` : symbol === '∏' ? String.raw`\prod` : String.raw`\sum`
    const lower = content(child('sub'))
    const upper = content(child('sup'))
    return `${command}${lower ? `_{${lower}}` : ''}${upper ? `^{${upper}}` : ''} ${content(child('e'))}`
  }
  if (name === 'd') {
    const properties = child('dPr')
    const propertyNodes = properties ? Array.from(properties.getElementsByTagName('*')) : []
    const begin = propertyNodes.find((item) => ((item.localName || item.tagName).toLowerCase().split(':').pop() || '') === 'begChr')
    const end = propertyNodes.find((item) => ((item.localName || item.tagName).toLowerCase().split(':').pop() || '') === 'endChr')
    return String.raw`\left${begin?.getAttribute('val') || '('}${content(child('e'))}\right${end?.getAttribute('val') || ')'}`
  }
  if (name === 'bar') return String.raw`\overline{${content(child('e'))}}`
  if (name === 'acc') return String.raw`\hat{${content(child('e'))}}`
  if (name === 'func') return `${content(child('fname'))}(${content(child('e'))})`
  return all() || node.textContent || ''
}

function convertWordMath(html: string): { html: string; converted: number } {
  const document = new window.DOMParser().parseFromString(html, 'text/html')
  let converted = 0
  const mathNodes = Array.from(document.body.querySelectorAll('*')).filter((node) => {
    const name = (node.localName || node.tagName).toLowerCase().split(':').pop() || ''
    return name === 'omath' || name === 'omathpara'
  })
  for (const node of mathNodes) {
    if (!node.parentNode) continue
    const latex = ommlNodeToLatex(node).trim()
    if (!latex) continue
    const block = (node.localName || node.tagName).toLowerCase().includes('omathpara')
    const replacement = document.createElement(block ? 'div' : 'span')
    replacement.setAttribute('data-type', block ? 'block-math' : 'inline-math')
    // setAttribute menerima nilai mentah; browser akan meng-escape saat serialisasi HTML.
    replacement.setAttribute('data-latex', latex)
    replacement.textContent = latex
    node.parentNode.replaceChild(replacement, node)
    converted += 1
  }
  return { html: document.body.innerHTML, converted }
}

async function uploadPastedImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file, file.name || 'gambar-word.png')
  const response = await fetch('/api/google-drive/upload', { method: 'POST', body: formData })
  const result = await response.json()
  if (!response.ok || !result.success || !result.file?.imageUrl) {
    throw new Error(result.error || 'Gagal menyimpan gambar hasil paste ke Google Drive.')
  }
  return result.file.imageUrl as string
}

function getClipboardImageFiles(clipboard: DataTransfer): File[] {
  const files: File[] = []
  const seen = new Set<string>()
  const add = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const key = [file.name, file.size, file.type, file.lastModified].join(':')
    if (seen.has(key)) return
    seen.add(key)
    files.push(file)
  }

  // Word/browser tidak selalu menandai gambar sebagai item; periksa items dan files.
  Array.from(clipboard.items || []).forEach((item) => {
    if (item.kind === 'file' && item.type.startsWith('image/')) add(item.getAsFile())
  })
  Array.from(clipboard.files || []).forEach(add)
  return files
}

type ExtractedRtfImage = { file: File; widthPx: number }

function extractRtfPngImages(rtf: string): ExtractedRtfImage[] {
  if (!rtf) return []
  type GroupFrame = {
    start: number
    isPicture: boolean
    format: string
    markerEnd: number
  }
  const stack: GroupFrame[] = []
  const pictures: Array<{ start: number; end: number; markerEnd: number; widthPx: number }> = []

  for (let i = 0; i < rtf.length; i += 1) {
    const char = rtf[i]
    if (char === '{') {
      stack.push({
        start: i,
        isPicture: false,
        format: '',
        markerEnd: 0,
      })
      continue
    }
    if (char === '}') {
      const frame = stack.pop()
      if (frame?.isPicture && frame.format === 'png' && frame.markerEnd > 0) {
        const group = rtf.slice(frame.start, i + 1)
        const widthMatch = group.match(/\\picwgoal(-?\d+)/i)
        const widthPx = widthMatch ? Math.max(16, Math.min(80, Math.round(Number(widthMatch[1]) / 15))) : 32
        pictures.push({ start: frame.start, end: i + 1, markerEnd: frame.markerEnd, widthPx })
      }
      continue
    }
    if (char !== '\\') continue

    const next = rtf[i + 1]
    if (!next) continue
    if (/[{}\\]/.test(next) || next === "'" || next === '*' || next === '~' || next === '-') {
      i += next === "'" ? 3 : 1
      continue
    }
    if (!/[a-zA-Z]/.test(next)) {
      i += 1
      continue
    }

    let end = i + 1
    while (end < rtf.length && /[a-zA-Z]/.test(rtf[end])) end += 1
    const word = rtf.slice(i + 1, end).toLowerCase()
    let numberEnd = end
    if (rtf[numberEnd] === '-') numberEnd += 1
    while (numberEnd < rtf.length && /[0-9]/.test(rtf[numberEnd])) numberEnd += 1
    if (rtf[numberEnd] === ' ') numberEnd += 1

    const frame = stack[stack.length - 1]
    if (frame && word === 'pict') frame.isPicture = true
    if (frame && word === 'pngblip') {
      frame.format = 'png'
      frame.markerEnd = numberEnd
    } else if (frame && (word === 'jpegblip' || word === 'jpgblip')) {
      frame.format = 'jpeg'
      frame.markerEnd = numberEnd
    }
    i = numberEnd - 1
  }

  const files: ExtractedRtfImage[] = []
  const seenPayloads = new Set<string>()
  pictures.forEach((picture) => {
    let hex = ''
    let depth = 0
    for (let i = picture.markerEnd; i < picture.end - 1; i += 1) {
      const char = rtf[i]
      if (char === '{') {
        depth += 1
        continue
      }
      if (char === '}') {
        if (depth > 0) depth -= 1
        continue
      }
      if (depth > 0) continue
      if (char === '\\') {
        const next = rtf[i + 1]
        if (next === "'") i += 3
        else if (next && /[a-zA-Z]/.test(next)) {
          i += 1
          while (i + 1 < picture.end && /[a-zA-Z]/.test(rtf[i + 1])) i += 1
          if (rtf[i + 1] === '-') i += 1
          while (i + 1 < picture.end && /[0-9]/.test(rtf[i + 1])) i += 1
          if (rtf[i + 1] === ' ') i += 1
        } else i += 1
        continue
      }
      if (/[0-9a-fA-F]/.test(char)) hex += char
    }

    if (hex.length < 16 || hex.length % 2 !== 0 || hex.length > 16 * 1024 * 1024) return
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }
    const isPng = bytes.length >= 8 &&
      bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 &&
      bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10
    if (!isPng || seenPayloads.has(hex)) return
    seenPayloads.add(hex)
    files.push({ file: new File([bytes], 'gambar-word-' + (files.length + 1) + '.png', { type: 'image/png' }), widthPx: picture.widthPx })
  })
  return files
}


type ExtractedRtfWmfImage = { file: File; widthPx: number | null }

/**
 * Ambil WMF dari RTF Word. Fallback WMF yang berada di dalam grup matematika
 * sengaja dilewati karena empat gambar Equation sementara sudah diambil dari PNG.
 */
function extractRtfWmfImages(rtf: string): ExtractedRtfWmfImage[] {
  if (!rtf) return []

  type GroupFrame = {
    start: number
    mathContext: boolean
    isPicture: boolean
    isWmfPayload: boolean
    markerEnd: number
    widthPx: number | null
  }

  const stack: GroupFrame[] = []
  const payloads: Array<{ start: number; end: number; markerEnd: number; widthPx: number | null }> = []

  for (let i = 0; i < rtf.length; i += 1) {
    const char = rtf[i]
    if (char === '{') {
      stack.push({
        start: i,
        mathContext: stack.some((frame) => frame.mathContext),
        isPicture: false,
        isWmfPayload: false,
        markerEnd: 0,
        widthPx: null,
      })
      continue
    }

    if (char === '}') {
      const frame = stack.pop()
      if (frame?.isWmfPayload && !frame.mathContext && frame.markerEnd > 0) {
        payloads.push({
          start: frame.start,
          end: i + 1,
          markerEnd: frame.markerEnd,
          widthPx: frame.widthPx,
        })
      }
      continue
    }

    if (char !== '\\') continue
    const next = rtf[i + 1]
    if (!next) continue

    if (/[{}\\]/.test(next) || next === "'" || next === '*' || next === '~' || next === '-') {
      i += next === "'" ? 3 : 1
      continue
    }
    if (!/[a-zA-Z]/.test(next)) {
      i += 1
      continue
    }

    let end = i + 1
    while (end < rtf.length && /[a-zA-Z]/.test(rtf[end])) end += 1
    const word = rtf.slice(i + 1, end).toLowerCase()
    let numberEnd = end
    if (rtf[numberEnd] === '-') numberEnd += 1
    while (numberEnd < rtf.length && /[0-9]/.test(rtf[numberEnd])) numberEnd += 1
    if (rtf[numberEnd] === ' ') numberEnd += 1

    const frame = stack[stack.length - 1]
    if (frame && (word === 'mmath' || word === 'mmathpict')) {
      frame.mathContext = true
    }
    if (frame && word === 'pict') frame.isPicture = true

    // \wmetafile8: angka 8 adalah jenis gambar WMF pada RTF.
    if (word === 'wmetafile' && frame) {
      const pictureFrame = [...stack].reverse().find((item) => item.isPicture)
      if (pictureFrame) {
        frame.isWmfPayload = true
        frame.markerEnd = numberEnd
        frame.mathContext = stack.some((item) => item.mathContext)
        const pictureHeader = rtf.slice(pictureFrame.start, numberEnd)
        const widthMatch = pictureHeader.match(/\\picwgoal(-?\d+)/i)
        frame.widthPx = widthMatch
          ? Math.max(24, Math.min(1600, Math.round(Number(widthMatch[1]) / 15)))
          : null
      }
    }

    i = numberEnd - 1
  }

  const files: ExtractedRtfWmfImage[] = []
  const seenPayloads = new Set<string>()

  payloads.forEach((payload, index) => {
    let hex = ''
    let depth = 0

    for (let i = payload.markerEnd; i < payload.end - 1; i += 1) {
      const char = rtf[i]
      if (char === '{') {
        depth += 1
        continue
      }
      if (char === '}') {
        if (depth > 0) depth -= 1
        continue
      }
      if (depth > 0) continue

      if (char === '\\') {
        const next = rtf[i + 1]
        if (next === "'") i += 3
        else if (next && /[a-zA-Z]/.test(next)) {
          i += 1
          while (i + 1 < payload.end && /[a-zA-Z]/.test(rtf[i + 1])) i += 1
          if (rtf[i + 1] === '-') i += 1
          while (i + 1 < payload.end && /[0-9]/.test(rtf[i + 1])) i += 1
          if (rtf[i + 1] === ' ') i += 1
        } else i += 1
        continue
      }

      if (/[0-9a-fA-F]/.test(char)) hex += char
    }

    if (hex.length < 40 || hex.length % 2 !== 0 || hex.length > 32 * 1024 * 1024) return
    if (seenPayloads.has(hex)) return

    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }

    // WMF dapat memakai header placeable 22 byte atau METAHEADER standar 18 byte.
    const placeable = bytes.length > 40 &&
      bytes[0] === 0xd7 && bytes[1] === 0xcd && bytes[2] === 0xc6 && bytes[3] === 0x9a
    const headerOffset = placeable ? 22 : 0
    const metafileType = bytes[headerOffset] | (bytes[headerOffset + 1] << 8)
    const headerWords = bytes[headerOffset + 2] | (bytes[headerOffset + 3] << 8)
    const version = bytes[headerOffset + 4] | (bytes[headerOffset + 5] << 8)
    const validHeader =
      (metafileType === 1 || metafileType === 2) &&
      headerWords === 9 &&
      (version === 0x0100 || version === 0x0300)

    if (!validHeader) return

    seenPayloads.add(hex)
    files.push({
      file: new File([bytes], 'gambar-word-wmf-' + (files.length + 1) + '.wmf', {
        type: 'application/x-msmetafile',
      }),
      widthPx: payload.widthPx,
    })
  })

  return files
}

function convertWordDrawingImages(document: Document): void {
  const officeImages = Array.from(document.body.querySelectorAll('*')).filter((node) => {
    const name = (node.localName || node.tagName).toLowerCase().split(':').pop() || ''
    return name === 'imagedata' || name === 'blip'
  })

  officeImages.forEach((officeImage, index) => {
    if (!officeImage.parentNode) return
    const source = officeImage.getAttribute('src') ||
      officeImage.getAttribute('href') ||
      officeImage.getAttribute('r:embed') ||
      officeImage.getAttribute('embed') || ''
    const image = document.createElement('img')
    image.setAttribute('src', source || `office-clipboard-image-${index + 1}`)
    image.setAttribute('alt', 'Gambar dari Microsoft Word')

    // Ganti pembungkus gambar Office (VML/DrawingML), bukan hanya node metadata-nya.
    let wrapper: Element | null = officeImage
    while (wrapper?.parentElement && wrapper.parentElement !== document.body) {
      const parentName = (wrapper.parentElement.localName || wrapper.parentElement.tagName).toLowerCase().split(':').pop() || ''
      if (['shape', 'pict', 'pic', 'drawing', 'inline', 'anchor'].includes(parentName)) {
        wrapper = wrapper.parentElement
        break
      }
      if (parentName === 'p' || parentName === 'span') break
      wrapper = wrapper.parentElement
    }
    if (wrapper?.parentNode) wrapper.parentNode.replaceChild(image, wrapper)
    else if (officeImage.parentNode) officeImage.parentNode.replaceChild(image, officeImage)
  })
}

interface RichTextEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  minHeight?: number
  toolbarMode?: 'full' | 'essay'
}

export default function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Tuliskan teks di sini...',
  editable = true,
  className = '',
  minHeight = 220,
  toolbarMode = 'full',
}: RichTextEditorProps) {
  const editorId = useId()
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),

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
      handlePaste: (view, event) => {
        const clipboard = event.clipboardData
        if (!clipboard) return false
        const rawHtml = clipboard.getData('text/html')
        const rawText = clipboard.getData('text/plain')
        const imageFiles = getClipboardImageFiles(clipboard)
        const converted = rawHtml ? convertWordMath(rawHtml) : { html: '', converted: 0 }
        const parsedDocument = rawHtml
          ? new window.DOMParser().parseFromString(converted.html, 'text/html')
          : null
        if (parsedDocument) convertWordDrawingImages(parsedDocument)
        const imageElements = parsedDocument ? Array.from(parsedDocument.querySelectorAll('img')) : []
        const rtf = clipboard.getData('text/rtf')
        const rtfPngImages = extractRtfPngImages(rtf)
        const rtfWmfImages = extractRtfWmfImages(rtf)
        const hasDataImages = imageElements.some((img) => (img.getAttribute('src') || '').startsWith('data:image/'))
        const hasClipboardImageRefs = imageElements.some((img) => {
          const src = img.getAttribute('src') || ''
          return Boolean(src) && !src.startsWith('data:image/') && !src.startsWith('http://') && !src.startsWith('https://')
        })
        const hasMath = converted.converted > 0
        if (!hasMath && !hasDataImages && !hasClipboardImageRefs && imageFiles.length === 0 && rtfPngImages.length === 0 && rtfWmfImages.length === 0) return false

        event.preventDefault()
        const bookmark = view.state.selection.getBookmark()
        void (async () => {
          try {
            let html = ''

            // Konversi WMF non-matematika ke PNG di browser. Fallback WMF
            // dari Equation Word dilewati saat ekstraksi agar tidak diduplikasi.
            let convertedWmfImages: ExtractedRtfImage[] = []
            if (rtfWmfImages.length > 0) {
              try {
                const { convertMetafileToDataUrl } = await import('emf-converter')
                convertedWmfImages = (await Promise.all(
                  rtfWmfImages.map(async (image, index) => {
                    try {
                      const pngDataUrl = await convertMetafileToDataUrl(
                        await image.file.arrayBuffer(),
                        { maxWidth: 1600, maxHeight: 1600 },
                      )
                      if (!pngDataUrl) throw new Error('Konverter tidak dapat membaca WMF.')
                      const response = await fetch(pngDataUrl)
                      if (!response.ok) throw new Error('Hasil konversi WMF tidak dapat dibaca.')
                      const blob = await response.blob()
                      return {
                        file: new File([blob], 'gambar-word-wmf-' + (index + 1) + '.png', { type: 'image/png' }),
                        widthPx: image.widthPx ?? 0,
                      }
                    } catch (wmfError) {
                      console.warn('Diagram WMF Word dilewati karena gagal dikonversi:', wmfError)
                      return null
                    }
                  }),
                )).filter((image): image is ExtractedRtfImage => image !== null)
              } catch (converterError) {
                console.warn('Konverter WMF tidak dapat dimuat:', converterError)
              }
            }
            if (!parsedDocument && rawText) {
              const textWrapper = document.createElement('div')
              textWrapper.textContent = rawText
              html = textWrapper.innerHTML.replace(/\\n/g, '<br>')
            }
            if (parsedDocument) {
              const remainingFiles: Array<{ file: File; widthPx: number | null }> = [
                ...imageFiles.map((file) => ({ file, widthPx: null })),
                ...rtfPngImages.map((image) => ({ file: image.file, widthPx: image.widthPx })),
                ...convertedWmfImages.map((image) => ({ file: image.file, widthPx: image.widthPx || null })),
              ]
              const uploadTasks = imageElements.map(async (img) => {
                const src = img.getAttribute('src') || ''
                try {
                  let file: File | undefined
                  let imageWidthPx: number | null = null
                  if (src.startsWith('data:image/')) {
                    const blob = await fetch(src).then((response) => {
                      if (!response.ok) throw new Error('Data gambar clipboard tidak dapat dibaca.')
                      return response.blob()
                    })
                    file = new File([blob], 'gambar-word-paste.png', { type: blob.type || 'image/png' })
                  } else if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
                    // Referensi file lokal Word dipasangkan dengan gambar yang berhasil diekstrak dari clipboard RTF.
                    const nextImage = remainingFiles.shift()
                    file = nextImage?.file
                    imageWidthPx = nextImage?.widthPx ?? null
                  } else if (!src && remainingFiles.length) {
                    const nextImage = remainingFiles.shift()
                    file = nextImage?.file
                    imageWidthPx = nextImage?.widthPx ?? null
                  }

                  if (file) {
                    const imageUrl = await uploadPastedImage(file)
                    img.setAttribute('src', imageUrl)
                    // PNG fallback Equation Word mengikuti ukuran target asli yang tercatat di RTF Word.
                    if (imageWidthPx && file.type === 'image/png') {
                      img.removeAttribute('width')
                      img.style.width = String(imageWidthPx) + 'px'
                      img.style.maxWidth = '100%'
                      img.style.height = 'auto'
                    }
                  }
                } catch (imageError) {
                  console.warn('Gambar Word dilewati karena gagal diunggah:', imageError)
                  img.remove()
                }
              })

              // Upload secara bersamaan agar beberapa gambar tidak menunggu antrean satu per satu.
              await Promise.all(uploadTasks)

              const extraUploads = await Promise.all(remainingFiles.map(async ({ file, widthPx }) => {
                try {
                  return { src: await uploadPastedImage(file), widthPx }
                } catch (imageError) {
                  console.warn('Gambar tambahan Word dilewati karena gagal diunggah:', imageError)
                  return null
                }
              }))
              extraUploads.filter((item): item is { src: string; widthPx: number | null } => Boolean(item)).forEach(({ src, widthPx }) => {
                const image = parsedDocument.createElement('img')
                image.setAttribute('src', src)
                image.setAttribute('alt', 'Gambar dari Microsoft Word')
                if (widthPx) image.style.width = String(widthPx) + 'px'
                image.style.maxWidth = '100%'
                image.style.height = 'auto'
                parsedDocument.body.appendChild(image)
              })
              html = parsedDocument.body.innerHTML
            }
            if (!imageElements.length && (imageFiles.length || rtfPngImages.length || convertedWmfImages.length)) {
              const uploaded = await Promise.all([
                ...imageFiles.map(async (file) => ({ src: await uploadPastedImage(file), widthPx: null as number | null })),
                ...rtfPngImages.map(async ({ file, widthPx }) => ({ src: await uploadPastedImage(file), widthPx })),
                ...convertedWmfImages.map(async ({ file, widthPx }) => ({ src: await uploadPastedImage(file), widthPx: widthPx || null })),
              ])
              html += uploaded.map(({ src, widthPx }) => '<img src="' + src + '" alt="Gambar dari Microsoft Word" style="' + (widthPx ? 'width: ' + widthPx + 'px; ' : '') + 'max-width: 100%; height: auto;" />').join('')
            }
            const wrapper = document.createElement('div')
            wrapper.innerHTML = html
            const slice = ProseMirrorDOMParser.fromSchema(view.state.schema).parseSlice(wrapper)
            const selection = bookmark.resolve(view.state.doc)
            view.dispatch(view.state.tr.setSelection(selection).replaceSelection(slice).scrollIntoView())
          } catch (error) {
            console.error('Word clipboard paste failed:', error)
            window.alert(error instanceof Error ? error.message : 'Gagal menempelkan gambar atau rumus dari Microsoft Word.')
          }
        })()
        return true
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
      {editable && <EditorToolbar editor={editor} editorId={editorId} mode={toolbarMode} />}

      <EditorContent editor={editor} />
    </div>
  )
}
