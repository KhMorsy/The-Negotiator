# PR-01: Contracts — types, Zod schemas, ports, vertical config

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans. Follow steps with checkbox tracking.

**Goal:** Lock the shared TypeScript types, Zod schemas, port interfaces, and `home_cleaning` vertical config so Lane A and Lane B can implement in parallel without signature drift.

**Architecture:** Everything lives in `src/contracts/` and `config/`. No domain/app/adapter logic. See [contracts.md](../../../architecture/layers/contracts.md).

**Tech Stack:** TypeScript · Zod · Vitest

**Lane:** Shared (serialize — merge before A1/B1 diverge)

**Depends on:** PR-00 Bootstrap

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

### Task 1: Core domain types

**Files:**
- Create: `src/contracts/types/job-spec.ts`
- Create: `src/contracts/types/vendor.ts`
- Create: `src/contracts/types/quote.ts`
- Create: `src/contracts/types/call.ts`
- Create: `src/contracts/types/skill.ts`
- Create: `src/contracts/types/audit.ts`
- Create: `src/contracts/types/report.ts`
- Create: `src/contracts/types/index.ts`
- Test: `tests/unit/contracts/types.roundtrip.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: all canonical types from the master plan (`JobSpec`, `Vendor`, `Quote`, `QuoteFee`, `Skill`, `AuditEvent`, `ReportPrimary`, `ReportDrilldowns`, `JobType`, `PricingModel`, `CallOutcome`, `CallRound`)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/contracts/types.roundtrip.test.ts
import { describe, it, expect } from "vitest";
import type { JobSpec } from "@/contracts/types";

describe("JobSpec shape", () => {
  it("accepts a confirmed recurring job fixture", () => {
    const spec: JobSpec = {
      id: "js_1",
      jobType: "recurring_weekly",
      sqft: 1200,
      bedrooms: 3,
      bathrooms: 2,
      frequency: "weekly",
      addOns: ["inside_fridge"],
      suppliesProvided: true,
      pets: false,
      accessNotes: "key under mat",
      conditionNotes: "normal wear",
      geo: "Austin, TX",
      confirmed: true,
    };
    expect(spec.confirmed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/contracts/types.roundtrip.test.ts`
Expected: FAIL — cannot find module `@/contracts/types`

- [ ] **Step 3: Write minimal implementation**

Create type files matching the master plan canonical types exactly (copy from master plan § Canonical types). Export from `src/contracts/types/index.ts`. Update `src/contracts/index.ts` to re-export types and bump `CONTRACTS_VERSION` to `"0.1.0"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/contracts/types.roundtrip.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/contracts/types tests/unit/contracts/types.roundtrip.test.ts src/contracts/index.ts
git commit -m "feat(contracts): add canonical domain types"
```

---

### Task 2: Zod schemas

**Files:**
- Create: `src/contracts/schemas/job-spec.ts`
- Create: `src/contracts/schemas/quote.ts`
- Create: `src/contracts/schemas/index.ts`
- Test: `tests/unit/contracts/schemas.parse.test.ts`

**Interfaces:**
- Consumes: types from Task 1
- Produces: `JobSpecSchema`, `QuoteSchema` (Zod), `parseJobSpec(input: unknown): JobSpec`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { JobSpecSchema } from "@/contracts/schemas";

describe("JobSpecSchema", () => {
  it("rejects unconfirmed missing required fields", () => {
    const result = JobSpecSchema.safeParse({ id: "x" });
    expect(result.success).toBe(false);
  });

  it("parses a valid job spec", () => {
    const result = JobSpecSchema.safeParse({
      id: "js_1",
      jobType: "deep_clean",
      sqft: 900,
      bedrooms: 2,
      bathrooms: 1,
      frequency: "once",
      addOns: [],
      suppliesProvided: false,
      pets: true,
      accessNotes: "",
      conditionNotes: "dusty",
      geo: "Austin, TX",
      confirmed: false,
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run — Expected FAIL** (`JobSpecSchema` missing)

- [ ] **Step 3: Implement Zod schemas** with `.strict()` where practical; export parsers.

- [ ] **Step 4: Run — Expected PASS**

- [ ] **Step 5: Commit** `feat(contracts): add Zod schemas for JobSpec and Quote`

---

### Task 3: Port interfaces

**Files:**
- Create: `src/contracts/ports/telephony.ts`
- Create: `src/contracts/ports/speech.ts`
- Create: `src/contracts/ports/llm.ts`
- Create: `src/contracts/ports/document-parser.ts`
- Create: `src/contracts/ports/knowledge-base.ts`
- Create: `src/contracts/ports/vendor-directory.ts`
- Create: `src/contracts/ports/repositories.ts`
- Create: `src/contracts/ports/index.ts`
- Test: `tests/unit/contracts/ports.exists.test.ts`

**Interfaces:**
- Produces: port interfaces with exact method signatures from [contracts.md](../../../architecture/layers/contracts.md)

- [ ] **Step 1: Write the failing test** that imports `TelephonyProvider` and asserts `typeof` of a fake object satisfying the interface via type assignment in a typed helper.

```typescript
import { describe, it, expect } from "vitest";
import type { TelephonyProvider } from "@/contracts/ports";

describe("TelephonyProvider", () => {
  it("defines startCall and endCall", async () => {
    const fake: TelephonyProvider = {
      async startCall() {
        return { callId: "c1" };
      },
      async endCall() {},
    };
    const started = await fake.startCall({
      jobSpecId: "js",
      vendorId: "v",
      round: 1,
    });
    expect(started.callId).toBe("c1");
  });
});
```

- [ ] **Step 2: Run — Expected FAIL**

- [ ] **Step 3: Implement all port interface files** (methods per contracts.md). Re-export from `ports/index.ts` and `contracts/index.ts`.

- [ ] **Step 4: Run — Expected PASS**

- [ ] **Step 5: Commit** `feat(contracts): add port interfaces for DIP seam`

---

### Task 4: Vertical config

**Files:**
- Modify: `config/verticals/home_cleaning.json` (ensure complete)
- Create: `src/contracts/config/vertical.ts` (`VerticalConfigSchema`)
- Test: `tests/unit/contracts/vertical-config.test.ts`

- [ ] **Step 1: Failing test** loading JSON and parsing with `VerticalConfigSchema`

- [ ] **Step 2: Run — Expected FAIL**

- [ ] **Step 3: Implement schema + ensure JSON matches**

- [ ] **Step 4: Run — Expected PASS**

- [ ] **Step 5: Commit** `feat(contracts): validate home_cleaning vertical config`

---

### Task 5: Docs + CI

**Files:**
- Modify: `docs/architecture/layers/contracts.md` (mark ports landed)

- [ ] **Step 1: Update contracts layer doc** with “Status: PR-01 landed” and list of files

- [ ] **Step 2: Run** `npm run typecheck && npm run arch:check && npm run test`

Expected: PASS

- [ ] **Step 3: Commit** `docs(contracts): mark PR-01 ports and types as landed`

---

## Acceptance criteria

- [ ] `CONTRACTS_VERSION === "0.1.0"`
- [ ] All ports exported; Lane A/B unblocked
- [ ] CI green; docs freshness satisfied
- [ ] No vendor SDK imports in `src/contracts`
