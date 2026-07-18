# The Negotiator — Architecture & Tech Stack

**Challenge:** C1 · The Negotiator (ElevenLabs × Hack-Nation)
**Date:** 2026-07-18
**Feature spec:** [2026-07-18-the-negotiator-feature-spec.md](2026-07-18-the-negotiator-feature-spec.md)
**Standalone diagram:** [the-negotiator-architecture.mmd](../architecture/the-negotiator-architecture.mmd)

---

## 1. Tech stack (decided)

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | **Next.js (TypeScript / React)** | Intake, confirmation, live status, report. Lovable/Emdash/WOZ accelerate UI |
| Backend | **Next.js API routes / Node (TypeScript)** | Single language across the stack; first-class ElevenLabs + Twilio SDKs |
| Voice + telephony | **ElevenLabs Agents + native Twilio integration** | Agent tools/webhooks; minimal media/TwiML plumbing |
| AI (planner/parse/vision) | **OpenAI (GPT-4o-class)** | Skill planner, quote/doc parsing, room-photo vision. ElevenLabs built-in LLM drives the live call |
| Data + KB + files | **Supabase** | Postgres (relational) + pgvector (KB + skill signals) + Storage (recordings/docs/photos) + Realtime |
| Deployment | **Vercel + Supabase** | Next.js API routes handle ElevenLabs/Twilio webhooks; Supabase Realtime pushes live call status |

**Architectural principle:** the system is **event-driven** so it fits serverless. The Call Orchestrator does not hold a long-running process; call progress advances through ElevenLabs/Twilio webhook events, and state lives in Supabase. This keeps everything on Vercel functions without a separate always-on worker.

---

## 2. System architecture (container view)

```mermaid
flowchart TB
    customer["Customer<br/>(browser)"]
    vendors["Cleaning Businesses<br/>(PSTN phone)"]

    subgraph frontend [Frontend - Next.js on Vercel]
        intakeUI["Intake UI<br/>voice + document/photo upload"]
        confirmUI["Job Spec Confirmation UI"]
        liveUI["Live Call Status Dashboard<br/>(Supabase Realtime)"]
        reportUI["Report Dashboard<br/>A default + D/E/F drill-downs"]
    end

    subgraph backend [Backend - Next.js API Routes / Node]
        intakeSvc["Intake Service<br/>voice session init + doc/photo parse"]
        specBuilder["Job Spec Builder<br/>normalizes to one JSON spec"]
        orchestrator["Call Orchestrator<br/>parallel calls, two-round, retries"]
        webhooks["ElevenLabs + Twilio<br/>Webhook Handlers"]
        skillEngine["Negotiation Skill Engine<br/>preconditions filter + planner + KB retrieval"]
        quoteExtractor["Quote Extractor<br/>transcript to structured quote"]
        reportSvc["Report + Ranking Service<br/>normalize, red-flags, trust score"]
        auditLog["Honesty / Audit Logger"]
    end

    subgraph voice [Voice + Telephony]
        elevenAgent["ElevenLabs Agent<br/>conversation LLM + STT/TTS"]
        twilio["Twilio (native integration)<br/>PSTN outbound"]
    end

    subgraph ai [AI Services]
        openai["OpenAI<br/>planner, quote/doc parsing, photo vision"]
    end

    subgraph data [Supabase]
        pg[("Postgres<br/>job_specs, vendors, calls,<br/>quotes, transcripts, skills, audit_log")]
        vec[("pgvector<br/>market KB + skill signals")]
        store[("Storage<br/>recordings, docs, photos")]
    end

    subgraph external [External Data]
        places["Google Places / Yelp<br/>vendor call list"]
        benchmarks["Cleaning price benchmarks<br/>(Thumbtack/Angi/HomeAdvisor)"]
    end

    customer --> intakeUI
    intakeUI --> intakeSvc
    intakeSvc --> elevenAgent
    intakeSvc --> openai
    intakeSvc --> specBuilder
    specBuilder --> confirmUI
    confirmUI -->|"user confirms spec"| orchestrator

    orchestrator --> places
    orchestrator --> elevenAgent
    elevenAgent --> twilio
    twilio --> vendors

    elevenAgent -->|"agent tool calls mid-turn"| webhooks
    webhooks --> skillEngine
    skillEngine --> vec
    skillEngine --> openai
    skillEngine --> auditLog
    skillEngine -->|"chosen move"| elevenAgent

    webhooks -->|"call events + transcript"| quoteExtractor
    quoteExtractor --> openai
    quoteExtractor --> pg
    twilio -->|"recording"| store

    orchestrator -->|"round 2: call back top 1-2 with leverage"| elevenAgent
    orchestrator --> reportSvc
    reportSvc --> pg
    reportSvc --> benchmarks
    reportSvc --> reportUI

    orchestrator --> liveUI
    auditLog --> pg
    benchmarks --> vec

    pg --> liveUI
    reportUI -->|"one-tap next action (no auto-send)"| customer
```

---

## 3. Components (what / how used / depends on)

- **Intake Service** — starts the ElevenLabs voice interview; parses uploaded quote docs and room photos via OpenAI. Depends on: ElevenLabs, OpenAI, Job Spec Builder.
- **Job Spec Builder** — normalizes voice + document outputs into one canonical **job spec JSON** (schema in §6). Depends on: Postgres.
- **Call Orchestrator** — pulls the vendor call list (Google Places/Yelp), launches parallel round-1 calls, tracks state, triggers round-2 callbacks to the top 1–2 with leverage, handles retries. Event-driven via webhooks. Depends on: ElevenLabs, Supabase.
- **Webhook Handlers** — receive ElevenLabs agent tool calls (mid-turn) and Twilio/ElevenLabs call lifecycle events. Route to Skill Engine and Quote Extractor.
- **Negotiation Skill Engine** — the differentiator. `preconditions filter → KB retrieval (pgvector) → OpenAI planner picks the move`, returns the chosen skill to the agent and writes the audit trail. Depends on: pgvector, OpenAI, Audit Logger.
- **Quote Extractor** — converts each call transcript into a structured, comparable quote (fees itemized). Depends on: OpenAI, Postgres.
- **Report + Ranking Service** — normalizes quotes to a comparable total, computes savings delta, red-flags (vs benchmarks), and trust score; produces primary output A + drill-downs D/E/F. Depends on: Postgres, benchmarks KB.
- **Honesty / Audit Logger** — records every skill fired, the evidence that authorized it, and each resulting price/term change. Server-side and authoritative.

---

## 4. Mid-call skill loop (the honesty gate lives here)

```mermaid
sequenceDiagram
    participant V as Vendor
    participant EA as ElevenLabs Agent
    participant WH as Webhook Handler
    participant SE as Skill Engine
    participant KB as pgvector KB
    participant OAI as OpenAI Planner
    participant AL as Audit Log

    V->>EA: "We charge $280, plus a trip fee"
    EA->>WH: tool call - request next move (context + quotes in hand)
    WH->>SE: situation + confirmed quotes + job spec
    SE->>SE: filter skills by preconditions (honesty gate)
    Note over SE: leverage_competing_bid eligible ONLY if a real quote exists
    SE->>KB: retrieve market benchmarks + fee patterns
    SE->>OAI: choose best eligible skill for this moment
    OAI-->>SE: skill = challenge_fee + leverage_competing_bid
    SE->>AL: log skill + authorizing evidence
    SE-->>EA: chosen move + suggested phrasing
    EA->>V: "I have a written quote at $240 all-in - can you drop the trip fee?"
```

**Why this matters for judging:** dishonest moves are *structurally impossible* — the Skill Engine cannot return `leverage_competing_bid` unless a real competing quote row exists. The audit log is the artifact we show judges.

---

## 5. Two-round negotiation flow

```mermaid
sequenceDiagram
    participant U as Customer
    participant OR as Call Orchestrator
    participant EA as ElevenLabs Agent
    participant Vs as Vendors (parallel)
    participant RS as Report Service

    U->>OR: confirmed job spec
    OR->>EA: launch round-1 calls (parallel)
    EA->>Vs: identical job description each call
    Vs-->>EA: itemized quotes (or structured decline/callback)
    EA-->>OR: structured outcomes stored
    OR->>RS: rank round-1 quotes
    OR->>EA: round-2 callbacks to top 1-2 with leverage
    EA->>Vs: negotiate (skills + competing bids)
    Vs-->>EA: revised price/terms (the measurable move)
    EA-->>OR: updated quotes + audit trail
    OR->>RS: final ranking + savings delta + red-flags + trust
    RS-->>U: report A (+ optional D/E/F)
```

---

## 6. Data model

```mermaid
erDiagram
    JOB_SPEC ||--o{ CALL : "drives"
    VENDOR ||--o{ CALL : "receives"
    CALL ||--|| QUOTE : "yields"
    CALL ||--|| TRANSCRIPT : "produces"
    CALL ||--o{ AUDIT_EVENT : "logs"
    SKILL ||--o{ AUDIT_EVENT : "fired in"
    QUOTE ||--o{ QUOTE_FEE : "itemizes"

    JOB_SPEC {
        uuid id
        string job_type
        int sqft
        int bedrooms
        int bathrooms
        string frequency
        jsonb add_ons
        bool supplies_provided
        bool confirmed
    }
    VENDOR {
        uuid id
        string name
        string phone
        float rating
        bool insured_bonded
        string source
    }
    CALL {
        uuid id
        uuid job_spec_id
        uuid vendor_id
        int round
        string outcome
        string recording_url
    }
    QUOTE {
        uuid id
        uuid call_id
        numeric base_price
        numeric normalized_total
        string pricing_model
        bool red_flag
    }
    QUOTE_FEE {
        uuid id
        uuid quote_id
        string fee_type
        numeric amount
    }
    TRANSCRIPT {
        uuid id
        uuid call_id
        jsonb turns
    }
    SKILL {
        uuid id
        string name
        jsonb selection_signals
        jsonb preconditions
        text move_template
    }
    AUDIT_EVENT {
        uuid id
        uuid call_id
        uuid skill_id
        jsonb authorizing_evidence
        numeric price_before
        numeric price_after
    }
```

The **market-research knowledge base** (benchmarks, fee patterns, red-flag thresholds) and **skill selection signals** are embedded into **pgvector** for retrieval; the `SKILL` rows hold the structured definitions.

---

## 7. Deployment & realtime

- **Vercel**: Next.js app + API route handlers for ElevenLabs/Twilio webhooks (`/api/webhooks/elevenlabs`, `/api/webhooks/twilio`) and app APIs.
- **Supabase**: Postgres + pgvector + Storage; **Realtime** channel streams `CALL` status/outcome changes to the Live Call Status Dashboard.
- **Config-not-code**: `verticals/home_cleaning.json` (job-spec taxonomy, benchmarks, red-flag rules) + seeded `SKILL` rows. Swapping vertical = swapping config + skills, no code changes.
- **Demo resilience**: golden pre-recorded calls served from Storage as the backbone; one live call on stage; webhooks via the deployed Vercel endpoints (no ngrok needed).

---

## 8. Mapping to build tiers (from feature spec §8)

| Tier | Architecture surface to stand up |
|------|----------------------------------|
| **T1** | Intake Service + Job Spec Builder + Skill Engine + Quote Extractor + Report A + Audit Logger + Supabase schema |
| **T2** | Call Orchestrator with real Twilio calls + webhook handlers + Realtime status + drill-downs D/E/F |
| **T3** | Skill Generator, photo vision in Intake, email fallback path, assisted-call co-pilot |

---

## 9. Owner mapping (suggested)

- **Khaled (backend/data):** Supabase schema, Skill Engine, Quote Extractor, webhooks, KB ingestion.
- **Abdu (frontend + logic):** Intake/confirmation/report UI, skill selection logic, report ranking rules.
- **Tarek (fullstack + demo):** ElevenLabs/Twilio wiring, Call Orchestrator, deployment, golden-call capture, demo/materials.
