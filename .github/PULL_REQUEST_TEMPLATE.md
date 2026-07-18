## Pull Request Checklist — The Negotiator

### Lane & package
- [ ] Lane: `lane-a` / `lane-b` / `integration` / `docs`
- [ ] Package ID (e.g. `PR-A2`): ________

### Architecture
- [ ] Touched layers: contracts / domain / application / adapters / frontend
- [ ] No vendor SDK imports outside `src/adapters/**` (and composition root)
- [ ] Port contracts unchanged **or** versioned + both lanes notified
- [ ] Updated `docs/architecture/layers/<layer>.md` for every touched layer (or applied `no-docs-needed` label with justification)

### Testing (TDD)
- [ ] Failing test written first
- [ ] Unit / contract / integration tests added or updated
- [ ] CI green locally: `npm run lint && npm run typecheck && npm run arch:check && npm run test`

### Tier
- [ ] Tier: T1 / T2 / T3
- [ ] Does not break lower-tier gate (T1 e2e still green if this is T2/T3)

### Clean code
- [ ] Single responsibility per new file
- [ ] No speculative abstractions
- [ ] No secrets committed
