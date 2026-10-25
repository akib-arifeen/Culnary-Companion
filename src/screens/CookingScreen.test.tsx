import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real media hooks need a camera, a microphone and a speech engine. The screen only depends on their
// public shape (hooks/contracts.ts), so they are replaced with inert fakes that expose what the screen passes in.
const fakes = vi.hoisted(() => ({
  speaking: false,
  voiceStatus: 'off',
  voiceMessage: null as string | null,
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
    return { status: fakes.voiceStatus, message: fakes.voiceMessage, supported: true, listening: false, heard: null }
  },
}))
vi.mock('../hooks/useGestureRecognizer', () => ({
  useGestureRecognizer: (opts: { onGesture: (gesture: string) => void }) => {
    fakes.onGesture = opts.onGesture
    return { status: 'off', message: null, videoRef: { current: null }, live: { gesture: null, progress: 0, handVisible: false } }
  },
}))

// A FIXTURE recipe pair, so these tests do not depend on the real content: 6 steps, 2 with durations (steps 2 and 4),
// ingredient names that appear in the step text, and no step text over 140 characters.
vi.mock('../data/recipes', () => {
  const photo = { src: '/x.webp', width: 4, height: 3, alt: 'x', filePage: 'https://example.org/f', author: 'A', license: 'CC BY 2.0' }
  const source = {
    page: 'Cookbook:Fixture',
    url: 'https://en.wikibooks.org/wiki/Cookbook:Fixture',
    revisionUrl: 'https://en.wikibooks.org/w/index.php?oldid=1',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    changes: 'Adapted into step-by-step format.',
    retrieved: '2026-10-22',
  }
  const steps = (items: Array<[string, number?]>) =>
    items.map(([instruction, duration], i) => ({ stepNumber: i + 1, instruction, ...(duration ? { duration } : {}) }))
  const recipes = [
    {
      id: 'fixture-curry',
      title: 'Fixture chicken curry',
      summary: 'A curry.',
      ingredients: [
        { name: 'Chicken', quantity: '600 g' },
        { name: 'Onion', quantity: '1 large' },
        { name: 'Garlic', quantity: '3 cloves' },
        { name: 'Coconut milk', quantity: '400 ml' },
        { name: 'Rice', quantity: '2 cups' },
        { name: 'Salt', quantity: '', note: 'to taste' },
      ],
      steps: steps([
        ['Slice the onion and mince the garlic.'],
        ['Fry the onion in a deep pan for 6 minutes until soft.', 6],
        ['Add the chicken and the garlic, then stir until the chicken is browned.'],
        ['Pour in the coconut milk and simmer for 20 minutes.', 20],
        ['Cook the rice and season with salt.'],
        ['Serve the curry over the rice.'],
      ]),
      photo,
      source,
    },
    {
      id: 'fixture-soup',
      title: 'Fixture lentil soup',
      summary: 'A soup.',
      ingredients: [{ name: 'Lentils', quantity: '1 cup' }],
      steps: steps([['Rinse the lentils.'], ['Boil the lentils.', 15], ['Season and serve.']]),
      photo,
      source,
    },
    {
      id: 'fixture-salmon',
      title: 'Fixture salmon',
      summary: 'A fillet.',
      ingredients: [{ name: 'Salmon', quantity: '2 fillets' }],
      steps: steps([['Pan fry the salmon for 2–3 minutes per side.', 3], ['Serve with lemon.']]),
      photo,
      source,
    },
  ]
  return { recipes, getRecipeById: (id: string) => recipes.find((r) => r.id === id) }
})

import { LAYOUT_QUERIES } from '../components/cooking/useCookingLayout'
import { RecipeProvider } from '../context/RecipeContext'
import { TimerProvider } from '../context/TimerContext'
import { getRecipeById } from '../data/recipes'
import { PREF_KEYS, writeJSON } from '../lib/storage'
import CookingScreen from './CookingScreen'

const recipe = getRecipeById('fixture-curry')!
const stepCount = recipe.steps.length
const ingredientCount = recipe.ingredients.length

/** jsdom has no matchMedia. The layout hook falls back to the phone layout; these tests opt in to a wider one. */
function setLayout(layout: 'lg' | 'md' | 'tabs') {
  window.matchMedia = ((query: string) => ({
    matches: query === LAYOUT_QUERIES.lg ? layout === 'lg' : query === LAYOUT_QUERIES.md ? layout !== 'tabs' : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

function GoTo({ to }: { to: string }) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(to)}>
      go to {to}
    </button>
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RecipeProvider>
        <TimerProvider>
          <GoTo to="/cooking/fixture-soup" />
          <GoTo to="/cooking/fixture-curry" />
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
    fakes.voiceMessage = null
  })
  afterEach(() => {
    cleanup()
    // @ts-expect-error restore jsdom's lack of matchMedia
    delete window.matchMedia
  })

  it('starts on step 1 and moves with the arrow keys', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    expect(screen.getByText(`Step 1 of ${stepCount}`)).toBeTruthy()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText(`Step 2 of ${stepCount}`)).toBeTruthy()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText(`Step 1 of ${stepCount}`)).toBeTruthy()
  })

  it('moves with the on-screen buttons and reads the new step aloud', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText(`Step 2 of ${stepCount}`)).toBeTruthy()
    expect(fakes.speak).toHaveBeenCalledWith(`Step 2. ${recipe.steps[1].instruction}`)
  })

  it('"i" shows the ingredients panel and ticking one updates the count', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
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
    renderAt('/cooking/fixture-curry')
    for (let i = 0; i < stepCount - 1; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    await user.click(screen.getByRole('button', { name: 'Finish recipe' }))
    const dialog = screen.getByRole('dialog', { name: /nicely cooked/i })
    expect(within(dialog).getByText(recipe.title)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Review steps' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(`Step ${stepCount} of ${stepCount}`)).toBeTruthy()
  })

  it('"previous" from the completion dialog closes it and stays on the last step; other commands are ignored while it is up', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    for (let i = 0; i < stepCount - 1; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    await user.click(screen.getByRole('button', { name: 'Finish recipe' }))
    expect(screen.getByRole('dialog', { name: /nicely cooked/i })).toBeTruthy()
    act(() => fakes.onGesture?.('Victory'))
    act(() => fakes.onTranscript?.('timer for 5 minutes'))
    expect(screen.getByRole('dialog', { name: /nicely cooked/i })).toBeTruthy()
    act(() => fakes.onTranscript?.('back'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(`Step ${stepCount} of ${stepCount}`)).toBeTruthy()
    expect(screen.getByRole('tab', { name: /^Timers$/ })).toBeTruthy()
  })

  it('makes the background inert while the panel is open', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    const layout = screen.getByRole('tablist').closest<HTMLElement>('[data-layout]')!
    expect(layout.inert).toBe(false)
    await user.keyboard('?')
    expect(layout.inert).toBe(true)
    await user.keyboard('{Escape}')
    expect(layout.inert).toBe(false)
  })

  it('shows "couldn\'t find" in the HEARD strip when a spoken ingredient is unknown', () => {
    renderAt('/cooking/fixture-curry')
    act(() => fakes.onTranscript?.('check unobtainium'))
    expect(screen.getByRole('status').textContent).toContain('couldn’t find')
  })

  it('"Back to recipes" in the completion dialog goes home', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    for (let i = 0; i < stepCount - 1; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    await user.click(screen.getByRole('button', { name: 'Finish recipe' }))
    await user.click(screen.getByRole('button', { name: 'Back to recipes' }))
    expect(screen.getByText('Home page')).toBeTruthy()
  })

  it('"?" opens the hands-free panel, other shortcuts are inactive inside it, Escape closes it', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
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
    renderAt('/cooking/fixture-curry')
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
    renderAt('/cooking/fixture-curry')
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
    renderAt('/cooking/fixture-curry')
    await user.keyboard('n') // step 2 states "for 6 minutes"
    await user.keyboard('t')
    expect(screen.getByRole('tab', { name: /^Timers\s*1\s*running$/ })).toBeTruthy()
    expect(fakes.speak).toHaveBeenCalledWith(expect.stringMatching(/^Timer set for/))
    await user.click(screen.getByRole('tab', { name: /timers/i }))
    expect(screen.getByRole('button', { name: /^Pause Step 2$/ })).toBeTruthy()
  })

  // A timer must be backed by a time the step states. No stated time means no timer, in every input method,
  // plus a spoken and visible way to give one.
  it('a step with no stated time starts no timer from the keyboard and says how to set one', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    await user.keyboard('t')
    expect(screen.getByRole('tab', { name: /^Timers$/ })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Step 1 doesn’t state a time')
    expect(screen.getByRole('status').textContent).toContain('set a timer for 10 minutes')
    expect(fakes.speak).toHaveBeenCalledWith(expect.stringContaining('doesn’t state a time'))
    expect(fakes.speak).not.toHaveBeenCalledWith(expect.stringContaining('Timer set for'))
  })

  it('a step with no stated time starts no timer from voice and says how to set one', () => {
    renderAt('/cooking/fixture-curry')
    act(() => fakes.onTranscript?.('start timer'))
    expect(screen.getByRole('tab', { name: /^Timers$/ })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('doesn’t state a time')
    expect(fakes.speak).toHaveBeenCalledWith(expect.stringContaining('set a timer for 10 minutes'))
  })

  it('a step with no stated time starts no timer from a hand gesture and says how to set one', () => {
    renderAt('/cooking/fixture-curry')
    act(() => fakes.onGesture?.('Pointing_Up'))
    expect(screen.getByRole('tab', { name: /^Timers$/ })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('doesn’t state a time')
  })

  it('an explicit time still starts a timer on a step that states none', () => {
    renderAt('/cooking/fixture-curry')
    act(() => fakes.onTranscript?.('set a timer for 7 minutes'))
    expect(fakes.speak).toHaveBeenCalledWith('Timer set for 7 minutes.')
    expect(screen.getByRole('tab', { name: /^Timers\s*1\s*running$/ })).toBeTruthy()
  })

  it('a per-side step says "per side" on the chip and in the confirmation, as one timer', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-salmon')
    await user.click(screen.getByRole('button', { name: 'Start 3-min timer (per side)' }))
    expect(fakes.speak).toHaveBeenCalledWith('Timer set for 3 minutes per side.')
    expect(screen.getByRole('button', { name: /^3:00.*Pause step timer/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /^Timers\s*1\s*running$/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Start .*-min timer/ })).toBeNull()
  })

  it('checks an ingredient by voice', () => {
    renderAt('/cooking/fixture-curry')
    act(() => fakes.onTranscript?.('check garlic'))
    expect(fakes.speak).toHaveBeenCalledWith('Garlic checked.')
    expect(screen.getByRole('tab', { name: new RegExp(`^Ingredients\\s*1/${ingredientCount}\\s*checked$`) })).toBeTruthy()
  })

  it('while speaking: the read button becomes "Stop reading" and the HEARD strip says the mic is paused', async () => {
    fakes.speaking = true
    fakes.voiceStatus = 'on'
    writeJSON(PREF_KEYS.voice, true)
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    expect(screen.getByRole('status').textContent).toContain('Mic paused while I read')
    expect(screen.getByRole('status').textContent).not.toContain('Listening')
    await user.click(screen.getByRole('button', { name: 'Stop reading' }))
    expect(fakes.cancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Read it again' })).toBeNull()
  })

  it('shows the not-listening note in the panel while speaking', async () => {
    fakes.speaking = true
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    await user.keyboard('?')
    expect(screen.getByText('Listening resumes when I finish speaking.')).toBeTruthy()
  })

  it('keeps step timers of different recipes apart and labels the other recipe', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    await user.keyboard('n') // both recipes state a time on step 2
    await user.keyboard('t')
    await user.click(screen.getByRole('button', { name: 'go to /cooking/fixture-soup' }))
    await user.keyboard('n')
    await user.keyboard('t')
    await user.click(screen.getByRole('tab', { name: /timers/i }))
    expect(screen.getAllByRole('button', { name: /^Pause Step 2$/ })).toHaveLength(2)
    expect(screen.getByText(recipe.title)).toBeTruthy()
  })

  it('a bare "start" with nothing paused creates no timer and says so', () => {
    renderAt('/cooking/fixture-curry')
    act(() => fakes.onTranscript?.('start'))
    expect(screen.getByRole('status').textContent).toContain('No paused timer')
    expect(fakes.speak).toHaveBeenCalledWith(expect.stringContaining('No paused timer'))
    expect(screen.getByRole('tab', { name: /^Timers$/ })).toBeTruthy()
  })

  it('ignores help (voice and keys) while the completion dialog is up', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    for (let i = 0; i < stepCount - 1; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    await user.click(screen.getByRole('button', { name: 'Finish recipe' }))
    act(() => fakes.onTranscript?.('help'))
    await user.keyboard('?')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: /nicely cooked/i })).toBeTruthy()
  })

  it('HEARD strip: shows the mic state, the last understood command with what was heard, and the source', async () => {
    fakes.voiceStatus = 'on'
    writeJSON(PREF_KEYS.voice, true)
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    const strip = screen.getByRole('status')
    expect(strip.textContent).toContain('Listening')
    act(() => fakes.onTranscript?.('okay next please'))
    expect(strip.textContent).toMatch(/Heard.*Next step.*“okay next please”/)
    act(() => fakes.onGesture?.('Thumb_Down'))
    expect(strip.textContent).toMatch(/Gesture.*Previous step/)
    await user.keyboard('r')
    expect(strip.textContent).toMatch(/Key.*Read step again/)
    // A tap is not announced: the strip keeps the last thing understood.
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(strip.textContent).toMatch(/Key.*Read step again/)
  })

  it('HEARD strip: voice off offers "Turn on"; the camera state reads "Gestures off"', () => {
    renderAt('/cooking/fixture-curry')
    const strip = screen.getByRole('status')
    expect(strip.textContent).toContain('Voice off')
    expect(strip.textContent).toContain('Gestures off')
    expect(within(strip).getByRole('button', { name: 'Turn on voice' })).toBeTruthy()
  })

  it('"THIS STEP" highlights exactly the ingredients the current step mentions', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    await user.keyboard('i')
    const panel = screen.getByRole('tabpanel', { name: /ingredients/i })
    const marked = () => within(panel).queryAllByText('This step').map((el) => el.closest('label')?.textContent ?? '')
    // Step 1: "Slice the onion and mince the garlic."
    expect(marked()).toHaveLength(2)
    expect(marked().join('|')).toMatch(/Onion/)
    expect(marked().join('|')).toMatch(/Garlic/)
    // Step 4: "Pour in the coconut milk and simmer for 20 minutes."
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    await user.keyboard('i')
    const after = within(screen.getByRole('tabpanel', { name: /ingredients/i }))
      .queryAllByText('This step')
      .map((el) => el.closest('label')?.textContent ?? '')
    expect(after).toHaveLength(1)
    expect(after[0]).toMatch(/Coconut milk/)
  })

  it('lg layout: the rail shows the HEARD strip, timers and ingredients together, with no tabs', async () => {
    setLayout('lg')
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    const root = screen.getByRole('status').closest('[data-layout]')!
    expect(root.getAttribute('data-layout')).toBe('lg')
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('tabpanel')).toBeNull()
    expect(screen.getByRole('region', { name: 'Step 1' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Timers' })).toBeTruthy()
    expect(screen.getByText(`0 of ${ingredientCount} checked`)).toBeTruthy()
    // Everything stays reachable: ticking an ingredient and moving on work without any tab.
    await user.click(screen.getAllByRole('checkbox')[0])
    expect(screen.getByText(`1 of ${ingredientCount} checked`)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText(`Step 2 of ${stepCount}`)).toBeTruthy()
  })

  it('lg layout: the HEARD strip (and nothing pinned) is outside the rail scroll container; timers and ingredients are inside', () => {
    setLayout('lg')
    renderAt('/cooking/fixture-curry')
    const strip = screen.getByRole('status')
    const scroller = document.querySelector('[data-rail-scroll]')!
    expect(scroller).toBeTruthy()
    expect(scroller.contains(strip)).toBe(false)
    expect(scroller.contains(screen.getByRole('region', { name: 'Timers' }))).toBe(true)
    expect(scroller.contains(screen.getByText(`0 of ${ingredientCount} checked`))).toBe(true)
  })

  it('tabs layout: the status is ONE compact line; a blocked mic becomes a short state plus a FIX button that opens the help sheet', async () => {
    fakes.voiceStatus = 'denied'
    fakes.voiceMessage = 'Microphone access was blocked. Allow the microphone in your browser’s site settings, then try again.'
    writeJSON(PREF_KEYS.voice, true)
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    const strip = screen.getByRole('status')
    expect(strip.getAttribute('data-compact')).toBe('true')
    expect(strip.textContent).toContain('Mic blocked')
    expect(strip.textContent).not.toContain('Allow the microphone')
    expect(within(strip).queryByRole('button', { name: /try again/i })).toBeNull()
    await user.click(within(strip).getByRole('button', { name: /fix/i }))
    expect(screen.getByRole('dialog', { name: /hands-free/i })).toBeTruthy()
    // The full sentence lives in the sheet, next to its Try again button.
    expect(screen.getByText(/Allow the microphone/)).toBeTruthy()
  })

  it('md layout: the HEARD strip is the full status (not compact)', () => {
    setLayout('md')
    renderAt('/cooking/fixture-curry')
    expect(screen.getByRole('status').getAttribute('data-compact')).toBeNull()
  })

  it('"THIS STEP USES" lists the ingredients of the current step and hides when there are none', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    expect(screen.getByText('Onion · Garlic')).toBeTruthy()
    expect(screen.getByText('This step uses')).toBeTruthy()
    // Step 6 mentions only the rice ("Serve the curry over the rice.").
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('Rice')).toBeTruthy()
    // Fixture soup step 3, "Season and serve.", uses nothing.
    await user.click(screen.getByRole('button', { name: 'go to /cooking/fixture-soup' }))
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.queryByText('This step uses')).toBeNull()
  })

  it('timers: presets show inline with no timers and collapse behind "+ Add timer" once one exists', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    await user.click(screen.getByRole('tab', { name: /^Timers$/ }))
    expect(screen.getByRole('button', { name: /^5\s*min\s*timer$/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /add timer/i })).toBeNull()
    await user.click(screen.getByRole('button', { name: /^5\s*min\s*timer$/ }))
    expect(screen.queryByRole('button', { name: /^5\s*min\s*timer$/ })).toBeNull()
    const add = screen.getByRole('button', { name: /add timer/i })
    expect(add.getAttribute('aria-expanded')).toBe('false')
    await user.click(add)
    expect(screen.getByRole('button', { name: /^10\s*min\s*timer$/ })).toBeTruthy()
  })

  it('lg layout: the running timer of the current step is not repeated in the rail (the step chip is its control)', async () => {
    setLayout('lg')
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    await user.keyboard('{ArrowRight}')
    await user.click(screen.getByRole('button', { name: 'Start 6-min timer' }))
    expect(screen.getByRole('button', { name: /Pause step timer/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Pause Step 2$/ })).toBeNull()
    // Moving on, that timer becomes an ordinary compact row in the rail.
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /^Pause Step 2$/ })).toBeTruthy()
  })

  it('Reset on a compact timer row puts that timer back to its full time, paused', async () => {
    setLayout('lg')
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    await user.click(screen.getByRole('button', { name: /^5\s*min\s*timer$/ }))
    const row = screen.getByRole('timer').closest('li')!
    expect(within(row).getByRole('button', { name: /^Pause 5 min timer$/ })).toBeTruthy()
    await user.click(within(row).getByRole('button', { name: 'Reset 5 min timer' }))
    expect(within(row).getByRole('timer').textContent).toBe('5:00')
    // Reset leaves it paused, so the button now offers Resume.
    expect(within(row).getByRole('button', { name: /^Resume 5 min timer$/ })).toBeTruthy()
  })

  it('the step chip offers Reset for the current step timer', async () => {
    setLayout('lg')
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    await user.keyboard('{ArrowRight}')
    await user.click(screen.getByRole('button', { name: 'Start 6-min timer' }))
    await user.click(screen.getByRole('button', { name: 'Reset step timer' }))
    expect(screen.getByRole('button', { name: /Resume step timer/ })).toBeTruthy()
  })

  it('onboarding: the voice test box says "Turn voice on first" until voice is on', () => {
    window.localStorage.clear()
    renderAt('/cooking/fixture-curry')
    expect(screen.getByText('Turn voice on first')).toBeTruthy()
    expect(screen.queryByText('Say “next” to test')).toBeNull()
  })

  it('onboarding: with voice on, the live test shows', () => {
    window.localStorage.clear()
    writeJSON(PREF_KEYS.voice, true)
    renderAt('/cooking/fixture-curry')
    expect(screen.getByText('Say “next” to test')).toBeTruthy()
    expect(screen.queryByText('Turn voice on first')).toBeNull()
  })

  it('md layout: ingredients and timers sit below the step, still without tabs', () => {
    setLayout('md')
    renderAt('/cooking/fixture-curry')
    expect(screen.getByRole('status').closest('[data-layout]')!.getAttribute('data-layout')).toBe('md')
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByRole('region', { name: 'Timers' })).toBeTruthy()
    expect(screen.getByText(`0 of ${ingredientCount} checked`)).toBeTruthy()
  })

  it('phone layout (and no matchMedia at all): three tabs', () => {
    renderAt('/cooking/fixture-curry')
    expect(screen.getByRole('status').closest('[data-layout]')!.getAttribute('data-layout')).toBe('tabs')
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('tabs: arrows move focus only (manual activation), one tab stop, Home/End jump, Enter selects', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    const [steps, ingredients, timers] = screen.getAllByRole('tab')
    expect(steps.getAttribute('aria-selected')).toBe('true')
    expect(steps.tabIndex).toBe(0)
    expect([ingredients.tabIndex, timers.tabIndex]).toEqual([-1, -1])

    steps.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(ingredients)
    // Focus alone does not switch panels, and the arrow does not also reach the window's step shortcut.
    expect(ingredients.getAttribute('aria-selected')).toBe('false')
    expect(screen.getByText(`Step 1 of ${stepCount}`)).toBeTruthy()
    // The single tab stop follows focus.
    expect(ingredients.tabIndex).toBe(0)
    expect(steps.tabIndex).toBe(-1)
    expect(screen.getAllByRole('tab').filter((element) => element.tabIndex === 0)).toHaveLength(1)

    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(timers)
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(steps)
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(timers)
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(steps)

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('tabpanel', { name: /ingredients/i })).toBeTruthy()
    expect(ingredients.getAttribute('aria-selected')).toBe('true')
    expect(ingredients.tabIndex).toBe(0)
    expect(steps.tabIndex).toBe(-1)

    // Pointer selection is unchanged and moves the tab stop with it.
    await user.click(timers)
    expect(timers.getAttribute('aria-selected')).toBe('true')
    expect(timers.tabIndex).toBe(0)
    expect(screen.getByRole('tabpanel', { name: /timers/i })).toBeTruthy()
  })

  it('the start-timer button in the step header starts a timer for that step and turns into its clock', async () => {
    const user = userEvent.setup()
    renderAt('/cooking/fixture-curry')
    // Step 1 states no duration, so there is no button.
    expect(screen.queryByRole('button', { name: /^Start \d+-min timer$/ })).toBeNull()
    await user.keyboard('{ArrowRight}')
    await user.click(screen.getByRole('button', { name: 'Start 6-min timer' }))
    expect(fakes.speak).toHaveBeenCalledWith(expect.stringMatching(/^Timer set for/))
    expect(screen.queryByRole('button', { name: 'Start 6-min timer' })).toBeNull()
    expect(screen.getByRole('button', { name: /^6:00.*Pause step timer/ })).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: /^Timers\s*1\s*running$/ }))
    expect(screen.getByRole('button', { name: /^Pause Step 2$/ })).toBeTruthy()
  })

  it('shows a friendly page for an unknown recipe', () => {
    renderAt('/cooking/nope')
    expect(screen.getByRole('heading', { name: 'Recipe not found' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /back to recipes/i }).getAttribute('href')).toBe('/')
  })
})
