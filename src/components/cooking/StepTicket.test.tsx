import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StepTicket from './StepTicket'

function renderStep(instruction: string) {
  return render(
    <StepTicket
      stepNumber={1}
      stepCount={4}
      instruction={instruction}
      now={0}
      onStartTimer={vi.fn()}
      onToggleTimer={vi.fn()}
      onResetTimer={vi.fn()}
    />,
  )
}

describe('StepTicket instruction sizing', () => {
  afterEach(cleanup)

  it('keeps the full size up to 100 characters', () => {
    const instruction = 'a'.repeat(99) + '.'
    renderStep(instruction)
    const text = screen.getByText(instruction)
    expect(text.classList.contains('text-step')).toBe(true)
    expect(text.classList.contains('text-step-s')).toBe(false)
  })

  it('steps down a rung past 100 characters so the step fits the ticket without scrolling', () => {
    const instruction =
      'Stovetop method: pan fry for 2–3 minutes per side, depending on thickness, until the fish is flaky when pulled apart with a fork.'
    expect(instruction.length).toBeGreaterThan(100)
    renderStep(instruction)
    const text = screen.getByText(instruction)
    expect(text.classList.contains('text-step-s')).toBe(true)
    expect(text.classList.contains('text-step')).toBe(false)
    expect(text.textContent).toBe(instruction)
    expect(text.classList.contains('break-words')).toBe(true)
  })
})
