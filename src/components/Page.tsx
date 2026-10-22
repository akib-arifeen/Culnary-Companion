import type { ReactNode } from 'react'
import AppHeader from './AppHeader'
import BottomNav from './BottomNav'

interface PageProps {
  /** Omit on Home (brand mark, no back button). */
  title?: string
  /** Extra bottom padding for a fixed bar that sits above the nav (e.g. the recipe CTA). */
  withActionBar?: boolean
  children: ReactNode
}

/** Header + centred content column + bottom nav shared by every browse screen. */
export default function Page({ title, withActionBar = false, children }: PageProps) {
  return (
    <>
      <AppHeader title={title} />
      <main
        className={`mx-auto w-full max-w-5xl grow px-4 py-4 short:py-3 ${
          withActionBar ? 'pb-40 md:pb-24' : 'pb-24'
        }`}
      >
        {children}
      </main>
      <BottomNav />
    </>
  )
}
