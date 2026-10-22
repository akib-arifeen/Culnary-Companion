import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real media hooks need a camera, a microphone and a speech engine. The screen only depends on their
// public shape (hooks/contracts.ts), so they are replaced with inert fakes that expose what the screen passes in.
const fakes = vi.hoisted(() => ({
  speaking: false,
  voiceStatus: 'off',
  speak: vi.fn(),
  cancel: vi.fn(),
  onTranscript: null as null | ((transcript: string) => void),
  onGesture: null as null | ((gesture: string) => void),
}))

vi.mock('../hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({ supported: true, speaking: fakes.speaking, speak: fakes.speak, cancel: fakes.cancel }),
}))
vi.mock('../hooks/useSpeechCommands', () => ({
  useSpeechCommands: (opts: { onTranscript: (transcript: string) => void }) => {
    fakes.onTranscript = opts.onTranscript
    return { status: fakes.voiceStatus, message: null, supported: true, listening: false, heard: null }
  },
}))
vi.mock('../hooks/useGestureRecognizer', () => ({
  useGestureRecognizer: (opts: { onGesture: (gesture: string) => void }) => {
    fakes.onGesture = opts.onGesture
    return { status: 'off', message: null, videoRef: { current: null }, live: { gesture: null, progress: 0, handVisible: false } }
  },
}))

import { RecipeProvider } from '../context/RecipeContext'
import { TimerProvider } from '../context/TimerContext'
import { getRecipeById } from '../data/recipes'
import { PREF_KEYS, writeJSON } from '../lib/storage'
import CookingScreen from './CookingScreen'

const recipe = getRecipeById('1')!
const stepCount = recipe.steps.length
const ingredientCount = recipe.ingredients.length

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RecipeProvider>
        <TimerProvider>
          <Routes>
            <Route path="/" element={<p>Home page</p>} />
            <Route path="/cooking/:id" element={<CookingScreen />} />
          </Routes>
        </TimerProvider>
      </RecipeProvider>
    </MemoryRouter>,
  )
}

describe('CookingScreen', () => {
  beforeEach(() => {
    window.localStorage.clear()
    writeJSON(PREF_KEYS.onboarded, true)
    fakes.speak.mockClear()
    fakes.cancel.mockClear()
    fakes.speaking = false
    fakes.voiceStatus = 'off'
  })
  afterEach(() => cleanup())

  it('starts on step 1 and moves with the arrow keys', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/1')
    expect(screen.getByText(`Step 1 of ${stepCount}`)).toBeTruthy()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText(`Step 2 of ${stepCount}`)).toBeTruthy()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText(`Step 1 of ${stepCount}`)).toBeTruthy()
  })

  it('moves with the on-screen buttons and reads the new step aloud', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/1')
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText(`Step 2 of ${stepCount}`)).toBeTruthy()
    expect(fakes.speak).toHaveBeenCalledWith(`Step 2. ${recipe.steps[1].instruction}`)
  })

  it('"i" shows the ingredients panel and ticking one updates the count', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/1')
    await user.keyboard('i')
    const panel = screen.getByRole('tabpanel', { name: /ingredients/i })
    expect(within(panel).getByText(`0 of ${ingredientCount} checked`)).toBeTruthy()
    await user.click(within(panel).getAllByRole('checkbox')[0])
    expect(within(panel).getByText(`1 of ${ingredientCount} checked`)).toBeTruthy()
    // The focused checkbox must not swallow the shortcuts.
    await user.keyboard('i')
    expect(screen.getByText(`Step 1 of ${stepCount}`)).toBeTruthy()
  })

  it('finishing the last step opens the completion dialog', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/1')
    for (let i = 0; i < stepCount - 1; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    await user.click(screen.getByRole('button', { name: 'Finish recipe' }))
    const dialog = screen.getByRole('dialog', { name: /nicely done/i })
    expect(within(dialog).getByText(recipe.title)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Review steps' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(`Step ${stepCount} of ${stepCount}`)).toBeTruthy()
  })

  it('"previous" from the completion dialog closes it and stays on the last step; other commands are ignored while it is up', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/1')
    for (let i = 0; i < stepCount - 1; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    await user.click(screen.getByRole('button', { name: 'Finish recipe' }))
    expect(screen.getByRole('dialog', { name: /nicely done/i })).toBeTruthy()
    act(() => fakes.onGesture?.('Victory'))
    act(() => fakes.onTranscript?.('timer for 5 minutes'))
    expect(screen.getByRole('dialog', { name: /nicely done/i })).toBeTruthy()
    act(() => fakes.onTranscript?.('back'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(`Step ${stepCount} of ${stepCount}`)).toBeTruthy()
    expect(screen.getByRole('tab', { name: /^Timers$/ })).toBeTruthy()
  })

  it('makes the background inert while the panel is open', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/1')
    const layout = screen.getByRole('tablist').parentElement!
    expect(layout.inert).toBe(false)
    await user.keyboard('?')
    expect(layout.inert).toBe(true)
    await user.keyboard('{Escape}')
    expect(layout.inert).toBe(false)
  })

  it('shows "couldn\'t find" in the toast when a spoken ingredient is unknown', () => {
    renderAt('/cooking/1')
    act(() => fakes.onTranscript?.('check unobtainium'))
    expect(screen.getByRole('status').textContent).toContain('couldn’t find')
  })

  it('"Back to recipes" in the completion dialog goes home', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/1')
    for (let i = 0; i < stepCount - 1; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    await user.click(screen.getByRole('button', { name: 'Finish recipe' }))
    await user.click(screen.getByRole('button', { name: 'Back to recipes' }))
    expect(screen.getByText('Home page')).toBeTruthy()
  })

  it('"?" opens the hands-free panel, other shortcuts are inactive inside it, Escape closes it', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/1')
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.keyboard('?')
    const dialog = screen.getByRole('dialog', { name: /hands-free|gestures/i })
    expect(dialog).toBeTruthy()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText(`Step 1 of ${stepCount}`)).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the onboarding panel on first visit and remembers that it was seen', async () => {
    window.localStorage.clear()
    const user = userEvent.setup()
    renderAt('/cooking/1')
    const dialog = screen.getByRole('dialog', { name: /hands-free|gestures/i })
    expect(within(dialog).getByText(/Practised 0 of 6/)).toBeTruthy()
    // Gestures only practise while the panel is open; they must not move the recipe.
    act(() => fakes.onGesture?.('Thumb_Up'))
    expect(within(dialog).getByText(/Practised 1 of 6/)).toBeTruthy()
    expect(screen.getByText(`Step 1 of ${stepCount}`)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Start cooking' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(PREF_KEYS.onboarded)).toBe('true')
  })

  it('runs voice and gesture commands through the same dispatcher and shows feedback', () => {
    renderAt('/cooking/1')
    act(() => fakes.onTranscript?.('next step'))
    expect(screen.getByText(`Step 2 of ${stepCount}`)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Next step')
    act(() => fakes.onGesture?.('Thumb_Down'))
    expect(screen.getByText(`Step 1 of ${stepCount}`)).toBeTruthy()
    act(() => fakes.onTranscript?.('purple monkey'))
    expect(screen.getByRole('status').textContent).toContain('Didn’t catch “purple monkey”')
  })

  it('starts a step timer from the keyboard and shows it in the Timers tab badge', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/1')
    await user.keyboard('t')
    expect(screen.getByRole('tab', { name: /timers, 1 running/i })).toBeTruthy()
    expect(fakes.speak).toHaveBeenCalledWith(expect.stringMatching(/^Timer set for/))
    await user.click(screen.getByRole('tab', { name: /timers/i }))
    expect(screen.getByRole('button', { name: /^Pause Step 1$/ })).toBeTruthy()
  })

  it('checks an ingredient by voice', () => {
    renderAt('/cooking/1')
    act(() => fakes.onTranscript?.('check garlic'))
    expect(fakes.speak).toHaveBeenCalledWith('Garlic checked.')
    expect(screen.getByRole('tab', { name: new RegExp(`1 of ${ingredientCount} checked`) })).toBeTruthy()
  })

  it('while speaking: the read button becomes "Stop reading" and the header says voice is paused', async () => {
    fakes.speaking = true
    fakes.voiceStatus = 'on'
    const user = userEvent.setup()
    renderAt('/cooking/1')
    expect(screen.getByRole('button', { name: /hands-free/i }).getAttribute('aria-label')).toContain('paused while speaking')
    await user.click(screen.getByRole('button', { name: 'Stop reading' }))
    expect(fakes.cancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Read step again' })).toBeNull()
  })

  it('shows the not-listening note in the panel while speaking', async () => {
    fakes.speaking = true
    const user = userEvent.setup()
    renderAt('/cooking/1')
    await user.keyboard('?')
    expect(screen.getByText('Listening resumes when I finish speaking.')).toBeTruthy()
  })

  it('shows a friendly page for an unknown recipe', () => {
    renderAt('/cooking/nope')
    expect(screen.getByRole('heading', { name: 'Recipe not found' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /back to recipes/i }).getAttribute('href')).toBe('/')
  })
})
