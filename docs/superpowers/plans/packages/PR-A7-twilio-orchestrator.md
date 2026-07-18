# PR-A7 Twilio Telephony Adapter + Recording Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `TwilioElevenLabsAdapter` implementing the existing `TelephonyProvider` port, wire it in `createContainer.ts` behind `USE_SIMULATED_TELEPHONY=false`, and persist golden call recordings to Supabase Storage — `CallOrchestrator` from PR-I1 stays unchanged (LSP).

**Architecture:** Real adapter delegates outbound dial to Twilio with ElevenLabs media stream URL. `storeGoldenRecording.ts` uploads MP3 bytes to `recordings/{callId}.mp3` and updates `CallRepository` with `recordingUrl`. Simulated adapter remains CI default; contract tests prove both adapters satisfy `TelephonyProvider`.

**Tech Stack:** Next.js 15 · Twilio REST SDK · Supabase Storage · Vitest · TypeScript

## Global Constraints

- **LSP:** `CallOrchestrator` depends only on `TelephonyProvider`; no orchestrator signature changes.
- **CI default:** `USE_SIMULATED_TELEPHONY` unset or `"true"` → `createSimulatedCallAdapter()`.
- **Live smoke:** `RUN_LIVE_ADAPTER_TESTS=1` locally with Twilio/ElevenLabs creds only.
- Branch naming: `lane-a/PR-A7-twilio-orchestrator`.
- **Depends on:** **PR-I1** (CallOrchestrator + SimulatedCallAdapter merged).

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

## Port signature (locked)

```typescript
// src/contracts/ports/telephony-provider.ts
export interface TelephonyProvider {
  startCall(input: {
    jobSpecId: string;
    vendorId: string;
    round: 1 | 2;
  }): Promise<{ callId: string }>;
  endCall(callId: string): Promise<void>;
}
```

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/adapters/telephony/twilioElevenLabs.ts` |
| Create | `src/adapters/telephony/storeGoldenRecording.ts` |
| Create | `tests/contracts/ports/telephony-provider.contract.test.ts` |
| Create | `tests/unit/adapters/telephony/storeGoldenRecording.test.ts` |
| Modify | `src/app/composition/createContainer.ts` |
| Modify | `src/app/calls/callOrchestrator.ts` (type-only: accept `TelephonyProvider`, not simulated subtype) |
| Modify | `.env.example` |
| Modify | `docs/architecture/layers/adapters.md` |

---

### Task 1: TelephonyProvider contract suite (fake + real stub)

**Files:**
- Create: `tests/contracts/ports/telephony-provider.contract.test.ts`

**Interfaces:**
- Consumes: `TelephonyProvider` factories
- Produces: `runTelephonyProviderContract(label, factory)`

- [ ] **Step 1: Write contract test for simulated adapter**

```typescript
// tests/contracts/ports/telephony-provider.contract.test.ts
import { describe, it, expect } from "vitest";
import type { TelephonyProvider } from "@/contracts";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";

export function runTelephonyProviderContract(
  label: string,
  factory: () => TelephonyProvider
) {
  describe(`TelephonyProvider contract — ${label}`, () => {
    it("startCall returns callId; endCall resolves", async () => {
      const telephony = factory();
      const { callId } = await telephony.startCall({
        jobSpecId: "job-1",
        vendorId: "vendor-tough",
        round: 1,
      });
      expect(callId).toBeTruthy();
      await expect(telephony.endCall(callId)).resolves.toBeUndefined();
    });
  });
}

runTelephonyProviderContract("simulated", () => {
  const sim = createSimulatedCallAdapter();
  return { startCall: sim.startCall.bind(sim), endCall: sim.endCall.bind(sim) };
});
```

- [ ] **Step 2: Run test**

Run: `npm run test -- tests/contracts/ports/telephony-provider.contract.test.ts`
Expected: PASS (1 test)

- [ ] **Step 3: Commit**

```bash
git add tests/contracts/ports/telephony-provider.contract.test.ts
git commit -m "test(A7): add TelephonyProvider port contract suite"
```

---

### Task 2: Golden recording storage helper

**Files:**
- Create: `src/adapters/telephony/storeGoldenRecording.ts`
- Create: `tests/unit/adapters/telephony/storeGoldenRecording.test.ts`

**Interfaces:**
- Consumes: `CallRepository.updateRecordingUrl(callId, url)` (add to port if missing in PR-01 follow-up)
- Produces:

```typescript
export async function storeGoldenRecording(deps: {
  storage: { upload(path: string, bytes: Uint8Array, contentType: string): Promise<{ publicUrl: string }> };
  callRepo: { updateRecordingUrl(callId: string, recordingUrl: string): Promise<void> };
}, input: { callId: string; bytes: Uint8Array }): Promise<{ recordingUrl: string }>;
```

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/adapters/telephony/storeGoldenRecording.test.ts
import { describe, it, expect, vi } from "vitest";
import { storeGoldenRecording } from "@/adapters/telephony/storeGoldenRecording";

describe("storeGoldenRecording", () => {
  it("uploads mp3 and updates call row", async () => {
    const upload = vi.fn().mockResolvedValue({
      publicUrl: "https://storage.example/recordings/call-1.mp3",
    });
    const updateRecordingUrl = vi.fn().mockResolvedValue(undefined);
    const bytes = new Uint8Array([0xff, 0xfb]);

    const result = await storeGoldenRecording(
      { storage: { upload }, callRepo: { updateRecordingUrl } },
      { callId: "call-1", bytes }
    );

    expect(upload).toHaveBeenCalledWith(
      "recordings/call-1.mp3",
      bytes,
      "audio/mpeg"
    );
    expect(updateRecordingUrl).toHaveBeenCalledWith(
      "call-1",
      "https://storage.example/recordings/call-1.mp3"
    );
    expect(result.recordingUrl).toContain("call-1.mp3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/telephony/storeGoldenRecording.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement helper**

```typescript
// src/adapters/telephony/storeGoldenRecording.ts
export async function storeGoldenRecording(
  deps: {
    storage: {
      upload(
        path: string,
        bytes: Uint8Array,
        contentType: string
      ): Promise<{ publicUrl: string }>;
    };
    callRepo: {
      updateRecordingUrl(callId: string, recordingUrl: string): Promise<void>;
    };
  },
  input: { callId: string; bytes: Uint8Array }
): Promise<{ recordingUrl: string }> {
  const path = `recordings/${input.callId}.mp3`;
  const { publicUrl } = await deps.storage.upload(path, input.bytes, "audio/mpeg");
  await deps.callRepo.updateRecordingUrl(input.callId, publicUrl);
  return { recordingUrl: publicUrl };
}
```

Add `updateRecordingUrl` to `CallRepository` port in `src/contracts/ports/call-repository.ts`:

```typescript
updateRecordingUrl(callId: string, recordingUrl: string): Promise<Call>;
```

Implement in `src/adapters/fake/inMemoryCallRepo.ts` and Supabase adapter from PR-A1.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/telephony/storeGoldenRecording.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/telephony/storeGoldenRecording.ts src/contracts/ports/call-repository.ts src/adapters/fake/inMemoryCallRepo.ts tests/unit/adapters/telephony/storeGoldenRecording.test.ts
git commit -m "feat(A7): storeGoldenRecording uploads MP3 and updates Call row"
```

---

### Task 3: TwilioElevenLabsAdapter

**Files:**
- Create: `src/adapters/telephony/twilioElevenLabs.ts`
- Create: `tests/unit/adapters/telephony/twilioElevenLabs.test.ts`

**Interfaces:**
- Consumes: Twilio REST (mocked in unit tests), env `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `ELEVENLABS_TWILIO_CONNECT_URL`
- Produces: `createTwilioElevenLabsAdapter(deps): TelephonyProvider`

- [ ] **Step 1: Write failing unit test**

```typescript
// tests/unit/adapters/telephony/twilioElevenLabs.test.ts
import { describe, it, expect, vi } from "vitest";
import { createTwilioElevenLabsAdapter } from "@/adapters/telephony/twilioElevenLabs";

describe("createTwilioElevenLabsAdapter", () => {
  it("starts outbound call with ElevenLabs connect URL", async () => {
    const createCall = vi.fn().mockResolvedValue({ sid: "CA123" });
    const telephony = createTwilioElevenLabsAdapter({
      twilio: { calls: { create: createCall } },
      resolveVendorPhone: async () => "+15125550101",
      connectUrl: "https://api.elevenlabs.io/v1/convai/twilio/connect",
    });

    const { callId } = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-tough",
      round: 1,
    });

    expect(callId).toBe("CA123");
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+15125550101",
        url: expect.stringContaining("convai/twilio/connect"),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/telephony/twilioElevenLabs.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement adapter**

```typescript
// src/adapters/telephony/twilioElevenLabs.ts
import type { TelephonyProvider } from "@/contracts";

type TwilioCallsApi = {
  create(input: Record<string, string>): Promise<{ sid: string }>;
};

export function createTwilioElevenLabsAdapter(deps: {
  twilio: { calls: TwilioCallsApi };
  resolveVendorPhone(vendorId: string): Promise<string>;
  connectUrl: string;
  fromNumber: string;
}): TelephonyProvider {
  return {
    async startCall(input) {
      const to = await deps.resolveVendorPhone(input.vendorId);
      const call = await deps.twilio.calls.create({
        to,
        from: deps.fromNumber,
        url: `${deps.connectUrl}?jobSpecId=${input.jobSpecId}&vendorId=${input.vendorId}&round=${input.round}`,
      });
      return { callId: call.sid };
    },
    async endCall(_callId) {
      /* Twilio status callback / webhook completes lifecycle; no-op for port */
    },
  };
}
```

Register mocked adapter in contract suite:

```typescript
import { createTwilioElevenLabsAdapter } from "@/adapters/telephony/twilioElevenLabs";

runTelephonyProviderContract("twilio-mocked", () =>
  createTwilioElevenLabsAdapter({
    twilio: { calls: { create: async () => ({ sid: "CA-contract" }) } },
    resolveVendorPhone: async () => "+15125550101",
    connectUrl: "https://api.elevenlabs.io/v1/convai/twilio/connect",
    fromNumber: "+15125550000",
  })
);
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- tests/unit/adapters/telephony/twilioElevenLabs.test.ts tests/contracts/ports/telephony-provider.contract.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/telephony/twilioElevenLabs.ts tests/unit/adapters/telephony/twilioElevenLabs.test.ts tests/contracts/ports/telephony-provider.contract.test.ts
git commit -m "feat(A7): TwilioElevenLabsAdapter implements TelephonyProvider"
```

---

### Task 4: Composition root telephony selection + CallOrchestrator LSP fix

**Files:**
- Modify: `src/app/composition/createContainer.ts`
- Modify: `src/app/calls/callOrchestrator.ts`
- Create: `tests/integration/t2/telephonyAdapterSelection.test.ts`

**Interfaces:**
- Consumes: `selectTelephonyProvider(): TelephonyProvider`
- Produces: container exposes `telephonyKind: "simulated" | "twilio"`

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/integration/t2/telephonyAdapterSelection.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createContainer, resetContainerForTests } from "@/app/composition/createContainer";

describe("telephony adapter selection", () => {
  beforeEach(() => resetContainerForTests());
  afterEach(() => delete process.env.USE_SIMULATED_TELEPHONY);

  it("defaults to simulated telephony in CI", () => {
    expect(createContainer().telephonyKind).toBe("simulated");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/t2/telephonyAdapterSelection.test.ts`
Expected: FAIL

- [ ] **Step 3: Wire selection; loosen CallOrchestrator telephony type**

In `createContainer.ts`:

```typescript
function selectTelephonyProvider(): {
  telephony: TelephonyProvider;
  kind: "simulated" | "twilio";
} {
  if (process.env.USE_SIMULATED_TELEPHONY !== "false") {
    return { telephony: createSimulatedCallAdapter(), kind: "simulated" };
  }
  /* build real Twilio client from env when keys present */
  return {
    telephony: createTwilioElevenLabsAdapter(/* ... */),
    kind: "twilio",
  };
}
```

Change `CallOrchestrator` constructor param from `SimulatedCallAdapter` to `TelephonyProvider` plus optional test-only helpers injected at integration layer, not orchestrator.

Add to `.env.example`:

```
USE_SIMULATED_TELEPHONY=true
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
ELEVENLABS_TWILIO_CONNECT_URL=
```

- [ ] **Step 4: Run integration + T1 regression**

Run: `npm run test -- tests/integration/t2/telephonyAdapterSelection.test.ts tests/integration/t1/twoRoundFlow.test.ts`
Expected: PASS — T1 flow still uses simulated adapter

- [ ] **Step 5: Commit**

```bash
git add src/app/composition/createContainer.ts src/app/calls/callOrchestrator.ts .env.example tests/integration/t2/telephonyAdapterSelection.test.ts docs/architecture/layers/adapters.md
git commit -m "feat(A7): env-select TelephonyProvider; simulated remains CI default"
```

---

## Definition of done

- [ ] `TwilioElevenLabsAdapter` satisfies `TelephonyProvider` contract tests
- [ ] `storeGoldenRecording` persists MP3 and updates `recordingUrl`
- [ ] `CallOrchestrator` accepts `TelephonyProvider` (LSP); domain unchanged
- [ ] `USE_SIMULATED_TELEPHONY=true` default; `npm run ci` green
