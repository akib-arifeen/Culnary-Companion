import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { PhotoCredit } from '../data/types'

interface RecipePhotoProps {
  photo: PhotoCredit
  /** Layout classes from the call site (aspect ratio, size, rounding). Applied to both the image and its fallback. */
  className?: string
  /** 600w + 1200w variants for the browse cards. */
  responsive?: boolean
  sizes?: string
  loading?: 'lazy' | 'eager'
  /** Small squares (the resume thumbnail) cannot carry the full sentence. */
  compact?: boolean
}

/**
 * A recipe photo with a visible state when the file is missing or unmapped. A bare <img> leaves the
 * browser's broken-image glyph in the layout; this keeps the ticket's shape and says what happened,
 * while the photo attribution stays where it is.
 */
export default function RecipePhoto({ photo, className = '', responsive = false, sizes, loading, compact = false }: RecipePhotoProps) {
  // Remember which source failed, so a new recipe's photo is tried even when React reuses this component.
  const [failedSrc, setFailedSrc] = useState<string | null>(photo.src ? null : '')
  const failed = !photo.src || failedSrc === photo.src
  const label = compact ? 'No photo' : 'Photo unavailable'

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${label}: ${photo.alt}`}
        className={`flex flex-col items-center justify-center gap-1.5 bg-paper-2 p-2 text-center text-ink-2 ${className}`}
      >
        <ImageOff className={compact ? 'size-5' : 'size-6'} strokeWidth={2} aria-hidden="true" />
        <span className={`font-mono font-semibold uppercase tracking-wide ${compact ? 'text-[0.6rem] leading-tight' : 'text-xs'}`}>
          {label}
        </span>
      </div>
    )
  }

  return (
    <img
      src={photo.src}
      srcSet={responsive ? `${photo.src.replace(/\.webp$/, '-600.webp')} 600w, ${photo.src} 1200w` : undefined}
      sizes={responsive ? sizes : undefined}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loading={loading}
      onError={() => setFailedSrc(photo.src)}
      className={className}
    />
  )
}
