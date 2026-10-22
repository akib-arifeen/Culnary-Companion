import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router'
import { RecipeProvider } from './context/RecipeContext'
import { TimerProvider } from './context/TimerContext'
import HomeScreen from './screens/HomeScreen'
import RecipeOverviewScreen from './screens/RecipeOverviewScreen'
import CookingScreen from './screens/CookingScreen'
import SettingsScreen from './screens/SettingsScreen'
import FavoritesScreen from './screens/FavoritesScreen'
import SearchScreen from './screens/SearchScreen'
import RecentsScreen from './screens/RecentsScreen'
import TimerDoneBanner from './components/TimerDoneBanner'

/** BrowserRouter keeps the old scroll offset; without this a recipe opened from low in the grid starts mid-page. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
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
            <Route path="/cooking/:id" element={<CookingScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/favorites" element={<FavoritesScreen />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/recents" element={<RecentsScreen />} />
          </Routes>
        </Router>
      </TimerProvider>
    </RecipeProvider>
  )
}

export default App
