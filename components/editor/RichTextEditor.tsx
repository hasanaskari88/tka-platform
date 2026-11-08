
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
import Underline from '@tiptap/extension-underline'

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

function extractRtfPngImages(rtf: string): File[] {
  if (!rtf) return []
  type GroupFrame = { start: number; isPicture: boolean; format: string; markerEnd: number }
  const stack: GroupFrame[] = []
  const pictures: Array<{ start: number; end: number; markerEnd: number }> = []

  for (let i = 0; i < rtf.length; i += 1) {
    const char = rtf[i]
    if (char === '{') {
      stack.push({ start: i, isPicture: false, format: '', markerEnd: 0 })
      continue
    }
    if (char === '}') {
      const frame = stack.pop()
      if (frame?.isPicture && frame.format === 'png' && frame.markerEnd > 0) {
        pictures.push({ start: frame.start, end: i + 1, markerEnd: frame.markerEnd })
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

  const files: File[] = []
  pictures.forEach((picture, index) => {
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
        if (next === "'" ) i += 3
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
    if (isPng) files.push(new File([bytes], 'gambar-word-' + (files.length + 1) + '.png', { type: 'image/png' }))
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
        const originalDocument = rawHtml ? new window.DOMParser().parseFromString(rawHtml, 'text/html') : null
        const countOfficeNodes = (names: string[]) => originalDocument
          ? Array.from(originalDocument.body.querySelectorAll('*')).filter((node) =>
              names.includes((node.localName || node.tagName).toLowerCase().split(':').pop() || '')
            ).length
          : 0
        const clipboardItemSummary = Array.from(clipboard.items || []).map((item) => `${item.kind}:${item.type || 'tanpa tipe'}`)
        const imageFileSummary = imageFiles.map((file) => `${file.type || 'tanpa tipe'} (${file.size} byte)`)
        const rtf = clipboard.getData('text/rtf')
        const rtfPngImages = extractRtfPngImages(rtf)
        const rtfSlash = String.fromCharCode(92)
        const countRtfToken = (token: string) => rtf.split(rtfSlash + token).length - 1
        const summarizeRtfGroups = (token: string, limit: number) => {
          const summaries: string[] = []
          let position = 0
          while (summaries.length < limit) {
            const found = rtf.indexOf(rtfSlash + token, position)
            if (found < 0) break
            const sample = rtf.slice(found, found + 1800)
            const controls = sample
              .split(rtfSlash)
              .slice(1)
              .map((part) => part.match(/^[a-zA-Z]+-?[0-9]*/)?.[0] || '')
              .filter(Boolean)
            summaries.push([...new Set(controls)].slice(0, 35).join(' '))
            position = found + (rtfSlash + token).length
          }
          return summaries
        }
        const mathRtfStructure = summarizeRtfGroups('mmath', 3)
        const pictureRtfStructure = summarizeRtfGroups('pict', 5)
        const rtfControls = [
          rtfSlash + 'mmath: ' + countRtfToken('mmath'),
          rtfSlash + 'mfrac: ' + countRtfToken('mfrac'),
          rtfSlash + 'msup: ' + countRtfToken('msup'),
          rtfSlash + 'msub: ' + countRtfToken('msub'),
          rtfSlash + 'mrad: ' + countRtfToken('mrad'),
          rtfSlash + 'pict: ' + countRtfToken('pict'),
          rtfSlash + 'shppict: ' + countRtfToken('shppict'),
          rtfSlash + 'nonshppict: ' + countRtfToken('nonshppict'),
          rtfSlash + 'objdata: ' + countRtfToken('objdata'),
        ]
        const imageSrcKinds = (originalDocument ? Array.from(originalDocument.body.querySelectorAll('img')) : [])
          .map((img) => {
            const src = img.getAttribute('src') || ''
            if (!src) return 'kosong'
            if (src.startsWith('data:image/')) return 'data-uri'
            if (src.startsWith('file:')) return 'file-url'
            if (src.startsWith('cid:')) return 'cid'
            if (src.startsWith('blob:')) return 'blob'
            if (src.startsWith('http://') || src.startsWith('https://')) return 'http-url'
            return 'referensi-lokal/lain'
          })
        const diagnostic = [
          'Diagnostik paste sementara:',
          `Format clipboard: ${Array.from(clipboard.types || []).join(', ') || 'tidak terbaca'}`,
          `HTML: ${rawHtml.length} karakter; teks biasa: ${rawText.length} karakter; RTF: ${rtf.length} karakter`,
          `OMML: ${countOfficeNodes(['omath', 'omathpara'])}; MathML: ${originalDocument?.body.querySelectorAll('math').length || 0}`,
          `IMG: ${originalDocument?.body.querySelectorAll('img').length || 0}; sumber IMG: ${imageSrcKinds.join(', ') || 'tidak ada'}`,
          `VML imagedata: ${countOfficeNodes(['imagedata'])}; DrawingML blip: ${countOfficeNodes(['blip'])}`,
          `File gambar clipboard: ${imageFiles.length}${imageFileSummary.length ? ' (' + imageFileSummary.join('; ') + ')' : ''}`,
          `PNG yang berhasil dibaca dari RTF: ${rtfPngImages.length}${rtfPngImages.length ? ' (' + rtfPngImages.map((file) => file.size + ' byte').join(', ') + ')' : ''}`,
          `RTF: ${rtfControls.join('; ')}`,
          `Struktur rumus RTF (maks. 3): ${mathRtfStructure.join(' || ') || 'tidak ditemukan'}`,
          `Struktur gambar RTF (maks. 5): ${pictureRtfStructure.join(' || ') || 'tidak ditemukan'}`,
          `Item clipboard: ${clipboardItemSummary.join(', ') || 'tidak ada'}`,
        ].join('\\n')
        console.info('[Word paste diagnostics]', diagnostic)
        window.alert(diagnostic)
        const hasDataImages = imageElements.some((img) => (img.getAttribute('src') || '').startsWith('data:image/'))
        const hasClipboardImageRefs = imageElements.some((img) => {
          const src = img.getAttribute('src') || ''
          return Boolean(src) && !src.startsWith('data:image/') && !src.startsWith('http://') && !src.startsWith('https://')
        })
        const hasMath = converted.converted > 0
        if (!hasMath && !hasDataImages && !hasClipboardImageRefs && imageFiles.length === 0) return false

        event.preventDefault()
        const bookmark = view.state.selection.getBookmark()
        void (async () => {
          try {
            let html = ''
            if (!parsedDocument && rawText) {
              const textWrapper = document.createElement('div')
              textWrapper.textContent = rawText
              html = textWrapper.innerHTML.replace(/\\n/g, '<br>')
            }
            if (parsedDocument) {
              const remainingFiles = [...imageFiles, ...rtfPngImages]
              for (const img of imageElements) {
                const src = img.getAttribute('src') || ''
                if (src.startsWith('data:image/')) {
                  const blob = await fetch(src).then((response) => response.blob())
                  const file = new File([blob], 'gambar-word-paste.png', { type: blob.type || 'image/png' })
                  img.setAttribute('src', await uploadPastedImage(file))
                } else if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
                  // Termasuk file://, cid:, blob:, path relatif, VML, dan referensi DrawingML.
                  const file = remainingFiles.shift()
                  if (file) img.setAttribute('src', await uploadPastedImage(file))
                  else if (src.startsWith('office-clipboard-image-')) {
                    throw new Error('Microsoft Word tidak menyertakan data gambar pada clipboard. Coba salin gambarnya langsung dari Word, lalu tempel kembali.')
                  } else img.remove()
                } else if (!src && remainingFiles.length) {
                  const file = remainingFiles.shift()
                  if (file) img.setAttribute('src', await uploadPastedImage(file))
                }
              }
              for (const file of remainingFiles) {
                const imageUrl = await uploadPastedImage(file)
                const image = parsedDocument.createElement('img')
                image.setAttribute('src', imageUrl)
                image.setAttribute('alt', 'Gambar dari Microsoft Word')
                parsedDocument.body.appendChild(image)
              }
              html = parsedDocument.body.innerHTML
            }
            if (!imageElements.length && (imageFiles.length || rtfPngImages.length)) {
              const uploaded: string[] = []
              for (const file of [...imageFiles, ...rtfPngImages]) uploaded.push(await uploadPastedImage(file))
              html += uploaded.map((src) => `<img src="${src}" alt="Gambar dari Microsoft Word" />`).join('')
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
