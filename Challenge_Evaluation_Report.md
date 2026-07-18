# Hack-Nation 6th Global AI Hackathon — Challenge Evaluation Report

**Team:** Khaled (backend/data) · Abdu (frontend + logic) · Tarek (fullstack + distribution/demo)  
**Build window:** 6–8 hours end-to-end · **Materials window:** ~4 hours (2 demos, tech video, pitch video, story/presentation)  
**Scoring:** 10 factors × 1–10 (max 100), scored through each teammate’s role lens, then averaged  
**Artifact:** [Team Hackathon Evaluation Matrix V2 - Filled.xlsx](Team%20Hackathon%20Evaluation%20Matrix%20V2%20-%20Filled.xlsx)

---

## How we scored (and why these factors)

| # | Factor | What it captures |
|---|--------|------------------|
| 1 | Time-Feasibility | Can we close a full loop in 6–8h with a 3-person team? |
| 2 | Technical Depth | Medium–hard problem that rewards our skill without being impossible |
| 3 | Data Availability | Public / provided data quality and coverage for a robust demo |
| 4 | Resource & Credit Fit | Fit to ElevenLabs, Lovable, OpenAI, Tavily, WOZ, Emdash |
| 5 | Winning-Criteria Align | Hit the sponsor’s published rubric, not just a cool demo |
| 6 | Team-Skill Fit | Backend / frontend-logic / fullstack-demo split |
| 7 | Ease of Presentation | Story clarity for judges and pitch video |
| 8 | Demo Wow-Factor | Live, visceral “wow” in a short demo |
| 9 | Innovation Potential | Room for a differentiated, memorable approach |
| 10 | Differentiation | How hard it is to stand out vs. other teams on the same track |

Hack-Nation selects finalists on **working prototype + clear pain + venture potential**. Sponsor rubrics still decide who wins *within* a challenge.

---

## Ranked results (team averages)

| Rank | Challenge | Khaled | Abdu | Tarek | **Average** |
|------|-----------|--------|------|-------|-------------|
| **1** | **C1 The Negotiator (ElevenLabs)** | 83 | 83 | 83 | **83.0** |
| 2 | C3 RealDoor (RealPage) | 70 | 73 | 65 | **69.3** |
| 3 | C4 Data Legend (Databricks) | 70 | 72 | 66 | **69.3** |
| 4 | C2 The VC Brain (Maschmeyer) | 69 | 68 | 64 | **67.0** |
| 5 | C6 Genome Firewall (OpenAI) | 65 | 63 | 61 | **63.0** |
| 6 | C5 Women’s Hormonal Health | 55 | 56 | 51 | **54.0** |

> **Note on the C3/C4 near-tie:** Numerically they are tied at ~69.3. Expert recommendation still prefers **C4 as strategic runner-up** (higher win ceiling, clearer impact narrative) and **C3 as safe fallback** (highest finishability, lower wow). Primary pick remains **C1**.

---

## Recommendation

### Primary pick: **C1 — The Negotiator (ElevenLabs)**

Best overall fit for this team and timeline.

- Maps 1:1 onto hackathon **ElevenLabs credits** and Twilio outbound tooling.
- Scope is closable: intake → calls → negotiation → ranked report, with **simulated or human-in-the-loop counterparties** allowed (no need for real movers answering on demo day).
- Highest **demo wow** and pitch story (“software that picks up the phone and haggles”).
- Medium–hard technical depth (conversation design, structured extraction, parallel calls) matches the team.
- Main risk: **crowded track**. Win by vertical sharpness + a **live price-move** that is clearly caused by leverage, not a script.

### Strategic runner-up: **C4 — Data Legend (Databricks)**

Choose this if you want maximum social-impact narrative and a provided 10k dataset with a clear rubric — and you are willing to burn early hours on Databricks Free Edition app deploy.

### Safe fallback: **C3 — RealDoor (RealPage)**

Choose this if finishability is non-negotiable (organizer pack freezes the hard data work). Expect lower wow and a compliance/WCAG tax.

### Do not pick (for this team, this weekend)

- **C2 VC Brain** — too much surface area for 8h; cold-start sourcing is the real product and it will eat the clock.
- **C6 Genome Firewall** — scientifically solid open data + LR baseline, but weak fit for a web/demo-oriented trio.
- **C5 Women’s Hormonal Health** — best dataset (mcPHASES) is PhysioNet DUA-gated and tiny (N≈42); research framing is hard to dramatize in a pitch.

---

# Challenge-by-challenge deep dive

---

## C1 — The Negotiator (ElevenLabs) — **PRIMARY**

### What is the problem?
Phone-priced markets (moving, medical bills, contractors, auto repair) have opaque pricing and huge quote spreads. Consumers cannot afford the time to call 5–8 vendors, so they overpay or get lowballed. Moving alone is a documented $20B+ fragmented US market with 5.6× quote spreads for identical jobs.

### What could a solution be?
An end-to-end voice-agent system: (1) **Estimator** — voice + document intake into one structured job spec; (2) **Caller** — parallel outbound calls that extract itemized quotes; (3) **Closer** — negotiate with competing-bid leverage and return a ranked, evidence-backed recommendation with transcripts/recordings.

### Our proposal (differentiated)
**Vertical: residential moves in a fixed corridor** (e.g. Rock Hill → Charlotte style 45-mile move), because the brief already provides the pain numbers and FMCSA/moveBuddha benchmarks exist.

**Differentiation angles:**
1. **Config-driven vertical** — job-spec taxonomy, red-flag rules (±30% outlier), negotiation levers in a YAML/JSON config so “movers → auto body” is a swap, not a rewrite.
2. **Three live negotiation styles** — tough / lowball+hidden fees / hard-sell upseller as counter-agents (or HITL), with at least one call where price/terms **measurably change**.
3. **Honesty constraints as a product feature** — AI disclosure, no invented inventory, no fake bids; show the judge the guardrails.
4. **Document intake** — photo of rooms or an existing PDF quote → same JSON job spec as the voice interview.

**Build split (6–8h):**
| Owner | Focus |
|-------|--------|
| Khaled | Job-spec schema, quote store, Google Places/Yelp call-list stub, comparison API, transcript→structured quote extraction |
| Abdu | Estimator UI + confirmation flow, ranked report UI with transcript cites, negotiation state machine / agent tools |
| Tarek | ElevenLabs Agents + Twilio/SIP or agent-to-agent sim, live demo path, Lovable UI shell if needed, materials |

**Resources to exploit:** ElevenLabs Agents (primary), Twilio outbound, OpenAI for document/vision parse + quote structuring, Tavily for vertical price-benchmark research, Lovable for fast UI, WOZ/Emdash for parallel agent coding.

### Factor evaluation (avg across team)

| Factor | ~Avg | Notes |
|--------|------|-------|
| Time-Feasibility | 8.0 | Closable via sim/HITL; don’t attempt 8 real businesses on day-of |
| Technical Depth | 7.7 | Conversation design is the real hard part — judges say so |
| Data Availability | 7.0 | Places/Yelp for call lists; FMCSA/moveBuddha for benchmarks; not a giant labeled set |
| Resource & Credit Fit | **9.7** | Best credit mapping in the whole slate |
| Winning-Criteria Align | 9.0 | Rubric is explicit and demoable |
| Team-Skill Fit | 9.0 | Clean 3-way split |
| Ease of Presentation | 8.3 | Daniel’s story writes itself |
| Demo Wow-Factor | **9.7** | Highest in the set |
| Innovation Potential | 9.0 | Vertical-config + honesty constraints |
| Differentiation | 5.7 | Expect many teams here — win on execution + vertical |

**Risks:** Crowding; latency/barge-in making calls sound botty; over-engineering the stack and under-designing conversations (explicit weak-submission trap).

---

## C2 — The VC Brain (Maschmeyer)

### What is the problem?
Capital still flows through networks. Diligence is slow. Exceptional founders stay invisible until they know the right person. The ask: source → screen → diligence → decide, with a persistent **Founder Score**, in a path that could support a $100K check in 24 hours.

### What could a solution be?
A VC operating system on three pillars — **Sourcing**, **Assessment/Intelligence**, **Memory** — with a thesis engine, inbound application screening, outbound founder discovery (GitHub, launches, papers), 3-axis scoring (Founder / Market / Idea-vs-Market, **not averaged**), and evidence-backed investment memos with per-claim Trust Scores.

### Our proposal (if forced to pick it)
Narrow ruthlessly: **one thesis** (e.g. “pre-seed AI infra, Europe + US, technical founders”) + **outbound sourcing from GitHub + Product Hunt** + inbound deck upload → one Trust-scored memo. Skip portfolio/follow-on entirely (out of scope). Stretch: agentic traceability (cite exact deck slide / web signal).

**Resources:** Tavily + OpenAI for enrichment and memo generation; Lovable for Notion-like UX; GitHub/Product Hunt/arXiv public APIs; synthetic decks with seeded contradictions for Trust Score demos.

### Factor evaluation

| Factor | ~Avg | Notes |
|--------|------|-------|
| Time-Feasibility | 4.7 | Scope is the enemy; cold-start is mandatory |
| Technical Depth | 8.7 | High — but depth ≠ finishability |
| Data Availability | 5.7 | No provided dataset; LinkedIn is gated; synthesize heavily |
| Resource & Credit Fit | 7.0 | Tavily/OpenAI help; no dedicated sponsor stack |
| Winning-Criteria Align | 6.7 | 30% data architecture + 25% trust + 30% utility — hard to hit all |
| Team-Skill Fit | 7.3 | Possible, but sourcing graph is research-heavy |
| Ease of Presentation | 5.7 | Easy story, hard to prove depth in 3 minutes |
| Demo Wow-Factor | 7.0 | Memo + Trust Score can impress if evidence is real |
| Innovation Potential | 9.0 | Highest conceptual ambition |
| Differentiation | 5.3 | Many teams will ship “AI VC chatbot” |

**Why not primary:** Ambitious goal ≠ weekend MVP. Generic enrichment without cold-start handling is explicitly scored down.

---

## C3 — RealDoor (RealPage) — **SAFE FALLBACK**

### What is the problem?
Affordable-housing applicants face fragmented paperwork and opaque program rules. Small document errors delay applications for weeks. The product must **assist, not decide**.

### What could a solution be?
One metro, one program, synthetic docs: **Profile** (extract allowlisted fields with evidence boxes + confirmation) → **Understand** (cited rules + deterministic math; abstain under uncertainty; never label eligible) → **Prepare** (missing/expired checklist → renter-controlled downloadable packet). Live demo of refusal, prompt-injection resistance, and session deletion.

### Our proposal (if picking it)
Ship the **minimum acceptance demo exactly** (6 checklist items). Skip Discover stretch. Invest in evidence boxes, correction→recompute, and WCAG keyboard path. Architecture + risk note as required.

**Resources:** Organizer pack (synthetic docs, gold fields, frozen 2026 MTSP, rule corpus, starter repo) is the main asset. OpenAI vision for extraction. Lovable for accessible UI. Partner voice credits are largely unused.

### Factor evaluation

| Factor | ~Avg | Notes |
|--------|------|-------|
| Time-Feasibility | **9.0** | Highest — hard parts frozen |
| Technical Depth | 5.7 | Deliberately constrained |
| Data Availability | **9.0** | Organizer pack |
| Resource & Credit Fit | 5.3 | Credits barely help |
| Winning-Criteria Align | 8.7 | Rubric is crystal clear |
| Team-Skill Fit | 7.3 | Strong frontend/accessibility work |
| Ease of Presentation | 8.3 | Maria’s story is clear |
| Demo Wow-Factor | 4.7 | Lowest wow by design |
| Innovation Potential | 4.7 | Safety > novelty |
| Differentiation | 6.7 | Win on correctness + safety demos |

**Why fallback not primary:** You can finish and still lose to a flashier track. Disqualification risk if anyone “helps decide eligibility.”

---

## C4 — Data Legend (Databricks) — **STRATEGIC RUNNER-UP**

### What is the problem?
India’s facility data is messy: free-text claims about ICUs, equipment, and procedures that families and planners cannot trust. Wrong referrals cost hours and lives. Need a **trust layer**, not a chatbot over a spreadsheet.

### What could a solution be?
Pick **one** mission track on Databricks Free Edition over the Virtue Foundation ~10k facility dataset: Facility Trust Desk, Medical Desert Planner, Referral Copilot, or Data Readiness Desk. Every output cites row-level evidence; communicate uncertainty; persist planner actions (notes/overrides/shortlists).

### Our proposal
**Mission: Referral Copilot** — “dialysis near Jaipur / emergency surgery near Patna” → evidence-attached shortlist with distance, matching evidence, gaps, and save-to-shortlist. Patient/coordinator story is visceral for pitch videos. Stretch only if early: MLflow tracing or map overlay.

**Build split:**
| Owner | Focus |
|-------|--------|
| Khaled | Databricks ingest, trust-scoring logic, Vector Search / retrieval, Lakebase persistence |
| Abdu | Planner workflow UI, citation expanders, uncertainty display |
| Tarek | Free Edition app deploy (early!), demo script, materials |

**Resources:** Databricks Free Edition (mandatory), provided India 10k dataset, OpenAI optional for explanation layer. **ElevenLabs/Lovable credits are secondary** — this is the main resource-fit weakness.

### Factor evaluation

| Factor | ~Avg | Notes |
|--------|------|-------|
| Time-Feasibility | 6.7 | Deploy-on-Free-Edition is the schedule risk |
| Technical Depth | 7.7 | Trust scoring without ground truth is real R&D |
| Data Availability | **9.0** | Provided 10k, 51 columns, known coverage gaps |
| Resource & Credit Fit | 3.7 | Weakest credit fit |
| Winning-Criteria Align | 9.0 | Evidence/Trust 35% + Product 30% — clear |
| Team-Skill Fit | 7.3 | Backend+UI fit; platform learning curve |
| Ease of Presentation | 7.3 | Strong impact story |
| Demo Wow-Factor | 7.0 | Citations + map/shortlist can land |
| Innovation Potential | 6.7 | Trust-without-ground-truth is the novel wedge |
| Differentiation | 5.0 | Expect many Databricks apps; pick one track deeply |

**Why runner-up:** Proven winnable pattern (similar Databricks for Good winners existed). Lose if Free Edition deploy fails on demo day — deploy in hour 1–2.

---

## C5 — Foundation Models for Women’s Hormonal Health — **LAST**

### What is the problem?
Female physiology is underrepresented in AI. No shared multimodal benchmarks combining hormones, wearables, labs, and symptoms. PCOS/endometriosis/menopause pathways are slow and fragmented. Closing the gap is framed as a trillion-dollar economic opportunity.

### What could a solution be?
Contribute **one reusable open layer**: dataset/benchmark, focused model, or application — published under an open license. Not a weekend foundation model.

### Our proposal (only if constraints change)
Application layer on **public NHANES reproductive/thyroid labs** (no DUA wait): symptom journal + simple risk education UI with strong “not a diagnosis” framing — and publish a tiny benchmark card. Attempt mcPHASES only if DUA is already approved before the clock starts.

**Resources:** OpenAI $50 credits; NHANES (CDC); mcPHASES (PhysioNet, DUA-gated, N≈42).

### Factor evaluation

| Factor | ~Avg | Notes |
|--------|------|-------|
| Time-Feasibility | 3.7 | DUA + research rigor vs clock |
| Technical Depth | 6.3 | Can be deep, but data blocks it |
| Data Availability | 3.7 | Worst in the slate |
| Resource & Credit Fit | 6.0 | OpenAI helps; not decisive |
| Winning-Criteria Align | 5.0 | Foundation value hard to prove in 8h |
| Team-Skill Fit | 5.3 | Weak domain fit |
| Ease of Presentation | 4.7 | Impact story strong; artifact weak |
| Demo Wow-Factor | 4.3 | Research assets don’t demo well |
| Innovation Potential | 8.0 | Conceptually important |
| Differentiation | 7.0 | Fewer teams may enter — still hard to win |

**Why last:** High purpose, low shipability for this team this weekend.

---

## C6 — Genome Firewall (OpenAI)

### What is the problem?
Antibiotic resistance kills >1M people/year directly. Lab AST takes 1–3 days; doctors guess meanwhile. Genomes contain resistance clues, but trusted decision support is missing. Strictly **defensive** — never design/modify organisms.

### What could a solution be?
FASTA → features (AMRFinderPlus default) → per-antibiotic **likely fail / likely work / no-call** with calibrated confidence and evidence category → Streamlit/Gradio report that always says “confirm with standard lab testing.” Evaluate with grouped (homology) splits, not random splits.

### Our proposal (if picking it)
One species, 3–5 antibiotics, **regularized logistic regression per drug** on AMRFinderPlus features (the brief’s recommended baseline). Add calibration + no-call threshold + reliability plot. Skip genomic LMs unless leftover GPU time.

**Resources:** BV-BRC open genomes + lab AMR phenotypes; AMRFinderPlus; OpenAI credits for report narration / multimodal stretch only; organizer-pinned dataset if provided.

### Factor evaluation

| Factor | ~Avg | Notes |
|--------|------|-------|
| Time-Feasibility | 5.7 | Baseline is weekend-feasible; tooling install costs time |
| Technical Depth | 7.3 | Calibration + grouped generalization is the real bar |
| Data Availability | 8.0 | Strong open data |
| Resource & Credit Fit | 6.0 | OpenAI secondary; core is classical ML |
| Winning-Criteria Align | 7.7 | Metrics are explicit and honest |
| Team-Skill Fit | 5.0 | Bioinformatics stretch for this trio |
| Ease of Presentation | 5.7 | Biosecurity story strong; demo is charts |
| Demo Wow-Factor | 5.0 | Low visceral wow |
| Innovation Potential | 6.7 | Baseline-first; novelty in honesty/no-call UX |
| Differentiation | 6.0 | Domain filters some teams |

**Why not primary:** Winnable scientifically, wrong team shape for maximum score density in 8h.

---

## Resource fit matrix (hackathon credits → challenges)

| Resource | Best challenge fit | How to use |
|----------|--------------------|------------|
| **ElevenLabs** | **C1 (primary)** | Intake agent + caller + closer; batch/parallel calls |
| **Twilio / SIP** | C1 | Real or test outbound if going beyond sim |
| **Lovable** | C1, C3, C2 | Fast UI shells (report dashboard, packet UI, memo UI) |
| **OpenAI** | C1, C2, C4, C5, C6 | Doc/vision parse, memo writing, explanations; not a substitute for AMRFinderPlus |
| **Tavily** | C2, C1 | Founder/market enrichment; price-benchmark research |
| **WOZ / Emdash** | All | Parallel coding agents to multiply the 3-person team |
| **Databricks Free Edition** | **C4 only** | Mandatory submission surface — start deploy early |

---

## If we pick C1 — how to spend the clock

### Build (6–8h)
1. **Hour 0–1:** Freeze vertical (moving), job-spec JSON schema, red-flag rules, three counterparty personas. Request/activate ElevenLabs credits. Scaffold repo.
2. **Hour 1–4:** Parallel build — Estimator (voice + one document type) · Caller (3 styles, structured quotes) · basic comparison store.
3. **Hour 4–6:** Closer negotiation with a **forced live price-move**; ranked report with transcript cites; honesty/disclosure paths.
4. **Hour 6–8:** Hardening, failure modes (hang-up, “are you a robot?”, refuse to quote), dry-run full demo twice.

### Materials (4h)
| Asset | Owner bias | Content |
|-------|------------|---------|
| Technical demo video | Khaled/Abdu | End-to-end loop, show price-move, show structured quotes |
| Pitch video | Tarek | Daniel’s story → 5.6× spread → agent closes the gap → market beachhead |
| Live demo #1 | Full team | Happy path |
| Live demo #2 | Full team | Friction path (robot question / refusal) + recovery |
| Story / slides | Tarek | Problem → system → evidence → why ElevenLabs → next 30 days |

---

## Final decision rule for the team

1. **Default: C1 The Negotiator** — best score (83), best credit fit, best wow, closable scope.
2. **Switch to C4** only if ElevenLabs telephony/credits are blocked *and* someone already has a working Databricks Free Edition app path.
3. **Switch to C3** only if the team’s priority becomes “guaranteed finished submission” over winning ceiling.
4. Avoid C2/C5/C6 unless team composition or pre-work changes materially (e.g. bioinformatician joins, or mcPHASES DUA already approved with a cleaned benchmark).

---

*Evaluation prepared as an experienced hackathon-winner lens for Khaled, Abdu, and Tarek. Scores are expert role-lens estimates for decision support — recalibrate in the Niche Selection sheet once the challenge is locked.*
