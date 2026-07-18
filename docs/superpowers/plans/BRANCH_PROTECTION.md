# GitHub branch protection & collaborator setup

Apply manually in GitHub → Settings (required for two-account smooth CI).

## Collaborators

1. Invite the second and third machine accounts as **Write** collaborators on `KhMorsy/The-Negotiator`.
2. All three push feature branches to the **same** repo (no forks).

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

- `lane-a/PR-A3-quote-extractor`
- `lane-b/PR-B4-report-pure`
- `lane-c/PR-A2-skill-engine`
- `integration/PR-I1-t1-gate`
