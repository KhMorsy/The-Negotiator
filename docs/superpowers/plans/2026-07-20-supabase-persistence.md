# Live Supabase Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist JobSpecs, Calls, Quotes, and AuditEvents in a new Supabase cloud project when env is set; keep in-memory for CI and missing credentials.

**Architecture:** Composition root selects Supabase service-role repos vs in-memory. Fix adapters for real `@supabase/supabase-js` `.insert().select().single()` chains. Schema uses TEXT vendor ids + demo RLS + Realtime on `calls`. Frontend still writes only via API.

**Tech Stack:** Next.js 15 · `@supabase/supabase-js` · Vitest · existing repo ports

## Global Constraints

- CI uses **only** in-memory repos — no Supabase credentials in GitHub Actions.
- `src/adapters/**` must **not** import `src/domain/**`.
- Service role key is **server-only**; never prefix with `NEXT_PUBLIC_`.
- Missing `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` → in-memory fallback.
- Demo-open: anon may `SELECT` on `calls` only; writes via service role.

**Spec:** [2026-07-20-supabase-persistence-design.md](../specs/2026-07-20-supabase-persistence-design.md)

---

### Task 1: Schema — TEXT vendor ids + demo open migration

**Files:**
- Modify: `supabase/migrations/001_init.sql`
- Create: `supabase/migrations/003_demo_open.sql`
- Modify: `docs/architecture/layers/adapters.md` (note live wiring)

- [ ] **Step 1:** In `001_init.sql`, change `vendors.id`, `calls.vendor_id`, and `quotes.vendor_id` from `UUID` to `TEXT`.

- [ ] **Step 2:** Create `003_demo_open.sql` that:
  - Seeds the three demo vendors (`vendor-tough`, `vendor-lowball`, `vendor-upseller`) with `ON CONFLICT (id) DO NOTHING`
  - Enables RLS on all T1 tables
  - Grants anon `SELECT` on `calls` only
  - Adds `calls` to `supabase_realtime` publication

- [ ] **Step 3:** Run `npm run test -- tests/unit/adapters/supabase` after later tasks (schema itself is SQL-only).

---

### Task 2: Real SDK client + fix repository chains

**Files:**
- Create: `src/adapters/persistence/supabase/createSupabaseServiceClient.ts`
- Modify: `src/adapters/persistence/supabase/types.ts` (keep mappers; drop or replace fake client type)
- Modify: all four `supabase*Repository.ts` files
- Modify: all four `tests/unit/adapters/supabase/*.test.ts`

**Interfaces:**
- Produces: `createSupabaseServiceClient(url: string, serviceRoleKey: string): SupabaseClient`
- Produces: repos accept real `SupabaseClient` from `@supabase/supabase-js`

- [ ] **Step 1:** Update unit test mocks so `insert` / `update` return a thenable chain with `.select().single()` returning `{ data, error }`.

- [ ] **Step 2:** Change each repo method:
  - create/append: `await client.from(...).insert(...).select("*").single()`
  - confirm/update*: `await client.from(...).update(...).eq(...).select("*").single()`
  - getById: on error code `PGRST116` (or message containing “0 rows”) return `null`

- [ ] **Step 3:** Run `npm run test -- tests/unit/adapters/supabase` — expect PASS.

---

### Task 3: Composition — select repos + factory

**Files:**
- Create: `src/adapters/persistence/supabase/createSupabaseRepos.ts`
- Modify: `src/app/composition/createContainer.ts`
- Create: `tests/unit/app/selectRepos.test.ts` (or composition test)

**Interfaces:**
- Produces: `createSupabaseRepos(client)` → `{ jobSpecs, calls, quotes, audit }`
- Produces: `selectRepos()` used inside `buildContainer`

- [ ] **Step 1:** Write test: with env unset, `selectRepos` equivalent path uses in-memory (or test `persistenceKind` if exposed).

- [ ] **Step 2:** Implement `createSupabaseRepos` and wire `buildContainer` to replace `app.repos` when URL + service role present. Expose `persistenceKind: "memory" | "supabase"` on `Container` for debugging.

- [ ] **Step 3:** Clear `globalThis.__negotiatorContainer` in tests via existing `resetContainerForTests`.

- [ ] **Step 4:** Run `npm run test -- tests/unit` relevant files + `npm run typecheck`.

---

### Task 4: Docs + env + user runbook

**Files:**
- Modify: `.env.example` (comment block for persistence)
- Create: `docs/demo/supabase-setup.md` (create project, SQL editor paste 001→003, copy keys)
- Modify: `docs/architecture/layers/adapters.md`

- [ ] **Step 1:** Document create-project steps and “apply migrations in order in SQL Editor”.
- [ ] **Step 2:** Note success check: Table Editor shows `job_specs` after UI intake.
- [ ] **Step 3:** Run `npm run ci` — expect PASS without secrets.

---

## Manual verification (user)

1. Create Supabase project at https://supabase.com
2. SQL Editor: run `001_init.sql`, then `002_kb_vector.sql` (optional), then `003_demo_open.sql`
3. Copy URL, anon key, service role → `.env.local`
4. `npm run dev` → complete intake → confirm row in Table Editor after restart
