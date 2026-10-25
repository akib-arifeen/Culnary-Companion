import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeProvider } from '../context/RecipeContext'
import { PREF_KEYS, readJSON } from '../lib/storage'
import SettingsScreen from './SettingsScreen'

vi.mock('../data/recipes', async () => (await import('./recipeFixtures')).fixtureModule)

const renderSettings = () =>
  render(
    <RecipeProvider>
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>
    </RecipeProvider>,
  )

describe('SettingsScreen (Station setup)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('has real switches that persist', async () => {
    renderSettings()
    const voice = screen.getByRole('switch', { name: 'Voice commands' })
    expect(voice.getAttribute('aria-checked')).toBe('false')
    await userEvent.click(voice)
    expect(screen.getByRole('switch', { name: 'Voice commands' }).getAttribute('aria-checked')).toBe('true')
    expect(readJSON(PREF_KEYS.voice, false)).toBe(true)

    await userEvent.click(screen.getByRole('switch', { name: 'Read steps aloud' }))
    expect(readJSON(PREF_KEYS.speakSteps, true)).toBe(false)
    expect(screen.getAllByRole('switch')).toHaveLength(4)
  })

  it('says the microphone is requested when cooking starts, not by this switch', () => {
    renderSettings()
    expect(screen.getByText(/microphone is requested when you start cooking with voice on/i)).toBeTruthy()
    expect(screen.queryByText(/when you turn it on/i)).toBeNull()
  })

  it('replays the tutorial by clearing the onboarded flag', async () => {
    window.localStorage.setItem(PREF_KEYS.onboarded, 'true')
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Replay tutorial' }))
    expect(readJSON(PREF_KEYS.onboarded, true)).toBe(false)
  })

  it('asks before clearing saved recipes and progress', async () => {
    window.localStorage.setItem(PREF_KEYS.favorites, JSON.stringify(['alpha-stew']))
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Clear saved and progress' }))
    expect(readJSON(PREF_KEYS.favorites, [])).toEqual(['alpha-stew'])
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(readJSON(PREF_KEYS.favorites, [])).toEqual(['alpha-stew'])
    await userEvent.click(screen.getByRole('button', { name: 'Clear saved and progress' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, clear everything' }))
    expect(readJSON(PREF_KEYS.favorites, ['x'])).toEqual([])
    expect(screen.getByRole('status').textContent).toContain('cleared')
  })

  it('lists privacy, licence, every recipe source and the repo link', () => {
    renderSettings()
    const about = screen.getByRole('heading', { name: 'About and credits' }).closest('section')!
    expect(within(about).getByText(/sends your audio to Google/)).toBeTruthy()
    expect(within(about).getByRole('link', { name: /CC BY-SA 4\.0/ })).toBeTruthy()
    expect(within(about).getByRole('link', { name: /Cookbook:Alpha_Stew/ }).getAttribute('href')).toBe(
      'https://en.wikibooks.org/wiki/Cookbook:Alpha_Stew',
    )
    expect(within(about).getByRole('link', { name: /Ben Baker, Public domain/ }).getAttribute('href')).toBe(
      'https://commons.wikimedia.org/wiki/File:Beta.jpg',
    )
    expect(within(about).getByRole('link', { name: /View the source on GitHub/ }).getAttribute('href')).toContain('github.com')
  })
})
