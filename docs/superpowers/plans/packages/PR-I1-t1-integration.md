# PR-I1 T1 Integration Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the full T1 walking skeleton — composition root with all fake adapters, `SimulatedCallAdapter` with three vendor personas, two-round `CallOrchestrator`, and Playwright e2e proving confirm → negotiate → audit price drop → report recommendation.

**Architecture:** `createContainer.ts` is the sole adapter import site. `SimulatedCallAdapter` implements `TelephonyProvider` and drives scripted transcripts for tough, lowball, and upseller personas. `CallOrchestrator` runs round 1 (gather quotes) then round 2 (callback with leverage), appending `AuditEvent` rows when `priceAfter < priceBefore`. E2e hits real HTTP routes end-to-end.

**Tech Stack:** Next.js 15 · Vitest integration · Playwright · TypeScript

## Global Constraints

- CI: **no vendor secrets**; all CI tests use `src/adapters/fake/**`.
- T1 gate must pass before any T2 work (PR-A6+).
- Branch naming: `integration/PR-I1-t1-integration`.
- Depends on: **PR-A5** (webhooks/skill engine), **PR-B3** (confirm guard), **PR-B5** (report composer).

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/app/composition/createContainer.ts` |
| Create | `src/adapters/fake/simulatedTelephony.ts` |
| Create | `src/adapters/fake/fakeVendorDirectory.ts` |
| Create | `src/adapters/fake/inMemoryAuditRepo.ts` |
| Create | `src/adapters/fake/inMemoryCallRepo.ts` |
| Expand | `src/app/calls/callOrchestrator.ts` |
| Create | `app/api/calls/[jobId]/start/route.ts` |
| Create | `app/api/audit/[jobId]/route.ts` |
| Create | `tests/integration/t1/twoRoundFlow.test.ts` |
| Create | `tests/e2e/t1-happy-path.spec.ts` |
| Modify | `docs/architecture/layers/application.md` |
| Modify | `docs/architecture/layers/adapters.md` |

---

### Task 1: SimulatedCallAdapter with three vendor personas

**Files:**
- Create: `src/adapters/fake/simulatedTelephony.ts`

**Interfaces:**
- Consumes: `TelephonyProvider` port
- Produces: `createSimulatedCallAdapter()` with personas `tough`, `lowball`, `upseller` keyed by `vendorId`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/adapters/simulatedTelephony.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";

describe("createSimulatedCallAdapter", () => {
  it("starts call and simulates round-2 price drop for tough vendor", async () => {
    const telephony = createSimulatedCallAdapter();
    const { callId } = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-tough",
      round: 1,
    });
    expect(callId).toMatch(/^sim-call-/);

    await telephony.simulateQuoteExtracted(callId, {
      basePrice: 210,
      normalizedTotal: 225,
      pricingModel: "flat",
    });

    const r2 = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-tough",
      round: 2,
    });
    const negotiation = await telephony.simulateNegotiationOutcome(r2.callId);
    expect(negotiation.priceBefore).toBe(225);
    expect(negotiation.priceAfter).toBeLessThan(225);
  });

  it("lowball persona has hidden fees red-flag pattern", async () => {
    const telephony = createSimulatedCallAdapter();
    const { callId } = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-lowball",
      round: 1,
    });
    const quote = await telephony.simulateQuoteExtracted(callId, {
      basePrice: 99,
      normalizedTotal: 99,
      pricingModel: "hourly_with_minimum",
    });
    expect(quote.pricingModel).toBe("hourly_with_minimum");
  });

  it("upseller persona returns higher base on round 1", async () => {
    const telephony = createSimulatedCallAdapter();
    const { callId } = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-upseller",
      round: 1,
    });
    const quote = await telephony.simulateQuoteExtracted(callId, {
      basePrice: 0.14,
      normalizedTotal: 330,
      pricingModel: "per_sqft",
    });
    expect(quote.normalizedTotal).toBeGreaterThan(250);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/simulatedTelephony.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { TelephonyProvider, PricingModel } from "@/contracts";

type SimulatedQuote = {
  basePrice: number;
  normalizedTotal: number;
  pricingModel: PricingModel;
};

type Persona = {
  round1Total: number;
  round2Total: number;
  pricingModel: PricingModel;
  basePrice: number;
};

const PERSONAS: Record<string, Persona> = {
  "vendor-tough": {
    round1Total: 225,
    round2Total: 195,
    pricingModel: "flat",
    basePrice: 210,
  },
  "vendor-lowball": {
    round1Total: 155,
    round2Total: 140,
    pricingModel: "hourly_with_minimum",
    basePrice: 45,
  },
  "vendor-upseller": {
    round1Total: 330,
    round2Total: 295,
    pricingModel: "per_sqft",
    basePrice: 0.14,
  },
};

export type SimulatedCallAdapter = TelephonyProvider & {
  simulateQuoteExtracted: (callId: string, quote: SimulatedQuote) => Promise<SimulatedQuote>;
  simulateNegotiationOutcome: (callId: string) => Promise<{
    priceBefore: number;
    priceAfter: number;
    skillId: string;
  }>;
};

export function createSimulatedCallAdapter(): SimulatedCallAdapter {
  const calls = new Map<
    string,
    { vendorId: string; round: 1 | 2; jobSpecId: string; quote?: SimulatedQuote }
  >();
  let seq = 0;

  return {
    async startCall(input) {
      const callId = `sim-call-${++seq}`;
      calls.set(callId, {
        vendorId: input.vendorId,
        round: input.round,
        jobSpecId: input.jobSpecId,
      });
      return { callId };
    },
    async endCall(callId) {
      calls.delete(callId);
    },
    async simulateQuoteExtracted(callId, quote) {
      const call = calls.get(callId);
      if (!call) throw new Error(`Unknown call: ${callId}`);
      const persona = PERSONAS[call.vendorId];
      const resolved = persona
        ? {
            basePrice: persona.basePrice,
            normalizedTotal: persona.round1Total,
            pricingModel: persona.pricingModel,
          }
        : quote;
      call.quote = resolved;
      return resolved;
    },
    async simulateNegotiationOutcome(callId) {
      const call = calls.get(callId);
      if (!call) throw new Error(`Unknown call: ${callId}`);
      const persona = PERSONAS[call.vendorId] ?? {
        round1Total: 200,
        round2Total: 180,
        pricingModel: "flat" as const,
        basePrice: 200,
      };
      return {
        priceBefore: persona.round1Total,
        priceAfter: persona.round2Total,
        skillId: "leverage_competing_bid",
      };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/simulatedTelephony.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/simulatedTelephony.ts tests/unit/adapters/simulatedTelephony.test.ts
git commit -m "feat(I1): SimulatedCallAdapter with tough, lowball, upseller personas"
```

---

### Task 2: Composition root wires all fakes

**Files:**
- Create: `src/app/composition/createContainer.ts`
- Create: `src/adapters/fake/fakeVendorDirectory.ts`
- Create: `src/adapters/fake/inMemoryAuditRepo.ts`
- Create: `src/adapters/fake/inMemoryCallRepo.ts`

**Interfaces:**
- Consumes: all fake adapters + orchestrators
- Produces: `createContainer(): Container` with `{ intakeOrchestrator, callOrchestrator, reportComposer, repos }`

- [ ] **Step 1: Write the failing test**

Create `tests/integration/t1/container.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createContainer } from "@/app/composition/createContainer";

describe("createContainer", () => {
  it("wires fake adapters without throwing", () => {
    const c = createContainer();
    expect(c.intakeOrchestrator).toBeDefined();
    expect(c.callOrchestrator).toBeDefined();
    expect(c.reportComposer).toBeDefined();
    expect(c.telephony).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/t1/container.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

`src/adapters/fake/fakeVendorDirectory.ts`:

```typescript
import type { VendorDirectory, Vendor } from "@/contracts";

const DEMO_VENDORS: Vendor[] = [
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

export function createFakeVendorDirectory(): VendorDirectory {
  return {
    async findVendors() {
      return DEMO_VENDORS;
    },
  };
}
```

`src/adapters/fake/inMemoryAuditRepo.ts`:

```typescript
import type { AuditEvent, AuditRepository } from "@/contracts";
import { randomUUID } from "node:crypto";

export function createInMemoryAuditRepository(): AuditRepository {
  const events: AuditEvent[] = [];
  return {
    async append(event: Omit<AuditEvent, "id" | "createdAt">) {
      const row: AuditEvent = {
        ...event,
        id: randomUUID(),
        createdAt: new Date().toISOISOString(),
      };
      events.push(row);
      return row;
    },
    async listByCall(callId: string) {
      return events.filter((e) => e.callId === callId);
    },
    async listByJobSpec(jobSpecId: string) {
      return events.filter((e) =>
        e.authorizingEvidence.jobSpecId === jobSpecId
      );
    },
  };
}
```

`src/adapters/fake/inMemoryCallRepo.ts`:

```typescript
import type { CallRepository } from "@/contracts";
import { randomUUID } from "node:crypto";

type CallRow = {
  id: string;
  jobSpecId: string;
  vendorId: string;
  round: 1 | 2;
  outcome?: string;
};

export function createInMemoryCallRepository(): CallRepository {
  const store = new Map<string, CallRow>();
  return {
    async create(input: Omit<CallRow, "id">) {
      const row = { ...input, id: randomUUID() };
      store.set(row.id, row);
      return row;
    },
    async getById(id: string) {
      return store.get(id) ?? null;
    },
    async updateOutcome(id: string, outcome: string) {
      const row = store.get(id);
      if (!row) throw new Error(`Call not found: ${id}`);
      const updated = { ...row, outcome };
      store.set(id, updated);
      return updated;
    },
    async listByJobSpec(jobSpecId: string) {
      return [...store.values()].filter((c) => c.jobSpecId === jobSpecId);
    },
  };
}
```

`src/app/composition/createContainer.ts`:

```typescript
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";
import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryQuoteRepo";
import { createInMemoryAuditRepository } from "@/adapters/fake/inMemoryAuditRepo";
import { createInMemoryCallRepository } from "@/adapters/fake/inMemoryCallRepo";
import { createFakeVendorDirectory } from "@/adapters/fake/fakeVendorDirectory";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";
import { DocumentParserService } from "@/app/intake/documentParserService";
import { IntakeOrchestrator } from "@/app/intake/intakeOrchestrator";
import { CallOrchestrator } from "@/app/calls/callOrchestrator";
import { ReportComposer } from "@/app/report/reportComposer";

let singleton: ReturnType<typeof buildContainer> | null = null;

function buildContainer() {
  const jobSpecRepo = createInMemoryJobSpecRepository();
  const quoteRepo = createInMemoryQuoteRepository();
  const auditRepo = createInMemoryAuditRepository();
  const callRepo = createInMemoryCallRepository();
  const telephony = createSimulatedCallAdapter();
  const vendorDirectory = createFakeVendorDirectory();

  const intakeOrchestrator = new IntakeOrchestrator({
    speechAgent: createFakeSpeechAgent(),
    jobSpecRepo,
    documentParserService: new DocumentParserService(createFakeDocumentParser()),
  });

  const callOrchestrator = new CallOrchestrator({
    jobSpecRepo,
    quoteRepo,
    auditRepo,
    callRepo,
    telephony,
    vendorDirectory,
  });

  const reportComposer = new ReportComposer({
    quoteRepo,
    getJobSpec: (id) => jobSpecRepo.getById(id),
    getVendors: async () => vendorDirectory.findVendors({ geo: "Austin, TX", jobType: "recurring_weekly", limit: 10 }),
  });

  return {
    jobSpecRepo,
    quoteRepo,
    auditRepo,
    telephony,
    intakeOrchestrator,
    callOrchestrator,
    reportComposer,
  };
}

export function createContainer() {
  if (!singleton) singleton = buildContainer();
  return singleton;
}

export function resetContainerForTests() {
  singleton = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/t1/container.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/composition/createContainer.ts src/adapters/fake/fakeVendorDirectory.ts src/adapters/fake/inMemoryAuditRepo.ts src/adapters/fake/inMemoryCallRepo.ts tests/integration/t1/container.test.ts
git commit -m "feat(I1): composition root wiring all fake adapters"
```

---

### Task 3: CallOrchestrator two-round flow with audit logging

**Files:**
- Expand: `src/app/calls/callOrchestrator.ts`
- Create: `app/api/calls/[jobId]/start/route.ts`
- Create: `app/api/audit/[jobId]/route.ts`
- Create: `tests/integration/t1/twoRoundFlow.test.ts`

**Interfaces:**
- Consumes: `TelephonyProvider`, `VendorDirectory`, repos, confirmed `JobSpec`
- Produces:
  - `CallOrchestrator.runFullNegotiation(jobSpecId): Promise<{ callIds; auditEvents }>`
  - Audit rows where `priceAfter < priceBefore` on round 2

- [ ] **Step 1: Write the failing integration test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, resetContainerForTests } from "@/app/composition/createContainer";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";

describe("T1 two-round negotiation flow", () => {
  beforeEach(() => resetContainerForTests());

  it("round 2 produces audit event with priceAfter less than priceBefore", async () => {
    const c = createContainer();
    const draft = buildJobSpec(
      { sqft: 2000, bedrooms: 3, bathrooms: 2, pets: true },
      { leverageQuoteAmount: 185 },
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
    );
    const jobSpec = await c.jobSpecRepo.create(draft);
    await c.jobSpecRepo.confirm(jobSpec.id);

    const result = await c.callOrchestrator.runFullNegotiation(jobSpec.id);
    expect(result.callIds.length).toBeGreaterThanOrEqual(3);

    const audits = await c.auditRepo.listByJobSpec(jobSpec.id);
    const priceMoves = audits.filter(
      (e) =>
        e.priceBefore !== null &&
        e.priceAfter !== null &&
        (e.priceAfter as number) < (e.priceBefore as number)
    );
    expect(priceMoves.length).toBeGreaterThanOrEqual(1);

    const report = await c.reportComposer.compose(jobSpec.id);
    expect(report.recommendedQuoteId).toBeTruthy();
    expect(report.rankedQuotes.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/t1/twoRoundFlow.test.ts`
Expected: FAIL — `runFullNegotiation` not defined

- [ ] **Step 3: Write minimal implementation**

Replace/expand `src/app/calls/callOrchestrator.ts`:

```typescript
import type {
  AuditRepository,
  CallRepository,
  JobSpecRepository,
  QuoteRepository,
  VendorDirectory,
} from "@/contracts";
import type { SimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";
import { normalizeQuote } from "@/domain/report/normalizeQuote";
import { evaluateRedFlags } from "@/domain/report/evaluateRedFlags";
import { MARKET_BENCHMARK_WEEKLY, BELOW_MARKET_PERCENT } from "@/domain/report/benchmarks";

export class UnconfirmedJobSpecError extends Error {
  constructor(jobSpecId: string) {
    super(`JobSpec ${jobSpecId} must be confirmed before calls`);
    this.name = "UnconfirmedJobSpecError";
  }
}

export class CallOrchestrator {
  constructor(
    private readonly deps: {
      jobSpecRepo: JobSpecRepository;
      quoteRepo: QuoteRepository;
      auditRepo: AuditRepository;
      callRepo: CallRepository;
      telephony: SimulatedCallAdapter;
      vendorDirectory: VendorDirectory;
    }
  ) {}

  async startRound1(jobSpecId: string) {
    const jobSpec = await this.requireConfirmed(jobSpecId);
    const vendors = await this.deps.vendorDirectory.findVendors({
      geo: jobSpec.geo,
      jobType: jobSpec.jobType,
      limit: 3,
    });
    const callIds: string[] = [];
    for (const vendor of vendors) {
      const { callId } = await this.deps.telephony.startCall({
        jobSpecId,
        vendorId: vendor.id,
        round: 1,
      });
      await this.deps.callRepo.create({
        id: callId,
        jobSpecId,
        vendorId: vendor.id,
        round: 1,
      });
      const extracted = await this.deps.telephony.simulateQuoteExtracted(callId, {
        basePrice: 200,
        normalizedTotal: 200,
        pricingModel: "flat",
      });
      const normalized = normalizeQuote(
        {
          id: callId,
          callId,
          jobSpecId,
          vendorId: vendor.id,
          basePrice: extracted.basePrice,
          normalizedTotal: extracted.normalizedTotal,
          pricingModel: extracted.pricingModel,
          fees: [],
          redFlag: false,
          round: 1,
        },
        jobSpec
      );
      const { redFlag } = evaluateRedFlags(
        normalized,
        MARKET_BENCHMARK_WEEKLY,
        BELOW_MARKET_PERCENT
      );
      await this.deps.quoteRepo.create({ ...normalized, redFlag });
      callIds.push(callId);
      await this.deps.telephony.endCall(callId);
    }
    return { callIds };
  }

  async runRound2(jobSpecId: string, topVendorIds: string[]) {
    const jobSpec = await this.requireConfirmed(jobSpecId);
    const auditEvents = [];
    for (const vendorId of topVendorIds.slice(0, 2)) {
      const { callId } = await this.deps.telephony.startCall({
        jobSpecId,
        vendorId,
        round: 2,
      });
      const outcome = await this.deps.telephony.simulateNegotiationOutcome(callId);
      const event = await this.deps.auditRepo.append({
        callId,
        skillId: outcome.skillId,
        authorizingEvidence: {
          jobSpecId,
          leverageQuoteAmount: jobSpec.leverageQuoteAmount,
        },
        priceBefore: outcome.priceBefore,
        priceAfter: outcome.priceAfter,
      });
      auditEvents.push(event);
      await this.deps.telephony.endCall(callId);
    }
    return { auditEvents };
  }

  async runFullNegotiation(jobSpecId: string) {
    const round1 = await this.startRound1(jobSpecId);
    const quotes = await this.deps.quoteRepo.listByJobSpec(jobSpecId);
    const sorted = [...quotes].sort((a, b) => a.normalizedTotal - b.normalizedTotal);
    const topVendorIds = sorted.slice(0, 2).map((q) => q.vendorId);
    const round2 = await this.runRound2(jobSpecId, topVendorIds);
    return {
      callIds: round1.callIds,
      auditEvents: round2.auditEvents,
    };
  }

  private async requireConfirmed(jobSpecId: string) {
    const jobSpec = await this.deps.jobSpecRepo.getById(jobSpecId);
    if (!jobSpec) throw new Error(`JobSpec not found: ${jobSpecId}`);
    if (!jobSpec.confirmed) throw new UnconfirmedJobSpecError(jobSpecId);
    return jobSpec;
  }
}
```

API routes:

`app/api/calls/[jobId]/start/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { callOrchestrator } = createContainer();
  try {
    const result = await callOrchestrator.runFullNegotiation(jobId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    const status = message.includes("confirmed") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
```

`app/api/audit/[jobId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { auditRepo } = createContainer();
  const events = await auditRepo.listByJobSpec(jobId);
  return NextResponse.json({ auditEvents: events });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/t1/twoRoundFlow.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/calls/callOrchestrator.ts app/api/calls app/api/audit tests/integration/t1/twoRoundFlow.test.ts
git commit -m "feat(I1): two-round CallOrchestrator with audit price moves"
```

---

### Task 4: Playwright T1 e2e happy path

**Files:**
- Create: `tests/e2e/t1-happy-path.spec.ts`

**Interfaces:**
- Consumes: all `/api/*` routes wired through composition root
- Produces: e2e proving confirm → negotiate → audit price drop → report recommendation

- [ ] **Step 1: Write the failing e2e test**

```typescript
import { test, expect } from "@playwright/test";

test("T1 gate: confirm, negotiate, audit price drop, report recommendation", async ({
  page,
  request,
}) => {
  const startRes = await request.post("/api/intake/start", {
    data: { geo: "Austin, TX" },
  });
  expect(startRes.ok()).toBeTruthy();
  const { jobSpecId, sessionId } = await startRes.json();

  await request.post("/api/intake/sync-voice", {
    data: { jobSpecId, sessionId },
  }).catch(() => {
    /* optional route; orchestrator may sync inline */
  });

  const confirmRes = await request.post(`/api/job-specs/${jobSpecId}/confirm`);
  expect(confirmRes.ok()).toBeTruthy();

  const callsRes = await request.post(`/api/calls/${jobSpecId}/start`);
  expect(callsRes.ok()).toBeTruthy();

  const auditRes = await request.get(`/api/audit/${jobSpecId}`);
  expect(auditRes.ok()).toBeTruthy();
  const { auditEvents } = await auditRes.json();
  const moved = auditEvents.some(
    (e: { priceBefore: number | null; priceAfter: number | null }) =>
      e.priceBefore !== null &&
      e.priceAfter !== null &&
      e.priceAfter < e.priceBefore
  );
  expect(moved).toBe(true);

  await page.goto(`/report/${jobSpecId}`);
  await expect(page.getByTestId("report-recommendation")).toBeVisible();
  await expect(page.getByText(/Recommended/i)).toBeVisible();
});
```

Add optional sync route `app/api/intake/sync-voice/route.ts` if not present:

```typescript
import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function POST(req: Request) {
  const { jobSpecId, sessionId } = await req.json();
  const { intakeOrchestrator } = createContainer();
  const jobSpec = await intakeOrchestrator.syncVoiceTranscript(jobSpecId, sessionId);
  return NextResponse.json({ jobSpec });
}
```

Refactor existing intake routes to use `createContainer()` instead of local singletons.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && npm run test:e2e -- tests/e2e/t1-happy-path.spec.ts`
Expected: FAIL — audit empty or report missing recommendation

- [ ] **Step 3: Wire all API routes to composition root and fix failures until green**

Update:
- `app/api/intake/start/route.ts` → `createContainer().intakeOrchestrator`
- `app/api/intake/upload-quote/route.ts` → same
- `app/api/job-specs/[id]/confirm/route.ts` → `createContainer().jobSpecRepo`
- `app/api/reports/[jobId]/route.ts` → `createContainer().reportComposer`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run ci && npm run test:e2e -- tests/e2e/t1-happy-path.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/t1-happy-path.spec.ts app/api
git commit -m "feat(I1): T1 e2e happy path through simulated negotiation"
```

---

### Task 5: Update architecture layer docs

**Files:**
- Modify: `docs/architecture/layers/application.md`
- Modify: `docs/architecture/layers/adapters.md`

- [ ] **Step 1: Update application.md**

Add under Key modules:

```markdown
| T1 composition root | `src/app/composition/createContainer.ts` |
| Full negotiation API | `POST /api/calls/[jobId]/start` → `CallOrchestrator.runFullNegotiation` |
| Audit read API | `GET /api/audit/[jobId]` |
```

Add under Testing rules:

```markdown
- T1 gate integration test: `tests/integration/t1/twoRoundFlow.test.ts`
- T1 gate e2e: `tests/e2e/t1-happy-path.spec.ts`
```

- [ ] **Step 2: Update adapters.md**

Replace fake telephony row note:

```markdown
| `TelephonyProvider` | `src/adapters/telephony/twilioElevenLabs.ts` | `src/adapters/fake/simulatedTelephony.ts` — personas: `vendor-tough`, `vendor-lowball`, `vendor-upseller` |
```

Add:

```markdown
| `AuditRepository` (fake) | — | `src/adapters/fake/inMemoryAuditRepo.ts` |
| `CallRepository` (fake) | — | `src/adapters/fake/inMemoryCallRepo.ts` |
```

- [ ] **Step 3: Run docs freshness**

Run: `npm run docs:check`
Expected: PASS — layer docs timestamp matches changed `src/app/composition/**` and `src/adapters/fake/**`

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/layers/application.md docs/architecture/layers/adapters.md
git commit -m "docs(I1): document T1 composition root and simulated telephony"
```

---

## T1 gate checklist (must all pass)

- [ ] Create job via intake API (fake speech + fake doc parse)
- [ ] Confirm job spec (`confirmed: true`)
- [ ] Run round-1 simulated calls for ≥3 vendor personas (tough, lowball, upseller)
- [ ] Round-2 callback produces `priceAfter < priceBefore` on ≥1 `AuditEvent`
- [ ] Report page shows ranked quotes + recommendation
- [ ] Audit entries visible via `GET /api/audit/[jobId]`
- [ ] `npm run ci` green on `integration/PR-I1-t1-integration`

---

## Definition of done

- [ ] `createContainer.ts` is sole adapter wiring point
- [ ] `SimulatedCallAdapter` implements `TelephonyProvider` with 3 personas
- [ ] Two-round `CallOrchestrator` with audit logging
- [ ] Playwright T1 e2e green
- [ ] Layer docs updated
- [ ] No T2 work starts until this PR merges
