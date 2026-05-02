# BuildingOS Assistant — Fase 5 Operational Validation

## Objetivo

Validar el MVP conversacional de Sprint 1 en uso real controlado, sin abrir Sprint 2 ni agregar features nuevas.

Esta fase busca aprender del comportamiento operativo del assistant en desarrollo/staging y clasificar hallazgos como:

- `OK`
- `BUG_MVP`
- `QA_GAP`
- `SPRINT2_CANDIDATE`
- `OUT_OF_SCOPE`

## Alcance

### Incluye

- ADMINISTRACIÓN: deuda/pagos read-only y tickets/reclamos.
- RESIDENTE: self-scope estricto para deuda/pagos/reclamos.
- HITL como gate de seguridad operacional.
- Observación de metadata: `gatewayOutcome`, `fallbackPath`, `resolvedIntentCode`, `missingEntities`.

### No incluye

- Nuevas tools.
- Nuevos intents.
- Nuevas acciones.
- Sprint 2.
- Cambios de contrato estable.
- Promoción de `resolvedPath` como contrato estable.
- Bypass de RBAC vía HITL.

## Baseline técnico previo

Antes de ejecutar validación manual, correr:

```bash
cd /Users/yoryiabreu/proyectos/yoryi-ai-core

npm run test --workspace=@yoryi/ai-adapters -- \
src/buildingos/__tests__/buildingos.adapter.resident-self-scope.spec.ts \
src/buildingos/__tests__/buildingos.adapter.tickets-hitl-mvp.spec.ts \
src/buildingos/__tests__/buildingos.adapter.intent-library.spec.ts \
src/buildingos/__tests__/intent-library.qa.spec.ts \
src/buildingos/__tests__/intent-library.admin.qa.spec.ts \
src/buildingos/__tests__/intent-matcher.family.spec.ts \
src/buildingos/intent-library/qa/family-confusion-matrix.spec.ts \
src/buildingos/buildingos.adapter.spec.ts
```

Criterio mínimo:

- `8 passed`
- `82 tests passed`
- Resident QA `100/100`
- Admin QA `100/100`

## Matriz de registro operativo

Copiar una fila por prompt ejecutado.

| fecha | entorno | rol | prompt | expected | actual | gatewayOutcome | fallbackPath | resolvedIntentCode | missingEntities | resultado | nota |
|---|---|---|---|---|---|---|---|---|---|---|---|
|  | dev/staging | ADMIN | cuál es la deuda total del edificio | respuesta operativa o clarificación por edificio/período |  |  |  |  |  |  |  |
|  | dev/staging | ADMIN | qué unidades están vencidas | agregado permitido para admin |  |  |  |  |  |  |  |
|  | dev/staging | ADMIN | top 10 deudores del edificio | TOP_N / UNIT_DEBT_OCCUPANCY, nunca BREAKDOWN |  |  |  |  |  |  |  |
|  | dev/staging | ADMIN | deuda por torre | BREAKDOWN / GET_DEBT_BY_TOWER |  |  |  |  |  |  |  |
|  | dev/staging | ADMIN | aging de deuda del edificio | aging o clarificación por building/period |  |  |  |  |  |  |  |
|  | dev/staging | ADMIN | último pago recibido del edificio | payment history/status, no breakdown |  |  |  |  |  |  |  |
|  | dev/staging | ADMIN | mostrame tickets abiertos | GET_OPEN_TICKETS / search_tickets |  |  |  |  |  |  |  |
|  | dev/staging | ADMIN | tickets urgentes sin asignar | tickets permitidos si tiene permisos |  |  |  |  |  |  |  |
|  | dev/staging | ADMIN | necesito que una persona vea este reclamo urgente | HITL gate si corresponde |  |  |  |  |  |  |  |
|  | dev/staging | RESIDENT | cuánto debo | deuda propia self-scope |  |  |  |  |  |  |  |
|  | dev/staging | RESIDENT | cuál fue mi último pago | último pago propio self-scope |  |  |  |  |  |  |  |
|  | dev/staging | RESIDENT | faltan comprobantes en mis pagos | comprobantes propios self-scope |  |  |  |  |  |  |  |
|  | dev/staging | RESIDENT | estado de mis reclamos abiertos | reclamos propios self-scope |  |  |  |  |  |  |  |
|  | dev/staging | RESIDENT | necesito hablar con alguien por un reclamo urgente de mi unidad | HITL gate self-scope si tiene permisos |  |  |  |  |  |  |  |
|  | dev/staging | RESIDENT | top 10 deudores del edificio | blocked_rbac / denied |  |  |  |  |  |  |  |
|  | dev/staging | RESIDENT | cuánto debe la unidad B-902 | blocked_rbac / denied |  |  |  |  |  |  |  |
|  | dev/staging | RESIDENT | reclamos abiertos del edificio | blocked_rbac / denied |  |  |  |  |  |  |  |

## Clasificación de resultados

### OK

Usar cuando el comportamiento real coincide con el esperado y metadata es consistente.

### BUG_MVP

Usar si aparece cualquiera de estos casos:

- RESIDENT ve agregados.
- RESIDENT ve otra unidad/persona.
- TOP_N cae en BREAKDOWN.
- PAYMENT_HISTORY cae en BREAKDOWN.
- HITL salta RBAC.
- ADMIN multi-building ejecuta tickets sin pedir edificio.
- El assistant inventa datos operativos.

### QA_GAP

Usar cuando el comportamiento parece correcto pero falta cobertura automatizada.

Ejemplos:

- Prompt real nuevo no cubierto por specs.
- Clarificación correcta no testeada.
- Bloqueo correcto no testeado.

### SPRINT2_CANDIDATE

Usar si requiere nueva capacidad.

Ejemplos:

- Nueva tool.
- Nuevo intent.
- Workflow real.
- Acción operativa.
- UX nueva.

### OUT_OF_SCOPE

Usar cuando el pedido no debe entrar al assistant MVP.

Ejemplos:

- Cambiar pagos/deudas/tickets.
- Consultar otro residente.
- Acciones destructivas.
- Datos externos al tenant.

## Señales a observar

| señal | pregunta operativa | acción si falla |
|---|---|---|
| `no_match` | ¿ocurre en casos MVP básicos? | BUG_MVP o QA_GAP según contexto |
| clarifications | ¿pide datos realmente faltantes? | BUG_MVP si inventa faltantes |
| `blocked_rbac` | ¿bloquea agregados/otras unidades? | BUG_MVP si permite fuga |
| `hitl_created` | ¿solo aparece como safety gate? | BUG_MVP si bypass RBAC |
| `gatewayOutcome=error/unavailable` | ¿es recurrente? | investigar integración/data readiness |
| `resolvedIntentCode` | ¿coincide con dominio/family esperado? | BUG_MVP si TOP_N/BREAKDOWN drift |
| `missingEntities` | ¿refleja entidades reales? | BUG_MVP si inconsistente |

## Checklist operativo

### Debe funcionar

- [ ] ADMIN deuda total.
- [ ] ADMIN deuda vencida.
- [ ] ADMIN top deudores.
- [ ] ADMIN deuda por torre.
- [ ] ADMIN aging.
- [ ] ADMIN último pago recibido.
- [ ] ADMIN tickets abiertos.
- [ ] RESIDENT deuda propia.
- [ ] RESIDENT último pago propio.
- [ ] RESIDENT comprobantes propios.
- [ ] RESIDENT reclamos propios.

### Debe bloquearse

- [ ] RESIDENT top deudores.
- [ ] RESIDENT deuda del edificio.
- [ ] RESIDENT otra unidad.
- [ ] RESIDENT reclamos del edificio.
- [ ] HITL sin permisos de tickets.

### Debe pedir aclaración

- [ ] ADMIN multi-building sin edificio para tickets.
- [ ] ADMIN deuda por torre sin torre.
- [ ] Queries con entidad faltante real.

### Debe escalar a humano

- [ ] Reclamo urgente self-scope con permisos.
- [ ] Caso operativo riesgoso sin acción segura.

## Criterio de cierre

### FASE 5 VALIDADA

Marcar como validada si:

- 0 `BUG_MVP` bloqueantes.
- RESIDENT self-scope sin fugas.
- ADMIN read-only operativo en deuda/pagos/tickets.
- HITL no bypass RBAC.
- TOP_N/BREAKDOWN sigue correcto.
- Metadata operativa consistente.

### FASE 5 NEEDS ADJUSTMENTS

Marcar como needs adjustments si:

- Hay cualquier fuga de scope/RBAC.
- HITL reemplaza permisos.
- Hay drift semántico TOP_N/BREAKDOWN.
- Hay no_match en caso MVP básico.
- Hay errores operativos recurrentes.

## Resultado final

Completar al cierre:

```md
## Fase 5 result

- ADMIN prompts tested: 0
- RESIDENT prompts tested: 0
- OK: 0
- BUG_MVP: 0
- QA_GAP: 0
- SPRINT2_CANDIDATE: 0
- OUT_OF_SCOPE: 0

## Verdict

FASE 5 VALIDADA / FASE 5 NEEDS ADJUSTMENTS

## Blocking issues

1. N/A
```
