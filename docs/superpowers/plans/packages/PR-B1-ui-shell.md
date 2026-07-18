# PR-B1 UI Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all five customer-facing Next.js routes with mocked data and shared layout components so Lane B can iterate on UX before APIs exist.

**Architecture:** Thin App Router pages under `app/(ui)/` render presentational components from `src/frontend/`. Pages fetch nothing from domain or adapters; they import typed mock fixtures from `src/frontend/mocks/` that mirror `JobSpec`, `Vendor`, and `ReportPrimary` shapes from contracts. Playwright smoke asserts the home hero renders "The Negotiator".

**Tech Stack:** Next.js 15 · React 19 · TypeScript · Tailwind CSS · Playwright

## Global Constraints

- Vertical: `home_cleaning` only for MVP (`config/verticals/home_cleaning.json`).
- Comparability: one confirmed `JobSpec` per negotiation run.
- Honesty: skill preconditions structurally block fake competing bids; audit log required.
- CI: **no vendor secrets**; all CI tests use `src/adapters/fake/**`.
- Dependencies: `src/domain` imports only `src/contracts`; adapters never import domain; app imports adapters only from `src/app/composition/**`.
- Frontend must not import `src/domain/**` or `src/adapters/**` (enforced by dependency-cruiser).
- Branch naming: `lane-b/PR-B1-ui-shell`.
- Depends on: **PR-01** (contracts types available).

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/frontend/layout/AppShell.tsx` |
| Create | `src/frontend/layout/NavBar.tsx` |
| Create | `src/frontend/mocks/fixtures.ts` |
| Create | `src/frontend/screens/HomeHero.tsx` |
| Create | `src/frontend/screens/IntakeScreen.tsx` |
| Create | `src/frontend/screens/ConfirmJobSpecScreen.tsx` |
| Create | `src/frontend/screens/CallsStatusScreen.tsx` |
| Create | `src/frontend/screens/ReportScreen.tsx` |
| Create | `app/(ui)/layout.tsx` |
| Create | `app/(ui)/page.tsx` |
| Create | `app/(ui)/intake/[jobId]/page.tsx` |
| Create | `app/(ui)/confirm/[jobId]/page.tsx` |
| Create | `app/(ui)/calls/[jobId]/page.tsx` |
| Create | `app/(ui)/report/[jobId]/page.tsx` |
| Modify | `src/app/page.tsx` (redirect or remove — replaced by `(ui)` group) |
| Modify | `tests/e2e/smoke.spec.ts` |
| Create | `tests/unit/frontend/architecture.test.ts` |

---

### Task 1: Mock fixtures (typed, no domain imports)

**Files:**
- Create: `src/frontend/mocks/fixtures.ts`

**Interfaces:**
- Consumes: `JobSpec`, `Vendor`, `Quote`, `ReportPrimary` from `@/contracts` (after PR-01)
- Produces: `mockJobSpec`, `mockVendors`, `mockQuotes`, `mockReportPrimary` constants for all screens

- [ ] **Step 1: Write the failing test**

Create `tests/unit/frontend/fixtures.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  mockJobSpec,
  mockVendors,
  mockReportPrimary,
} from "@/frontend/mocks/fixtures";

describe("frontend fixtures", () => {
  it("mockJobSpec is unconfirmed draft", () => {
    expect(mockJobSpec.confirmed).toBe(false);
    expect(mockJobSpec.jobType).toBe("recurring_weekly");
  });

  it("mockReportPrimary has ranked quotes and recommendation", () => {
    expect(mockReportPrimary.rankedQuotes.length).toBeGreaterThan(0);
    expect(mockReportPrimary.recommendedQuoteId).toBeTruthy();
    expect(mockReportPrimary.plainLanguageWhy).toMatch(/insured/i);
  });

  it("mockVendors has at least three entries", () => {
    expect(mockVendors.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/frontend/fixtures.test.ts`
Expected: FAIL with `Cannot find module '@/frontend/mocks/fixtures'`

- [ ] **Step 3: Write minimal implementation**

Create `src/frontend/mocks/fixtures.ts`:

```typescript
import type { JobSpec, Quote, ReportPrimary, Vendor } from "@/contracts";

export const mockJobSpec: JobSpec = {
  id: "job-demo-001",
  jobType: "recurring_weekly",
  sqft: 1800,
  bedrooms: 3,
  bathrooms: 2,
  frequency: "weekly",
  addOns: ["inside_fridge", "inside_oven"],
  suppliesProvided: false,
  pets: true,
  accessNotes: "Gate code 4821; dog friendly",
  conditionNotes: "Light clutter, no heavy grime",
  geo: "Austin, TX",
  confirmed: false,
  leverageQuoteAmount: 185,
};

export const mockVendors: Vendor[] = [
  {
    id: "vendor-tough",
    name: "Sparkle Pro Clean",
    phone: "+15125550101",
    rating: 4.7,
    reviewCount: 312,
    insuredBonded: true,
    hasGuarantee: true,
    source: "fake",
  },
  {
    id: "vendor-lowball",
    name: "Budget Shine Co",
    phone: "+15125550102",
    rating: 3.9,
    reviewCount: 48,
    insuredBonded: false,
    hasGuarantee: false,
    source: "fake",
  },
  {
    id: "vendor-upseller",
    name: "Premium Nest Services",
    phone: "+15125550103",
    rating: 4.9,
    reviewCount: 890,
    insuredBonded: true,
    hasGuarantee: true,
    source: "fake",
  },
];

export const mockQuotes: Quote[] = [
  {
    id: "quote-001",
    callId: "call-r1-001",
    jobSpecId: "job-demo-001",
    vendorId: "vendor-tough",
    basePrice: 195,
    normalizedTotal: 210,
    pricingModel: "flat",
    fees: [
      { id: "fee-001", quoteId: "quote-001", feeType: "supplies", amount: 15 },
    ],
    redFlag: false,
    round: 1,
  },
  {
    id: "quote-002",
    callId: "call-r1-002",
    jobSpecId: "job-demo-001",
    vendorId: "vendor-lowball",
    basePrice: 120,
    normalizedTotal: 155,
    pricingModel: "hourly_with_minimum",
    fees: [
      { id: "fee-002", quoteId: "quote-002", feeType: "trip", amount: 35 },
    ],
    redFlag: true,
    round: 1,
  },
  {
    id: "quote-003",
    callId: "call-r1-003",
    jobSpecId: "job-demo-001",
    vendorId: "vendor-upseller",
    basePrice: 220,
    normalizedTotal: 265,
    pricingModel: "per_sqft",
    fees: [
      { id: "fee-003", quoteId: "quote-003", feeType: "first_clean_premium", amount: 45 },
    ],
    redFlag: false,
    round: 1,
  },
];

export const mockReportPrimary: ReportPrimary = {
  jobSpecId: "job-demo-001",
  rankedQuotes: mockQuotes,
  recommendedQuoteId: "quote-001",
  plainLanguageWhy:
    "Sparkle Pro Clean offers the best balance of insured service, transparent flat pricing at $210/visit, and no red flags for your weekly recurring clean.",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/frontend/fixtures.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/mocks/fixtures.ts tests/unit/frontend/fixtures.test.ts
git commit -m "feat(B1): add typed frontend mock fixtures"
```

---

### Task 2: AppShell + NavBar layout

**Files:**
- Create: `src/frontend/layout/AppShell.tsx`
- Create: `src/frontend/layout/NavBar.tsx`
- Create: `app/(ui)/layout.tsx`

**Interfaces:**
- Consumes: none
- Produces: `AppShell` wrapper with product title "The Negotiator" in header

- [ ] **Step 1: Write the failing test**

Create `tests/unit/frontend/app-shell.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/frontend/layout/AppShell";

describe("AppShell", () => {
  it("renders product title and children", () => {
    render(
      <AppShell>
        <p>Child content</p>
      </AppShell>
    );
    expect(screen.getByRole("banner")).toHaveTextContent("The Negotiator");
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/frontend/app-shell.test.tsx`
Expected: FAIL with `Cannot find module '@/frontend/layout/AppShell'`

- [ ] **Step 3: Write minimal implementation**

Create `src/frontend/layout/NavBar.tsx`:

```tsx
import Link from "next/link";

export function NavBar() {
  return (
    <header role="banner" className="border-b border-gray-200 px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          The Negotiator
        </Link>
        <nav aria-label="Main" className="flex gap-4 text-sm">
          <Link href="/intake/job-demo-001">Intake</Link>
          <Link href="/report/job-demo-001">Report</Link>
        </nav>
      </div>
    </header>
  );
}
```

Create `src/frontend/layout/AppShell.tsx`:

```tsx
import { NavBar } from "./NavBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <NavBar />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
```

Create `app/(ui)/layout.tsx`:

```tsx
import { AppShell } from "@/frontend/layout/AppShell";

export default function UiLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

Add Vitest jsdom environment for this file in `vitest.config.ts` (add to test config):

```typescript
// inside export default defineConfig({ test: { ... } })
environmentMatchGlobs: [["tests/unit/frontend/**/*.test.tsx", "jsdom"]],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/frontend/app-shell.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/layout/AppShell.tsx src/frontend/layout/NavBar.tsx app/(ui)/layout.tsx vitest.config.ts tests/unit/frontend/app-shell.test.tsx
git commit -m "feat(B1): add AppShell layout with NavBar"
```

---

### Task 3: Home hero screen + `/` route

**Files:**
- Create: `src/frontend/screens/HomeHero.tsx`
- Create: `app/(ui)/page.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: none
- Produces: `/` route rendering hero copy for busy dual-income family story

- [ ] **Step 1: Write the failing Playwright test**

Replace `tests/e2e/smoke.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test("home page loads The Negotiator hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toContainText("The Negotiator");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "The Negotiator"
  );
  await expect(page.getByText(/dual-income family/i)).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && npm run test:e2e -- tests/e2e/smoke.spec.ts`
Expected: FAIL — heading does not contain "The Negotiator" or dual-income copy missing

- [ ] **Step 3: Write minimal implementation**

Create `src/frontend/screens/HomeHero.tsx`:

```tsx
import Link from "next/link";

export function HomeHero() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">The Negotiator</h1>
      <p className="max-w-2xl text-lg text-gray-600">
        Built for the busy dual-income family who wants reliable home cleaning
        without spending evenings on hold or overpaying for hidden fees.
      </p>
      <Link
        href="/intake/job-demo-001"
        className="inline-flex rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
      >
        Start your cleaning quote
      </Link>
    </section>
  );
}
```

Create `app/(ui)/page.tsx`:

```tsx
import { HomeHero } from "@/frontend/screens/HomeHero";

export default function HomePage() {
  return <HomeHero />;
}
```

Delete the default Next.js boilerplate at `src/app/page.tsx` and replace with re-export (Next.js resolves `(ui)` group at root when configured). Simplest approach: move root page — delete `src/app/page.tsx` entirely so `app/(ui)/page.tsx` serves `/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && npm run test:e2e -- tests/e2e/smoke.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/screens/HomeHero.tsx app/(ui)/page.tsx tests/e2e/smoke.spec.ts
git rm src/app/page.tsx 2>/dev/null || true
git commit -m "feat(B1): home hero route with Playwright smoke"
```

---

### Task 4: Intake, Confirm, Calls, Report screens + routes

**Files:**
- Create: `src/frontend/screens/IntakeScreen.tsx`
- Create: `src/frontend/screens/ConfirmJobSpecScreen.tsx`
- Create: `src/frontend/screens/CallsStatusScreen.tsx`
- Create: `src/frontend/screens/ReportScreen.tsx`
- Create: `app/(ui)/intake/[jobId]/page.tsx`
- Create: `app/(ui)/confirm/[jobId]/page.tsx`
- Create: `app/(ui)/calls/[jobId]/page.tsx`
- Create: `app/(ui)/report/[jobId]/page.tsx`

**Interfaces:**
- Consumes: `mockJobSpec`, `mockVendors`, `mockReportPrimary` from fixtures
- Produces: four routed screens with `data-testid` hooks for later e2e

- [ ] **Step 1: Write the failing test**

Create `tests/unit/frontend/screens.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntakeScreen } from "@/frontend/screens/IntakeScreen";
import { ConfirmJobSpecScreen } from "@/frontend/screens/ConfirmJobSpecScreen";
import { CallsStatusScreen } from "@/frontend/screens/CallsStatusScreen";
import { ReportScreen } from "@/frontend/screens/ReportScreen";
import { mockJobSpec, mockVendors, mockReportPrimary } from "@/frontend/mocks/fixtures";

describe("frontend screens", () => {
  it("IntakeScreen shows voice widget placeholder", () => {
    render(<IntakeScreen jobSpec={mockJobSpec} />);
    expect(screen.getByTestId("intake-voice-widget")).toBeInTheDocument();
    expect(screen.getByTestId("intake-upload-quote")).toBeInTheDocument();
  });

  it("ConfirmJobSpecScreen lists sqft and confirm CTA", () => {
    render(<ConfirmJobSpecScreen jobSpec={mockJobSpec} />);
    expect(screen.getByText(/1800/)).toBeInTheDocument();
    expect(screen.getByTestId("confirm-job-spec-button")).toBeInTheDocument();
  });

  it("CallsStatusScreen lists vendor call rows", () => {
    render(<CallsStatusScreen jobId={mockJobSpec.id} vendors={mockVendors} />);
    expect(screen.getAllByTestId("call-status-row")).toHaveLength(3);
  });

  it("ReportScreen shows recommendation", () => {
    render(<ReportScreen report={mockReportPrimary} />);
    expect(screen.getByTestId("report-recommendation")).toHaveTextContent(
      mockReportPrimary.plainLanguageWhy
    );
    expect(screen.getAllByTestId("report-quote-row")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/frontend/screens.test.tsx`
Expected: FAIL with module not found for screen components

- [ ] **Step 3: Write minimal implementation**

Create `src/frontend/screens/IntakeScreen.tsx`:

```tsx
import type { JobSpec } from "@/contracts";

export function IntakeScreen({ jobSpec }: { jobSpec: JobSpec }) {
  return (
    <section className="space-y-6" data-testid="intake-screen">
      <h1 className="text-2xl font-semibold">Tell us about your home</h1>
      <p className="text-gray-600">Job draft: {jobSpec.id}</p>
      <div
        data-testid="intake-voice-widget"
        className="rounded-lg border border-dashed border-gray-300 p-8 text-center"
      >
        Voice interview widget (ElevenLabs — wired in PR-B2)
      </div>
      <div data-testid="intake-upload-quote">
        <label className="block text-sm font-medium">Upload existing quote (PDF/image)</label>
        <input type="file" accept=".pdf,image/*" className="mt-2" disabled />
      </div>
    </section>
  );
}
```

Create `src/frontend/screens/ConfirmJobSpecScreen.tsx`:

```tsx
import type { JobSpec } from "@/contracts";

export function ConfirmJobSpecScreen({ jobSpec }: { jobSpec: JobSpec }) {
  return (
    <section className="space-y-6" data-testid="confirm-screen">
      <h1 className="text-2xl font-semibold">Confirm your job spec</h1>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <dt className="font-medium">Square feet</dt>
        <dd>{jobSpec.sqft}</dd>
        <dt className="font-medium">Bedrooms / Bathrooms</dt>
        <dd>
          {jobSpec.bedrooms} / {jobSpec.bathrooms}
        </dd>
        <dt className="font-medium">Frequency</dt>
        <dd>{jobSpec.frequency}</dd>
        <dt className="font-medium">Job type</dt>
        <dd>{jobSpec.jobType}</dd>
      </dl>
      <button
        type="button"
        data-testid="confirm-job-spec-button"
        className="rounded-lg bg-black px-5 py-3 text-white"
        disabled={jobSpec.confirmed}
      >
        {jobSpec.confirmed ? "Confirmed" : "Confirm and start calling vendors"}
      </button>
    </section>
  );
}
```

Create `src/frontend/screens/CallsStatusScreen.tsx`:

```tsx
import type { Vendor } from "@/contracts";

export function CallsStatusScreen({
  jobId,
  vendors,
}: {
  jobId: string;
  vendors: Vendor[];
}) {
  return (
    <section className="space-y-6" data-testid="calls-screen">
      <h1 className="text-2xl font-semibold">Live call status</h1>
      <p className="text-gray-600">Job {jobId}</p>
      <ul className="divide-y rounded-lg border">
        {vendors.map((vendor) => (
          <li
            key={vendor.id}
            data-testid="call-status-row"
            className="flex items-center justify-between px-4 py-3"
          >
            <span>{vendor.name}</span>
            <span className="text-sm text-gray-500">Queued (simulated)</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Create `src/frontend/screens/ReportScreen.tsx`:

```tsx
import type { ReportPrimary } from "@/contracts";

export function ReportScreen({ report }: { report: ReportPrimary }) {
  return (
    <section className="space-y-6" data-testid="report-screen">
      <h1 className="text-2xl font-semibold">Your ranked quotes</h1>
      <ol className="space-y-3">
        {report.rankedQuotes.map((quote, index) => (
          <li
            key={quote.id}
            data-testid="report-quote-row"
            className="rounded-lg border p-4"
          >
            <span className="font-medium">#{index + 1}</span> — Vendor{" "}
            {quote.vendorId}: ${quote.normalizedTotal}
            {quote.id === report.recommendedQuoteId && (
              <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                Recommended
              </span>
            )}
          </li>
        ))}
      </ol>
      <div
        data-testid="report-recommendation"
        className="rounded-lg bg-gray-50 p-4 text-sm"
      >
        {report.plainLanguageWhy}
      </div>
    </section>
  );
}
```

Create route pages (each imports mocks only):

`app/(ui)/intake/[jobId]/page.tsx`:

```tsx
import { IntakeScreen } from "@/frontend/screens/IntakeScreen";
import { mockJobSpec } from "@/frontend/mocks/fixtures";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const jobSpec = { ...mockJobSpec, id: jobId };
  return <IntakeScreen jobSpec={jobSpec} />;
}
```

`app/(ui)/confirm/[jobId]/page.tsx`:

```tsx
import { ConfirmJobSpecScreen } from "@/frontend/screens/ConfirmJobSpecScreen";
import { mockJobSpec } from "@/frontend/mocks/fixtures";

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ConfirmJobSpecScreen jobSpec={{ ...mockJobSpec, id: jobId }} />;
}
```

`app/(ui)/calls/[jobId]/page.tsx`:

```tsx
import { CallsStatusScreen } from "@/frontend/screens/CallsStatusScreen";
import { mockVendors } from "@/frontend/mocks/fixtures";

export default async function CallsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <CallsStatusScreen jobId={jobId} vendors={mockVendors} />;
}
```

`app/(ui)/report/[jobId]/page.tsx`:

```tsx
import { ReportScreen } from "@/frontend/screens/ReportScreen";
import { mockReportPrimary } from "@/frontend/mocks/fixtures";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return (
    <ReportScreen report={{ ...mockReportPrimary, jobSpecId: jobId }} />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/frontend/screens.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/screens app/(ui)/intake app/(ui)/confirm app/(ui)/calls app/(ui)/report tests/unit/frontend/screens.test.tsx
git commit -m "feat(B1): intake, confirm, calls, report screens and routes"
```

---

### Task 5: Architecture guard — frontend must not import domain/adapters

**Files:**
- Create: `tests/unit/frontend/architecture.test.ts`

**Interfaces:**
- Consumes: dependency-cruiser config
- Produces: automated assertion that `src/frontend/**` has zero imports from forbidden layers

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("frontend architecture", () => {
  it("passes dependency-cruiser frontend rules", () => {
    const output = execSync("npm run arch:check", { encoding: "utf8" });
    expect(output).toMatch(/no dependency violations/i);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (should pass once frontend exists)**

Run: `npm run test -- tests/unit/frontend/architecture.test.ts && npm run arch:check`
Expected: PASS — zero violations

- [ ] **Step 3: Commit**

```bash
git add tests/unit/frontend/architecture.test.ts
git commit -m "test(B1): enforce frontend layer boundaries"
```

---

## Definition of done

- [ ] Routes `/`, `/intake/[jobId]`, `/confirm/[jobId]`, `/calls/[jobId]`, `/report/[jobId]` render with mocked data
- [ ] `src/frontend/**` contains all presentational components; no domain/adapter imports
- [ ] Playwright smoke: `/` shows "The Negotiator" in banner and h1
- [ ] `npm run ci` green on branch `lane-b/PR-B1-ui-shell`
- [ ] Update `docs/architecture/layers/frontend.md` route table if paths differ
