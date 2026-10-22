import type { MediaStatus } from '../../lib/mediaErrors'

export type PipMode = 'none' | 'video' | 'pill' | 'problem'

/** What the corner of the main area shows, so the screen can reserve room for it (nothing may overlap). */
export function pipMode(opts: { gesturesOn: boolean; previewPref: boolean; gesturesStatus: MediaStatus; voiceProblem: boolean }): PipMode {
  const { gesturesOn, previewPref, gesturesStatus, voiceProblem } = opts
  if (gesturesOn && (gesturesStatus === 'denied' || gesturesStatus === 'unavailable' || gesturesStatus === 'error')) return 'problem'
  if (gesturesOn && (gesturesStatus === 'on' || gesturesStatus === 'starting')) return previewPref ? 'video' : 'pill'
  return voiceProblem ? 'problem' : 'none'
}

/** Padding that keeps the main content clear of the corner element (classes written out in full for Tailwind). */
export const PIP_RESERVE: Record<PipMode, string> = {
  none: '',
  video: 'pb-24 sm:pb-0 sm:pr-40 short:pb-0 short:pr-32',
  pill: 'pb-12 sm:pb-0 sm:pr-40 short:pb-0 short:pr-40',
  problem: 'pb-12 sm:pb-0 sm:pr-56 short:pb-0 short:pr-56',
}
