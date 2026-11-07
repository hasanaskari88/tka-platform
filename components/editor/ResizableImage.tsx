
'use client'

import { useRef, useState } from 'react'
import Image from '@tiptap/extension-image'
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

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
  } | null>(null)

  const [previewWidth, setPreviewWidth] = useState<number | null>(null)

  const attrs = node.attrs
  const imageWidth = attrs.width
  const imageStyle = String(attrs.style || '')

  const margin =
    imageStyle.match(/margin:\s*([^;]+)/)?.[1] || '0 auto'

  const alignment =
    margin.includes('auto') && margin.startsWith('0 auto 0 0')
      ? 'left'
      : margin.startsWith('0 0 0 auto')
        ? 'right'
        : 'center'

  const currentWidth = () => {
    if (previewWidth !== null) return previewWidth

    const editorWidth = editor.view.dom.getBoundingClientRect().width
    const actualWidth = imageRef.current?.getBoundingClientRect().width

    if (!editorWidth || !actualWidth) return 60

    return Math.min(100, Math.max(10, (actualWidth / editorWidth) * 100))
  }

  const saveWidth = (value: number) => {
    const width = `${Math.round(value)}%`

    const newMargin =
      alignment === 'left'
        ? '0 auto 0 0'
        : alignment === 'right'
          ? '0 0 0 auto'
          : '0 auto'

    updateAttributes({
      width,
      style: `width: ${width}; display: block; margin: ${newMargin};`,
    })
  }

  const handlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
    event.stopPropagation()

    const editorWidth = editor.view.dom.getBoundingClientRect().width

    if (!editorWidth || !imageRef.current) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: currentWidth(),
      editorWidth,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    const delta = event.clientX - drag.startX
    const change = (delta / drag.editorWidth) * 100

    const nextWidth = Math.min(
      100,
      Math.max(10, drag.startWidth + change)
    )

    setPreviewWidth(nextWidth)
  }

  const finishResize = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    if (previewWidth !== null) {
      saveWidth(previewWidth)
    }

    dragRef.current = null
    setPreviewWidth(null)
  }

  return (
    <NodeViewWrapper
      className={`editor-image-wrapper ${selected ? 'is-selected' : ''}`}
      style={{
        width:
          previewWidth !== null
            ? `${previewWidth}%`
            : imageWidth
              ? String(imageWidth)
              : 'auto',
        maxWidth: '100%',
        margin,
      }}
    >
      <img
        ref={imageRef}
        src={attrs.src}
        alt={attrs.alt || ''}
        title={attrs.title || ''}
        draggable={false}
        className="editor-image"
        style={{
          display: 'block',
          width: '100%',
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
