# P1 Smoke Test Runbook

**Release**: P1
**Date**: 2026-04-25
**Purpose**: Validate P1 router, clarification flow, and observability in production

---

## Pre-requisites

- [ ] BuildingOS API running and accessible
- [ ] yoryi-ai-core adapter integrated
- [ ] Test tenant with multiple buildings (for multi-building tests)

---

## Smoke Test Suite

### Test 1: P1 Router - Direct Route

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Send query: "Pagos pendientes" | Routes to `GET_PENDING_PAYMENTS`, tool=`search_payments` |
| 1.2 | Send query: "Ranking deuda por torre" | Routes to `GET_DEBT_BY_TOWER`, tool=`analytics_debt_by_tower` |
| 1.3 | Send query: "Saldo por período de la unidad 12-8 Torre A" | Routes to `GET_UNIT_BALANCE_BY_PERIOD`, tool=`get_unit_balance_by_period` |
| 1.4 | Send query: "Tickets urgentes sin asignar" | Routes to `GET_URGENT_UNASSIGNED_TICKETS`, tool=`search_tickets` |

**Validation**: Check logs for `[ROUTER-P1] Question: ...` and `[ROUTER-P1] matched: ...`

---

### Test 2: Clarification Flow - Session Binding

| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Send query: "Estado general" (ambiguous) | Returns clarification with options "1)" and "2)" |
| 2.2 | Send follow-up: "1" (same session) | Executes tool for option 1, `followUpExecuted=true`, `clarificationOptionChosen=1` |
| 2.3 | Send follow-up: "1" again (same session) | Returns "already executed" message (idempotent) |

**Validation**: Check metadata for `followUpExecuted: true`, `clarificationOptionChosen: 1`

---

### Test 3: Multi-Session Isolation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1 | Create clarification in session A | Clarification saved for session A |
| 3.2 | Reply "1" in session B | Different clarification (or expired), returns clarification not option 1 result |

**Validation**: Each session has independent clarification state

---

### Test 4: TTL Expiration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.1 | Create clarification | Saved with timestamp |
| 4.2 | Wait >5 minutes or mock time | Clarification expired |
| 4.3 | Reply "1" after TTL | Returns "expirado" message |

**Validation**: TTL = 5 minutes (`CLARIFICATION_TTL_MS`)

---

### Test 5: Invalid Option

| Step | Action | Expected Result |
|------|--------|-----------------|
| 5.1 | Create clarification with options 1-2 | Options available |
| 5.2 | Reply "9" (invalid) | Returns "opción inválida" message |

**Validation**: No tool execution, clarification error returned

---

### Test 6: Observability Metadata

| Step | Action | Expected Result |
|------|--------|-----------------|
| 6.1 | Send any P1 query | Response includes: `traceId`, `manifestVersion`, `gatewayOutcome`, `latencyMsTotal` |
| 6.2 | Send query when gateway unavailable | `gatewayOutcome=unavailable`, `answerSource=live_data` |

**Validation**: All metadata fields present in response

---

### Test 7: Multi-Building Disambiguation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 7.1 | Send: "Ranking deuda por torre" (tenant with 2+ buildings, no buildingId) | Returns clarification asking for building |
| 7.2 | Send: "Ranking deuda por torre" with buildingId | Direct route to tool |

**Validation**: Clarification includes "edificio" in question

---

### Test 8: Invariants

| Step | Action | Expected Result |
|------|--------|-----------------|
| 8.1 | Check any P1 route | No `mode` parameter in toolInput |
| 8.2 | Check any P1 route | `answerSource` is `live_data` or `clarification`, never `knowledge` |
| 8.3 | Check clarification | Max 2 options |

**Validation**: All invariants maintained

---

## Automated Tests

Run the automated test suite:

```bash
# P1 Router Tests
npm run test --workspace=@yoryi/ai-adapters -- src/buildingos/buildingos-p1-router.spec.ts

# Adapter Tests (includes observability)
npm run test --workspace=@yoryi/ai-adapters -- src/buildingos/buildingos.adapter.spec.ts
```

**Expected**: All tests pass (34 P1 router + 39 adapter)

---

## CI Validation

Every PR must pass:

```bash
# CI runs P1 smoke tests (enforcing)
npm run test --workspace=@yoryi/ai-adapters -- src/buildingos/buildingos-p1-router.spec.ts
```

---

## Debugging

### No Route Matched

1. Check logs for `[ROUTER-P1] Top 3 scores`
2. Verify keywords in manifest match query
3. Check `manifest.contractVersion` loaded correctly

### Clarification Not Working

1. Check `pendingClarifications` Map has entry
2. Verify `sessionId` is being propagated
3. Check TTL not expired

### Metadata Missing

1. Verify `buildObservabilityMetadata()` is called
2. Check `p1Router.getManifestVersion()` returns version
3. Ensure gateway returns result (otherwise outcome=unavailable)

---

## Escalation

If smoke tests fail:
1. Check BuildingOS API health
2. Verify network connectivity
3. Review logs for `[ROUTER-P1]` and `[ROUTER]` prefixes
4. Contact: Architecture Team

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA | | | |
| Dev | | | |
| Architecture | | | |
