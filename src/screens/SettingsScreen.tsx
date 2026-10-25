import { useId, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import Page from '../components/Page'
import { Button, Label, Ticket } from '../components/ui/primitives'
import { recipes } from '../data/recipes'
import { PREF_DEFAULTS, PREF_KEYS, usePref, writeJSON } from '../lib/storage'

const REPO_URL = 'https://github.com/akib-arifeen/Culnary-Companion'
const linkClass = 'underline underline-offset-3 decoration-2 hover:decoration-accent'

interface SwitchRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}

/** A real switch: role="switch", and the state is spelled out (ON / OFF) as well as shown. */
function SwitchRow({ label, description, checked, onChange }: SwitchRowProps) {
  const id = useId()
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-lg font-bold text-ink">
          {label}
        </p>
        <p id={`${id}-desc`} className="max-w-prose text-ink-2">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        onClick={() => onChange(!checked)}
        className="flex min-h-14 shrink-0 cursor-pointer items-center gap-3"
      >
        <span className={`label-mono w-8 text-right ${checked ? 'text-ink' : 'text-ink-2'}`} aria-hidden="true">
          {checked ? 'On' : 'Off'}
        </span>
        <span
          aria-hidden="true"
          className={`flex h-8 w-14 items-center rounded-full border-2 border-ink-2 px-0.5 transition-colors duration-(--dur-quick) ${
            checked ? 'bg-ink' : 'bg-paper-2'
          }`}
        >
          <span
            className={`block size-6 rounded-full transition-transform duration-(--dur-quick) ${
              checked ? 'translate-x-6 bg-paper' : 'bg-ink-2'
            }`}
          />
        </span>
      </button>
    </li>
  )
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Ticket as="section" header={<h2 id={id} className="label-mono text-ink">{title}</h2>} bodyClassName="px-4 py-2 sm:px-5">
      {children}
    </Ticket>
  )
}

const SettingsScreen = () => {
  const [voice, setVoice] = usePref<boolean>(PREF_KEYS.voice, PREF_DEFAULTS[PREF_KEYS.voice])
  const [gestures, setGestures] = usePref<boolean>(PREF_KEYS.gestures, PREF_DEFAULTS[PREF_KEYS.gestures])
  const [speakSteps, setSpeakSteps] = usePref<boolean>(PREF_KEYS.speakSteps, PREF_DEFAULTS[PREF_KEYS.speakSteps])
  const [cameraPreview, setCameraPreview] = usePref<boolean>(PREF_KEYS.cameraPreview, PREF_DEFAULTS[PREF_KEYS.cameraPreview])
  const [, setOnboarded] = usePref<boolean>(PREF_KEYS.onboarded, PREF_DEFAULTS[PREF_KEYS.onboarded])
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [status, setStatus] = useState('')

  return (
    <Page>
      <div className="mx-auto max-w-3xl">
      <h1 className="text-title font-extrabold tracking-tight text-ink">Settings</h1>
      <p className="mt-2 text-ink-2">Set up the station once; it remembers.</p>

      <div className="mt-6 space-y-6">
        <Group id="handsfree-settings" title="Hands-free">
          <ul className="divide-y divide-dashed divide-rule">
            <SwitchRow
              label="Voice commands"
              description="Say next, back, repeat or set a timer. The microphone is requested when you start cooking with voice on, not here."
              checked={voice}
              onChange={setVoice}
            />
            <SwitchRow
              label="Hand gestures"
              description="Control steps and timers with your hand. The camera only turns on in cooking mode."
              checked={gestures}
              onChange={setGestures}
            />
            <SwitchRow
              label="Camera preview"
              description={
                gestures
                  ? 'Show a small mirrored view of your camera while gestures are on.'
                  : 'Shows the camera while gestures are on. Turn hand gestures on to use it.'
              }
              checked={cameraPreview}
              onChange={setCameraPreview}
            />
          </ul>
        </Group>

        <Group id="reading-settings" title="Reading">
          <ul>
            <SwitchRow
              label="Read steps aloud"
              description="Speak each step as you reach it."
              checked={speakSteps}
              onChange={setSpeakSteps}
            />
          </ul>
        </Group>

        <Group id="data-settings" title="Your data">
          <div className="flex flex-col items-start gap-4 py-3">
            <p className="max-w-prose text-ink-2">Saved recipes and cooking progress are stored only in this browser.</p>
            <div className="flex flex-wrap items-start gap-3">
            <Button
                variant="secondary"
                onClick={() => {
                  setOnboarded(false)
                  setStatus('The hands-free tutorial will play the next time you start cooking.')
                }}
                className="whitespace-nowrap"
              >
                Replay tutorial
              </Button>
              {confirmingClear ? (
                <div role="group" aria-label="Confirm clearing data" className="space-y-3 border-t-2 border-dashed border-rule pt-4">
                  <p className="max-w-prose font-bold text-accent">
                    Remove all saved recipes and in-progress steps? This cannot be undone.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => {
                        writeJSON(PREF_KEYS.favorites, [])
                        writeJSON(PREF_KEYS.progress, {})
                        setConfirmingClear(false)
                        setStatus('Saved recipes and progress cleared.')
                      }}
                      className="whitespace-nowrap"
                    >
                      Yes, clear everything
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirmingClear(false)} className="whitespace-nowrap">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setConfirmingClear(true)} className="whitespace-nowrap">
                  Clear saved and progress
                </Button>
              )}
            </div>
            <p role="status" className={status ? 'flex items-center gap-2 font-bold text-ink' : 'sr-only'}>
              {status ? <Check size={18} aria-hidden="true" /> : null}
              {status}
            </p>
          </div>
        </Group>

        <Group id="about-settings" title="About and credits">
          <div className="space-y-4 py-3 text-ink">
            <p className="max-w-prose">
              Hand gestures run on this device; camera video never leaves it. Voice commands use your browser's speech
              service, which in Chrome sends your audio to Google.
            </p>
            <p className="max-w-prose">
              Recipe text is adapted from Wikibooks Cookbook by Wikibooks contributors under{' '}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className={linkClass}>
                CC BY-SA 4.0
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              . Photos are from Wikimedia Commons under the licence each file states.
            </p>
            <div>
              <Label as="h3" className="text-ink">Sources</Label>
              <ul className="mt-2 divide-y divide-dashed divide-rule">
                {recipes.map((recipe) => (
                  <li key={recipe.id} className="py-2 text-sm text-ink-2">
                    <span className="font-bold text-ink">{recipe.title}:</span>{' '}
                    <a href={recipe.source.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {recipe.source.page}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    . Photo:{' '}
                    <a href={recipe.photo.filePage} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {recipe.photo.author}, {recipe.photo.license}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    .
                  </li>
                ))}
              </ul>
            </div>
            <p>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={`font-bold ${linkClass}`}>
                View the source on GitHub
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
        </Group>
      </div>
      </div>
    </Page>
  )
}

export default SettingsScreen
