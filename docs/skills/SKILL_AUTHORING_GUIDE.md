# Skill authoring guide

Catalog skills are data-driven negotiation moves for home cleaning. They must be safe to select, easy for a planner to recognize, and narrow enough to audit.

## Rules

1. Honesty first: a move that mentions another quote, price, or offer must set `requiresCompetingQuote: true` and normally `minQuotesInHand: 1`. Never invent a fact.
2. One move per skill: `moveTemplate` is one sentence and no more than 200 characters.
3. IDs are unique, snake_case, and begin with `challenge_`, `ask_`, `leverage_`, `clarify_`, `confirm_`, `negotiate_`, `request_`, or `waive_`.
4. Provide 2–6 unique lowercase selection-signal phrases a vendor would say.
5. Templates may use only `{{competingTotal}}`, `{{targetTotal}}`, `{{frequency}}`, `{{jobType}}`, `{{feeAmount}}`, or `{{feeType}}`.
6. Keep every catalog category at five or more skills and the total catalog at 50 or more skills.
7. A recurring-only skill belongs in `commitment_leverage` or `timing_flexibility` and sets `requiresRecurringJob: true`.

## Categories and examples

- `fee_challenges`: question an avoidable fee. Example: `challenge_trip_fee` asks to reduce a trip fee.
- `commitment_leverage`: exchange a concrete commitment for value. Example: `ask_recurring_discount` asks for a recurring-service discount.
- `market_leverage`: compare a real market offer. Example: `leverage_competing_bid` cites a real written quote and requires one.
- `clarification`: make scope or price comparable. Example: `request_all_in_total` asks for every fee in the total.
- `trust_verification`: establish service reliability. Example: `confirm_insurance_guarantee` asks about insurance and a guarantee.
- `timing_flexibility`: trade schedule flexibility for value. Example: `ask_weekday_discount` asks about a weekday rate.

## Rejected skills

- “Another cleaner will do it for $100, can you beat it?” is rejected: it claims an unverified quote without the honesty precondition.
- “Can you waive the trip fee and include supplies?” is rejected: it contains two asks and must become two skills.
- A skill with signals such as “price” and “service” is rejected: the signals are too vague to help the planner recognize a vendor utterance.

## Generated skills

PR-A8 writes generated skills under `config/skills/generated/`. Generated entries follow this guide and run through the same catalog validator before use.
