# Culinary Companion: product and design audit

Date: 2026-10-22. Audited:

- **Live:** https://culnary-companion-bhy9.vercel.app (`main`)
- **PR #1:** the `feat/hands-free-polish` production build, served locally.

Both were captured at 390×844 and 1440×900. Screenshots are in this folder: `live-*.png` and `pr1-*.png`.

## Verdict

PR #1 made the app **work**: gestures, voice, fallbacks, honest permission states and clean layouts. It did not make it **look like a product**. It reads as a competent template, and three things make it feel fake.

1. **The content is invented.** The 8 recipes, their "Easy/Medium/Hard" labels and their total times ("87 min") were written for the demo and come from no source. The photos are Unsplash stock of other people's dishes: the "Shrimp Pad Thai" photo is not that recipe. A visitor can't tell where anything came from.
2. **The visuals are the default AI app.** It uses the system sans, a cream background, an orange accent, white rounded cards and lucide icons in tiles. Nothing in it says *kitchen*, and nothing in it was chosen *for the job*: reading a step from a metre away with wet hands.
3. **Phone patterns are stretched to desktop.**
   - A bottom tab bar runs across a 1440-pixel screen.
   - A 1,200-pixel orange "Next" slab sits under the step.
   - Cooking mode hides ingredients and timers behind tabs even on a laptop. The kitchen laptop or tablet is where you most want to see all three at once.

## What makes it feel fake (specific)

| # | Where | What | Evidence |
|---|---|---|---|
| F1 | All recipes | Recipe text and times written for the demo; no source and no attribution | `src/data/recipes.ts` |
| F2 | All recipes | "Difficulty: Hard/Medium/Easy" is an opinion presented as data | `pr1-recipe-1440.png` |
| F3 | Photos | Stock food photography that doesn't depict the actual recipe, with no visible credit | `pr1-home-1440.png` |
| F4 | Home | The "Featured" curry is also "Continue cooking" and also card 1 of "All recipes": the same thing three times | `pr1-home-1440.png` |
| F5 | Home 1440 | The featured card is a 2-column split whose right half is ~70 % empty | `pr1-home-1440.png` |
| F6 | Home | The "Cook hands-free" strip is a marketing banner inside an app | `pr1-home-390.png` |
| F7 | Recipe | Five identical icon stat tiles (Prep, Cook, Servings, Difficulty, Cuisine): the template tell | `pr1-recipe-1440.png` |
| F8 | Recipe | Title rendered twice (header and h2) | `pr1-recipe-1440.png` |
| F9 | Desktop | Mobile bottom tab bar at 1440 wide; header carries only a wordmark | `pr1-home-1440.png`, `pr1-settings-1440.png` |
| F10 | Cooking 1440 | Step text fills the left third and the rest is empty; ingredients and timers hidden behind tabs | `pr1-cooking-1440.png` |
| F11 | Cooking | "Next" is a full-width orange slab; Back and Read are small boxes next to it, so the hierarchy shouts | `pr1-cooking-1440.png` |
| F12 | Cooking | Mic and hand status are 6 px dots: a voice-first app whose voice state can't be seen from a metre away | `pr1-cooking-1440.png` |
| F13 | Onboarding | A long modal form of toggles and six equal tiles. Voice comes **second**, after gestures | `pr1-onboarding-1440.png` |
| F14 | Live (`main`) | Deep links 404; step text overlaps controls; three pastel round buttons and "VOICE AND GESTURE COMMANDS ACTIVATED" banner | `live-*.png` |

## Where it hits

- **H1: one instruction, huge.** Both the old live cooking screen and PR #1 put a single step in very large type. That is the right core idea. The live version's centred poster composition at 1440 is its strongest screen (`live-cooking-1440.png`).
- **H2: the segmented step progress bar** reads instantly.
- **H3: hands-free mechanics are real.**
  - Gesture practice tiles with a live preview and a hold ring.
  - A "Heard: …" chip and command toasts.
  - "Paused while speaking" and Stop reading.
  - Human permission copy with Try again or Open in a new tab.
- **H4: timer cards with big tabular clocks**, plus timer chips on steps that say how long they take.
- **H5: honest empty states and real settings.** PR #1 already removed the fake toggles.

## Where it misses badly

- **M1: no point of view.** Type, colour and components are defaults, so nothing is memorable. The fix is a direction derived from the job (see `DESIGN.md`), not a re-skin.
- **M2: content provenance.** Real recipes need a real source, a licence and credits on screen (F1 to F3).
- **M3: the kitchen layout is missing on large screens.** On a tablet or laptop the step, the ingredients it uses, and the running timers should all be visible at once (F10).
- **M4: voice-first in name only.** The listening state must be the most visible thing on the cooking screen, and onboarding should start with voice (F12, F13).
- **M5: desktop chrome** (F9, F11).

## Every visible control on PR #1

All controls on PR #1 work (verified in the PR #1 probes). The fake controls were already removed. What remains fake is **data**: difficulty, invented totals, stock photos. The redesign removes the data that can't be sourced rather than inventing more.
