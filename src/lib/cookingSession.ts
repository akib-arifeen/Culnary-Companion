import type { CookingTab } from './commands'

export interface CookingState {
  readonly stepCount: number
  readonly ingredientCount: number
  /** 0-based. Always within [0, stepCount - 1]. */
  readonly stepIndex: number
  readonly tab: CookingTab
  /** Indices of checked ingredients. Never mutated — a new Set on every change. */
  readonly checked: ReadonlySet<number>
  /** True after "next" on the last step. */
  readonly finished: boolean
}

export type CookingAction =
  | { type: 'next' }
  | { type: 'previous' }
  /** 0-based index. Out of range -> no-op. */
  | { type: 'goToStep'; index: number }
  | { type: 'showTab'; tab: CookingTab }
  | { type: 'toggleIngredients' }
  /** checked omitted = toggle. Out of range -> no-op. */
  | { type: 'setIngredient'; index: number; checked?: boolean }
  | { type: 'checkAll'; checked: boolean }
  /** Clears `finished` (e.g. user dismisses the completion dialog to review). */
  | { type: 'resume' }

/**
 * startStep is clamped into range (a saved step from an older recipe version must not crash).
 * stepCount must be >= 1.
 */
export function initCookingState(opts: { stepCount: number; ingredientCount: number; startStep?: number }): CookingState {
  const stepCount = Math.max(1, opts.stepCount)
  const start = Math.trunc(opts.startStep ?? 0)
  return {
    stepCount,
    ingredientCount: opts.ingredientCount,
    stepIndex: Number.isFinite(start) ? Math.min(Math.max(start, 0), stepCount - 1) : 0,
    tab: 'steps',
    checked: new Set<number>(),
    finished: false,
  }
}

/**
 * Pure reducer. Rules:
 *  - next: if not on the last step -> stepIndex + 1. On the last step -> finished = true (stepIndex unchanged).
 *    Always switches tab to 'steps'.
 *  - previous: stepIndex - 1 if > 0, tab -> 'steps', finished = false. When finished on the last step, previous only
 *    clears finished (stays on the last step, so 'back' from the completion dialog returns to the final step).
 *    At step 0 with tab already 'steps' and not finished -> return the SAME state object.
 *  - goToStep: valid index -> stepIndex = index, tab -> 'steps', finished = false. Invalid -> same object.
 *  - showTab: tab = action.tab (same object if unchanged).
 *  - toggleIngredients: 'ingredients' -> 'steps'; any other tab -> 'ingredients'.
 *  - setIngredient / checkAll: new Set; checkAll true = every index 0..ingredientCount-1, false = empty.
 *    checkAll that changes nothing (already all / already none) -> SAME object.
 *  - resume: finished = false.
 * Any no-op returns the same state object so React skips the render.
 */
export function cookingReducer(state: CookingState, action: CookingAction): CookingState {
  switch (action.type) {
    case 'next':
      if (state.stepIndex < state.stepCount - 1) return { ...state, stepIndex: state.stepIndex + 1, tab: 'steps' }
      return state.finished && state.tab === 'steps' ? state : { ...state, tab: 'steps', finished: true }
    case 'previous':
      if (state.finished) return { ...state, tab: 'steps', finished: false }
      if (state.stepIndex > 0) return { ...state, stepIndex: state.stepIndex - 1, tab: 'steps' }
      return state.tab === 'steps' ? state : { ...state, tab: 'steps' }
    case 'goToStep': {
      const { index } = action
      if (!Number.isInteger(index) || index < 0 || index >= state.stepCount) return state
      if (index === state.stepIndex && state.tab === 'steps' && !state.finished) return state
      return { ...state, stepIndex: index, tab: 'steps', finished: false }
    }
    case 'showTab':
      return state.tab === action.tab ? state : { ...state, tab: action.tab }
    case 'toggleIngredients':
      return { ...state, tab: state.tab === 'ingredients' ? 'steps' : 'ingredients' }
    case 'setIngredient': {
      const { index } = action
      if (!Number.isInteger(index) || index < 0 || index >= state.ingredientCount) return state
      const has = state.checked.has(index)
      const want = action.checked ?? !has
      if (want === has) return state
      const checked = new Set(state.checked)
      if (want) checked.add(index)
      else checked.delete(index)
      return { ...state, checked }
    }
    case 'checkAll': {
      const size = action.checked ? state.ingredientCount : 0
      if (state.checked.size === size) return state
      const checked = new Set<number>()
      if (action.checked) for (let i = 0; i < state.ingredientCount; i++) checked.add(i)
      return { ...state, checked }
    }
    case 'resume':
      return state.finished ? { ...state, finished: false } : state
  }
}
