# PR-A4: Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `KnowledgeBase` port with an in-memory adapter for CI (seeded benchmark snippets) and a Supabase/pgvector-shaped stub adapter that implements the same interface for future live retrieval.

**Architecture:** Port interface lives in PR-01 contracts. `InMemoryKb` loads static snippets from JSON and scores by simple token overlap — sufficient for T1 and skill-engine tests. `PgVectorKb` stub returns the same snippet shape but reads from a pluggable query function (no network in CI); live vector search is wired behind `RUN_LIVE_ADAPTER_TESTS=1` in a follow-up if needed.

**Tech Stack:** TypeScript · Vitest · JSON seed data · pgvector schema documented in migration extension

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

**Layer docs:** [contracts.md](../../../architecture/layers/contracts.md) · [adapters.md](../../../architecture/layers/adapters.md)

**Branch:** `lane-a/PR-A4-knowledge-base`

**Depends on:** PR-01 (`KnowledgeBase` port), PR-A1 (optional — KB is independent of repos)

---

## Port signature (consume verbatim)

```typescript
// src/contracts/ports/knowledge-base.ts
export interface KnowledgeBaseResult {
  id: string;
  text: string;
  score: number;
}

export interface KnowledgeBase {
  retrieve(input: { query: string; topK: number }): Promise<KnowledgeBaseResult[]>;
}
```

---

### Task 1: Benchmark snippet seed data

**Files:**
- Create: `config/kb/home_cleaning_benchmarks.json`
- Create: `src/adapters/kb/loadBenchmarkSnippets.ts`
- Test: `tests/unit/adapters/kb/loadBenchmarkSnippets.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `loadHomeCleaningBenchmarks(): Array<{ id: string; text: string; tags: string[] }>`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/adapters/kb/loadBenchmarkSnippets.test.ts
import { describe, it, expect } from "vitest";
import { loadHomeCleaningBenchmarks } from "@/adapters/kb/loadBenchmarkSnippets";

describe("loadHomeCleaningBenchmarks", () => {
  it("loads at least 5 benchmark snippets", () => {
    const snippets = loadHomeCleaningBenchmarks();
    expect(snippets.length).toBeGreaterThanOrEqual(5);
    expect(snippets[0]).toMatchObject({
      id: expect.any(String),
      text: expect.any(String),
      tags: expect.any(Array),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/kb/loadBenchmarkSnippets.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write seed JSON + loader**

```json
[
  {
    "id": "bench-deep-clean-sqft",
    "text": "Oakland deep clean market range: $0.18–$0.28 per sqft for 1000–1500 sqft homes.",
    "tags": ["deep_clean", "sqft", "oakland", "benchmark"]
  },
  {
    "id": "bench-trip-fee",
    "text": "Typical trip or travel fees for Bay Area home cleaning: $25–$45; often waivable on recurring plans.",
    "tags": ["trip fee", "travel", "fee", "benchmark"]
  },
  {
    "id": "bench-first-clean",
    "text": "First-clean or initial deep premiums commonly run 15–30% above recurring visit pricing.",
    "tags": ["first clean", "premium", "benchmark"]
  },
  {
    "id": "bench-recurring-weekly",
    "text": "Weekly recurring cleans for 2BR/2BA ~1200 sqft often land $140–$190 all-in in the Bay Area.",
    "tags": ["recurring", "weekly", "benchmark"]
  },
  {
    "id": "bench-red-flag-lowball",
    "text": "Quotes more than 30% below local benchmark for the same scope are a red-flag signal.",
    "tags": ["red flag", "below market", "benchmark"]
  },
  {
    "id": "bench-supplies-fee",
    "text": "Separate supplies fees of $15–$35 are common; many vendors bundle supplies for recurring clients.",
    "tags": ["supplies", "fee", "benchmark"]
  },
  {
    "id": "bench-hourly-minimum",
    "text": "Hourly models often use a 3-hour minimum; all-in totals should include minimum hours plus fees.",
    "tags": ["hourly", "minimum hours", "pricing model"]
  }
]
```

```typescript
// src/adapters/kb/loadBenchmarkSnippets.ts
import benchmarks from "../../../config/kb/home_cleaning_benchmarks.json";

export interface BenchmarkSnippet {
  id: string;
  text: string;
  tags: string[];
}

export function loadHomeCleaningBenchmarks(): BenchmarkSnippet[] {
  return benchmarks as BenchmarkSnippet[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/kb/loadBenchmarkSnippets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add config/kb/home_cleaning_benchmarks.json src/adapters/kb/loadBenchmarkSnippets.ts tests/unit/adapters/kb/loadBenchmarkSnippets.test.ts
git commit -m "feat(kb): seed home cleaning benchmark snippets"
```

---

### Task 2: In-memory `KnowledgeBase` adapter

**Files:**
- Create: `src/adapters/fake/inMemoryKb.ts`
- Create: `src/adapters/kb/scoreSnippets.ts`
- Create: `tests/contracts/ports/knowledge-base.contract.test.ts`

**Interfaces:**
- Consumes: `KnowledgeBase`, `KnowledgeBaseResult` from `src/contracts`
- Produces: `createInMemoryKb(snippets?: BenchmarkSnippet[]): KnowledgeBase`

- [ ] **Step 1: Write the failing contract test**

```typescript
// tests/contracts/ports/knowledge-base.contract.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import type { KnowledgeBase } from "@/contracts";

export function knowledgeBaseContract(
  name: string,
  factory: () => KnowledgeBase
) {
  describe(`KnowledgeBase contract: ${name}`, () => {
    let kb: KnowledgeBase;

    beforeEach(() => {
      kb = factory();
    });

    it("retrieve returns at most topK results sorted by score desc", async () => {
      const results = await kb.retrieve({
        query: "trip fee Oakland deep clean",
        topK: 3,
      });

      expect(results.length).toBeLessThanOrEqual(3);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
      results.forEach((r) => {
        expect(r.id).toBeTruthy();
        expect(r.text).toBeTruthy();
        expect(r.score).toBeGreaterThanOrEqual(0);
      });
    });

    it("retrieve returns empty array for unrelated query when no overlap", async () => {
      const results = await kb.retrieve({
        query: "xyzzy_plugh_no_match_token",
        topK: 5,
      });
      expect(results).toEqual([]);
    });
  });
}

import { createInMemoryKb } from "@/adapters/fake/inMemoryKb";
import { loadHomeCleaningBenchmarks } from "@/adapters/kb/loadBenchmarkSnippets";

knowledgeBaseContract("in-memory", () =>
  createInMemoryKb(loadHomeCleaningBenchmarks())
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/contracts/ports/knowledge-base.contract.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write scorer + in-memory adapter**

```typescript
// src/adapters/kb/scoreSnippets.ts
import type { KnowledgeBaseResult } from "@/contracts";
import type { BenchmarkSnippet } from "./loadBenchmarkSnippets";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function scoreSnippets(
  snippets: BenchmarkSnippet[],
  query: string,
  topK: number
): KnowledgeBaseResult[] {
  const queryTokens = new Set(tokenize(query));

  const scored = snippets
    .map((snippet) => {
      const haystack = tokenize(`${snippet.text} ${snippet.tags.join(" ")}`);
      let overlap = 0;
      for (const token of haystack) {
        if (queryTokens.has(token)) overlap += 1;
      }
      const score = haystack.length === 0 ? 0 : overlap / haystack.length;
      return { id: snippet.id, text: snippet.text, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}
```

```typescript
// src/adapters/fake/inMemoryKb.ts
import type { KnowledgeBase } from "@/contracts";
import { loadHomeCleaningBenchmarks, type BenchmarkSnippet } from "@/adapters/kb/loadBenchmarkSnippets";
import { scoreSnippets } from "@/adapters/kb/scoreSnippets";

export function createInMemoryKb(
  snippets: BenchmarkSnippet[] = loadHomeCleaningBenchmarks()
): KnowledgeBase {
  return {
    async retrieve({ query, topK }) {
      return scoreSnippets(snippets, query, topK);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/contracts/ports/knowledge-base.contract.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/inMemoryKb.ts src/adapters/kb/scoreSnippets.ts tests/contracts/ports/knowledge-base.contract.test.ts
git commit -m "feat(kb): add in-memory KnowledgeBase with contract tests"
```

---

### Task 3: PgVector adapter stub (same interface)

**Files:**
- Create: `supabase/migrations/002_kb_vector.sql`
- Create: `src/adapters/kb/pgVectorKb.ts`
- Test: `tests/unit/adapters/kb/pgVectorKb.test.ts`

**Interfaces:**
- Consumes: `KnowledgeBase` port, `BenchmarkSnippet[]`
- Produces:

```typescript
export interface PgVectorQueryFn {
  (input: { query: string; topK: number }): Promise<
    Array<{ id: string; text: string; score: number }>
  >;
}

export function createPgVectorKb(options: {
  queryFn: PgVectorQueryFn;
  fallbackSnippets?: BenchmarkSnippet[];
}): KnowledgeBase;
```

- [ ] **Step 1: Write migration documenting vector table**

```sql
-- supabase/migrations/002_kb_vector.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_documents_embedding ON kb_documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

- [ ] **Step 2: Write failing unit test for stub adapter**

```typescript
// tests/unit/adapters/kb/pgVectorKb.test.ts
import { describe, it, expect } from "vitest";
import { createPgVectorKb } from "@/adapters/kb/pgVectorKb";
import { loadHomeCleaningBenchmarks } from "@/adapters/kb/loadBenchmarkSnippets";

describe("createPgVectorKb", () => {
  it("delegates to injected queryFn", async () => {
    const kb = createPgVectorKb({
      queryFn: async () => [
        { id: "vec-1", text: "vector result", score: 0.99 },
      ],
    });

    const results = await kb.retrieve({ query: "trip fee", topK: 1 });
    expect(results[0].text).toBe("vector result");
  });

  it("falls back to local snippet scoring when queryFn returns empty", async () => {
    const kb = createPgVectorKb({
      queryFn: async () => [],
      fallbackSnippets: loadHomeCleaningBenchmarks(),
    });

    const results = await kb.retrieve({ query: "trip fee", topK: 2 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].text.toLowerCase()).toContain("trip");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/kb/pgVectorKb.test.ts`
Expected: FAIL with module not found

- [ ] **Step 4: Write minimal stub implementation**

```typescript
// src/adapters/kb/pgVectorKb.ts
import type { KnowledgeBase } from "@/contracts";
import {
  loadHomeCleaningBenchmarks,
  type BenchmarkSnippet,
} from "./loadBenchmarkSnippets";
import { scoreSnippets } from "./scoreSnippets";

export interface PgVectorQueryFn {
  (input: { query: string; topK: number }): Promise<
    Array<{ id: string; text: string; score: number }>
  >;
}

export function createPgVectorKb(options: {
  queryFn: PgVectorQueryFn;
  fallbackSnippets?: BenchmarkSnippet[];
}): KnowledgeBase {
  const fallback = options.fallbackSnippets ?? loadHomeCleaningBenchmarks();

  return {
    async retrieve({ query, topK }) {
      const vectorHits = await options.queryFn({ query, topK });
      if (vectorHits.length > 0) {
        return vectorHits.slice(0, topK);
      }
      return scoreSnippets(fallback, query, topK);
    },
  };
}

/** Live wiring placeholder — inject a real Supabase RPC call here when RUN_LIVE_ADAPTER_TESTS=1 */
export function createDefaultPgVectorQueryFn(): PgVectorQueryFn {
  return async () => [];
}
```

- [ ] **Step 5: Register pgVector stub in contract suite**

Add to bottom of `tests/contracts/ports/knowledge-base.contract.test.ts`:

```typescript
import { createPgVectorKb } from "@/adapters/kb/pgVectorKb";

knowledgeBaseContract("pgvector-stub-fallback", () =>
  createPgVectorKb({
    queryFn: async () => [],
    fallbackSnippets: loadHomeCleaningBenchmarks(),
  })
);
```

- [ ] **Step 6: Run all KB tests**

Run: `npm run test -- tests/contracts/ports/knowledge-base.contract.test.ts tests/unit/adapters/kb/`
Expected: PASS

- [ ] **Step 7: Update adapters layer doc**

Document `inMemoryKb.ts`, `pgVectorKb.ts`, and migration `002_kb_vector.sql` in `docs/architecture/layers/adapters.md`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/002_kb_vector.sql src/adapters/kb/pgVectorKb.ts tests/unit/adapters/kb/pgVectorKb.test.ts docs/architecture/layers/adapters.md
git commit -m "feat(kb): add pgvector stub adapter with fallback scoring"
```

---

## PR completion checklist

- [ ] Contract tests pass for in-memory and pgvector-stub adapters
- [ ] Benchmark snippets seeded under `config/kb/`
- [ ] `npm run ci` green on `lane-a/PR-A4-knowledge-base`
- [ ] No domain imports in adapters
- [ ] Adapters layer doc updated
