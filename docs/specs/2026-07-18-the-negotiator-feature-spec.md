# The Negotiator — Feature & Requirements Spec

**Challenge:** C1 · The Negotiator (ElevenLabs × Hack-Nation, 6th Global AI Hackathon)
**Team:** Khaled (backend/data) · Abdu (frontend + logic) · Tarek (fullstack + distribution/demo)
**Date:** 2026-07-18
**Status:** Features/requirements agreed. Tech stack + architecture = next session.
**Scope of this doc:** WHAT we build and WHY (product/feature level). Not HOW (architecture) yet.

---

## 1. Product in one line

A voice-AI procurement agent for **home cleaning services** that turns a market where the real price is hidden behind 5–8 phone calls into **one confident, evidence-backed decision** — by interviewing the customer, calling the market, negotiating with an honest playbook, and returning a ranked recommendation with proof.

**Value proposition:** remove the two things a consumer lacks — the *time/stamina* to call around, and the *leverage/expertise* to negotiate — while never overpaying and never being lowballed-then-upcharged.

---

## 2. Vertical & scope decisions (locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vertical | **Home cleaning services** (config key `home_cleaning`) | Phone/text-priced, wildly inconsistent quoting (flat vs hourly-with-minimums vs per-sqft), classic fee-stacking, public benchmarks exist |
| Job coverage | **All cleaning job types** via config: recurring (weekly/biweekly/monthly), one-time deep clean, move-out/end-of-lease, post-renovation/post-construction, turnover (Airbnb/office) | Broad product, real market |
| Comparability rule | **Each negotiation run is scoped to ONE confirmed job spec**; quotes only compared within the same run | Enforces the brief's "make quotes comparable" bar; avoids the weak-submission trap of hiding non-comparable quotes |
| Demo hero | **Busy dual-income family** wanting reliable recurring cleaning without overpaying | Naturally showcases the commitment-for-discount price-move |
| Demo runs | 2–3 separate runs across job types (e.g. recurring package + a move-out deep clean) | Shows coverage while keeping each ranking comparable |
| Config-not-code | Job-spec taxonomy, price benchmarks, red-flag rules, and negotiation skills are **data/config**, not hardcoded | Brief requirement + differentiator (swap vertical = swap config) |

---

## 3. Mandatory pillars (from the brief) → our features

### Pillar 1 — The Estimator (intake)
- **Voice interview** built on ElevenLabs Agents: asks what a professional cleaning estimator would (property size in sqft, beds/baths, clean type, frequency, add-ons, supplies provided?, pets, access, condition).
- **Document intake (both paths):**
  - **Existing quote/estimate** the customer already has (PDF / screenshot / text) → parsed into the job spec **and** retained as real negotiation leverage.
  - **Room/apartment photos** → vision-based size/condition/add-on estimation (Tier 3).
- **One structured job spec (JSON)** produced by either path, **user-confirmed before any calls**, and **reused verbatim** on every call.

### Pillar 2 — The Caller (quote gathering)
- **Real outbound calls via Twilio** to actual cleaning businesses.
- **Demo reliability strategy:** pre-recorded real **golden calls** as the backbone + **one live on-stage call** + label real businesses that naturally exhibit distinct negotiation styles (tough / lowball-with-hidden-fees / hard-sell upseller). Satisfies the brief's "≥3 distinct negotiation styles."
- **Consistent job description** on every call (from the confirmed spec).
- **Structured, comparable quote capture** with fees itemized (base rate, first-clean premium, trip/travel fee, supplies, weekend surcharge, add-on line items, taxes).
- **Call-list origin** shown (e.g. Google Places / Yelp business data) for real-world grounding.

### Pillar 3 — The Closer (negotiation + reporting)
- **Two-round negotiation:** gather all quotes first, then call back the top 1–2 with leverage → produces the cleanest "price measurably moved" proof.
- **≥1 negotiation where price/terms change** during the call because of leverage the agent gathered (mandatory success criterion).
- **Final report** (see §5) that ranks all quotes, cites transcript/recording evidence, recommends a deal, and explains it in plain language.

---

## 4. The Negotiation Skills Library (our differentiator)

A **negotiation playbook engine** — negotiation levers as *data*, not code.

### Skill schema (each skill declares)
- **Selection signals:** customer ask type, job nature, market situation (from the market-research knowledge base).
- **Preconditions (honesty guardrails):** structural gates that make dishonesty impossible — e.g. `leverage_competing_bid` is only selectable when a *real* quote is in hand; the agent can never invent a bid or fake inventory.
- **The move:** the tactic / what the agent says.
- **Expected effect + success metric:** did price or terms move?

### Seeded lever set (authored for demo, ~10–20 skills)
- Leverage a **real competing quote** ("I have a written quote for $X — can you beat it?")
- **Recurring commitment** for a per-visit discount (weekly/biweekly for N months)
- **Challenge/question specific fees** (trip fee, first-clean premium, supplies, weekend surcharge)
- **Bundle** jobs (deep clean now + recurring after) for a package rate
- **Off-peak / flexible scheduling** in exchange for a lower rate
- **Price-match + extras** (free add-on such as inside-fridge/oven) instead of pure discount
- **Referral / review / prepay** in exchange for a discount

### Selection mechanism
**Hybrid:** deterministic **preconditions filter** eligible skills → **LLM/planner picks the best** given context + **knowledge-base retrieval** (market benchmarks & fee patterns).

### Library vision (roadmap, pitch)
- A large authored library (**50–150 skills**) framed by job area/specialty, generated from a template frame.
- A **Skill Generator** drafts a new skill for **unseen asks/requests** (market-survey path) to raise coverage/quality over time.
- Demo focuses on the 10–20 skills serving the demo request; we *narrate* the generator + full library as the scaling story.

---

## 5. The Report (Closer output) — layered UX

Design principle: **simple and intuitive by default, more proof on demand.** Not overwhelming.

- **Primary output (A) — always shown:** ranked, apples-to-apples comparison with fees itemized + normalized total, plus the **single recommended deal** with a plain-language "why this one."
- **Optional drill-downs (user opens if they want more proof before deciding):**
  - **D — Savings delta:** initial quote vs negotiated price, and vs market benchmark.
  - **E — Red-flag callouts:** >30% below market, open-ended hourly, no insurance/bonding, vague scope.
  - **F — Trust/reputability signal:** insured/bonded, satisfaction guarantee, review volume — blended with price.
- **Next action (post-decision):** once the customer decides, a **one-tap next step** captures a callback/booking commitment — **never auto-sends** a profile or booking without the user.

Evidence: every quote and every negotiated change cites its transcript + recording.

---

## 6. Conversation trust layer (won in call design, per the brief)

### AI disclosure & consent
- **Disclose it's an AI** when asked ("are you a robot?") — gracefully, honestly, without losing the quote.
- **Recording consent** handled per applicable law.

### Friction handling — every call ends in a structured outcome
- **"We don't quote over the phone"** → capture rate structure/ranges + schedule a callback; never leave empty.
- **Barge-in / interruption handling + low latency** so it sounds like a serious buyer, not a bot.
- **Voicemail / no-answer** → leave callback number, mark for auto-retry/re-attempt.
- **Scope mismatch** → ask clarifying questions to keep quotes comparable.
- **Structured outcome always:** itemized quote, callback commitment, or documented decline — never "they said around two thousand."

### Off-rails escalation ladder (agreed, custom)
1. Agent does **not** escalate to a human immediately.
2. Agent asks the vendor for an **email** to send the full job description/case; if agreed, continue async by email.
3. If refused, agent **ends the call**, briefs the customer, and asks the customer to make that specific call and feed results back into the system.
4. **Preferred:** the customer can place that call **through the AI agent (assisted-call co-pilot mode)** so they witness it and results integrate directly into the study output. *(Tier 3)*

### Honesty enforcement (make-or-break)
- **Skill preconditions structurally block dishonest moves** (no real bid → cannot claim one).
- **Honesty/audit log** we can show judges: every skill fired, the evidence that authorized it, and each resulting price/term change.

---

## 7. User surface

**Web app** as the primary surface: voice/doc intake → live call status → final report dashboard (layered as §5). Voice handled by the ElevenLabs agent; web carries setup, monitoring, and the decision UI.

---

## 8. Build priority tiers (all in scope; sequencing de-risks the demo)

**Tier 1 — Walking skeleton (satisfies every mandatory success criterion on its own):**
- Voice intake → confirmed job spec
- Existing-quote document parse → job spec + leverage
- Skill engine + hybrid selection + ~10–20 seeded skills
- Two-round negotiation with a real price-move
- Ranked report (primary output A)
- Honesty preconditions + audit log

**Tier 2 — Credibility + depth:**
- Real Twilio outbound (golden recordings + one live call)
- Report drill-downs D/E/F
- Structured-outcome friction handling

**Tier 3 — Wow / vision:**
- Skill generator for unseen asks
- Room-photo vision estimation
- Email-to-vendor async fallback
- Customer assisted-call co-pilot mode

---

## 9. Success criteria (brief) → coverage check

| Brief success criterion | Covered by |
|-------------------------|------------|
| Loop closed: intake → calls → negotiation → ranked recommendation w/ transcript evidence | Pillars 1–3 + §5 |
| One structured job spec via voice **and** ≥1 document type, user-confirmed, reused verbatim | §3 Estimator |
| Live calls vs ≥3 distinct negotiation styles; quotes structured/comparable, fees itemized | §3 Caller + demo strategy |
| ≥1 negotiation where price/terms measurably change due to gathered leverage | §3 Closer + §4 |
| AI disclosure + honesty constraints hold; friction handled gracefully | §6 |
| Every call ends in a structured outcome | §6 |
| Final report ranks all quotes, cites evidence, explains recommendation in plain language | §5 |
| Vertical parameters = config not code | §2 + §4 |

---

## 10. Out of scope (protect the clock)

Vendor booking-system integrations · payments · account management · multi-vertical simultaneously · a polished dashboard that hides non-comparable quotes · auto-sending anything to a vendor without user action.

---

## 11. Open questions for the architecture session

- Telephony path: ElevenLabs native Twilio integration vs. custom SIP/media bridge; batch/parallel calling.
- Where the skill engine + selection runs (agent tools vs. backend planner) and how it calls into the ElevenLabs agent mid-call.
- Knowledge base: source + storage for cleaning price benchmarks / fee patterns / red-flag thresholds, and retrieval method.
- Job-spec schema definition and the config format for verticals + skills.
- Data model for quotes, transcripts, recordings, and the audit log.
- Real-call consent/compliance handling in the demo environment.
