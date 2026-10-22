import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RecipeProvider } from '../context/RecipeContext'
import { getRecipeById } from '../data/recipes'
import { PREF_KEYS, readJSON } from '../lib/storage'
import RecipeOverviewScreen from './RecipeOverviewScreen'

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

describe('RecipeOverviewScreen', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('shows a Start cooking link to the cooking screen when there is no progress', async () => {
    renderAt('/recipe/1')
    const start = screen.getByRole('link', { name: 'Start cooking' })
    expect(start.getAttribute('href')).toBe('/cooking/1')
    expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull()
    await userEvent.click(start)
    expect(screen.getByText('cooking screen')).toBeTruthy()
  })

  it('lists every step in full, with durations', () => {
    renderAt('/recipe/1')
    const recipe = getRecipeById('1')!
    expect(recipe.steps.length).toBeGreaterThanOrEqual(5)
    for (const step of recipe.steps) {
      expect(screen.getByText(step.instruction)).toBeTruthy()
    }
    expect(screen.getAllByText('15 min').length).toBeGreaterThan(0)
  })

  it('offers Resume at the saved step and keeps it; Start over resets to step 1', async () => {
    window.localStorage.setItem(PREF_KEYS.progress, JSON.stringify({ '1': 3 }))
    renderAt('/recipe/1')

    const resume = screen.getByRole('link', { name: 'Resume at step 4' })
    expect(resume.getAttribute('href')).toBe('/cooking/1')

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(readJSON(PREF_KEYS.progress, {})).toEqual({ '1': 0 })
    expect(screen.getByText('cooking screen')).toBeTruthy()
  })

  it('does not touch saved progress when resuming', async () => {
    window.localStorage.setItem(PREF_KEYS.progress, JSON.stringify({ '1': 3 }))
    renderAt('/recipe/1')
    await userEvent.click(screen.getByRole('link', { name: 'Resume at step 4' }))
    expect(readJSON(PREF_KEYS.progress, {})).toEqual({ '1': 3 })
  })

  it('toggles the favourite with aria-pressed and a matching label, and persists it', async () => {
    renderAt('/recipe/2')
    const save = screen.getByRole('button', { name: 'Save recipe' })
    expect(save.getAttribute('aria-pressed')).toBe('false')

    await userEvent.click(save)
    const remove = screen.getByRole('button', { name: 'Remove from saved' })
    expect(remove.getAttribute('aria-pressed')).toBe('true')
    expect(readJSON(PREF_KEYS.favorites, [])).toEqual(['2'])

    await userEvent.click(remove)
    expect(screen.getByRole('button', { name: 'Save recipe' }).getAttribute('aria-pressed')).toBe('false')
    expect(readJSON(PREF_KEYS.favorites, ['x'])).toEqual([])
  })

  it('shows a not-found state with a way back', () => {
    renderAt('/recipe/does-not-exist')
    expect(screen.getByRole('heading', { level: 1, name: 'Recipe not found' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse all recipes' }).getAttribute('href')).toBe('/')
    expect(screen.queryByRole('link', { name: 'Start cooking' })).toBeNull()
  })
})
