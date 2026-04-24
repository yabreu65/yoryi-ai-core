# Release Checklist - Copiloto BuildingOS V1

## Pré-release

- [ ] Todos los builds pasan
- [ ] Todos los tests pasan (52 ai-core + 18 adapter)
- [ ] Type-check frontend pasa

---

## Build Verification

```bash
cd packages/ai-core && npm run build
cd packages/ai-adapters && npm run build
cd apps/web && npx tsc --noEmit
```

**Esperado**: Sin errores

---

## Test Verification

```bash
cd packages/ai-core && npm run test
cd packages/ai-adapters && npm run test
```

**Esperado**:
- ai-core: 52 tests pasando
- adapter: 18 tests pasando

---

## Módulos Funcionales

### Tickets
- [ ] "How do I report an issue?" → actions: open-tickets, create-ticket
- [ ] Role filtering: RESIDENT ve view-my-tickets, NO create-ticket

### Payments
- [ ] "Where is my balance?" → actions: view-my-balance, view-pending-charges
- [ ] Role filtering: RESIDENT ve actions limitadas

### Communications
- [ ] "Any announcements?" → actions: view-notices, open-communications
- [ ] Route resolution: /communications, /avisos

### Documents
- [ ] "Where is the regulation?" → actions: view-rules, open-documents
- [ ] Route resolution: /documents, /documentos

---

## Fallback Verification

Queries genéricas que deben responder algo útil:
- [ ] "random question" → hint de módulos disponibles
- [ ] "help" → acciones del módulo actual
- [ ] "que puedo hacer" → acciones proactivas

---

## Role Filtering

Verificar que cada rol ve las acciones correctas:

| Rol | Tickets | Payments | Communications | Documents |
|-----|---------|----------|-------------|-----------|
| RESIDENT | view-my-tickets | view-my-balance | view-my-inbox | view-rules |
| OPERATOR | create-ticket | view-pending-charges | create-communication | view-rules |
| ADMIN | all | all | all | all |

---

## Observabilidad

Métricas registradas en cada request:
- [ ] timestamp
- [ ] module detectado
- [ ] role del usuario
- [ ] actionCount
- [ ] fallback (sí/no)
- [ ] llmUsed (sí/no)

---

## UI/UX

- [ ] Widget renderiza correctamente
- [ ] Acciones suggestions clickeables
- [ ] Feedback controls funcionan
- [ ] Loading state visible
- [ ] Error handling graceful

---

## Release Steps

1. **Backend deploy**: ai-assistant-api con dependencias actualizadas
2. **Frontend deploy**: BuildingOS con widget actualizado
3. **Verification**: Tests de smoke post-deploy

---

## Post-release Monitoring

### Métricas a revisar

```sql
-- Consultas por módulo
SELECT module, COUNT(*) as total 
FROM assistant_metrics 
WHERE timestamp > NOW() - 24h 
GROUP BY module;

-- Fallback rate
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN fallback = 1 THEN 1 ELSE 0 END) as fallback_count,
  ROUND(SUM(CASE WHEN fallback = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as fallback_rate
FROM assistant_metrics;

-- Queries útiles (con acciones)
SELECT 
  ROUND(SUM(CASE WHEN action_count > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as useful_rate
FROM assistant_metrics;
```

### Alarmas a configurar

- Fallback rate > 80% (el copiloto no encuentra información)
- Error rate > 5% (problemas técnicos)
- Avg response time > 5s (lentitud)

---

## Rollback Plan

Si hay problemas críticos:
1. Revertir frontend al commit anterior
2. api-assistant-api sigue funcionando sin widget
3. Investigar logs de MetricsRecorder