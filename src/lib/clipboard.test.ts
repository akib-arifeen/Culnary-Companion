import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value })
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'clipboard', original)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

describe('copyText', () => {
  it('writes the exact text and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    await expect(copyText('SHOPPING LIST\n[ ] Salt')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('SHOPPING LIST\n[ ] Salt')
  })

  it('reports failure when the browser has no clipboard API', async () => {
    setClipboard(undefined)
    await expect(copyText('anything')).resolves.toBe(false)
  })

  it('reports failure instead of throwing when the write is denied', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    await expect(copyText('anything')).resolves.toBe(false)
  })
})
