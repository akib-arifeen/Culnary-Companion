/**
 * The command bus. Every input modality — tap, keyboard, voice, hand gesture —
 * is translated into one of these commands, and the cooking screen handles them
 * in exactly one place. Adding a modality means writing a translator, never a
 * second handler.
 */

export type CookingTab = 'steps' | 'ingredients' | 'timers'

export type Command =
  | { type: 'next' }
  | { type: 'previous' }
  /** Read the current step aloud again. */
  | { type: 'repeat' }
  /** 1-based step number, as spoken ("go to step 3"). */
  | { type: 'goToStep'; step: number }
  | { type: 'showTab'; tab: CookingTab }
  /** Ingredients <-> steps. */
  | { type: 'toggleIngredients' }
  /** Omitted minutes = the current step's duration if it has one, else 5. */
  | { type: 'startTimer'; minutes?: number }
  | { type: 'pauseTimer' }
  | { type: 'resumeTimer' }
  | { type: 'toggleTimer' }
  | { type: 'resetTimer' }
  /** Remove a timer: a finished one first, else the running one with least time left. */
  | { type: 'cancelTimer' }
  /** `checked` omitted = toggle. `query` is free text resolved with `matchIngredient`. */
  | { type: 'checkIngredient'; query: string; checked?: boolean }
  | { type: 'checkAll'; checked: boolean }
  | { type: 'stopSpeaking' }
  | { type: 'help' }

export type CommandSource = 'tap' | 'key' | 'voice' | 'gesture'

/**
 * Short human label for feedback toasts, e.g. "Next step", "Timer: 7 min",
 * "Show ingredients", "Check: garlic", "Uncheck all". Never empty.
 */
export function describeCommand(command: Command): string {
  switch (command.type) {
    case 'next':
      return 'Next step'
    case 'previous':
      return 'Previous step'
    case 'repeat':
      return 'Read step again'
    case 'goToStep':
      return `Go to step ${command.step}`
    case 'showTab':
      return command.tab === 'steps' ? 'Show steps' : command.tab === 'ingredients' ? 'Show ingredients' : 'Show timers'
    case 'toggleIngredients':
      return 'Ingredients'
    case 'startTimer':
      return command.minutes ? `Timer: ${command.minutes} min` : 'Start step timer'
    case 'pauseTimer':
      return 'Pause timer'
    case 'resumeTimer':
      return 'Resume timer'
    case 'toggleTimer':
      return 'Pause / resume timer'
    case 'resetTimer':
      return 'Reset timer'
    case 'cancelTimer':
      return 'Cancel timer'
    case 'checkIngredient':
      return `${command.checked === false ? 'Uncheck' : 'Check'}: ${command.query}`
    case 'checkAll':
      return command.checked ? 'Check all' : 'Uncheck all'
    case 'stopSpeaking':
      return 'Stop talking'
    case 'help':
      return 'Help'
  }
}
