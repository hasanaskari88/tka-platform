
'use client'

import { useEffect, useRef } from 'react'
import katex from 'katex'
import DOMPurify from 'isomorphic-dompurify'
import 'katex/dist/katex.min.css'

interface MathRendererProps {
  content: string
  className?: string
  normalizeRotatedImages?: boolean
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
  normalizeRotatedImages = false,
}: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  let htmlContent = ''

  try {
    // 1. Bersihkan HTML sumber sebelum diproses.
    const safeInput = String(
      DOMPurify.sanitize(content, {
        ADD_ATTR: ['data-type', 'data-latex', 'data-rotation'],
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
          'data-rotation',
        ],
      })
    )
  } catch (error) {
    console.error('MathRenderer Error:', error)

    htmlContent = String(DOMPurify.sanitize(content))
  }


  useEffect(() => {
    if (!normalizeRotatedImages) return

    const container = containerRef.current
    if (!container) return

    const normalizeImages = () => {
      const images = Array.from(
        container.querySelectorAll<HTMLImageElement>('img')
      )

      images.forEach((image) => {
        const existingWrapper = image.parentElement
        if (existingWrapper?.dataset.rotatedImageWrapper === 'true') {
          const originalStyle = image.dataset.originalRotatedStyle ?? ''
          image.setAttribute('style', originalStyle)
          existingWrapper.replaceWith(image)
        }

        const styleAttribute = image.getAttribute('style') || ''
        const rotationAttribute = image.getAttribute('data-rotation')
        const rotationMatch = styleAttribute.match(
          /transform:\s*rotate\(\s*(-?\d+(?:\.\d+)?)deg\s*\)/i
        )
        const rotation = Number(
          rotationAttribute ?? rotationMatch?.[1] ?? 0
        )
        const normalizedRotation =
          ((Math.round(rotation / 90) * 90) % 360 + 360) % 360

        if (
          !Number.isFinite(normalizedRotation) ||
          (normalizedRotation !== 90 && normalizedRotation !== 270)
        ) {
          return
        }

        // Tunggu gambar selesai dimuat agar ukuran intrinsiknya tersedia.
        if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
          image.addEventListener('load', normalizeImages, { once: true })
          return
        }

        image.dataset.originalRotatedStyle = styleAttribute
        const unrotatedStyle = styleAttribute
          .replace(/transform:\s*rotate\([^)]*\);?/gi, '')
          .replace(/transform-origin:\s*[^;]+;?/gi, '')
        image.setAttribute('style', unrotatedStyle)

        const rect = image.getBoundingClientRect()
        const width = rect.width
        const height = rect.height

        if (!width || !height) {
          image.setAttribute('style', styleAttribute)
          return
        }

        const computed = window.getComputedStyle(image)
        const marginLeft = Number.parseFloat(computed.marginLeft) || 0
        const marginRight = Number.parseFloat(computed.marginRight) || 0
        const availableWidth = Math.max(
          40,
          container.clientWidth - marginLeft - marginRight
        )
        const scale = Math.min(1, availableWidth / height)
        const rotatedWidth = height * scale
        const rotatedHeight = width * scale

        const wrapper = document.createElement('span')
        wrapper.dataset.rotatedImageWrapper = 'true'
        wrapper.setAttribute('aria-label', image.alt || 'Gambar diputar')
        wrapper.style.display = 'block'
        wrapper.style.position = 'relative'
        wrapper.style.width = String(rotatedWidth) + 'px'
        wrapper.style.height = String(rotatedHeight) + 'px'
        wrapper.style.maxWidth = '100%'
        wrapper.style.boxSizing = 'content-box'
        wrapper.style.float = computed.float
        wrapper.style.clear = computed.clear
        wrapper.style.marginTop = computed.marginTop
        wrapper.style.marginRight = computed.marginRight
        wrapper.style.marginBottom = computed.marginBottom
        wrapper.style.marginLeft = computed.marginLeft
        wrapper.style.verticalAlign = computed.verticalAlign

        image.style.position = 'absolute'
        image.style.display = 'block'
        image.style.left = '50%'
        image.style.top = '50%'
        image.style.width = String(width * scale) + 'px'
        image.style.height = String(height * scale) + 'px'
        image.style.maxWidth = 'none'
        image.style.margin = '0'
        image.style.float = 'none'
        image.style.transform =
          'translate(-50%, -50%) rotate(' + normalizedRotation + 'deg)'
        image.style.transformOrigin = 'center center'

        image.parentNode?.insertBefore(wrapper, image)
        wrapper.appendChild(image)
      })
    }
    normalizeImages()
    const observer = new ResizeObserver(() => normalizeImages())
    observer.observe(container)

    return () => observer.disconnect()
  }, [content, normalizeRotatedImages])

  if (!content) return null

  return (
    <div
      ref={containerRef}
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
