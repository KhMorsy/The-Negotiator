# Layer: Application

**Path:** `src/app/`
**Owner lane:** Lane B (orchestrators + report composer); Lane A (webhook handlers)
**Parent architecture:** [2026-07-18-the-negotiator-architecture.md](../../specs/2026-07-18-the-negotiator-architecture.md) §3

## Responsibility

Orchestrates use cases: intake flow, call orchestration, webhook event routing, report composition. Application modules **depend on ports and domain functions**, never on concrete adapters. Adapters are wired only in the **composition root** (`src/app/composition/` or Next.js route handlers that construct deps).

## Allowed / forbidden dependencies

| May import | Must NOT import |
|------------|-----------------|
| `src/contracts/**` | Vendor SDKs directly |
| `src/domain/**` | `src/adapters/**` (except inside `src/app/composition/**`) |
| Next.js route helpers | |

**Composition root exception:** `src/app/composition/createContainer.ts` is the only place that may import `src/adapters/**` to construct the DI graph.

## Key modules

| Module | Path |
|--------|------|
| T1 composition root | `src/app/composition/createContainer.ts` |
| Test composition root | `src/app/composition/createTestContainer.ts` |
| Intake Orchestrator | `src/app/intake/intakeOrchestrator.ts` |
| Document Parser (app façade) | `src/app/intake/documentParserService.ts` |
| Call Orchestrator | `src/app/calls/callOrchestrator.ts` |
| Vendor Discovery service | `src/app/calls/vendorDiscovery.ts` |
| Webhook handlers | `src/app/webhooks/handleSkillToolCall.ts`, `handleTranscriptEvent.ts` |
| ElevenLabs webhook route | `src/app/api/webhooks/elevenlabs/route.ts` |
| Report Composer | `src/app/report/reportComposer.ts` |
| API routes | `src/app/api/**` (Next.js App Router under `app/api` mapped to these services) |
| Full negotiation API | `POST /api/calls/[jobId]/start` → `CallOrchestrator.runFullNegotiation` |
| Audit read API | `GET /api/audit/[jobId]` |

> Note: Next.js physical routes live under `app/api/...`. Thin route files call into `src/app/**` services.

The repository uses the `src/app/` form of Next.js App Router. Customer pages
are grouped under `src/app/(ui)/`; PR-B1 pages are presentation-only and import
typed fixtures from `src/frontend/` until their application APIs land.

PR-B2 adds the intake flow: `src/app/intake/` contains port-only orchestration,
while `src/app/composition/createIntakeDeps.ts` wires fake adapters for the
temporary intake API routes at `src/app/api/intake/`.

PR-B3 adds job-spec confirmation routes under `src/app/api/job-specs/` and a
`CallOrchestrator` confirmation guard in `src/app/calls/callOrchestrator.ts`.

PR-B5 adds `src/app/report/reportComposer.ts` and its composed report API at
`src/app/api/reports/[jobId]/route.ts`; fake demo wiring remains in composition.

T1 uses the shared composition root for the intake, confirmation, negotiation,
audit, and report routes so the simulated flow shares one in-memory state.

## Testing rules

- Integration tests construct a container with **fake adapters** (`src/adapters/fake/**`).
- Webhook tests POST signed/unsigned fixtures and assert domain side effects (quote rows, audit events).
- No live OpenAI/Twilio/ElevenLabs calls in CI.
- T1 gate integration test: `tests/integration/t1/twoRoundFlow.test.ts`.
- T1 gate e2e: `tests/e2e/t1-happy-path.spec.ts`.

## Definition of done

- [ ] Orchestrators only talk to ports + domain
- [ ] Composition root is the sole adapter wiring point
- [ ] Integration tests green with fakes
- [ ] This doc updated when use cases change
