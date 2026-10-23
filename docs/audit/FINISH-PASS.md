# Finish pass: from mockup to product

Date: 2026-10-24. Branch `feat/curated-finish`, built on `main` (`8d753b1`, PR #3 merged).

Probed the dev build and the production build at **1280×800, 768×1024 and 390×844** on every route
(`/`, `/search`, `/recipe/:id`, `/cooking/:id`, `/favorites`, `/recents`, `/settings`, plus a
deliberately unknown URL), in Chromium via `agent-browser` with axe 4.12.1. Screenshots of the
finished state are in `docs/audit/after/`.

The Pass held up; these were the places it still read as a mockup, and what changed.

## P0 — broken layouts (found by probing, not by reading)

| # | Where | Before | Fix |
|---|---|---|---|
| 1 | `src/screens/RecipeOverviewScreen.tsx:102` | At 768 px the mise-en-place name and its mono quantity collided ("Butter2 sticks (1 cup / 225 g)"): `justify-between` with a non-shrinking quantity let the name overflow its box. | `flex flex-wrap` rows; the quantity drops to its own right-aligned line when it cannot share the row. |
| 2 | `src/components/cooking/IngredientsPanel.tsx:30` | Same collision in the cooking rail at 768 px, and the md rail gave ingredients only half the width. | Wrapping row (quantity below the name), and the md split is now 3fr Ingredients / 2fr Timers (`CookingScreen.tsx`). |
| 3 | `src/components/cooking/StepTicket.tsx:67` | The ticket header strip used `px-6`, the step body `px-8`: the "STEP 1 OF 10" label sat 8 px left of the instruction column on desktop. | Header aligned to the body padding. |
| 4 | `src/screens/RecipeOverviewScreen.tsx:63` | The header ticket's 3fr photo rendered 620×465 at 1280 and the other half was mostly empty — the template tell the audit already called out once — and the strip's "32 MIN · SERVES 10" was repeated verbatim in the body ("Total: 32 minutes · Serves 10"). | Photo 2fr, capped at 320 px tall; the text group is centred beside it. The body now carries only additive source facts (prep/cook split, "Makes 56 cookies") plus a computed mono line ("11 INGREDIENTS · 2 TIMED STEPS"). Source category ("Recipes for dessert") is no longer printed as a fact. |

## P0 — the cooking screen is the product

| # | Where | Before | Fix |
|---|---|---|---|
| 5 | `HeardStrip.tsx` | With voice off — the default — the HEARD call-out row disappeared, so the loudest status on the screen was blank; TURN ON / TRY AGAIN / FIX were 36–44 px, under the 56 px cooking rule. | The HEARD row is always present ("Turn voice on to call the steps out."). In the wide layout its ticket carries a 2 px ink edge, the only rail panel that does. Actions are 56 px; the phone strip is one 56 px line with a full-height action at its edge. |
| 6 | `TimersPanel.tsx` | The timers panel was a header-less well — the only rail panel without a ticket strip — and its pause/reset/remove controls were 44 px. | Ticket header ("TIMERS · 1 RUNNING"), 56 px labelled Pause / Reset / Remove, matching the Ingredients ticket. |
| 7 | `CookingTabs.tsx:33` | Phone tabs tried to fit icon + label + badge on one 56 px row and clipped the label to "ING…" at 390 px. | Icon + badge stack over the label on phones, one row from sm up; explicit accessible names ("Timers 1 running"). |
| 8 | `CameraPip.tsx:66` | Hide-preview was 36 px on phones, 44 px in the rail. | 48 px on the floating preview (larger preview), 56 px in the rail. |
| 9 | `TopBar.tsx:22` | The segmented progress bar and the tab strip sat outside every landmark — axe reported `region` violations on cooking at both 1280 and 390. | TopBar is a `<header>`, tabs a labelled `<nav>`, the control strip a `<footer>`. axe: 0 violations on browse, recipe and cooking. |

## P1 — states

| # | Where | Before | Fix |
|---|---|---|---|
| 10 | `src/App.tsx` | No catch-all route: an unknown URL rendered a blank page. | `src/screens/NotFoundScreen.tsx` ("That page isn't on the rail") on `*`. |
| 11 | `src/App.tsx` | The lazy cooking chunk flashed a bare paper rectangle. | Wordmark + "Setting the pass…" loading state. |
| 12 | `src/components/EmptyState.tsx` | Saved / In progress were a mono strip with a count ("SAVED · 0") and one sentence: placeholder-shaped. | Named heading ("Nothing saved yet"), one line about what lives there, one action; the ticket strip is no longer a fake count. |
| 13 | `src/screens/SettingsScreen.tsx` | "Camera preview" could be ON with gestures OFF and nothing on screen said why it did nothing. | Its description now says the camera preview needs hand gestures on. |
| 14 | `src/screens/HomeScreen.tsx` | Browse had no hands-free readiness line (DESIGN.md's browse macrostructure calls for one) and the 576 px filter field left its row half empty. | Compact filter row (label + 448 px field + live count), then `HANDS-FREE · VOICE OFF · GESTURES OFF · Set up` linking to Settings. |

## Kept, and verified unchanged

The Pass tokens and type scale, the perforated ticket, mono call-out labels, the tomato "live" accent
discipline, the 56 px cooking targets, the licensed recipe text, per-photo credits and the Credits
block. All 957 tests pass; `npm run typecheck` and `npm run build` pass.

## Probed, still untested here

- Media denial was simulated by making `getUserMedia` reject `NotAllowedError` (headless Chromium has
  no permission prompt). The real browser prompt, real `SpeechRecognition` and a real camera are not
  exercised in this environment; the denied/fallback UI is covered by unit tests.
- Not probed: Safari and Firefox; a physical phone or tablet.
