# PR-B8 Room Photo Vision Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `DocumentParser.parseRoomPhotos` via OpenAI vision adapter, merge partial `JobSpec` fields into the intake draft, and expose `POST /api/intake/upload-photos` — fake parser remains CI default (LSP).

**Architecture:** Extend existing `OpenAIVisionAdapter` (or split from quote-doc parser) to implement `parseRoomPhotos` on the locked `DocumentParser` port. `IntakeOrchestrator.mergeRoomPhotos(jobSpecId, images)` applies patch via `JobSpecRepository.updateDraft`. No domain schema changes.

**Tech Stack:** Next.js 15 · OpenAI Vision API · Vitest · TypeScript

## Global Constraints

- **LSP:** `DocumentParser.parseRoomPhotos` signature locked in contracts; orchestrator unchanged except new merge method.
- **CI default:** `createFakeDocumentParser()` returns deterministic partial JobSpec.
- Branch naming: `lane-b/PR-B8-room-photos`.
- **Depends on:** **PR-I2** (T2 gate merged; intake flow stable).

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

## Port signature (locked)

```typescript
// DocumentParser — partial method for this PR
parseRoomPhotos(input: {
  images: Array<{ bytes: Uint8Array; mimeType: string }>;
}): Promise<Partial<JobSpec>>;
```

---

## Files overview

| Action | Path |
|--------|------|
| Modify | `src/adapters/llm/openAiVisionAdapter.ts` |
| Modify | `src/adapters/fake/fakeDocumentParser.ts` |
| Modify | `src/app/intake/intakeOrchestrator.ts` |
| Create | `app/api/intake/upload-photos/route.ts` |
| Create | `tests/unit/adapters/fakeDocumentParser.roomPhotos.test.ts` |
| Create | `tests/integration/intake/roomPhotosFlow.test.ts` |
| Modify | `src/frontend/screens/IntakeScreen.tsx` |

---

### Task 1: Fake parseRoomPhotos (CI default)

**Files:**
- Modify: `src/adapters/fake/fakeDocumentParser.ts`
- Create: `tests/unit/adapters/fakeDocumentParser.roomPhotos.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/adapters/fakeDocumentParser.roomPhotos.test.ts
import { describe, it, expect } from "vitest";
import { createFakeDocumentParser } from "@/adapters/fake/fakeDocumentParser";

describe("createFakeDocumentParser.parseRoomPhotos", () => {
  it("returns partial JobSpec with sqft and conditionNotes", async () => {
    const parser = createFakeDocumentParser();
    const patch = await parser.parseRoomPhotos({
      images: [{ bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" }],
    });
    expect(patch.sqft).toBe(1850);
    expect(patch.bedrooms).toBe(3);
    expect(patch.conditionNotes).toMatch(/living room/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/fakeDocumentParser.roomPhotos.test.ts`
Expected: FAIL — `parseRoomPhotos` returns empty or throws

- [ ] **Step 3: Extend fake parser**

Add to `src/adapters/fake/fakeDocumentParser.ts`:

```typescript
async parseRoomPhotos() {
  return {
    sqft: 1850,
    bedrooms: 3,
    bathrooms: 2,
    conditionNotes: "Living room shows normal wear; kitchen counters need extra attention.",
    addOns: ["inside_fridge"],
  };
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/fakeDocumentParser.roomPhotos.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/fakeDocumentParser.ts tests/unit/adapters/fakeDocumentParser.roomPhotos.test.ts
git commit -m "feat(B8): fake DocumentParser.parseRoomPhotos for CI"
```

---

### Task 2: OpenAI vision adapter parseRoomPhotos

**Files:**
- Modify: `src/adapters/llm/openAiVisionAdapter.ts`
- Create: `tests/unit/adapters/openAiVision.roomPhotos.test.ts`

**Interfaces:**
- Produces: vision adapter implements full `DocumentParser` including `parseRoomPhotos`

- [ ] **Step 1: Write failing unit test (mocked fetch)**

```typescript
// tests/unit/adapters/openAiVision.roomPhotos.test.ts
import { describe, it, expect, vi } from "vitest";
import { createOpenAiVisionAdapter } from "@/adapters/llm/openAiVisionAdapter";

describe("createOpenAiVisionAdapter.parseRoomPhotos", () => {
  it("maps OpenAI JSON response to Partial<JobSpec>", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sqft: 2100,
                  bedrooms: 4,
                  bathrooms: 2,
                  conditionNotes: "Heavy pet hair in bedrooms.",
                }),
              },
            },
          ],
        }),
      })
    );

    const parser = createOpenAiVisionAdapter({ apiKey: "test" });
    const patch = await parser.parseRoomPhotos({
      images: [{ bytes: new Uint8Array([0xff, 0xd8]), mimeType: "image/jpeg" }],
    });

    expect(patch.sqft).toBe(2100);
    expect(patch.bedrooms).toBe(4);
    expect(patch.conditionNotes).toContain("pet hair");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/openAiVision.roomPhotos.test.ts`
Expected: FAIL — method not implemented

- [ ] **Step 3: Implement parseRoomPhotos in adapter**

```typescript
// src/adapters/llm/openAiVisionAdapter.ts — add method
async parseRoomPhotos(input) {
  const imageParts = input.images.map((img) => ({
    type: "image_url",
    image_url: {
      url: `data:${img.mimeType};base64,${Buffer.from(img.bytes).toString("base64")}`,
    },
  }));

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${this.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Estimate home cleaning job spec fields: sqft, bedrooms, bathrooms, conditionNotes, addOns. Return JSON only.",
            },
            ...imageParts,
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI vision failed: ${res.status}`);
  const body = await res.json();
  const content = body.choices[0].message.content;
  return JSON.parse(content) as Partial<JobSpec>;
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/openAiVision.roomPhotos.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/llm/openAiVisionAdapter.ts tests/unit/adapters/openAiVision.roomPhotos.test.ts
git commit -m "feat(B8): OpenAI vision parseRoomPhotos on DocumentParser port"
```

---

### Task 3: IntakeOrchestrator.mergeRoomPhotos + API route

**Files:**
- Modify: `src/app/intake/intakeOrchestrator.ts`
- Create: `app/api/intake/upload-photos/route.ts`
- Create: `tests/integration/intake/roomPhotosFlow.test.ts`

**Interfaces:**

```typescript
// IntakeOrchestrator
async mergeRoomPhotos(
  jobSpecId: string,
  images: Array<{ bytes: Uint8Array; mimeType: string }>
): Promise<JobSpec>;
```

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/integration/intake/roomPhotosFlow.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, resetContainerForTests } from "@/app/composition/createContainer";

describe("room photo intake flow", () => {
  beforeEach(() => resetContainerForTests());

  it("merges vision patch into draft JobSpec", async () => {
    const c = createContainer();
    const { jobSpecId } = await c.intakeOrchestrator.startIntake({ geo: "Austin, TX" });

    const updated = await c.intakeOrchestrator.mergeRoomPhotos(jobSpecId, [
      { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" },
    ]);

    expect(updated.sqft).toBe(1850);
    expect(updated.conditionNotes).toMatch(/living room/i);
    expect(updated.confirmed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/intake/roomPhotosFlow.test.ts`
Expected: FAIL — `mergeRoomPhotos` not defined

- [ ] **Step 3: Implement orchestrator method + route**

```typescript
// src/app/intake/intakeOrchestrator.ts
async mergeRoomPhotos(jobSpecId, images) {
  const patch = await this.deps.documentParserService.parseRoomPhotos(images);
  return this.deps.jobSpecRepo.updateDraft(jobSpecId, patch);
}
```

Add to `DocumentParserService`:

```typescript
async parseRoomPhotos(images: Array<{ bytes: Uint8Array; mimeType: string }>) {
  return this.documentParser.parseRoomPhotos({ images });
}
```

```typescript
// app/api/intake/upload-photos/route.ts
import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function POST(req: Request) {
  const form = await req.formData();
  const jobSpecId = String(form.get("jobSpecId"));
  const files = form.getAll("photos") as File[];
  const images = await Promise.all(
    files.map(async (f) => ({
      bytes: new Uint8Array(await f.arrayBuffer()),
      mimeType: f.type || "image/jpeg",
    }))
  );
  const { intakeOrchestrator } = createContainer();
  const jobSpec = await intakeOrchestrator.mergeRoomPhotos(jobSpecId, images);
  return NextResponse.json({ jobSpec });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/intake/roomPhotosFlow.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/intake/intakeOrchestrator.ts src/app/intake/documentParserService.ts app/api/intake/upload-photos/route.ts tests/integration/intake/roomPhotosFlow.test.ts
git commit -m "feat(B8): merge room photo vision patch into JobSpec draft"
```

---

### Task 4: Intake UI photo upload control

**Files:**
- Modify: `src/frontend/screens/IntakeScreen.tsx`

- [ ] **Step 1: Add file input with data-testid**

```tsx
<input
  type="file"
  accept="image/*"
  multiple
  data-testid="intake-room-photos"
  onChange={handlePhotoUpload}
/>
```

- [ ] **Step 2: Wire to POST /api/intake/upload-photos**

- [ ] **Step 3: Commit**

```bash
git add src/frontend/screens/IntakeScreen.tsx
git commit -m "feat(B8): intake UI room photo upload"
```

---

## Definition of done

- [ ] `parseRoomPhotos` on `DocumentParser` port with fake + OpenAI adapters
- [ ] Partial `JobSpec` merged into draft via orchestrator
- [ ] CI uses fake vision; no OpenAI secrets required
- [ ] `npm run ci` green on `lane-b/PR-B8-room-photos`
