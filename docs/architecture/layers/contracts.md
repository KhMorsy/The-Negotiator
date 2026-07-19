# Layer: Contracts

**Path:** `src/contracts/`
**Owner lanes:** Both (changes require coordination; prefer PR-01 style contract PRs)
**Parent architecture:** [2026-07-18-the-negotiator-architecture.md](../../specs/2026-07-18-the-negotiator-architecture.md) §8

## Status

**PR-01 landed** (`CONTRACTS_VERSION === "0.1.0"`).

Key files:
- `src/contracts/index.ts`
- `src/contracts/types/*`
- `src/contracts/schemas/*`
- `src/contracts/ports/*`
- `src/contracts/config/vertical.ts`
- `config/verticals/home_cleaning.json`
- `tests/unit/contracts/*`

## Responsibility

Owns the **shared language** of the system: TypeScript types, Zod schemas, port interfaces, and vertical config shapes. Every other layer imports from here. Nothing in `contracts` imports from `domain`, `app`, `adapters`, or `frontend`.

## Allowed / forbidden dependencies

| May import | Must NOT import |
|------------|-----------------|
| `zod` (and other pure schema libs) | `domain`, `app`, `adapters`, `frontend` |
| Node built-ins only if purely type-level | Vendor SDKs (`openai`, `@supabase/*`, `twilio`, `elevenlabs`) |

## Key modules

| File | Purpose |
|------|---------|
| `src/contracts/types/job-spec.ts` | `JobSpec`, `JobType`, add-ons |
| `src/contracts/types/quote.ts` | `Quote`, `QuoteFee`, `PricingModel` |
| `src/contracts/types/call.ts` | `Call`, `CallOutcome`, `CallRound` |
| `src/contracts/types/skill.ts` | `Skill`, `SkillPreconditions`, `SkillSelectionSignals` |
| `src/contracts/types/skill-catalog.ts` | `CatalogSkill`, `SkillCategory` for generated catalog entries |
| `src/contracts/types/audit.ts` | `AuditEvent` |
| `src/contracts/types/vendor.ts` | `Vendor` |
| `src/contracts/types/report.ts` | `ReportPrimary`, `ReportDrilldowns` |
| `src/contracts/schemas/*.ts` | Zod mirrors of the types above |
| `src/contracts/ports/*.ts` | Port interfaces (DIP seam) |
| `src/contracts/config/vertical.ts` | Vertical config schema |
| `config/verticals/home_cleaning.json` | Seeded home-cleaning vertical |

## Port interfaces (canonical signatures)

```typescript
// TelephonyProvider
startCall(input: { jobSpecId: string; vendorId: string; round: 1 | 2 }): Promise<{ callId: string }>;
endCall(callId: string): Promise<void>;

// SpeechAgent
startIntakeSession(jobSpecDraftId: string): Promise<{ sessionId: string }>;
getIntakeTranscript(sessionId: string): Promise<{ turns: Array<{ role: string; text: string }> }>;

// LLMPlanner
chooseSkill(input: {
  eligibleSkills: Skill[];
  context: { jobSpec: JobSpec; quotesInHand: Quote[]; lastVendorUtterance: string };
  kbSnippets: string[];
}): Promise<{ skillId: string; suggestedPhrasing: string }>;

// LLMParser
extractQuoteFromTranscript(input: {
  transcript: { turns: Array<{ role: string; text: string }> };
  jobSpec: JobSpec;
}): Promise<Omit<Quote, "id" | "callId"> & { fees: Omit<QuoteFee, "id" | "quoteId">[] }>;

// DocumentParser
parseExistingQuote(input: { bytes: Uint8Array; mimeType: string }): Promise<Partial<JobSpec> & { leverageQuote?: { amount: number; vendorName?: string } }>;
parseRoomPhotos(input: { images: Array<{ bytes: Uint8Array; mimeType: string }> }): Promise<Partial<JobSpec>>;

// KnowledgeBase
retrieve(input: { query: string; topK: number }): Promise<Array<{ id: string; text: string; score: number }>>;

// VendorDirectory
findVendors(input: { geo: string; jobType: JobType; limit: number }): Promise<Vendor[]>;

// Repositories
JobSpecRepository: create | getById | confirm | updateDraft
CallRepository: create | getById | updateOutcome | updateRecordingUrl | listByJobSpec
QuoteRepository: create | listByJobSpec | getById
AuditRepository: append | listByCall
```

## Testing rules

- Zod schemas must round-trip fixture objects (parse → serialize → parse).
- Port signatures are covered by **contract test suites** under `tests/contracts/ports/` that every adapter must satisfy.
- No network I/O in this layer.

## Definition of done

- [ ] All types and ports exported from `src/contracts/index.ts`
- [ ] Schema fixtures pass
- [ ] `dependency-cruiser` allows only permitted imports
- [ ] This doc updated when ports/types change
- [ ] Lane A and Lane B agree on any signature change before merge
