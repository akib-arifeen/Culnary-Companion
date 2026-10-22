import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import AppHeader from './AppHeader'
import BottomNav from './BottomNav'

afterEach(cleanup)

describe.each([
  ['BottomNav', BottomNav],
  ['AppHeader', AppHeader],
])('%s', (_name, Component) => {
  it('renders Recipes, Saved and Settings with aria-current on the current one', () => {
    render(
      <MemoryRouter initialEntries={['/favorites']}>
        <Component />
      </MemoryRouter>,
    )
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Recipes', 'Saved', 'Settings'])
    expect(links.map((l) => l.getAttribute('aria-current'))).toEqual([null, 'page', null])
  })

  it('marks Recipes current on /search and within a recipe', () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <Component />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Recipes' }).getAttribute('aria-current')).toBe('page')
  })
})
