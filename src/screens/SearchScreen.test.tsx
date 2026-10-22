import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeProvider } from '../context/RecipeContext'
import SearchScreen from './SearchScreen'

vi.mock('../data/recipes', async () => (await import('./recipeFixtures')).fixtureModule)

function renderSearch() {
  return render(
    <RecipeProvider>
      <MemoryRouter initialEntries={['/search']}>
        <SearchScreen />
      </MemoryRouter>
    </RecipeProvider>,
  )
}

const titles = () => within(screen.getByRole('main')).queryAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('SearchScreen (/search = Recipes with the filter focused)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('focuses the filter', () => {
    renderSearch()
    expect(document.activeElement).toBe(screen.getByLabelText(/filter by title/i))
  })

  it('filters by ingredient name, case-insensitively, with a live count', async () => {
    renderSearch()
    await userEvent.type(screen.getByLabelText(/filter by title/i), 'CHICKPEAS')
    expect(titles()).toEqual(['Alpha Stew'])
    expect(screen.getByText('1 of 2 match “CHICKPEAS”').getAttribute('aria-live')).toBe('polite')
  })

  it('also matches category', async () => {
    renderSearch()
    await userEvent.type(screen.getByLabelText(/filter by title/i), 'main')
    expect(titles()).toEqual(['Alpha Stew'])
  })

  it('shows an empty state and clears the filter from it', async () => {
    renderSearch()
    await userEvent.type(screen.getByLabelText(/filter by title/i), 'zzzz')
    expect(screen.getByText('No recipe matches that')).toBeTruthy()
    expect(screen.getByText('0 of 2 match “zzzz”')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }))
    expect(titles()).toEqual(['Alpha Stew', 'Beta Toast'])
  })
})
