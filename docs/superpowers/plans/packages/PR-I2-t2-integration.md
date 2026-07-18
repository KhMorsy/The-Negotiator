# PR-I2 T2 Integration Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge T2 packages (A6, A7, B6, B7) behind a single integration gate — CI stays on simulated adapters; optional live smoke behind env flags; documented demo script for judges.

**Architecture:** Integration branch wires all T2 adapter swaps in `createContainer.ts`, adds executable gate tests under `tests/integration/t2/gate/`, extends Playwright with simulated-path regression, and ships `docs/demo/t2-live-demo.md` + shell script. Domain and port signatures unchanged (LSP).

**Tech Stack:** Next.js 15 · Vitest integration · Playwright · Bash demo script

## Global Constraints

- **CI default:** all gate tests pass with `USE_SIMULATED_SPEECH=true`, `USE_SIMULATED_TELEPHONY=true`, `NEXT_PUBLIC_USE_FAKE_REALTIME=true`.
- **Live smoke:** `RUN_LIVE_SMOKE=1` runs optional tests skipped in CI.
- **Tier rule:** T3 work must not start until this PR merges.
- Branch naming: `integration/PR-I2-t2-integration`.
- **Depends on:** **PR-A6**, **PR-A7**, **PR-B6**, **PR-B7** (all merged to `main`).

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

## Files overview

| Action | Path |
|--------|------|
| Modify | `src/app/composition/createContainer.ts` |
| Create | `tests/integration/t2/gate/t2Gate.test.ts` |
| Create | `tests/e2e/t2-gate-simulated.spec.ts` |
| Create | `tests/integration/t2/gate/t2LiveSmoke.test.ts` |
| Create | `docs/demo/t2-live-demo.md` |
| Create | `scripts/demo/t2-live-demo.sh` |
| Modify | `.github/workflows/ci.yml` |
| Modify | `docs/architecture/layers/application.md` |

---

### Task 1: Unified T2 composition verification

**Files:**
- Modify: `src/app/composition/createContainer.ts`
- Create: `tests/integration/t2/gate/t2Gate.test.ts`

**Interfaces:**
- Produces: `createContainer()` exposes adapter kinds for gate assertions:

```typescript
export type Container = {
  speechAgentKind: "fake" | "elevenlabs";
  telephonyKind: "simulated" | "twilio";
  intakeOrchestrator: IntakeOrchestrator;
  callOrchestrator: CallOrchestrator;
  reportComposer: ReportComposer;
  /* repos ... */
};
```

- [ ] **Step 1: Write failing gate test (simulated defaults)**

```typescript
// tests/integration/t2/gate/t2Gate.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, resetContainerForTests } from "@/app/composition/createContainer";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";

describe("T2 integration gate — CI simulated path", () => {
  beforeEach(() => {
    resetContainerForTests();
    process.env.USE_SIMULATED_SPEECH = "true";
    process.env.USE_SIMULATED_TELEPHONY = "true";
  });

  it("G1: composition defaults to fake speech + simulated telephony", () => {
    const c = createContainer();
    expect(c.speechAgentKind).toBe("fake");
    expect(c.telephonyKind).toBe("simulated");
  });

  it("G2: full negotiation + drilldowns + call status API", async () => {
    const c = createContainer();
    const draft = buildJobSpec(
      { sqft: 2000, bedrooms: 3, bathrooms: 2, pets: true },
      { leverageQuoteAmount: 185 },
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
    );
    const job = await c.jobSpecRepo.create(draft);
    await c.jobSpecRepo.confirm(job.id);

    await c.callOrchestrator.runFullNegotiation(job.id);
    const report = await c.reportComposer.compose(job.id);
    const drilldowns = await c.reportComposer.composeDrilldowns(job.id);
    const calls = await c.callRepo.listByJobSpec(job.id);

    expect(report.rankedQuotes.length).toBeGreaterThanOrEqual(3);
    expect(drilldowns.savings?.negotiatedTotal).toBeLessThanOrEqual(
      drilldowns.savings?.initialTotal ?? Infinity
    );
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  it("G3: audit price move exists after round 2", async () => {
    const c = createContainer();
    const draft = buildJobSpec(
      { sqft: 1800, bedrooms: 3, bathrooms: 2, pets: false },
      {},
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
    );
    const job = await c.jobSpecRepo.create(draft);
    await c.jobSpecRepo.confirm(job.id);
    await c.callOrchestrator.runFullNegotiation(job.id);

    const audits = await c.auditRepo.listByJobSpec(job.id);
    const moved = audits.some(
      (e) =>
        e.priceBefore !== null &&
        e.priceAfter !== null &&
        (e.priceAfter as number) < (e.priceBefore as number)
    );
    expect(moved).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/t2/gate/t2Gate.test.ts`
Expected: FAIL — missing `composeDrilldowns` wiring or adapter kind fields

- [ ] **Step 3: Ensure createContainer merges all T2 deps**

Verify `createContainer.ts` wires:
- `selectSpeechAgent()` from PR-A6
- `selectTelephonyProvider()` from PR-A7
- `ReportComposer` with `auditRepo` for drilldowns (PR-B7)
- `callRepo` exposed on container for gate test G2

- [ ] **Step 4: Run gate test**

Run: `npm run test -- tests/integration/t2/gate/t2Gate.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/composition/createContainer.ts tests/integration/t2/gate/t2Gate.test.ts
git commit -m "feat(I2): T2 gate integration tests on simulated path"
```

---

### Task 2: Playwright T2 gate e2e (simulated — CI)

**Files:**
- Create: `tests/e2e/t2-gate-simulated.spec.ts`

- [ ] **Step 1: Write e2e gate spec**

```typescript
// tests/e2e/t2-gate-simulated.spec.ts
import { test, expect } from "@playwright/test";

test.describe("T2 gate e2e — simulated adapters (CI)", () => {
  test("intake → confirm → calls → live dashboard → report drilldowns", async ({
    page,
    request,
  }) => {
    const startRes = await request.post("/api/intake/start", {
      data: { geo: "Austin, TX" },
    });
    const { jobSpecId } = await startRes.json();
    await request.post(`/api/job-specs/${jobSpecId}/confirm`);
    await request.post(`/api/calls/${jobSpecId}/start`);

    await page.goto(`/calls/${jobSpecId}`);
    await expect(page.getByTestId("live-call-row").first()).toBeVisible();

    await page.goto(`/report/${jobSpecId}`);
    await expect(page.getByTestId("report-recommendation")).toBeVisible();
    await expect(page.getByTestId("drilldown-savings")).toBeVisible();
    await expect(page.getByTestId("drilldown-savings")).not.toHaveAttribute(
      "aria-disabled",
      "true"
    );

    const auditRes = await request.get(`/api/audit/${jobSpecId}`);
    const { auditEvents } = await auditRes.json();
    expect(
      auditEvents.some(
        (e: { priceBefore: number | null; priceAfter: number | null }) =>
          e.priceAfter !== null &&
          e.priceBefore !== null &&
          e.priceAfter < e.priceBefore
      )
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run e2e**

Run: `npm run build && npm run test:e2e -- tests/e2e/t2-gate-simulated.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 3: Add to CI workflow**

In `.github/workflows/ci.yml`, ensure Playwright job runs `t2-gate-simulated.spec.ts` after T1 e2e.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/t2-gate-simulated.spec.ts .github/workflows/ci.yml
git commit -m "test(I2): T2 gate Playwright e2e on simulated path"
```

---

### Task 3: Optional live smoke (skipped in CI)

**Files:**
- Create: `tests/integration/t2/gate/t2LiveSmoke.test.ts`

- [ ] **Step 1: Write opt-in live smoke test**

```typescript
// tests/integration/t2/gate/t2LiveSmoke.test.ts
import { describe, it, expect } from "vitest";
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";
import { runSpeechAgentContract } from "@/tests/contracts/ports/speech-agent.contract.test";

const runLive = process.env.RUN_LIVE_SMOKE === "1";

describe.skipIf(!runLive)("T2 live smoke — manual only", () => {
  it("L1: ElevenLabs SpeechAgent starts session", async () => {
    const agent = createElevenLabsAgentAdapter();
    const { sessionId } = await agent.startIntakeSession("smoke-draft");
    expect(sessionId).toBeTruthy();
  }, 30_000);
});
```

- [ ] **Step 2: Run locally (skipped in CI)**

Run: `npm run test -- tests/integration/t2/gate/t2LiveSmoke.test.ts`
Expected: SKIP (0 tests run)

Run: `RUN_LIVE_SMOKE=1 ELEVENLABS_API_KEY=... ELEVENLABS_AGENT_ID=... npm run test -- tests/integration/t2/gate/t2LiveSmoke.test.ts`
Expected: PASS when creds valid

- [ ] **Step 3: Commit**

```bash
git add tests/integration/t2/gate/t2LiveSmoke.test.ts
git commit -m "test(I2): optional RUN_LIVE_SMOKE adapter smoke tests"
```

---

### Task 4: Documented demo script

**Files:**
- Create: `docs/demo/t2-live-demo.md`
- Create: `scripts/demo/t2-live-demo.sh`

- [ ] **Step 1: Write demo markdown**

`docs/demo/t2-live-demo.md` must include:
1. Prerequisites: `.env.local` with Twilio + ElevenLabs keys
2. Set `USE_SIMULATED_SPEECH=false`, `USE_SIMULATED_TELEPHONY=false`, `NEXT_PUBLIC_USE_FAKE_REALTIME=false`
3. Steps: `npm run dev` → intake → confirm → start calls → open `/calls/[jobId]` → open report drilldowns
4. Rollback: reset env to simulated for CI parity

- [ ] **Step 2: Write executable demo script**

```bash
#!/usr/bin/env bash
# scripts/demo/t2-live-demo.sh
set -euo pipefail

export USE_SIMULATED_SPEECH="${USE_SIMULATED_SPEECH:-false}"
export USE_SIMULATED_TELEPHONY="${USE_SIMULATED_TELEPHONY:-false}"
export NEXT_PUBLIC_USE_FAKE_REALTIME="${NEXT_PUBLIC_USE_FAKE_REALTIME:-false}"

echo "=== T2 Live Demo — The Negotiator ==="
echo "1. Starting dev server (background)..."
npm run dev &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null || true' EXIT
sleep 5

BASE="http://localhost:3000"
echo "2. Creating intake job..."
JOB=$(curl -sf -X POST "$BASE/api/intake/start" -H 'content-type: application/json' -d '{"geo":"Austin, TX"}')
JOB_ID=$(echo "$JOB" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).jobSpecId')

echo "3. Confirming job spec $JOB_ID..."
curl -sf -X POST "$BASE/api/job-specs/$JOB_ID/confirm" >/dev/null

echo "4. Starting calls..."
curl -sf -X POST "$BASE/api/calls/$JOB_ID/start" >/dev/null

echo "5. Open live dashboard: $BASE/calls/$JOB_ID"
echo "6. Open report:         $BASE/report/$JOB_ID"
echo "Demo ready. Press Ctrl+C to stop."
wait $DEV_PID
```

- [ ] **Step 3: Make script executable and smoke-test help output**

Run: `chmod +x scripts/demo/t2-live-demo.sh && head -5 scripts/demo/t2-live-demo.sh`
Expected: shebang + set -euo pipefail visible

- [ ] **Step 4: Commit**

```bash
git add docs/demo/t2-live-demo.md scripts/demo/t2-live-demo.sh docs/architecture/layers/application.md
git commit -m "docs(I2): T2 live demo script and judge runbook"
```

---

## T2 gate checklist (executable — must all pass in CI)

- [ ] **G1:** `createContainer()` defaults to fake speech + simulated telephony
- [ ] **G2:** Full negotiation produces `ReportPrimary` + `ReportDrilldowns` + ≥3 call rows
- [ ] **G3:** ≥1 audit event with `priceAfter < priceBefore`
- [ ] **G4:** Playwright `t2-gate-simulated.spec.ts` green
- [ ] **G5:** Live dashboard shows call rows (polling transport in CI)
- [ ] **G6:** Report D/E/F expanders enabled (not `aria-disabled`)
- [ ] **G7:** `npm run ci` green on `integration/PR-I2-t2-integration`
- [ ] **L1:** (optional) `RUN_LIVE_SMOKE=1` passes locally with real creds

---

## Definition of done

- [ ] All T2 packages integrated; domain unchanged
- [ ] CI uses simulated adapters exclusively
- [ ] Demo script documented for judge live path
- [ ] No T3 work until this PR merges
