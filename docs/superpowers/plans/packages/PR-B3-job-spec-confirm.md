# PR-B3 Job Spec Confirm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge voice + document intake into one validated `JobSpec`, expose confirm API, update confirmation UI, and block call orchestration until `confirmed: true`.

**Architecture:** Pure `buildJobSpec` in `src/domain/jobSpec/` merges partial drafts and validates with Zod schema from contracts. Application calls domain then repository `confirm`. Confirm UI calls `POST /api/job-specs/[id]/confirm`. `CallOrchestrator` (stub guard in this PR, full flow in PR-I1) rejects unconfirmed specs.

**Tech Stack:** Next.js 15 · Zod · Vitest · TypeScript

## Global Constraints

- Comparability: one confirmed `JobSpec` per negotiation run.
- Domain imports only `src/contracts`.
- Branch naming: `lane-b/PR-B3-job-spec-confirm`.
- Depends on: **PR-B2** (intake produces drafts), **PR-01** (JobSpec schema).

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/domain/jobSpec/buildJobSpec.ts` |
| Create | `tests/unit/domain/jobSpec/buildJobSpec.test.ts` |
| Create | `app/api/job-specs/[id]/confirm/route.ts` |
| Create | `app/api/job-specs/[id]/route.ts` |
| Modify | `src/frontend/screens/ConfirmJobSpecScreen.tsx` |
| Create | `src/app/calls/callOrchestrator.ts` (guard only) |
| Create | `tests/integration/jobSpec/confirm.test.ts` |
| Create | `tests/integration/calls/unconfirmedGuard.test.ts` |

---

### Task 1: buildJobSpec pure merge + Zod validate

**Files:**
- Create: `src/domain/jobSpec/buildJobSpec.ts`
- Create: `tests/unit/domain/jobSpec/buildJobSpec.test.ts`

**Interfaces:**
- Consumes: `jobSpecSchema` from `@/contracts`, partial `JobSpec` fragments
- Produces: `buildJobSpec(voicePartial, docPartial, defaults): JobSpec` — throws `JobSpecValidationError` on invalid merge

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { buildJobSpec, JobSpecValidationError } from "@/domain/jobSpec/buildJobSpec";

describe("buildJobSpec", () => {
  it("merges voice and document partials with document winning on conflict", () => {
    const result = buildJobSpec(
      { sqft: 1600, bedrooms: 2, bathrooms: 2, pets: true },
      { sqft: 1800, leverageQuoteAmount: 185 },
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
    );
    expect(result.sqft).toBe(1800);
    expect(result.leverageQuoteAmount).toBe(185);
    expect(result.pets).toBe(true);
    expect(result.confirmed).toBe(false);
  });

  it("throws when sqft is zero", () => {
    expect(() =>
      buildJobSpec({}, {}, { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" })
    ).toThrow(JobSpecValidationError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/jobSpec/buildJobSpec.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
import { jobSpecSchema, type JobSpec, type JobType } from "@/contracts";
import { randomUUID } from "node:crypto";

export class JobSpecValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobSpecValidationError";
  }
}

type Defaults = {
  geo: string;
  jobType: JobType;
  frequency: JobSpec["frequency"];
};

export function buildJobSpec(
  voicePartial: Partial<JobSpec>,
  docPartial: Partial<JobSpec>,
  defaults: Defaults,
  existingId?: string
): JobSpec {
  const merged: JobSpec = {
    id: existingId ?? randomUUID(),
    jobType: defaults.jobType,
    sqft: 0,
    bedrooms: 0,
    bathrooms: 0,
    frequency: defaults.frequency,
    addOns: [],
    suppliesProvided: false,
    pets: false,
    accessNotes: "",
    conditionNotes: "",
    geo: defaults.geo,
    confirmed: false,
    ...voicePartial,
    ...docPartial,
  };

  const parsed = jobSpecSchema.safeParse(merged);
  if (!parsed.success) {
    throw new JobSpecValidationError(parsed.error.message);
  }
  if (parsed.data.sqft <= 0) {
    throw new JobSpecValidationError("sqft must be greater than zero");
  }
  return parsed.data;
}
```

Note: `jobSpecSchema` exported from `@/contracts` in PR-01 as Zod schema matching `JobSpec` interface.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/jobSpec/buildJobSpec.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domain/jobSpec/buildJobSpec.ts tests/unit/domain/jobSpec/buildJobSpec.test.ts
git commit -m "feat(B3): buildJobSpec merge with Zod validation"
```

---

### Task 2: Confirm API route

**Files:**
- Create: `app/api/job-specs/[id]/confirm/route.ts`
- Create: `app/api/job-specs/[id]/route.ts`

**Interfaces:**
- Consumes: `JobSpecRepository.confirm(id)`, `buildJobSpec` for final merge before confirm
- Produces: `POST /api/job-specs/[id]/confirm` → `{ jobSpec: JobSpec }` with `confirmed: true`

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/jobSpec/confirm.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";

describe("job spec confirm flow", () => {
  let jobSpecId: string;

  beforeEach(async () => {
    const repo = createInMemoryJobSpecRepository();
    const draft = buildJobSpec(
      { sqft: 1800, bedrooms: 3, bathrooms: 2 },
      { leverageQuoteAmount: 185 },
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
    );
    const created = await repo.create(draft);
    jobSpecId = created.id;
    (globalThis as { __jobSpecRepo?: ReturnType<typeof createInMemoryJobSpecRepository> }).__jobSpecRepo = repo;
  });

  it("confirm sets confirmed true", async () => {
    const { POST } = await import("../../../../app/api/job-specs/[id]/confirm/route");
    const req = new Request(`http://localhost/api/job-specs/${jobSpecId}/confirm`, {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: jobSpecId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobSpec.confirmed).toBe(true);
    expect(body.jobSpec.leverageQuoteAmount).toBe(185);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/jobSpec/confirm.test.ts`
Expected: FAIL with route not found

- [ ] **Step 3: Write minimal implementation**

Extend `src/app/intake/createIntakeDeps.ts` to export shared repo, or create `src/app/jobSpec/getJobSpecRepo.ts`:

```typescript
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";

let repo = createInMemoryJobSpecRepository();

export function getJobSpecRepository() {
  return repo;
}

export function resetJobSpecRepositoryForTests() {
  repo = createInMemoryJobSpecRepository();
  (globalThis as { __jobSpecRepo?: typeof repo }).__jobSpecRepo = repo;
}
```

`app/api/job-specs/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getJobSpecRepository } from "@/app/jobSpec/getJobSpecRepo";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repo = getJobSpecRepository();
  const jobSpec = await repo.getById(id);
  if (!jobSpec) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ jobSpec });
}
```

`app/api/job-specs/[id]/confirm/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getJobSpecRepository } from "@/app/jobSpec/getJobSpecRepo";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repo = getJobSpecRepository();
  const existing = await repo.getById(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.sqft <= 0) {
    return NextResponse.json({ error: "incomplete job spec" }, { status: 400 });
  }
  const jobSpec = await repo.confirm(id);
  return NextResponse.json({ jobSpec });
}
```

Wire intake orchestrator to use same `getJobSpecRepository()` singleton.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/jobSpec/confirm.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add app/api/job-specs src/app/jobSpec/getJobSpecRepo.ts tests/integration/jobSpec/confirm.test.ts
git commit -m "feat(B3): job spec confirm API route"
```

---

### Task 3: Confirm UI calls API and reflects confirmed state

**Files:**
- Modify: `src/frontend/screens/ConfirmJobSpecScreen.tsx`
- Modify: `app/(ui)/confirm/[jobId]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/job-specs/[id]`, `POST /api/job-specs/[id]/confirm`
- Produces: Client component that sets button label to "Confirmed" after success

- [ ] **Step 1: Write the failing component test**

Create `tests/unit/frontend/confirmJobSpec.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfirmJobSpecScreen } from "@/frontend/screens/ConfirmJobSpecScreen";
import { mockJobSpec } from "@/frontend/mocks/fixtures";

describe("ConfirmJobSpecScreen client confirm", () => {
  it("calls confirm API and updates button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("/confirm") && init?.method === "POST") {
          return new Response(JSON.stringify({ jobSpec: { ...mockJobSpec, confirmed: true } }));
        }
        return new Response(JSON.stringify({ jobSpec: mockJobSpec }));
      })
    );

    render(<ConfirmJobSpecScreen jobSpec={mockJobSpec} />);
    fireEvent.click(screen.getByTestId("confirm-job-spec-button"));
    await waitFor(() => {
      expect(screen.getByTestId("confirm-job-spec-button")).toHaveTextContent("Confirmed");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/frontend/confirmJobSpec.test.tsx`
Expected: FAIL — button does not update (no fetch handler yet)

- [ ] **Step 3: Write minimal implementation**

Replace `src/frontend/screens/ConfirmJobSpecScreen.tsx` with client component:

```tsx
"use client";

import { useState } from "react";
import type { JobSpec } from "@/contracts";

export function ConfirmJobSpecScreen({ jobSpec: initial }: { jobSpec: JobSpec }) {
  const [jobSpec, setJobSpec] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const res = await fetch(`/api/job-specs/${jobSpec.id}/confirm`, { method: "POST" });
    const body = await res.json();
    setJobSpec(body.jobSpec);
    setLoading(false);
  }

  return (
    <section className="space-y-6" data-testid="confirm-screen">
      <h1 className="text-2xl font-semibold">Confirm your job spec</h1>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <dt className="font-medium">Square feet</dt>
        <dd>{jobSpec.sqft}</dd>
        <dt className="font-medium">Leverage quote</dt>
        <dd>{jobSpec.leverageQuoteAmount ? `$${jobSpec.leverageQuoteAmount}` : "—"}</dd>
      </dl>
      <button
        type="button"
        data-testid="confirm-job-spec-button"
        className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
        disabled={jobSpec.confirmed || loading}
        onClick={handleConfirm}
      >
        {jobSpec.confirmed ? "Confirmed" : "Confirm and start calling vendors"}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/frontend/confirmJobSpec.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/screens/ConfirmJobSpecScreen.tsx tests/unit/frontend/confirmJobSpec.test.tsx
git commit -m "feat(B3): confirm UI posts to API and updates state"
```

---

### Task 4: CallOrchestrator guard — cannot start without confirm

**Files:**
- Create: `src/app/calls/callOrchestrator.ts`
- Create: `tests/integration/calls/unconfirmedGuard.test.ts`

**Interfaces:**
- Consumes: `JobSpecRepository.getById`
- Produces: `CallOrchestrator.startRound1(jobSpecId)` throws `UnconfirmedJobSpecError` when `confirmed === false`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";
import {
  CallOrchestrator,
  UnconfirmedJobSpecError,
} from "@/app/calls/callOrchestrator";

describe("CallOrchestrator guard", () => {
  it("rejects round 1 when job spec not confirmed", async () => {
    const repo = createInMemoryJobSpecRepository();
    const draft = buildJobSpec(
      { sqft: 1800, bedrooms: 3, bathrooms: 2 },
      {},
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
    );
    const created = await repo.create(draft);
    const orchestrator = new CallOrchestrator({ jobSpecRepo: repo });
    await expect(orchestrator.startRound1(created.id)).rejects.toThrow(
      UnconfirmedJobSpecError
    );
  });

  it("allows round 1 after confirm", async () => {
    const repo = createInMemoryJobSpecRepository();
    const draft = buildJobSpec(
      { sqft: 1800, bedrooms: 3, bathrooms: 2 },
      {},
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
    );
    const created = await repo.create(draft);
    await repo.confirm(created.id);
    const orchestrator = new CallOrchestrator({ jobSpecRepo: repo });
    const result = await orchestrator.startRound1(created.id);
    expect(result.callIds.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/calls/unconfirmedGuard.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { JobSpecRepository } from "@/contracts";
import { randomUUID } from "node:crypto";

export class UnconfirmedJobSpecError extends Error {
  constructor(jobSpecId: string) {
    super(`JobSpec ${jobSpecId} must be confirmed before calls`);
    this.name = "UnconfirmedJobSpecError";
  }
}

export class CallOrchestrator {
  constructor(private readonly deps: { jobSpecRepo: JobSpecRepository }) {}

  async startRound1(jobSpecId: string) {
    const jobSpec = await this.deps.jobSpecRepo.getById(jobSpecId);
    if (!jobSpec) throw new Error(`JobSpec not found: ${jobSpecId}`);
    if (!jobSpec.confirmed) throw new UnconfirmedJobSpecError(jobSpecId);
    return { callIds: [randomUUID(), randomUUID(), randomUUID()] };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/calls/unconfirmedGuard.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/calls/callOrchestrator.ts tests/integration/calls/unconfirmedGuard.test.ts
git commit -m "feat(B3): block calls until JobSpec confirmed"
```

---

## Definition of done

- [ ] `buildJobSpec` validates merged drafts via Zod
- [ ] `POST /api/job-specs/[id]/confirm` sets `confirmed: true`
- [ ] Confirm UI reflects confirmed state after API success
- [ ] `CallOrchestrator.startRound1` rejects unconfirmed specs
- [ ] `npm run ci` green on `lane-b/PR-B3-job-spec-confirm`
- [ ] Update `docs/architecture/layers/domain.md` Job Spec Builder entry
