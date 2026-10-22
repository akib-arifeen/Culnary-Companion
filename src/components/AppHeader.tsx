import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, ChefHat } from 'lucide-react'

interface AppHeaderProps {
  /** Page title with a back button. Omit on the home screen to show the brand mark instead. */
  title?: string
}

export default function AppHeader({ title }: AppHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // A deep link has no in-app history to go back to; fall back to Home instead of leaving the app.
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 short:h-11">
        {title ? (
          <>
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="-ml-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 short:size-9"
            >
              <ArrowLeft size={22} aria-hidden="true" />
            </button>
            <h1 className="min-w-0 truncate text-lg font-semibold text-stone-900">{title}</h1>
          </>
        ) : (
          <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-stone-900">
            <Link to="/" className="flex items-center gap-2 rounded-md">
              <ChefHat className="shrink-0 text-brand-700" size={26} aria-hidden="true" />
              <span className="truncate">Culinary Companion</span>
            </Link>
          </h1>
        )}
      </div>
    </header>
  )
}
