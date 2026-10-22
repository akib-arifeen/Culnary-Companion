import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeProvider } from '../context/RecipeContext'
import { PREF_KEYS } from '../lib/storage'
import HomeScreen from './HomeScreen'

vi.mock('../data/recipes', async () => (await import('./recipeFixtures')).fixtureModule)

function renderHome() {
  return render(
    <RecipeProvider>
      <MemoryRouter>
        <HomeScreen />
      </MemoryRouter>
    </RecipeProvider>,
  )
}

describe('HomeScreen (Recipes)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('renders one ticket per recipe with computed header strip and credit', () => {
    renderHome()
    const rail = screen.getByRole('list', { name: 'Recipes' })
    expect(within(rail).getAllByRole('link')).toHaveLength(2)
    expect(within(rail).getByText('3 steps · serves 4')).toBeTruthy()
    expect(within(rail).getByText('45 MIN')).toBeTruthy()
    // The bare fixture states no servings or time: only the computed step count appears.
    expect(within(rail).getByText('2 steps')).toBeTruthy()
    expect(within(rail).getByText('Photo: Ben Baker · Public domain')).toBeTruthy()
    expect(within(rail).getByText('2 ingredients')).toBeTruthy()
    expect(screen.getByText('2 recipes')).toBeTruthy()
  })

  it('has no pick-up ticket without progress', () => {
    renderHome()
    expect(screen.queryByText('Pick up where you left off')).toBeNull()
  })

  it('shows the pick-up ticket for real progress, ignoring ids that no longer exist', () => {
    window.localStorage.setItem(PREF_KEYS.progress, JSON.stringify({ 'alpha-stew': 1, '7': 2 }))
    renderHome()
    expect(screen.getByRole('heading', { level: 2, name: 'Pick up where you left off' })).toBeTruthy()
    expect(screen.getByText('Step 2 of 3')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Resume Alpha Stew' }).getAttribute('href')).toBe('/cooking/alpha-stew')
    expect(screen.queryByText(/Step 3 of/)).toBeNull()
  })

  it('ignores progress that only names unknown recipes', () => {
    window.localStorage.setItem(PREF_KEYS.progress, JSON.stringify({ '3': 1 }))
    renderHome()
    expect(screen.queryByText('Pick up where you left off')).toBeNull()
  })

  it('narrows the rail when typing in the filter', async () => {
    renderHome()
    await userEvent.type(screen.getByLabelText(/filter by title/i), 'bread')
    expect(within(screen.getByRole('list', { name: 'Recipes' })).getAllByRole('link')).toHaveLength(1)
  })
})
