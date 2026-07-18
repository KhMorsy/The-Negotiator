# PR-B4 Report Pure Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement pure report domain functions — `normalizeQuote`, `evaluateRedFlags`, `scoreTrust`, `rankQuotes` — with table-driven Vitest coverage for all three pricing models and the >30% below-market red flag rule.

**Architecture:** Each function lives in its own file under `src/domain/report/`, imports only `@/contracts` and vertical config constants. No I/O. Table-driven tests in `tests/unit/domain/report/` assert every branch from fixture rows.

**Tech Stack:** TypeScript · Vitest · Zod-free pure functions

## Global Constraints

- Vertical red-flag threshold: 30% below market (`config/verticals/home_cleaning.json` → `redFlagRules.belowMarketPercent`).
- Domain imports only `src/contracts`.
- Branch naming: `lane-b/PR-B4-report-pure`.
- Depends on: **PR-01** (Quote, Vendor, PricingModel types).

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/domain/report/normalizeQuote.ts` |
| Create | `src/domain/report/evaluateRedFlags.ts` |
| Create | `src/domain/report/scoreTrust.ts` |
| Create | `src/domain/report/rankQuotes.ts` |
| Create | `src/domain/report/benchmarks.ts` |
| Create | `tests/unit/domain/report/normalizeQuote.test.ts` |
| Create | `tests/unit/domain/report/evaluateRedFlags.test.ts` |
| Create | `tests/unit/domain/report/scoreTrust.test.ts` |
| Create | `tests/unit/domain/report/rankQuotes.test.ts` |

---

### Task 1: normalizeQuote for flat / hourly_with_minimum / per_sqft

**Files:**
- Create: `src/domain/report/normalizeQuote.ts`
- Create: `src/domain/report/benchmarks.ts`
- Create: `tests/unit/domain/report/normalizeQuote.test.ts`

**Interfaces:**
- Consumes: `Quote` (may have unset `normalizedTotal`), `JobSpec` (sqft for per_sqft)
- Produces: `normalizeQuote(quote, jobSpec): Quote` with computed `normalizedTotal` including all fees

- [ ] **Step 1: Write the failing table-driven test**

```typescript
import { describe, it, expect } from "vitest";
import { normalizeQuote } from "@/domain/report/normalizeQuote";
import type { Quote, JobSpec } from "@/contracts";

const baseJobSpec: JobSpec = {
  id: "job-1",
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

const cases: Array<{
  name: string;
  quote: Omit<Quote, "normalizedTotal"> & { normalizedTotal?: number };
  expectedTotal: number;
}> = [
  {
    name: "flat includes fees",
    quote: {
      id: "q1",
      callId: "c1",
      jobSpecId: "job-1",
      vendorId: "v1",
      basePrice: 180,
      pricingModel: "flat",
      fees: [{ id: "f1", quoteId: "q1", feeType: "supplies", amount: 20 }],
      redFlag: false,
      round: 1,
    },
    expectedTotal: 200,
  },
  {
    name: "hourly_with_minimum uses minimum hours",
    quote: {
      id: "q2",
      callId: "c2",
      jobSpecId: "job-1",
      vendorId: "v2",
      basePrice: 45,
      pricingModel: "hourly_with_minimum",
      fees: [{ id: "f2", quoteId: "q2", feeType: "trip", amount: 25 }],
      redFlag: false,
      round: 1,
    },
    expectedTotal: 205, // 45 * 4 min hours + 25 trip
  },
  {
    name: "per_sqft multiplies base by sqft",
    quote: {
      id: "q3",
      callId: "c3",
      jobSpecId: "job-1",
      vendorId: "v3",
      basePrice: 0.12,
      pricingModel: "per_sqft",
      fees: [{ id: "f3", quoteId: "q3", feeType: "first_clean_premium", amount: 50 }],
      redFlag: false,
      round: 1,
    },
    expectedTotal: 290, // 0.12 * 2000 + 50
  },
];

describe("normalizeQuote", () => {
  it.each(cases)("$name", ({ quote, expectedTotal }) => {
    const result = normalizeQuote({ ...quote, normalizedTotal: 0 }, baseJobSpec);
    expect(result.normalizedTotal).toBe(expectedTotal);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/report/normalizeQuote.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/domain/report/benchmarks.ts`:

```typescript
/** Demo market benchmark $/visit for recurring weekly 2000 sqft Austin */
export const MARKET_BENCHMARK_WEEKLY = 220;
export const BELOW_MARKET_PERCENT = 30;
export const HOURLY_MINIMUM_HOURS = 4;
```

Create `src/domain/report/normalizeQuote.ts`:

```typescript
import type { JobSpec, Quote } from "@/contracts";
import { HOURLY_MINIMUM_HOURS } from "./benchmarks";

function sumFees(quote: Quote): number {
  return quote.fees.reduce((acc, fee) => acc + fee.amount, 0);
}

export function normalizeQuote(quote: Quote, jobSpec: JobSpec): Quote {
  let baseComponent: number;
  switch (quote.pricingModel) {
    case "flat":
      baseComponent = quote.basePrice;
      break;
    case "hourly_with_minimum":
      baseComponent = quote.basePrice * HOURLY_MINIMUM_HOURS;
      break;
    case "per_sqft":
      baseComponent = quote.basePrice * jobSpec.sqft;
      break;
    default:
      baseComponent = quote.basePrice;
  }
  const normalizedTotal = Math.round((baseComponent + sumFees(quote)) * 100) / 100;
  return { ...quote, normalizedTotal };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/report/normalizeQuote.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domain/report/normalizeQuote.ts src/domain/report/benchmarks.ts tests/unit/domain/report/normalizeQuote.test.ts
git commit -m "feat(B4): normalizeQuote for flat, hourly, per_sqft"
```

---

### Task 2: evaluateRedFlags — >30% below market

**Files:**
- Create: `src/domain/report/evaluateRedFlags.ts`
- Create: `tests/unit/domain/report/evaluateRedFlags.test.ts`

**Interfaces:**
- Consumes: normalized `Quote`, `marketBenchmark: number`, `belowMarketPercent: number`
- Produces: `evaluateRedFlags(quote, marketBenchmark, belowMarketPercent): { redFlag: boolean; reasons: string[] }`

- [ ] **Step 1: Write the failing table-driven test**

```typescript
import { describe, it, expect } from "vitest";
import { evaluateRedFlags } from "@/domain/report/evaluateRedFlags";
import type { Quote } from "@/contracts";
import { MARKET_BENCHMARK_WEEKLY, BELOW_MARKET_PERCENT } from "@/domain/report/benchmarks";

const baseQuote: Quote = {
  id: "q1",
  callId: "c1",
  jobSpecId: "job-1",
  vendorId: "v1",
  basePrice: 180,
  normalizedTotal: 200,
  pricingModel: "flat",
  fees: [],
  redFlag: false,
  round: 1,
};

const cases = [
  { total: 200, expectRed: false, label: "at market" },
  { total: 180, expectRed: false, label: "10% below market" },
  { total: 150, expectRed: true, label: "32% below market triggers red flag" },
  { total: 140, expectRed: true, label: "36% below market" },
];

describe("evaluateRedFlags", () => {
  it.each(cases)("$label", ({ total, expectRed }) => {
    const result = evaluateRedFlags(
      { ...baseQuote, normalizedTotal: total },
      MARKET_BENCHMARK_WEEKLY,
      BELOW_MARKET_PERCENT
    );
    expect(result.redFlag).toBe(expectRed);
    if (expectRed) {
      expect(result.reasons).toContain("more than 30% below market benchmark");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/report/evaluateRedFlags.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Quote } from "@/contracts";

export function evaluateRedFlags(
  quote: Quote,
  marketBenchmark: number,
  belowMarketPercent: number
): { redFlag: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const threshold = marketBenchmark * (1 - belowMarketPercent / 100);
  if (quote.normalizedTotal < threshold) {
    reasons.push("more than 30% below market benchmark");
  }
  if (quote.pricingModel === "hourly_with_minimum" && quote.fees.length === 0) {
    reasons.push("open-ended hourly with no fee breakdown");
  }
  return { redFlag: reasons.length > 0, reasons };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/report/evaluateRedFlags.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domain/report/evaluateRedFlags.ts tests/unit/domain/report/evaluateRedFlags.test.ts
git commit -m "feat(B4): evaluateRedFlags with 30% below market rule"
```

---

### Task 3: scoreTrust from Vendor signals

**Files:**
- Create: `src/domain/report/scoreTrust.ts`
- Create: `tests/unit/domain/report/scoreTrust.test.ts`

**Interfaces:**
- Consumes: `Vendor`
- Produces: `scoreTrust(vendor): number` in range 0–100

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { scoreTrust } from "@/domain/report/scoreTrust";
import type { Vendor } from "@/contracts";

const vendorHigh: Vendor = {
  id: "v1",
  name: "Insured Pro",
  phone: "+1",
  rating: 4.8,
  reviewCount: 500,
  insuredBonded: true,
  hasGuarantee: true,
  source: "fake",
};

const vendorLow: Vendor = {
  id: "v2",
  name: "Risky Clean",
  phone: "+1",
  rating: 3.5,
  reviewCount: 10,
  insuredBonded: false,
  hasGuarantee: false,
  source: "fake",
};

describe("scoreTrust", () => {
  it("scores insured vendor with reviews higher", () => {
    expect(scoreTrust(vendorHigh)).toBeGreaterThan(scoreTrust(vendorLow));
  });

  it("returns value between 0 and 100", () => {
    expect(scoreTrust(vendorHigh)).toBeLessThanOrEqual(100);
    expect(scoreTrust(vendorLow)).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/report/scoreTrust.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Vendor } from "@/contracts";

export function scoreTrust(vendor: Vendor): number {
  let score = vendor.rating * 10; // max ~50
  if (vendor.insuredBonded) score += 20;
  if (vendor.hasGuarantee) score += 10;
  score += Math.min(vendor.reviewCount / 50, 20);
  return Math.min(100, Math.round(score));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/report/scoreTrust.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domain/report/scoreTrust.ts tests/unit/domain/report/scoreTrust.test.ts
git commit -m "feat(B4): scoreTrust from vendor reputation signals"
```

---

### Task 4: rankQuotes — order by value score

**Files:**
- Create: `src/domain/report/rankQuotes.ts`
- Create: `tests/unit/domain/report/rankQuotes.test.ts`

**Interfaces:**
- Consumes: `Quote[]` (normalized, redFlag set), `Record<vendorId, Vendor>`, trust scores
- Produces: `rankQuotes(quotes, vendors): { rankedQuotes: Quote[]; recommendedQuoteId: string }`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { rankQuotes } from "@/domain/report/rankQuotes";
import type { Quote, Vendor } from "@/contracts";

const vendors: Record<string, Vendor> = {
  "vendor-a": {
    id: "vendor-a",
    name: "A",
    phone: "+1",
    rating: 4.5,
    reviewCount: 100,
    insuredBonded: true,
    hasGuarantee: true,
    source: "fake",
  },
  "vendor-b": {
    id: "vendor-b",
    name: "B",
    phone: "+1",
    rating: 3.0,
    reviewCount: 5,
    insuredBonded: false,
    hasGuarantee: false,
    source: "fake",
  },
};

const quotes: Quote[] = [
  {
    id: "qa",
    callId: "c1",
    jobSpecId: "job-1",
    vendorId: "vendor-a",
    basePrice: 210,
    normalizedTotal: 210,
    pricingModel: "flat",
    fees: [],
    redFlag: false,
    round: 1,
  },
  {
    id: "qb",
    callId: "c2",
    jobSpecId: "job-1",
    vendorId: "vendor-b",
    basePrice: 120,
    normalizedTotal: 120,
    pricingModel: "flat",
    fees: [],
    redFlag: true,
    round: 1,
  },
];

describe("rankQuotes", () => {
  it("ranks non-red-flag insured quote first", () => {
    const { rankedQuotes, recommendedQuoteId } = rankQuotes(quotes, vendors);
    expect(rankedQuotes[0].id).toBe("qa");
    expect(recommendedQuoteId).toBe("qa");
  });

  it("deprioritizes red-flag quotes", () => {
    const { rankedQuotes } = rankQuotes(quotes, vendors);
    expect(rankedQuotes[rankedQuotes.length - 1].id).toBe("qb");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/report/rankQuotes.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { Quote, Vendor } from "@/contracts";
import { scoreTrust } from "./scoreTrust";

function compositeScore(quote: Quote, vendor: Vendor): number {
  const trust = scoreTrust(vendor);
  const pricePenalty = quote.normalizedTotal;
  const redFlagPenalty = quote.redFlag ? 1000 : 0;
  return trust * 2 - pricePenalty - redFlagPenalty;
}

export function rankQuotes(
  quotes: Quote[],
  vendors: Record<string, Vendor>
): { rankedQuotes: Quote[]; recommendedQuoteId: string } {
  const rankedQuotes = [...quotes].sort((a, b) => {
    const vendorA = vendors[a.vendorId];
    const vendorB = vendors[b.vendorId];
    return compositeScore(b, vendorB) - compositeScore(a, vendorA);
  });
  return {
    rankedQuotes,
    recommendedQuoteId: rankedQuotes[0]?.id ?? "",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/report/rankQuotes.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domain/report/rankQuotes.ts tests/unit/domain/report/rankQuotes.test.ts
git commit -m "feat(B4): rankQuotes with trust and red-flag deprioritization"
```

---

## Definition of done

- [ ] All four pure functions implemented with no adapter imports
- [ ] Table-driven tests cover flat, hourly_with_minimum, per_sqft normalization
- [ ] Red flag test proves >30% below market (`150` vs benchmark `220`) triggers flag
- [ ] `npm run ci` green on `lane-b/PR-B4-report-pure`
- [ ] Update `docs/architecture/layers/domain.md` report module table
