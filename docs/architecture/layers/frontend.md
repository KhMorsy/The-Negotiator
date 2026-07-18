# Layer: Frontend

**Path:** `src/frontend/` (+ Next.js App Router pages under `app/(ui)/`)
**Owner lane:** Lane B
**Parent architecture:** [2026-07-18-the-negotiator-architecture.md](../../specs/2026-07-18-the-negotiator-architecture.md) §7, feature spec §5 report UX

## Responsibility

Customer UI: intake (voice widget + uploads), job-spec confirmation, live call status, layered report (primary A + optional D/E/F), one-tap next action. Frontend talks to the system **only via HTTP APIs** exposed by the application layer (`/api/...`). It must not import domain or adapters.

## Allowed / forbidden dependencies

| May import | Must NOT import |
|------------|-----------------|
| React, Next.js, UI libs | `src/domain/**` |
| `src/contracts/types/**` and `src/contracts/schemas/**` (for form validation) | `src/adapters/**` |
| `src/frontend/**` | Port implementations |

## Key screens

| Screen | Route | Notes |
|--------|-------|-------|
| Home / start | `/` | Hero: busy dual-income family story hook |
| Intake | `/intake/[jobId]` | Voice + document upload |
| Confirm job spec | `/confirm/[jobId]` | Must confirm before calls |
| Live calls | `/calls/[jobId]` | Status via Realtime (T2) or polling (T1) |
| Report | `/report/[jobId]` | A default; D/E/F expandable |

## Testing rules

- Component tests with Testing Library + Vitest where logic exists.
- Playwright e2e against simulated path (PR-I1+); no real phone calls in CI.
- Accessibility: keyboard path for confirmation and report expanders.

## Definition of done

- [ ] Screens call only `/api/*`
- [ ] No domain/adapter imports (dependency-cruiser)
- [ ] E2E happy path green on simulated adapters
- [ ] This doc updated when routes/screens change
