import { useCallback, useRef, useSyncExternalStore } from 'react'

/**
 * localStorage can throw (cross-origin iframes with storage blocked, Safari private mode,
 * quota). Every read/write in the app goes through here so a blocked store degrades to
 * in-memory defaults instead of a white screen.
 */

export const PREF_KEYS = {
  voice: 'cc.voice',
  gestures: 'cc.gestures',
  speakSteps: 'cc.speakSteps',
  cameraPreview: 'cc.cameraPreview',
  onboarded: 'cc.onboarded',
  favorites: 'cc.favorites',
  progress: 'cc.progress',
  /** Pre-cooking shopping list. Separate from the in-session cooking checklist. */
  shoppingList: 'cc.shoppingList',
} as const

export type PrefKey = (typeof PREF_KEYS)[keyof typeof PREF_KEYS]

/** Default values: hands-free inputs are OFF until the user opts in (no surprise permission prompts). */
export const PREF_DEFAULTS = {
  [PREF_KEYS.voice]: false,
  [PREF_KEYS.gestures]: false,
  [PREF_KEYS.speakSteps]: true,
  [PREF_KEYS.cameraPreview]: true,
  [PREF_KEYS.onboarded]: false,
} as const

/** Raw strings that could not be persisted (storage blocked / full); keeps reads in this tab consistent. */
const memory = new Map<string, string>()
/** Parsed-value cache keyed by raw string, so unchanged storage yields the same object (stable snapshot). */
const parsed = new Map<string, { raw: string; value: unknown; ok: boolean }>()
const listeners = new Set<() => void>()

function readRaw(key: string): string | null {
  // A write that could not be persisted is newer than whatever localStorage still holds for that key,
  // so the in-memory copy wins. With nothing in memory, the stored value (or a blocked read) decides.
  const pending = memory.get(key)
  if (pending !== undefined) return pending
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

let windowListening = false
function onStorageEvent(): void {
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!windowListening && typeof window !== 'undefined') {
    window.addEventListener('storage', onStorageEvent)
    windowListening = true
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && windowListening) {
      window.removeEventListener('storage', onStorageEvent)
      windowListening = false
    }
  }
}

/** Returns the parsed JSON value, or `fallback` when missing, unparsable, or storage throws. */
export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key)
  if (raw === null) return fallback
  const hit = parsed.get(key)
  if (hit && hit.raw === raw) return hit.ok ? (hit.value as T) : fallback
  let entry: { raw: string; value: unknown; ok: boolean }
  try {
    entry = { raw, value: JSON.parse(raw), ok: true }
  } catch {
    entry = { raw, value: undefined, ok: false }
  }
  parsed.set(key, entry)
  return entry.ok ? (entry.value as T) : fallback
}

/**
 * Writes JSON; swallows storage errors (keeps an in-memory copy so reads in this tab
 * still see the value). Notifies same-tab subscribers of usePref.
 */
export function writeJSON(key: string, value: unknown): void {
  const raw = JSON.stringify(value) ?? 'null'
  try {
    window.localStorage.setItem(key, raw)
    memory.delete(key)
  } catch {
    memory.set(key, raw)
  }
  notify()
}

/**
 * React hook over readJSON/writeJSON with same-tab AND cross-tab sync
 * (useSyncExternalStore + the window 'storage' event). No polling.
 * The setter accepts a value (not an updater function).
 */
export function usePref<T>(key: string, fallback: T): [T, (value: T) => void] {
  // Pin the first fallback: callers pass fresh literals (`[]`, `{}`) each render, and a changing
  // snapshot would make useSyncExternalStore re-render forever.
  const fallbackRef = useRef(fallback)
  const getSnapshot = useCallback(() => readJSON(key, fallbackRef.current), [key])
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const set = useCallback((next: T) => writeJSON(key, next), [key])
  return [value, set]
}
