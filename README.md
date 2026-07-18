# The Negotiator

Voice-AI procurement agent for **home cleaning services** — Hack-Nation 6th Global AI Hackathon (ElevenLabs challenge).

**Team:** Khaled · Abdu · Tarek  
**Repo:** https://github.com/KhMorsy/The-Negotiator

## Quick start

> **Local path warning:** If your clone path contains `#` (e.g. `Hack-Nation_Hackathon#2`), Vite/Next/dependency-cruiser may fail. Clone or worktree to a path without `#` (e.g. `~/the-negotiator`). GitHub Actions is unaffected.

```bash
npm ci
cp .env.example .env.local   # optional for local; CI needs none
npm run ci                   # lint + typecheck + arch + unit tests + build
npm run dev
```

## Architecture layers

| Layer | Path | Doc |
|-------|------|-----|
| Contracts | `src/contracts/` | [docs/architecture/layers/contracts.md](docs/architecture/layers/contracts.md) |
| Domain | `src/domain/` | [docs/architecture/layers/domain.md](docs/architecture/layers/domain.md) |
| Application | `src/app/` | [docs/architecture/layers/application.md](docs/architecture/layers/application.md) |
| Adapters | `src/adapters/` | [docs/architecture/layers/adapters.md](docs/architecture/layers/adapters.md) |
| Frontend | `src/frontend/` | [docs/architecture/layers/frontend.md](docs/architecture/layers/frontend.md) |

Specs: [feature](docs/specs/2026-07-18-the-negotiator-feature-spec.md) · [architecture](docs/specs/2026-07-18-the-negotiator-architecture.md) · [mermaid](docs/architecture/the-negotiator-architecture.mmd)

Implementation plans: `docs/superpowers/plans/`

## Collaboration (two machines / two accounts)

- Both accounts are **collaborators** on this repo (same-repo feature branches).
- Branches: `lane-a/<package-id>-short-slug`, `lane-b/<package-id>-short-slug`, `integration/<package-id>`.
- CI runs identically for both accounts; **no vendor secrets** in GitHub Actions (fake adapters only).
- Every PR must satisfy the architecture checklist in `.github/PULL_REQUEST_TEMPLATE.md`.
- Changing `src/<layer>/**` requires updating `docs/architecture/layers/<layer>.md` (or the `no-docs-needed` label).

## Tier gates

- **T1:** Simulated telephony end-to-end (intake → confirm → calls → negotiation with price-move → ranked report + audit log)
- **T2:** Real ElevenLabs + Twilio path + live dashboard + report drill-downs
- **T3:** Skill generator, room-photo vision, email fallback, assisted-call co-pilot
