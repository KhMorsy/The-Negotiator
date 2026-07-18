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
| Composition root | `src/app/composition/createContainer.ts` |
| Intake Orchestrator | `src/app/intake/intakeOrchestrator.ts` |
| Document Parser (app façade) | `src/app/intake/documentParserService.ts` |
| Call Orchestrator | `src/app/calls/callOrchestrator.ts` |
| Vendor Discovery service | `src/app/calls/vendorDiscovery.ts` |
| Webhook handlers | `src/app/webhooks/elevenlabs.ts`, `twilio.ts` |
| Report Composer | `src/app/report/reportComposer.ts` |
| API routes | `src/app/api/**` (Next.js App Router under `app/api` mapped to these services) |

> Note: Next.js physical routes live under `app/api/...`. Thin route files call into `src/app/**` services.

## Testing rules

- Integration tests construct a container with **fake adapters** (`src/adapters/fake/**`).
- Webhook tests POST signed/unsigned fixtures and assert domain side effects (quote rows, audit events).
- No live OpenAI/Twilio/ElevenLabs calls in CI.

## Definition of done

- [ ] Orchestrators only talk to ports + domain
- [ ] Composition root is the sole adapter wiring point
- [ ] Integration tests green with fakes
- [ ] This doc updated when use cases change
