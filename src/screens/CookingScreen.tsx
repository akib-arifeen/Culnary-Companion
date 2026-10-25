import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { ChefHat } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import CameraPip from '../components/cooking/CameraPip'
import CompletionDialog from '../components/cooking/CompletionDialog'
import ControlStrip from '../components/cooking/ControlStrip'
import CookingTabs from '../components/cooking/CookingTabs'
import HandsFreePanel from '../components/cooking/HandsFreePanel'
import HeardStrip, { type HeardData } from '../components/cooking/HeardStrip'
import IngredientsPanel from '../components/cooking/IngredientsPanel'
import StepTicket from '../components/cooking/StepTicket'
import TimersPanel from '../components/cooking/TimersPanel'
import TopBar from '../components/cooking/TopBar'
import { PIP_RESERVE, pipMode } from '../components/cooking/pipMode'
import { cancelTarget, latestPaused, resetTarget, runningSoonest, toggleTarget } from '../components/cooking/timerTargets'
import { useCookingLayout } from '../components/cooking/useCookingLayout'
import { ButtonLink } from '../components/ui/primitives'
import { useRecipeContext } from '../context/RecipeContext'
import { useTimers } from '../context/TimerContext'
import { getRecipeById } from '../data/recipes'
import type { Recipe } from '../data/types'
import { useGestureRecognizer } from '../hooks/useGestureRecognizer'
import { useSpeechCommands } from '../hooks/useSpeechCommands'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { describeCommand, type Command, type CommandSource, type CookingTab } from '../lib/commands'
import { cookingReducer, initCookingState } from '../lib/cookingSession'
import { GESTURE_COMMANDS, GESTURE_GUIDE, type GestureName } from '../lib/gestures'
import { ingredientsInStep } from '../lib/ingredientsInStep'
import { keyToCommand } from '../lib/keyboard'
import { PREF_DEFAULTS, PREF_KEYS, usePref } from '../lib/storage'
import { formatSpokenDuration, isRunning, type KitchenTimer } from '../lib/timers'
import { matchIngredient, parseVoiceCommand } from '../lib/voiceParser'

function RecipeNotFound() {
  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-paper-2 px-6 text-center text-ink">
      <ChefHat className="size-12 text-ink" strokeWidth={2} aria-hidden="true" />
      <h1 className="text-title font-extrabold">Recipe not found</h1>
      <p className="max-w-sm text-lg text-ink-2">We couldn’t find that recipe. It may have been removed.</p>
      <ButtonLink to="/" size="lg">
        Back to recipes
      </ButtonLink>
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

const FINISHED_OK = new Set<Command['type']>(['previous', 'goToStep', 'stopSpeaking'])
const GESTURE_IN_GUIDE = new Set<GestureName>(GESTURE_GUIDE.map((g) => g.gesture))

function readInIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
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
  const [panelSection, setPanelSection] = useState<'voice' | 'gestures' | null>(null)
  const [learned, setLearned] = useState<ReadonlySet<GestureName>>(() => new Set())
  const [heard, setHeard] = useState<HeardData | null>(null)
  const [inIframe] = useState(readInIframe)

  const heardKey = useRef(0)
  const consideredStep = useRef<number | null>(null)
  const hasSpoken = useRef(false)
  const latest = useRef<Latest | null>(null)
  const layoutRef = useRef<HTMLDivElement>(null)
  const ingredientsRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<HTMLDivElement>(null)
  const layout = useCookingLayout()

  const speech = useSpeechSynthesis({ rate: 0.95 })
  const { speak } = speech
  const ingredientNames = recipe.ingredients.map((i) => i.name)
  const stepText = (index: number) => `Step ${index + 1}. ${recipe.steps[index].instruction}`

  /** Feedback lives in the HEARD strip (there are no toasts on the cooking screen). */
  const notify = (kind: HeardData['kind'], text: string, heardText?: string) => {
    heardKey.current += 1
    setHeard({ key: heardKey.current, kind, text, heard: heardText })
  }

  const openPanel = (section?: 'voice' | 'gestures') => {
    setLearned(new Set())
    setPanelSection(section ?? null)
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

  const startTimer = (minutesArg?: number, announce = true) => {
    const number = state.stepIndex + 1
    const current = recipe.steps[state.stepIndex]
    // A timer is only ever backed by a time the step states (or a time the cook gives outright).
    // With neither, say how to give one instead of inventing a duration.
    const minutes = minutesArg ?? current.duration
    if (minutes === undefined) {
      const text = `Step ${number} doesn’t state a time. Say “set a timer for 10 minutes” to choose one.`
      notify('info', text)
      speak(text)
      return
    }
    const perSide = minutesArg === undefined && /per side/i.test(current.instruction)
    const id = timers.start(
      minutesArg === undefined ? { label: `Step ${number}`, minutes, stepNumber: number, recipeId: recipe.id } : { label: `${minutes} min timer`, minutes },
    )
    if (!announce) return
    speak(
      id === ''
        ? 'I couldn’t set that timer.'
        : `Timer set for ${formatSpokenDuration(minutes * 60_000)}${perSide ? ' per side' : ''}.`,
    )
  }

  const tabPhrase = (tab: CookingTab): string =>
    tab === 'ingredients' ? `Ingredients, ${state.checked.size} of ${recipe.ingredients.length} checked.` : tab === 'steps' ? 'Steps.' : 'Timers.'

  /** The one place every input (tap, key, voice, gesture) ends up. */
  const run = (command: Command, source: CommandSource, heard?: string) => {
    // The completion dialog is up: only going back, jumping to a step and stopping speech still run.
    // Help is ignored here, so "?" cannot open the panel behind the dialog.
    if (state.finished && !FINISHED_OK.has(command.type)) return
    if (source !== 'tap') notify(source, describeCommand(command), heard)
    const confirm = source === 'voice' || source === 'gesture'
    switch (command.type) {
      case 'next':
      case 'previous':
        dispatch({ type: command.type })
        break
      case 'goToStep': {
        // A number the recipe has no step for must say so: the reducer no-ops, and a silent no-op
        // looks like the command was never heard.
        const target = command.step
        if (!Number.isInteger(target) || target < 1 || target > state.stepCount) {
          const text = `There is no step ${target}. This recipe has ${state.stepCount} steps (1–${state.stepCount}).`
          notify('info', text)
          speak(text)
          break
        }
        dispatch({ type: 'goToStep', index: target - 1 })
        break
      }
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
        const target = latestPaused(timers.timers, recipe.id)
        if (target) timers.resume(target.id)
        else {
          const text = 'No paused timer. Say “start timer” to time this step.'
          speak(text)
          notify('info', text)
        }
        break
      }
      case 'pauseTimer':
      case 'toggleTimer':
      case 'resetTimer': {
        const target =
          command.type === 'pauseTimer'
            ? runningSoonest(timers.timers, timers.now, recipe.id)
            : command.type === 'toggleTimer'
              ? toggleTarget(timers.timers, timers.now, recipe.id)
              : resetTarget(timers.timers, recipe.id)
        if (!target) speak('No timer running.')
        else if (command.type === 'pauseTimer') timers.pause(target.id)
        else if (command.type === 'toggleTimer') timers.toggle(target.id)
        else timers.reset(target.id)
        break
      }
      case 'cancelTimer': {
        const target = cancelTarget(timers.timers, timers.now, recipe.id)
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
  const stepTimer = timers.timers.find((t) => t.recipeId === recipe.id && t.stepNumber === stepNumber)
  const runningCount = timers.timers.filter(isRunning).length

  const mode = pipMode({ gesturesOn: gesturesPref, previewPref: cameraPreview, gesturesStatus: gestures.status })

  // Ingredients the CURRENT step mentions get the "THIS STEP" highlight.
  const usedIndices = ingredientsInStep(ingredientNames, step.instruction)
  const usedNow = new Set(usedIndices)
  const usedNames = usedIndices.map((i) => recipe.ingredients[i].name)

  // With no tabs, "show ingredients / timers" (voice, key, gesture) brings that section into view in the rail.
  const tab = state.tab
  useEffect(() => {
    if (layout === 'tabs') return
    const el = tab === 'ingredients' ? ingredientsRef.current : tab === 'timers' ? timersRef.current : null
    if (!el) return
    // Scroll only the rail's own container, never the page (scrollIntoView could move the clipped ancestors).
    const box = el.closest<HTMLElement>('[data-rail-scroll]')
    if (box) box.scrollTo?.({ top: el.offsetTop - box.offsetTop })
    else el.scrollTo?.({ top: 0 })
  }, [tab, layout])

  // "Try again" = off, then on again shortly after. The pending "on" must never outlive the screen or a manual toggle,
  // or the camera / microphone would start later without a click.
  const retryTimers = useRef<Record<'gestures' | 'voice', number | undefined>>({ gestures: undefined, voice: undefined })
  const cancelRetry = (which: 'gestures' | 'voice') => {
    window.clearTimeout(retryTimers.current[which])
    retryTimers.current[which] = undefined
  }
  const retry = (which: 'gestures' | 'voice', set: (value: boolean) => void) => {
    cancelRetry(which)
    set(false)
    retryTimers.current[which] = window.setTimeout(() => set(true), 150)
  }
  useEffect(() => {
    const pending = retryTimers.current
    return () => {
      window.clearTimeout(pending.gestures)
      window.clearTimeout(pending.voice)
    }
  }, [])

  const reserve = layout === 'lg' || panelOpen || finished ? '' : PIP_RESERVE[mode]

  const heardStrip = (
    <HeardStrip
      framed={layout === 'lg'}
      compact={layout === 'tabs'}
      onFix={openPanel}
      heard={heard}
      voiceOn={voicePref}
      voiceStatus={voice.status}
      voiceMessage={voice.message}
      speaking={speech.speaking}
      gesturesOn={gesturesPref}
      gesturesStatus={gestures.status}
      gesturesMessage={gestures.message}
      onTurnOnVoice={() => {
        cancelRetry('voice')
        setVoicePref(true)
      }}
      onRetryVoice={() => retry('voice', setVoicePref)}
      onRetryGestures={() => retry('gestures', setGesturesPref)}
    />
  )

  const stepTicket = (
    <StepTicket
      stepNumber={stepNumber}
      stepCount={state.stepCount}
      instruction={step.instruction}
      duration={step.duration}
      stepTimer={stepTimer}
      now={timers.now}
      nextInstruction={nextStep?.instruction}
      onStartTimer={() => run({ type: 'startTimer' }, 'tap')}
      onToggleTimer={timers.toggle}
      onResetTimer={timers.reset}
      hideNumeral={layout === 'tabs' && mode !== 'none'}
      uses={usedNames}
    />
  )

  const timersPanel = (
    <TimersPanel
      timers={timers.timers}
      now={timers.now}
      recipeId={recipe.id}
      stepDuration={stepTimer || layout !== 'tabs' ? undefined : step.duration}
      stepNumber={stepNumber}
      stepChipVisible={layout !== 'tabs'}
      onStartMinutes={startTimer}
      onStartTypedMinutes={(minutes) => startTimer(minutes, false)}
      onStartStepTimer={() => run({ type: 'startTimer' }, 'tap')}
      onToggle={timers.toggle}
      onReset={timers.reset}
      onRemove={timers.remove}
    />
  )

  const ingredientsPanel = (
    <IngredientsPanel
      ingredients={recipe.ingredients}
      checked={state.checked}
      usedNow={usedNow}
      onToggle={(index) => dispatch({ type: 'setIngredient', index })}
      onCheckAll={(checked) => run({ type: 'checkAll', checked }, 'tap')}
    />
  )

  const pip = panelOpen || finished ? null : (
    <CameraPip
      mode={mode}
      placement={layout === 'lg' ? 'rail' : 'float'}
      status={gestures.status}
      live={gestures.live}
      videoRef={gestures.videoRef}
      onHidePreview={() => setCameraPreview(false)}
      onShowPreview={() => setCameraPreview(true)}
    />
  )

  return (
    <>
      <div ref={layoutRef} data-layout={layout} className="flex h-[100dvh] flex-col overflow-hidden bg-paper-2 text-ink">
        <TopBar recipeId={recipe.id} title={recipe.title} stepIndex={state.stepIndex} stepCount={state.stepCount} onOpenHelp={() => openPanel()} />
        {layout === 'lg' ? null : heardStrip}
        {layout === 'tabs' ? (
          <nav aria-label="Cooking sections" className="shrink-0">
            <CookingTabs
              tab={state.tab}
              onSelect={(next) => run({ type: 'showTab', tab: next }, 'tap')}
              checkedCount={state.checked.size}
              ingredientCount={state.ingredientCount}
              runningTimers={runningCount}
            />
          </nav>
        ) : null}

        <main className="relative min-h-0 flex-1">
          {layout === 'lg' ? (
            <div className="grid h-full grid-cols-[62fr_38fr] gap-4 p-4">
              <div className="min-h-0 min-w-0">{stepTicket}</div>
              <div className="flex min-h-0 min-w-0 flex-col gap-3">
                {/* Pinned: the HEARD strip and the camera preview never scroll away. */}
                {heardStrip}
                {pip}
                <div data-rail-scroll className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                  <div ref={timersRef}>{timersPanel}</div>
                  <div ref={ingredientsRef}>{ingredientsPanel}</div>
                </div>
              </div>
            </div>
          ) : layout === 'md' ? (
            <div className={`flex h-full flex-col gap-3 p-3 ${reserve}`}>
              <div className="min-h-0 flex-[3]">{stepTicket}</div>
              <div className="grid min-h-0 flex-[2] grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
                <div ref={ingredientsRef} className="min-h-0 overflow-y-auto">
                  {ingredientsPanel}
                </div>
                <div ref={timersRef} className="min-h-0 overflow-y-auto">
                  {timersPanel}
                </div>
              </div>
            </div>
          ) : (
            <div id="cooking-panel" role="tabpanel" aria-labelledby={`cooking-tab-${state.tab}`} className={`h-full overflow-y-auto p-2 sm:p-3 ${reserve}`}>
              {state.tab === 'steps' ? <div className="h-full min-h-0">{stepTicket}</div> : state.tab === 'ingredients' ? ingredientsPanel : timersPanel}
            </div>
          )}
          {layout === 'lg' ? null : pip}
        </main>

        <ControlStrip
          isFirst={state.stepIndex === 0}
          isLast={state.stepIndex === state.stepCount - 1}
          speaking={speech.speaking}
          onStopReading={speech.cancel}
          onBack={() => run({ type: 'previous' }, 'tap')}
          onRead={() => run({ type: 'repeat' }, 'tap')}
          onNext={() => run({ type: 'next' }, 'tap')}
        />
      </div>

      {finished ? (
        <CompletionDialog recipeTitle={recipe.title} source={recipe.source} onHome={() => navigate('/')} onReview={() => dispatch({ type: 'resume' })} />
      ) : null}
      {panelOpen ? (
        <HandsFreePanel
          firstTime={!onboarded}
          onClose={closePanel}
          gesturesOn={gesturesPref}
          onToggleGestures={() => {
            cancelRetry('gestures')
            setGesturesPref(!gesturesPref)
          }}
          onRetryGestures={() => retry('gestures', setGesturesPref)}
          gesturesStatus={gestures.status}
          gesturesMessage={gestures.message}
          live={gestures.live}
          videoRef={gestures.videoRef}
          learned={learned}
          voiceOn={voicePref}
          onToggleVoice={() => {
            cancelRetry('voice')
            setVoicePref(!voicePref)
          }}
          onRetryVoice={() => retry('voice', setVoicePref)}
          voice={voice}
          speaking={speech.speaking}
          speakSteps={speakSteps}
          onToggleSpeakSteps={() => setSpeakSteps(!speakSteps)}
          ingredientExample={ingredientNames[0]?.toLowerCase() ?? ''}
          focusSection={panelSection}
          inIframe={inIframe}
        />
      ) : null}
    </>
  )
}
