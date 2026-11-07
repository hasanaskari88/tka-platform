
'use client'

import { useRef, useState } from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  CSSProperties,
} from 'react'
import Image from '@tiptap/extension-image'
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

type ImageLayout =
  | 'left'
  | 'center'
  | 'right'
  | 'wrap-left'
  | 'wrap-right'

function getLayout(style: string): ImageLayout {
  if (/float:\s*left/i.test(style)) return 'wrap-left'
  if (/float:\s*right/i.test(style)) return 'wrap-right'

  const margin = style.match(/margin:\s*([^;]+)/i)?.[1]?.trim() || ''

  if (margin.startsWith('0 auto 0 0')) return 'left'
  if (margin.startsWith('0 0 0 auto')) return 'right'

  return 'center'
}

function makeImageStyle(
  width: string,
  layout: ImageLayout
): string {
  if (layout === 'wrap-left') {
    return `width: ${width}; display: block; float: left; margin: 0 16px 12px 0;`
  }

  if (layout === 'wrap-right') {
    return `width: ${width}; display: block; float: right; margin: 0 0 12px 16px;`
  }

  const margin =
    layout === 'left'
      ? '0 auto 0 0'
      : layout === 'right'
        ? '0 0 0 auto'
        : '0 auto'

  return `width: ${width}; display: block; float: none; margin: ${margin};`
}

function ResizableImageView({
  node,
  selected,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null)

  const dragRef = useRef<{
    pointerId: number
    startX: number
    startWidth: number
    editorWidth: number
    previewWidth: number
  } | null>(null)

  const [previewWidth, setPreviewWidth] = useState<number | null>(null)

  const attrs = node.attrs
  const imageWidth = attrs.width ? String(attrs.width) : null
  const imageStyle = String(attrs.style || '')
  const layout = getLayout(imageStyle)

  const isWrapped =
    layout === 'wrap-left' || layout === 'wrap-right'

  const effectiveWidth =
    previewWidth !== null
      ? `${previewWidth}%`
      : imageWidth && imageWidth !== 'auto'
        ? imageWidth
        : 'fit-content'

  const wrapperStyle: CSSProperties = {
    width: effectiveWidth,
    maxWidth: '100%',
    display: 'block',
    margin: isWrapped
      ? layout === 'wrap-left'
        ? '0 16px 12px 0'
        : '0 0 12px 16px'
      : layout === 'left'
        ? '0 auto 0 0'
        : layout === 'right'
          ? '0 0 0 auto'
          : '0 auto',
    float: isWrapped
      ? layout === 'wrap-left'
        ? 'left'
        : 'right'
      : 'none',
    clear: isWrapped ? 'none' : 'both',
  }

  const imageElementWidth =
    previewWidth !== null || (imageWidth && imageWidth !== 'auto')
      ? '100%'
      : 'auto'

  const saveWidth = (value: number) => {
    const width = `${Math.round(value)}%`

    updateAttributes({
      width,
      style: makeImageStyle(width, layout),
    })
  }

  const changeLayout = (nextLayout: ImageLayout) => {
    const width = imageWidth || '60%'

    updateAttributes({
      width,
      style: makeImageStyle(width, nextLayout),
    })
  }

  const currentWidth = () => {
    const editorWidth =
      editor.view.dom.getBoundingClientRect().width

    const actualWidth =
      imageRef.current?.getBoundingClientRect().width

    if (!editorWidth || !actualWidth) return 60

    return Math.min(
      100,
      Math.max(10, (actualWidth / editorWidth) * 100)
    )
  }

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
    event.stopPropagation()

    const editorWidth =
      editor.view.dom.getBoundingClientRect().width

    if (!editorWidth || !imageRef.current) return

    const startWidth = currentWidth()

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth,
      editorWidth,
      previewWidth: startWidth,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    const delta = event.clientX - drag.startX
    const change = (delta / drag.editorWidth) * 100

    const nextWidth = Math.min(
      100,
      Math.max(10, drag.startWidth + change)
    )

    drag.previewWidth = nextWidth
    setPreviewWidth(nextWidth)
  }

  const finishResize = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    saveWidth(drag.previewWidth)

    dragRef.current = null
    setPreviewWidth(null)
  }

  const layoutButtons: {
    value: ImageLayout
    label: string
    title: string
  }[] = [
    {
      value: 'left',
      label: '⇤',
      title: 'Gambar rata kiri',
    },
    {
      value: 'center',
      label: '↔',
      title: 'Gambar rata tengah',
    },
    {
      value: 'right',
      label: '⇥',
      title: 'Gambar rata kanan',
    },
    {
      value: 'wrap-left',
      label: '▣→',
      title: 'Gambar di kiri, teks di kanan',
    },
    {
      value: 'wrap-right',
      label: '←▣',
      title: 'Gambar di kanan, teks di kiri',
    },
  ]

  return (
    <NodeViewWrapper
      className={`editor-image-wrapper ${
        selected ? 'is-selected' : ''
      } ${isWrapped ? 'editor-image-wrapped' : ''}`}
      style={wrapperStyle}
    >
      {selected && editor.isEditable && (
        <div
          className="editor-image-controls"
          contentEditable={false}
        >
          {layoutButtons.map((button) => (
            <button
              key={button.value}
              type="button"
              title={button.title}
              aria-label={button.title}
              className={
                layout === button.value ? 'active' : ''
              }
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => changeLayout(button.value)}
            >
              {button.label}
            </button>
          ))}
        </div>
      )}

      <img
        ref={imageRef}
        src={attrs.src}
        alt={attrs.alt || ''}
        title={attrs.title || ''}
        draggable={false}
        className="editor-image"
        style={{
          display: 'block',
          width: imageElementWidth,
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '0.5rem',
        }}
      />

      {selected && editor.isEditable && (
        <button
          type="button"
          className="editor-image-resize-handle"
          title="Tarik untuk mengubah ukuran gambar"
          aria-label="Ubah ukuran gambar"
          contentEditable={false}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
        />
      )}
    </NodeViewWrapper>
  )
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      width: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('width') ||
          element.style.width ||
          null,
        renderHTML: (attributes) =>
          attributes.width
            ? { width: attributes.width }
            : {},
      },

      style: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('style') || null,
        renderHTML: (attributes) =>
          attributes.style
            ? { style: attributes.style }
            : {},
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
}).configure({
  inline: false,
  allowBase64: false,
  HTMLAttributes: {
    class: 'editor-image',
  },
})

export default ResizableImage
