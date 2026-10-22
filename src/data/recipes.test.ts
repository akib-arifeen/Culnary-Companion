/// <reference types="node" />
/**
 * Product-truth gate for recipe content (DESIGN.md § Content rules). These tests encode
 * "no invented data": every timer must be backed by a time the step text states, every photo
 * must exist and carry a free licence and a creator credit, every recipe must cite its exact
 * Wikibooks revision. Fix the DATA when this fails, never the test.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { recipes, getRecipeById } from './recipes'

const PUBLIC = join(process.cwd(), 'public')
const COMMAND_WORDS = ['next', 'back', 'stop', 'repeat', 'again', 'help', 'timer', 'steps', 'ingredients', 'pause', 'start', 'reset']
const ALLOWED_PHOTO_LICENSE = /^(CC0( 1\.0)?|Public domain|CC BY(-SA)? \d\.\d)$/i

function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
}

/** Minutes stated in an instruction: "20 minutes" -> 20, "5–7 minutes" -> 7, "1 hour" -> 60, "1½ hours" not handled (none expected). */
function statedMinutes(text: string): number[] {
  const out: number[] = []
  const re = /(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(minutes?|mins?|hours?|hrs?)\b/gi
  for (const m of text.matchAll(re)) {
    const n = Number(m[2] ?? m[1])
    out.push(/^h/i.test(m[3]) ? n * 60 : n)
  }
  if (/\bhalf an hour\b/i.test(text)) out.push(30)
  if (/\b(an|one) hour\b/i.test(text)) out.push(60)
  return out
}

describe('recipe content (product truth)', () => {
  it('has a real collection of 8 to 12 recipes', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(8)
    expect(recipes.length).toBeLessThanOrEqual(12)
  })

  it('uses unique slug ids that getRecipeById resolves', () => {
    const ids = recipes.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of recipes) {
      expect(r.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(getRecipeById(r.id)).toBe(r)
    }
  })

  it.each(recipes.map((r) => [r.id, r] as const))('%s: cites its exact Wikibooks revision under CC BY-SA 4.0', (_id, r) => {
    expect(r.source.url).toMatch(/^https:\/\/en\.wikibooks\.org\/wiki\/Cookbook:/)
    expect(r.source.page).toMatch(/^Cookbook:/)
    expect(r.source.revisionUrl).toMatch(/^https:\/\/en\.wikibooks\.org\/w\/index\.php\?.*oldid=\d+/)
    expect(r.source.license).toBe('CC BY-SA 4.0')
    expect(r.source.licenseUrl).toBe('https://creativecommons.org/licenses/by-sa/4.0/')
    expect(r.source.changes.trim().length).toBeGreaterThan(10)
    expect(r.source.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it.each(recipes.map((r) => [r.id, r] as const))('%s: has a self-hosted, freely licensed, credited photo', (_id, r) => {
    expect(r.photo.src).toMatch(/^\/recipes\/[a-z0-9-]+\.webp$/)
    expect(existsSync(join(PUBLIC, r.photo.src))).toBe(true)
    expect(r.photo.width).toBeGreaterThan(0)
    expect(r.photo.height).toBeGreaterThan(0)
    expect(r.photo.alt.trim().length).toBeGreaterThan(8)
    expect(r.photo.filePage).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    expect(r.photo.author.trim().length).toBeGreaterThan(0)
    expect(r.photo.author).not.toMatch(/[<>]/)
    expect(r.photo.license).toMatch(ALLOWED_PHOTO_LICENSE)
  })

  it.each(recipes.map((r) => [r.id, r] as const))('%s: steps are numbered 1..n, readable aloud, and timers are stated by the text', (_id, r) => {
    expect(r.steps.length).toBeGreaterThanOrEqual(4)
    r.steps.forEach((step, i) => {
      expect(step.stepNumber).toBe(i + 1)
      expect(step.instruction.trim().length).toBeGreaterThan(0)
      expect(step.instruction.length).toBeLessThanOrEqual(200)
      if (step.duration !== undefined) {
        expect(Number.isInteger(step.duration) && step.duration >= 1 && step.duration <= 180).toBe(true)
        const stated = statedMinutes(step.instruction)
        expect(stated, `step ${step.stepNumber} has a ${step.duration}-minute timer but its text states no time: "${step.instruction}"`).not.toHaveLength(0)
        expect(stated, `step ${step.stepNumber} timer ${step.duration} min doesn't match the stated time`).toContain(step.duration)
      }
    })
  })

  it.each(recipes.map((r) => [r.id, r] as const))('%s: ingredient names are distinct, matchable and never a voice command', (_id, r) => {
    expect(r.ingredients.length).toBeGreaterThan(0)
    const names = r.ingredients.map((i) => tokens(i.name).join(' '))
    expect(new Set(names).size).toBe(names.length)
    names.forEach((a, i) => {
      expect(a.length).toBeGreaterThan(0)
      expect(COMMAND_WORDS).not.toContain(a)
      names.forEach((b, j) => {
        if (i !== j) expect(` ${b} `.includes(` ${a} `), `"${a}" is contained in "${b}"`).toBe(false)
      })
    })
  })

  it('carries no invented fields', () => {
    for (const r of recipes) {
      expect(r).not.toHaveProperty('difficulty')
      expect(r).not.toHaveProperty('rating')
      expect(r.summary.length).toBeLessThanOrEqual(280)
    }
  })
})
