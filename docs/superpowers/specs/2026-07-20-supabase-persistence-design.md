# Design: Live Supabase Persistence (API → Postgres)

**Date:** 2026-07-20  
**Status:** Approved for implementation (Approach 1)  
**Scope:** Wire existing Supabase repository adapters into the composition root; create/apply cloud schema; demo-open RLS; env-gated fallback to in-memory.

## Decisions

| Decision | Choice |
|----------|--------|
| Hosting | New Supabase **cloud** project (user creates; paste keys) |
| Missing env | Fall back to **in-memory** (CI / local without keys) |
| Security | **Demo-open:** service role for API writes; anon **SELECT** on `calls` for Realtime |
| Approach | Fix + wire existing `src/adapters/persistence/supabase/*`; do not rewrite from scratch |
| Frontend writes | **None** — UI → Next API → repos only; browser may subscribe to `calls` |

## Architecture

```
Frontend (Hearth UI)
  → Next.js API routes
    → Orchestrators (intake / calls / report)
      → JobSpec|Call|Quote|Audit repository ports
        → Supabase repos (when URL + SERVICE_ROLE set)
        → In-memory repos (else / tests)
```

- Composition root (`createContainer`) selects repos once; cached on `globalThis` for HMR.
- `createTestContainer()` always stays in-memory for unit/integration/e2e CI.
- Realtime: existing `subscribeCalls` + anon key; enable replication on `calls`.

## Schema & vendor IDs

Greenfield fix in `001_init.sql` (no live DB yet):

- `vendors.id`, `calls.vendor_id`, `quotes.vendor_id` → **TEXT** (match fake directory ids: `vendor-tough`, `vendor-lowball`, `vendor-upseller`).
- Seed those three vendors in migration `003_demo_open.sql`.
- Same file: RLS policies (service role bypasses RLS; anon `SELECT` on `calls`), `ALTER PUBLICATION supabase_realtime ADD TABLE calls`.

Optional later: `002_kb_vector.sql` remains unused until pgvector KB is selected.

## Adapter fixes

Current repos assume `insert()` / `update().eq()` return `{ data }` immediately. Real `@supabase/supabase-js` needs:

- `insert(row).select("*").single()`
- `update(row).eq(...).select("*").single()`
- `getById`: treat PostgREST “no rows” as `null` (not throw)

Replace the hand-rolled `SupabaseClient` facade with the real SDK client type (or a chain-compatible interface + unit-test mocks that match).

## Env

Already in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser Realtime)
- `SUPABASE_SERVICE_ROLE_KEY` (server repos only — never expose to client)

Document: persistence activates when **URL + service role** are set; anon key needed for live dashboard Realtime (else polling).

## Out of scope

- Auth / per-user RLS
- Skills library / generator UI
- Wiring Resend, co-pilot, vision beyond current stubs
- Replacing fake vendor directory with Places/Yelp

## Success criteria

1. With keys in `.env.local` + migrations applied: create job via UI → row visible in Supabase Table Editor; survives server restart.
2. Without keys: app behaves as today (in-memory); `npm run ci` green with zero secrets.
3. Call status feed can use Realtime when public URL + anon key set and `NEXT_PUBLIC_USE_FAKE_REALTIME=false`.
4. Demo vendors seed present; call inserts do not FK-fail.
