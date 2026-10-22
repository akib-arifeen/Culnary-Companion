/** Short, one-line forms of source-stated servings and time for ticket header strips. Pure; the full strings stay in the body. */

/** Leading number or range of a servings string ("3 (12–14 pancakes)" -> "3"); null when it doesn't start with one. */
export function shortServes(servings?: string): string | null {
  const m = servings?.trim().match(/^(\d+(?:\s*[–-]\s*\d+)?)/)
  return m ? m[1].replace(/\s*[–-]\s*/, '–') : null
}

const AMOUNT = /(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|h|minutes?|mins?)\b/gi

function minutesIn(text: string): number | null {
  let total = 0
  let found = false
  for (const m of text.matchAll(AMOUNT)) {
    const n = parseFloat((m[2] ?? m[1]).replace(',', '.')) // upper bound of a range
    total += /^h/i.test(m[3]) ? n * 60 : n
    found = true
  }
  return found ? Math.round(total) : null
}

/** "32 MIN", "2 HR", "1 HR 20 MIN", "~1 HR 20 MIN"; a stated total wins, otherwise stated amounts are summed. */
export function shortTime(time?: string): string | null {
  if (!time) return null
  const totalAt = time.search(/total\s*:?/i)
  const minutes =
    (totalAt >= 0 ? minutesIn(time.slice(totalAt).replace(/^total\s*:?/i, '')) : null) ?? minutesIn(time)
  if (minutes === null) return null
  const approx = /~|about|approx/i.test(time) ? '~' : ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const body = h === 0 ? `${m} MIN` : m === 0 ? `${h} HR` : `${h} HR ${m} MIN`
  return approx + body
}
