# PR-A1: DB + Repository Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship in-memory and Supabase-shaped repository adapters for `JobSpecRepository`, `CallRepository`, `QuoteRepository`, and `AuditRepository`, plus a SQL migration documenting the Postgres schema, with shared port contract tests that CI runs against fakes only.

**Architecture:** Lane A implements adapters under `src/adapters/` against ports defined in PR-01. CI uses `src/adapters/fake/inMemoryRepos.ts`; Supabase adapters mirror the same port contracts but are not required in CI. A migration file under `supabase/migrations/001_init.sql` documents the relational schema aligned with the ER model in the architecture spec.

**Tech Stack:** TypeScript · Vitest · Zod (from contracts) · Supabase Postgres (documented schema; no live DB in CI)

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

**Layer docs:** [contracts.md](../../../architecture/layers/contracts.md) · [adapters.md](../../../architecture/layers/adapters.md)

**Branch:** `lane-a/PR-A1-db-repos`

**Depends on:** PR-01 (contracts ports + types must be merged first)

## Global Constraints

- CI uses **only** `src/adapters/fake/**` — no Supabase credentials in GitHub Actions.
- `src/adapters/**` must **not** import `src/domain/**`.
- Canonical type names are locked: `JobSpec`, `Vendor`, `Quote`, `QuoteFee`, `Skill`, `SkillPreconditions`, `AuditEvent`, `CallOutcome`, `CallRound`, `PricingModel`, `JobType`.
- Update [adapters.md](../../../architecture/layers/adapters.md) when this PR merges.

---

## PR-01 port signatures (consume verbatim — do not rename)

These interfaces live in `src/contracts/ports/*.ts` after PR-01. This package **implements** them.

```typescript
// src/contracts/types/call.ts (from PR-01)
export interface Call {
  id: string;
  jobSpecId: string;
  vendorId: string;
  round: CallRound;
  outcome: CallOutcome | null;
  recordingUrl: string | null;
}

// src/contracts/ports/job-spec-repository.ts
export interface JobSpecRepository {
  create(draft: Omit<JobSpec, "id" | "confirmed">): Promise<JobSpec>;
  getById(id: string): Promise<JobSpec | null>;
  confirm(id: string): Promise<JobSpec>;
  updateDraft(
    id: string,
    patch: Partial<Omit<JobSpec, "id" | "confirmed">>
  ): Promise<JobSpec>;
}

// src/contracts/ports/call-repository.ts
export interface CallRepository {
  create(input: {
    jobSpecId: string;
    vendorId: string;
    round: CallRound;
  }): Promise<Call>;
  getById(id: string): Promise<Call | null>;
  updateOutcome(callId: string, outcome: CallOutcome): Promise<Call>;
  listByJobSpec(jobSpecId: string): Promise<Call[]>;
}

// src/contracts/ports/quote-repository.ts
export interface QuoteRepository {
  create(
    input: Omit<Quote, "id" | "fees"> & {
      fees: Omit<QuoteFee, "id" | "quoteId">[];
    }
  ): Promise<Quote>;
  listByJobSpec(jobSpecId: string): Promise<Quote[]>;
  getById(id: string): Promise<Quote | null>;
}

// src/contracts/ports/audit-repository.ts
export interface AuditRepository {
  append(event: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent>;
  listByCall(callId: string): Promise<AuditEvent[]>;
}
```

---

### Task 1: SQL migration (schema documentation)

**Files:**
- Create: `supabase/migrations/001_init.sql`

**Interfaces:**
- Consumes: ER model from [architecture spec](../../../specs/2026-07-18-the-negotiator-architecture.md) §6
- Produces: Postgres DDL matching repository row shapes

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/001_init.sql
-- The Negotiator T1 schema (home_cleaning vertical)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE job_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  sqft INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  frequency TEXT NOT NULL,
  add_ons JSONB NOT NULL DEFAULT '[]'::jsonb,
  supplies_provided BOOLEAN NOT NULL DEFAULT false,
  pets BOOLEAN NOT NULL DEFAULT false,
  access_notes TEXT NOT NULL DEFAULT '',
  condition_notes TEXT NOT NULL DEFAULT '',
  geo TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  leverage_quote_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  rating NUMERIC NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  insured_bonded BOOLEAN NOT NULL DEFAULT false,
  has_guarantee BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL
);

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_spec_id UUID NOT NULL REFERENCES job_specs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  round SMALLINT NOT NULL CHECK (round IN (1, 2)),
  outcome TEXT,
  recording_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  job_spec_id UUID NOT NULL REFERENCES job_specs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  base_price NUMERIC NOT NULL,
  normalized_total NUMERIC NOT NULL,
  pricing_model TEXT NOT NULL,
  red_flag BOOLEAN NOT NULL DEFAULT false,
  round SMALLINT NOT NULL CHECK (round IN (1, 2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quote_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL,
  amount NUMERIC NOT NULL
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  authorizing_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_before NUMERIC,
  price_after NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_job_spec_id ON calls(job_spec_id);
CREATE INDEX idx_quotes_job_spec_id ON quotes(job_spec_id);
CREATE INDEX idx_audit_events_call_id ON audit_events(call_id);
```

- [ ] **Step 2: Verify file exists**

Run: `test -f supabase/migrations/001_init.sql && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_init.sql
git commit -m "docs(db): add Supabase init migration for T1 schema"
```

---

### Task 2: In-memory `JobSpecRepository`

**Files:**
- Create: `src/adapters/fake/inMemoryJobSpecRepository.ts`
- Create: `tests/contracts/ports/job-spec-repository.contract.test.ts`
- Create: `tests/contracts/ports/_fixtures/jobSpecFixtures.ts`

**Interfaces:**
- Consumes: `JobSpecRepository`, `JobSpec` from `src/contracts`
- Produces: `createInMemoryJobSpecRepository(): JobSpecRepository`

- [ ] **Step 1: Write the failing contract test**

```typescript
// tests/contracts/ports/_fixtures/jobSpecFixtures.ts
import type { JobSpec } from "@/contracts";

export const sampleJobSpecDraft: Omit<JobSpec, "id" | "confirmed"> = {
  jobType: "deep_clean",
  sqft: 1200,
  bedrooms: 2,
  bathrooms: 2,
  frequency: "once",
  addOns: ["inside_fridge"],
  suppliesProvided: false,
  pets: true,
  accessNotes: "Gate code 1234",
  conditionNotes: "Kitchen grease buildup",
  geo: "San Francisco, CA",
};
```

```typescript
// tests/contracts/ports/job-spec-repository.contract.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import type { JobSpecRepository } from "@/contracts";
import { sampleJobSpecDraft } from "./_fixtures/jobSpecFixtures";

export function jobSpecRepositoryContract(
  name: string,
  factory: () => JobSpecRepository
) {
  describe(`JobSpecRepository contract: ${name}`, () => {
    let repo: JobSpecRepository;

    beforeEach(() => {
      repo = factory();
    });

    it("create assigns id and confirmed=false", async () => {
      const created = await repo.create(sampleJobSpecDraft);
      expect(created.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(created.confirmed).toBe(false);
      expect(created.sqft).toBe(1200);
    });

    it("getById returns null for missing id", async () => {
      const found = await repo.getById("00000000-0000-4000-8000-000000000000");
      expect(found).toBeNull();
    });

    it("confirm sets confirmed=true", async () => {
      const created = await repo.create(sampleJobSpecDraft);
      const confirmed = await repo.confirm(created.id);
      expect(confirmed.confirmed).toBe(true);
      const reloaded = await repo.getById(created.id);
      expect(reloaded?.confirmed).toBe(true);
    });

    it("updateDraft merges patch", async () => {
      const created = await repo.create(sampleJobSpecDraft);
      const updated = await repo.updateDraft(created.id, { sqft: 1400 });
      expect(updated.sqft).toBe(1400);
      expect(updated.bedrooms).toBe(2);
    });
  });
}

import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryJobSpecRepository";

jobSpecRepositoryContract("in-memory", createInMemoryJobSpecRepository);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/contracts/ports/job-spec-repository.contract.test.ts`
Expected: FAIL with `Cannot find module '@/adapters/fake/inMemoryJobSpecRepository'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/fake/inMemoryJobSpecRepository.ts
import { randomUUID } from "node:crypto";
import type { JobSpec, JobSpecRepository } from "@/contracts";

export function createInMemoryJobSpecRepository(): JobSpecRepository {
  const store = new Map<string, JobSpec>();

  return {
    async create(draft) {
      const jobSpec: JobSpec = { id: randomUUID(), confirmed: false, ...draft };
      store.set(jobSpec.id, jobSpec);
      return jobSpec;
    },

    async getById(id) {
      return store.get(id) ?? null;
    },

    async confirm(id) {
      const existing = store.get(id);
      if (!existing) {
        throw new Error(`JobSpec not found: ${id}`);
      }
      const confirmed: JobSpec = { ...existing, confirmed: true };
      store.set(id, confirmed);
      return confirmed;
    },

    async updateDraft(id, patch) {
      const existing = store.get(id);
      if (!existing) {
        throw new Error(`JobSpec not found: ${id}`);
      }
      const updated: JobSpec = { ...existing, ...patch };
      store.set(id, updated);
      return updated;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/contracts/ports/job-spec-repository.contract.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/inMemoryJobSpecRepository.ts tests/contracts/ports/job-spec-repository.contract.test.ts tests/contracts/ports/_fixtures/jobSpecFixtures.ts
git commit -m "feat(repos): add in-memory JobSpecRepository with contract tests"
```

---

### Task 3: In-memory `CallRepository`

**Files:**
- Create: `src/adapters/fake/inMemoryCallRepository.ts`
- Create: `tests/contracts/ports/call-repository.contract.test.ts`

**Interfaces:**
- Consumes: `CallRepository`, `Call`, `CallOutcome`, `CallRound` from `src/contracts`
- Produces: `createInMemoryCallRepository(): CallRepository`

- [ ] **Step 1: Write the failing contract test**

```typescript
// tests/contracts/ports/call-repository.contract.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import type { CallRepository } from "@/contracts";

export function callRepositoryContract(
  name: string,
  factory: () => CallRepository
) {
  describe(`CallRepository contract: ${name}`, () => {
    let repo: CallRepository;
    const jobSpecId = "11111111-1111-4111-8111-111111111111";
    const vendorId = "22222222-2222-4222-8222-222222222222";

    beforeEach(() => {
      repo = factory();
    });

    it("create returns call with null outcome", async () => {
      const call = await repo.create({ jobSpecId, vendorId, round: 1 });
      expect(call.id).toBeTruthy();
      expect(call.jobSpecId).toBe(jobSpecId);
      expect(call.vendorId).toBe(vendorId);
      expect(call.round).toBe(1);
      expect(call.outcome).toBeNull();
      expect(call.recordingUrl).toBeNull();
    });

    it("updateOutcome persists outcome", async () => {
      const call = await repo.create({ jobSpecId, vendorId, round: 1 });
      const updated = await repo.updateOutcome(call.id, "itemized_quote");
      expect(updated.outcome).toBe("itemized_quote");
    });

    it("listByJobSpec returns calls for job", async () => {
      await repo.create({ jobSpecId, vendorId, round: 1 });
      await repo.create({ jobSpecId, vendorId, round: 2 });
      const other = await repo.create({
        jobSpecId: "33333333-3333-4333-8333-333333333333",
        vendorId,
        round: 1,
      });
      expect(other.jobSpecId).not.toBe(jobSpecId);
      const listed = await repo.listByJobSpec(jobSpecId);
      expect(listed).toHaveLength(2);
    });
  });
}

import { createInMemoryCallRepository } from "@/adapters/fake/inMemoryCallRepository";

callRepositoryContract("in-memory", createInMemoryCallRepository);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/contracts/ports/call-repository.contract.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/fake/inMemoryCallRepository.ts
import { randomUUID } from "node:crypto";
import type { Call, CallRepository } from "@/contracts";

export function createInMemoryCallRepository(): CallRepository {
  const store = new Map<string, Call>();

  return {
    async create({ jobSpecId, vendorId, round }) {
      const call: Call = {
        id: randomUUID(),
        jobSpecId,
        vendorId,
        round,
        outcome: null,
        recordingUrl: null,
      };
      store.set(call.id, call);
      return call;
    },

    async getById(id) {
      return store.get(id) ?? null;
    },

    async updateOutcome(callId, outcome) {
      const existing = store.get(callId);
      if (!existing) {
        throw new Error(`Call not found: ${callId}`);
      }
      const updated: Call = { ...existing, outcome };
      store.set(callId, updated);
      return updated;
    },

    async listByJobSpec(jobSpecId) {
      return [...store.values()].filter((c) => c.jobSpecId === jobSpecId);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/contracts/ports/call-repository.contract.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/inMemoryCallRepository.ts tests/contracts/ports/call-repository.contract.test.ts
git commit -m "feat(repos): add in-memory CallRepository with contract tests"
```

---

### Task 4: In-memory `QuoteRepository` (with nested fees)

**Files:**
- Create: `src/adapters/fake/inMemoryQuoteRepository.ts`
- Create: `tests/contracts/ports/quote-repository.contract.test.ts`

**Interfaces:**
- Consumes: `QuoteRepository`, `Quote`, `QuoteFee`, `PricingModel` from `src/contracts`
- Produces: `createInMemoryQuoteRepository(): QuoteRepository`

- [ ] **Step 1: Write the failing contract test**

```typescript
// tests/contracts/ports/quote-repository.contract.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import type { QuoteRepository } from "@/contracts";

export function quoteRepositoryContract(
  name: string,
  factory: () => QuoteRepository
) {
  describe(`QuoteRepository contract: ${name}`, () => {
    let repo: QuoteRepository;

    beforeEach(() => {
      repo = factory();
    });

    it("create persists quote with generated fee ids", async () => {
      const quote = await repo.create({
        callId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        jobSpecId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        vendorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        basePrice: 200,
        normalizedTotal: 235,
        pricingModel: "flat",
        redFlag: false,
        round: 1,
        fees: [
          { feeType: "trip_fee", amount: 35 },
          { feeType: "supplies", amount: 0 },
        ],
      });

      expect(quote.id).toBeTruthy();
      expect(quote.fees).toHaveLength(2);
      expect(quote.fees[0].quoteId).toBe(quote.id);
      expect(quote.fees[0].id).toBeTruthy();
    });

    it("listByJobSpec filters by jobSpecId", async () => {
      const jobA = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
      const jobB = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

      await repo.create({
        callId: "call-a",
        jobSpecId: jobA,
        vendorId: "vendor-1",
        basePrice: 180,
        normalizedTotal: 180,
        pricingModel: "flat",
        redFlag: false,
        round: 1,
        fees: [],
      });

      await repo.create({
        callId: "call-b",
        jobSpecId: jobB,
        vendorId: "vendor-2",
        basePrice: 190,
        normalizedTotal: 190,
        pricingModel: "flat",
        redFlag: false,
        round: 1,
        fees: [],
      });

      const listed = await repo.listByJobSpec(jobA);
      expect(listed).toHaveLength(1);
      expect(listed[0].jobSpecId).toBe(jobA);
    });
  });
}

import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryQuoteRepository";

quoteRepositoryContract("in-memory", createInMemoryQuoteRepository);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/contracts/ports/quote-repository.contract.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/fake/inMemoryQuoteRepository.ts
import { randomUUID } from "node:crypto";
import type { Quote, QuoteFee, QuoteRepository } from "@/contracts";

export function createInMemoryQuoteRepository(): QuoteRepository {
  const quotes = new Map<string, Quote>();
  const feesByQuote = new Map<string, QuoteFee[]>();

  return {
    async create(input) {
      const quoteId = randomUUID();
      const fees: QuoteFee[] = input.fees.map((fee) => ({
        id: randomUUID(),
        quoteId,
        feeType: fee.feeType,
        amount: fee.amount,
      }));

      const quote: Quote = {
        id: quoteId,
        callId: input.callId,
        jobSpecId: input.jobSpecId,
        vendorId: input.vendorId,
        basePrice: input.basePrice,
        normalizedTotal: input.normalizedTotal,
        pricingModel: input.pricingModel,
        redFlag: input.redFlag,
        round: input.round,
        fees,
      };

      quotes.set(quoteId, quote);
      feesByQuote.set(quoteId, fees);
      return quote;
    },

    async listByJobSpec(jobSpecId) {
      return [...quotes.values()].filter((q) => q.jobSpecId === jobSpecId);
    },

    async getById(id) {
      return quotes.get(id) ?? null;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/contracts/ports/quote-repository.contract.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/inMemoryQuoteRepository.ts tests/contracts/ports/quote-repository.contract.test.ts
git commit -m "feat(repos): add in-memory QuoteRepository with contract tests"
```

---

### Task 5: In-memory `AuditRepository`

**Files:**
- Create: `src/adapters/fake/inMemoryAuditRepository.ts`
- Create: `tests/contracts/ports/audit-repository.contract.test.ts`

**Interfaces:**
- Consumes: `AuditRepository`, `AuditEvent` from `src/contracts`
- Produces: `createInMemoryAuditRepository(): AuditRepository`

- [ ] **Step 1: Write the failing contract test**

```typescript
// tests/contracts/ports/audit-repository.contract.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import type { AuditRepository } from "@/contracts";

export function auditRepositoryContract(
  name: string,
  factory: () => AuditRepository
) {
  describe(`AuditRepository contract: ${name}`, () => {
    let repo: AuditRepository;
    const callId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

    beforeEach(() => {
      repo = factory();
    });

    it("append assigns id and ISO createdAt", async () => {
      const event = await repo.append({
        callId,
        skillId: "challenge_trip_fee",
        authorizingEvidence: { feeMentioned: "trip fee $35" },
        priceBefore: 235,
        priceAfter: null,
      });

      expect(event.id).toBeTruthy();
      expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.skillId).toBe("challenge_trip_fee");
    });

    it("listByCall returns events in append order", async () => {
      await repo.append({
        callId,
        skillId: "skill_a",
        authorizingEvidence: {},
        priceBefore: 200,
        priceAfter: null,
      });
      await repo.append({
        callId,
        skillId: "skill_b",
        authorizingEvidence: {},
        priceBefore: 200,
        priceAfter: 180,
      });

      const listed = await repo.listByCall(callId);
      expect(listed).toHaveLength(2);
      expect(listed[0].skillId).toBe("skill_a");
      expect(listed[1].skillId).toBe("skill_b");
    });
  });
}

import { createInMemoryAuditRepository } from "@/adapters/fake/inMemoryAuditRepository";

auditRepositoryContract("in-memory", createInMemoryAuditRepository);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/contracts/ports/audit-repository.contract.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/fake/inMemoryAuditRepository.ts
import { randomUUID } from "node:crypto";
import type { AuditEvent, AuditRepository } from "@/contracts";

export function createInMemoryAuditRepository(): AuditRepository {
  const events: AuditEvent[] = [];

  return {
    async append(input) {
      const event: AuditEvent = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        ...input,
      };
      events.push(event);
      return event;
    },

    async listByCall(callId) {
      return events.filter((e) => e.callId === callId);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/contracts/ports/audit-repository.contract.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/inMemoryAuditRepository.ts tests/contracts/ports/audit-repository.contract.test.ts
git commit -m "feat(repos): add in-memory AuditRepository with contract tests"
```

---

### Task 6: Unified fake factory + Supabase-shaped stubs

**Files:**
- Create: `src/adapters/fake/inMemoryRepos.ts`
- Create: `src/adapters/persistence/supabase/supabaseJobSpecRepository.ts`
- Create: `src/adapters/persistence/supabase/supabaseCallRepository.ts`
- Create: `src/adapters/persistence/supabase/supabaseQuoteRepository.ts`
- Create: `src/adapters/persistence/supabase/supabaseAuditRepository.ts`
- Create: `src/adapters/persistence/supabase/types.ts`
- Modify: `docs/architecture/layers/adapters.md`

**Interfaces:**
- Consumes: all four repository ports
- Produces:
  - `createInMemoryRepos(): { jobSpecs: JobSpecRepository; calls: CallRepository; quotes: QuoteRepository; audit: AuditRepository }`
  - `createSupabaseJobSpecRepository(client: SupabaseClient): JobSpecRepository` (and siblings)

- [ ] **Step 1: Write failing import test for unified factory**

```typescript
// tests/unit/adapters/inMemoryRepos.test.ts
import { describe, it, expect } from "vitest";
import { createInMemoryRepos } from "@/adapters/fake/inMemoryRepos";

describe("createInMemoryRepos", () => {
  it("returns all four repository ports", () => {
    const repos = createInMemoryRepos();
    expect(repos.jobSpecs).toBeDefined();
    expect(repos.calls).toBeDefined();
    expect(repos.quotes).toBeDefined();
    expect(repos.audit).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/inMemoryRepos.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal unified factory**

```typescript
// src/adapters/fake/inMemoryRepos.ts
import { createInMemoryAuditRepository } from "./inMemoryAuditRepository";
import { createInMemoryCallRepository } from "./inMemoryCallRepository";
import { createInMemoryJobSpecRepository } from "./inMemoryJobSpecRepository";
import { createInMemoryQuoteRepository } from "./inMemoryQuoteRepository";

export function createInMemoryRepos() {
  return {
    jobSpecs: createInMemoryJobSpecRepository(),
    calls: createInMemoryCallRepository(),
    quotes: createInMemoryQuoteRepository(),
    audit: createInMemoryAuditRepository(),
  };
}

export {
  createInMemoryAuditRepository,
  createInMemoryCallRepository,
  createInMemoryJobSpecRepository,
  createInMemoryQuoteRepository,
};
```

- [ ] **Step 4: Add Supabase-shaped adapters (no network — map rows ↔ domain types)**

```typescript
// src/adapters/persistence/supabase/types.ts
import type {
  AuditEvent,
  Call,
  JobSpec,
  Quote,
  QuoteFee,
} from "@/contracts";

export interface SupabaseClient {
  from(table: string): {
    insert(row: Record<string, unknown>): PromiseLike<{ data: unknown; error: Error | null }>;
    select(cols?: string): {
      eq(col: string, val: unknown): {
        single(): PromiseLike<{ data: unknown; error: Error | null }>;
        order(col: string, opts: { ascending: boolean }): PromiseLike<{ data: unknown; error: Error | null }>;
      };
    };
    update(row: Record<string, unknown>): {
      eq(col: string, val: unknown): PromiseLike<{ data: unknown; error: Error | null }>;
    };
  };
}

export function mapJobSpecRow(row: Record<string, unknown>): JobSpec {
  return {
    id: String(row.id),
    jobType: row.job_type as JobSpec["jobType"],
    sqft: Number(row.sqft),
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    frequency: row.frequency as JobSpec["frequency"],
    addOns: row.add_ons as string[],
    suppliesProvided: Boolean(row.supplies_provided),
    pets: Boolean(row.pets),
    accessNotes: String(row.access_notes ?? ""),
    conditionNotes: String(row.condition_notes ?? ""),
    geo: String(row.geo),
    confirmed: Boolean(row.confirmed),
    leverageQuoteAmount:
      row.leverage_quote_amount == null ? undefined : Number(row.leverage_quote_amount),
  };
}

export function mapCallRow(row: Record<string, unknown>): Call {
  return {
    id: String(row.id),
    jobSpecId: String(row.job_spec_id),
    vendorId: String(row.vendor_id),
    round: Number(row.round) as Call["round"],
    outcome: (row.outcome as Call["outcome"]) ?? null,
    recordingUrl: row.recording_url == null ? null : String(row.recording_url),
  };
}

export function mapQuoteRow(
  row: Record<string, unknown>,
  fees: QuoteFee[]
): Quote {
  return {
    id: String(row.id),
    callId: String(row.call_id),
    jobSpecId: String(row.job_spec_id),
    vendorId: String(row.vendor_id),
    basePrice: Number(row.base_price),
    normalizedTotal: Number(row.normalized_total),
    pricingModel: row.pricing_model as Quote["pricingModel"],
    redFlag: Boolean(row.red_flag),
    round: Number(row.round) as Quote["round"],
    fees,
  };
}

export function mapAuditRow(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id),
    callId: String(row.call_id),
    skillId: String(row.skill_id),
    authorizingEvidence: row.authorizing_evidence as Record<string, unknown>,
    priceBefore: row.price_before == null ? null : Number(row.price_before),
    priceAfter: row.price_after == null ? null : Number(row.price_after),
    createdAt: String(row.created_at),
  };
}
```

Implement each `createSupabase*Repository(client)` by calling `client.from("<table>")` with snake_case columns matching `001_init.sql`. Throw `new Error(error.message)` when Supabase returns an error. Re-use the same contract test factories by passing a mock `SupabaseClient` in unit tests under `tests/unit/adapters/supabase/` (one test per repo verifying insert/select mapping).

- [ ] **Step 5: Run full contract suite**

Run: `npm run test -- tests/contracts/ports/`
Expected: PASS for all four repository contract files

- [ ] **Step 6: Update adapters layer doc**

Add rows to the repository section in `docs/architecture/layers/adapters.md` listing:
- `src/adapters/fake/inMemoryRepos.ts`
- `src/adapters/persistence/supabase/*.ts`
- `supabase/migrations/001_init.sql`

- [ ] **Step 7: Commit**

```bash
git add src/adapters/fake/inMemoryRepos.ts src/adapters/persistence/supabase/ tests/unit/adapters/ docs/architecture/layers/adapters.md
git commit -m "feat(repos): add unified in-memory factory and Supabase-shaped adapters"
```

---

## PR completion checklist

- [ ] `npm run ci` green on branch `lane-a/PR-A1-db-repos`
- [ ] All four port contract suites pass against in-memory adapters
- [ ] No `src/domain` imports in `src/adapters/**`
- [ ] Migration file matches repository field names
- [ ] Layer doc updated
