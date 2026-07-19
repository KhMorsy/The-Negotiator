# Hagal "Hearth" UI/UX Design Spec

**Date:** 2026-07-19
**Status:** Approved by user (Concept A — Hearth, Hagal the Fox)
**Mockups:** `docs/design/mockups/concept-a-hearth.html` (+ `assets/hagal-mascot-hearth-fox.png`)

## Summary

Rebrand the app from "The Negotiator" to **Hagal** and reskin the entire customer flow
(Home → Intake → Confirm → Live calls → Report) with the approved "Hearth" visual
concept: warm, homely, trustworthy — aimed at households and parents, not Gen Z.

The brand character is **Hagal the Fox** — the clever haggler who makes the calls on
the customer's behalf. He appears in the nav logo, the home hero (with a speech
bubble), and as the voice of advice in the report ("Hagal says…").

## Design language

### Palette (Tailwind token names)

| Token | Hex | Use |
|---|---|---|
| `cream` | `#FAF5EE` | page background |
| `terracotta` | `#C46740` | primary actions, highlights |
| `terracotta-dark` | `#A9532F` | hover state, live-call text |
| `pine` | `#2F4B43` | headings, secondary buttons, winner card |
| `apricot` | `#F2B279` | accent (prices, ribbon) |
| `apricot-soft` | `#FBE8D3` | active-step / live-call background |
| `sage` | `#DDE8E0` | done-state surfaces, eyebrow pills |
| `ink` | `#33291F` | body text |
| `muted` | `#7A6E60` | secondary text |
| `linen` | `#F1E8DC` | card borders |

### Typography

- **Display / headings:** Fraunces (serif, warm), via `next/font/google`, CSS var `--font-fraunces`, Tailwind `font-display`.
- **Body / UI:** Nunito Sans, CSS var `--font-nunito`, Tailwind default `font-sans`.

### Shape language

- Cards: `rounded-2xl`, 1px `linen` border, soft shadow.
- Buttons & inputs: pill (`rounded-full`); primary = terracotta, secondary = pine, tertiary = outlined pine.
- Organic background "blobs" (irregular border-radius) on the home hero only.

## UX structure

1. **Journey stepper (new, shared):** every flow screen shows the 4-step journey —
   "Tell Hagal → Confirm the job → Hagal calls → Pick your winner" — with done /
   active / upcoming states, so the user always knows where they are.
2. **Home:** hero with fox mascot + speech bubble, eyebrow pill, pill-shaped city
   input + "Send Hagal →" CTA, trust checklist row.
3. **Intake:** "Tell Hagal about your home" — voice widget as a warm dashed card,
   upload sections as cards; captured facts confirmed in pine-on-sage text.
4. **Confirm:** job-spec facts in a card grid; confirm CTA in terracotta.
5. **Live calls:** each vendor call is a card with initials avatar, status badge
   (On the line / Done / In queue) and an animated equalizer for the live call.
6. **Report:** winner in a big pine card with apricot price + "BEST DEAL" ribbon;
   runners-up as smaller cards; "Hagal says" advice note with the fox avatar;
   drill-downs (savings / red flags / trust) as styled disclosure cards.

## Constraints (must not break)

- All existing `data-testid` attributes stay exactly as they are.
- All fetch calls, routing, and component props are unchanged — this is presentation-only.
- Copy pinned by tests is preserved: home hero keeps the phrase "dual-income family"
  (smoke e2e), report keeps the "Recommended" pill text (t1 e2e), drilldown copy
  unchanged (unit tests). `tests/unit/frontend/app-shell.test.tsx` asserts the banner
  text and IS updated from "The Negotiator" to "Hagal" as part of the rebrand.
- App metadata title becomes "Hagal — your home-services negotiator".
- Mascot asset ships at `public/hagal/hagal-fox.png`.
- No new npm dependencies.
