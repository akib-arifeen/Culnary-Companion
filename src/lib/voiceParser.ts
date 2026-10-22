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

function indexOfPhrase(tokens: readonly string[], words: readonly string[]): number {
  for (let i = 0; i + words.length <= tokens.length; i++) {
    if (words.every((w, j) => tokens[i + j] === w)) return i
  }
  return -1
}

const LEADING_FILLERS = [
  'okay', 'ok', 'um', 'uh', 'hey', 'please', 'now', 'just', 'so', 'and',
  'can you', 'could you', 'would you', 'will you',
]
const TRAILING_FILLERS = ['please', 'now', 'then']

/** Strip filler words from both ends so "okay pause please" is "pause". */
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

/** core = fillers stripped from both ends, then the/a/an removed. */
function toCore(tokens: readonly string[]): string[] {
  return stripFillers(tokens).filter((t) => t !== 'the' && t !== 'a' && t !== 'an')
}

function isBare(core: readonly string[], ...phrases: string[]): boolean {
  return phrases.some((p) => core.join(' ') === p)
}

/** COMMAND-SHAPED: core contains the phrase as whole words AND has at most one stray extra word. */
function shaped(core: readonly string[], ...phrases: string[]): boolean {
  return phrases.some((p) => {
    const words = p.split(' ')
    return core.length <= words.length + 1 && indexOfPhrase(core, words) >= 0
  })
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

interface DurationScan {
  /** At least one quantity was recognised. */
  found: boolean
  /** Whole minutes, or null when nothing was found or the total is outside 1..180. */
  minutes: number | null
  /** How many tokens the quantities (plus joining "and"s) account for. */
  consumed: number
}

/**
 * Sum of every "<quantity> <unit>" pair ("<N> and a half <unit>" included), rounded UP to whole minutes.
 * With allowBare a lone number means minutes; with allowArticle "a/an <unit>" means 1.
 */
function scanDuration(tokens: readonly string[], allowBare: boolean, allowArticle: boolean): DurationScan {
  let seconds = 0
  let found = false
  let consumed = 0
  for (let i = 0; i < tokens.length; i++) {
    let value: number
    let len: number
    if (allowArticle && (tokens[i] === 'a' || tokens[i] === 'an') && tokens[i + 1] in UNIT_SECONDS) {
      value = 1
      len = 1
    } else {
      const n = numberAt(tokens, i)
      if (!n) {
        if (found && tokens[i] === 'and') consumed++
        continue
      }
      value = n.value
      len = n.len
      if (tokens[i + len] === 'and' && tokens[i + len + 1] === 'a' && tokens[i + len + 2] === 'half') {
        if (tokens[i + len + 3] in UNIT_SECONDS) {
          value += 0.5
          len += 3
        }
      }
    }
    const unit = UNIT_SECONDS[tokens[i + len] ?? '']
    if (unit === undefined) continue
    seconds += value * unit
    found = true
    consumed += len + 1
    i += len
  }
  if (found) {
    const minutes = Math.ceil(seconds / 60)
    return { found, minutes: minutes >= 1 && minutes <= 180 ? minutes : null, consumed }
  }
  if (allowBare) {
    for (let i = 0; i < tokens.length; i++) {
      const n = numberAt(tokens, i)
      if (n) return { found: true, minutes: n.value >= 1 && n.value <= 180 ? n.value : null, consumed: 0 }
    }
  }
  return { found: false, minutes: null, consumed: 0 }
}

// ---------------------------------------------------------------------------
// Rule table — ORDER IS THE PRIORITY ORDER from the doc comment below (first hit wins).
// ---------------------------------------------------------------------------

interface ParseInput {
  /** Raw transcript, trimmed. */
  raw: string
  tokens: string[]
  /** Fillers stripped, the/a/an removed. */
  core: string[]
  /** core with the timer determiners that/this/my/our also removed. */
  timerCore: string[]
  ctx: VoiceContext
}

type Rule = (input: ParseInput) => Command | null

const PRONOUNS = new Set(['it', 'that', 'this', 'them', 'those', 'these'])

/** The rest of core as an ingredient query: non-empty and not only pronouns. */
function ingredientQuery(rest: readonly string[]): string | null {
  const words = rest[0] === 'some' ? rest.slice(1) : rest
  return words.length > 0 && !words.every((w) => PRONOUNS.has(w)) ? words.join(' ') : null
}

const AMBIGUOUS_VERBS: ReadonlyArray<[string, boolean]> = [
  ['remove', false],
  ['ive got', true],
  ['i have', true],
  ['got', true],
]

const RULES: readonly Rule[] = [
  // 1. Timers.
  ({ raw, tokens, core, timerCore }) => {
    if (shaped(timerCore, 'pause timer', 'stop timer', 'hold timer')) return { type: 'pauseTimer' }
    if (shaped(timerCore, 'resume timer', 'continue timer')) return { type: 'resumeTimer' }
    if (shaped(timerCore, 'reset timer', 'restart timer') || isBare(core, 'reset', 'restart')) return { type: 'resetTimer' }
    if (
      shaped(timerCore, 'cancel timer', 'remove timer', 'delete timer', 'clear timer', 'dismiss timer', 'turn off timer', 'turn timer off')
    ) {
      return { type: 'cancelTimer' }
    }
    if (shaped(timerCore, 'show timer', 'show timers', 'open timer', 'open timers') || isBare(core, 'timers')) {
      return { type: 'showTab', tab: 'timers' }
    }

    const hasTimerWord = tokens.includes('timer') || tokens.includes('timers')
    const dtokens = durationTokens(raw)
    if (hasTimerWord) {
      const scan = scanDuration(dtokens, true, true)
      if (scan.found) return scan.minutes !== null ? { type: 'startTimer', minutes: scan.minutes } : null
      if (shaped(timerCore, 'timer', 'set timer', 'start timer', 'new timer', 'step timer')) return { type: 'startTimer' }
      return null
    }
    // No "timer" word: only when the whole utterance is the duration.
    const dcore = stripFillers(dtokens)
    const scan = scanDuration(dcore, false, false)
    if (scan.found && scan.consumed === dcore.length && scan.minutes !== null) {
      return { type: 'startTimer', minutes: scan.minutes }
    }

    if (isBare(core, 'pause', 'hold on')) return { type: 'pauseTimer' }
    if (isBare(core, 'resume', 'start')) return { type: 'resumeTimer' }
    return null
  },
  // 2. Uncheck all.
  ({ core }) =>
    shaped(core, 'uncheck all', 'untick all', 'clear all', 'uncheck everything') ? { type: 'checkAll', checked: false } : null,
  // 3. Check all.
  ({ core }) =>
    shaped(core, 'check all', 'tick all', 'check everything', 'got everything') ? { type: 'checkAll', checked: true } : null,
  // 4. Check / uncheck one ingredient.
  ({ core, ctx }) => {
    const explicit: ReadonlyArray<[string, boolean]> = [
      ['uncheck', false],
      ['untick', false],
      ['check', true],
      ['tick', true],
    ]
    for (const [verb, checked] of explicit) {
      if (core.length > 1 && core[0] === verb) {
        const query = ingredientQuery(core.slice(1))
        if (query !== null) return { type: 'checkIngredient', query, checked }
      }
    }
    for (const [prefix, checked] of AMBIGUOUS_VERBS) {
      const words = prefix.split(' ')
      if (core.length > words.length && words.every((w, i) => core[i] === w)) {
        const query = ingredientQuery(core.slice(words.length))
        if (query !== null && matchIngredient(query, ctx.ingredientNames) !== null) {
          return { type: 'checkIngredient', query, checked }
        }
      }
    }
    return null
  },
  // 5. Go to step N.
  ({ core }) => {
    for (const prefix of [['step'], ['go', 'to', 'step'], ['jump', 'to', 'step'], ['show', 'step']]) {
      if (!prefix.every((w, i) => core[i] === w)) continue
      const n = numberAt(core, prefix.length)
      if (n && n.value >= 1 && core.length - prefix.length - n.len <= 1) return { type: 'goToStep', step: n.value }
    }
    return null
  },
  // 6. Tabs.
  ({ core }) => {
    if (shaped(core, 'ingredients', 'show ingredients', 'show me ingredients', 'ingredient list', 'what do i need')) {
      return { type: 'showTab', tab: 'ingredients' }
    }
    // "next steps" / "previous steps" are speech-engine variants of "next step", not the steps tab.
    if (!shaped(core, 'next steps', 'previous steps')) {
      if (shaped(core, 'steps', 'show steps', 'show me steps', 'instructions', 'method', 'back to steps', 'go back to steps')) {
        return { type: 'showTab', tab: 'steps' }
      }
    }
    return null
  },
  // 7. Help.
  ({ core }) => (shaped(core, 'help', 'what can i say', 'commands', 'show help') ? { type: 'help' } : null),
  // 8. Repeat.
  ({ core }) =>
    shaped(core, 'repeat', 'again', 'say again', 'say that again', 'read again', 'read it again', 'what was that', 'pardon', 'come again')
      ? { type: 'repeat' }
      : null,
  // 9. Stop speaking.
  ({ core }) =>
    shaped(core, 'stop', 'quiet', 'be quiet', 'shush', 'stop talking', 'silence', 'enough') ? { type: 'stopSpeaking' } : null,
  // 10. Next.
  ({ core }) =>
    shaped(core, 'next', 'next step', 'next steps', 'continue', 'go on', 'forward', 'go forward', 'move on', 'next one', 'go to next step')
      ? { type: 'next' }
      : null,
  // 11. Previous.
  ({ core }) =>
    shaped(core, 'back', 'go back', 'previous', 'previous step', 'previous steps', 'last step', 'step back', 'go back step', 'go to previous step', 'one step back')
      ? { type: 'previous' }
      : null,
  // 12. Bare ingredient name.
  ({ raw, core, ctx }) => (matchIngredient(core.join(' '), ctx.ingredientNames) !== null ? { type: 'checkIngredient', query: raw } : null),
]

/**
 * Turn one final speech transcript into a command, or null if nothing matches.
 *
 * The microphone stays open in a noisy kitchen, so the grammar accepts COMMAND-SHAPED
 * utterances only. A false positive (jumping a step because someone said "put the lid back on")
 * costs more than a miss (the user just says the command again).
 *
 * Normalisation: lowercase, punctuation stripped, whitespace collapsed. Matching is by WHOLE
 * WORDS / whole phrases only — "background" never matches "back", "restarting" never "start".
 * `core` = the tokens with filler stripped from both ends (leading: okay, ok, um, uh, hey, please,
 * now, just, so, and, can you, could you, would you, will you; trailing: please, now, then) and
 * with the determiners the/a/an removed. Duration parsing uses the full token stream (it needs "a").
 * COMMAND-SHAPED for a phrase P means: core contains P as a contiguous run of whole words AND
 * core.length <= P.length + 1 (one stray word allowed: "next one", "go back please" -> "go back").
 *
 * Rules, checked in this priority order (first hit wins):
 *  1. Timers. For these phrases the determiners that/this/my/our are ALSO ignored.
 *     - command-shaped pause|stop|hold timer                         -> pauseTimer
 *     - command-shaped resume|continue timer                         -> resumeTimer
 *     - command-shaped reset|restart timer; bare "reset" / "restart" -> resetTimer
 *     - command-shaped cancel|remove|delete|clear|dismiss timer, "turn off timer", "turn timer off" -> cancelTimer
 *     - command-shaped show|open timer(s); bare "timers"             -> showTab timers
 *     - Durations: "<quantity> <unit>" pairs; quantity = digits, number words (one..nineteen, twenty..ninety,
 *       "forty five"), or "<N> and a half"; unit = hour(s)/hr(s)/minute(s)/min(s)/second(s)/sec(s);
 *       idioms "half an hour" = 30, "an hour and a half" / "one and a half hours" = 90. All pairs are summed,
 *       seconds rounded UP to whole minutes; the total must be 1..180.
 *       * WITH the word "timer" anywhere: "timer for 7 minutes", "set a timer for ten minutes",
 *         "5 minute timer", "set timer 3" (a bare number counts as minutes only together with "timer"),
 *         "set a timer for a minute" ("a/an <unit>" counts only with "timer")      -> startTimer { minutes }
 *         Out of range ("timer for 4 hours", "timer for 0 minutes") -> null, never a default-length timer.
 *       * WITHOUT "timer": only when core is NOTHING BUT the duration ("seven minutes", "5 minutes please",
 *         "half an hour", "ninety seconds")                                           -> startTimer { minutes }
 *         So "i'll be back in 5 minutes", "wait two seconds", "give me one second", "just a minute" are not timers.
 *     - No duration: command-shaped "timer" | "set timer" | "start timer" | "new timer" | "step timer"
 *       -> startTimer {}. Any other utterance mentioning "timer" ("is the timer going", "how long is left
 *       on the timer") -> null.
 *     - bare "pause" | "hold on"                                    -> pauseTimer
 *     - bare "resume" | bare "start"                                -> resumeTimer
 *  2. command-shaped "uncheck all" | "untick all" | "clear all" | "uncheck everything" -> checkAll false
 *  3. command-shaped "check all" | "tick all" | "check everything" | "got everything"  -> checkAll true
 *  4. Ingredient verbs (X = the rest of core; must be non-empty and not only a pronoun:
 *     it, that, this, them, those, these):
 *     - explicit: core starts with "uncheck X" | "untick X" -> checkIngredient { query: X, checked: false };
 *       "check X" | "tick X" -> checkIngredient { query: X, checked: true }. Always returned, even when X is not
 *       an ingredient, so the UI can say "couldn't find X".
 *     - ambiguous: core starts with "remove X" (checked false) or "got X" | "i have X" | "ive got X" (checked true):
 *       returned ONLY when matchIngredient(X, ctx.ingredientNames) finds one; otherwise fall through.
 *  5. core is "step N" | "go to step N" | "jump to step N" | "show step N", optionally plus one more word
 *     (N digits or number words, >= 1)                              -> goToStep { step: N }
 *  6. Tabs (command-shaped):
 *     "ingredients" | "show ingredients" | "show me ingredients" | "ingredient list" | "what do i need"
 *                                                                    -> showTab ingredients
 *     "steps" | "show steps" | "show me steps" | "instructions" | "method" | "back to steps" | "go back to steps"
 *                                                                    -> showTab steps
 *     ("next steps" / "previous steps" are speech-engine variants of "next step" -> not a tab.)
 *  7. command-shaped "help" | "what can i say" | "commands" | "show help"          -> help
 *  8. command-shaped "repeat" | "again" | "say again" | "say that again" | "read again" | "read it again" |
 *     "what was that" | "pardon" | "come again"                     -> repeat
 *  9. command-shaped "stop" | "quiet" | "be quiet" | "shush" | "stop talking" | "silence" | "enough" -> stopSpeaking
 * 10. command-shaped "next" | "next step" | "next steps" | "continue" | "go on" | "forward" | "go forward" |
 *     "move on" | "next one" | "go to next step"                   -> next
 * 11. command-shaped "back" | "go back" | "previous" | "previous step" | "previous steps" | "last step" |
 *     "step back" | "go back a step" | "go to previous step" | "one step back" -> previous
 * 12. Bare ingredient name: matchIngredient(core, ctx.ingredientNames) finds one
 *                                                                    -> checkIngredient { query: raw transcript, trimmed }
 * Otherwise null. Empty / whitespace-only input -> null.
 *
 * Must be null: "put the lid back on", "i'll be right back", "bring it back to a boil", "is this the last step",
 * "it's next to the stove", "add the next ingredient", "is that enough salt", "let me taste it again",
 * "can you help me find the pan", "what do i need to do next", "is the timer going", "i'll be back in 5 minutes",
 * "give me one second", "set a timer for 4 hours", "i have a question", "remove the pan from the heat".
 * Must match: "next", "okay next please", "um next step", "can you go back", "go back please", "say that again",
 * "what can i say", "go to step 3", "go to the next step", "can you pause", "stop the timer", "cancel that timer",
 * "pause my timer", "seven minutes", "5 minutes please", "set a timer for two and a half minutes" (-> 3 minutes).
 */
export function parseVoiceCommand(transcript: string, ctx: VoiceContext): Command | null {
  const tokens = tokenize(transcript)
  if (tokens.length === 0) return null
  const core = toCore(tokens)
  if (core.length === 0) return null
  const input: ParseInput = {
    raw: transcript.trim(),
    tokens,
    core,
    timerCore: core.filter((t) => t !== 'that' && t !== 'this' && t !== 'my' && t !== 'our'),
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
  return scanDuration(durationTokens(text), true, true).minutes
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
