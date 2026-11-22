import type { VisualIntent } from '../types'

export type RenderContext = {
  width: number
  height: number
  locale: 'id-ID'
}

export type RenderArtifact = {
  blob: Blob
  mimeType: 'image/png'
  width: number
  height: number
  elementCount: number
  representedValues: string[]
  rendererId: string
  rendererVersion: number
}

export type RendererQualityResult =
  | { status: 'accepted'; artifact: RenderArtifact }
  | {
      status: 'rejected'
      reasonCode:
        | 'BLOB_EMPTY'
        | 'INVALID_MIME_TYPE'
        | 'INVALID_DIMENSIONS'
        | 'INVALID_ELEMENT_COUNT'
        | 'MISSING_REPRESENTED_VALUES'
      message: string
    }

export type VisualRenderer = {
  id: string
  version: number
  supports: (intent: VisualIntent) => boolean
  render: (intent: VisualIntent, context: RenderContext) => Promise<Blob | null>
}
