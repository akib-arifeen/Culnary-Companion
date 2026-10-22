# Design: Culinary Companion

This is the locked design system for the app. Every screen reads this file before code is written. Don't regenerate it per page; extend or amend this file when the system needs to grow.

The audit that motivated it is in `docs/audit/AUDIT.md`.

## The job, and the direction that follows from it

**Job.** The app is a kitchen companion. It stands on a counter (phone against a jar, tablet or laptop propped up) and is read **from about a metre away**, by someone whose hands are **wet, floury or full**. It is driven **by voice first**, then gestures, then touch and keys.

**Direction: "The Pass."** In a restaurant kitchen, orders are printed on tickets and clipped to a rail at the pass. Tickets are designed to be read at a glance across a hot, noisy line. Bold type, a header strip, big numbers and nothing decorative. Instructions are *called out* and *acknowledged*: "Heard!".

That is exactly this app's job, so the whole system borrows from it:

| Job requirement | Design consequence |
|---|---|
| Read from a metre away | **Atkinson Hyperlegible Next**, a typeface designed by the Braille Institute for maximum character recognition. The current step is set huge (up to 4.5 rem) in weight 700. |
| Numbers matter (quantities, minutes, timers) | **Atkinson Hyperlegible Mono** for every quantity, time and count: the "ticket printer" voice. Timers get 4 to 6 rem tabular digits. |
| Wet or busy hands | Cooking-mode targets are **at least 56 px**, and primary actions sit at the screen edge, not mid-content. Nothing depends on hover. |
| Voice first | The **"HEARD" call-out strip** is the most prominent status element on the cooking screen. It shows a live mic state (a red dot, the universal "recording" sign) plus the last thing heard, in kitchen call-and-response language. Onboarding starts with voice. |
| Glance, don't read | Each recipe is a **ticket**: a mono header strip (time · steps · serves), the title, then what you need. The tickets themselves carry no decoration, shadows or gradients. |
| Messy kitchen, bright light | High-contrast **ink on warm ticket paper**. A single accent, **tomato red**, is reserved for *live and now*: the current step, a running timer, a listening mic, a finished timer. |

**Genre:** editorial, with a utilitarian tone (kitchen ticket). **Theme route:** custom (tuned). Vibe: *kitchen ticket rail, ink and tomato, legible across the room*.

## Macrostructure family

- **Browse (Recipes, Saved, In progress):** "The Rail". A responsive grid of recipe tickets (1 column on phones, 2 at md, 3 at xl).
  - Above it, one line of honest intro, the filter field and a voice/gesture readiness line. **No hero card and no marketing strip.**
  - A "Pick up where you left off" ticket appears **only** when real progress exists.
- **Recipe:** "Full ticket".
  - **Header:** title, then a mono meta line with only *source-stated* facts (time if the source states one · serves · step count), then the photo with its credit.
  - **Body, at md and up:** two columns, **Mise en place** (ingredients, mono quantities) | **Method** (numbered steps, with timer chips where the text states a time).
  - **CTA:** a sticky ink "Start cooking" stub.
  - **Footer:** a **Credits** block naming the source page, licence and photographer.
- **Cooking:** "The Pass".
  - **At 1024 px and up:** the **step ticket** (current step, giant) takes about 62 %. The **rail** takes the rest and stacks three things: the HEARD strip, the timers, then the ingredients, with the ones mentioned in the current step highlighted. A **control strip** runs along the bottom: Back · Read · **Next**. Next is a large ink block at the right edge, not a full-width slab.
  - **Below 1024 px:** the step fills the screen, the HEARD strip sits at the top, and the tabs are Steps / Ingredients / Timers.
- **Settings:** "Station setup". One column of real switches grouped as Hands-free · Reading · Your data · About and credits.
- **Onboarding:** "Before service". Three ordered blocks: **Voice** (first), **Gestures**, **Touch and keys**. Each has one live test ("Say 'next'", "Show a thumb up") and its own on-switch. One ink button closes it.

## Theme (OKLCH; contrast computed against `--color-paper`)

| Token | Value | Hex | Use | Contrast |
|---|---|---|---|---|
| `--color-paper` | `oklch(97.5% 0.008 90)` | #f9f7f1 | ticket paper and page | — |
| `--color-paper-2` | `oklch(93.5% 0.012 85)` | #ede9e1 | the rail or counter behind tickets, wells | — |
| `--color-ink` | `oklch(21% 0.015 60)` | #1e1711 | text, primary buttons, focus ring | 16.5:1 |
| `--color-ink-2` | `oklch(43% 0.015 60)` | #564e48 | secondary text, **control borders** | 7.6:1 (6.7:1 on paper-2) |
| `--color-rule` | `oklch(85% 0.01 80)` | #d1cdc7 | decorative hairlines and perforations only (never a control border) | 1.5:1, decorative |
| `--color-accent` | `oklch(52% 0.19 29)` | #be241b | tomato: live, now, current, running, listening, done-alarm | 5.7:1 (5.0:1 on paper-2) |
| `--color-accent-ink` | `oklch(98.5% 0.005 90)` | #fbfaf6 | text on accent | 5.8:1 on accent |
| `--color-accent-soft` | `oklch(93% 0.04 35)` | #ffdfd6 | highlight wash (ingredients used in this step) | ink on it 14.2:1 |
| `--color-focus` | = ink | | 3 px outline, 3 px offset | ≥ 3:1 everywhere |

**Accent discipline.** The current step's giant numeral and the listening dot are tomato.

- No more than 5 % of any viewport is tomato, and tomato always means *live or now*.
- Primary buttons are **ink**, not orange.
- Checked ingredients use strike-through plus `ink-2`, never green.
- Errors use the accent text colour plus an icon and words; colour is never the only cue.

## Typography

- **Display and body:** "Atkinson Hyperlegible Next Variable", self-hosted via `@fontsource-variable/atkinson-hyperlegible-next` (OFL-1.1).
  - Body 400, UI 500 to 600, titles 800, step text 700.
  - Always roman. **No italics in headings.**
- **Mono (ticket voice):** "Atkinson Hyperlegible Mono Variable", via `@fontsource-variable/atkinson-hyperlegible-mono` (OFL-1.1).
  - Quantities, times, timer clocks, step numbers, counts, header-strip labels, the HEARD strip.
  - Labels are UPPERCASE at weight 600 with tracking +0.06em.
- **Scale.** Fluid `clamp()` values, defined in the Tailwind theme as the `--text-*` tokens below.
  - `--text-step`: `clamp(1.75rem, min(11cqi, 12cqb), 4.5rem)`, 700, line-height 1.12. These are **container units**: the step body is a size container (`container-type: size`), so the instruction grows to fill whatever space the ticket actually has. That gives about 37 px on a phone ticket, about 54 px on a landscape tablet and the 72 px cap on a laptop, and it never overflows a short embed. Long steps (more than 140 characters) step down one rung to `--text-step-s`: `clamp(1.4rem, min(8.5cqi, 9.5cqb), 3.25rem)`. Outside a size container the units fall back to the viewport.
  - `--text-clock`: `clamp(2.75rem, 1.8rem + 4vw, 6rem)`, mono, tabular.
  - `--text-title`: `clamp(1.75rem, 1.3rem + 1.6vw, 2.75rem)`, 800, tracking −0.01em.
  - `--text-ticket`: `1.125rem`, 800, for recipe ticket titles.
  - `--text-label`: `0.8125rem`, mono 600, uppercase.
- **Measure.** Body 65ch max; step text 28ch max, so a line reads in one glance.

## Spacing, shape and depth

- **Spacing:** 4-point scale through Tailwind's default spacing (`--spacing: 0.25rem`). Use the scale; avoid arbitrary values except in the `clamp()` type tokens.
- **Radius:** tickets 6 px (`--radius-ticket`), buttons and inputs 8 px (`--radius-control`), chips 999 px. No large rounded "bubble" cards.
- **Depth:** no drop shadows. Tickets separate from the rail by `paper` on `paper-2` plus a 1 px `rule` border.
- **Signature, the perforation.** Each ticket's header strip is divided from its body by a **dashed perforation rule**, with small half-circle notches cut into both side edges. The notches are a CSS radial-gradient mask, defined once as the `.ticket` and `.perforation` utilities.

## Motion

- **Easing:** `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`.
- **Durations:** `--dur-quick: 140ms`, `--dur-step: 200ms`.
- **Step change:** the new step fades in and rises 6 px over 200 ms. Nothing else animates on navigation.
- **Heard flash:** a 300 ms background wash of `accent-soft` on the HEARD strip when a command is understood.
- **Listening:** a red dot with a slow 1.6 s opacity pulse (no scale).
- **Timer done:** accent background with a 1 s opacity pulse until dismissed.
- **Reduced motion:** every animation becomes a ≤ 150 ms opacity change or none; the pulses become static.
- **Animate only `transform` and `opacity`.**

## Microinteractions stance

- **Success is silent.** A checked ingredient or a started timer just shows its new state. No celebratory toasts.
- **Command feedback is the HEARD strip.** It replaces floating toasts on the cooking screen: one place to look.
- **Focus.** The ring shows instantly, 3 px ink, and never animates.
- **Hover.** Hover is an enhancement only; no information lives in hover.

## CTA voice

- **Primary.** An ink-filled rectangle with `--radius-control` and a mono UPPERCASE label at weight 600 ("START COOKING", "NEXT STEP"). Minimum height 48 px in browse and 56 px in cooking mode.
- **Secondary.** Paper fill, 2 px `ink-2` border, the same label style.
- **Tertiary.** Text link, ink, underline offset 3 px.
- **Copy.** Verbs a cook would say ("Start cooking", "Next step", "Read it again", "Start 6-min timer"). Never "Submit" or "Get started".

## Content rules (product truth)

- **Recipe text** is adapted from **Wikibooks Cookbook** (CC BY-SA 4.0). Each recipe stores its source page URL, licence, and a "changes: adapted into step-by-step format" note, and shows them in the recipe Credits block.
- **Photos** are from **Wikimedia Commons**, with each file's own free licence. Store the author, licence, licence URL and file page; show the credit under the photo.
- **Times.**
  - A step timer exists only when the step text states a duration.
  - A recipe-level time is shown only if the source states one.
  - No invented "difficulty".
- **Counts.**
  - Every number on screen is computed from real data (steps, ingredients, checked, saved).
  - No vanity numbers, ratings or "popular".
- **Empty states** say what the place is for and give one action.

## Per-page allowances

- **Browse and Recipe:** photos allowed, as real licensed photos with credits. No illustrations or decorative imagery.
- **Cooking:** no imagery except the optional camera preview. Function carries the page.
- **Settings and Onboarding:** typography only.

## What every page must share

The wordmark (the mono label "CULINARY COMPANION" with a ticket-notch glyph), the ink/tomato roles, both type families, the CTA voice, the perforated ticket component, and the 3 px ink focus ring.

## Navigation

- **Phone (below md):** bottom bar with three items, **Recipes · Saved · Settings**. Labels are always visible and targets are at least 56 px.
- **md and up:** a top bar with the wordmark on the left and the same three links on the right. **No bottom bar on desktop.**
- **Cooking mode** has no app nav: back arrow plus title only.
- `/search` and `/recents` stay as routes. `/search` renders Recipes with the filter focused; `/recents` renders "In progress".

## Exports

### Tailwind v4 `@theme` (source of truth: `src/styles/tokens.css`)

```css
@theme {
  --color-paper: oklch(97.5% 0.008 90);
  --color-paper-2: oklch(93.5% 0.012 85);
  --color-ink: oklch(21% 0.015 60);
  --color-ink-2: oklch(43% 0.015 60);
  --color-rule: oklch(85% 0.01 80);
  --color-accent: oklch(52% 0.19 29);
  --color-accent-ink: oklch(98.5% 0.005 90);
  --color-accent-soft: oklch(93% 0.04 35);

  --font-sans: "Atkinson Hyperlegible Next Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Atkinson Hyperlegible Mono Variable", ui-monospace, monospace;

  --text-step: clamp(1.75rem, min(11cqi, 12cqb), 4.5rem);
  --text-step-s: clamp(1.4rem, min(8.5cqi, 9.5cqb), 3.25rem);
  --text-clock: clamp(2.75rem, 1.8rem + 4vw, 6rem);
  --text-title: clamp(1.75rem, 1.3rem + 1.6vw, 2.75rem);
  --text-ticket: 1.125rem;
  --text-label: 0.8125rem;

  --radius-ticket: 6px;
  --radius-control: 8px;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-quick: 140ms;
  --dur-step: 200ms;
}
```

### tokens.css (plain CSS, for reuse outside Tailwind)

```css
:root {
  --color-paper: oklch(97.5% 0.008 90);  --color-paper-2: oklch(93.5% 0.012 85);
  --color-ink: oklch(21% 0.015 60);      --color-ink-2: oklch(43% 0.015 60);
  --color-rule: oklch(85% 0.01 80);      --color-accent: oklch(52% 0.19 29);
  --color-accent-ink: oklch(98.5% 0.005 90); --color-accent-soft: oklch(93% 0.04 35);
  --color-focus: var(--color-ink);
  --font-display: "Atkinson Hyperlegible Next Variable", system-ui, sans-serif;
  --font-body: var(--font-display);
  --font-mono: "Atkinson Hyperlegible Mono Variable", ui-monospace, monospace;
  --radius-ticket: 6px; --radius-control: 8px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1); --dur-quick: 140ms; --dur-step: 200ms;
}
```

### DTCG `tokens.json` (excerpt)

```json
{
  "color": {
    "paper":  { "$value": "oklch(97.5% 0.008 90)", "$type": "color" },
    "ink":    { "$value": "oklch(21% 0.015 60)", "$type": "color" },
    "accent": { "$value": "oklch(52% 0.19 29)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Atkinson Hyperlegible Next Variable", "$type": "fontFamily" },
    "mono":    { "$value": "Atkinson Hyperlegible Mono Variable", "$type": "fontFamily" }
  }
}
```
