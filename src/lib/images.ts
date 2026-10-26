import credits from '@/assets/images/credits.json'

/**
 * All photos in src/assets/images, keyed by file name (e.g. "temple-krishna").
 * Vite fingerprints and optimises them at build time.
 */
const files = import.meta.glob<string>('@/assets/images/*.webp', {
  eager: true,
  import: 'default',
})

const images: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.replace(/^.*\/(.+)\.webp$/, '$1'), url]),
)

/** Photo to use when an item names one that is not (yet) in the folder. */
const FALLBACK = 'lamp'

export function imageFor(key: string): string {
  return images[key] ?? images[FALLBACK] ?? ''
}

export interface ImageCredit {
  key: string
  title: string
  page: string
  license: string
  licenseUrl: string | null
  artist: string
}

export const IMAGE_CREDITS: ImageCredit[] = credits
