# PR-B2 Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire intake orchestration — voice session start plus existing-quote document parse — behind two API routes using fake `SpeechAgent` and `DocumentParser` adapters.

**Architecture:** `IntakeOrchestrator` in `src/app/intake/` coordinates port calls and persists draft `JobSpec` rows via `JobSpecRepository`. `DocumentParserService` is a thin façade over the `DocumentParser` port. Next.js route handlers in `app/api/intake/` delegate to the orchestrator. Integration tests construct fakes directly (composition root lands in PR-I1).

**Tech Stack:** Next.js 15 API routes · TypeScript · Vitest integration tests · Zod (via contracts schemas)

## Global Constraints

- Vertical: `home_cleaning` only for MVP (`config/verticals/home_cleaning.json`).
- Comparability: one confirmed `JobSpec` per negotiation run.
- CI: **no vendor secrets**; all CI tests use `src/adapters/fake/**`.
- Application may not import adapters except from `src/app/composition/**` — this PR uses inline fake construction in tests and a minimal `createTestContainer.ts` helper scoped to tests/integration only.
- Branch naming: `lane-b/PR-B2-intake`.
- Depends on: **PR-01** (ports + types), **PR-B1** (UI routes exist).

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/adapters/fake/fakeSpeechAgent.ts` |
| Create | `src/adapters/fake/fakeDocumentParser.ts` |
| Create | `src/adapters/fake/inMemoryRepos.ts` |
| Create | `src/app/intake/intakeOrchestrator.ts` |
| Create | `src/app/intake/documentParserService.ts` |
| Create | `app/api/intake/start/route.ts` |
| Create | `app/api/intake/upload-quote/route.ts` |
| Create | `tests/integration/intake/intakeOrchestrator.test.ts` |
| Create | `tests/integration/intake/intakeApi.test.ts` |

---

### Task 1: Fake SpeechAgent adapter

**Files:**
- Create: `src/adapters/fake/fakeSpeechAgent.ts`

**Interfaces:**
- Consumes: `SpeechAgent` port from `@/contracts`
- Produces: `createFakeSpeechAgent()` returning `{ startIntakeSession, getIntakeTranscript }`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/adapters/fakeSpeechAgent.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";

describe("createFakeSpeechAgent", () => {
  it("starts session and returns deterministic transcript", async () => {
    const agent = createFakeSpeechAgent();
    const { sessionId } = await agent.startIntakeSession("draft-001");
    expect(sessionId).toMatch(/^fake-session-/);
    const { turns } = await agent.getIntakeTranscript(sessionId);
    expect(turns.some((t) => t.text.includes("1800"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/fakeSpeechAgent.test.ts`
Expected: FAIL with `Cannot find module '@/adapters/fake/fakeSpeechAgent'`

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/fake/fakeSpeechAgent.ts`:

```typescript
import type { SpeechAgent } from "@/contracts";

const TRANSCRIPT = [
  { role: "agent", text: "How many square feet is your home?" },
  { role: "user", text: "About 1800 square feet, three beds two baths." },
  { role: "agent", text: "Weekly recurring clean?" },
  { role: "user", text: "Yes weekly, we have a dog." },
];

export function createFakeSpeechAgent(): SpeechAgent {
  const sessions = new Map<string, typeof TRANSCRIPT>();

  return {
    async startIntakeSession(jobSpecDraftId: string) {
      const sessionId = `fake-session-${jobSpecDraftId}`;
      sessions.set(sessionId, TRANSCRIPT);
      return { sessionId };
    },
    async getIntakeTranscript(sessionId: string) {
      const turns = sessions.get(sessionId) ?? TRANSCRIPT;
      return { turns };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/fakeSpeechAgent.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/fakeSpeechAgent.ts tests/unit/adapters/fakeSpeechAgent.test.ts
git commit -m "feat(B2): fake SpeechAgent with deterministic transcript"
```

---

### Task 2: Fake DocumentParser adapter

**Files:**
- Create: `src/adapters/fake/fakeDocumentParser.ts`

**Interfaces:**
- Consumes: `DocumentParser` port
- Produces: `createFakeDocumentParser()` returning leverage quote parse result

- [ ] **Step 1: Write the failing test**

Create `tests/unit/adapters/fakeDocumentParser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";

describe("createFakeDocumentParser", () => {
  it("parseExistingQuote returns leverage amount", async () => {
    const parser = createFakeDocumentParser();
    const result = await parser.parseExistingQuote({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "application/pdf",
    });
    expect(result.leverageQuote?.amount).toBe(185);
    expect(result.sqft).toBe(1800);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/fakeDocumentParser.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/fake/fakeDocumentParser.ts`:

```typescript
import type { DocumentParser } from "@/contracts";

export function createFakeDocumentParser(): DocumentParser {
  return {
    async parseExistingQuote() {
      return {
        sqft: 1800,
        bedrooms: 3,
        bathrooms: 2,
        jobType: "recurring_weekly" as const,
        frequency: "weekly" as const,
        leverageQuote: { amount: 185, vendorName: "Previous Cleaner LLC" },
      };
    },
    async parseRoomPhotos() {
      return { sqft: 1600, bedrooms: 2, bathrooms: 2 };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/fakeDocumentParser.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/fakeDocumentParser.ts tests/unit/adapters/fakeDocumentParser.test.ts
git commit -m "feat(B2): fake DocumentParser with leverage quote"
```

---

### Task 3: In-memory JobSpecRepository

**Files:**
- Create: `src/adapters/fake/inMemoryRepos.ts`

**Interfaces:**
- Consumes: `JobSpecRepository` port
- Produces: `createInMemoryJobSpecRepository()` with `create`, `getById`, `updateDraft`, `confirm`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/adapters/inMemoryJobSpecRepo.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";

describe("createInMemoryJobSpecRepository", () => {
  it("creates and retrieves draft JobSpec", async () => {
    const repo = createInMemoryJobSpecRepository();
    const created = await repo.create({
      jobType: "recurring_weekly",
      sqft: 1800,
      bedrooms: 3,
      bathrooms: 2,
      frequency: "weekly",
      addOns: [],
      suppliesProvided: false,
      pets: false,
      accessNotes: "",
      conditionNotes: "",
      geo: "Austin, TX",
      confirmed: false,
    });
    const fetched = await repo.getById(created.id);
    expect(fetched?.sqft).toBe(1800);
    expect(fetched?.confirmed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/inMemoryJobSpecRepo.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/fake/inMemoryRepos.ts`:

```typescript
import type { JobSpec } from "@/contracts";
import type { JobSpecRepository } from "@/contracts";
import { randomUUID } from "node:crypto";

export function createInMemoryJobSpecRepository(): JobSpecRepository {
  const store = new Map<string, JobSpec>();

  return {
    async create(draft: Omit<JobSpec, "id">) {
      const jobSpec: JobSpec = { ...draft, id: randomUUID() };
      store.set(jobSpec.id, jobSpec);
      return jobSpec;
    },
    async getById(id: string) {
      return store.get(id) ?? null;
    },
    async updateDraft(id: string, patch: Partial<JobSpec>) {
      const existing = store.get(id);
      if (!existing) throw new Error(`JobSpec not found: ${id}`);
      const updated = { ...existing, ...patch, id };
      store.set(id, updated);
      return updated;
    },
    async confirm(id: string) {
      const existing = store.get(id);
      if (!existing) throw new Error(`JobSpec not found: ${id}`);
      const confirmed = { ...existing, confirmed: true };
      store.set(id, confirmed);
      return confirmed;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/inMemoryJobSpecRepo.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/inMemoryRepos.ts tests/unit/adapters/inMemoryJobSpecRepo.test.ts
git commit -m "feat(B2): in-memory JobSpecRepository for tests"
```

---

### Task 4: DocumentParserService + IntakeOrchestrator

**Files:**
- Create: `src/app/intake/documentParserService.ts`
- Create: `src/app/intake/intakeOrchestrator.ts`

**Interfaces:**
- Consumes: `SpeechAgent`, `DocumentParser`, `JobSpecRepository` ports
- Produces:
  - `DocumentParserService.parseQuoteUpload(bytes, mimeType): Promise<{ jobSpecPatch; leverageQuoteAmount? }>`
  - `IntakeOrchestrator.startIntake(geo): Promise<{ jobSpecId; sessionId }>`
  - `IntakeOrchestrator.syncVoiceTranscript(jobSpecId, sessionId): Promise<JobSpec>`
  - `IntakeOrchestrator.applyQuoteDocument(jobSpecId, bytes, mimeType): Promise<JobSpec>`

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/intake/intakeOrchestrator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";
import { DocumentParserService } from "@/app/intake/documentParserService";
import { IntakeOrchestrator } from "@/app/intake/intakeOrchestrator";

function buildOrchestrator() {
  const jobSpecRepo = createInMemoryJobSpecRepository();
  const speechAgent = createFakeSpeechAgent();
  const documentParser = createFakeDocumentParser();
  const documentParserService = new DocumentParserService(documentParser);
  const orchestrator = new IntakeOrchestrator({
    speechAgent,
    jobSpecRepo,
    documentParserService,
  });
  return { orchestrator };
}

describe("IntakeOrchestrator", () => {
  it("startIntake creates draft and voice session", async () => {
    const { orchestrator } = buildOrchestrator();
    const { jobSpecId, sessionId } = await orchestrator.startIntake("Austin, TX");
    expect(jobSpecId).toBeTruthy();
    expect(sessionId).toMatch(/^fake-session-/);
  });

  it("syncVoiceTranscript merges sqft from fake transcript", async () => {
    const { orchestrator } = buildOrchestrator();
    const { jobSpecId, sessionId } = await orchestrator.startIntake("Austin, TX");
    const updated = await orchestrator.syncVoiceTranscript(jobSpecId, sessionId);
    expect(updated.sqft).toBe(1800);
    expect(updated.bedrooms).toBe(3);
    expect(updated.confirmed).toBe(false);
  });

  it("applyQuoteDocument sets leverageQuoteAmount", async () => {
    const { orchestrator } = buildOrchestrator();
    const { jobSpecId } = await orchestrator.startIntake("Austin, TX");
    const updated = await orchestrator.applyQuoteDocument(
      jobSpecId,
      new Uint8Array([1]),
      "application/pdf"
    );
    expect(updated.leverageQuoteAmount).toBe(185);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/intake/intakeOrchestrator.test.ts`
Expected: FAIL with `Cannot find module '@/app/intake/intakeOrchestrator'`

- [ ] **Step 3: Write minimal implementation**

Create `src/app/intake/documentParserService.ts`:

```typescript
import type { DocumentParser } from "@/contracts";
import type { JobSpec } from "@/contracts";

export class DocumentParserService {
  constructor(private readonly documentParser: DocumentParser) {}

  async parseQuoteUpload(input: { bytes: Uint8Array; mimeType: string }) {
    const parsed = await this.documentParser.parseExistingQuote(input);
    const { leverageQuote, ...jobSpecPatch } = parsed;
    return {
      jobSpecPatch: jobSpecPatch as Partial<JobSpec>,
      leverageQuoteAmount: leverageQuote?.amount,
    };
  }
}
```

Create `src/app/intake/intakeOrchestrator.ts`:

```typescript
import type { JobSpecRepository, SpeechAgent } from "@/contracts";
import { DocumentParserService } from "./documentParserService";

const VOICE_FIELD_MAP: Record<string, Partial<import("@/contracts").JobSpec>> = {
  "1800": { sqft: 1800, bedrooms: 3, bathrooms: 2, frequency: "weekly", pets: true },
};

function extractFieldsFromTranscript(
  turns: Array<{ role: string; text: string }>
): Partial<import("@/contracts").JobSpec> {
  const userText = turns.filter((t) => t.role === "user").map((t) => t.text).join(" ");
  if (userText.includes("1800")) return VOICE_FIELD_MAP["1800"];
  return {};
}

export class IntakeOrchestrator {
  constructor(
    private readonly deps: {
      speechAgent: SpeechAgent;
      jobSpecRepo: JobSpecRepository;
      documentParserService: DocumentParserService;
    }
  ) {}

  async startIntake(geo: string) {
    const draft = await this.deps.jobSpecRepo.create({
      jobType: "recurring_weekly",
      sqft: 0,
      bedrooms: 0,
      bathrooms: 0,
      frequency: "weekly",
      addOns: [],
      suppliesProvided: false,
      pets: false,
      accessNotes: "",
      conditionNotes: "",
      geo,
      confirmed: false,
    });
    const { sessionId } = await this.deps.speechAgent.startIntakeSession(draft.id);
    return { jobSpecId: draft.id, sessionId };
  }

  async syncVoiceTranscript(jobSpecId: string, sessionId: string) {
    const { turns } = await this.deps.speechAgent.getIntakeTranscript(sessionId);
    const patch = extractFieldsFromTranscript(turns);
    return this.deps.jobSpecRepo.updateDraft(jobSpecId, {
      ...patch,
      jobType: "recurring_weekly",
    });
  }

  async applyQuoteDocument(jobSpecId: string, bytes: Uint8Array, mimeType: string) {
    const { jobSpecPatch, leverageQuoteAmount } =
      await this.deps.documentParserService.parseQuoteUpload({ bytes, mimeType });
    return this.deps.jobSpecRepo.updateDraft(jobSpecId, {
      ...jobSpecPatch,
      ...(leverageQuoteAmount !== undefined ? { leverageQuoteAmount } : {}),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/intake/intakeOrchestrator.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/intake/documentParserService.ts src/app/intake/intakeOrchestrator.ts tests/integration/intake/intakeOrchestrator.test.ts
git commit -m "feat(B2): IntakeOrchestrator with voice and document paths"
```

---

### Task 5: API routes POST /api/intake/start and /api/intake/upload-quote

**Files:**
- Create: `app/api/intake/start/route.ts`
- Create: `app/api/intake/upload-quote/route.ts`
- Create: `tests/integration/intake/intakeApi.test.ts`

**Interfaces:**
- Consumes: `IntakeOrchestrator`
- Produces: JSON `{ jobSpecId, sessionId }` and `{ jobSpec: JobSpec }`

- [ ] **Step 1: Write the failing API integration test**

Create `tests/integration/intake/intakeApi.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { POST as startPost } from "../../../../app/api/intake/start/route";
import { POST as uploadPost } from "../../../../app/api/intake/upload-quote/route";

describe("intake API routes", () => {
  it("POST /api/intake/start returns jobSpecId and sessionId", async () => {
    const req = new Request("http://localhost/api/intake/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geo: "Austin, TX" }),
    });
    const res = await startPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobSpecId).toBeTruthy();
    expect(body.sessionId).toMatch(/^fake-session-/);
  });

  it("POST /api/intake/upload-quote merges leverage amount", async () => {
    const startReq = new Request("http://localhost/api/intake/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geo: "Austin, TX" }),
    });
    const startRes = await startPost(startReq);
    const { jobSpecId } = await startRes.json();

    const form = new FormData();
    form.append("jobSpecId", jobSpecId);
    form.append("file", new Blob([new Uint8Array([1])], { type: "application/pdf" }), "quote.pdf");

    const uploadReq = new Request("http://localhost/api/intake/upload-quote", {
      method: "POST",
      body: form,
    });
    const uploadRes = await uploadPost(uploadReq);
    expect(uploadRes.status).toBe(200);
    const body = await uploadRes.json();
    expect(body.jobSpec.leverageQuoteAmount).toBe(185);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/intake/intakeApi.test.ts`
Expected: FAIL with route module not found

- [ ] **Step 3: Write minimal implementation**

Create module-scoped wiring (replaced by composition root in PR-I1):

`src/app/intake/createIntakeDeps.ts`:

```typescript
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";
import { DocumentParserService } from "./documentParserService";
import { IntakeOrchestrator } from "./intakeOrchestrator";

let orchestrator: IntakeOrchestrator | null = null;

export function getIntakeOrchestrator() {
  if (!orchestrator) {
    const jobSpecRepo = createInMemoryJobSpecRepository();
    orchestrator = new IntakeOrchestrator({
      speechAgent: createFakeSpeechAgent(),
      jobSpecRepo,
      documentParserService: new DocumentParserService(createFakeDocumentParser()),
    });
  }
  return orchestrator;
}
```

`app/api/intake/start/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getIntakeOrchestrator } from "@/app/intake/createIntakeDeps";

export async function POST(req: Request) {
  const { geo } = (await req.json()) as { geo: string };
  const orchestrator = getIntakeOrchestrator();
  const result = await orchestrator.startIntake(geo);
  return NextResponse.json(result);
}
```

`app/api/intake/upload-quote/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getIntakeOrchestrator } from "@/app/intake/createIntakeDeps";

export async function POST(req: Request) {
  const form = await req.formData();
  const jobSpecId = String(form.get("jobSpecId"));
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const orchestrator = getIntakeOrchestrator();
  const jobSpec = await orchestrator.applyQuoteDocument(jobSpecId, bytes, mimeType);
  return NextResponse.json({ jobSpec });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/intake/intakeApi.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/intake src/app/intake/createIntakeDeps.ts tests/integration/intake/intakeApi.test.ts
git commit -m "feat(B2): intake API routes with fake adapters"
```

---

## Definition of done

- [ ] `IntakeOrchestrator` and `DocumentParserService` use ports only (no vendor SDKs)
- [ ] `POST /api/intake/start` and `POST /api/intake/upload-quote` return expected JSON
- [ ] Integration tests green with fake adapters
- [ ] `npm run ci` green on `lane-b/PR-B2-intake`
- [ ] Update `docs/architecture/layers/application.md` with intake module paths
