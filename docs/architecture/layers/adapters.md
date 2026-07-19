# Layer: Adapters

**Path:** `src/adapters/`
**Owner lane:** Lane A (primary); Lane B may add fakes for UI tests
**Parent architecture:** [2026-07-18-the-negotiator-architecture.md](../../specs/2026-07-18-the-negotiator-architecture.md) §3 adapters, §8 ports

## Responsibility

Implements port interfaces against concrete vendors (or fakes for CI/demo). **This is the only layer that may import vendor SDKs.** Each adapter must pass the shared port contract suite.

## Allowed / forbidden dependencies

| May import | Must NOT import |
|------------|-----------------|
| `src/contracts/**` | `src/domain/**` |
| Own vendor SDK | `src/app/**` (except types if needed — prefer not) |
| `src/adapters/fake/**` (test helpers) | Other adapters' private internals |

## Adapter map

| Port | Real adapter | Fake / demo adapter |
|------|--------------|---------------------|
| `TelephonyProvider` | `src/adapters/telephony/twilioElevenLabs.ts` | `src/adapters/fake/simulatedTelephony.ts` — personas: `vendor-tough`, `vendor-lowball`, `vendor-upseller` |
| `SpeechAgent` | `src/adapters/speech/elevenLabsAgent.ts` | `src/adapters/fake/fakeSpeechAgent.ts` |
| `LLMPlanner` / `LLMParser` / `DocumentParser` | `src/adapters/llm/openAiAdapter.ts` | `src/adapters/fake/fakeLlmParser.ts` |
| `KnowledgeBase` | `src/adapters/kb/tavilyKb.ts` (live), `src/adapters/kb/pgVectorKb.ts` | `src/adapters/fake/inMemoryKb.ts` |
| `VendorDirectory` | `src/adapters/vendors/placesYelp.ts` | `src/adapters/fake/fakeVendorDirectory.ts` |
| Repositories | `src/adapters/persistence/supabase/*.ts` | `src/adapters/fake/inMemoryRepos.ts` |
| `AuditRepository` (fake) | — | `src/adapters/fake/inMemoryAuditRepository.ts` |
| `CallRepository` (fake) | — | `src/adapters/fake/inMemoryCallRepository.ts` |

PR-B2 adds deterministic fake speech and document-parser adapters for the
simulated intake flow: `fakeSpeechAgent.ts` and `fakeDocumentParser.ts`.

PR-A6 adds `ElevenLabsAgentAdapter` behind `SpeechAgent`; the composition root
selects it only when `USE_SIMULATED_SPEECH=false` and both ElevenLabs
credentials are present. The fake remains the default for CI and local demos.

PR-A7 adds a Twilio adapter behind `TelephonyProvider`; the composition root
keeps simulated telephony by default and selects Twilio only when
`USE_SIMULATED_TELEPHONY=false` with the required Twilio and ElevenLabs values.

PR-A10 adds `createTavilyKb` behind `KnowledgeBase`. The composition root
selects it when `KB_PROVIDER=tavily` and `TAVILY_API_KEY` are set; otherwise
it keeps the snippet-backed in-memory KB. Live Tavily results fall back to
snippets on empty responses or search errors.

## Repository adapters

- Fake unified factory: `src/adapters/fake/inMemoryRepos.ts`
- Fake per-port repos: `src/adapters/fake/inMemory{JobSpec,Call,Quote,Audit}Repository.ts`
- Supabase-shaped repos: `src/adapters/persistence/supabase/*.ts`
- Supabase schema doc: `supabase/migrations/001_init.sql`
- Call repositories persist call outcomes and optional recording URLs.

## Knowledge-base adapters

- Seeded benchmarks: `config/kb/home_cleaning_benchmarks.json`
- CI fake / snippet default: `src/adapters/fake/inMemoryKb.ts`
- Live web-search adapter: `src/adapters/kb/tavilyKb.ts` (`KB_PROVIDER=tavily`)
- Pgvector-shaped fallback adapter: `src/adapters/kb/pgVectorKb.ts`
- Vector schema migration: `supabase/migrations/002_kb_vector.sql`

## Testing rules

- Every adapter implements the matching `tests/contracts/ports/<port>.contract.test.ts` suite.
- Real adapters: optional opt-in live tests gated by env (`RUN_LIVE_ADAPTER_TESTS=1`); never required in CI.
- Fake adapters are the default for unit/integration/e2e in CI (zero secrets).

## Definition of done

- [ ] Port contract suite passes for the adapter under test
- [ ] No domain imports
- [ ] Env vars documented in `.env.example` (no secrets committed)
- [ ] This doc updated when adapters are added
