# GitHub branch protection & collaborator setup

Apply manually in GitHub → Settings (required for two-account smooth CI).

## Collaborators

1. Invite the second Codex account as **Write** collaborator on `KhMorsy/The-Negotiator`.
2. Both push feature branches to the **same** repo (no forks).

## Branch protection (`main`)

Enable:

- Require a pull request before merging
- Require status checks to pass: **`Lint · Types · Architecture · Tests · Build`** (job `quality`)
- Optionally require **`E2E (simulated path)`** after PR-I1 lands stable e2e
- Do not allow force pushes to `main`
- Do not allow deletions

## Labels

Create label: `no-docs-needed` (used by docs freshness gate with justification in PR body).

## Secrets

**None required for CI.** Optional local-only live tests use `.env.local` (never commit).

## Branch naming

- `lane-a/PR-A2-skill-engine`
- `lane-b/PR-B4-report-pure`
- `integration/PR-I1-t1-gate`
