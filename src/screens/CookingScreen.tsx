import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { ChefHat } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import CameraPip from '../components/cooking/CameraPip'
import CommandToast, { type ToastData } from '../components/cooking/CommandToast'
import CompletionDialog from '../components/cooking/CompletionDialog'
import ControlBar from '../components/cooking/ControlBar'
import CookingHeader, { StepProgress } from '../components/cooking/CookingHeader'
import CookingTabs from '../components/cooking/CookingTabs'
import HandsFreePanel from '../components/cooking/HandsFreePanel'
import IngredientsView from '../components/cooking/IngredientsView'
import StepView from '../components/cooking/StepView'
import TimersView from '../components/cooking/TimersView'
import { PIP_RESERVE, pipMode } from '../components/cooking/pipMode'
import { cancelTarget, latestPaused, runningSoonest, toggleTarget } from '../components/cooking/timerTargets'
import { BTN_PRIMARY } from '../components/cooking/ui'
import { useRecipeContext } from '../context/RecipeContext'
import { useTimers } from '../context/TimerContext'
import { getRecipeById, type Recipe } from '../data/recipes'
import { useGestureRecognizer } from '../hooks/useGestureRecognizer'
import { useSpeechCommands } from '../hooks/useSpeechCommands'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { describeCommand, type Command, type CommandSource, type CookingTab } from '../lib/commands'
import { cookingReducer, initCookingState } from '../lib/cookingSession'
import { GESTURE_COMMANDS, GESTURE_GUIDE, type GestureName } from '../lib/gestures'
import { keyToCommand } from '../lib/keyboard'
import { PREF_DEFAULTS, PREF_KEYS, usePref } from '../lib/storage'
import { formatSpokenDuration, isRunning, type KitchenTimer } from '../lib/timers'
import { matchIngredient, parseVoiceCommand } from '../lib/voiceParser'

function RecipeNotFound() {
  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-cream px-6 text-center text-stone-900">
      <ChefHat className="size-12 text-brand-700" aria-hidden="true" />
      <h1 className="text-3xl font-semibold">Recipe not found</h1>
      <p className="max-w-sm text-lg text-stone-600">We couldn’t find that recipe. It may have been removed.</p>
      <Link to="/" className={`${BTN_PRIMARY} h-12`}>
        Back to recipes
      </Link>
    </main>
  )
}

export default function CookingScreen() {
  const { id } = useParams<{ id: string }>()
  const recipe = id ? getRecipeById(id) : undefined
  if (!recipe || recipe.steps.length === 0) return <RecipeNotFound />
  return <CookingSession key={recipe.id} recipe={recipe} />
}

interface Latest {
  run: (command: Command, source: CommandSource, heard?: string) => void
  onKeyCommand: (command: Command, event: KeyboardEvent) => void
  setInProgress: (recipeId: string, step: number) => void
  clearInProgress: (recipeId: string) => void
  speakStep: (index: number) => void
  speakSteps: boolean
  panelOpen: boolean
  onTimerDone: (timer: KitchenTimer) => void
}

const FINISHED_OK = new Set<Command['type']>(['previous', 'goToStep', 'help', 'stopSpeaking'])
const GESTURE_IN_GUIDE = new Set<GestureName>(GESTURE_GUIDE.map((g) => g.gesture))

function readInIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

function isFailed(status: string): boolean {
  return status === 'denied' || status === 'unavailable' || status === 'error'
}

function CookingSession({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate()
  const { setInProgress, clearInProgress, getCurrentStep } = useRecipeContext()
  const timers = useTimers()

  const [voicePref, setVoicePref] = usePref<boolean>(PREF_KEYS.voice, PREF_DEFAULTS[PREF_KEYS.voice])
  const [gesturesPref, setGesturesPref] = usePref<boolean>(PREF_KEYS.gestures, PREF_DEFAULTS[PREF_KEYS.gestures])
  const [speakSteps, setSpeakSteps] = usePref<boolean>(PREF_KEYS.speakSteps, PREF_DEFAULTS[PREF_KEYS.speakSteps])
  const [cameraPreview, setCameraPreview] = usePref<boolean>(PREF_KEYS.cameraPreview, PREF_DEFAULTS[PREF_KEYS.cameraPreview])
  const [onboarded, setOnboarded] = usePref<boolean>(PREF_KEYS.onboarded, PREF_DEFAULTS[PREF_KEYS.onboarded])

  const [state, dispatch] = useReducer(cookingReducer, recipe, (r) =>
    initCookingState({
      stepCount: r.steps.length,
      ingredientCount: r.ingredients.length,
      startStep: getCurrentStep(r.id) ?? 0,
    }),
  )
  const [panelOpen, setPanelOpen] = useState(() => !onboarded)
  const [learned, setLearned] = useState<ReadonlySet<GestureName>>(() => new Set())
  const [toast, setToast] = useState<ToastData | null>(null)
  const [inIframe] = useState(readInIframe)

  const toastKey = useRef(0)
  const consideredStep = useRef<number | null>(null)
  const hasSpoken = useRef(false)
  const latest = useRef<Latest | null>(null)
  const layoutRef = useRef<HTMLDivElement>(null)

  const speech = useSpeechSynthesis({ rate: 0.95 })
  const { speak } = speech
  const ingredientNames = recipe.ingredients.map((i) => i.name)
  const stepText = (index: number) => `Step ${index + 1}. ${recipe.steps[index].instruction}`

  const notify = (kind: ToastData['kind'], text: string, heard?: string) => {
    toastKey.current += 1
    setToast({ key: toastKey.current, kind, text, heard })
  }

  const openPanel = () => {
    setLearned(new Set())
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setOnboarded(true)
    // The first step was held back while the panel was open; read it now that the cook is ready.
    if (speakSteps && !hasSpoken.current && !state.finished) {
      speak(stepText(state.stepIndex))
      hasSpoken.current = true
    }
  }

  const startTimer = (minutesArg?: number) => {
    const number = state.stepIndex + 1
    const minutes = minutesArg ?? recipe.steps[state.stepIndex].duration ?? 5
    const id = timers.start(
      minutesArg === undefined ? { label: `Step ${number}`, minutes, stepNumber: number } : { label: `${minutes} min timer`, minutes },
    )
    speak(id === '' ? 'I couldn’t set that timer.' : `Timer set for ${formatSpokenDuration(minutes * 60_000)}.`)
  }

  const tabPhrase = (tab: CookingTab): string =>
    tab === 'ingredients' ? `Ingredients, ${state.checked.size} of ${recipe.ingredients.length} checked.` : tab === 'steps' ? 'Steps.' : 'Timers.'

  /** The one place every input (tap, key, voice, gesture) ends up. */
  const run = (command: Command, source: CommandSource, heard?: string) => {
    // The completion dialog is up: only going back, jumping, help and silence still make sense.
    if (state.finished && !FINISHED_OK.has(command.type)) return
    if (source !== 'tap') notify(source, describeCommand(command), heard)
    const confirm = source === 'voice' || source === 'gesture'
    switch (command.type) {
      case 'next':
      case 'previous':
        dispatch({ type: command.type })
        break
      case 'goToStep':
        dispatch({ type: 'goToStep', index: command.step - 1 })
        break
      case 'repeat':
        speak(stepText(state.stepIndex))
        break
      case 'stopSpeaking':
        speech.cancel()
        break
      case 'help':
        openPanel()
        break
      case 'showTab':
        dispatch({ type: 'showTab', tab: command.tab })
        if (confirm) speak(tabPhrase(command.tab))
        break
      case 'toggleIngredients':
        dispatch({ type: 'toggleIngredients' })
        if (confirm) speak(tabPhrase(state.tab === 'ingredients' ? 'steps' : 'ingredients'))
        break
      case 'checkAll':
        dispatch({ type: 'checkAll', checked: command.checked })
        if (confirm) speak(command.checked ? 'All checked.' : 'All unchecked.')
        break
      case 'checkIngredient': {
        const index = matchIngredient(command.query, ingredientNames)
        if (index === null) {
          speak(`I couldn’t find ${command.query}.`)
          notify('info', `I couldn’t find ${command.query}.`)
          break
        }
        const want = command.checked ?? !state.checked.has(index)
        dispatch({ type: 'setIngredient', index, checked: want })
        speak(`${ingredientNames[index]} ${want ? 'checked' : 'unchecked'}.`)
        break
      }
      case 'startTimer':
        startTimer(command.minutes)
        break
      case 'resumeTimer': {
        const target = latestPaused(timers.timers)
        if (target) timers.resume(target.id)
        else startTimer()
        break
      }
      case 'pauseTimer':
      case 'toggleTimer':
      case 'resetTimer': {
        const target =
          command.type === 'pauseTimer'
            ? runningSoonest(timers.timers, timers.now)
            : command.type === 'toggleTimer'
              ? toggleTarget(timers.timers, timers.now)
              : timers.timers[timers.timers.length - 1]
        if (!target) speak('No timer running.')
        else if (command.type === 'pauseTimer') timers.pause(target.id)
        else if (command.type === 'toggleTimer') timers.toggle(target.id)
        else timers.reset(target.id)
        break
      }
      case 'cancelTimer': {
        const target = cancelTarget(timers.timers, timers.now)
        if (target) {
          timers.remove(target.id)
          speak('Timer cancelled.')
        } else speak('No timer to cancel.')
        break
      }
    }
  }

  const onGesture = (gesture: GestureName) => {
    if (panelOpen) {
      if (GESTURE_IN_GUIDE.has(gesture) && !learned.has(gesture)) setLearned(new Set(learned).add(gesture))
      return
    }
    const command = GESTURE_COMMANDS[gesture]
    if (command) run(command, 'gesture')
  }

  const onTranscript = (transcript: string) => {
    if (panelOpen) return
    const command = parseVoiceCommand(transcript, { ingredientNames })
    if (command) run(command, 'voice', transcript)
    else notify('voice', `Didn’t catch “${transcript}”. Say “help” for commands.`)
  }

  const voice = useSpeechCommands({ enabled: voicePref, muted: speech.speaking, onTranscript })
  const gestures = useGestureRecognizer({ enabled: gesturesPref, onGesture })

  // While a dialog is open the rest of the screen is unreachable by keyboard and screen readers.
  // Layout effect: it must lift `inert` before the closing dialog hands focus back to its opener.
  const dialogOpen = panelOpen || state.finished
  useLayoutEffect(() => {
    if (layoutRef.current) layoutRef.current.inert = dialogOpen
  }, [dialogOpen])

  // Effects read the freshest closures through this ref, so they subscribe once instead of every render.
  useEffect(() => {
    latest.current = {
      run,
      onKeyCommand: (command, event) => {
        if (panelOpen) {
          // Only "help" (? / h) means anything while the panel is open; Escape is handled by the dialog.
          if (command.type === 'help') {
            event.preventDefault()
            closePanel()
          }
          return
        }
        event.preventDefault()
        run(command, 'key')
      },
      setInProgress,
      clearInProgress,
      speakStep: (index) => {
        speak(stepText(index))
        hasSpoken.current = true
      },
      speakSteps,
      panelOpen,
      onTimerDone: (timer) => {
        speak(`Time’s up for ${timer.label}.`)
        notify('info', `Time’s up: ${timer.label}`)
      },
    }
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const target = event.target
      // A focused checkbox is not a typing target: keep the shortcuts alive after ticking an ingredient.
      const typingTarget = target instanceof HTMLInputElement && target.type === 'checkbox' ? null : target
      const command = keyToCommand({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        target: typingTarget,
      })
      if (command) latest.current?.onKeyCommand(command, event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const { stepIndex, finished } = state
  const recipeId = recipe.id

  useEffect(() => {
    latest.current?.setInProgress(recipeId, stepIndex)
  }, [recipeId, stepIndex])

  useEffect(() => {
    if (finished) latest.current?.clearInProgress(recipeId)
  }, [recipeId, finished])

  // Read each new step aloud. The very first one waits for a user gesture (autoplay policy)
  // and for the onboarding panel to close.
  useEffect(() => {
    if (consideredStep.current === stepIndex) return
    const first = consideredStep.current === null
    consideredStep.current = stepIndex
    const l = latest.current
    if (!l || !l.speakSteps || l.panelOpen) return
    if (first && !navigator.userActivation?.hasBeenActive) return
    l.speakStep(stepIndex)
  }, [stepIndex])

  const { onDone } = timers
  useEffect(() => onDone((timer) => latest.current?.onTimerDone(timer)), [onDone])

  const step = recipe.steps[state.stepIndex]
  const nextStep = recipe.steps[state.stepIndex + 1]
  const stepNumber = state.stepIndex + 1
  const stepTimer = timers.timers.find((t) => t.stepNumber === stepNumber)
  const runningCount = timers.timers.filter(isRunning).length

  const voiceProblem = voicePref && isFailed(voice.status)
  const mode = pipMode({ gesturesOn: gesturesPref, previewPref: cameraPreview, gesturesStatus: gestures.status, voiceProblem })
  const problemText = gesturesPref && isFailed(gestures.status) ? 'Gestures need attention' : 'Voice needs attention'

  const retry = (set: (value: boolean) => void) => {
    set(false)
    window.setTimeout(() => set(true), 150)
  }

  return (
    <>
      <div ref={layoutRef} className="flex h-[100dvh] flex-col overflow-hidden bg-cream text-stone-900">
        <CookingHeader
          recipeId={recipe.id}
          title={recipe.title}
          voiceStatus={voice.status}
          gesturesStatus={gestures.status}
          heard={voice.heard}
          voiceOn={voicePref}
          voicePaused={speech.speaking}
          onOpenHelp={openPanel}
        />
        <StepProgress stepIndex={state.stepIndex} stepCount={state.stepCount} />

        <main className="relative min-h-0 flex-1">
          <div id="cooking-panel" role="tabpanel" aria-labelledby={`cooking-tab-${state.tab}`} className={`h-full min-h-0 ${PIP_RESERVE[mode]}`}>
            {state.tab === 'steps' ? (
              <StepView
                stepNumber={stepNumber}
                stepCount={state.stepCount}
                instruction={step.instruction}
                duration={step.duration}
                stepTimer={stepTimer}
                now={timers.now}
                nextInstruction={nextStep?.instruction}
                onStartTimer={() => run({ type: 'startTimer' }, 'tap')}
                onToggleTimer={timers.toggle}
              />
            ) : state.tab === 'ingredients' ? (
              <IngredientsView
                ingredients={recipe.ingredients}
                checked={state.checked}
                onToggle={(index) => dispatch({ type: 'setIngredient', index })}
                onCheckAll={(checked) => run({ type: 'checkAll', checked }, 'tap')}
              />
            ) : (
              <TimersView
                timers={timers.timers}
                now={timers.now}
                stepDuration={step.duration}
                onStartPreset={startTimer}
                onStartStepTimer={() => run({ type: 'startTimer' }, 'tap')}
                onToggle={timers.toggle}
                onReset={timers.reset}
                onRemove={timers.remove}
              />
            )}
          </div>
          {panelOpen || finished ? null : (
            <CameraPip
              mode={mode}
              status={gestures.status}
              live={gestures.live}
              videoRef={gestures.videoRef}
              problemText={problemText}
              onHidePreview={() => setCameraPreview(false)}
              onShowPreview={() => setCameraPreview(true)}
              onOpenHelp={openPanel}
            />
          )}
        </main>

        <ControlBar
          isFirst={state.stepIndex === 0}
          isLast={state.stepIndex === state.stepCount - 1}
          speaking={speech.speaking}
          onStopReading={speech.cancel}
          onBack={() => run({ type: 'previous' }, 'tap')}
          onRead={() => run({ type: 'repeat' }, 'tap')}
          onNext={() => run({ type: 'next' }, 'tap')}
        />
        <CookingTabs
          tab={state.tab}
          onSelect={(tab) => run({ type: 'showTab', tab }, 'tap')}
          checkedCount={state.checked.size}
          ingredientCount={state.ingredientCount}
          runningTimers={runningCount}
        />

      </div>

      <CommandToast toast={toast} onDismiss={() => setToast(null)} />

      {finished ? (
        <CompletionDialog recipeTitle={recipe.title} onHome={() => navigate('/')} onReview={() => dispatch({ type: 'resume' })} />
      ) : null}
      {panelOpen ? (
        <HandsFreePanel
          firstTime={!onboarded}
          onClose={closePanel}
          gesturesOn={gesturesPref}
          onToggleGestures={() => setGesturesPref(!gesturesPref)}
          onRetryGestures={() => retry(setGesturesPref)}
          gesturesStatus={gestures.status}
          gesturesMessage={gestures.message}
          live={gestures.live}
          videoRef={gestures.videoRef}
          learned={learned}
          voiceOn={voicePref}
          onToggleVoice={() => setVoicePref(!voicePref)}
          onRetryVoice={() => retry(setVoicePref)}
          voice={voice}
          speaking={speech.speaking}
          speakSteps={speakSteps}
          onToggleSpeakSteps={() => setSpeakSteps(!speakSteps)}
          ingredientExample={ingredientNames[0]?.toLowerCase() ?? ''}
          inIframe={inIframe}
        />
      ) : null}
    </>
  )
}
