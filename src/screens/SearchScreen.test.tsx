import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RecipeProvider } from '../context/RecipeContext'
import { recipes } from '../data/recipes'
import SearchScreen from './SearchScreen'

function renderSearch() {
  return render(
    <RecipeProvider>
      <MemoryRouter initialEntries={['/search']}>
        <SearchScreen />
      </MemoryRouter>
    </RecipeProvider>,
  )
}

const cardTitles = () => within(screen.getByRole('main')).queryAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('SearchScreen', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('lists every recipe when the query is empty', () => {
    renderSearch()
    expect(cardTitles()).toHaveLength(recipes.length)
    expect(screen.getByText(`${recipes.length} recipes`)).toBeTruthy()
  })

  it('filters by ingredient name, case-insensitively', async () => {
    renderSearch()
    await userEvent.type(screen.getByLabelText('Search recipes'), 'FISH SAUCE')
    expect(cardTitles()).toEqual(['Shrimp Pad Thai'])
    expect(screen.getByText('1 result for "FISH SAUCE"')).toBeTruthy()
  })

  it('filters by cuisine and by difficulty', async () => {
    renderSearch()
    const input = screen.getByLabelText('Search recipes')
    await userEvent.type(input, 'italian')
    expect(cardTitles()).toEqual(['Margherita Pizza', 'Penne with Meat Sauce'])

    await userEvent.clear(input)
    await userEvent.type(input, 'hard')
    expect(cardTitles()).toEqual(['Margherita Pizza'])
  })

  it('requires every typed word to match', async () => {
    renderSearch()
    await userEvent.type(screen.getByLabelText('Search recipes'), 'italian chicken')
    expect(cardTitles()).toEqual([])
  })

  it('shows an empty state and clears the search from it', async () => {
    renderSearch()
    await userEvent.type(screen.getByLabelText('Search recipes'), 'zzzz')
    expect(screen.getByText('No recipes match your search')).toBeTruthy()
    expect(screen.getByText('0 results for "zzzz"')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(cardTitles()).toHaveLength(recipes.length)
  })
})
