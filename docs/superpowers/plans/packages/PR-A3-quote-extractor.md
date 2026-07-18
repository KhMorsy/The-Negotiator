# PR-A3: Quote Extractor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `extractQuote` domain function that parses call transcripts via the `LLMParser` port, using a deterministic fake LLM in tests, and persists structured `Quote` + `QuoteFee` rows through `QuoteRepository`.

**Architecture:** Domain orchestration in `src/domain/quotes/extractQuote.ts` accepts injected `LLMParser` and `QuoteRepository` — no OpenAI imports. Fake adapter under `src/adapters/fake/fakeLlmParser.ts` returns predictable fees from transcript keywords for CI. Persistence reuses PR-A1 in-memory quote repo in unit tests.

**Tech Stack:** TypeScript · Vitest · Zod quote schemas from contracts

**Master plan:** [2026-07-19-the-negotiator-master-plan.md](../2026-07-19-the-negotiator-master-plan.md)

**Layer docs:** [domain.md](../../../architecture/layers/domain.md) · [contracts.md](../../../architecture/layers/contracts.md) · [adapters.md](../../../architecture/layers/adapters.md)

**Branch:** `lane-a/PR-A3-quote-extractor`

**Depends on:** PR-01 (types + `LLMParser` port), PR-A1 (`QuoteRepository`)

---

## Port signatures (consume verbatim)

```typescript
// LLMParser — src/contracts/ports/llm-parser.ts
export interface LLMParser {
  extractQuoteFromTranscript(input: {
    transcript: { turns: Array<{ role: string; text: string }> };
    jobSpec: JobSpec;
  }): Promise<
    Omit<Quote, "id" | "callId" | "fees"> & {
      fees: Omit<QuoteFee, "id" | "quoteId">[];
    }
  >;
}

// QuoteRepository — from PR-A1
export interface QuoteRepository {
  create(
    input: Omit<Quote, "id" | "fees"> & {
      fees: Omit<QuoteFee, "id" | "quoteId">[];
    }
  ): Promise<Quote>;
  listByJobSpec(jobSpecId: string): Promise<Quote[]>;
  getById(id: string): Promise<Quote | null>;
}
```

---

### Task 1: Fake `LLMParser` with deterministic fees

**Files:**
- Create: `src/adapters/fake/fakeLlmParser.ts`
- Test: `tests/unit/adapters/fake/fakeLlmParser.test.ts`

**Interfaces:**
- Consumes: `JobSpec`, `Quote`, `QuoteFee`, `LLMParser` from `src/contracts`
- Produces: `createFakeLlmParser(): LLMParser`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/adapters/fake/fakeLlmParser.test.ts
import { describe, it, expect } from "vitest";
import { createFakeLlmParser } from "@/adapters/fake/fakeLlmParser";
import type { JobSpec } from "@/contracts";

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

describe("createFakeLlmParser", () => {
  it("extracts base price and trip fee from vendor utterance", async () => {
    const parser = createFakeLlmParser();
    const parsed = await parser.extractQuoteFromTranscript({
      jobSpec,
      transcript: {
        turns: [
          { role: "agent", text: "What is your price for a deep clean?" },
          {
            role: "vendor",
            text: "We charge $200 base plus a $35 trip fee, all flat rate.",
          },
        ],
      },
    });

    expect(parsed.basePrice).toBe(200);
    expect(parsed.normalizedTotal).toBe(235);
    expect(parsed.pricingModel).toBe("flat");
    expect(parsed.fees).toEqual(
      expect.arrayContaining([
        { feeType: "trip_fee", amount: 35 },
      ])
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/adapters/fake/fakeLlmParser.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/fake/fakeLlmParser.ts
import type { JobSpec, LLMParser } from "@/contracts";

function parseDollarAmount(text: string, label: RegExp): number | null {
  const match = text.match(label);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

export function createFakeLlmParser(): LLMParser {
  return {
    async extractQuoteFromTranscript({ transcript, jobSpec }) {
      const vendorText = transcript.turns
        .filter((t) => t.role === "vendor")
        .map((t) => t.text)
        .join(" ");

      const basePrice =
        parseDollarAmount(vendorText, /\$\s*(\d+(?:\.\d+)?)\s*base/i) ??
        parseDollarAmount(vendorText, /charge\s*\$\s*(\d+(?:\.\d+)?)/i) ??
        0;

      const tripFee =
        parseDollarAmount(vendorText, /(\d+(?:\.\d+)?)\s*trip fee/i) ?? 0;

      const fees = [];
      if (tripFee > 0) {
        fees.push({ feeType: "trip_fee", amount: tripFee });
      }

      const normalizedTotal = basePrice + fees.reduce((s, f) => s + f.amount, 0);

      return {
        jobSpecId: jobSpec.id,
        vendorId: "fake-vendor-from-transcript",
        basePrice,
        normalizedTotal,
        pricingModel: "flat",
        redFlag: false,
        round: 1,
        fees,
      };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/adapters/fake/fakeLlmParser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/fake/fakeLlmParser.ts tests/unit/adapters/fake/fakeLlmParser.test.ts
git commit -m "feat(adapters): add deterministic fake LLMParser for quotes"
```

---

### Task 2: Domain `extractQuote` with persistence

**Files:**
- Create: `src/domain/quotes/extractQuote.ts`
- Test: `tests/unit/domain/quotes/extractQuote.test.ts`

**Interfaces:**
- Consumes: `LLMParser`, `QuoteRepository`, `JobSpec`, `CallRound`
- Produces:

```typescript
export interface ExtractQuoteInput {
  callId: string;
  jobSpec: JobSpec;
  vendorId: string;
  round: CallRound;
  transcript: { turns: Array<{ role: string; text: string }> };
}

export interface ExtractQuoteDeps {
  parser: LLMParser;
  quoteRepo: QuoteRepository;
}

export async function extractQuote(
  deps: ExtractQuoteDeps,
  input: ExtractQuoteInput
): Promise<Quote>;
```

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/domain/quotes/extractQuote.test.ts
import { describe, it, expect } from "vitest";
import { extractQuote } from "@/domain/quotes/extractQuote";
import { createFakeLlmParser } from "@/adapters/fake/fakeLlmParser";
import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryQuoteRepository";
import type { JobSpec } from "@/contracts";

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

describe("extractQuote", () => {
  it("parses transcript and persists quote with fees", async () => {
    const quoteRepo = createInMemoryQuoteRepository();
    const parser = createFakeLlmParser();

    const quote = await extractQuote(
      { parser, quoteRepo },
      {
        callId: "call-1",
        jobSpec,
        vendorId: "vendor-1",
        round: 1,
        transcript: {
          turns: [
            { role: "vendor", text: "We charge $200 base plus a $35 trip fee." },
          ],
        },
      }
    );

    expect(quote.id).toBeTruthy();
    expect(quote.callId).toBe("call-1");
    expect(quote.vendorId).toBe("vendor-1");
    expect(quote.normalizedTotal).toBe(235);
    expect(quote.fees).toHaveLength(1);

    const listed = await quoteRepo.listByJobSpec(jobSpec.id);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(quote.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/domain/quotes/extractQuote.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/domain/quotes/extractQuote.ts
import type {
  CallRound,
  JobSpec,
  LLMParser,
  Quote,
  QuoteRepository,
} from "@/contracts";

export interface ExtractQuoteInput {
  callId: string;
  jobSpec: JobSpec;
  vendorId: string;
  round: CallRound;
  transcript: { turns: Array<{ role: string; text: string }> };
}

export interface ExtractQuoteDeps {
  parser: LLMParser;
  quoteRepo: QuoteRepository;
}

export async function extractQuote(
  deps: ExtractQuoteDeps,
  input: ExtractQuoteInput
): Promise<Quote> {
  const parsed = await deps.parser.extractQuoteFromTranscript({
    transcript: input.transcript,
    jobSpec: input.jobSpec,
  });

  return deps.quoteRepo.create({
    callId: input.callId,
    jobSpecId: input.jobSpec.id,
    vendorId: input.vendorId,
    basePrice: parsed.basePrice,
    normalizedTotal: parsed.normalizedTotal,
    pricingModel: parsed.pricingModel,
    redFlag: parsed.redFlag,
    round: input.round,
    fees: parsed.fees,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/domain/quotes/extractQuote.test.ts`
Expected: PASS

- [ ] **Step 5: Update layer docs**

Add `extractQuote.ts` to `docs/architecture/layers/domain.md` and `fakeLlmParser.ts` to `docs/architecture/layers/adapters.md`.

- [ ] **Step 6: Commit**

```bash
git add src/domain/quotes/extractQuote.ts tests/unit/domain/quotes/extractQuote.test.ts docs/architecture/layers/domain.md docs/architecture/layers/adapters.md
git commit -m "feat(quotes): add extractQuote with fake LLMParser and persistence"
```

---

## PR completion checklist

- [ ] Fake LLM returns deterministic fees for CI
- [ ] `extractQuote` persists via `QuoteRepository.create`
- [ ] `npm run ci` green on `lane-a/PR-A3-quote-extractor`
- [ ] No vendor SDK imports in domain
- [ ] Layer docs updated
