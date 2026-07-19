# Layer: Domain

**Path:** `src/domain/`
**Owner lane:** Lane A owns Skill Engine / Quote Extractor / Audit; Lane B owns report pure functions (Normalizer, RedFlag, Trust, Ranker) and Job Spec Builder logic
**Parent architecture:** [2026-07-18-the-negotiator-architecture.md](../../specs/2026-07-18-the-negotiator-architecture.md) §3, §8

## Responsibility

Pure business logic that wins the challenge: honesty gate, skill filtering, quote normalization, red-flag evaluation, trust scoring, ranking, job-spec normalization. Domain code has **no vendor SDK imports**. It may call ports only via interfaces injected by the application layer (or, for pure functions, take plain data in / data out).

## Allowed / forbidden dependencies

| May import | Must NOT import |
|------------|-----------------|
| `src/contracts/**` | `src/adapters/**` |
| Pure utilities in `src/domain/**` | `openai`, `@supabase/*`, `twilio`, `@elevenlabs/*` |
| | `src/app/**`, `src/frontend/**`, Next.js, React |

## Key modules

| Module | Path | Kind |
|--------|------|------|
| Skill preconditions (honesty gate) | `src/domain/skills/filterEligibleSkills.ts` | Pure function |
| Skill engine | `src/domain/skills/skillEngine.ts` | Uses `LLMPlanner` + `KnowledgeBase` + `AuditRepository` ports |
| Seeded skills loader | `src/domain/skills/loadSkills.ts` | Reads JSON skill definitions from config |
| Skill catalog types | `src/domain/skills/catalogTypes.ts` | Catalog category extension of `Skill` |
| Skill catalog validator | `src/domain/skills/validateCatalog.ts` | Pure authoring-rule validation |
| Merged skill catalog loader | `src/domain/skills/loadSkillCatalog.ts` | Merges and validates seed and category data |
| Quote extractor | `src/domain/quotes/extractQuote.ts` | Uses `LLMParser` + `QuoteRepository` ports |
| Job Spec Builder | `src/domain/jobSpec/buildJobSpec.ts` | Pure merge + Zod validate |
| Quote Normalizer | `src/domain/report/normalizeQuote.ts` | Pure (flat/hourly/per-sqft) |
| RedFlag Evaluator | `src/domain/report/evaluateRedFlags.ts` | Pure (benchmark rules) |
| Trust Scorer | `src/domain/report/scoreTrust.ts` | Pure (vendor signals) |
| Ranker | `src/domain/report/rankQuotes.ts` | Pure (trust/price/red flags) |
| Audit Logger | `src/domain/audit/appendAuditEvent.ts` | Uses `AuditRepository` |

## Honesty gate (non-negotiable)

`filterEligibleSkills(skills, context)` MUST drop any skill whose preconditions fail. Example: `leverage_competing_bid` requires `context.quotesInHand.length >= 1` with a real `normalizedTotal`. Unit tests must cover the negative path (no fake bid possible).

## Testing rules

- Prefer **table-driven** Vitest unit tests with no mocks for pure functions.
- Skill engine tests inject fake `LLMPlanner` / `KnowledgeBase` / `AuditRepository`.
- Coverage target for honesty gate and report functions: every branch of the fixture tables.

## Definition of done

- [ ] No vendor imports (enforced by dependency-cruiser)
- [ ] Unit tests green for every pure function
- [ ] Honesty gate negative tests present
- [ ] This doc updated when modules are added/renamed
