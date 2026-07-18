# PR-I3 T3 Integration Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate T3 wow features (A8 skill generator, B8 room photos, A9 email fallback) plus assisted-call co-pilot behind `FEATURE_ASSISTED_CALL_COPILOT` feature flag, with executable gate tests proving each path on simulated/fake adapters in CI.

**Architecture:** Integration branch extends `createContainer.ts` with skill repo, email notifier, and co-pilot stub route. Gate tests in `tests/integration/t3/gate/` assert: generated skill validates; room photos merge JobSpec; email fallback sets `callback_commitment`; co-pilot flag gates UI/API without affecting default flow. Domain unchanged (LSP).

**Tech Stack:** Next.js 15 · Vitest · Playwright · TypeScript

## Global Constraints

- **CI default:** all T3 gate tests use fake adapters; `FEATURE_ASSISTED_CALL_COPILOT` unset or `"false"`.
- **Co-pilot:** stub only — exposes `/api/copilot/session` returning `{ enabled: false }` unless flag true.
- Branch naming: `integration/PR-I3-t3-integration`.
- **Depends on:** **PR-A8**, **PR-B8**, **PR-A9** (all merged to `main`).

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

## Files overview

| Action | Path |
|--------|------|
| Modify | `src/app/composition/createContainer.ts` |
| Create | `src/app/copilot/assistedCallCopilot.ts` |
| Create | `app/api/copilot/session/route.ts` |
| Create | `tests/integration/t3/gate/t3Gate.test.ts` |
| Create | `tests/e2e/t3-gate-simulated.spec.ts` |
| Modify | `.env.example` |
| Modify | `docs/architecture/layers/application.md` |

---

### Task 1: Assisted-call co-pilot stub + feature flag

**Files:**
- Create: `src/app/copilot/assistedCallCopilot.ts`
- Create: `app/api/copilot/session/route.ts`
- Create: `tests/unit/app/copilot/assistedCallCopilot.test.ts`

**Interfaces:**

```typescript
export function isAssistedCallCopilotEnabled(): boolean;

export function createCopilotSession(input: {
  jobSpecId: string;
  customerPhone: string;
}): Promise<{
  enabled: boolean;
  sessionId: string | null;
  message: string;
}>;
```

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/app/copilot/assistedCallCopilot.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isAssistedCallCopilotEnabled,
  createCopilotSession,
} from "@/app/copilot/assistedCallCopilot";

describe("assistedCallCopilot", () => {
  afterEach(() => delete process.env.FEATURE_ASSISTED_CALL_COPILOT);

  it("disabled by default", () => {
    expect(isAssistedCallCopilotEnabled()).toBe(false);
  });

  it("returns stub session when flag false", async () => {
    const session = await createCopilotSession({
      jobSpecId: "job-1",
      customerPhone: "+15125551212",
    });
    expect(session.enabled).toBe(false);
    expect(session.sessionId).toBeNull();
  });

  it("returns enabled stub when flag true", async () => {
    process.env.FEATURE_ASSISTED_CALL_COPILOT = "true";
    const session = await createCopilotSession({
      jobSpecId: "job-1",
      customerPhone: "+15125551212",
    });
    expect(session.enabled).toBe(true);
    expect(session.sessionId).toMatch(/^copilot-/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app/copilot/assistedCallCopilot.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement stub**

```typescript
// src/app/copilot/assistedCallCopilot.ts
import { randomUUID } from "node:crypto";

export function isAssistedCallCopilotEnabled(): boolean {
  return process.env.FEATURE_ASSISTED_CALL_COPILOT === "true";
}

export async function createCopilotSession(input: {
  jobSpecId: string;
  customerPhone: string;
}) {
  if (!isAssistedCallCopilotEnabled()) {
    return {
      enabled: false,
      sessionId: null,
      message: "Assisted-call co-pilot is disabled. Set FEATURE_ASSISTED_CALL_COPILOT=true to enable.",
    };
  }
  return {
    enabled: true,
    sessionId: `copilot-${randomUUID()}`,
    message: `Co-pilot session ready for job ${input.jobSpecId}. Customer will join bridged call (stub).`,
  };
}
```

```typescript
// app/api/copilot/session/route.ts
import { NextResponse } from "next/server";
import { createCopilotSession } from "@/app/copilot/assistedCallCopilot";

export async function POST(req: Request) {
  const body = await req.json();
  const session = await createCopilotSession({
    jobSpecId: body.jobSpecId,
    customerPhone: body.customerPhone,
  });
  return NextResponse.json(session);
}
```

Add to `.env.example`:

```
FEATURE_ASSISTED_CALL_COPILOT=false
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/app/copilot/assistedCallCopilot.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/copilot/assistedCallCopilot.ts app/api/copilot/session/route.ts tests/unit/app/copilot/assistedCallCopilot.test.ts .env.example
git commit -m "feat(I3): assisted-call co-pilot stub behind feature flag"
```

---

### Task 2: T3 executable gate tests

**Files:**
- Create: `tests/integration/t3/gate/t3Gate.test.ts`

- [ ] **Step 1: Write gate test file**

```typescript
// tests/integration/t3/gate/t3Gate.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, resetContainerForTests } from "@/app/composition/createContainer";
import { generateSkillFromAsk } from "@/app/skills/skillGenerator";
import { handleEmailFallback } from "@/app/calls/emailFallbackHandler";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";
import type { JobSpec } from "@/contracts";

describe("T3 integration gate — CI fake adapters", () => {
  beforeEach(() => {
    resetContainerForTests();
    delete process.env.FEATURE_ASSISTED_CALL_COPILOT;
  });

  it("G1: SkillGenerator produces valid Skill for unseen ask", async () => {
    const c = createContainer();
    const jobSpec: JobSpec = {
      ...(await c.jobSpecRepo.create(
        buildJobSpec(
          { sqft: 2000, bedrooms: 3, bathrooms: 2, pets: true },
          {},
          { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
        )
      )),
    };

    const skill = await generateSkillFromAsk(
      { planner: c.planner, skillRepo: c.skillRepo },
      {
        customerAsk: "Can you ask them to waive the pet surcharge?",
        jobSpec,
      }
    );

    expect(skill.id).toMatch(/^[a-z0-9_]+$/);
    expect(skill.moveTemplate.length).toBeGreaterThanOrEqual(10);
    expect(skill.selectionSignals.length).toBeGreaterThanOrEqual(1);
  });

  it("G2: Room photo path fills partial JobSpec draft", async () => {
    const c = createContainer();
    const { jobSpecId } = await c.intakeOrchestrator.startIntake({
      geo: "Austin, TX",
    });
    const before = await c.jobSpecRepo.getById(jobSpecId);
    expect(before?.sqft).toBeFalsy();

    const updated = await c.intakeOrchestrator.mergeRoomPhotos(jobSpecId, [
      { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" },
    ]);

    expect(updated.sqft).toBe(1850);
    expect(updated.conditionNotes).toBeTruthy();
  });

  it("G3: Email fallback records callback_commitment without throwing", async () => {
    const c = createContainer();
    const draft = buildJobSpec(
      { sqft: 1800, bedrooms: 3, bathrooms: 2, pets: false },
      {},
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
    );
    const job = await c.jobSpecRepo.create(draft);
    const call = await c.callRepo.create({
      jobSpecId: job.id,
      vendorId: "vendor-tough",
      round: 1,
    });

    const result = await handleEmailFallback(
      { emailNotifier: c.emailNotifier, callRepo: c.callRepo },
      {
        callId: call.id,
        jobSpec: job,
        vendorEmail: "quotes@vendor.com",
        vendorName: "Sparkle Pro",
        lastVendorUtterance: "We don't quote over the phone.",
      }
    );

    expect(result.outcome).toBe("callback_commitment");
    const row = await c.callRepo.getById(call.id);
    expect(row?.outcome).toBe("callback_commitment");
  });

  it("G4: Co-pilot disabled by default; enabled when flag set", async () => {
    const { createCopilotSession } = await import("@/app/copilot/assistedCallCopilot");
    const off = await createCopilotSession({
      jobSpecId: "j1",
      customerPhone: "+1",
    });
    expect(off.enabled).toBe(false);

    process.env.FEATURE_ASSISTED_CALL_COPILOT = "true";
    const on = await createCopilotSession({
      jobSpecId: "j1",
      customerPhone: "+1",
    });
    expect(on.enabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/t3/gate/t3Gate.test.ts`
Expected: FAIL — container missing `skillRepo`, `emailNotifier`, or planner wiring

- [ ] **Step 3: Wire T3 deps in createContainer**

Extend `createContainer.ts`:

```typescript
import { createFileSkillRepository } from "@/adapters/persistence/fileSkillRepository";
import { createFakeEmailNotifier } from "@/adapters/fake/fakeEmailNotifier";

// inside buildContainer():
const skillRepo = createFileSkillRepository("config/skills/generated");
const emailNotifier = createFakeEmailNotifier();
```

Expose `skillRepo`, `emailNotifier`, `planner` on container return type.

- [ ] **Step 4: Run gate tests**

Run: `npm run test -- tests/integration/t3/gate/t3Gate.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/composition/createContainer.ts tests/integration/t3/gate/t3Gate.test.ts
git commit -m "feat(I3): T3 gate tests for skill gen, photos, email, co-pilot"
```

---

### Task 3: Playwright T3 gate e2e

**Files:**
- Create: `tests/e2e/t3-gate-simulated.spec.ts`

- [ ] **Step 1: Write e2e spec**

```typescript
// tests/e2e/t3-gate-simulated.spec.ts
import { test, expect } from "@playwright/test";

test("T3 gate: room photos merge into intake draft", async ({ request }) => {
  const startRes = await request.post("/api/intake/start", {
    data: { geo: "Austin, TX" },
  });
  const { jobSpecId } = await startRes.json();

  const photoBytes = Buffer.from([0xff, 0xd8, 0xff, 0xdb]);
  const uploadRes = await request.post("/api/intake/upload-photos", {
    multipart: {
      jobSpecId,
      photos: {
        name: "living-room.jpg",
        mimeType: "image/jpeg",
        buffer: photoBytes,
      },
    },
  });
  expect(uploadRes.ok()).toBeTruthy();
  const { jobSpec } = await uploadRes.json();
  expect(jobSpec.sqft).toBe(1850);
  expect(jobSpec.conditionNotes).toBeTruthy();
});

test("T3 gate: co-pilot API disabled by default", async ({ request }) => {
  const res = await request.post("/api/copilot/session", {
    data: { jobSpecId: "job-x", customerPhone: "+15125551212" },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.enabled).toBe(false);
});
```

- [ ] **Step 2: Run e2e**

Run: `npm run build && npm run test:e2e -- tests/e2e/t3-gate-simulated.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 3: Add to CI**

Ensure `.github/workflows/ci.yml` Playwright job includes `t3-gate-simulated.spec.ts`.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/t3-gate-simulated.spec.ts .github/workflows/ci.yml docs/architecture/layers/application.md
git commit -m "test(I3): T3 gate Playwright e2e on fake adapters"
```

---

### Task 4: Full CI regression

- [ ] **Step 1: Run full CI**

Run: `npm run ci`
Expected: PASS — T1 + T2 + T3 gate tests green; simulated adapters throughout

- [ ] **Step 2: Commit any fixes**

```bash
git commit -m "chore(I3): T3 integration gate CI green"
```

---

## T3 gate checklist (executable — must all pass in CI)

- [ ] **G1:** `generateSkillFromAsk` returns valid `Skill` with schema-valid preconditions
- [ ] **G2:** `mergeRoomPhotos` fills partial `JobSpec` (sqft, conditionNotes)
- [ ] **G3:** Email fallback sets `callback_commitment`; no unhandled rejection
- [ ] **G4:** `FEATURE_ASSISTED_CALL_COPILOT=false` by default; stub session when true
- [ ] **G5:** Playwright `t3-gate-simulated.spec.ts` green
- [ ] **G6:** T1 + T2 gate tests still pass (no regression)
- [ ] **G7:** `npm run ci` green on `integration/PR-I3-t3-integration`

---

## Definition of done

- [ ] All T3 packages integrated behind existing ports
- [ ] Co-pilot stub wired with feature flag
- [ ] CI uses fake/simulated adapters exclusively
- [ ] Executable gate tests document T3 acceptance criteria
