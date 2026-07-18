# PR-B6 Live Call Dashboard (Supabase Realtime) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/calls/[jobId]` live status UI with Supabase Realtime subscription on the `calls` table, plus a fake polling fallback for CI — no domain changes; frontend reads via `/api/calls/[jobId]/status` only.

**Architecture:** `CallStatusFeed` hook abstracts transport: Realtime channel when `NEXT_PUBLIC_USE_FAKE_REALTIME !== "true"`, else 2s polling against API backed by in-memory repo in CI. Call rows update via existing `CallRepository.updateOutcome` from orchestrator/webhooks; UI renders `CallOutcome | null` and round badge.

**Tech Stack:** Next.js 15 · React 19 · Supabase Realtime · Vitest · Playwright (simulated)

## Global Constraints

- **LSP:** Dashboard consumes HTTP + optional Realtime; does not import adapters or domain.
- **CI default:** `NEXT_PUBLIC_USE_FAKE_REALTIME=true` → polling against fake repo; no Supabase secrets in CI.
- Branch naming: `lane-b/PR-B6-live-dashboard`.
- **Depends on:** **PR-I1** (calls table/repo + orchestrator create call rows).

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

## Canonical types consumed

```typescript
// from master plan — do not rename
export type CallOutcome =
  | "itemized_quote"
  | "callback_commitment"
  | "documented_decline"
  | "voicemail"
  | "no_answer";

export type CallRound = 1 | 2;

export interface Call {
  id: string;
  jobSpecId: string;
  vendorId: string;
  round: CallRound;
  outcome: CallOutcome | null;
  recordingUrl: string | null;
}
```

---

## Files overview

| Action | Path |
|--------|------|
| Create | `app/api/calls/[jobId]/status/route.ts` |
| Create | `src/frontend/hooks/useCallStatusFeed.ts` |
| Create | `src/frontend/screens/LiveCallsScreen.tsx` |
| Create | `app/(ui)/calls/[jobId]/page.tsx` |
| Create | `src/adapters/fake/fakeCallStatusPoller.ts` |
| Create | `tests/unit/frontend/useCallStatusFeed.test.ts` |
| Create | `tests/e2e/t2-live-dashboard-polling.spec.ts` |
| Modify | `docs/architecture/layers/frontend.md` |

---

### Task 1: GET /api/calls/[jobId]/status

**Files:**
- Create: `app/api/calls/[jobId]/status/route.ts`
- Create: `tests/integration/t2/callStatusApi.test.ts`

**Interfaces:**
- Consumes: `CallRepository.listByJobSpec(jobSpecId): Promise<Call[]>`
- Produces: `GET /api/calls/[jobId]/status` → `{ calls: Call[] }`

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/integration/t2/callStatusApi.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, resetContainerForTests } from "@/app/composition/createContainer";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";

describe("GET /api/calls/[jobId]/status", () => {
  beforeEach(() => resetContainerForTests());

  it("returns call rows for job", async () => {
    const c = createContainer();
    const draft = buildJobSpec(
      { sqft: 1800, bedrooms: 3, bathrooms: 2, pets: false },
      {},
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }
    );
    const job = await c.jobSpecRepo.create(draft);
    await c.jobSpecRepo.confirm(job.id);
    await c.callOrchestrator.startRound1(job.id);

    const { GET } = await import("../../../../app/api/calls/[jobId]/status/route");
    const res = await GET(new Request("http://localhost/api/calls/x"), {
      params: Promise.resolve({ jobId: job.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.calls.length).toBeGreaterThanOrEqual(3);
    expect(body.calls[0]).toMatchObject({
      jobSpecId: job.id,
      round: 1,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/t2/callStatusApi.test.ts`
Expected: FAIL — route not found

- [ ] **Step 3: Implement route**

```typescript
// app/api/calls/[jobId]/status/route.ts
import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { callRepo } = createContainer();
  const calls = await callRepo.listByJobSpec(jobId);
  return NextResponse.json({ calls });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/t2/callStatusApi.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add app/api/calls/[jobId]/status/route.ts tests/integration/t2/callStatusApi.test.ts
git commit -m "feat(B6): GET /api/calls/[jobId]/status lists call rows"
```

---

### Task 2: useCallStatusFeed — Realtime vs fake polling

**Files:**
- Create: `src/frontend/hooks/useCallStatusFeed.ts`
- Create: `src/adapters/fake/fakeCallStatusPoller.ts`
- Create: `tests/unit/frontend/useCallStatusFeed.test.ts`

**Interfaces:**
- Consumes: `Call[]` from API or Realtime payload
- Produces:

```typescript
export function useCallStatusFeed(jobId: string): {
  calls: Call[];
  transport: "realtime" | "polling";
  loading: boolean;
};
```

- [ ] **Step 1: Write failing hook test (polling path)**

```typescript
// tests/unit/frontend/useCallStatusFeed.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCallStatusFeed } from "@/frontend/hooks/useCallStatusFeed";

describe("useCallStatusFeed", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_FAKE_REALTIME", "true");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          calls: [
            {
              id: "c1",
              jobSpecId: "job-1",
              vendorId: "vendor-tough",
              round: 1,
              outcome: null,
              recordingUrl: null,
            },
          ],
        }),
      })
    );
  });

  it("uses polling when NEXT_PUBLIC_USE_FAKE_REALTIME=true", async () => {
    const { result } = renderHook(() => useCallStatusFeed("job-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.transport).toBe("polling");
    expect(result.current.calls).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/frontend/useCallStatusFeed.test.ts`
Expected: FAIL — hook not found

- [ ] **Step 3: Implement hook + fake poller**

```typescript
// src/adapters/fake/fakeCallStatusPoller.ts
export async function pollCallStatus(jobId: string): Promise<Response> {
  return fetch(`/api/calls/${jobId}/status`, { cache: "no-store" });
}
```

```typescript
// src/frontend/hooks/useCallStatusFeed.ts
"use client";

import { useEffect, useState } from "react";
import type { Call } from "@/contracts";
import { pollCallStatus } from "@/adapters/fake/fakeCallStatusPoller";

const POLL_MS = 2000;

export function useCallStatusFeed(jobId: string) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const usePolling = process.env.NEXT_PUBLIC_USE_FAKE_REALTIME === "true";

  useEffect(() => {
    let cancelled = false;

    async function loadOnce() {
      const res = await pollCallStatus(jobId);
      const body = (await res.json()) as { calls: Call[] };
      if (!cancelled) {
        setCalls(body.calls);
        setLoading(false);
      }
    }

    if (usePolling) {
      loadOnce();
      const id = setInterval(loadOnce, POLL_MS);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }

    /* Realtime path: dynamic import @supabase/supabase-js, subscribe postgres_changes on calls filtered by job_spec_id */
    import("@/frontend/lib/supabaseBrowser").then(({ subscribeCalls }) => {
      return subscribeCalls(jobId, (next) => {
        if (!cancelled) {
          setCalls(next);
          setLoading(false);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [jobId, usePolling]);

  return {
    calls,
    loading,
    transport: usePolling ? ("polling" as const) : ("realtime" as const),
  };
}
```

Create `src/frontend/lib/supabaseBrowser.ts` with `subscribeCalls(jobId, onUpdate)` wrapping Realtime channel `calls:jobId`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/frontend/useCallStatusFeed.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/hooks/useCallStatusFeed.ts src/adapters/fake/fakeCallStatusPoller.ts src/frontend/lib/supabaseBrowser.ts tests/unit/frontend/useCallStatusFeed.test.ts
git commit -m "feat(B6): useCallStatusFeed with Realtime or CI polling fallback"
```

---

### Task 3: LiveCallsScreen UI

**Files:**
- Create: `src/frontend/screens/LiveCallsScreen.tsx`
- Create: `app/(ui)/calls/[jobId]/page.tsx`
- Create: `tests/unit/frontend/liveCallsScreen.test.tsx`

**Interfaces:**
- Consumes: `useCallStatusFeed(jobId)`
- Produces: UI with `data-testid="live-call-row"` per call, outcome badge when set

- [ ] **Step 1: Write failing component test**

```tsx
// tests/unit/frontend/liveCallsScreen.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveCallsScreen } from "@/frontend/screens/LiveCallsScreen";

vi.mock("@/frontend/hooks/useCallStatusFeed", () => ({
  useCallStatusFeed: () => ({
    calls: [
      {
        id: "c1",
        jobSpecId: "job-1",
        vendorId: "vendor-tough",
        round: 1,
        outcome: "itemized_quote",
        recordingUrl: null,
      },
    ],
    transport: "polling",
    loading: false,
  }),
}));

describe("LiveCallsScreen", () => {
  it("renders call rows with outcome badge", () => {
    render(<LiveCallsScreen jobId="job-1" />);
    expect(screen.getByTestId("live-call-row")).toBeInTheDocument();
    expect(screen.getByText(/itemized quote/i)).toBeInTheDocument();
    expect(screen.getByTestId("live-transport-mode")).toHaveTextContent("polling");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/frontend/liveCallsScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement screen + page**

```tsx
// src/frontend/screens/LiveCallsScreen.tsx
"use client";

import { useCallStatusFeed } from "@/frontend/hooks/useCallStatusFeed";

export function LiveCallsScreen({ jobId }: { jobId: string }) {
  const { calls, loading, transport } = useCallStatusFeed(jobId);

  if (loading) {
    return <p data-testid="live-calls-loading">Loading call status…</p>;
  }

  return (
    <section className="space-y-4" data-testid="live-calls-screen">
      <h1 className="text-2xl font-semibold">Live calls</h1>
      <p className="text-xs text-gray-500" data-testid="live-transport-mode">
        Transport: {transport}
      </p>
      <ul className="space-y-2">
        {calls.map((call) => (
          <li
            key={call.id}
            data-testid="live-call-row"
            className="rounded border p-3"
          >
            <span className="font-medium">Round {call.round}</span> —{" "}
            {call.vendorId}
            {call.outcome ? (
              <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs">
                {call.outcome.replace(/_/g, " ")}
              </span>
            ) : (
              <span className="ml-2 text-xs text-amber-600">In progress</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// app/(ui)/calls/[jobId]/page.tsx
import { LiveCallsScreen } from "@/frontend/screens/LiveCallsScreen";

export default async function CallsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <LiveCallsScreen jobId={jobId} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/frontend/liveCallsScreen.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/screens/LiveCallsScreen.tsx app/(ui)/calls/[jobId]/page.tsx tests/unit/frontend/liveCallsScreen.test.tsx docs/architecture/layers/frontend.md
git commit -m "feat(B6): LiveCallsScreen at /calls/[jobId]"
```

---

### Task 4: Playwright e2e — polling path (CI default)

**Files:**
- Create: `tests/e2e/t2-live-dashboard-polling.spec.ts`

- [ ] **Step 1: Write e2e test**

```typescript
// tests/e2e/t2-live-dashboard-polling.spec.ts
import { test, expect } from "@playwright/test";

test("live dashboard shows call rows via polling (CI)", async ({
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
  await expect(page.getByTestId("live-calls-screen")).toBeVisible();
  await expect(page.getByTestId("live-call-row").first()).toBeVisible();
  await expect(page.getByTestId("live-transport-mode")).toContainText("polling");
});
```

- [ ] **Step 2: Run e2e**

Run: `npm run build && npm run test:e2e -- tests/e2e/t2-live-dashboard-polling.spec.ts`
Expected: PASS (1 test) with `NEXT_PUBLIC_USE_FAKE_REALTIME=true` in Playwright config

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/t2-live-dashboard-polling.spec.ts playwright.config.ts
git commit -m "test(B6): e2e live dashboard polling path for CI"
```

---

## Definition of done

- [ ] `/calls/[jobId]` renders live call rows
- [ ] Supabase Realtime wired behind env; fake polling is CI default
- [ ] No domain/adapter imports in frontend
- [ ] `npm run ci` green on `lane-b/PR-B6-live-dashboard`
