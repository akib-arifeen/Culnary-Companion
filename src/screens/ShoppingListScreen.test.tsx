import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREF_KEYS, readJSON } from '../lib/storage'
import type { ShoppingEntry } from '../lib/shoppingList'
import ShoppingListScreen from './ShoppingListScreen'

vi.mock('../data/recipes', async () => (await import('./recipeFixtures')).fixtureModule)

const entry = (recipeId: string, index: number, checked = false): ShoppingEntry => ({ recipeId, index, checked })

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value })
}

function store(entries: ShoppingEntry[]) {
  window.localStorage.setItem(PREF_KEYS.shoppingList, JSON.stringify(entries))
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/shopping']}>
      <Routes>
        <Route path="/shopping" element={<ShoppingListScreen />} />
        <Route path="/recipe/:id" element={<p>recipe screen</p>} />
        <Route path="/" element={<p>home screen</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const THREE_ITEMS = [entry('alpha-stew', 0, true), entry('alpha-stew', 1), entry('beta-toast', 0, true)]

describe('ShoppingListScreen', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    cleanup()
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
    else Reflect.deleteProperty(navigator, 'clipboard')
  })

  it('names the screen and explains an empty list with one way out', () => {
    renderList()
    expect(screen.getByRole('heading', { level: 1, name: 'Shopping list' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Nothing on the list yet' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse recipes' }).getAttribute('href')).toBe('/')
    expect(screen.queryByRole('button', { name: /copy list/i })).toBeNull()
  })

  it('shows each recipe as a ticket with exact names, quantities, notes and checks', () => {
    store(THREE_ITEMS)
    renderList()

    expect(screen.getByRole('heading', { level: 2, name: 'Alpha Stew' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Beta Toast' })).toBeTruthy()
    expect(screen.getByText('400 g')).toBeTruthy()
    expect(screen.getByText('drained')).toBeTruthy()
    expect(screen.getByText('2 slices')).toBeTruthy()
    expect(screen.getByText('2 of 3 checked')).toBeTruthy()
    expect(screen.getByText('2 items')).toBeTruthy()
    expect(screen.getByText('1 item')).toBeTruthy()

    expect((screen.getByRole('checkbox', { name: /Chickpeas.*400 g/ }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: /Salt/ }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('checkbox', { name: /Bread.*2 slices/ }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole('link', { name: 'Alpha Stew' }).getAttribute('href')).toBe('/recipe/alpha-stew')
    expect(screen.getByRole('button', { name: 'Remove Chickpeas, 400 g from the shopping list' })).toBeTruthy()
  })

  it('persists a tick and shows it after a reload', async () => {
    store(THREE_ITEMS)
    renderList()
    await userEvent.click(screen.getByRole('checkbox', { name: /Salt/ }))

    expect(readJSON<ShoppingEntry[]>(PREF_KEYS.shoppingList, [])).toEqual([
      entry('alpha-stew', 0, true),
      entry('alpha-stew', 1, true),
      entry('beta-toast', 0, true),
    ])
    expect(screen.getByText('3 of 3 checked')).toBeTruthy()

    cleanup()
    renderList()
    expect((screen.getByRole('checkbox', { name: /Salt/ }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('3 of 3 checked')).toBeTruthy()
  })

  it('removes one item, persists it, and moves keyboard focus to the next row', async () => {
    store([entry('alpha-stew', 0), entry('alpha-stew', 1)])
    renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Chickpeas, 400 g from the shopping list' }))

    expect(screen.queryByText('Chickpeas')).toBeNull()
    expect(readJSON<ShoppingEntry[]>(PREF_KEYS.shoppingList, [])).toEqual([entry('alpha-stew', 1)])
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: /Salt/ }))
    expect(screen.getByRole('status').textContent).toBe('Removed Chickpeas from the shopping list.')
  })

  it('removes every checked item, persists it, and focuses the heading when rows remain', async () => {
    store(THREE_ITEMS)
    renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Remove checked' }))

    expect(readJSON<ShoppingEntry[]>(PREF_KEYS.shoppingList, [])).toEqual([entry('alpha-stew', 1)])
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Shopping list' }))
    expect(screen.getByText('0 of 1 checked')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Removed 2 checked items.')
  })

  it('copies the plain list exactly when the clipboard is available', async () => {
    store(THREE_ITEMS)
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    renderList()

    await userEvent.click(screen.getByRole('button', { name: /copy list/i }))
    expect(writeText).toHaveBeenCalledWith(
      [
        'SHOPPING LIST',
        'Alpha Stew\n[x] 400 g Chickpeas (drained)\n[ ] Salt',
        'Beta Toast\n[x] 2 slices Bread',
        'Recipes adapted from the Wikibooks Cookbook (CC BY-SA 4.0).',
      ].join('\n\n'),
    )
    expect((await screen.findByRole('status')).textContent).toBe('Shopping list copied to the clipboard.')
    expect(screen.queryByRole('textbox', { name: 'Plain text' })).toBeNull()
  })

  it('falls back to a selectable plain-text view when the clipboard is blocked', async () => {
    store(THREE_ITEMS)
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    renderList()

    await userEvent.click(screen.getByRole('button', { name: /copy list/i }))
    const plain = (await screen.findByRole('textbox', { name: 'Plain text' })) as HTMLTextAreaElement
    expect(plain.value).toContain('Alpha Stew\n[x] 400 g Chickpeas (drained)\n[ ] Salt')
    expect(plain.value).toContain('Beta Toast\n[x] 2 slices Bread')
    expect(plain.value).toContain('CC BY-SA 4.0')
    expect(document.activeElement).toBe(plain)
    expect(plain.selectionStart).toBe(0)
    expect(plain.selectionEnd).toBe(plain.value.length)
    expect(screen.getByRole('status').textContent).toContain('shown as plain text')
  })

  it('keeps the fallback text in step with a tick made while it is open', async () => {
    store([entry('alpha-stew', 0)])
    setClipboard(undefined)
    renderList()
    await userEvent.click(screen.getByRole('button', { name: /copy list/i }))
    const plain = (await screen.findByRole('textbox', { name: 'Plain text' })) as HTMLTextAreaElement
    expect(plain.value).toContain('[ ] 400 g Chickpeas (drained)')

    await userEvent.click(screen.getByRole('checkbox', { name: /Chickpeas/ }))
    expect((screen.getByRole('textbox', { name: 'Plain text' }) as HTMLTextAreaElement).value).toContain(
      '[x] 400 g Chickpeas (drained)',
    )
  })
})
