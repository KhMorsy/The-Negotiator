# PR-A9 Email Fallback + Structured Outcome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a vendor refuses phone quotes ("we don't quote over the phone"), route to email fallback that records structured `CallOutcome` of `callback_commitment` without crashing the call flow — application handler only; domain ports unchanged (LSP).

**Architecture:** `handleVendorRefusal` in `src/app/calls/emailFallbackHandler.ts` detects refusal utterance patterns, composes job-spec email via `EmailNotifier` port, updates `CallRepository.updateOutcome(callId, "callback_commitment")`, and returns gracefully. Fake email adapter logs to stdout in CI. Call orchestrator/webhook path invokes handler; never throws on fallback path.

**Tech Stack:** Next.js 15 · TypeScript · Vitest · Resend or SMTP adapter (optional live)

## Global Constraints

- **LSP:** Uses existing `CallOutcome` union; no new outcome values.
- **No crash:** handler always resolves; errors become `documented_decline` with reason logged.
- **CI default:** `createFakeEmailNotifier()` captures sent payloads in memory.
- Branch naming: `lane-a/PR-A9-email-fallback`.
- **Depends on:** **PR-I2** (T2 gate merged).

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

## Canonical types (locked)

```typescript
export type CallOutcome =
  | "itemized_quote"
  | "callback_commitment"
  | "documented_decline"
  | "voicemail"
  | "no_answer";
```

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/contracts/ports/email-notifier.ts` |
| Create | `src/adapters/fake/fakeEmailNotifier.ts` |
| Create | `src/adapters/email/resendEmailNotifier.ts` |
| Create | `src/app/calls/emailFallbackHandler.ts` |
| Create | `src/domain/calls/detectQuoteRefusal.ts` |
| Modify | `src/app/webhooks/handleTranscriptEvent.ts` |
| Create | `tests/unit/domain/calls/detectQuoteRefusal.test.ts` |
| Create | `tests/integration/calls/emailFallback.test.ts` |

---

### Task 1: Pure refusal detector

**Files:**
- Create: `src/domain/calls/detectQuoteRefusal.ts`
- Create: `tests/unit/domain/calls/detectQuoteRefusal.test.ts`

**Interfaces:**

```typescript
export function detectQuoteRefusal(
  lastVendorUtterance: string
): { refused: boolean; reason: string };
```

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/domain/calls/detectQuoteRefusal.test.ts
import { describe, it, expect } from "vitest";
import { detectQuoteRefusal } from "@/domain/calls/detectQuoteRefusal";

describe("detectQuoteRefusal", () => {
  it("detects we dont quote over the phone", () => {
    const r = detectQuoteRefusal("Sorry, we don't quote over the phone.");
    expect(r.refused).toBe(true);
    expect(r.reason).toMatch(/phone/i);
  });

  it("does not flag normal quote", () => {
    const r = detectQuoteRefusal("Our flat rate is $210 per visit.");
    expect(r.refused).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/calls/detectQuoteRefusal.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement pure function**

```typescript
// src/domain/calls/detectQuoteRefusal.ts
const REFUSAL_PATTERNS = [
  /don'?t quote over the phone/i,
  /no phone quotes/i,
  /send (?:us )?an email/i,
  /we need to see the property first/i,
];

export function detectQuoteRefusal(lastVendorUtterance: string): {
  refused: boolean;
  reason: string;
} {
  for (const pattern of REFUSAL_PATTERNS) {
    if (pattern.test(lastVendorUtterance)) {
      return { refused: true, reason: lastVendorUtterance.trim() };
    }
  }
  return { refused: false, reason: "" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/calls/detectQuoteRefusal.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domain/calls/detectQuoteRefusal.ts tests/unit/domain/calls/detectQuoteRefusal.test.ts
git commit -m "feat(A9): detectQuoteRefusal pure function"
```

---

### Task 2: EmailNotifier port + fake adapter

**Files:**
- Create: `src/contracts/ports/email-notifier.ts`
- Create: `src/adapters/fake/fakeEmailNotifier.ts`

**Interfaces:**

```typescript
export interface EmailNotifier {
  sendJobSpecRequest(input: {
    toEmail: string;
    jobSpec: JobSpec;
    vendorName: string;
  }): Promise<{ messageId: string }>;
}
```

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/adapters/fakeEmailNotifier.test.ts
import { describe, it, expect } from "vitest";
import { createFakeEmailNotifier } from "@/adapters/fake/fakeEmailNotifier";

describe("createFakeEmailNotifier", () => {
  it("records sent emails in memory", async () => {
    const notifier = createFakeEmailNotifier();
    const { messageId } = await notifier.sendJobSpecRequest({
      toEmail: "quotes@vendor.com",
      vendorName: "Sparkle Pro",
      jobSpec: { id: "j1" } as never,
    });
    expect(messageId).toMatch(/^fake-msg-/);
    expect(notifier.sent).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/fakeEmailNotifier.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement fake**

```typescript
// src/adapters/fake/fakeEmailNotifier.ts
import type { EmailNotifier, JobSpec } from "@/contracts";

export function createFakeEmailNotifier(): EmailNotifier & {
  sent: Array<{ toEmail: string; jobSpecId: string }>;
} {
  const sent: Array<{ toEmail: string; jobSpecId: string }> = [];
  let seq = 0;
  return {
    sent,
    async sendJobSpecRequest(input) {
      sent.push({ toEmail: input.toEmail, jobSpecId: input.jobSpec.id });
      return { messageId: `fake-msg-${++seq}` };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/fakeEmailNotifier.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/contracts/ports/email-notifier.ts src/adapters/fake/fakeEmailNotifier.ts tests/unit/adapters/fakeEmailNotifier.test.ts
git commit -m "feat(A9): EmailNotifier port and fake adapter"
```

---

### Task 3: emailFallbackHandler — callback_commitment without crash

**Files:**
- Create: `src/app/calls/emailFallbackHandler.ts`
- Create: `tests/integration/calls/emailFallback.test.ts`

**Interfaces:**

```typescript
export async function handleEmailFallback(
  deps: {
    emailNotifier: EmailNotifier;
    callRepo: CallRepository;
  },
  input: {
    callId: string;
    jobSpec: JobSpec;
    vendorEmail: string;
    vendorName: string;
    lastVendorUtterance: string;
  }
): Promise<{ outcome: CallOutcome; messageId?: string }>;
```

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/integration/calls/emailFallback.test.ts
import { describe, it, expect } from "vitest";
import { handleEmailFallback } from "@/app/calls/emailFallbackHandler";
import { createFakeEmailNotifier } from "@/adapters/fake/fakeEmailNotifier";
import { createInMemoryCallRepository } from "@/adapters/fake/inMemoryCallRepo";
import type { JobSpec } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-email-1",
  jobType: "deep_clean",
  sqft: 1500,
  bedrooms: 3,
  bathrooms: 2,
  frequency: "once",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Austin, TX",
  confirmed: true,
};

describe("handleEmailFallback", () => {
  it("sends email and sets callback_commitment outcome", async () => {
    const emailNotifier = createFakeEmailNotifier();
    const callRepo = createInMemoryCallRepository();
    const call = await callRepo.create({
      jobSpecId: jobSpec.id,
      vendorId: "vendor-a",
      round: 1,
    });

    const result = await handleEmailFallback(
      { emailNotifier, callRepo },
      {
        callId: call.id,
        jobSpec,
        vendorEmail: "quotes@sparklepro.com",
        vendorName: "Sparkle Pro",
        lastVendorUtterance: "We don't quote over the phone — email us.",
      }
    );

    expect(result.outcome).toBe("callback_commitment");
    expect(result.messageId).toBeTruthy();
    const updated = await callRepo.getById(call.id);
    expect(updated?.outcome).toBe("callback_commitment");
    expect(emailNotifier.sent).toHaveLength(1);
  });

  it("does not throw when email send fails — returns documented_decline", async () => {
    const callRepo = createInMemoryCallRepository();
    const call = await callRepo.create({
      jobSpecId: jobSpec.id,
      vendorId: "vendor-b",
      round: 1,
    });
    const emailNotifier = {
      async sendJobSpecRequest() {
        throw new Error("SMTP down");
      },
    };

    const result = await handleEmailFallback(
      { emailNotifier, callRepo },
      {
        callId: call.id,
        jobSpec,
        vendorEmail: "bad@vendor.com",
        vendorName: "Budget Co",
        lastVendorUtterance: "No phone quotes.",
      }
    );

    expect(result.outcome).toBe("documented_decline");
    const updated = await callRepo.getById(call.id);
    expect(updated?.outcome).toBe("documented_decline");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/calls/emailFallback.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement handler**

```typescript
// src/app/calls/emailFallbackHandler.ts
import type {
  CallOutcome,
  CallRepository,
  EmailNotifier,
  JobSpec,
} from "@/contracts";
import { detectQuoteRefusal } from "@/domain/calls/detectQuoteRefusal";

export async function handleEmailFallback(
  deps: { emailNotifier: EmailNotifier; callRepo: CallRepository },
  input: {
    callId: string;
    jobSpec: JobSpec;
    vendorEmail: string;
    vendorName: string;
    lastVendorUtterance: string;
  }
): Promise<{ outcome: CallOutcome; messageId?: string }> {
  const { refused } = detectQuoteRefusal(input.lastVendorUtterance);
  if (!refused) {
    await deps.callRepo.updateOutcome(input.callId, "documented_decline");
    return { outcome: "documented_decline" };
  }

  try {
    const { messageId } = await deps.emailNotifier.sendJobSpecRequest({
      toEmail: input.vendorEmail,
      jobSpec: input.jobSpec,
      vendorName: input.vendorName,
    });
    await deps.callRepo.updateOutcome(input.callId, "callback_commitment");
    return { outcome: "callback_commitment", messageId };
  } catch {
    await deps.callRepo.updateOutcome(input.callId, "documented_decline");
    return { outcome: "documented_decline" };
  }
}
```

Wire into `handleTranscriptEvent` or dedicated webhook branch when refusal detected mid-call.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/calls/emailFallback.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/calls/emailFallbackHandler.ts src/app/webhooks/handleTranscriptEvent.ts tests/integration/calls/emailFallback.test.ts
git commit -m "feat(A9): email fallback records callback_commitment without crash"
```

---

## Definition of done

- [ ] Vendor phone-quote refusal triggers email fallback
- [ ] `CallOutcome` set to `callback_commitment` on success
- [ ] Send failure degrades to `documented_decline` — never throws
- [ ] CI uses fake email notifier; `npm run ci` green
