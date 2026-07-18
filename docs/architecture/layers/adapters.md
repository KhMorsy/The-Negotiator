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
| `TelephonyProvider` | `src/adapters/telephony/twilioElevenLabs.ts` | `src/adapters/fake/simulatedTelephony.ts` |
| `SpeechAgent` | `src/adapters/speech/elevenLabsAgent.ts` | `src/adapters/fake/fakeSpeechAgent.ts` |
| `LLMPlanner` / `LLMParser` / `DocumentParser` | `src/adapters/llm/openAiAdapter.ts` | `src/adapters/fake/fakeLlm.ts` |
| `KnowledgeBase` | `src/adapters/kb/pgVectorKb.ts` | `src/adapters/fake/inMemoryKb.ts` |
| `VendorDirectory` | `src/adapters/vendors/placesYelp.ts` | `src/adapters/fake/fakeVendorDirectory.ts` |
| Repositories | `src/adapters/persistence/supabase/*.ts` | `src/adapters/fake/inMemoryRepos.ts` |

## Testing rules

- Every adapter implements the matching `tests/contracts/ports/<port>.contract.test.ts` suite.
- Real adapters: optional opt-in live tests gated by env (`RUN_LIVE_ADAPTER_TESTS=1`); never required in CI.
- Fake adapters are the default for unit/integration/e2e in CI (zero secrets).

## Definition of done

- [ ] Port contract suite passes for the adapter under test
- [ ] No domain imports
- [ ] Env vars documented in `.env.example` (no secrets committed)
- [ ] This doc updated when adapters are added
