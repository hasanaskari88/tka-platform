
'use client'

import katex from 'katex'
import DOMPurify from 'isomorphic-dompurify'
import 'katex/dist/katex.min.css'

interface MathRendererProps {
  content: string
  className?: string
}

/**
 * Mengubah karakter HTML yang tersimpan dalam atribut
 * data-latex kembali menjadi karakter aslinya.
 */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )
}

/**
 * Membaca atribut HTML tanpa bergantung pada urutan atribut.
 */
function getHtmlAttribute(
  attributes: string,
  attributeName: string
): string | null {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(
    `\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i'
  )

  const match = attributes.match(regex)

  if (!match) return null

  return decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? '')
}

/**
 * Merender satu rumus menggunakan KaTeX.
 */
function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      output: 'htmlAndMathml',
    })
  } catch (error) {
    console.error('KaTeX rendering error:', error)
    return ''
  }
}

/**
 * Mengubah node rumus Tiptap menjadi HTML KaTeX.
 *
 * Format yang dikenali:
 * - data-type="inline-math"
 * - data-type="block-math"
 * - data-latex="..."
 */
function renderTiptapMathNodes(html: string): string {
  const mathNodeRegex =
    /<(span|div)\b(?=[^>]*\bdata-type\s*=\s*["'](?:inline|block)-math["'])[^>]*>[\s\S]*?<\/\1>/gi

  return html.replace(mathNodeRegex, (fullNode, _tag, _offset, _source) => {
    const openingTag = fullNode.match(/^<(?:span|div)\b[^>]*>/i)?.[0]

    if (!openingTag) return fullNode

    const nodeType = getHtmlAttribute(openingTag, 'data-type')
    const latex = getHtmlAttribute(openingTag, 'data-latex')

    if (!nodeType || latex === null) return fullNode

    if (nodeType === 'inline-math') {
      return renderKatex(latex, false)
    }

    if (nodeType === 'block-math') {
      return `<div class="math-block">${renderKatex(latex, true)}</div>`
    }

    return fullNode
  })
}

/**
 * Merender format rumus lama:
 * $rumus$ untuk inline
 * $$rumus$$ untuk display
 */
function renderLegacyMath(html: string): string {
  const parts = html.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)

  return parts
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return renderKatex(part.slice(2, -2), true)
      }

      if (part.startsWith('$') && part.endsWith('$')) {
        return renderKatex(part.slice(1, -1), false)
      }

      let formatted = part

      // Dukungan format Markdown lama.
      formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')

      // Pertahankan baris baru jika bukan struktur HTML blok.
      if (!/<(?:table|div|blockquote|ul|ol|li|h[1-6])\b/i.test(formatted)) {
        formatted = formatted.replace(/\n/g, '<br />')
      }

      return formatted
    })
    .join('')
}

export default function MathRenderer({
  content,
  className = '',
}: MathRendererProps) {
  if (!content) return null

  let htmlContent = ''

  try {
    // 1. Bersihkan HTML sumber sebelum diproses.
    const safeInput = String(
      DOMPurify.sanitize(content, {
        ADD_ATTR: ['data-type', 'data-latex'],
      })
    )

    // 2. Render node rumus yang berasal dari Tiptap.
    const tiptapRendered = renderTiptapMathNodes(safeInput)

    // 3. Render rumus lama yang menggunakan tanda dolar.
    const legacyRendered = renderLegacyMath(tiptapRendered)

    // 4. Bersihkan kembali hasil akhir, termasuk HTML KaTeX.
    htmlContent = String(
      DOMPurify.sanitize(legacyRendered, {
        ADD_ATTR: [
          'class',
          'style',
          'data-type',
          'data-latex',
        ],
      })
    )
  } catch (error) {
    console.error('MathRenderer Error:', error)

    htmlContent = String(DOMPurify.sanitize(content))
  }

  return (
    <div
      dir="auto"
      className={`math-renderer w-full max-w-full break-words ${className}`}
      style={{
        color: 'inherit',
        unicodeBidi: 'plaintext',
      }}
      dangerouslySetInnerHTML={{
        __html: htmlContent,
      }}
    />
  )
}
