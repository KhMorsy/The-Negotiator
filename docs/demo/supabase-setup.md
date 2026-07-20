# Supabase setup (live persistence)

The app uses **in-memory** repos by default (CI and local without keys). When Supabase env is set, API routes persist JobSpecs, Calls, Quotes, and AuditEvents to Postgres.

## 1. Create a project

1. Open [https://supabase.com](https://supabase.com) and create a new project.
2. Wait until the database is ready.

## 2. Apply migrations (SQL Editor)

In **SQL Editor → New query**, paste and run **in order**:

1. `supabase/migrations/001_init.sql` — core tables (TEXT vendor ids)
2. `supabase/migrations/002_kb_vector.sql` — optional (pgvector KB; not required for T1 persistence)
3. `supabase/migrations/003_demo_open.sql` — demo vendors, RLS, Realtime on `calls`

Confirm **Table Editor** shows `job_specs`, `vendors`, `calls`, `quotes`, `quote_fees`, `audit_events`, and three seeded vendors.

## 3. Copy keys into `.env.local`

From **Project Settings → API**:

```bash
cp .env.example .env.local
```

Set:

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key (Realtime dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (**server only** — never commit) |

Optional for live call feed (not polling):

```bash
NEXT_PUBLIC_USE_FAKE_REALTIME=false
```

## 4. Verify

```bash
npm run dev
```

1. Complete intake in the UI.
2. Open Supabase **Table Editor → job_specs** — a new row should appear.
3. Restart `npm run dev` — the same job id should still load via the API.
4. Without these env vars, the app falls back to in-memory (data resets on restart).

## Security note (demo-open)

- API writes use the **service role** (bypasses RLS).
- Anon clients may **SELECT** on `calls` for Realtime only.
- Do not ship the service role key to the browser or public repos.
