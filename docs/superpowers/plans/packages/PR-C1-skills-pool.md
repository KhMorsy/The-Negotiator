# PR-C1: Skills Pool + Authoring Guidelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the 12-skill seed (PR-A2) into a structured 50+ skill catalog organized by category, with a written authoring guide, a machine-enforced validation suite, and a catalog loader that merges category files — without changing the engine (`filterEligibleSkills` / `chooseNextSkill` untouched, OCP).

**Architecture:** Skills stay pure data in `config/skills/catalog/<category>.json`. A pure loader `loadSkillCatalog()` in `src/domain/skills/` merges category files and validates against the Zod skill schema. The authoring guide in `docs/skills/` is the human contract; the validation test suite is the machine contract — every rule in the guide that can be checked automatically IS checked automatically.

**Tech Stack:** TypeScript · Vitest · Zod schema from contracts · JSON config under `config/skills/catalog/`

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

**Layer docs:** [domain.md](../../../architecture/layers/domain.md) · [contracts.md](../../../architecture/layers/contracts.md)

**Lane:** **C (skills machine)**

**Branch:** `lane-c/PR-C1-skills-pool`

**Depends on:** PR-A2 (skill schema, `loadSkills.ts`, `filterEligibleSkills`)

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
```

**Extension type (new in this PR — additive only, existing `Skill` consumers unaffected):**

```typescript
// src/domain/skills/catalogTypes.ts
export type SkillCategory =
  | "fee_challenges"       // trip fee, supplies fee, cancellation, surcharges
  | "commitment_leverage"  // recurring, bundle, prepay, referral
  | "market_leverage"      // competing bid, price match, benchmark anchoring
  | "clarification"        // pricing model, all-in total, scope confirmation
  | "trust_verification"   // insurance, bonding, guarantee, reviews
  | "timing_flexibility";  // off-peak, weekday, scheduling trade-offs

export interface CatalogSkill extends Skill {
  category: SkillCategory;
  /** When the agent should NOT use this even if eligible (plain language, goes to planner prompt) */
  avoidWhen?: string;
}
```

---

## Skill catalog rules (mirror these in the authoring guide AND the validation tests)

1. **Honesty first:** any skill whose move references another quote, price, or offer MUST set `requiresCompetingQuote: true` (and usually `minQuotesInHand >= 1`). No skill may instruct the agent to invent facts.
2. **One move per skill:** `moveTemplate` is a single ask (one sentence, ≤ 200 chars). Compound asks become two skills.
3. **IDs:** `snake_case`, verb-first (`challenge_`, `ask_`, `leverage_`, `clarify_`, `confirm_`, `negotiate_`, `request_`, `waive_`), unique across the whole catalog including the PR-A2 seed.
4. **Selection signals:** 2–6 lowercase phrases a vendor would actually say; no duplicates within a skill.
5. **Template variables:** only from the allowed set `{{competingTotal}}`, `{{targetTotal}}`, `{{frequency}}`, `{{jobType}}`, `{{feeAmount}}`, `{{feeType}}`.
6. **Category balance:** every category has ≥ 5 skills; total ≥ 50.
7. **Recurring-only skills** (`requiresRecurringJob: true`) live in `commitment_leverage` or `timing_flexibility` only.

---

### Task 1: Authoring guide (docs before data)

**Files:**
- Create: `docs/skills/SKILL_AUTHORING_GUIDE.md`
- Create: `docs/skills/README.md` (index: guide, catalog layout, how to propose a skill)

**Guide must contain:** the 7 catalog rules above · the 6 categories with one worked example each · a "bad skill / why rejected" section (≥ 3 examples: dishonest leverage, compound ask, vague signals) · the generator hand-off note (PR-A8 generates into `config/skills/generated/`, same rules, validated by the same suite).

- [ ] **Step 1: Write both docs**
- [ ] **Step 2: Commit**

```bash
git add docs/skills/
git commit -m "docs(skills): add skill authoring guide and catalog rules"
```

---

### Task 2: Catalog schema + validation suite (the machine contract)

**Files:**
- Create: `src/domain/skills/catalogTypes.ts` (types above)
- Create: `src/domain/skills/validateCatalog.ts`
- Test: `tests/unit/domain/skills/validateCatalog.test.ts`

**Interfaces:**

```typescript
export interface CatalogViolation {
  skillId: string;
  rule: string;      // e.g. "honesty/leverage-requires-quote"
  message: string;
}

export function validateCatalog(skills: CatalogSkill[]): CatalogViolation[];
```

- [ ] **Step 1: Write the failing test** — feed a deliberately bad catalog (duplicate id; a "beat their price" move without `requiresCompetingQuote`; a 300-char compound template; an unknown `{{variable}}`; a category with 1 skill) and assert each produces its violation; assert a clean minimal catalog returns `[]`.
- [ ] **Step 2: Run test to verify it fails** — `npm run test -- tests/unit/domain/skills/validateCatalog.test.ts`
- [ ] **Step 3: Implement `validateCatalog`** — pure function, checks rules 1–7. For rule 1, flag templates matching `/quote|competing|other (company|cleaner)|beat|match.*price/i` without the precondition.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

```bash
git add src/domain/skills/catalogTypes.ts src/domain/skills/validateCatalog.ts tests/unit/domain/skills/validateCatalog.test.ts
git commit -m "feat(skills): add catalog validation enforcing authoring rules"
```

---

### Task 3: Author the catalog (50+ skills across 6 category files)

**Files:**
- Create: `config/skills/catalog/fee_challenges.json`
- Create: `config/skills/catalog/commitment_leverage.json`
- Create: `config/skills/catalog/market_leverage.json`
- Create: `config/skills/catalog/clarification.json`
- Create: `config/skills/catalog/trust_verification.json`
- Create: `config/skills/catalog/timing_flexibility.json`
- Test: `tests/unit/domain/skills/catalogContent.test.ts`

- [ ] **Step 1: Write the failing content test** — load all six files, run `validateCatalog`, expect zero violations; expect total ≥ 50, every category ≥ 5, ids disjoint from the PR-A2 seed (`loadHomeCleaningSkills()`).
- [ ] **Step 2: Run test to verify it fails** (files missing)
- [ ] **Step 3: Author the skills** — base them on the home-cleaning vertical config (`config/verticals/home_cleaning.json`: job types, red-flag fees) and the feature spec's negotiation levers. Every `market_leverage` skill sets `requiresCompetingQuote: true`.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

```bash
git add config/skills/catalog/ tests/unit/domain/skills/catalogContent.test.ts
git commit -m "feat(skills): author 50+ skill catalog across six categories"
```

---

### Task 4: Catalog loader (merge seed + catalog, engine unchanged)

**Files:**
- Create: `src/domain/skills/loadSkillCatalog.ts`
- Test: `tests/unit/domain/skills/loadSkillCatalog.test.ts`

**Interfaces:**

```typescript
/** Merges PR-A2 seed + category catalog (+ generated/, when PR-A8 lands). Throws if validateCatalog reports violations. */
export function loadSkillCatalog(): CatalogSkill[];
export function loadSkillsByCategory(category: SkillCategory): CatalogSkill[];
```

- [ ] **Step 1: Write the failing test** — `loadSkillCatalog()` returns ≥ 62 skills (12 seed + 50 catalog), no duplicate ids, and the result passes through `filterEligibleSkills` unchanged (spot-check: zero-quote context excludes every `requiresCompetingQuote` skill).
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement** — seed skills get `category` assigned in a mapping table inside the loader (do NOT edit `home_cleaning_skills.json`; Lane A's PR-A5 references it as-is).
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Update domain layer doc** — add module rows for `validateCatalog.ts`, `loadSkillCatalog.ts`, `catalogTypes.ts` in `docs/architecture/layers/domain.md`.
- [ ] **Step 6: Commit**

```bash
git add src/domain/skills/loadSkillCatalog.ts tests/unit/domain/skills/loadSkillCatalog.test.ts docs/architecture/layers/domain.md
git commit -m "feat(skills): add merged catalog loader with validation"
```

---

## PR completion checklist

- [ ] `docs/skills/SKILL_AUTHORING_GUIDE.md` states all 7 rules with examples and rejections
- [ ] `validateCatalog` enforces every automatable rule; content test green over the full catalog
- [ ] ≥ 50 catalog skills + 12 seed, unique ids, every category ≥ 5
- [ ] `filterEligibleSkills` / `chooseNextSkill` / `loadSkills.ts` NOT modified
- [ ] `npm run ci` green on `lane-c/PR-C1-skills-pool`
- [ ] Domain layer doc updated
