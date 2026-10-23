import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeProvider } from '../context/RecipeContext'
import { PREF_KEYS } from '../lib/storage'
import FavoritesScreen from './FavoritesScreen'
import RecentsScreen from './RecentsScreen'

vi.mock('../data/recipes', async () => (await import('./recipeFixtures')).fixtureModule)

const wrap = (ui: React.ReactNode) =>
  render(
    <RecipeProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </RecipeProvider>,
  )

describe('Saved and In progress', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('Saved: designed empty state with one action to Recipes', () => {
    wrap(<FavoritesScreen />)
    expect(screen.getByRole('heading', { level: 1, name: 'Saved' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Nothing saved yet' })).toBeTruthy()
    expect(screen.getByText(/tap Save recipe/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse recipes' }).getAttribute('href')).toBe('/')
  })

  it('Saved: lists saved recipes and drops ids from the old dataset', () => {
    window.localStorage.setItem(PREF_KEYS.favorites, JSON.stringify(['beta-toast', '4']))
    wrap(<FavoritesScreen />)
    expect(screen.getByRole('list', { name: 'Saved recipes' }).querySelectorAll('li')).toHaveLength(1)
    expect(screen.getByText('Beta Toast')).toBeTruthy()
  })

  it('In progress: empty state, then a ticket with its step and a Resume link', () => {
    wrap(<RecentsScreen />)
    expect(screen.getByRole('heading', { level: 2, name: 'Nothing on the pass yet' })).toBeTruthy()
    expect(screen.getByText(/Start cooking any recipe and the step you reached is kept here/)).toBeTruthy()
    cleanup()
    window.localStorage.setItem(PREF_KEYS.progress, JSON.stringify({ 'alpha-stew': 2 }))
    wrap(<RecentsScreen />)
    expect(screen.getByText('Step 3 of 3')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Resume Alpha Stew' }).getAttribute('href')).toBe('/cooking/alpha-stew')
    expect(screen.getByRole('button', { name: 'Discard progress on Alpha Stew' })).toBeTruthy()
  })
})
