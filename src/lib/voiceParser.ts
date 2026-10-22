import type { Command } from './commands'

export interface VoiceContext {
  /** Ingredient names of the current recipe, e.g. ["Chicken breast", "Garlic", "Coconut milk"]. */
  ingredientNames: readonly string[]
}

// ---------------------------------------------------------------------------
// Tokenising helpers
// ---------------------------------------------------------------------------

/** Lowercase, drop apostrophes ("i've" -> "ive"), turn every other non-alphanumeric run into a space. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

/** True when `phrase` (space separated) occurs in `tokens` as a contiguous run of whole words. */
function hasPhrase(tokens: readonly string[], phrase: string): boolean {
  return indexOfPhrase(tokens, phrase.split(' ')) >= 0
}

function indexOfPhrase(tokens: readonly string[], words: readonly string[]): number {
  for (let i = 0; i + words.length <= tokens.length; i++) {
    if (words.every((w, j) => tokens[i + j] === w)) return i
  }
  return -1
}

function hasAny(tokens: readonly string[], phrases: readonly string[]): boolean {
  return phrases.some((p) => hasPhrase(tokens, p))
}

const LEADING_FILLERS = [
  'okay', 'ok', 'um', 'uh', 'hey', 'please', 'now', 'just',
  'can you', 'could you', 'would you', 'will you',
]
const TRAILING_FILLERS = ['please', 'now']

/** Strip filler words from both ends so "okay pause please" is bare "pause". */
function stripFillers(tokens: readonly string[]): string[] {
  let out = [...tokens]
  let changed = true
  while (changed) {
    changed = false
    for (const f of LEADING_FILLERS) {
      const words = f.split(' ')
      if (out.length > words.length && words.every((w, i) => out[i] === w)) {
        out = out.slice(words.length)
        changed = true
      }
    }
    for (const f of TRAILING_FILLERS) {
      if (out.length > 1 && out[out.length - 1] === f) {
        out = out.slice(0, -1)
        changed = true
      }
    }
  }
  return out
}

function isBare(core: readonly string[], ...phrases: string[]): boolean {
  return phrases.some((p) => core.join(' ') === p)
}

// ---------------------------------------------------------------------------
// Numbers and durations
// ---------------------------------------------------------------------------

const ONES: Readonly<Record<string, number>> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
}
const TENS: Readonly<Record<string, number>> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}
const UNIT_SECONDS: Readonly<Record<string, number>> = {
  hour: 3600, hours: 3600, hr: 3600, hrs: 3600,
  minute: 60, minutes: 60, min: 60, mins: 60,
  second: 1, seconds: 1, sec: 1, secs: 1,
}

/** Number (digits or words) starting at tokens[i], with how many tokens it used. "to"/"too"/"for" are not numbers. */
function numberAt(tokens: readonly string[], i: number): { value: number; len: number } | null {
  const t = tokens[i]
  if (t === undefined) return null
  if (/^\d{1,6}$/.test(t)) return { value: parseInt(t, 10), len: 1 }
  if (t in ONES) return { value: ONES[t], len: 1 }
  if (t in TENS) {
    const next = tokens[i + 1]
    if (next !== undefined && next in ONES && ONES[next] < 10) return { value: TENS[t] + ONES[next], len: 2 }
    return { value: TENS[t], len: 1 }
  }
  return null
}

/** Pre-normalised text: "7min" -> "7 min", and the idiomatic hour fractions spelled out in minutes. */
function durationTokens(text: string): string[] {
  const spaced = tokenize(text)
    .join(' ')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/\b(?:an|one|1) hours? and (?:a )?half\b/g, '90 minutes')
    .replace(/\bone and a half hours?\b/g, '90 minutes')
    .replace(/\b(?:a )?half (?:an |a )?hour\b/g, '30 minutes')
  return spaced.split(' ').filter(Boolean)
}

/** Sum of every "<number> <unit>" pair, in whole minutes (rounded up); with allowBare, a lone number means minutes. */
function parseDuration(tokens: readonly string[], allowBare: boolean, allowArticle: boolean): number | null {
  let seconds = 0
  let found = false
  for (let i = 0; i < tokens.length; i++) {
    let value: number
    let len: number
    if (allowArticle && (tokens[i] === 'a' || tokens[i] === 'an') && tokens[i + 1] in UNIT_SECONDS) {
      value = 1
      len = 1
    } else {
      const n = numberAt(tokens, i)
      if (!n) continue
      value = n.value
      len = n.len
    }
    const unit = UNIT_SECONDS[tokens[i + len] ?? '']
    if (unit === undefined) continue
    seconds += value * unit
    found = true
    i += len
  }
  let minutes: number
  if (found) {
    minutes = Math.ceil(seconds / 60)
  } else if (allowBare) {
    let bare: number | null = null
    for (let i = 0; i < tokens.length && bare === null; i++) bare = numberAt(tokens, i)?.value ?? null
    if (bare === null) return null
    minutes = bare
  } else {
    return null
  }
  return minutes >= 1 && minutes <= 180 ? minutes : null
}

function hasDurationUnit(tokens: readonly string[]): boolean {
  return tokens.some((t) => t in UNIT_SECONDS) || hasPhrase(tokens, 'half hour') || hasPhrase(tokens, 'half an hour')
}

// ---------------------------------------------------------------------------
// Rule table — ORDER IS THE PRIORITY ORDER from the doc comment above (first hit wins).
// ---------------------------------------------------------------------------

interface ParseInput {
  /** Raw transcript, trimmed. */
  raw: string
  tokens: string[]
  /** tokens without "the", so "pause the timer" matches "pause timer". */
  bare: string[]
  /** tokens with leading/trailing filler words stripped. */
  core: string[]
  ctx: VoiceContext
}

type Rule = (input: ParseInput) => Command | null

const ARTICLES = new Set(['the', 'a', 'an', 'some'])
const PRONOUNS = new Set(['it', 'that', 'this', 'them', 'those', 'these'])

function ingredientQuery(rest: readonly string[]): string | null {
  let words = [...rest]
  while (words.length > 0 && ARTICLES.has(words[0])) words = words.slice(1)
  return words.length > 0 && !words.every((w) => PRONOUNS.has(w)) ? words.join(' ') : null
}

const RULES: readonly Rule[] = [
  // 1. Timer phrases.
  ({ raw, bare, core }) => {
    const tokens = durationTokens(raw)
    const hasTimerWord = bare.includes('timer') || bare.includes('timers')
    if (hasTimerWord) {
      const noArticles = bare.filter((t) => t !== 'a' && t !== 'an')
      if (
        hasAny(noArticles, [
          'cancel timer', 'remove timer', 'delete timer', 'clear timer', 'dismiss timer', 'turn off timer', 'turn timer off',
        ])
      ) {
        return { type: 'cancelTimer' }
      }
      if (hasAny(bare, ['pause timer', 'stop timer', 'hold timer'])) return { type: 'pauseTimer' }
      if (hasAny(bare, ['resume timer', 'continue timer'])) return { type: 'resumeTimer' }
      if (hasAny(bare, ['reset timer', 'restart timer'])) return { type: 'resetTimer' }
      if (bare.includes('timers') || hasAny(bare, ['show timer', 'open timer'])) return { type: 'showTab', tab: 'timers' }
    }
    if (hasTimerWord || hasDurationUnit(tokens)) {
      const minutes = parseDuration(tokens, hasTimerWord, hasTimerWord)
      if (minutes !== null) return { type: 'startTimer', minutes }
    }
    if (hasTimerWord) return { type: 'startTimer' }
    if (isBare(core, 'reset', 'restart')) return { type: 'resetTimer' }
    if (isBare(core, 'pause', 'hold on')) return { type: 'pauseTimer' }
    if (isBare(core, 'resume', 'start')) return { type: 'resumeTimer' }
    return null
  },
  // 2. Uncheck all.
  ({ tokens }) =>
    hasAny(tokens, ['uncheck all', 'untick all', 'clear all', 'uncheck everything']) ? { type: 'checkAll', checked: false } : null,
  // 3. Check all.
  ({ tokens }) =>
    hasAny(tokens, ['check all', 'tick all', 'check everything', 'got everything']) ? { type: 'checkAll', checked: true } : null,
  // 4. Check / uncheck one ingredient.
  ({ core }) => {
    const prefixes: ReadonlyArray<[string, boolean]> = [
      ['uncheck', false],
      ['untick', false],
      ['remove', false],
      ['check', true],
      ['tick', true],
      ['ive got', true],
      ['i have', true],
      ['got', true],
    ]
    for (const [prefix, checked] of prefixes) {
      const words = prefix.split(' ')
      if (core.length > words.length && words.every((w, i) => core[i] === w)) {
        const query = ingredientQuery(core.slice(words.length))
        if (query !== null) return { type: 'checkIngredient', query, checked }
      }
    }
    return null
  },
  // 5. Go to step N.
  ({ tokens }) => {
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i] !== 'step') continue
      const n = numberAt(tokens, i + 1)
      if (n && n.value >= 1) return { type: 'goToStep', step: n.value }
    }
    return null
  },
  // 6. Tabs.
  ({ tokens }) => {
    if (hasAny(tokens, ['ingredients', 'ingredient list', 'what do i need'])) return { type: 'showTab', tab: 'ingredients' }
    if (hasAny(tokens, ['instructions', 'method'])) return { type: 'showTab', tab: 'steps' }
    // "next steps" / "previous steps" are navigation, not the steps tab.
    if (tokens.some((t, i) => t === 'steps' && tokens[i - 1] !== 'next' && tokens[i - 1] !== 'previous')) {
      return { type: 'showTab', tab: 'steps' }
    }
    return null
  },
  // 7. Help.
  ({ tokens }) => (hasAny(tokens, ['help', 'what can i say', 'commands']) ? { type: 'help' } : null),
  // 8. Repeat.
  ({ tokens }) =>
    hasAny(tokens, ['repeat', 'again', 'say that again', 'read it again', 'what was that', 'pardon', 'come again']) ? { type: 'repeat' } : null,
  // 9. Stop speaking.
  ({ tokens }) => (hasAny(tokens, ['stop', 'quiet', 'shush', 'silence', 'enough']) ? { type: 'stopSpeaking' } : null),
  // 10. Next.
  ({ tokens }) => (hasAny(tokens, ['next', 'continue', 'go on', 'forward']) ? { type: 'next' } : null),
  // 11. Previous.
  ({ tokens }) => (hasAny(tokens, ['back', 'previous', 'last step']) ? { type: 'previous' } : null),
  // 12. Bare ingredient name.
  ({ raw, ctx }) => (matchIngredient(raw, ctx.ingredientNames) !== null ? { type: 'checkIngredient', query: raw } : null),
]

/**
 * Turn one final speech transcript into a command, or null if nothing matches.
 *
 * Normalisation: lowercase, punctuation stripped, whitespace collapsed. Matching is
 * by WHOLE WORDS / whole phrases only — "background" must never match "back",
 * "restarting" must never match "start".
 *
 * Rules, checked in this priority order (first hit wins):
 *  1. Timer phrases (anything containing the word "timer", or a duration):
 *     - "pause timer" | "stop timer" | "pause the timer" | "hold timer"       -> pauseTimer
 *     - "resume timer" | "continue timer" | "resume the timer"                -> resumeTimer
 *     - "reset timer" | "restart timer" | "reset the timer" | "restart"       -> resetTimer
 *       (bare "reset" and bare "restart" also -> resetTimer)
 *     - "cancel timer" | "remove timer" | "delete timer" | "clear timer" | "dismiss timer" |
 *       "turn off timer" | "turn the timer off" (the/a allowed anywhere)      -> cancelTimer
 *     - "show timer(s)" | "open timer(s)" | "timers"                          -> showTab timers
 *     - any phrase with a duration: "timer for 7 minutes", "set a timer for ten minutes",
 *       "5 minute timer", "seven minutes", "set timer 3", "half an hour", "timer for an hour",
 *       "90 seconds" (rounded UP to whole minutes, min 1)                      -> startTimer { minutes }
 *     - "timer" | "set a timer" | "start a timer" | "start timer" | "start the timer" (no duration)
 *                                                                              -> startTimer {}
 *     - bare "pause" | "hold on"                                              -> pauseTimer
 *     - bare "resume" | bare "start"                                          -> resumeTimer
 *     A bare number with no unit and no "timer" word ("five", "5") is NOT a duration -> null.
 *     "a"/"an" as the quantity ("a minute", "an hour", "a second") counts ONLY when the word "timer"
 *     is present, so everyday phrases like "just a minute", "wait a second", "give me an hour"
 *     are NOT timers (-> fall through to later rules, usually null). "half an hour" and
 *     "an hour and a half" still count without "timer" (they are unambiguous requests).
 *  2. "uncheck all" | "untick all" | "clear all" | "uncheck everything"       -> checkAll false
 *  3. "check all" | "tick all" | "check everything" | "got everything"        -> checkAll true
 *  4. "uncheck X" | "untick X" | "remove X"                                   -> checkIngredient { query: X, checked: false }
 *     "check X" | "tick X" | "got X" | "i have X" | "i've got X"              -> checkIngredient { query: X, checked: true }
 *     (X = the rest of the phrase with leading articles "the/a/an/some" removed; X must be non-empty and
 *     must not be only a pronoun — "got it", "check that", "remove this", "got them" fall through, e.g. to null)
 *  5. "step N" | "go to step N" | "jump to step N" (N digits or number words, >= 1) -> goToStep { step: N }
 *  6. "ingredients" | "show ingredients" | "ingredient list" | "what do i need" -> showTab ingredients
 *     "steps" | "show steps" | "instructions" | "method" | "back to steps" | "go back to steps" -> showTab steps
 *     (but "next steps" / "previous steps" are speech-engine variants of "next step" -> not a tab; fall through)
 *  7. "help" | "what can i say" | "commands" | "show help"                     -> help
 *  8. "repeat" | "again" | "say again" | "say that again" | "read again" | "read it again" |
 *     "what was that" | "pardon" | "come again"                              -> repeat
 *  9. "stop" | "quiet" | "be quiet" | "shush" | "stop talking" | "silence" | "enough" -> stopSpeaking
 * 10. "next" | "next step" | "continue" | "go on" | "forward" | "go forward" | "okay next" | "ok next" -> next
 * 11. "back" | "go back" | "previous" | "previous step" | "last step" | "step back" -> previous
 * 12. A bare ingredient name: if `matchIngredient(transcript, ctx.ingredientNames)` finds one
 *                                                                              -> checkIngredient { query: transcript }
 * Otherwise null. Filler words around a command are tolerated: "okay next please",
 * "can you go back", "um next step" still match (rules 7-11 match the phrase anywhere
 * as whole words). Empty / whitespace-only input -> null.
 */
export function parseVoiceCommand(transcript: string, ctx: VoiceContext): Command | null {
  const tokens = tokenize(transcript)
  if (tokens.length === 0) return null
  const input: ParseInput = {
    raw: transcript.trim(),
    tokens,
    bare: tokens.filter((t) => t !== 'the'),
    core: stripFillers(tokens),
    ctx,
  }
  for (const rule of RULES) {
    const command = rule(input)
    if (command) return command
  }
  return null
}

/**
 * Parse a duration in whole minutes from free text, or null.
 * Accepts digits ("7", "7 min", "7 minutes", "7min"), number words one..twenty, thirty,
 * forty, forty five / forty-five, fifty, sixty, ninety; "a minute" / "one minute" = 1;
 * "half an hour" = 30; "an hour" / "one hour" = 60; "an hour and a half" = 90;
 * "N hours" = N*60; "N seconds" = ceil(N/60) (min 1).
 * Homophones from speech engines: "to"/"too" are NOT numbers, "for" is NOT a number.
 * Valid range 1..180; anything outside -> null.
 */
export function parseMinutes(text: string): number | null {
  return parseDuration(durationTokens(text), true, true)
}

/**
 * Resolve a spoken ingredient query to an index in `names`, or null.
 * Tokenise both sides (lowercase, strip punctuation), drop stop words
 * (the, a, an, some, of, and, my, i, have, got), singularise tokens longer than 3
 * chars ending in "s" ("tomatoes" ~ "tomato", "cloves" ~ "clove", "eggs" ~ "egg").
 * A name matches when every remaining query token appears in the name's tokens.
 * Best match = fewest extra name tokens; ties -> lowest index. Query with no
 * remaining tokens -> null.
 * Examples: "chicken" -> "Chicken breast"; "tomatoes" -> "Tomatoes"; "coconut milk" -> "Coconut milk";
 * "milk" with ["Coconut milk", "Milk"] -> "Milk".
 */
const STOP_WORDS = new Set(['the', 'a', 'an', 'some', 'of', 'and', 'my', 'i', 'have', 'got'])

function ingredientTokens(text: string): Set<string> {
  const out = new Set<string>()
  for (const raw of tokenize(text)) {
    if (STOP_WORDS.has(raw)) continue
    let t = raw
    if (t.length > 3 && t.endsWith('s')) t = t.endsWith('oes') ? t.slice(0, -2) : t.slice(0, -1)
    out.add(t)
  }
  return out
}

export function matchIngredient(query: string, names: readonly string[]): number | null {
  const wanted = ingredientTokens(query)
  if (wanted.size === 0) return null
  let best: number | null = null
  let bestExtra = Infinity
  names.forEach((name, index) => {
    const have = ingredientTokens(name)
    for (const t of wanted) if (!have.has(t)) return
    const extra = have.size - wanted.size
    if (extra < bestExtra) {
      best = index
      bestExtra = extra
    }
  })
  return best
}
