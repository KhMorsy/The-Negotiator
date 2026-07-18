# PR-A6 ElevenLabs SpeechAgent Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ElevenLabsAgentAdapter` implementing the existing `SpeechAgent` port for real intake voice sessions, while keeping `createFakeSpeechAgent()` as the CI default — domain and `IntakeOrchestrator` unchanged (LSP).

**Architecture:** Adapter-only swap in `createContainer.ts`: when `USE_SIMULATED_SPEECH !== "false"` and env secrets are absent, wire fake; otherwise wire ElevenLabs REST client. Shared contract suite in `tests/contracts/ports/speech-agent.contract.test.ts` must pass for both adapters. No changes to `src/domain/**` or orchestrator method signatures.

**Tech Stack:** Next.js 15 · TypeScript · Vitest contract tests · ElevenLabs Agents API

## Global Constraints

- **LSP:** `IntakeOrchestrator` and domain consume only `SpeechAgent`; this PR adds a real adapter behind the same port.
- **CI default:** `USE_SIMULATED_SPEECH` unset or `"true"` → fake adapter; zero ElevenLabs secrets in CI.
- **Live tests:** opt-in via `RUN_LIVE_ADAPTER_TESTS=1` locally only.
- Branch naming: `lane-a/PR-A6-elevenlabs-speech`.
- **Depends on:** **PR-I1** (T1 gate merged; composition root + intake flow exist).

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

## Port signature (locked — do not rename)

```typescript
// src/contracts/ports/speech-agent.ts
export interface SpeechAgent {
  startIntakeSession(jobSpecDraftId: string): Promise<{ sessionId: string }>;
  getIntakeTranscript(sessionId: string): Promise<{
    turns: Array<{ role: string; text: string }>;
  }>;
}
```

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/adapters/speech/elevenLabsAgent.ts` |
| Create | `src/adapters/speech/elevenLabsClient.ts` |
| Create | `tests/contracts/ports/speech-agent.contract.test.ts` |
| Create | `tests/unit/adapters/speech/elevenLabsAgent.test.ts` |
| Modify | `src/app/composition/createContainer.ts` |
| Modify | `.env.example` |
| Modify | `docs/architecture/layers/adapters.md` |

---

### Task 1: Shared SpeechAgent contract suite

**Files:**
- Create: `tests/contracts/ports/speech-agent.contract.test.ts`

**Interfaces:**
- Consumes: factory `(name: string) => SpeechAgent` registered per adapter
- Produces: reusable `runSpeechAgentContract(speechAgent: SpeechAgent)` helper

- [ ] **Step 1: Write the failing contract test**

```typescript
// tests/contracts/ports/speech-agent.contract.test.ts
import { describe, it, expect } from "vitest";
import type { SpeechAgent } from "@/contracts";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";

export function runSpeechAgentContract(
  label: string,
  factory: () => SpeechAgent
) {
  describe(`SpeechAgent contract — ${label}`, () => {
    it("startIntakeSession returns a non-empty sessionId", async () => {
      const agent = factory();
      const { sessionId } = await agent.startIntakeSession("draft-job-1");
      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe("string");
    });

    it("getIntakeTranscript returns turns array after session start", async () => {
      const agent = factory();
      const { sessionId } = await agent.startIntakeSession("draft-job-2");
      const transcript = await agent.getIntakeTranscript(sessionId);
      expect(Array.isArray(transcript.turns)).toBe(true);
      expect(transcript.turns.length).toBeGreaterThan(0);
      expect(transcript.turns[0]).toHaveProperty("role");
      expect(transcript.turns[0]).toHaveProperty("text");
    });
  });
}

runSpeechAgentContract("fake", createFakeSpeechAgent);
```

- [ ] **Step 2: Run test to verify it passes for fake**

Run: `npm run test -- tests/contracts/ports/speech-agent.contract.test.ts`
Expected: PASS (2 tests) — fake already satisfies port from PR-B2

- [ ] **Step 3: Commit contract harness**

```bash
git add tests/contracts/ports/speech-agent.contract.test.ts
git commit -m "test(A6): add SpeechAgent port contract suite"
```

---

### Task 2: ElevenLabsAgentAdapter (HTTP client + adapter)

**Files:**
- Create: `src/adapters/speech/elevenLabsClient.ts`
- Create: `src/adapters/speech/elevenLabsAgent.ts`
- Create: `tests/unit/adapters/speech/elevenLabsAgent.test.ts`

**Interfaces:**
- Consumes: `SpeechAgent` port, env `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`
- Produces: `createElevenLabsAgentAdapter(): SpeechAgent`

- [ ] **Step 1: Write the failing unit test (mocked HTTP)**

```typescript
// tests/unit/adapters/speech/elevenLabsAgent.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";

describe("createElevenLabsAgentAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-123");
  });

  it("maps ElevenLabs conversation response to SpeechAgent transcript shape", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversation_id: "conv-abc" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transcript: [
            { role: "agent", message: "How many bedrooms?" },
            { role: "user", message: "Three bedrooms." },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const agent = createElevenLabsAgentAdapter();
    const { sessionId } = await agent.startIntakeSession("draft-1");
    expect(sessionId).toBe("conv-abc");

    const { turns } = await agent.getIntakeTranscript(sessionId);
    expect(turns).toEqual([
      { role: "agent", text: "How many bedrooms?" },
      { role: "user", text: "Three bedrooms." },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/speech/elevenLabsAgent.test.ts`
Expected: FAIL with `Cannot find module '@/adapters/speech/elevenLabsAgent'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/speech/elevenLabsClient.ts
export type ElevenLabsClient = {
  startConversation(agentId: string, metadata: Record<string, string>): Promise<{ conversationId: string }>;
  getTranscript(conversationId: string): Promise<Array<{ role: string; message: string }>>;
};

export function createElevenLabsHttpClient(apiKey: string): ElevenLabsClient {
  const base = "https://api.elevenlabs.io/v1/convai/conversations";
  const headers = {
    "content-type": "application/json",
    "xi-api-key": apiKey,
  };

  return {
    async startConversation(agentId, metadata) {
      const res = await fetch(`${base}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ agent_id: agentId, metadata }),
      });
      if (!res.ok) throw new Error(`ElevenLabs start failed: ${res.status}`);
      const body = (await res.json()) as { conversation_id: string };
      return { conversationId: body.conversation_id };
    },
    async getTranscript(conversationId) {
      const res = await fetch(`${base}/${conversationId}`, { headers });
      if (!res.ok) throw new Error(`ElevenLabs transcript failed: ${res.status}`);
      const body = (await res.json()) as {
        transcript: Array<{ role: string; message: string }>;
      };
      return body.transcript;
    },
  };
}
```

```typescript
// src/adapters/speech/elevenLabsAgent.ts
import type { SpeechAgent } from "@/contracts";
import { createElevenLabsHttpClient } from "./elevenLabsClient";

export function createElevenLabsAgentAdapter(): SpeechAgent {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID required");
  }
  const client = createElevenLabsHttpClient(apiKey);

  return {
    async startIntakeSession(jobSpecDraftId) {
      const { conversationId } = await client.startConversation(agentId, {
        jobSpecDraftId,
      });
      return { sessionId: conversationId };
    },
    async getIntakeTranscript(sessionId) {
      const raw = await client.getTranscript(sessionId);
      return {
        turns: raw.map((t) => ({ role: t.role, text: t.message })),
      };
    },
  };
}
```

- [ ] **Step 4: Run unit test to verify it passes**

Run: `npm run test -- tests/unit/adapters/speech/elevenLabsAgent.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Register ElevenLabs adapter in contract suite**

Append to `tests/contracts/ports/speech-agent.contract.test.ts`:

```typescript
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";
import { vi } from "vitest";

describe("SpeechAgent contract — elevenlabs (mocked HTTP)", () => {
  beforeEach(() => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-123");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversation_id: "conv-contract" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transcript: [{ role: "agent", message: "Hello" }],
        }),
      }));
  });

  runSpeechAgentContract("elevenlabs-mocked", createElevenLabsAgentAdapter);
});
```

Run: `npm run test -- tests/contracts/ports/speech-agent.contract.test.ts`
Expected: PASS (4 tests total)

- [ ] **Step 6: Commit**

```bash
git add src/adapters/speech/elevenLabsClient.ts src/adapters/speech/elevenLabsAgent.ts tests/unit/adapters/speech/elevenLabsAgent.test.ts tests/contracts/ports/speech-agent.contract.test.ts
git commit -m "feat(A6): ElevenLabsAgentAdapter implements SpeechAgent port"
```

---

### Task 3: Composition root env switch (fake remains CI default)

**Files:**
- Modify: `src/app/composition/createContainer.ts`
- Modify: `.env.example`
- Create: `tests/integration/t2/speechAdapterSelection.test.ts`

**Interfaces:**
- Consumes: `createFakeSpeechAgent`, `createElevenLabsAgentAdapter`
- Produces: `selectSpeechAgent(): SpeechAgent` used only inside composition root

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/integration/t2/speechAdapterSelection.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resetContainerForTests, createContainer } from "@/app/composition/createContainer";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";

describe("speech adapter selection", () => {
  beforeEach(() => resetContainerForTests());
  afterEach(() => {
    delete process.env.USE_SIMULATED_SPEECH;
    delete process.env.ELEVENLABS_API_KEY;
  });

  it("defaults to fake SpeechAgent when USE_SIMULATED_SPEECH unset", () => {
    const c = createContainer();
    expect(c.speechAgentKind).toBe("fake");
  });

  it("selects elevenlabs only when USE_SIMULATED_SPEECH=false and keys present", () => {
    process.env.USE_SIMULATED_SPEECH = "false";
    process.env.ELEVENLABS_API_KEY = "k";
    process.env.ELEVENLABS_AGENT_ID = "a";
    const c = createContainer();
    expect(c.speechAgentKind).toBe("elevenlabs");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/t2/speechAdapterSelection.test.ts`
Expected: FAIL — `speechAgentKind` not exposed

- [ ] **Step 3: Wire selection in createContainer**

Add to `src/app/composition/createContainer.ts`:

```typescript
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";

function selectSpeechAgent(): { agent: SpeechAgent; kind: "fake" | "elevenlabs" } {
  const useSimulated =
    process.env.USE_SIMULATED_SPEECH !== "false" ||
    !process.env.ELEVENLABS_API_KEY ||
    !process.env.ELEVENLABS_AGENT_ID;
  if (useSimulated) {
    return { agent: createFakeSpeechAgent(), kind: "fake" };
  }
  return { agent: createElevenLabsAgentAdapter(), kind: "elevenlabs" };
}
```

Replace direct `createFakeSpeechAgent()` in `buildContainer()` with `selectSpeechAgent()` and expose `speechAgentKind` on returned container for tests only.

Add to `.env.example`:

```
USE_SIMULATED_SPEECH=true
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/t2/speechAdapterSelection.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Run full CI (simulated path unchanged)**

Run: `npm run ci`
Expected: PASS — all tests still use fake speech

- [ ] **Step 6: Commit**

```bash
git add src/app/composition/createContainer.ts .env.example tests/integration/t2/speechAdapterSelection.test.ts docs/architecture/layers/adapters.md
git commit -m "feat(A6): env-select SpeechAgent adapter; fake remains CI default"
```

---

## Definition of done

- [ ] `ElevenLabsAgentAdapter` implements `SpeechAgent` with no domain changes
- [ ] Contract suite passes for fake and mocked ElevenLabs adapter
- [ ] `USE_SIMULATED_SPEECH` defaults to simulated/fake in CI
- [ ] `npm run ci` green on `lane-a/PR-A6-elevenlabs-speech`
