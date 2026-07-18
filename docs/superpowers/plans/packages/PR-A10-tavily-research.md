# PR-A10: Tavily Market Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the Tavily search API to (a) refresh the committed benchmark snippets with researched market data + source URLs (offline script), and (b) add a live `TavilyKb` adapter behind the existing `KnowledgeBase` port, env-selected with fallback — domain and application code unchanged (OCP).

**Architecture:** The `KnowledgeBase` port (PR-01/PR-A4) is untouched. `createTavilyKb` is one more adapter passing the same contract suite; composition root selects it via `KB_PROVIDER=tavily` and falls back to snippet scoring on error or empty results. The refresh script lives outside `src/` and only rewrites `config/kb/*.json`; committed JSON stays the CI + demo default so the demo never depends on a live API.

**Tech Stack:** TypeScript · Vitest · Tavily REST API (`https://api.tavily.com/search`) · JSON snippets

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

**Layer docs:** [adapters.md](../../../architecture/layers/adapters.md)

**Lane:** A (adapters territory)

**Branch:** `lane-a/PR-A10-tavily-research`

**Depends on:** PR-A4 (snippet loaders + KB contract suite). Offline-script Task 2 may be run any time after PR-A4 — even during T1 — because it only regenerates committed JSON; the live adapter (Tasks 3–4) is T2 and waits for PR-I1.

---

## Port signature (consume verbatim — do NOT change)

```typescript
export interface KnowledgeBase {
  retrieve(input: { query: string; topK: number }): Promise<KnowledgeBaseResult[]>;
}
```

---

### Task 1: Extend snippet shape with provenance (additive only)

**Files:**
- Edit: `src/adapters/kb/loadBenchmarkSnippets.ts` (add optional fields)
- Test: extend `tests/unit/adapters/kb/loadBenchmarkSnippets.test.ts`

```typescript
export interface BenchmarkSnippet {
  id: string;
  text: string;
  tags: string[];
  sourceUrl?: string;   // NEW: provenance for report citations
  fetchedAt?: string;   // NEW: ISO date of research run
}
```

- [ ] **Step 1: Extend the test** — snippets with and without `sourceUrl` both load; existing tests stay green.
- [ ] **Step 2: Implement, run, commit**

```bash
git commit -m "feat(kb): add provenance fields to benchmark snippets"
```

---

### Task 2: Offline benchmark refresh script (quality boost, no runtime risk)

**Files:**
- Create: `scripts/research/refresh-benchmarks.mjs`
- Edit: `config/kb/home_cleaning_benchmarks.json` (regenerated output, reviewed by hand)

**Behavior:** For each query in a fixed list (deep-clean $/sqft Bay Area, trip fees, first-clean premium, recurring weekly 2BR/2BA, supplies fee, hourly minimums, red-flag lowball threshold), call Tavily search (`TAVILY_API_KEY` from `.env.local`), extract a one-sentence benchmark with the number range, and emit a snippet with `sourceUrl` + `fetchedAt`. Print the diff; a human reviews before committing.

- [ ] **Step 1: Write script** (plain Node, `fetch`, no new deps)
- [ ] **Step 2: Run locally, review output** — every regenerated snippet must keep its stable `id` so KB tests and audit references stay valid; keep hand-written fallback text when Tavily returns nothing usable.
- [ ] **Step 3: Run full KB test suite** — `npm run test -- tests/unit/adapters/kb/ tests/contracts/ports/knowledge-base.contract.test.ts` → PASS
- [ ] **Step 4: Commit regenerated JSON + script**

```bash
git commit -m "feat(kb): refresh benchmarks from Tavily research with citations"
```

---

### Task 3: `createTavilyKb` adapter (same contract, env-flagged)

**Files:**
- Create: `src/adapters/kb/tavilyKb.ts`
- Test: `tests/unit/adapters/kb/tavilyKb.test.ts` + register in contract suite with injected fake fetch

**Interfaces:**

```typescript
export interface TavilySearchFn {
  (input: { query: string; maxResults: number }): Promise<
    Array<{ url: string; content: string; score: number }>
  >;
}

export function createTavilyKb(options: {
  searchFn: TavilySearchFn;                 // injected; real impl reads TAVILY_API_KEY
  fallback: KnowledgeBase;                  // snippet-backed KB from PR-A4
}): KnowledgeBase;

export function createDefaultTavilySearchFn(): TavilySearchFn; // real fetch to api.tavily.com
```

- [ ] **Step 1: Failing tests** — maps Tavily results to `KnowledgeBaseResult` (id = url, text = content, score passthrough, capped at topK); falls back to `options.fallback` when searchFn throws or returns `[]`.
- [ ] **Step 2: Implement minimal adapter; register `knowledgeBaseContract("tavily-fake-fetch", ...)` with a fake searchFn.**
- [ ] **Step 3: Run tests → PASS. CI never calls the real API.**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(kb): add Tavily live adapter behind KnowledgeBase port"
```

---

### Task 4: Composition wiring + env

**Files:**
- Edit: `src/app/composition/**` (KB selection: `KB_PROVIDER=tavily` → `createTavilyKb(...)`, default → snippet KB)
- Edit: `.env.example` (add `TAVILY_API_KEY=`, `KB_PROVIDER=snippets`)
- Edit: `docs/architecture/layers/adapters.md` (module rows)

- [ ] **Step 1: Wire + document; `npm run ci` green**
- [ ] **Step 2: Manual smoke with real key locally (`RUN_LIVE_ADAPTER_TESTS=1`), note result in PR body**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(kb): select KB provider via env with snippet fallback"
```

---

## PR completion checklist

- [ ] `KnowledgeBase` port and all PR-A4 tests unchanged and green
- [ ] Refreshed snippets carry `sourceUrl` + `fetchedAt`; stable ids preserved
- [ ] Tavily adapter passes the shared contract suite with fake fetch; CI makes zero network calls
- [ ] `KB_PROVIDER` defaults to snippets; demo works with no Tavily key present
- [ ] Adapters layer doc updated
