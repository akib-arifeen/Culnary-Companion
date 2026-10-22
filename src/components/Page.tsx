import type { ReactNode } from 'react'
import AppHeader from './AppHeader'
import BottomNav from './BottomNav'

interface PageProps {
  /** Extra bottom padding on phones for a sticky bar that sits above the bottom nav (the recipe CTA). */
  withActionBar?: boolean
  children: ReactNode
}

/** Top bar + centred content column + phone bottom nav. Screens bring their own <h1>. */
export default function Page({ withActionBar = false, children }: PageProps) {
  return (
    <>
      <a
        href="#main"
        className="label-mono sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-paper focus:p-3 focus:text-ink"
      >
        Skip to content
      </a>
      <AppHeader />
      <main
        id="main"
        className={`mx-auto w-full max-w-6xl grow px-4 pt-6 md:pt-10 ${withActionBar ? 'pb-40' : 'pb-24'} md:pb-16`}
      >
        {children}
      </main>
      <BottomNav />
    </>
  )
}
