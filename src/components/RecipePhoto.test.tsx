import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FULL } from '../screens/recipeFixtures'
import RecipePhoto from './RecipePhoto'

describe('RecipePhoto', () => {
  afterEach(cleanup)

  it('renders the image with its width, height and alt text', () => {
    render(<RecipePhoto photo={FULL.photo} />)
    const img = screen.getByRole('img', { name: 'A bowl of chickpea stew' }) as HTMLImageElement
    expect(img.src).toContain('/recipes/alpha.webp')
    expect(img.width).toBe(800)
    expect(img.height).toBe(600)
  })

  it('replaces a broken file with a visible state, keeping the layout class and describing the missing photo', () => {
    render(<RecipePhoto photo={FULL.photo} className="aspect-4/3 w-full" />)
    fireEvent.error(screen.getByRole('img', { name: 'A bowl of chickpea stew' }))
    const fallback = screen.getByRole('img', { name: 'Photo unavailable: A bowl of chickpea stew' })
    expect(fallback.className).toContain('aspect-4/3')
    expect(fallback.textContent).toContain('Photo unavailable')
    expect(screen.queryByRole('img', { name: 'A bowl of chickpea stew' })).toBeNull()
  })

  it('starts in the fallback when the data has no source at all', () => {
    render(<RecipePhoto photo={{ ...FULL.photo, src: '' }} compact />)
    expect(screen.getByText('No photo')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'No photo: A bowl of chickpea stew' })).toBeTruthy()
  })
})
