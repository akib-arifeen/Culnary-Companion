import type { MediaStatus } from '../../lib/mediaErrors'

export type PipMode = 'none' | 'video' | 'pill'

/**
 * What the camera preview shows. Failures are not a PiP state any more: the HEARD strip owns every
 * mic / camera problem (message plus "Try again"), so there is exactly one place to look.
 */
export function pipMode(opts: { gesturesOn: boolean; previewPref: boolean; gesturesStatus: MediaStatus }): PipMode {
  const { gesturesOn, previewPref, gesturesStatus } = opts
  if (gesturesOn && (gesturesStatus === 'on' || gesturesStatus === 'starting')) return previewPref ? 'video' : 'pill'
  return 'none'
}

/**
 * Padding that keeps the content clear of the floating PiP in the bottom-right corner (nothing may overlap).
 * Not needed on lg, where the preview lives in the rail. Classes written out in full for Tailwind.
 */
export const PIP_RESERVE: Record<PipMode, string> = {
  none: '',
  video: 'pb-24 short:pb-0 short:pr-32',
  pill: 'pb-16 short:pb-0 short:pr-48',
}
