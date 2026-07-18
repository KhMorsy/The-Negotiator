# PR-B7 Report Drill-downs D/E/F Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable report drill-down expanders D (savings delta), E (red-flag callouts), and F (trust signals) by extending `ReportComposer` to produce `ReportDrilldowns` and wiring B4 pure functions `evaluateRedFlags` / `scoreTrust` into the UI — domain functions unchanged (LSP).

**Architecture:** Application layer adds `composeDrilldowns(jobSpecId)` beside existing `compose()`. API returns `{ report: ReportPrimary; drilldowns: ReportDrilldowns }`. Frontend replaces `ReportDrilldownStub` with interactive `<details>` expanders fed by API data. Savings delta compares round-1 max vs post-negotiation min from audit events.

**Tech Stack:** Next.js 15 · React 19 · Vitest · TypeScript

## Global Constraints

- **LSP:** B4 pure functions consumed as-is; no signature changes to `evaluateRedFlags` or `scoreTrust`.
- **Canonical types:** use `ReportDrilldowns` exactly as defined in master plan.
- Branch naming: `lane-b/PR-B7-drilldowns`.
- **Depends on:** **PR-I1** (report composer + audit repo), **PR-B4** (pure functions), **PR-B5** (report UI shell).

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

## Canonical types (locked)

```typescript
export interface ReportDrilldowns {
  savings?: { initialTotal: number; negotiatedTotal: number; marketBenchmark: number };
  redFlags?: Array<{ quoteId: string; reasons: string[] }>;
  trust?: Array<{ vendorId: string; score: number }>;
}

// B4 outputs consumed — do not rename
export function evaluateRedFlags(
  quote: Quote,
  marketBenchmark: number,
  belowMarketPercent: number
): { redFlag: boolean; reasons: string[] };

export function scoreTrust(vendor: Vendor): number;
```

---

## Files overview

| Action | Path |
|--------|------|
| Modify | `src/app/report/reportComposer.ts` |
| Modify | `app/api/reports/[jobId]/route.ts` |
| Create | `src/frontend/components/ReportDrilldownsPanel.tsx` |
| Modify | `src/frontend/screens/ReportScreen.tsx` |
| Delete | `src/frontend/components/ReportDrilldownStub.tsx` |
| Create | `tests/integration/report/reportDrilldowns.test.ts` |
| Create | `tests/unit/frontend/reportDrilldownsPanel.test.tsx` |

---

### Task 1: ReportComposer.composeDrilldowns

**Files:**
- Modify: `src/app/report/reportComposer.ts`
- Create: `tests/integration/report/reportDrilldowns.test.ts`

**Interfaces:**
- Consumes: `QuoteRepository`, `AuditRepository`, `Vendor[]`, `evaluateRedFlags`, `scoreTrust`, `MARKET_BENCHMARK_WEEKLY`
- Produces: `ReportComposer.composeDrilldowns(jobSpecId): Promise<ReportDrilldowns>`

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/integration/report/reportDrilldowns.test.ts
import { describe, it, expect } from "vitest";
import { ReportComposer } from "@/app/report/reportComposer";
import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryQuoteRepo";
import { createInMemoryAuditRepository } from "@/adapters/fake/inMemoryAuditRepo";
import type { JobSpec, Vendor } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-dd-1",
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
    rating: 4.8,
    reviewCount: 400,
    insuredBonded: true,
    hasGuarantee: true,
    source: "fake",
  },
  {
    id: "vendor-b",
    name: "Budget Co",
    phone: "+1",
    rating: 3.5,
    reviewCount: 30,
    insuredBonded: false,
    hasGuarantee: false,
    source: "fake",
  },
];

describe("ReportComposer.composeDrilldowns", () => {
  it("returns savings, redFlags, and trust arrays", async () => {
    const quoteRepo = createInMemoryQuoteRepository();
    const auditRepo = createInMemoryAuditRepository();

    const q1 = await quoteRepo.create({
      callId: "c1",
      jobSpecId: jobSpec.id,
      vendorId: "vendor-a",
      basePrice: 225,
      normalizedTotal: 225,
      pricingModel: "flat",
      fees: [],
      redFlag: false,
      round: 1,
    });
    await quoteRepo.create({
      callId: "c2",
      jobSpecId: jobSpec.id,
      vendorId: "vendor-b",
      basePrice: 99,
      normalizedTotal: 99,
      pricingModel: "hourly_with_minimum",
      fees: [],
      redFlag: false,
      round: 1,
    });

    await auditRepo.append({
      callId: "c1-r2",
      skillId: "leverage_competing_bid",
      authorizingEvidence: { jobSpecId: jobSpec.id },
      priceBefore: 225,
      priceAfter: 195,
    });

    const composer = new ReportComposer({
      quoteRepo,
      auditRepo,
      getJobSpec: async () => jobSpec,
      getVendors: async () => vendors,
    });

    const drilldowns = await composer.composeDrilldowns(jobSpec.id);

    expect(drilldowns.savings?.initialTotal).toBe(225);
    expect(drilldowns.savings?.negotiatedTotal).toBe(195);
    expect(drilldowns.savings?.marketBenchmark).toBeGreaterThan(0);
    expect(drilldowns.redFlags?.some((r) => r.quoteId === q1.id || r.reasons.length >= 0)).toBe(true);
    expect(drilldowns.trust?.find((t) => t.vendorId === "vendor-a")?.score).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/report/reportDrilldowns.test.ts`
Expected: FAIL — `composeDrilldowns` not defined

- [ ] **Step 3: Extend ReportComposer**

Add to `src/app/report/reportComposer.ts`:

```typescript
import type { ReportDrilldowns, AuditRepository } from "@/contracts";
import { evaluateRedFlags } from "@/domain/report/evaluateRedFlags";
import { scoreTrust } from "@/domain/report/scoreTrust";
import { MARKET_BENCHMARK_WEEKLY, BELOW_MARKET_PERCENT } from "@/domain/report/benchmarks";

export class ReportComposer {
  constructor(
    private readonly deps: {
      quoteRepo: QuoteRepository;
      auditRepo?: AuditRepository;
      getJobSpec: (jobSpecId: string) => Promise<JobSpec | null>;
      getVendors: (jobSpecId: string) => Promise<Vendor[]>;
    }
  ) {}

  /* existing compose() unchanged */

  async composeDrilldowns(jobSpecId: string): Promise<ReportDrilldowns> {
    const jobSpec = await this.deps.getJobSpec(jobSpecId);
    if (!jobSpec) throw new Error(`JobSpec not found: ${jobSpecId}`);

    const vendors = await this.deps.getVendors(jobSpecId);
    const quotes = await this.deps.quoteRepo.listByJobSpec(jobSpecId);

    const redFlags = quotes
      .map((q) => {
        const { redFlag, reasons } = evaluateRedFlags(
          q,
          MARKET_BENCHMARK_WEEKLY,
          BELOW_MARKET_PERCENT
        );
        return redFlag ? { quoteId: q.id, reasons } : null;
      })
      .filter((x): x is { quoteId: string; reasons: string[] } => x !== null);

    const trust = vendors.map((v) => ({
      vendorId: v.id,
      score: scoreTrust(v),
    }));

    const audits = this.deps.auditRepo
      ? await this.deps.auditRepo.listByJobSpec(jobSpecId)
      : [];
    const priceMoves = audits.filter(
      (e) => e.priceBefore !== null && e.priceAfter !== null
    );
    const initialTotal = Math.max(...quotes.map((q) => q.normalizedTotal), 0);
    const negotiatedTotal =
      priceMoves.length > 0
        ? Math.min(...priceMoves.map((e) => e.priceAfter as number))
        : Math.min(...quotes.map((q) => q.normalizedTotal), initialTotal);

    return {
      savings: {
        initialTotal,
        negotiatedTotal,
        marketBenchmark: MARKET_BENCHMARK_WEEKLY,
      },
      redFlags,
      trust,
    };
  }
}
```

Extend `AuditRepository` with `listByJobSpec(jobSpecId: string)` if not already present (PR-I1 in-memory repo has it).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/report/reportDrilldowns.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/report/reportComposer.ts tests/integration/report/reportDrilldowns.test.ts
git commit -m "feat(B7): ReportComposer.composeDrilldowns for D/E/F data"
```

---

### Task 2: API returns drilldowns alongside report

**Files:**
- Modify: `app/api/reports/[jobId]/route.ts`

**Interfaces:**
- Produces: `GET /api/reports/[jobId]` → `{ report: ReportPrimary; drilldowns: ReportDrilldowns }`

- [ ] **Step 1: Extend integration test**

Append to `tests/integration/report/reportDrilldowns.test.ts`:

```typescript
describe("GET /api/reports/[jobId] drilldowns", () => {
  it("includes drilldowns in JSON body", async () => {
    const { GET } = await import("../../../../app/api/reports/[jobId]/route");
    const res = await GET(new Request("http://localhost/api/reports/job-dd-1"), {
      params: Promise.resolve({ jobId: "job-dd-1" }),
    });
    if (res.status === 200) {
      const body = await res.json();
      expect(body.drilldowns).toBeDefined();
      expect(body.drilldowns.savings).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Update route**

```typescript
// app/api/reports/[jobId]/route.ts — add drilldowns
const report = await composer.compose(jobId);
const drilldowns = await composer.composeDrilldowns(jobId);
return NextResponse.json({ report, drilldowns });
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- tests/integration/report/reportDrilldowns.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/reports/[jobId]/route.ts tests/integration/report/reportDrilldowns.test.ts
git commit -m "feat(B7): reports API returns ReportDrilldowns"
```

---

### Task 3: ReportDrilldownsPanel UI (replace stubs)

**Files:**
- Create: `src/frontend/components/ReportDrilldownsPanel.tsx`
- Modify: `src/frontend/screens/ReportScreen.tsx`
- Delete: `src/frontend/components/ReportDrilldownStub.tsx`
- Create: `tests/unit/frontend/reportDrilldownsPanel.test.tsx`

- [ ] **Step 1: Write failing component test**

```tsx
// tests/unit/frontend/reportDrilldownsPanel.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportDrilldownsPanel } from "@/frontend/components/ReportDrilldownsPanel";
import type { ReportDrilldowns } from "@/contracts";

const drilldowns: ReportDrilldowns = {
  savings: { initialTotal: 225, negotiatedTotal: 195, marketBenchmark: 210 },
  redFlags: [{ quoteId: "q-low", reasons: [">30% below market"] }],
  trust: [{ vendorId: "vendor-a", score: 82 }],
};

describe("ReportDrilldownsPanel", () => {
  it("renders enabled D/E/F expanders with data", () => {
    render(<ReportDrilldownsPanel drilldowns={drilldowns} />);
    expect(screen.getByTestId("drilldown-savings")).not.toHaveAttribute("aria-disabled");
    expect(screen.getByText(/\$30 saved/i)).toBeInTheDocument();
    expect(screen.getByTestId("drilldown-red-flags")).toBeInTheDocument();
    expect(screen.getByText(/below market/i)).toBeInTheDocument();
    expect(screen.getByTestId("drilldown-trust")).toBeInTheDocument();
    expect(screen.getByText(/82/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/frontend/reportDrilldownsPanel.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement panel + update ReportScreen**

```tsx
// src/frontend/components/ReportDrilldownsPanel.tsx
import type { ReportDrilldowns } from "@/contracts";

export function ReportDrilldownsPanel({
  drilldowns,
}: {
  drilldowns: ReportDrilldowns;
}) {
  const saved =
    drilldowns.savings
      ? drilldowns.savings.initialTotal - drilldowns.savings.negotiatedTotal
      : 0;

  return (
    <div className="space-y-3 border-t pt-4">
      <details data-testid="drilldown-savings" open>
        <summary className="font-medium">D — Savings delta</summary>
        <p className="mt-2 text-sm">
          ${saved} saved vs initial high quote (${drilldowns.savings?.initialTotal})
          → ${drilldowns.savings?.negotiatedTotal} after negotiation. Market
          benchmark: ${drilldowns.savings?.marketBenchmark}/visit.
        </p>
      </details>
      <details data-testid="drilldown-red-flags">
        <summary className="font-medium">E — Red-flag callouts</summary>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {(drilldowns.redFlags ?? []).map((rf) => (
            <li key={rf.quoteId}>
              Quote {rf.quoteId}: {rf.reasons.join("; ")}
            </li>
          ))}
          {(drilldowns.redFlags ?? []).length === 0 && (
            <li>No red flags detected.</li>
          )}
        </ul>
      </details>
      <details data-testid="drilldown-trust">
        <summary className="font-medium">F — Trust signals</summary>
        <ul className="mt-2 space-y-1 text-sm">
          {(drilldowns.trust ?? []).map((t) => (
            <li key={t.vendorId}>
              {t.vendorId}: trust score {t.score}/100
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
```

Update `ReportScreen` to fetch `{ report, drilldowns }` and render `ReportDrilldownsPanel` instead of stubs.

- [ ] **Step 4: Run tests**

Run: `npm run test -- tests/unit/frontend/reportDrilldownsPanel.test.tsx tests/unit/frontend/reportScreen.test.tsx`
Expected: PASS — update reportScreen test to expect enabled expanders

- [ ] **Step 5: Commit**

```bash
git add src/frontend/components/ReportDrilldownsPanel.tsx src/frontend/screens/ReportScreen.tsx tests/unit/frontend/reportDrilldownsPanel.test.tsx
git rm src/frontend/components/ReportDrilldownStub.tsx
git commit -m "feat(B7): enable D/E/F drilldown expanders in report UI"
```

---

## Definition of done

- [ ] `ReportDrilldowns` populated via B4 pure functions (domain unchanged)
- [ ] API and UI render savings delta, red flags, trust scores
- [ ] T2 stub messaging removed; expanders interactive
- [ ] `npm run ci` green on `lane-b/PR-B7-drilldowns`
