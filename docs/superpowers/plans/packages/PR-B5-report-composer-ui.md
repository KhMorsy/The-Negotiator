# PR-B5 Report Composer + UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assemble `ReportPrimary` via `reportComposer`, expose `GET /api/reports/[jobId]`, and render the report UI with ranked quotes, `plainLanguageWhy`, and disabled D/E/F drill-down expander stubs until T2.

**Architecture:** `ReportComposer` in `src/app/report/` pulls quotes and vendors from repositories, runs B4 pure functions, returns `ReportPrimary`. Report screen fetches API client-side. Drill-down sections render collapsed with `aria-disabled` and "Available after live calls (T2)" label.

**Tech Stack:** Next.js 15 · React 19 · Vitest · TypeScript

## Global Constraints

- Report primary output (A) always shown; drill-downs D/E/F stubbed until PR-B7 / T2.
- Frontend must not import domain — report assembly stays in application layer.
- Branch naming: `lane-b/PR-B5-report-composer-ui`.
- Depends on: **PR-B4** (pure functions), **PR-B1** (ReportScreen shell).

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/app/report/reportComposer.ts` |
| Create | `app/api/reports/[jobId]/route.ts` |
| Modify | `src/frontend/screens/ReportScreen.tsx` |
| Create | `src/frontend/components/ReportDrilldownStub.tsx` |
| Create | `tests/integration/report/reportComposer.test.ts` |
| Create | `tests/unit/frontend/reportScreen.test.tsx` |

---

### Task 1: ReportComposer assembles ReportPrimary

**Files:**
- Create: `src/app/report/reportComposer.ts`
- Create: `tests/integration/report/reportComposer.test.ts`

**Interfaces:**
- Consumes: `QuoteRepository.listByJobSpec`, `Vendor` map, B4 functions `normalizeQuote`, `evaluateRedFlags`, `scoreTrust`, `rankQuotes`, `JobSpec`
- Produces: `ReportComposer.compose(jobSpecId): Promise<ReportPrimary>`

- [ ] **Step 1: Write the failing integration test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { ReportComposer } from "@/app/report/reportComposer";
import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryQuoteRepo";
import type { JobSpec, Quote, Vendor } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-report-1",
  jobType: "recurring_weekly",
  sqft: 2000,
  bedrooms: 3,
  bathrooms: 2,
  frequency: "weekly",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Austin, TX",
  confirmed: true,
};

const vendors: Vendor[] = [
  {
    id: "vendor-a",
    name: "Sparkle Pro",
    phone: "+1",
    rating: 4.7,
    reviewCount: 300,
    insuredBonded: true,
    hasGuarantee: true,
    source: "fake",
  },
  {
    id: "vendor-b",
    name: "Budget Co",
    phone: "+1",
    rating: 3.8,
    reviewCount: 40,
    insuredBonded: false,
    hasGuarantee: false,
    source: "fake",
  },
];

async function seedQuotes(repo: ReturnType<typeof createInMemoryQuoteRepository>) {
  const raw: Omit<Quote, "id">[] = [
    {
      callId: "c1",
      jobSpecId: jobSpec.id,
      vendorId: "vendor-a",
      basePrice: 195,
      normalizedTotal: 0,
      pricingModel: "flat",
      fees: [{ id: "f1", quoteId: "q1", feeType: "supplies", amount: 15 }],
      redFlag: false,
      round: 1,
    },
    {
      callId: "c2",
      jobSpecId: jobSpec.id,
      vendorId: "vendor-b",
      basePrice: 120,
      normalizedTotal: 0,
      pricingModel: "flat",
      fees: [],
      redFlag: false,
      round: 1,
    },
  ];
  for (const q of raw) {
    await repo.create(q);
  }
}

describe("ReportComposer", () => {
  it("returns ReportPrimary with ranked quotes and plainLanguageWhy", async () => {
    const quoteRepo = createInMemoryQuoteRepository();
    await seedQuotes(quoteRepo);
    const composer = new ReportComposer({
      quoteRepo,
      getJobSpec: async () => jobSpec,
      getVendors: async () => vendors,
    });
    const report = await composer.compose(jobSpec.id);
    expect(report.rankedQuotes.length).toBe(2);
    expect(report.recommendedQuoteId).toBeTruthy();
    expect(report.plainLanguageWhy).toMatch(/Sparkle Pro|insured/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/report/reportComposer.test.ts`
Expected: FAIL — `ReportComposer` and `createInMemoryQuoteRepository` not found

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/fake/inMemoryQuoteRepo.ts`:

```typescript
import type { Quote, QuoteRepository } from "@/contracts";
import { randomUUID } from "node:crypto";

export function createInMemoryQuoteRepository(): QuoteRepository {
  const store = new Map<string, Quote>();
  return {
    async create(input: Omit<Quote, "id">) {
      const quote: Quote = { ...input, id: randomUUID() };
      store.set(quote.id, quote);
      return quote;
    },
    async listByJobSpec(jobSpecId: string) {
      return [...store.values()].filter((q) => q.jobSpecId === jobSpecId);
    },
    async getById(id: string) {
      return store.get(id) ?? null;
    },
  };
}
```

Create `src/app/report/reportComposer.ts`:

```typescript
import type { JobSpec, QuoteRepository, Vendor, ReportPrimary } from "@/contracts";
import { normalizeQuote } from "@/domain/report/normalizeQuote";
import { evaluateRedFlags } from "@/domain/report/evaluateRedFlags";
import { rankQuotes } from "@/domain/report/rankQuotes";
import { MARKET_BENCHMARK_WEEKLY, BELOW_MARKET_PERCENT } from "@/domain/report/benchmarks";

export class ReportComposer {
  constructor(
    private readonly deps: {
      quoteRepo: QuoteRepository;
      getJobSpec: (jobSpecId: string) => Promise<JobSpec | null>;
      getVendors: (jobSpecId: string) => Promise<Vendor[]>;
    }
  ) {}

  async compose(jobSpecId: string): Promise<ReportPrimary> {
    const jobSpec = await this.deps.getJobSpec(jobSpecId);
    if (!jobSpec) throw new Error(`JobSpec not found: ${jobSpecId}`);

    const vendors = await this.deps.getVendors(jobSpecId);
    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));

    const rawQuotes = await this.deps.quoteRepo.listByJobSpec(jobSpecId);
    const normalized = rawQuotes.map((q) => normalizeQuote(q, jobSpec));
    const flagged = normalized.map((q) => {
      const { redFlag } = evaluateRedFlags(q, MARKET_BENCHMARK_WEEKLY, BELOW_MARKET_PERCENT);
      return { ...q, redFlag };
    });

    const { rankedQuotes, recommendedQuoteId } = rankQuotes(flagged, vendorMap);
    const top = rankedQuotes[0];
    const topVendor = vendorMap[top.vendorId];
    const plainLanguageWhy = topVendor
      ? `${topVendor.name} offers the best balance of insured service and transparent pricing at $${top.normalizedTotal}/visit with no red flags for your ${jobSpec.frequency} ${jobSpec.jobType.replace(/_/g, " ")}.`
      : "Insufficient vendor data to recommend.";

    return { jobSpecId, rankedQuotes, recommendedQuoteId, plainLanguageWhy };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/report/reportComposer.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/report/reportComposer.ts src/adapters/fake/inMemoryQuoteRepo.ts tests/integration/report/reportComposer.test.ts
git commit -m "feat(B5): ReportComposer assembles ReportPrimary"
```

---

### Task 2: GET /api/reports/[jobId]

**Files:**
- Create: `app/api/reports/[jobId]/route.ts`
- Create: `src/app/report/getReportComposer.ts`

**Interfaces:**
- Consumes: `ReportComposer.compose`
- Produces: `GET /api/reports/[jobId]` → `{ report: ReportPrimary }`

- [ ] **Step 1: Write the failing test**

Add to `tests/integration/report/reportComposer.test.ts`:

```typescript
describe("GET /api/reports/[jobId]", () => {
  it("returns report JSON", async () => {
    const { GET } = await import("../../../../app/api/reports/[jobId]/route");
    const res = await GET(new Request("http://localhost/api/reports/job-report-1"), {
      params: Promise.resolve({ jobId: "job-report-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.report.rankedQuotes).toBeDefined();
    expect(body.report.plainLanguageWhy).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/report/reportComposer.test.ts`
Expected: FAIL on new test — route not found

- [ ] **Step 3: Write minimal implementation**

`src/app/report/getReportComposer.ts`:

```typescript
import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryQuoteRepo";
import { ReportComposer } from "./reportComposer";
import type { JobSpec, Vendor } from "@/contracts";

const demoJobSpec: JobSpec = {
  id: "job-report-1",
  jobType: "recurring_weekly",
  sqft: 2000,
  bedrooms: 3,
  bathrooms: 2,
  frequency: "weekly",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Austin, TX",
  confirmed: true,
};

const demoVendors: Vendor[] = [
  {
    id: "vendor-a",
    name: "Sparkle Pro",
    phone: "+1",
    rating: 4.7,
    reviewCount: 300,
    insuredBonded: true,
    hasGuarantee: true,
    source: "fake",
  },
];

let quoteRepo = createInMemoryQuoteRepository();
let seeded = false;

async function ensureSeeded() {
  if (seeded) return;
  await quoteRepo.create({
    callId: "c1",
    jobSpecId: "job-report-1",
    vendorId: "vendor-a",
    basePrice: 195,
    normalizedTotal: 210,
    pricingModel: "flat",
    fees: [],
    redFlag: false,
    round: 1,
  });
  seeded = true;
}

export function getReportComposer() {
  return new ReportComposer({
    quoteRepo,
    getJobSpec: async (id) => (id === demoJobSpec.id ? demoJobSpec : null),
    getVendors: async () => demoVendors,
  });
}

export async function ensureReportDemoData() {
  await ensureSeeded();
}
```

`app/api/reports/[jobId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { ensureReportDemoData, getReportComposer } from "@/app/report/getReportComposer";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  await ensureReportDemoData();
  const composer = getReportComposer();
  try {
    const report = await composer.compose(jobId);
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/report/reportComposer.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/reports src/app/report/getReportComposer.ts tests/integration/report/reportComposer.test.ts
git commit -m "feat(B5): GET /api/reports/[jobId] endpoint"
```

---

### Task 3: Report UI — ranked list, plainLanguageWhy, disabled drill-down stubs

**Files:**
- Create: `src/frontend/components/ReportDrilldownStub.tsx`
- Modify: `src/frontend/screens/ReportScreen.tsx`
- Modify: `app/(ui)/report/[jobId]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/reports/[jobId]` → `ReportPrimary`
- Produces: UI with `data-testid="report-recommendation"`, expanders for savings/redFlags/trust disabled

- [ ] **Step 1: Write the failing component test**

Create `tests/unit/frontend/reportScreen.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportScreen } from "@/frontend/screens/ReportScreen";
import { mockReportPrimary } from "@/frontend/mocks/fixtures";

describe("ReportScreen drilldown stubs", () => {
  it("shows recommendation and disabled D/E/F expanders", () => {
    render(<ReportScreen report={mockReportPrimary} />);
    expect(screen.getByTestId("report-recommendation")).toBeInTheDocument();
    expect(screen.getByTestId("drilldown-savings")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("drilldown-red-flags")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("drilldown-trust")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/Available after live calls \(T2\)/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/frontend/reportScreen.test.tsx`
Expected: FAIL — drilldown testids missing

- [ ] **Step 3: Write minimal implementation**

Create `src/frontend/components/ReportDrilldownStub.tsx`:

```tsx
type DrilldownStubProps = {
  testId: string;
  title: string;
};

export function ReportDrilldownStub({ testId, title }: DrilldownStubProps) {
  return (
    <details data-testid={testId} aria-disabled="true" className="opacity-60">
      <summary className="cursor-not-allowed font-medium">{title}</summary>
      <p className="mt-2 text-sm text-gray-500">
        Available after live calls (T2) — savings delta, red-flag callouts, and trust
        scores render here when PR-B7 merges.
      </p>
    </details>
  );
}
```

Update `src/frontend/screens/ReportScreen.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { ReportPrimary } from "@/contracts";
import { ReportDrilldownStub } from "@/frontend/components/ReportDrilldownStub";

export function ReportScreen({
  report: initialReport,
  jobId,
}: {
  report?: ReportPrimary;
  jobId?: string;
}) {
  const [report, setReport] = useState<ReportPrimary | null>(initialReport ?? null);

  useEffect(() => {
    if (initialReport || !jobId) return;
    fetch(`/api/reports/${jobId}`)
      .then((r) => r.json())
      .then((body) => setReport(body.report));
  }, [initialReport, jobId]);

  if (!report) {
    return <p data-testid="report-loading">Loading report…</p>;
  }

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
            {quote.redFlag && (
              <span className="ml-2 text-xs text-red-600">Red flag</span>
            )}
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
      <div className="space-y-3 border-t pt-4">
        <ReportDrilldownStub testId="drilldown-savings" title="D — Savings delta" />
        <ReportDrilldownStub testId="drilldown-red-flags" title="E — Red-flag callouts" />
        <ReportDrilldownStub testId="drilldown-trust" title="F — Trust signals" />
      </div>
    </section>
  );
}
```

Update `app/(ui)/report/[jobId]/page.tsx`:

```tsx
import { ReportScreen } from "@/frontend/screens/ReportScreen";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ReportScreen jobId={jobId} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/frontend/reportScreen.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/components/ReportDrilldownStub.tsx src/frontend/screens/ReportScreen.tsx app/(ui)/report/[jobId]/page.tsx tests/unit/frontend/reportScreen.test.tsx
git commit -m "feat(B5): report UI with ranked quotes and T2 drilldown stubs"
```

---

## Definition of done

- [ ] `ReportComposer.compose` returns valid `ReportPrimary`
- [ ] `GET /api/reports/[jobId]` serves ranked report JSON
- [ ] Report UI shows ranked list + `plainLanguageWhy`
- [ ] D/E/F expanders present but disabled until T2
- [ ] `npm run ci` green on `lane-b/PR-B5-report-composer-ui`
- [ ] Update `docs/architecture/layers/application.md` Report Composer entry
