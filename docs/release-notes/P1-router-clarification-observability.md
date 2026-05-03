# P1 Release Notes - Router + Clarification + Observability

**Release**: P1
**Date**: 2026-04-25
**Status**: ✅ Production Ready
**Owner**: Architecture Team

---

## Summary

This release delivers P1 router with keyword-based intent resolution, clarification flow with session binding, observability metadata, and multi-building disambiguation for BuildingOS queries.

---

## Changes

### 1. P1 Router Implementation

**Files Changed**:
- `packages/ai-adapters/src/buildingos/buildingos-p1-router.ts` (new)
- `packages/ai-adapters/src/buildingos/contracts/manifests/buildingos.p1.json` (new)

**Features**:
- Keyword-based intent routing for 12 operative queries
- Manifest-based configuration (`contractVersion: 2026-04-buildingos-p1-manifest-v1`)
- Default values: ranking=5, periodsBack=3, maxClarifications=2
- Disambiguation for ambiguous queries

**Intents Supported**:
| Intent Code | Tool | Keywords |
|------------|------|----------|
| GET_OVERDUE_UNITS | search_payments | moroso, mora, deuda, vencida |
| GET_PENDING_PAYMENTS | search_payments | pagos pendientes, por aprobar |
| GET_DEBT_BY_TOWER | analytics_debt_by_tower | deuda por torre, ranking |
| GET_UNIT_BALANCE_BY_PERIOD | get_unit_balance_by_period | historial, evolución, saldo por período |
| GET_DEBT_AGING | analytics_debt_aging | antigüedad, aging, días de mora |
| GET_URGENT_UNASSIGNED_TICKETS | search_tickets | urgente sin asignar, alta prioridad |
| GET_REJECTED_TODAY | search_payments | rechazados hoy |
| GET_PAYMENTS_WITHHOUT_PROOF | search_payments | sin comprobante |
| GET_LAST_PAYMENT | get_unit_payments | último pago |
| GET_UNIT_DEBT | get_unit_balance | cuanto debe, saldo |
| GET_UNIT_PRIMARY_RESIDENT | get_unit_profile | residente, quien vive |
| GET_OPEN_TICKETS | search_tickets | tickets abiertos, backlog |

### 2. Clarification Flow + Session Binding

**Files Changed**:
- `packages/ai-adapters/src/buildingos/buildingos.adapter.ts`

**Features**:
- Session-bound clarification state via `context.extra.sessionId`
- TTL: 5 minutes (`CLARIFICATION_TTL_MS`)
- Numeric option resolution ("1", "2" -> executes tool)
- Edge cases: invalid option, expired clarification, idempotent follow-up
- Multi-session isolation

**States**:
- `clarificationOptionChosen`: tracks which option user selected
- `followUpExecuted`: true after numeric follow-up execution

### 3. Observability Metadata

**Files Changed**:
- `packages/ai-adapters/src/buildingos/buildingos.adapter.ts`

**Metadata Fields**:
| Field | Type | Description |
|-------|------|-------------|
| traceId | string | `trace_{timestamp}_{random}` |
| manifestVersion | string | P1 manifest version |
| gatewayOutcome | enum | success/denied/unavailable/timeout/contract_mismatch/invalid_payload |
| latencyMsTotal | number | Gateway call latency |
| clarificationOptionChosen | number | Selected option index (1-2) |
| followUpExecuted | boolean | True after numeric follow-up |

### 4. Multi-Building Disambiguation

**Files Changed**:
- `packages/ai-adapters/src/buildingos/buildingos-p1-router.ts`

**Features**:
- `requireBuildingWhenMultiBuilding` config from manifest
- `routeForMultiBuilding(question, buildingId?)` method
- Returns clarification asking for building if ranking query without buildingId

### 5. CI Integration

**Files Changed**:
- `.github/workflows/ci.yml`

**Changes**:
- Added `p1-smoke` job (enforcing)
- Runs `buildingos-p1-router.spec.ts` on every PR

---

## Invariants (Must Not Break)

- ❌ NO `mode` parameter in `search_payments` routes
- ❌ NO intents by filter (same intent, different filters = different routes)
- ❌ NO `answerSource: knowledge` for P1 operative routes
- ✅ `maxClarifications=2`
- ✅ `answerSource: live_data` or `clarification`

---

## Test Coverage

| Test Suite | Status | Tests |
|------------|--------|-------|
| P1 Router Unit | ✅ Pass | 34 |
| Adapter Observability | ✅ Pass | 39 |
| CI P1 Smoke | ✅ Pass | Enforcing |

---

## Rollback Plan

If issues detected:
1. Revert `.github/workflows/ci.yml` to remove P1 enforcing
2. Disable P1 router by not loading manifest
3. Fallback to P0 router only

---

## Dependencies

- BuildingOS API: `/assistant/tools/*` endpoints must be operational
- Tools: `search_payments`, `analytics_debt_by_tower`, `get_unit_balance_by_period`, etc.
- Network: Gateway connectivity required for `answerSource: live_data`

---

## Known Limitations

- Clarification state is in-memory only (not persisted across instances)
- TTL is 5 minutes (no long-running clarification sessions)
- P2 will add Redis/shared store for multi-instance support
