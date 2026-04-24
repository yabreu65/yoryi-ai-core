# ADR-001: Governance Brain/Guard Contract-First

- Status: Accepted
- Date: 2026-04-24
- Owners: AI Platform

## Context

`yoryi-ai-core` needs a governance layer for operational assistant decisions that is auditable, tenant-safe, and incremental.

Current requirement is to define governance artifacts (docs, contracts, tests, CI gates) without introducing runtime behavior changes.

## Decision

Adopt a Brain/Guard model with a versioned contract in `@yoryi/ai-types`:

- Brain emits a decree envelope (`BrainDecreeEnvelope`)
- Guard validates envelope invariants and returns a structured verdict (`GovernanceGuardVerdict`)

Enforcement starts at contract level through tests and CI.

## Rationale

- Keeps `ai-core` SaaS-agnostic while formalizing safety boundaries.
- Makes tenant isolation explicit and testable before any runtime rollout.
- Enables progressive delivery: contracts first, behavior later.

## Alternatives considered

1. Implement governance directly in service code first.
   - Rejected: couples behavior to unstable rules and reduces auditability.

2. Keep governance only as documentation.
   - Rejected: no executable guarantees, high drift risk.

## Consequences

Positive:

- Explicit safety invariants with reject codes.
- Faster reviews via contract tests and CI gate.
- Clear path for future rollout without big-bang refactor.

Negative:

- Additional maintenance for versioned contracts.
- Need discipline to keep docs, contracts, and tests synchronized.

## Rollout plan

1. Add governance docs and ADR.
2. Add contract type + validator in `@yoryi/ai-types`.
3. Add contract tests in `ai-assistant-api`.
4. Enforce with dedicated CI contract step.

No endpoint/business-logic changes in this ADR scope.

## References

- `AGENTS.md`
- `DECISIONS.md` (D-001, D-006, D-007)
- `docs/ai-assistant/05-governance-brain-guard.md`
