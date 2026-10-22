import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { PREF_KEYS, readJSON, usePref, writeJSON } from '../lib/storage'

interface RecipeContextType {
  favorites: string[]
  inProgress: { [key: string]: number } // recipeId -> current step index (0-based)
  toggleFavorite: (recipeId: string) => void
  isFavorite: (recipeId: string) => boolean
  setInProgress: (recipeId: string, step: number) => void
  clearInProgress: (recipeId: string) => void
  getCurrentStep: (recipeId: string) => number | undefined
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined)

/** Storage is user-editable and may hold anything; keep only what has the right shape. */
function cleanFavorites(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
}

function cleanProgress(raw: unknown): { [key: string]: number } {
  const out: { [key: string]: number } = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [id, step] of Object.entries(raw)) {
      if (typeof step === 'number' && Number.isInteger(step) && step >= 0) out[id] = step
    }
  }
  return out
}

export const RecipeProvider = ({ children }: { children: ReactNode }) => {
  const [rawFavorites] = usePref<unknown>(PREF_KEYS.favorites, [])
  const [rawProgress] = usePref<unknown>(PREF_KEYS.progress, {})
  const favorites = useMemo(() => cleanFavorites(rawFavorites), [rawFavorites])
  const inProgress = useMemo(() => cleanProgress(rawProgress), [rawProgress])

  // Writers read the stored value again (not the render-time copy), so two quick taps in one tick
  // both apply.
  const toggleFavorite = useCallback((recipeId: string) => {
    const current = cleanFavorites(readJSON<unknown>(PREF_KEYS.favorites, []))
    writeJSON(
      PREF_KEYS.favorites,
      current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [...current, recipeId],
    )
  }, [])

  const setInProgress = useCallback((recipeId: string, step: number) => {
    const current = cleanProgress(readJSON<unknown>(PREF_KEYS.progress, {}))
    if (current[recipeId] === step) return
    writeJSON(PREF_KEYS.progress, { ...current, [recipeId]: step })
  }, [])

  const clearInProgress = useCallback((recipeId: string) => {
    const current = cleanProgress(readJSON<unknown>(PREF_KEYS.progress, {}))
    if (!(recipeId in current)) return
    const next = { ...current }
    delete next[recipeId]
    writeJSON(PREF_KEYS.progress, next)
  }, [])

  const isFavorite = useCallback((recipeId: string) => favorites.includes(recipeId), [favorites])
  const getCurrentStep = useCallback((recipeId: string) => inProgress[recipeId], [inProgress])

  const value = useMemo<RecipeContextType>(
    () => ({ favorites, inProgress, toggleFavorite, isFavorite, setInProgress, clearInProgress, getCurrentStep }),
    [favorites, inProgress, toggleFavorite, isFavorite, setInProgress, clearInProgress, getCurrentStep],
  )

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider
export const useRecipeContext = () => {
  const context = useContext(RecipeContext)
  if (!context) {
    throw new Error('useRecipeContext must be used within RecipeProvider')
  }
  return context
}
