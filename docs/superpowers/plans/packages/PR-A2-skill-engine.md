# PR-A2: Skill Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the honesty gate (`filterEligibleSkills`), skill loader, audit logger, and `skillEngine` orchestration that filters skills, retrieves KB snippets, calls `LLMPlanner`, and persists audit events via `AuditRepository`.

**Architecture:** Pure precondition filtering lives in `src/domain/skills/filterEligibleSkills.ts` with no I/O. `skillEngine.ts` composes ports injected by callers: `LLMPlanner`, `KnowledgeBase`, `AuditRepository`. Twelve home-cleaning skills are seeded in JSON config; `leverage_competing_bid` sets `requiresCompetingQuote: true` so it is structurally blocked without real quotes.

**Tech Stack:** TypeScript · Vitest · Zod skill schema from contracts · JSON config under `config/skills/`

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

**Layer docs:** [domain.md](../../../architecture/layers/domain.md) · [contracts.md](../../../architecture/layers/contracts.md)

**Lane:** **C (skills machine)** — this package moved from Lane A to Lane C; Lane A consumes its exports only.

**Branch:** `lane-c/PR-A2-skill-engine`

**Depends on:** PR-01 (types + ports). Tests need `createInMemoryAuditRepository` from `src/adapters/fake/inMemoryAuditRepository.ts` — normally delivered by PR-A1; if PR-A1 has not merged yet, create it in this PR (a `Map`-backed `append`/`listByCall` in-memory repo) and notify Lane A to re-use it.

---

## Canonical types (from master plan — do not rename)

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

export interface AuditEvent {
  id: string;
  callId: string;
  skillId: string;
  authorizingEvidence: Record<string, unknown>;
  priceBefore: number | null;
  priceAfter: number | null;
  createdAt: string;
}
```

---

### Task 1: Seed 12 home-cleaning skills

**Files:**
- Create: `config/skills/home_cleaning_skills.json`
- Create: `src/contracts/schemas/skill.schema.ts` (if not in PR-01 — re-export only)
- Create: `src/domain/skills/loadSkills.ts`
- Test: `tests/unit/domain/skills/loadSkills.test.ts`

**Interfaces:**
- Consumes: `Skill`, `SkillPreconditions` from `src/contracts`
- Produces: `loadHomeCleaningSkills(): Skill[]`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/domain/skills/loadSkills.test.ts
import { describe, it, expect } from "vitest";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";

describe("loadHomeCleaningSkills", () => {
  it("loads 12 skills including leverage_competing_bid", () => {
    const skills = loadHomeCleaningSkills();
    expect(skills).toHaveLength(12);
    const leverage = skills.find((s) => s.id === "leverage_competing_bid");
    expect(leverage).toBeDefined();
    expect(leverage!.preconditions.requiresCompetingQuote).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/skills/loadSkills.test.ts`
Expected: FAIL with `Cannot find module '@/domain/skills/loadSkills'`

- [ ] **Step 3: Write JSON seed + loader**

```json
[
  {
    "id": "leverage_competing_bid",
    "name": "Leverage competing quote",
    "selectionSignals": ["competing quote", "beat price", "written estimate"],
    "preconditions": { "requiresCompetingQuote": true, "minQuotesInHand": 1 },
    "moveTemplate": "I have a written quote for ${{competingTotal}} all-in — can you beat that?"
  },
  {
    "id": "challenge_trip_fee",
    "name": "Challenge trip fee",
    "selectionSignals": ["trip fee", "travel charge", "dispatch fee"],
    "preconditions": {},
    "moveTemplate": "Can you waive or reduce the trip fee so the total is closer to ${{targetTotal}}?"
  },
  {
    "id": "challenge_first_clean_premium",
    "name": "Challenge first-clean premium",
    "selectionSignals": ["first clean", "initial deep", "first visit surcharge"],
    "preconditions": {},
    "moveTemplate": "Is the first-clean premium required, or can you match ongoing pricing?"
  },
  {
    "id": "challenge_supplies_fee",
    "name": "Challenge supplies fee",
    "selectionSignals": ["supplies fee", "product charge", "materials"],
    "preconditions": {},
    "moveTemplate": "Can you include supplies in the base price instead of a separate fee?"
  },
  {
    "id": "challenge_weekend_surcharge",
    "name": "Challenge weekend surcharge",
    "selectionSignals": ["weekend", "Saturday", "Sunday surcharge"],
    "preconditions": {},
    "moveTemplate": "Can you drop the weekend surcharge if we book a weekday instead?"
  },
  {
    "id": "ask_recurring_discount",
    "name": "Ask recurring discount",
    "selectionSignals": ["weekly", "biweekly", "monthly", "recurring"],
    "preconditions": { "requiresRecurringJob": true },
    "moveTemplate": "What recurring discount can you offer for {{frequency}} service?"
  },
  {
    "id": "ask_bundle_discount",
    "name": "Ask bundle discount",
    "selectionSignals": ["add-on", "oven", "fridge", "multiple services"],
    "preconditions": {},
    "moveTemplate": "If we bundle add-ons, can you reduce the all-in total?"
  },
  {
    "id": "clarify_pricing_model",
    "name": "Clarify pricing model",
    "selectionSignals": ["hourly", "per hour", "minimum hours", "per sqft"],
    "preconditions": {},
    "moveTemplate": "Can you confirm whether this is flat or hourly with a minimum, and the all-in total?"
  },
  {
    "id": "confirm_insurance_guarantee",
    "name": "Confirm insurance and guarantee",
    "selectionSignals": ["insured", "bonded", "guarantee", "satisfaction"],
    "preconditions": {},
    "moveTemplate": "Are you insured and bonded, and do you guarantee the clean?"
  },
  {
    "id": "negotiate_minimum_hours",
    "name": "Negotiate minimum hours",
    "selectionSignals": ["minimum hours", "3 hour minimum", "hourly minimum"],
    "preconditions": {},
    "moveTemplate": "Can you lower the minimum hours for this job size?"
  },
  {
    "id": "request_all_in_total",
    "name": "Request all-in total",
    "selectionSignals": ["plus fees", "before tax", "total price"],
    "preconditions": {},
    "moveTemplate": "What is the all-in total including every fee for this exact job?"
  },
  {
    "id": "waive_cancellation_fee",
    "name": "Waive cancellation fee",
    "selectionSignals": ["cancellation", "reschedule fee", "cancel policy"],
    "preconditions": {},
    "moveTemplate": "Can you waive the cancellation fee if we need to reschedule once?"
  }
]
```

```typescript
// src/domain/skills/loadSkills.ts
import skillsJson from "../../../config/skills/home_cleaning_skills.json";
import type { Skill } from "@/contracts";

export function loadHomeCleaningSkills(): Skill[] {
  return skillsJson as Skill[];
}
```

Enable JSON imports in `tsconfig.json` if missing: `"resolveJsonModule": true`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/skills/loadSkills.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add config/skills/home_cleaning_skills.json src/domain/skills/loadSkills.ts tests/unit/domain/skills/loadSkills.test.ts
git commit -m "feat(skills): seed 12 home cleaning negotiation skills"
```

---

### Task 2: Honesty gate — `filterEligibleSkills` (negative path required)

**Files:**
- Create: `src/domain/skills/filterEligibleSkills.ts`
- Create: `src/domain/skills/types.ts`
- Test: `tests/unit/domain/skills/filterEligibleSkills.test.ts`

**Interfaces:**
- Consumes: `Skill`, `JobSpec`, `Quote` from `src/contracts`
- Produces:

```typescript
export interface SkillEligibilityContext {
  jobSpec: JobSpec;
  quotesInHand: Quote[];
}

export function filterEligibleSkills(
  skills: Skill[],
  context: SkillEligibilityContext
): Skill[];
```

- [ ] **Step 1: Write the failing test (negative path for leverage_competing_bid)**

```typescript
// tests/unit/domain/skills/filterEligibleSkills.test.ts
import { describe, it, expect } from "vitest";
import { filterEligibleSkills } from "@/domain/skills/filterEligibleSkills";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";
import type { JobSpec, Quote } from "@/contracts";

const baseJobSpec: JobSpec = {
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

describe("filterEligibleSkills", () => {
  it("excludes leverage_competing_bid when quotesInHand is empty", () => {
    const skills = loadHomeCleaningSkills();
    const eligible = filterEligibleSkills(skills, {
      jobSpec: baseJobSpec,
      quotesInHand: [],
    });

    expect(eligible.map((s) => s.id)).not.toContain("leverage_competing_bid");
    expect(eligible.length).toBeGreaterThan(0);
  });

  it("includes leverage_competing_bid when a quote with normalizedTotal exists", () => {
    const skills = loadHomeCleaningSkills();
    const quote: Quote = {
      id: "q-1",
      callId: "c-1",
      jobSpecId: baseJobSpec.id,
      vendorId: "v-1",
      basePrice: 200,
      normalizedTotal: 240,
      pricingModel: "flat",
      fees: [],
      redFlag: false,
      round: 1,
    };

    const eligible = filterEligibleSkills(skills, {
      jobSpec: baseJobSpec,
      quotesInHand: [quote],
    });

    expect(eligible.map((s) => s.id)).toContain("leverage_competing_bid");
  });

  it("excludes ask_recurring_discount for one-time jobs", () => {
    const skills = loadHomeCleaningSkills();
    const eligible = filterEligibleSkills(skills, {
      jobSpec: { ...baseJobSpec, frequency: "once", jobType: "deep_clean" },
      quotesInHand: [],
    });
    expect(eligible.map((s) => s.id)).not.toContain("ask_recurring_discount");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/skills/filterEligibleSkills.test.ts`
Expected: FAIL with `Cannot find module '@/domain/skills/filterEligibleSkills'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/domain/skills/types.ts
import type { JobSpec, Quote } from "@/contracts";

export interface SkillEligibilityContext {
  jobSpec: JobSpec;
  quotesInHand: Quote[];
}
```

```typescript
// src/domain/skills/filterEligibleSkills.ts
import type { Skill } from "@/contracts";
import type { SkillEligibilityContext } from "./types";

function isRecurringJob(context: SkillEligibilityContext): boolean {
  return (
    context.jobSpec.frequency !== "once" ||
    context.jobSpec.jobType.startsWith("recurring_")
  );
}

function hasCompetingQuote(context: SkillEligibilityContext): boolean {
  return context.quotesInHand.some((q) => q.normalizedTotal > 0);
}

export function filterEligibleSkills(
  skills: Skill[],
  context: SkillEligibilityContext
): Skill[] {
  return skills.filter((skill) => {
    const pre = skill.preconditions;

    if (pre.requiresCompetingQuote && !hasCompetingQuote(context)) {
      return false;
    }

    if (pre.requiresRecurringJob && !isRecurringJob(context)) {
      return false;
    }

    if (
      pre.minQuotesInHand != null &&
      context.quotesInHand.length < pre.minQuotesInHand
    ) {
      return false;
    }

    return true;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/skills/filterEligibleSkills.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domain/skills/filterEligibleSkills.ts src/domain/skills/types.ts tests/unit/domain/skills/filterEligibleSkills.test.ts
git commit -m "feat(skills): add honesty gate filterEligibleSkills"
```

---

### Task 3: Audit logger domain helper

**Files:**
- Create: `src/domain/audit/appendAuditEvent.ts`
- Test: `tests/unit/domain/audit/appendAuditEvent.test.ts`

**Interfaces:**
- Consumes: `AuditRepository`, `AuditEvent` from `src/contracts`
- Produces:

```typescript
export async function appendAuditEvent(
  repo: AuditRepository,
  input: Omit<AuditEvent, "id" | "createdAt">
): Promise<AuditEvent>;
```

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/domain/audit/appendAuditEvent.test.ts
import { describe, it, expect } from "vitest";
import { appendAuditEvent } from "@/domain/audit/appendAuditEvent";
import { createInMemoryAuditRepository } from "@/adapters/fake/inMemoryAuditRepository";

describe("appendAuditEvent", () => {
  it("delegates to AuditRepository.append", async () => {
    const repo = createInMemoryAuditRepository();
    const event = await appendAuditEvent(repo, {
      callId: "call-1",
      skillId: "challenge_trip_fee",
      authorizingEvidence: { utterance: "trip fee $35" },
      priceBefore: 235,
      priceAfter: null,
    });

    expect(event.skillId).toBe("challenge_trip_fee");
    const listed = await repo.listByCall("call-1");
    expect(listed).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/audit/appendAuditEvent.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/domain/audit/appendAuditEvent.ts
import type { AuditEvent, AuditRepository } from "@/contracts";

export async function appendAuditEvent(
  repo: AuditRepository,
  input: Omit<AuditEvent, "id" | "createdAt">
): Promise<AuditEvent> {
  return repo.append(input);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/audit/appendAuditEvent.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/audit/appendAuditEvent.ts tests/unit/domain/audit/appendAuditEvent.test.ts
git commit -m "feat(audit): add appendAuditEvent domain helper"
```

---

### Task 4: `skillEngine` — filter → KB → planner → audit

**Files:**
- Create: `src/domain/skills/skillEngine.ts`
- Test: `tests/unit/domain/skills/skillEngine.test.ts`

**Interfaces:**
- Consumes:
  - `LLMPlanner.chooseSkill(input): Promise<{ skillId: string; suggestedPhrasing: string }>`
  - `KnowledgeBase.retrieve(input): Promise<Array<{ id: string; text: string; score: number }>>`
  - `AuditRepository`
  - `filterEligibleSkills`, `appendAuditEvent`
- Produces:

```typescript
export interface SkillEngineInput {
  callId: string;
  skills: Skill[];
  context: SkillEligibilityContext;
  lastVendorUtterance: string;
  priceBefore: number | null;
  priceAfter?: number | null;
  kbQuery?: string;
}

export interface SkillEngineDeps {
  planner: LLMPlanner;
  kb: KnowledgeBase;
  auditRepo: AuditRepository;
}

export async function chooseNextSkill(
  deps: SkillEngineDeps,
  input: SkillEngineInput
): Promise<{
  skillId: string;
  suggestedPhrasing: string;
  eligibleSkillIds: string[];
  auditEvent: AuditEvent;
}>;
```

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/domain/skills/skillEngine.test.ts
import { describe, it, expect, vi } from "vitest";
import { chooseNextSkill } from "@/domain/skills/skillEngine";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";
import { createInMemoryAuditRepository } from "@/adapters/fake/inMemoryAuditRepository";
import type { JobSpec, LLMPlanner, KnowledgeBase, Quote } from "@/contracts";

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

describe("chooseNextSkill", () => {
  it("never plans leverage_competing_bid without quotes in hand", async () => {
    const skills = loadHomeCleaningSkills();
    const auditRepo = createInMemoryAuditRepository();

    const planner: LLMPlanner = {
      chooseSkill: vi.fn(async ({ eligibleSkills }) => ({
        skillId: eligibleSkills[0]!.id,
        suggestedPhrasing: "test phrasing",
      })),
    };

    const kb: KnowledgeBase = {
      retrieve: vi.fn(async () => [
        { id: "kb-1", text: "Average deep clean $0.20/sqft", score: 0.9 },
      ]),
    };

    const result = await chooseNextSkill(
      { planner, kb, auditRepo },
      {
        callId: "call-1",
        skills,
        context: { jobSpec, quotesInHand: [] },
        lastVendorUtterance: "Our price is $280 plus trip fee",
        priceBefore: 280,
      }
    );

    expect(result.eligibleSkillIds).not.toContain("leverage_competing_bid");
    expect(result.auditEvent.skillId).toBe(result.skillId);
    expect(result.auditEvent.authorizingEvidence).toMatchObject({
      eligibleSkillIds: result.eligibleSkillIds,
    });
  });

  it("allows leverage_competing_bid when competing quote exists", async () => {
    const skills = loadHomeCleaningSkills();
    const auditRepo = createInMemoryAuditRepository();
    const quote: Quote = {
      id: "q-1",
      callId: "call-2",
      jobSpecId: jobSpec.id,
      vendorId: "v-other",
      basePrice: 200,
      normalizedTotal: 240,
      pricingModel: "flat",
      fees: [],
      redFlag: false,
      round: 1,
    };

    const planner: LLMPlanner = {
      chooseSkill: vi.fn(async () => ({
        skillId: "leverage_competing_bid",
        suggestedPhrasing: "I have a written quote at $240 all-in.",
      })),
    };

    const kb: KnowledgeBase = {
      retrieve: vi.fn(async () => []),
    };

    const result = await chooseNextSkill(
      { planner, kb, auditRepo },
      {
        callId: "call-2",
        skills,
        context: { jobSpec, quotesInHand: [quote] },
        lastVendorUtterance: "We charge $280",
        priceBefore: 280,
      }
    );

    expect(result.skillId).toBe("leverage_competing_bid");
    expect(result.eligibleSkillIds).toContain("leverage_competing_bid");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/skills/skillEngine.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/domain/skills/skillEngine.ts
import { appendAuditEvent } from "@/domain/audit/appendAuditEvent";
import type {
  AuditEvent,
  KnowledgeBase,
  LLMPlanner,
  Skill,
} from "@/contracts";
import type { AuditRepository } from "@/contracts";
import { filterEligibleSkills } from "./filterEligibleSkills";
import type { SkillEligibilityContext } from "./types";

export interface SkillEngineInput {
  callId: string;
  skills: Skill[];
  context: SkillEligibilityContext;
  lastVendorUtterance: string;
  priceBefore: number | null;
  priceAfter?: number | null;
  kbQuery?: string;
}

export interface SkillEngineDeps {
  planner: LLMPlanner;
  kb: KnowledgeBase;
  auditRepo: AuditRepository;
}

export async function chooseNextSkill(
  deps: SkillEngineDeps,
  input: SkillEngineInput
): Promise<{
  skillId: string;
  suggestedPhrasing: string;
  eligibleSkillIds: string[];
  auditEvent: AuditEvent;
}> {
  const eligible = filterEligibleSkills(input.skills, input.context);
  const eligibleSkillIds = eligible.map((s) => s.id);

  if (eligible.length === 0) {
    throw new Error("No eligible skills after honesty gate");
  }

  const kbSnippets = await deps.kb.retrieve({
    query:
      input.kbQuery ??
      `${input.lastVendorUtterance} ${input.context.jobSpec.jobType} ${input.context.jobSpec.geo}`,
    topK: 5,
  });

  const plan = await deps.planner.chooseSkill({
    eligibleSkills: eligible,
    context: {
      jobSpec: input.context.jobSpec,
      quotesInHand: input.context.quotesInHand,
      lastVendorUtterance: input.lastVendorUtterance,
    },
    kbSnippets: kbSnippets.map((s) => s.text),
  });

  const auditEvent = await appendAuditEvent(deps.auditRepo, {
    callId: input.callId,
    skillId: plan.skillId,
    authorizingEvidence: {
      eligibleSkillIds,
      kbSnippetIds: kbSnippets.map((s) => s.id),
      lastVendorUtterance: input.lastVendorUtterance,
      quotesInHand: input.context.quotesInHand.map((q) => ({
        quoteId: q.id,
        normalizedTotal: q.normalizedTotal,
      })),
    },
    priceBefore: input.priceBefore,
    priceAfter: input.priceAfter ?? null,
  });

  return {
    skillId: plan.skillId,
    suggestedPhrasing: plan.suggestedPhrasing,
    eligibleSkillIds,
    auditEvent,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/skills/skillEngine.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Update domain layer doc**

Add module rows for `filterEligibleSkills.ts`, `skillEngine.ts`, `loadSkills.ts`, `appendAuditEvent.ts` in `docs/architecture/layers/domain.md`.

- [ ] **Step 6: Commit**

```bash
git add src/domain/skills/skillEngine.ts tests/unit/domain/skills/skillEngine.test.ts docs/architecture/layers/domain.md
git commit -m "feat(skills): add skillEngine with honesty gate and audit logging"
```

---

## PR completion checklist

- [ ] Honesty gate negative test proves `leverage_competing_bid` blocked with zero quotes
- [ ] 12 skills loaded from JSON; `requiresCompetingQuote: true` on leverage skill
- [ ] `npm run ci` green on `lane-c/PR-A2-skill-engine`
- [ ] No adapter imports in `src/domain/**`
- [ ] Domain layer doc updated
