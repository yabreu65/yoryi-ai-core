# Architecture Playbook Link

## Canonical Core Path

`/Users/yoryiabreu/proyectos/yoryi-core-architecture`

## Required Core Docs

- `domains/ai/agents/tool-contracts.md`
- `domains/backend/security/identity-tenant-context.md`
- `domains/backend/postgres/multi-tenancy-data-isolation.md`
- `checks/architecture/planning-quality-scorecard.md`

## Policy

No se copian docs del core, solo se referencian.

## Operational Notes

- This repository treats `yoryi-core-architecture` as a live architecture playbook.
- Local docs can add overlays or constraints, but must not duplicate core doctrine.
- Any missing required core reference should fail CI via `scripts/check-playbook-link.mjs`.

## Version Pointer

See root `PLAYBOOK_VERSION` for the current synced core ref.