# Hagal "Hearth" UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the app to "Hagal" and reskin all five customer-flow screens with the approved Hearth design (warm terracotta/pine/cream, Fraunces + Nunito Sans, Hagal-the-Fox mascot), without changing any behavior, API calls, routes, or test ids.

**Architecture:** Presentation-only change confined to `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.ts`, `src/frontend/**`, and `public/hagal/`. Design tokens go into Tailwind theme so screens use semantic classes (`bg-cream`, `text-pine`, `font-display`). One new shared component (`JourneyStepper`) gives every flow screen the 4-step orientation rail.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS 3.4, `next/font/google` (Fraunces, Nunito Sans), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-19-hagal-hearth-ui-design.md`

## Global Constraints

- Every existing `data-testid` attribute must remain unchanged (unit + e2e tests select by them).
- No fetch/routing/props changes — JSX structure may change, behavior may not.
- Pinned copy: home hero must keep the phrase "dual-income family"; report keeps a visible "Recommended" text; drilldown copy ("saved", "below market", trust scores) unchanged; live calls keep outcome text rendering (`itemized quote`) and `live-transport-mode` testid content.
- Brand string everywhere: **Hagal** (nav banner, metadata). `tests/unit/frontend/app-shell.test.tsx:12` is updated to expect "Hagal".
- Mascot asset path: `public/hagal/hagal-fox.png` (copied from `docs/design/mockups/assets/hagal-mascot-hearth-fox.png`).
- No new npm dependencies.
- Verify with: `npm run lint && npm run typecheck && npm run test` per task; full `npm run ci` at the end.

---

### Task 1: Design tokens, fonts, mascot asset, metadata

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `public/hagal/hagal-fox.png` (binary copy)

**Interfaces:**
- Produces: Tailwind classes used by all later tasks: `bg-cream`, `bg-terracotta`, `hover:bg-terracotta-dark`, `bg-pine`, `text-pine`, `text-ink`, `text-muted-warm`, `bg-apricot`, `bg-apricot-soft`, `bg-sage`, `border-linen`, `font-display` (Fraunces), default `font-sans` (Nunito Sans).

- [ ] **Step 1: Copy the mascot into public assets**

```bash
mkdir -p public/hagal
cp docs/design/mockups/assets/hagal-mascot-hearth-fox.png public/hagal/hagal-fox.png
```

- [ ] **Step 2: Add Hearth palette + font families to `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/frontend/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cream: "#FAF5EE",
        terracotta: { DEFAULT: "#C46740", dark: "#A9532F" },
        pine: "#2F4B43",
        apricot: { DEFAULT: "#F2B279", soft: "#FBE8D3" },
        sage: "#DDE8E0",
        ink: "#33291F",
        "muted-warm": "#7A6E60",
        linen: "#F1E8DC",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "sans-serif"],
        display: ["var(--font-fraunces)", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Update `src/app/globals.css`** (cream background, warm ink text, remove dark-mode override and Arial)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #faf5ee;
  --foreground: #33291f;
}

body {
  color: var(--foreground);
  background: var(--background);
}
```

- [ ] **Step 4: Load Fraunces + Nunito Sans in `src/app/layout.tsx`, update metadata**

```tsx
import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hagal — your home-services negotiator",
  description:
    "Hagal calls local vendors, negotiates the price, and brings back the best deal with proof.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${nunitoSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify** — `npm run typecheck && npm run test` → all pass (no test asserts fonts/colors yet).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(ui): Hearth design tokens, Hagal fonts, mascot asset"`

---

### Task 2: Rebrand shell — `AppShell` + `NavBar` (+ test update)

**Files:**
- Modify: `src/frontend/layout/AppShell.tsx`
- Modify: `src/frontend/layout/NavBar.tsx`
- Modify: `tests/unit/frontend/app-shell.test.tsx:12` ("The Negotiator" → "Hagal")

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: warm shell wrapping all pages; banner text "Hagal".

- [ ] **Step 1: Update the app-shell test expectation first (TDD)**

```tsx
expect(screen.getByRole("banner")).toHaveTextContent("Hagal");
```

- [ ] **Step 2: Run it to confirm it fails** — `npx vitest run tests/unit/frontend/app-shell.test.tsx` → FAIL (banner still says "The Negotiator").

- [ ] **Step 3: Reskin `NavBar`** — logo = fox image in a soft circle + "Hagal" in `font-display text-pine`; nav link styled as pine pill:

```tsx
import Image from "next/image";
import Link from "next/link";

export function NavBar() {
  return (
    <header role="banner" className="border-b border-linen bg-white px-6 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-apricot-soft">
            <Image src="/hagal/hagal-fox.png" alt="Hagal the fox" width={36} height={36} />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-pine">Hagal</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm font-bold">
          <Link
            href="/"
            className="rounded-full bg-pine px-4 py-2 text-white hover:bg-pine/90"
          >
            New quote
          </Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Reskin `AppShell`** — cream page, white content card feel stays per-screen:

```tsx
import { NavBar } from "./NavBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <NavBar />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Verify** — `npx vitest run tests/unit/frontend/app-shell.test.tsx` → PASS. (Note: `next/image` renders an `img` in jsdom; no test asserts it.)

- [ ] **Step 6: Commit** — `git commit -am "feat(ui): rebrand shell to Hagal with fox logo and warm tokens"`

---

### Task 3: Shared `JourneyStepper` component (+ unit test)

**Files:**
- Create: `src/frontend/components/JourneyStepper.tsx`
- Test: `tests/unit/frontend/journeyStepper.test.tsx`

**Interfaces:**
- Produces: `JourneyStepper({ current }: { current: "intake" | "confirm" | "calls" | "report" })` — renders 4 steps ("Tell Hagal", "Confirm the job", "Hagal calls", "Pick your winner") with done/active/upcoming styling; `data-testid="journey-stepper"`, each step `data-testid="journey-step"` with `data-state="done" | "active" | "upcoming"`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { JourneyStepper } from "@/frontend/components/JourneyStepper";

it("marks earlier steps done, current active, later upcoming", () => {
  render(<JourneyStepper current="calls" />);
  const steps = screen.getAllByTestId("journey-step");
  expect(steps).toHaveLength(4);
  expect(steps[0]).toHaveAttribute("data-state", "done");
  expect(steps[1]).toHaveAttribute("data-state", "done");
  expect(steps[2]).toHaveAttribute("data-state", "active");
  expect(steps[3]).toHaveAttribute("data-state", "upcoming");
  expect(screen.getByText("Hagal calls")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to confirm it fails** — `npx vitest run tests/unit/frontend/journeyStepper.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
const STEPS = [
  { key: "intake", label: "Tell Hagal", desc: "A 2-minute chat about your home." },
  { key: "confirm", label: "Confirm the job", desc: "Approve with one tap." },
  { key: "calls", label: "Hagal calls", desc: "Watch him negotiate live." },
  { key: "report", label: "Pick your winner", desc: "Ranked quotes, plain advice." },
] as const;

export type JourneyStep = (typeof STEPS)[number]["key"];

export function JourneyStepper({ current }: { current: JourneyStep }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);
  return (
    <ol data-testid="journey-stepper" className="flex gap-3">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "upcoming";
        return (
          <li
            key={step.key}
            data-testid="journey-step"
            data-state={state}
            className={
              state === "active"
                ? "flex-1 rounded-2xl border-2 border-terracotta bg-apricot-soft p-3"
                : state === "done"
                  ? "flex-1 rounded-2xl border border-sage bg-sage/40 p-3"
                  : "flex-1 rounded-2xl border border-dashed border-linen bg-white p-3"
            }
          >
            <span
              className={`mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold text-white ${
                state === "active" ? "bg-terracotta" : "bg-pine"
              }`}
            >
              {state === "done" ? "✓" : index + 1}
            </span>
            <p className="text-sm font-extrabold">{step.label}</p>
            <p className="hidden text-xs text-muted-warm sm:block">{step.desc}</p>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 4: Run to confirm it passes** — `npx vitest run tests/unit/frontend/journeyStepper.test.tsx` → PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(ui): shared Hagal journey stepper"`

---

### Task 4: Home hero reskin (`HomeHero`)

**Files:**
- Modify: `src/frontend/screens/HomeHero.tsx`

**Interfaces:**
- Consumes: tokens (Task 1). Keeps `data-testid="start-intake-button"`, the `geo` input, `handleStart` fetch, and the phrase "dual-income family" (pinned by `tests/e2e/smoke.spec.ts`).

- [ ] **Step 1: Reskin JSX** (behavior identical; layout = two-column hero with mascot + speech bubble, organic blobs, eyebrow pill, pill search bar, trust row):
  - Section: `relative overflow-hidden rounded-3xl border border-linen bg-white px-8 py-12 sm:px-12`.
  - Blobs: two absolutely-positioned divs (apricot-soft and sage) with organic `borderRadius` inline style, `aria-hidden`.
  - Eyebrow: `inline-flex rounded-full bg-sage px-4 py-2 text-sm font-extrabold text-pine` — text "For busy households".
  - H1: `font-display text-5xl font-semibold leading-tight` — "Hagal calls the cleaners." + `<em className="not-italic text-terracotta">You keep your evening.</em>`.
  - Paragraph keeps "dual-income family" copy, `text-muted-warm`.
  - Search bar: wrapper `flex max-w-md rounded-full border-2 border-pine bg-white p-1.5 shadow-lg shadow-pine/10`; input `flex-1 border-0 bg-transparent px-4 outline-none`; button (same testid/handler) `rounded-full bg-terracotta px-6 py-3 font-extrabold text-white hover:bg-terracotta-dark disabled:opacity-50` — label "Send Hagal →" / loading "Sending Hagal…".
  - Trust row: three `text-sm font-bold text-pine` items each prefixed with a terracotta "✓".
  - Mascot column: `<Image src="/hagal/hagal-fox.png" alt="Hagal the fox holding a phone" width={280} height={280} />` with a white speech bubble div ("Leave the haggling to me!") `rounded-2xl border-2 border-pine bg-white px-4 py-2 text-sm font-extrabold text-pine`.

- [ ] **Step 2: Verify** — `npm run typecheck && npx vitest run tests/unit/frontend/screens.test.tsx` → PASS; manual check on `npm run dev`.

- [ ] **Step 3: Commit** — `git commit -am "feat(ui): Hearth home hero with Hagal mascot"`

---

### Task 5: Intake screen reskin (`IntakeScreen`)

**Files:**
- Modify: `src/frontend/screens/IntakeScreen.tsx`

**Interfaces:**
- Consumes: `JourneyStepper` (Task 3). All testids (`intake-screen`, `intake-voice-widget`, `intake-voice-sync-button`, `intake-upload-quote`, `intake-room-photos`, `intake-photos-result`, `intake-continue-link`) and handlers unchanged.

- [ ] **Step 1: Reskin JSX**
  - Add `<JourneyStepper current="intake" />` at top.
  - H1: `font-display text-3xl text-pine` — "Tell Hagal about your home".
  - Voice widget: `rounded-2xl border-2 border-dashed border-apricot bg-apricot-soft/40 p-8 text-center`; sync button `rounded-full bg-pine px-5 py-2.5 font-bold text-white disabled:opacity-50`; captured-facts line `text-sm font-bold text-pine`.
  - Upload sections: white cards `rounded-2xl border border-linen bg-white p-5`; labels `font-extrabold text-ink`; success lines `text-sm font-bold text-pine`.
  - Continue link: `rounded-full bg-terracotta px-6 py-3 font-extrabold text-white hover:bg-terracotta-dark` — "Continue — Hagal reads it back →".
  - "Job not found" branch: same structure, warm styling.

- [ ] **Step 2: Verify** — `npx vitest run tests/unit/frontend/screens.test.tsx && npm run typecheck` → PASS.

- [ ] **Step 3: Commit** — `git commit -am "feat(ui): Hearth intake screen"`

---

### Task 6: Confirm screen reskin (`ConfirmJobSpecScreen`)

**Files:**
- Modify: `src/frontend/screens/ConfirmJobSpecScreen.tsx`

**Interfaces:**
- Consumes: `JourneyStepper`. Testids (`confirm-screen`, `confirm-loading`, `confirm-job-spec-button`, `view-calls-link`) and confirm/start-calls flow unchanged; button still shows "Confirmed" when `jobSpec.confirmed` (pinned by `confirmJobSpec.test.tsx`).

- [ ] **Step 1: Reskin JSX**
  - `<JourneyStepper current="confirm" />`; H1 `font-display text-3xl text-pine` — "Confirm your job — Hagal reads it back".
  - Spec facts: card `rounded-2xl border border-linen bg-white p-6`, `dl` as two-column grid; `dt` in `text-muted-warm text-xs uppercase tracking-wide font-extrabold`, `dd` in `font-display text-lg text-ink`.
  - Confirm button: `rounded-full bg-terracotta px-6 py-3 font-extrabold text-white hover:bg-terracotta-dark disabled:opacity-50` — idle label "Looks right — send Hagal to negotiate"; confirmed label stays exactly "Confirmed".
  - Incomplete-spec warning: `rounded-2xl bg-apricot-soft px-4 py-3 text-sm font-bold text-terracotta-dark`.
  - `view-calls-link`: `rounded-full border-2 border-pine px-6 py-3 font-extrabold text-pine hover:bg-sage/40` — "Negotiation started — watch Hagal's calls".

- [ ] **Step 2: Verify** — `npx vitest run tests/unit/frontend/confirmJobSpec.test.tsx && npm run typecheck` → PASS.

- [ ] **Step 3: Commit** — `git commit -am "feat(ui): Hearth confirm screen"`

---

### Task 7: Live calls reskin (`LiveCallsScreen`)

**Files:**
- Modify: `src/frontend/screens/LiveCallsScreen.tsx`

**Interfaces:**
- Consumes: `JourneyStepper`, `useCallStatusFeed` (unchanged). Testids (`live-calls-screen`, `live-calls-loading`, `live-transport-mode`, `call-status-row`, `live-call-row`, `view-report-link`) unchanged; outcome text still rendered via `call.outcome.replace(/_/g, " ")` (pinned by `liveCallsScreen.test.tsx`).

- [ ] **Step 1: Reskin JSX**
  - `<JourneyStepper current="calls" />`; H1 `font-display text-3xl text-pine` — "Live calls — Hagal is on the line"; transport line stays, styled `text-xs text-muted-warm`.
  - Each call row → card: `flex items-center justify-between gap-4 rounded-2xl border border-linen bg-white px-5 py-4 shadow-sm`; vendor label with initials avatar circle (`h-10 w-10 rounded-full bg-pine text-white grid place-items-center font-extrabold`, derived from vendorId first letters).
  - Outcome badge: `rounded-full bg-sage px-3 py-1 text-xs font-extrabold text-pine`; in-progress badge: `rounded-full bg-apricot-soft px-3 py-1 text-xs font-extrabold text-terracotta-dark` with an animated pulse dot (`animate-pulse`) — text stays "In progress".
  - Report link: `rounded-full bg-terracotta px-6 py-3 font-extrabold text-white hover:bg-terracotta-dark` — "See Hagal's report →".

- [ ] **Step 2: Verify** — `npx vitest run tests/unit/frontend/liveCallsScreen.test.tsx && npm run typecheck` → PASS.

- [ ] **Step 3: Commit** — `git commit -am "feat(ui): Hearth live-calls screen"`

---

### Task 8: Report + drilldowns reskin (`ReportScreen`, `ReportDrilldownsPanel`)

**Files:**
- Modify: `src/frontend/screens/ReportScreen.tsx`
- Modify: `src/frontend/components/ReportDrilldownsPanel.tsx`

**Interfaces:**
- Consumes: `JourneyStepper`, mascot asset. Testids (`report-screen`, `report-loading`, `report-quote-row`, `report-recommendation`, `drilldown-savings`, `drilldown-red-flags`, `drilldown-trust`) unchanged; visible "Recommended" text preserved (t1 e2e); drilldown sentence structures preserved (unit tests match `/\$30 saved/i`, `/below market/i`, `/82/`).

- [ ] **Step 1: Reskin `ReportScreen`**
  - `<JourneyStepper current="report" />`; H1 `font-display text-3xl text-pine` — "Hagal's report — your ranked quotes".
  - Recommended quote renders as the **winner card**: `rounded-3xl bg-pine p-7 text-white` with apricot `font-display` price, "Recommended" pill `rounded-full bg-apricot px-3 py-1 text-xs font-extrabold text-ink`, red-flag pill if flagged.
  - Other quotes: `rounded-2xl border border-linen bg-white px-5 py-4` rows with rank number in `font-display text-pine`, price right-aligned `font-display text-xl text-pine`; red flag pill `rounded-full bg-terracotta/10 px-3 py-1 text-xs font-extrabold text-terracotta-dark`.
  - `report-recommendation` block → "Hagal says" note: `flex items-center gap-4 rounded-2xl bg-sage/40 p-4 text-sm text-pine` with fox `Image` (56px, rounded-full) and `plainLanguageWhy` text unchanged.

- [ ] **Step 2: Reskin `ReportDrilldownsPanel`** — keep all copy and testids; each `details` becomes `rounded-2xl border border-linen bg-white px-5 py-4`; `summary` gets `cursor-pointer font-extrabold text-pine`.

- [ ] **Step 3: Verify** — `npx vitest run tests/unit/frontend/reportScreen.test.tsx tests/unit/frontend/reportDrilldownsPanel.test.tsx tests/unit/frontend/screens.test.tsx` → PASS.

- [ ] **Step 4: Commit** — `git commit -am "feat(ui): Hearth report with winner card and Hagal advice note"`

---

### Task 9: Full verification + visual walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Full gate** — `npm run ci` (lint, typecheck, arch:check, unit tests, build) → all green. Note: run from the `Hack-Nation_Hackathon-2` clone (no `#` in path).
- [ ] **Step 2: E2E** — `npm run test:e2e` → smoke + t1 + t2 specs pass.
- [ ] **Step 3: Visual QA** — `npm run dev`, walk Home → Intake → Confirm → Calls → Report in the browser, screenshot each screen, compare against `docs/design/mockups/concept-a-hearth.html`.
- [ ] **Step 4: Commit any polish, push** — `git push origin main` (or current branch).

## Self-Review Notes

- Spec coverage: tokens/fonts (T1), rebrand (T2), stepper (T3), all five screens (T4–T8), constraint verification (T9). Mascot in nav (T2), hero (T4), report (T8). ✓
- Pinned-copy risks re-checked against tests: `smoke.spec.ts` (dual-income family — kept in hero paragraph), `app-shell.test.tsx` (updated to Hagal in T2), `confirmJobSpec.test.tsx` ("Confirmed" label kept), `liveCallsScreen.test.tsx` (outcome text + transport kept), report tests (Recommended pill + drilldown sentences kept). ✓
- Type consistency: `JourneyStepper` props (`current: "intake" | "confirm" | "calls" | "report"`) match usage in T5–T8. ✓
