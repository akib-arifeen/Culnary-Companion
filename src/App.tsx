import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router'
import { RecipeProvider } from './context/RecipeContext'
import { TimerProvider } from './context/TimerContext'
import HomeScreen from './screens/HomeScreen'
import RecipeOverviewScreen from './screens/RecipeOverviewScreen'
import SettingsScreen from './screens/SettingsScreen'
import FavoritesScreen from './screens/FavoritesScreen'
import SearchScreen from './screens/SearchScreen'
import RecentsScreen from './screens/RecentsScreen'
import ShoppingListScreen from './screens/ShoppingListScreen'
import NotFoundScreen from './screens/NotFoundScreen'
import TimerDoneBanner from './components/TimerDoneBanner'
import { Wordmark } from './components/ui/primitives'

// Cooking mode (media hooks, timers UI, onboarding) is its own chunk, so browsing doesn't download it.
const CookingScreen = lazy(() => import('./screens/CookingScreen'))

/** BrowserRouter keeps the old scroll offset; without this a recipe opened from low in the grid starts mid-page. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** The chunk is small and local, but a blank screen reads as broken. Say what is happening. */
function CookingLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper-2 px-6 text-center">
      <Wordmark />
      <p role="status" className="label-mono text-ink-2">
        Setting the pass…
      </p>
    </div>
  )
}

function App() {
  return (
    <RecipeProvider>
      <TimerProvider>
        <Router>
          <ScrollToTop />
          <TimerDoneBanner />
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/recipe/:id" element={<RecipeOverviewScreen />} />
            <Route
              path="/cooking/:id"
              element={
                <Suspense fallback={<CookingLoading />}>
                  <CookingScreen />
                </Suspense>
              }
            />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/favorites" element={<FavoritesScreen />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/recents" element={<RecentsScreen />} />
            <Route path="/shopping" element={<ShoppingListScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </Router>
      </TimerProvider>
    </RecipeProvider>
  )
}

export default App
