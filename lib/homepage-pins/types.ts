export const HOMEPAGE_SURFACES = ['cbt', 'practice', 'material', 'announcement'] as const

export type HomepageSurface = (typeof HOMEPAGE_SURFACES)[number]
