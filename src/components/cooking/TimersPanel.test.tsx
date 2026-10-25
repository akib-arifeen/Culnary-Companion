import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KitchenTimer } from '../../lib/timers'
import TimersPanel from './TimersPanel'

const NOW = 10_000_000

function timer(overrides: Partial<KitchenTimer> = {}): KitchenTimer {
  return {
    id: 't1',
    label: 'Step 2',
    durationMs: 6 * 60_000,
    endsAt: NOW + 5 * 60_000,
    pausedRemainingMs: 0,
    done: false,
    ...overrides,
  }
}

function renderPanel(timers: KitchenTimer[], onStartMinutes = vi.fn()) {
  render(
    <TimersPanel
      timers={timers}
      now={NOW}
      recipeId="fixture-curry"
      stepNumber={1}
      stepChipVisible={false}
      onStartMinutes={onStartMinutes}
      onStartStepTimer={vi.fn()}
      onToggle={vi.fn()}
      onReset={vi.fn()}
      onRemove={vi.fn()}
    />,
  )
  return onStartMinutes
}

describe('TimersPanel finished timers', () => {
  afterEach(cleanup)

  it('a finished timer is static, named as finished, and is not a live countdown', () => {
    const { container } = render(
      <TimersPanel
        timers={[timer({ done: true, endsAt: null })]}
        now={NOW}
        recipeId="fixture-curry"
        stepNumber={1}
        stepChipVisible={false}
        onStartMinutes={vi.fn()}
        onStartStepTimer={vi.fn()}
        onToggle={vi.fn()}
        onReset={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByText('1 finished')).toBeTruthy()
    expect(screen.queryByText('Paused')).toBeNull()
    expect(screen.getByText('Time’s up')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Dismiss Step 2' })).toBeTruthy()
    // No pulsing wash, and no timer role for something that is no longer counting.
    expect(container.querySelector('[class*="live-pulse"]')).toBeNull()
    expect(container.querySelector('[role="timer"]')).toBeNull()
  })

  it('keeps running, finished and paused counts apart', () => {
    renderPanel([
      timer({ id: 'run' }),
      timer({ id: 'done', done: true, endsAt: null }),
      timer({ id: 'paused', endsAt: null, pausedRemainingMs: 90_000 }),
    ])
    expect(screen.getByText('1 running · 1 finished · 1 paused')).toBeTruthy()
    expect(screen.getAllByRole('timer')).toHaveLength(2)
  })
})

describe('TimersPanel custom duration', () => {
  afterEach(cleanup)

  it('starts a whole-minute timer and confirms it in a live status', async () => {
    const user = userEvent.setup()
    const onStart = renderPanel([])
    const input = screen.getByLabelText('Custom timer') as HTMLInputElement
    await user.type(input, '7')
    await user.click(screen.getByRole('button', { name: 'Start timer' }))
    expect(onStart).toHaveBeenCalledWith(7)
    expect(input.value).toBe('')
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('Timer set for 7 minutes.')
  })

  it('keeps the field and its confirmation after the first timer starts', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    const shared = {
      now: NOW,
      recipeId: 'fixture-curry',
      stepNumber: 1,
      stepChipVisible: false,
      onStartStepTimer: vi.fn(),
      onToggle: vi.fn(),
      onReset: vi.fn(),
      onRemove: vi.fn(),
      onStartMinutes: onStart,
    }
    const { rerender } = render(<TimersPanel {...shared} timers={[]} />)
    await user.type(screen.getByLabelText('Custom timer'), '3')
    await user.click(screen.getByRole('button', { name: 'Start timer' }))
    expect(onStart).toHaveBeenCalledWith(3)
    rerender(<TimersPanel {...shared} timers={[timer({ id: 'new', durationMs: 3 * 60_000 })]} />)
    expect(screen.getByLabelText('Custom timer')).toBeTruthy()
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('Timer set for 3 minutes.')
  })

  it('rejects an empty value, focuses the field and links the message to it', async () => {
    const user = userEvent.setup()
    const onStart = renderPanel([])
    const input = screen.getByLabelText('Custom timer') as HTMLInputElement
    await user.click(screen.getByRole('button', { name: 'Start timer' }))
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Enter a number of minutes.')
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('custom-timer-help custom-timer-error')
  })

  it.each(['0', '181', '2.5', 'seven'])('rejects %j with the accepted range', async (value) => {
    const user = userEvent.setup()
    const onStart = renderPanel([])
    const input = screen.getByLabelText('Custom timer')
    await user.type(input, value)
    await user.click(screen.getByRole('button', { name: 'Start timer' }))
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/whole minutes/i)
    expect(document.activeElement).toBe(input)
  })
})
