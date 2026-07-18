# PR-A5: Webhooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Next.js webhook route handlers for ElevenLabs agent tool calls (skill selection) and call transcript events (quote extraction), delegating to `chooseNextSkill` and `extractQuote` with fake adapters in CI integration tests.

**Architecture:** Thin routes under `src/app/api/webhooks/` parse JSON payloads and call application services in `src/app/webhooks/`. Composition root `src/app/composition/createTestContainer.ts` builds fake repos, fake LLM, and in-memory KB for tests. Production wiring uses the same services with env-selected adapters in `createContainer.ts`.

**Tech Stack:** Next.js 15 App Router · TypeScript · Vitest integration tests · fake adapters only in CI

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

**Layer docs:** [application.md](../../../architecture/layers/application.md) · [domain.md](../../../architecture/layers/domain.md) · [adapters.md](../../../architecture/layers/adapters.md)

**Branch:** `lane-a/PR-A5-webhooks`

**Depends on:** PR-A1 (repos), PR-A2 (`chooseNextSkill`), PR-A3 (`extractQuote`), PR-A4 (`createInMemoryKb`)

---

## Domain functions consumed (exact signatures)

```typescript
// from PR-A2
export async function chooseNextSkill(
  deps: {
    planner: LLMPlanner;
    kb: KnowledgeBase;
    auditRepo: AuditRepository;
  },
  input: {
    callId: string;
    skills: Skill[];
    context: { jobSpec: JobSpec; quotesInHand: Quote[] };
    lastVendorUtterance: string;
    priceBefore: number | null;
    priceAfter?: number | null;
  }
): Promise<{
  skillId: string;
  suggestedPhrasing: string;
  eligibleSkillIds: string[];
  auditEvent: AuditEvent;
}>;

// from PR-A3
export async function extractQuote(
  deps: { parser: LLMParser; quoteRepo: QuoteRepository },
  input: {
    callId: string;
    jobSpec: JobSpec;
    vendorId: string;
    round: CallRound;
    transcript: { turns: Array<{ role: string; text: string }> };
  }
): Promise<Quote>;
```

---

### Task 1: Test composition container (fake adapters)

**Files:**
- Create: `src/app/composition/createTestContainer.ts`
- Create: `src/adapters/fake/fakeLlmPlanner.ts`
- Test: `tests/unit/app/composition/createTestContainer.test.ts`

**Interfaces:**
- Consumes: `createInMemoryRepos`, `createInMemoryKb`, `createFakeLlmParser`, `createFakeLlmPlanner`
- Produces:

```typescript
export interface AppContainer {
  repos: ReturnType<typeof createInMemoryRepos>;
  kb: KnowledgeBase;
  planner: LLMPlanner;
  parser: LLMParser;
  skills: Skill[];
}

export function createTestContainer(): AppContainer;
```

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/app/composition/createTestContainer.test.ts
import { describe, it, expect } from "vitest";
import { createTestContainer } from "@/app/composition/createTestContainer";

describe("createTestContainer", () => {
  it("wires fake repos, kb, planner, parser, and 12 skills", () => {
    const c = createTestContainer();
    expect(c.repos.jobSpecs).toBeDefined();
    expect(c.kb).toBeDefined();
    expect(c.planner).toBeDefined();
    expect(c.parser).toBeDefined();
    expect(c.skills.length).toBe(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app/composition/createTestContainer.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write fake planner + test container**

```typescript
// src/adapters/fake/fakeLlmPlanner.ts
import type { LLMPlanner } from "@/contracts";

export function createFakeLlmPlanner(
  pickSkillId?: string
): LLMPlanner {
  return {
    async chooseSkill({ eligibleSkills }) {
      const skillId = pickSkillId ?? eligibleSkills[0]!.id;
      return {
        skillId,
        suggestedPhrasing: `Applying skill ${skillId}`,
      };
    },
  };
}
```

```typescript
// src/app/composition/createTestContainer.ts
import { createInMemoryRepos } from "@/adapters/fake/inMemoryRepos";
import { createInMemoryKb } from "@/adapters/fake/inMemoryKb";
import { createFakeLlmParser } from "@/adapters/fake/fakeLlmParser";
import { createFakeLlmPlanner } from "@/adapters/fake/fakeLlmPlanner";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";
import type { KnowledgeBase, LLMParser, LLMPlanner, Skill } from "@/contracts";

export interface AppContainer {
  repos: ReturnType<typeof createInMemoryRepos>;
  kb: KnowledgeBase;
  planner: LLMPlanner;
  parser: LLMParser;
  skills: Skill[];
}

export function createTestContainer(): AppContainer {
  return {
    repos: createInMemoryRepos(),
    kb: createInMemoryKb(),
    planner: createFakeLlmPlanner(),
    parser: createFakeLlmParser(),
    skills: loadHomeCleaningSkills(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/app/composition/createTestContainer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/composition/createTestContainer.ts src/adapters/fake/fakeLlmPlanner.ts tests/unit/app/composition/createTestContainer.test.ts
git commit -m "feat(composition): add test container with fake adapters"
```

---

### Task 2: ElevenLabs webhook service — skill tool handler

**Files:**
- Create: `src/app/webhooks/handleSkillToolCall.ts`
- Create: `src/app/webhooks/types.ts`
- Test: `tests/unit/app/webhooks/handleSkillToolCall.test.ts`

**Interfaces:**
- Consumes: `chooseNextSkill`, `AppContainer` deps
- Produces:

```typescript
export interface SkillToolCallPayload {
  callId: string;
  jobSpec: JobSpec;
  quotesInHand: Quote[];
  lastVendorUtterance: string;
  priceBefore: number | null;
}

export async function handleSkillToolCall(
  container: AppContainer,
  payload: SkillToolCallPayload
): Promise<{
  skillId: string;
  suggestedPhrasing: string;
  eligibleSkillIds: string[];
}>;
```

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/app/webhooks/handleSkillToolCall.test.ts
import { describe, it, expect } from "vitest";
import { handleSkillToolCall } from "@/app/webhooks/handleSkillToolCall";
import { createTestContainer } from "@/app/composition/createTestContainer";
import type { JobSpec } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-1",
  jobType: "deep_clean",
  sqft: 1200,
  bedrooms: 2,
  bathrooms: 2,
  frequency: "once",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Oakland, CA",
  confirmed: true,
};

describe("handleSkillToolCall", () => {
  it("returns planner move and writes audit event", async () => {
    const container = createTestContainer();

    const result = await handleSkillToolCall(container, {
      callId: "call-1",
      jobSpec,
      quotesInHand: [],
      lastVendorUtterance: "Trip fee is $35",
      priceBefore: 235,
    });

    expect(result.skillId).toBeTruthy();
    expect(result.suggestedPhrasing).toContain(result.skillId);
    expect(result.eligibleSkillIds).not.toContain("leverage_competing_bid");

    const audit = await container.repos.audit.listByCall("call-1");
    expect(audit).toHaveLength(1);
    expect(audit[0].skillId).toBe(result.skillId);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app/webhooks/handleSkillToolCall.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/app/webhooks/types.ts
export type { AppContainer } from "@/app/composition/createTestContainer";
```

```typescript
// src/app/webhooks/handleSkillToolCall.ts
import { chooseNextSkill } from "@/domain/skills/skillEngine";
import type { JobSpec, Quote } from "@/contracts";
import type { AppContainer } from "./types";

export interface SkillToolCallPayload {
  callId: string;
  jobSpec: JobSpec;
  quotesInHand: Quote[];
  lastVendorUtterance: string;
  priceBefore: number | null;
}

export async function handleSkillToolCall(
  container: AppContainer,
  payload: SkillToolCallPayload
) {
  const result = await chooseNextSkill(
    {
      planner: container.planner,
      kb: container.kb,
      auditRepo: container.repos.audit,
    },
    {
      callId: payload.callId,
      skills: container.skills,
      context: {
        jobSpec: payload.jobSpec,
        quotesInHand: payload.quotesInHand,
      },
      lastVendorUtterance: payload.lastVendorUtterance,
      priceBefore: payload.priceBefore,
    }
  );

  return {
    skillId: result.skillId,
    suggestedPhrasing: result.suggestedPhrasing,
    eligibleSkillIds: result.eligibleSkillIds,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/app/webhooks/handleSkillToolCall.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/webhooks/handleSkillToolCall.ts src/app/webhooks/types.ts tests/unit/app/webhooks/handleSkillToolCall.test.ts
git commit -m "feat(webhooks): add skill tool call handler service"
```

---

### Task 3: Transcript webhook service — quote extraction

**Files:**
- Create: `src/app/webhooks/handleTranscriptEvent.ts`
- Test: `tests/unit/app/webhooks/handleTranscriptEvent.test.ts`

**Interfaces:**
- Consumes: `extractQuote`, `AppContainer`
- Produces:

```typescript
export interface TranscriptEventPayload {
  callId: string;
  jobSpec: JobSpec;
  vendorId: string;
  round: CallRound;
  transcript: { turns: Array<{ role: string; text: string }> };
}

export async function handleTranscriptEvent(
  container: AppContainer,
  payload: TranscriptEventPayload
): Promise<Quote>;
```

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/app/webhooks/handleTranscriptEvent.test.ts
import { describe, it, expect } from "vitest";
import { handleTranscriptEvent } from "@/app/webhooks/handleTranscriptEvent";
import { createTestContainer } from "@/app/composition/createTestContainer";
import type { JobSpec } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-1",
  jobType: "deep_clean",
  sqft: 1200,
  bedrooms: 2,
  bathrooms: 2,
  frequency: "once",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Oakland, CA",
  confirmed: true,
};

describe("handleTranscriptEvent", () => {
  it("extracts and persists quote from transcript", async () => {
    const container = createTestContainer();

    const quote = await handleTranscriptEvent(container, {
      callId: "call-1",
      jobSpec,
      vendorId: "vendor-1",
      round: 1,
      transcript: {
        turns: [
          { role: "vendor", text: "We charge $200 base plus a $35 trip fee." },
        ],
      },
    });

    expect(quote.normalizedTotal).toBe(235);
    const listed = await container.repos.quotes.listByJobSpec(jobSpec.id);
    expect(listed).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/app/webhooks/handleTranscriptEvent.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/app/webhooks/handleTranscriptEvent.ts
import { extractQuote } from "@/domain/quotes/extractQuote";
import type { CallRound, JobSpec, Quote } from "@/contracts";
import type { AppContainer } from "./types";

export interface TranscriptEventPayload {
  callId: string;
  jobSpec: JobSpec;
  vendorId: string;
  round: CallRound;
  transcript: { turns: Array<{ role: string; text: string }> };
}

export async function handleTranscriptEvent(
  container: AppContainer,
  payload: TranscriptEventPayload
): Promise<Quote> {
  return extractQuote(
    {
      parser: container.parser,
      quoteRepo: container.repos.quotes,
    },
    payload
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/app/webhooks/handleTranscriptEvent.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/webhooks/handleTranscriptEvent.ts tests/unit/app/webhooks/handleTranscriptEvent.test.ts
git commit -m "feat(webhooks): add transcript quote extraction handler"
```

---

### Task 4: Next.js route handler `src/app/api/webhooks/elevenlabs/route.ts`

**Files:**
- Create: `src/app/api/webhooks/elevenlabs/route.ts`
- Create: `src/app/composition/createContainer.ts`
- Test: `tests/integration/webhooks/elevenlabs.route.test.ts`

**Interfaces:**
- Consumes: `handleSkillToolCall`, `handleTranscriptEvent`, `createContainer`
- Produces: HTTP POST handler accepting ElevenLabs-style JSON:

```typescript
type ElevenLabsWebhookBody =
  | {
      type: "skill_tool_call";
      callId: string;
      jobSpec: JobSpec;
      quotesInHand?: Quote[];
      lastVendorUtterance: string;
      priceBefore: number | null;
    }
  | {
      type: "transcript_complete";
      callId: string;
      jobSpec: JobSpec;
      vendorId: string;
      round: CallRound;
      transcript: { turns: Array<{ role: string; text: string }> };
    };
```

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/integration/webhooks/elevenlabs.route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/webhooks/elevenlabs/route";
import type { JobSpec } from "@/contracts";

vi.mock("@/app/composition/createContainer", () => ({
  createContainer: () => {
    const { createTestContainer } = require("@/app/composition/createTestContainer");
    return createTestContainer();
  },
}));

const jobSpec: JobSpec = {
  id: "job-1",
  jobType: "deep_clean",
  sqft: 1200,
  bedrooms: 2,
  bathrooms: 2,
  frequency: "once",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Oakland, CA",
  confirmed: true,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/webhooks/elevenlabs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/elevenlabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles skill_tool_call", async () => {
    const res = await POST(
      makeRequest({
        type: "skill_tool_call",
        callId: "call-1",
        jobSpec,
        quotesInHand: [],
        lastVendorUtterance: "Trip fee $35",
        priceBefore: 235,
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skillId).toBeTruthy();
    expect(json.eligibleSkillIds).not.toContain("leverage_competing_bid");
  });

  it("handles transcript_complete", async () => {
    const res = await POST(
      makeRequest({
        type: "transcript_complete",
        callId: "call-2",
        jobSpec,
        vendorId: "vendor-1",
        round: 1,
        transcript: {
          turns: [
            { role: "vendor", text: "We charge $200 base plus a $35 trip fee." },
          ],
        },
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.quote.normalizedTotal).toBe(235);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/webhooks/elevenlabs.route.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write route + production container stub**

```typescript
// src/app/composition/createContainer.ts
import { createTestContainer, type AppContainer } from "./createTestContainer";

/** Production wiring: swap fakes for Supabase/OpenAI when env vars present */
export function createContainer(): AppContainer {
  if (process.env.USE_FAKE_ADAPTERS !== "false") {
    return createTestContainer();
  }
  return createTestContainer();
}
```

```typescript
// src/app/api/webhooks/elevenlabs/route.ts
import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";
import { handleSkillToolCall } from "@/app/webhooks/handleSkillToolCall";
import { handleTranscriptEvent } from "@/app/webhooks/handleTranscriptEvent";
import type { CallRound, JobSpec, Quote } from "@/contracts";

type ElevenLabsWebhookBody =
  | {
      type: "skill_tool_call";
      callId: string;
      jobSpec: JobSpec;
      quotesInHand?: Quote[];
      lastVendorUtterance: string;
      priceBefore: number | null;
    }
  | {
      type: "transcript_complete";
      callId: string;
      jobSpec: JobSpec;
      vendorId: string;
      round: CallRound;
      transcript: { turns: Array<{ role: string; text: string }> };
    };

export async function POST(request: Request) {
  const body = (await request.json()) as ElevenLabsWebhookBody;
  const container = createContainer();

  if (body.type === "skill_tool_call") {
    const result = await handleSkillToolCall(container, {
      callId: body.callId,
      jobSpec: body.jobSpec,
      quotesInHand: body.quotesInHand ?? [],
      lastVendorUtterance: body.lastVendorUtterance,
      priceBefore: body.priceBefore,
    });
    return NextResponse.json(result);
  }

  if (body.type === "transcript_complete") {
    const quote = await handleTranscriptEvent(container, {
      callId: body.callId,
      jobSpec: body.jobSpec,
      vendorId: body.vendorId,
      round: body.round,
      transcript: body.transcript,
    });
    return NextResponse.json({ quote });
  }

  return NextResponse.json({ error: "unsupported event type" }, { status: 400 });
}
```

- [ ] **Step 4: Run integration test to verify it passes**

Run: `npm run test -- tests/integration/webhooks/elevenlabs.route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Update application layer doc**

Add webhook routes and handlers to `docs/architecture/layers/application.md`:
- `src/app/api/webhooks/elevenlabs/route.ts`
- `src/app/webhooks/handleSkillToolCall.ts`
- `src/app/webhooks/handleTranscriptEvent.ts`
- `src/app/composition/createContainer.ts`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/webhooks/elevenlabs/route.ts src/app/composition/createContainer.ts tests/integration/webhooks/elevenlabs.route.test.ts docs/architecture/layers/application.md
git commit -m "feat(webhooks): add ElevenLabs route for skill tool and transcript events"
```

---

### Task 5: End-to-end integration — skill then quote on same call

**Files:**
- Modify: `tests/integration/webhooks/elevenlabs.route.test.ts`

**Interfaces:**
- Consumes: full webhook flow with shared `callId`

- [ ] **Step 1: Add combined flow test**

Append to `tests/integration/webhooks/elevenlabs.route.test.ts`:

```typescript
  it("skill tool then transcript on same call persists audit and quote", async () => {
    const skillRes = await POST(
      makeRequest({
        type: "skill_tool_call",
        callId: "call-flow-1",
        jobSpec,
        quotesInHand: [],
        lastVendorUtterance: "Total is $280 with trip fee",
        priceBefore: 280,
      })
    );
    expect(skillRes.status).toBe(200);

    const quoteRes = await POST(
      makeRequest({
        type: "transcript_complete",
        callId: "call-flow-1",
        jobSpec,
        vendorId: "vendor-1",
        round: 1,
        transcript: {
          turns: [
            { role: "vendor", text: "We charge $200 base plus a $35 trip fee." },
          ],
        },
      })
    );
    expect(quoteRes.status).toBe(200);
    const quoteJson = await quoteRes.json();
    expect(quoteJson.quote.normalizedTotal).toBe(235);
  });
```

- [ ] **Step 2: Run full integration suite**

Run: `npm run test -- tests/integration/webhooks/`
Expected: PASS (3 tests)

- [ ] **Step 3: Run full CI locally**

Run: `npm run ci`
Expected: all steps green

- [ ] **Step 4: Commit**

```bash
git add tests/integration/webhooks/elevenlabs.route.test.ts
git commit -m "test(webhooks): add combined skill and quote integration flow"
```

---

## PR completion checklist

- [ ] `POST /api/webhooks/elevenlabs` handles `skill_tool_call` and `transcript_complete`
- [ ] Skill handler calls `skillEngine`; honesty gate blocks fake competing bid
- [ ] Transcript handler persists quote via `extractQuote`
- [ ] Integration tests use fake adapters only
- [ ] `npm run ci` green on `lane-a/PR-A5-webhooks`
- [ ] Application layer doc updated
