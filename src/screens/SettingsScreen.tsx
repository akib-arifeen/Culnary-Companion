import { useId, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import Page from '../components/Page'
import { PREF_DEFAULTS, PREF_KEYS, usePref, writeJSON } from '../lib/storage'

const REPO_URL = 'https://github.com/akib-arifeen/Culnary-Companion'

interface SwitchRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}

function SwitchRow({ label, description, checked, onChange }: SwitchRowProps) {
  const id = useId()
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p id={`${id}-label`} className="font-semibold text-stone-900">
          {label}
        </p>
        <p id={`${id}-desc`} className="text-sm text-stone-600">
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
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          checked ? 'bg-brand-700' : 'bg-stone-400'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block size-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </li>
  )
}

const outlineButton =
  'min-h-11 cursor-pointer rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50'

const SettingsScreen = () => {
  const [voice, setVoice] = usePref<boolean>(PREF_KEYS.voice, PREF_DEFAULTS[PREF_KEYS.voice])
  const [gestures, setGestures] = usePref<boolean>(PREF_KEYS.gestures, PREF_DEFAULTS[PREF_KEYS.gestures])
  const [speakSteps, setSpeakSteps] = usePref<boolean>(PREF_KEYS.speakSteps, PREF_DEFAULTS[PREF_KEYS.speakSteps])
  const [cameraPreview, setCameraPreview] = usePref<boolean>(PREF_KEYS.cameraPreview, PREF_DEFAULTS[PREF_KEYS.cameraPreview])
  const [, setOnboarded] = usePref<boolean>(PREF_KEYS.onboarded, PREF_DEFAULTS[PREF_KEYS.onboarded])
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [status, setStatus] = useState('')

  return (
    <Page title="Settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <section aria-labelledby="handsfree-settings">
          <h2 id="handsfree-settings" className="mb-2 text-lg font-semibold text-stone-900">
            Hands-free
          </h2>
          <ul className="divide-y divide-stone-200 rounded-xl bg-white ring-1 ring-stone-200">
            <SwitchRow
              label="Voice commands"
              description="Say next, back, repeat or set a timer. Asks for microphone access when you turn it on."
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
              label="Read steps aloud"
              description="Speak each step as you reach it."
              checked={speakSteps}
              onChange={setSpeakSteps}
            />
            <SwitchRow
              label="Show camera preview"
              description="Show a small mirrored view of your camera while gestures are on."
              checked={cameraPreview}
              onChange={setCameraPreview}
            />
          </ul>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setOnboarded(false)
                setStatus('The hands-free tutorial will play the next time you start cooking.')
              }}
              className={outlineButton}
            >
              Replay hands-free tutorial
            </button>
          </div>
        </section>

        <section aria-labelledby="data-settings">
          <h2 id="data-settings" className="mb-2 text-lg font-semibold text-stone-900">
            Your data
          </h2>
          <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
            <p className="mb-3 text-sm text-stone-600">
              Saved recipes and cooking progress are stored only in this browser.
            </p>
            {confirmingClear ? (
              <div role="group" aria-label="Confirm clearing data" className="space-y-3">
                <p className="text-sm font-semibold text-stone-900">
                  Remove all saved recipes and in-progress steps? This cannot be undone.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      writeJSON(PREF_KEYS.favorites, [])
                      writeJSON(PREF_KEYS.progress, {})
                      setConfirmingClear(false)
                      setStatus('Saved recipes and progress cleared.')
                    }}
                    className="min-h-11 cursor-pointer rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
                  >
                    Yes, clear everything
                  </button>
                  <button type="button" onClick={() => setConfirmingClear(false)} className={outlineButton}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmingClear(true)} className={outlineButton}>
                Clear saved recipes and progress
              </button>
            )}
          </div>
        </section>

        <p role="status" className="min-h-5 text-sm font-medium text-stone-800">
          {status}
        </p>

        <section aria-labelledby="about-settings">
          <h2 id="about-settings" className="mb-2 text-lg font-semibold text-stone-900">
            About and privacy
          </h2>
          <div className="space-y-3 rounded-xl bg-white p-4 text-sm text-stone-700 ring-1 ring-stone-200">
            <p>
              Gesture recognition runs in your browser and camera video never leaves your device. Voice commands use
              your browser's speech service; in Chrome this sends your audio to Google.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded font-semibold text-brand-800 underline"
            >
              View the source on GitHub
              <ExternalLink size={14} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </section>
      </div>
    </Page>
  )
}

export default SettingsScreen
