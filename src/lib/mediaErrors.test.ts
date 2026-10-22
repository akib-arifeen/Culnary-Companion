import { describe, it, expect } from 'vitest'
import { describeMediaError, describeSpeechError } from './mediaErrors'

const err = (name: string) => Object.assign(new Error('boom'), { name })
const web = { inIframe: false }
const frame = { inIframe: true }

describe('describeMediaError (camera)', () => {
  it.each(['NotAllowedError', 'SecurityError', 'PermissionDeniedError'])('%s -> denied (own tab)', (name) => {
    expect(describeMediaError('camera', err(name), web)).toEqual({
      status: 'denied',
      message: "Camera access was blocked. Allow the camera in your browser's site settings, then try again.",
    })
  })

  it.each(['NotAllowedError', 'SecurityError', 'PermissionDeniedError'])('%s -> denied (iframe)', (name) => {
    expect(describeMediaError('camera', err(name), frame)).toEqual({
      status: 'denied',
      message: 'Camera access is blocked for this embedded page. Open the app in its own tab to use gestures.',
    })
  })

  it.each(['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'])('%s -> unavailable', (name) => {
    for (const ctx of [web, frame]) {
      expect(describeMediaError('camera', err(name), ctx)).toEqual({
        status: 'unavailable',
        message: 'No camera found. You can still cook with taps, keys or voice.',
      })
    }
  })

  it.each(['NotReadableError', 'TrackStartError', 'AbortError'])('%s -> busy error', (name) => {
    expect(describeMediaError('camera', err(name), web)).toEqual({
      status: 'error',
      message: 'The camera is busy in another app or tab. Close it there, then try again.',
    })
  })

  it('UnsupportedError -> unavailable', () => {
    expect(describeMediaError('camera', err('UnsupportedError'), web)).toEqual({
      status: 'unavailable',
      message: "This browser can't use the camera here. Try Chrome, Edge or Safari over HTTPS.",
    })
  })

  it('ModelLoadError -> error', () => {
    expect(describeMediaError('camera', err('ModelLoadError'), web)).toEqual({
      status: 'error',
      message: "The gesture model couldn't load. Check your connection and try again.",
    })
  })

  it.each([
    ['unknown error name', err('WeirdError')],
    ['plain string', 'nope'],
    ['null', null],
    ['undefined', undefined],
    ['empty object', {}],
  ])('%s -> generic error', (_label, value) => {
    expect(describeMediaError('camera', value, web)).toEqual({
      status: 'error',
      message: 'Gestures stopped unexpectedly. Try turning them off and on again.',
    })
  })

  it('matches on the name of a DOMException', () => {
    expect(describeMediaError('camera', new DOMException('x', 'NotAllowedError'), web).status).toBe('denied')
    expect(describeMediaError('camera', new DOMException('x', 'NotFoundError'), web).status).toBe('unavailable')
  })

  it('matches on name, not on message text', () => {
    const e = Object.assign(new Error('NotAllowedError'), { name: 'WeirdError' })
    expect(describeMediaError('camera', e, web).status).toBe('error')
  })
})

describe('describeMediaError (microphone)', () => {
  it('denied, own tab and iframe', () => {
    expect(describeMediaError('microphone', err('NotAllowedError'), web)).toEqual({
      status: 'denied',
      message: "Microphone access was blocked. Allow the microphone in your browser's site settings, then try again.",
    })
    expect(describeMediaError('microphone', err('NotAllowedError'), frame)).toEqual({
      status: 'denied',
      message: 'Microphone access is blocked for this embedded page. Open the app in its own tab to use voice.',
    })
  })

  it.each(['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'])('%s -> no microphone', (name) => {
    expect(describeMediaError('microphone', err(name), web)).toEqual({
      status: 'unavailable',
      message: 'No microphone found. You can still cook with taps, keys or gestures.',
    })
  })

  it.each(['NotReadableError', 'TrackStartError', 'AbortError'])('%s -> busy error', (name) => {
    expect(describeMediaError('microphone', err(name), web)).toEqual({
      status: 'error',
      message: 'The microphone is busy in another app or tab. Close it there, then try again.',
    })
  })

  it('UnsupportedError -> unavailable with the voice text', () => {
    expect(describeMediaError('microphone', err('UnsupportedError'), web)).toEqual({
      status: 'unavailable',
      message: 'Voice commands need Chrome, Edge or Safari.',
    })
  })

  it('ModelLoadError never applies to the microphone: generic error about voice, not gestures', () => {
    const p = describeMediaError('microphone', err('ModelLoadError'), web)
    expect(p.status).toBe('error')
    expect(p.message).not.toMatch(/model/i)
    expect(p.message).not.toMatch(/gesture/i)
    expect(p.message).toMatch(/voice/i)
    expect(p.message).toMatch(/stopped unexpectedly/)
  })
})

describe('describeSpeechError', () => {
  it.each(['no-speech', 'aborted'])('%s is not a problem', (code) => {
    expect(describeSpeechError(code, web)).toBeNull()
    expect(describeSpeechError(code, frame)).toBeNull()
  })

  it('not-allowed matches the microphone NotAllowedError text', () => {
    for (const ctx of [web, frame]) {
      expect(describeSpeechError('not-allowed', ctx)).toEqual(describeMediaError('microphone', { name: 'NotAllowedError' }, ctx))
    }
  })

  it('service-not-allowed', () => {
    expect(describeSpeechError('service-not-allowed', web)).toEqual({
      status: 'denied',
      message: 'Voice recognition is turned off in this browser. Use taps, keys or gestures instead.',
    })
  })

  it('audio-capture matches the microphone NotFoundError text', () => {
    expect(describeSpeechError('audio-capture', web)).toEqual(describeMediaError('microphone', { name: 'NotFoundError' }, web))
  })

  it('network', () => {
    expect(describeSpeechError('network', web)).toEqual({
      status: 'error',
      message: 'Voice recognition needs an internet connection. Reconnect, then turn voice on again.',
    })
  })

  it('language-not-supported', () => {
    expect(describeSpeechError('language-not-supported', web)).toEqual({
      status: 'unavailable',
      message: "Voice recognition doesn't support English here.",
    })
  })

  it.each(['bad-grammar', 'something-new', ''])('unknown code %j -> generic error', (code) => {
    expect(describeSpeechError(code, web)).toEqual({
      status: 'error',
      message: 'Voice commands stopped unexpectedly. Try turning them off and on again.',
    })
  })
})
