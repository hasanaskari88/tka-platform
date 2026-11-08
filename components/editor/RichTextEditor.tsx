
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


type RtfMathNode = { destination: string; parts: Array<string | RtfMathNode> }
type ExtractedRtfMath = { latex: string; displayMode: boolean }

function parseRtfMathGroup(source: string): RtfMathNode | null {
  let index = 0
  const parseGroup = (): RtfMathNode | null => {
    if (source[index] !== '{') return null
    index += 1
    const node: RtfMathNode = { destination: '', parts: [] }
    while (index < source.length) {
      const char = source[index]
      if (char === '}') { index += 1; return node }
      if (char === '{') {
        const child = parseGroup()
        if (child) node.parts.push(child)
        continue
      }
      if (char !== '\\') { node.parts.push(char); index += 1; continue }
      index += 1
      const next = source[index]
      if (!next) break
      if (next === "'" && /^[0-9a-f]{2}$/i.test(source.slice(index + 1, index + 3))) {
        node.parts.push(String.fromCharCode(Number.parseInt(source.slice(index + 1, index + 3), 16)))
        index += 3
        continue
      }
      if (next === '{' || next === '}' || next === '\\') {
        node.parts.push(next); index += 1; continue
      }
      if (next === '*') { index += 1; continue }
      if (!/[a-zA-Z]/.test(next)) {
        if (next === '~') node.parts.push('\u00a0')
        else if (next === '_') node.parts.push('\u2011')
        index += 1
        continue
      }
      const wordStart = index
      while (index < source.length && /[a-zA-Z]/.test(source[index])) index += 1
      const word = source.slice(wordStart, index)
      let number = ''
      if (source[index] === '-') { number = '-'; index += 1 }
      while (index < source.length && /[0-9]/.test(source[index])) { number += source[index]; index += 1 }
      if (source[index] === ' ') index += 1
      const normalized = word.toLowerCase()
      if (normalized === 'u' && number) {
        const code = Number(number)
        node.parts.push(String.fromCharCode(code < 0 ? code + 65536 : code))
        if (index < source.length) {
          if (source[index] === '\\' && source[index + 1] === "'") index += 4
          else if (source[index] !== '{' && source[index] !== '}') index += 1
        }
      } else if (normalized === 'par' || normalized === 'line') node.parts.push(' ')
      else if (normalized === 'tab') node.parts.push('\t')
      else if (normalized === 'emdash') node.parts.push('—')
      else if (normalized === 'endash') node.parts.push('–')
      else if (!node.destination) node.destination = word
    }
    return node
  }
  return parseGroup()
}

function rtfMathNodeText(node: RtfMathNode | undefined): string {
  if (!node) return ''
  return node.parts.map((part) => typeof part === 'string' ? part : rtfMathNodeText(part)).join('')
}

function rtfMathChild(node: RtfMathNode, destination: string): RtfMathNode | undefined {
  return node.parts.find((part): part is RtfMathNode =>
    typeof part !== 'string' && part.destination === destination
  )
}

function rtfMathPropertyText(node: RtfMathNode, propertyGroup: string, valueGroup: string): string {
  const properties = rtfMathChild(node, propertyGroup)
  return properties ? rtfMathNodeText(rtfMathChild(properties, valueGroup)) : ''
}

function rtfMathToLatex(node: RtfMathNode): string {
  const children = node.parts.filter((part): part is RtfMathNode => typeof part !== 'string')
  const childLatex = (name: string) => {
    const child = children.find((item) => item.destination === name)
    return child ? rtfMathToLatex(child) : ''
  }
  const plain = () => node.parts.map((part) =>
    typeof part === 'string' ? part : rtfMathToLatex(part)
  ).join('')

  switch (node.destination) {
    case 'mmath':
    case 'mmathPara':
    case 'me':
    case 'mnum':
    case 'mden':
    case 'mdeg':
    case 'msub':
    case 'msup':
    case 'mlim':
    case 'mfName':
    case 'mr':
      return plain()
    case 'mf': {
      const numerator = childLatex('mnum')
      const denominator = childLatex('mden')
      return numerator && denominator ? '\\frac{' + numerator + '}{' + denominator + '}' : plain()
    }
    case 'msSup': {
      const base = childLatex('me'); const sup = childLatex('msup')
      return base && sup ? '{' + base + '}^{' + sup + '}' : plain()
    }
    case 'msSub': {
      const base = childLatex('me'); const sub = childLatex('msub')
      return base && sub ? '{' + base + '}_{' + sub + '}' : plain()
    }
    case 'msSubSup': {
      const base = childLatex('me'); const sub = childLatex('msub'); const sup = childLatex('msup')
      return base && (sub || sup) ? '{' + base + '}' + (sub ? '_{' + sub + '}' : '') + (sup ? '^{' + sup + '}' : '') : plain()
    }
    case 'msPre': {
      const base = childLatex('me'); const sub = childLatex('msub'); const sup = childLatex('msup')
      return base ? '{}'+ (sub ? '_{' + sub + '}' : '') + (sup ? '^{' + sup + '}' : '') + '{' + base + '}' : plain()
    }
    case 'mrad': {
      const base = childLatex('me'); const degree = childLatex('mdeg')
      return base ? (degree ? '\\sqrt[' + degree + ']{' + base + '}' : '\\sqrt{' + base + '}') : plain()
    }
    case 'mnary': {
      const symbol = rtfMathPropertyText(node, 'mnaryPr', 'mchr') || '∑'
      const command = symbol.includes('∫') ? '\\int'
        : symbol.includes('∏') ? '\\prod'
          : symbol.includes('⋃') ? '\\bigcup'
            : symbol.includes('⋂') ? '\\bigcap' : '\\sum'
      const lower = childLatex('msub'); const upper = childLatex('msup'); const base = childLatex('me')
      return command + (lower ? '_{' + lower + '}' : '') + (upper ? '^{' + upper + '}' : '') + (base ? ' ' + base : '')
    }
    case 'md': {
      const begin = rtfMathPropertyText(node, 'mdPr', 'mbegChr') || '('
      const end = rtfMathPropertyText(node, 'mdPr', 'mendChr') || ')'
      const body = children.filter((item) => item.destination === 'me').map(rtfMathToLatex).join('')
      return '\\left' + begin + (body || plain()) + '\\right' + end
    }
    case 'macc': {
      const symbol = rtfMathPropertyText(node, 'maccPr', 'mchr')
      const base = childLatex('me')
      const accent = symbol.includes('̃') ? 'tilde' : symbol.includes('̇') ? 'dot' : symbol.includes('̈') ? 'ddot' : symbol.includes('→') ? 'vec' : 'hat'
      return base ? '\\' + accent + '{' + base + '}' : plain()
    }
    case 'mbar': {
      const base = childLatex('me'); const position = rtfMathPropertyText(node, 'mbarPr', 'mpos')
      return base ? (position.toLowerCase().includes('bot') ? '\\underline{' + base + '}' : '\\overline{' + base + '}') : plain()
    }
    case 'mfunc': {
      const name = childLatex('mfName'); const argument = childLatex('me')
      return name && argument ? name + '\\left(' + argument + '\\right)' : plain()
    }
    case 'mgroupChr': {
      const base = childLatex('me'); const position = rtfMathPropertyText(node, 'mgroupChrPr', 'mpos')
      return base ? (position.toLowerCase().includes('bot') ? '\\underbrace{' + base + '}' : '\\overbrace{' + base + '}') : plain()
    }
    case 'mphant':
      return childLatex('me')

    // Word embeds a visual Equation fallback (PNG/WMF) inside the math group.
    // Its shape metadata and image payload must never become part of LaTeX.
    case 'mmathPict':
    case 'pict':
    case 'shppict':
    case 'nonshppict':
    case 'sp':
    case 'sn':
    case 'sv':
    case 'shp':
    case 'shpinst':
    case 'shprslt':
    case 'shptxt':
    case 'objdata':
    case 'blipuid':
      return ''

    case 'mfPr': case 'msSupPr': case 'msSubPr': case 'msSubSupPr': case 'msPrePr':
    case 'mradPr': case 'mnaryPr': case 'mdPr': case 'maccPr': case 'mbarPr':
    case 'mfuncPr': case 'mgroupChrPr': case 'margPr': case 'mctrlPr':
    case 'mtype': case 'mchr': case 'mbegChr': case 'mendChr': case 'mpos':
    case 'mlimLoc': case 'msty': case 'mnor':
      return ''
    default:
      return plain()
  }
}

function extractRtfMathFormulas(rtf: string): ExtractedRtfMath[] {
  if (!rtf) return []
  const formulas: ExtractedRtfMath[] = []
  for (let i = 0; i < rtf.length; i += 1) {
    if (rtf[i] !== '{') continue
    const destination = rtf.slice(i + 1).match(/^\\(mmathPara|mmath)(?=[\s{}])/i)
    if (!destination) continue
    let depth = 0
    let end = -1
    for (let cursor = i; cursor < rtf.length; cursor += 1) {
      const char = rtf[cursor]
      if (char === '\\') {
        const next = rtf[cursor + 1]
        if (next === "'") { cursor += 3; continue }
        if (next && /[a-zA-Z]/.test(next)) {
          cursor += 1
          while (cursor + 1 < rtf.length && /[a-zA-Z]/.test(rtf[cursor + 1])) cursor += 1
          if (rtf[cursor + 1] === '-') cursor += 1
          while (cursor + 1 < rtf.length && /[0-9]/.test(rtf[cursor + 1])) cursor += 1
          if (rtf[cursor + 1] === ' ') cursor += 1
        } else cursor += 1
        continue
      }
      if (char === '{') depth += 1
      else if (char === '}') {
        depth -= 1
        if (depth === 0) { end = cursor + 1; break }
      }
    }
    if (end < 0) continue
    const group = parseRtfMathGroup(rtf.slice(i, end))
    if (group) {
      const latex = rtfMathToLatex(group).trim()
      if (latex) formulas.push({ latex, displayMode: destination[1].toLowerCase() === 'mmathpara' })
    }
    i = end - 1
  }
  return formulas
}

function replaceRtfMathImagePlaceholders(
  document: Document,
  formulas: ExtractedRtfMath[],
  fallbackImageCount: number,
): number {
  if (!formulas.length || !fallbackImageCount) return 0
  const placeholders = Array.from(document.body.querySelectorAll('img')).filter((image) => {
    const src = image.getAttribute('src') || ''
    return Boolean(src) && !src.startsWith('data:image/') &&
      !src.startsWith('http://') && !src.startsWith('https://')
  })
  const count = Math.min(formulas.length, fallbackImageCount, placeholders.length)
  for (let index = 0; index < count; index += 1) {
    const formula = formulas[index]
    const replacement = document.createElement(formula.displayMode ? 'div' : 'span')
    replacement.setAttribute('data-type', formula.displayMode ? 'block-math' : 'inline-math')
    replacement.setAttribute('data-latex', formula.latex)
    replacement.textContent = formula.latex
    placeholders[index].replaceWith(replacement)
  }
  return count
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


type RtfImageCrop = { left: number; right: number; top: number; bottom: number; widthGoal: number; heightGoal: number }
type ExtractedRtfWmfImage = { file: File; widthPx: number | null; crop: RtfImageCrop | null }

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
    crop: RtfImageCrop | null
  }

  const stack: GroupFrame[] = []
  const payloads: Array<{ start: number; end: number; markerEnd: number; widthPx: number | null; crop: RtfImageCrop | null }> = []

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
        crop: null,
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
          crop: frame.crop,
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
        const heightMatch = pictureHeader.match(/\\pichgoal(-?\d+)/i)
        const cropLeft = Number(pictureHeader.match(/\\piccropl(-?\d+)/i)?.[1] || 0)
        const cropRight = Number(pictureHeader.match(/\\piccropr(-?\d+)/i)?.[1] || 0)
        const cropTop = Number(pictureHeader.match(/\\piccropt(-?\d+)/i)?.[1] || 0)
        const cropBottom = Number(pictureHeader.match(/\\piccropb(-?\d+)/i)?.[1] || 0)
        const widthGoal = Number(widthMatch?.[1] || 0)
        const heightGoal = Number(heightMatch?.[1] || 0)
        // Ukuran target WMF dari clipboard Word terukur sekitar 4x lebih besar
        // daripada ukuran tampil yang diharapkan; koreksi hanya untuk lebar tampilan.
        // widthGoal mentah tetap disimpan pada crop agar hasil potongan tidak berubah.
        frame.widthPx = widthGoal > 0
          ? Math.max(12, Math.min(400, Math.round(widthGoal / 110)))
          : null
        frame.crop = widthGoal > 0 && heightGoal > 0 &&
          (cropLeft > 0 || cropRight > 0 || cropTop > 0 || cropBottom > 0)
          ? { left: cropLeft, right: cropRight, top: cropTop, bottom: cropBottom, widthGoal, heightGoal }
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
      crop: payload.crop,
    })
  })

  return files
}


/**
 * Terapkan crop yang direkam Word pada RTF ke bitmap hasil konversi WMF.
 * Nilai crop RTF dibandingkan dengan ukuran target Word agar hasil tetap proporsional.
 */
async function applyRtfImageCrop(file: File, crop: RtfImageCrop | null): Promise<File> {
  if (!crop) return file
  const bitmap = await createImageBitmap(file)
  try {
    // RTF Word menyatakan nilai crop dan ukuran target dalam twips.
    // Gunakan ukuran target sebagai acuan skala crop; jangan menambahkan
    // nilai crop ke penyebut karena itu membuat pemotongan terlalu ringan.
    if (crop.widthGoal <= 0 || crop.heightGoal <= 0) return file

    const left = Math.max(0, Math.min(bitmap.width - 1, Math.round(bitmap.width * crop.left / crop.widthGoal)))
    const right = Math.max(0, Math.min(bitmap.width - left - 1, Math.round(bitmap.width * crop.right / crop.widthGoal)))
    const top = Math.max(0, Math.min(bitmap.height - 1, Math.round(bitmap.height * crop.top / crop.heightGoal)))
    const bottom = Math.max(0, Math.min(bitmap.height - top - 1, Math.round(bitmap.height * crop.bottom / crop.heightGoal)))
    const width = bitmap.width - left - right
    const height = bitmap.height - top - bottom
    if (width < 2 || height < 2) return file

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, left, top, width, height, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    return blob
      ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '-crop.png', { type: 'image/png' })
      : file
  } finally {
    bitmap.close()
  }
}

function inferWordImageLayout(image: HTMLImageElement): 'wrap-left' | 'wrap-right' {
  const elements: Element[] = [image]
  let parent = image.parentElement
  while (parent && parent !== image.ownerDocument.body) {
    elements.push(parent)
    parent = parent.parentElement
  }

  const styles = elements.map((element) => {
    const inline = element.getAttribute('style') || ''
    const align = element.getAttribute('align') || ''
    const className = typeof element.className === 'string' ? element.className : ''
    return (inline + ' ' + align + ' ' + className).toLowerCase()
  }).join(' ')

  if (/float\\s*:\\s*left|mso-position-horizontal\\s*:\\s*left|align\\s*=\\s*["']?left/.test(styles)) {
    return 'wrap-left'
  }
  if (/float\\s*:\\s*right|mso-position-horizontal\\s*:\\s*right|align\\s*=\\s*["']?right/.test(styles)) {
    return 'wrap-right'
  }

  // Word sering menyimpan posisi gambar mengambang sebagai koordinat margin.
  // Bila sisi tidak dinyatakan secara eksplisit, gunakan kanan sebagai default
  // agar gambar tidak mengambil satu baris penuh di atas teks soal.
  return 'wrap-right'
}

function applyWordImageWrap(image: HTMLImageElement, widthPx?: number | null): void {
  const layout = inferWordImageLayout(image)
  const width = widthPx && widthPx > 0
    ? Math.min(widthPx, 360)
    : 260
  const widthCss = width + 'px'
  image.removeAttribute('width')
  image.style.width = widthCss
  image.style.maxWidth = '42%'
  image.style.height = 'auto'
  image.style.display = 'block'
  image.style.float = layout === 'wrap-left' ? 'left' : 'right'
  image.style.margin = layout === 'wrap-left'
    ? '0 16px 12px 0'
    : '0 0 12px 16px'
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
        const rtf = clipboard.getData('text/rtf')
        const rtfMathFormulas = converted.converted > 0 ? [] : extractRtfMathFormulas(rtf)
        const rtfPngImages = extractRtfPngImages(rtf)
        const convertedRtfMathCount = parsedDocument
          ? replaceRtfMathImagePlaceholders(parsedDocument, rtfMathFormulas, rtfPngImages.length)
          : 0
        const remainingRtfPngImages = rtfPngImages.slice(convertedRtfMathCount)
        const imageElements = parsedDocument ? Array.from(parsedDocument.querySelectorAll('img')) : []
        const rtfWmfImages = extractRtfWmfImages(rtf)
        const hasDataImages = imageElements.some((img) => (img.getAttribute('src') || '').startsWith('data:image/'))
        const hasClipboardImageRefs = imageElements.some((img) => {
          const src = img.getAttribute('src') || ''
          return Boolean(src) && !src.startsWith('data:image/') && !src.startsWith('http://') && !src.startsWith('https://')
        })
        const hasMath = converted.converted > 0 || convertedRtfMathCount > 0
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
                      const convertedFile = new File([blob], 'gambar-word-wmf-' + (index + 1) + '.png', { type: 'image/png' })
                      const croppedFile = await applyRtfImageCrop(convertedFile, image.crop)
                      return {
                        file: croppedFile,
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
                ...remainingRtfPngImages.map((image) => ({ file: image.file, widthPx: image.widthPx })),
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
                    if (file.type === 'image/png' && (imageWidthPx !== null || src.startsWith('file:'))) {
                      applyWordImageWrap(img, imageWidthPx)
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
                applyWordImageWrap(image, widthPx)
                parsedDocument.body.appendChild(image)
              })
              html = parsedDocument.body.innerHTML
            }
            if (!imageElements.length && (imageFiles.length || rtfPngImages.length || convertedWmfImages.length)) {
              const uploaded = await Promise.all([
                ...imageFiles.map(async (file) => ({ src: await uploadPastedImage(file), widthPx: null as number | null })),
                ...remainingRtfPngImages.map(async ({ file, widthPx }) => ({ src: await uploadPastedImage(file), widthPx })),
                ...convertedWmfImages.map(async ({ file, widthPx }) => ({ src: await uploadPastedImage(file), widthPx: widthPx || null })),
              ])
              html += uploaded.map(({ src, widthPx }) => '<img src="' + src + '" alt="Gambar dari Microsoft Word" style="width: ' + Math.min(widthPx || 260, 360) + 'px; max-width: 42%; height: auto; display: block; float: right; margin: 0 0 12px 16px;" />').join('')
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
