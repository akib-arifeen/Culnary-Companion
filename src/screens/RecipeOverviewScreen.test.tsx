import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeProvider } from '../context/RecipeContext'
import { PREF_KEYS, readJSON } from '../lib/storage'
import RecipeOverviewScreen from './RecipeOverviewScreen'

vi.mock('../data/recipes', async () => (await import('./recipeFixtures')).fixtureModule)

function renderAt(path: string) {
  return render(
    <RecipeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/recipe/:id" element={<RecipeOverviewScreen />} />
          <Route path="/cooking/:id" element={<p>cooking screen</p>} />
          <Route path="/" element={<p>home screen</p>} />
        </Routes>
      </MemoryRouter>
    </RecipeProvider>,
  )
}

describe('RecipeOverviewScreen (Full ticket)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('shows the title once, as the only h1', () => {
    renderAt('/recipe/alpha-stew')
    expect(screen.getAllByText('Alpha Stew')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Alpha Stew' })).toBeTruthy()
  })

  it('shows a one-line strip and the full stated facts once in the body', () => {
    renderAt('/recipe/alpha-stew')
    expect(screen.getByText('45 MIN · Serves 4 · 3 steps')).toBeTruthy()
    expect(screen.getByText('Serves 4 · 45 minutes · Main course')).toBeTruthy()
  })

  it('shows only stated facts when the source gives none', () => {
    renderAt('/recipe/beta-toast')
    expect(screen.getByText('2 steps')).toBeTruthy()
    expect(screen.queryByText(/serves/i)).toBeNull()
    expect(screen.queryByText(/minute/i)).toBeNull()
    expect(screen.queryByText(/main course/i)).toBeNull()
  })

  it('lists ingredients with mono quantities, notes, and step timer chips only where stated', () => {
    renderAt('/recipe/alpha-stew')
    const mise = screen.getByRole('heading', { name: 'Mise en place' }).closest('section')!
    expect(within(mise).getByText('400 g')).toBeTruthy()
    expect(within(mise).getByText('drained')).toBeTruthy()
    const method = screen.getByRole('heading', { name: 'Method' }).closest('section')!
    expect(within(method).getByText('Simmer for 6 minutes.')).toBeTruthy()
    expect(within(method).getAllByText(/min$/)).toHaveLength(1)
    expect(within(method).getByText('6 min')).toBeTruthy()
  })

  it('has a Credits block with the source, licences, changes, revision and photo credit', () => {
    renderAt('/recipe/alpha-stew')
    const credits = screen.getByRole('heading', { name: 'Credits' }).closest('section')!
    expect(credits.textContent).toContain('Adapted from Cookbook:Alpha_Stew')
    expect(credits.textContent).toContain('(Wikibooks contributors)')
    expect(credits.textContent).toContain('Changes: adapted into step-by-step format.')
    const href = (name: RegExp) => within(credits).getByRole('link', { name }).getAttribute('href')
    expect(href(/Cookbook:Alpha_Stew/)).toBe('https://en.wikibooks.org/wiki/Cookbook:Alpha_Stew')
    expect(href(/CC BY-SA 4\.0/)).toBe('https://creativecommons.org/licenses/by-sa/4.0/')
    expect(href(/^revision 111$/)).toBe('https://en.wikibooks.org/w/index.php?oldid=111')
    expect(href(/CC BY 2\.0/)).toBe('https://creativecommons.org/licenses/by/2.0/')
    expect(href(/Wikimedia Commons/)).toBe('https://commons.wikimedia.org/wiki/File:Alpha.jpg')
    expect(credits.textContent).toContain('Photo: Ada Cook')
  })

  it('gives the photo alt text from the data', () => {
    renderAt('/recipe/alpha-stew')
    expect(screen.getByRole('img', { name: 'A bowl of chickpea stew' })).toBeTruthy()
  })

  it('shows a Start cooking link when there is no progress, and no Start over', async () => {
    renderAt('/recipe/alpha-stew')
    const start = screen.getByRole('link', { name: 'Start cooking' })
    expect(start.getAttribute('href')).toBe('/cooking/alpha-stew')
    expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull()
    await userEvent.click(start)
    expect(screen.getByText('cooking screen')).toBeTruthy()
  })

  it('offers Resume at the saved step and keeps it; Start over resets to step 1', async () => {
    window.localStorage.setItem(PREF_KEYS.progress, JSON.stringify({ 'alpha-stew': 2 }))
    renderAt('/recipe/alpha-stew')
    await userEvent.click(screen.getByRole('link', { name: 'Resume at step 3' }))
    expect(readJSON(PREF_KEYS.progress, {})).toEqual({ 'alpha-stew': 2 })
    cleanup()

    renderAt('/recipe/alpha-stew')
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(readJSON(PREF_KEYS.progress, {})).toEqual({ 'alpha-stew': 0 })
    expect(screen.getByText('cooking screen')).toBeTruthy()
  })

  it('toggles Save with aria-pressed and persists it', async () => {
    renderAt('/recipe/beta-toast')
    const save = screen.getByRole('button', { name: 'Save recipe' })
    expect(save.getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(save)
    expect(screen.getByRole('button', { name: 'Save recipe' }).getAttribute('aria-pressed')).toBe('true')
    expect(readJSON(PREF_KEYS.favorites, [])).toEqual(['beta-toast'])
    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }))
    expect(readJSON(PREF_KEYS.favorites, ['x'])).toEqual([])
  })

  it('shows a not-found state with a way back', () => {
    renderAt('/recipe/does-not-exist')
    expect(screen.getByRole('heading', { level: 1, name: 'Recipe not found' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse all recipes' }).getAttribute('href')).toBe('/')
    expect(screen.queryByRole('link', { name: 'Start cooking' })).toBeNull()
  })
})
