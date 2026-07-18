# PR-A8 Skill Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `SkillGenerator` that creates a valid `Skill` for an unseen customer ask using the existing `LLMPlanner` port, validates `SkillPreconditions` against Zod schema, and persists generated skills to `config/skills/generated/` — skill engine domain unchanged (LSP).

**Architecture:** Application service `src/app/skills/skillGenerator.ts` prompts planner with ask + existing skill catalog; pure validator `validateSkillShape` in domain ensures preconditions honesty rules; `SkillRepository` port (file-backed adapter) appends JSON. CI uses fake planner returning deterministic skill JSON.

**Tech Stack:** Next.js 15 · TypeScript · Vitest · Zod · OpenAI (via LLMPlanner adapter)

## Global Constraints

- **LSP:** `chooseNextSkill` / `filterEligibleSkills` unchanged; generated skills loaded alongside seeded catalog.
- **CI default:** fake `LLMPlanner` in tests; no OpenAI in CI.
- Branch naming: `lane-a/PR-A8-skill-generator`.
- **Depends on:** **PR-I2** (T2 gate merged).

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

---

## Canonical types (locked)

```typescript
export interface SkillPreconditions {
  requiresCompetingQuote?: boolean;
  requiresRecurringJob?: boolean;
  minQuotesInHand?: number;
}

export interface Skill {
  id: string;
  name: string;
  selectionSignals: string[];
  preconditions: SkillPreconditions;
  moveTemplate: string;
}

export interface LLMPlanner {
  chooseSkill(input: {
    eligibleSkills: Skill[];
    context: {
      jobSpec: JobSpec;
      quotesInHand: Quote[];
      lastVendorUtterance: string;
    };
    kbSnippets: string[];
  }): Promise<{ skillId: string; suggestedPhrasing: string }>;
}
```

---

## Files overview

| Action | Path |
|--------|------|
| Create | `src/contracts/ports/skill-repository.ts` |
| Create | `src/contracts/schemas/skill.schema.ts` |
| Create | `src/domain/skills/validateSkillShape.ts` |
| Create | `src/app/skills/skillGenerator.ts` |
| Create | `src/adapters/persistence/fileSkillRepository.ts` |
| Create | `config/skills/generated/.gitkeep` |
| Create | `tests/unit/domain/skills/validateSkillShape.test.ts` |
| Create | `tests/integration/skills/skillGenerator.test.ts` |

---

### Task 1: Skill Zod schema + validateSkillShape

**Files:**
- Create: `src/contracts/schemas/skill.schema.ts`
- Create: `src/domain/skills/validateSkillShape.ts`
- Create: `tests/unit/domain/skills/validateSkillShape.test.ts`

**Interfaces:**
- Produces: `validateSkillShape(input: unknown): Skill`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/domain/skills/validateSkillShape.test.ts
import { describe, it, expect } from "vitest";
import { validateSkillShape } from "@/domain/skills/validateSkillShape";

describe("validateSkillShape", () => {
  it("accepts skill with honest preconditions", () => {
    const skill = validateSkillShape({
      id: "ask_pet_surcharge_waiver",
      name: "Pet surcharge waiver ask",
      selectionSignals: ["pet fee", "pet surcharge"],
      preconditions: { requiresRecurringJob: true },
      moveTemplate: "We have a recurring schedule — can you waive the pet surcharge?",
    });
    expect(skill.id).toBe("ask_pet_surcharge_waiver");
  });

  it("rejects skill missing moveTemplate", () => {
    expect(() =>
      validateSkillShape({
        id: "bad",
        name: "Bad",
        selectionSignals: [],
        preconditions: {},
      })
    ).toThrow(/moveTemplate/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/skills/validateSkillShape.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement schema + validator**

```typescript
// src/contracts/schemas/skill.schema.ts
import { z } from "zod";

export const skillPreconditionsSchema = z.object({
  requiresCompetingQuote: z.boolean().optional(),
  requiresRecurringJob: z.boolean().optional(),
  minQuotesInHand: z.number().int().min(0).optional(),
});

export const skillSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(3),
  selectionSignals: z.array(z.string()).min(1),
  preconditions: skillPreconditionsSchema,
  moveTemplate: z.string().min(10),
});
```

```typescript
// src/domain/skills/validateSkillShape.ts
import { skillSchema } from "@/contracts/schemas/skill.schema";
import type { Skill } from "@/contracts";

export function validateSkillShape(input: unknown): Skill {
  return skillSchema.parse(input) as Skill;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/skills/validateSkillShape.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/contracts/schemas/skill.schema.ts src/domain/skills/validateSkillShape.ts tests/unit/domain/skills/validateSkillShape.test.ts
git commit -m "feat(A8): Skill Zod schema and validateSkillShape"
```

---

### Task 2: SkillRepository (file-backed)

**Files:**
- Create: `src/contracts/ports/skill-repository.ts`
- Create: `src/adapters/persistence/fileSkillRepository.ts`

**Interfaces:**

```typescript
export interface SkillRepository {
  listAll(): Promise<Skill[]>;
  saveGenerated(skill: Skill): Promise<Skill>;
}
```

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/adapters/persistence/fileSkillRepository.test.ts
import { describe, it, expect } from "vitest";
import { createFileSkillRepository } from "@/adapters/persistence/fileSkillRepository";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("createFileSkillRepository", () => {
  it("persists generated skill JSON", async () => {
    const dir = mkdtempSync(join(tmpdir(), "skills-"));
    const repo = createFileSkillRepository(dir);
    const saved = await repo.saveGenerated({
      id: "generated_test_skill",
      name: "Test skill",
      selectionSignals: ["test"],
      preconditions: {},
      moveTemplate: "Can you match this competing offer?",
    });
    expect(saved.id).toBe("generated_test_skill");
    const all = await repo.listAll();
    expect(all.some((s) => s.id === "generated_test_skill")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/persistence/fileSkillRepository.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement file repo**

```typescript
// src/adapters/persistence/fileSkillRepository.ts
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Skill, SkillRepository } from "@/contracts";
import { validateSkillShape } from "@/domain/skills/validateSkillShape";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";

export function createFileSkillRepository(generatedDir: string): SkillRepository {
  if (!existsSync(generatedDir)) mkdirSync(generatedDir, { recursive: true });

  return {
    async listAll() {
      const seeded = loadHomeCleaningSkills();
      const generated = readdirSync(generatedDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) =>
          validateSkillShape(JSON.parse(readFileSync(join(generatedDir, f), "utf8")))
        );
      return [...seeded, ...generated];
    },
    async saveGenerated(skill) {
      const valid = validateSkillShape(skill);
      writeFileSync(
        join(generatedDir, `${valid.id}.json`),
        JSON.stringify(valid, null, 2)
      );
      return valid;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/persistence/fileSkillRepository.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/contracts/ports/skill-repository.ts src/adapters/persistence/fileSkillRepository.ts config/skills/generated/.gitkeep tests/unit/adapters/persistence/fileSkillRepository.test.ts
git commit -m "feat(A8): file-backed SkillRepository for generated skills"
```

---

### Task 3: SkillGenerator service

**Files:**
- Create: `src/app/skills/skillGenerator.ts`
- Create: `tests/integration/skills/skillGenerator.test.ts`

**Interfaces:**

```typescript
export async function generateSkillFromAsk(
  deps: {
    planner: LLMPlanner;
    skillRepo: SkillRepository;
  },
  input: {
    customerAsk: string;
    jobSpec: JobSpec;
  }
): Promise<Skill>;
```

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/integration/skills/skillGenerator.test.ts
import { describe, it, expect } from "vitest";
import { generateSkillFromAsk } from "@/app/skills/skillGenerator";
import { createFakeLlmPlanner } from "@/adapters/fake/fakeLlmPlanner";
import { createFileSkillRepository } from "@/adapters/persistence/fileSkillRepository";
import { mkdtempSync } from "node:fs";
import { join } from "node:os";
import { tmpdir } from "node:os";
import type { JobSpec } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-sg-1",
  jobType: "recurring_weekly",
  sqft: 2000,
  bedrooms: 3,
  bathrooms: 2,
  frequency: "weekly",
  addOns: [],
  suppliesProvided: false,
  pets: true,
  accessNotes: "",
  conditionNotes: "",
  geo: "Austin, TX",
  confirmed: true,
};

describe("generateSkillFromAsk", () => {
  it("creates valid Skill for unseen ask and persists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sg-"));
    const planner = {
      async chooseSkill() {
        return {
          skillId: "ask_pet_fee_waiver",
          suggestedPhrasing: JSON.stringify({
            id: "ask_pet_fee_waiver",
            name: "Pet fee waiver",
            selectionSignals: ["pet fee", "pet surcharge"],
            preconditions: { requiresRecurringJob: true },
            moveTemplate: "We have pets but a recurring schedule — can you waive the pet fee?",
          }),
        };
      },
    };
    const skillRepo = createFileSkillRepository(dir);

    const skill = await generateSkillFromAsk(
      { planner, skillRepo },
      {
        customerAsk: "Can you negotiate away the pet surcharge?",
        jobSpec,
      }
    );

    expect(skill.id).toBe("ask_pet_fee_waiver");
    expect(skill.preconditions.requiresRecurringJob).toBe(true);
    const all = await skillRepo.listAll();
    expect(all.some((s) => s.id === "ask_pet_fee_waiver")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/skills/skillGenerator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement generator**

```typescript
// src/app/skills/skillGenerator.ts
import type { JobSpec, LLMPlanner, Skill, SkillRepository } from "@/contracts";
import { validateSkillShape } from "@/domain/skills/validateSkillShape";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";

export async function generateSkillFromAsk(
  deps: { planner: LLMPlanner; skillRepo: SkillRepository },
  input: { customerAsk: string; jobSpec: JobSpec }
): Promise<Skill> {
  const seeded = loadHomeCleaningSkills();
  const { suggestedPhrasing } = await deps.planner.chooseSkill({
    eligibleSkills: seeded,
    context: {
      jobSpec: input.jobSpec,
      quotesInHand: [],
      lastVendorUtterance: input.customerAsk,
    },
    kbSnippets: [
      `Customer ask: ${input.customerAsk}`,
      "Return JSON for a NEW skill with honest preconditions.",
    ],
  });

  const parsed = validateSkillShape(JSON.parse(suggestedPhrasing));
  return deps.skillRepo.saveGenerated(parsed);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/skills/skillGenerator.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/skills/skillGenerator.ts tests/integration/skills/skillGenerator.test.ts
git commit -m "feat(A8): SkillGenerator creates Skill from unseen ask via LLMPlanner"
```

---

## Definition of done

- [ ] `generateSkillFromAsk` produces Zod-valid `Skill` with honest preconditions
- [ ] Generated skills persist under `config/skills/generated/`
- [ ] Skill engine domain unchanged; new skills merge into catalog at load time
- [ ] `npm run ci` green on `lane-a/PR-A8-skill-generator`
