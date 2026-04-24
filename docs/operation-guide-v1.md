# Operación y Extensión del Copiloto V1

## Monitoreo

### Dónde revisar métricas

El `metricsService` registra eventos en cada request. Para ver datos:

1. **MetricsRecorder** debe configurarse en producción:
```typescript
metricsService.setRecorder({
  record: (metrics) => {
    // enviar a tu sistema de analytics
    console.log('assistant_metrics', metrics);
  }
});
```

### KPIs a monitorear

| Métrica | Bueno | Malo |
|--------|-------|------|
| Fallback rate | < 30% | > 50% |
| Queries sin acciones | < 20% | > 40% |
| Avg response time | < 2s | > 5s |

### Queries de debug

```sql
-- Top modules
SELECT module, COUNT(*) as q 
FROM metrics 
GROUP BY module 
ORDER BY q DESC;

-- Top roles
SELECT role, COUNT(*) as q 
FROM metrics 
GROUP BY role;

-- Acciones más sugeridas
SELECT action_keys, COUNT(*) as q 
FROM metrics 
WHERE action_count > 0 
GROUP BY action_keys;
```

---

## Si algo falla

### El widget no carga

1. Verificar que el API responde:
```bash
curl -X POST "http://localhost:4001/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","context":{"userId":"test","role":"RESIDENT","route":"/test"}}'
```

2. Verificar permisos en frontend (useCanAccessAi)

3. Revisar consola del browser por errores

### El copiloto no responde bien

1. **Sin acciones**: verificar role filtering en adapter
2. **Sin fallback**: revisar knowledge service
3. **Rutas rotas**: revisar action-route-map.ts

### Métricas no se registran

1. Verificar que `metricsService.record()` se llama
2. Verificar que MetricsRecorder está configurado
3. Revisar logs del servidor

---

## Agregar nuevo módulo

### Paso a paso

1. **Adapter** (`buildingos.adapter.ts`):
```typescript
// getModules()
{ key: "nuevo_modulo", label: "Nuevo Módulo" }

// getKnowledgeScopes()
{ appId: "buildingos", module: "nuevo_modulo", roleScope: [...] }

// resolvePermissions()
"nuevo_modulo.read", "nuevo_modulo.write"

// buildPermissionActions()
if (permissions.includes("nuevo_modulo.read")) {
  actions.push({ key: "open-nuevo", label: "Open Nuevo" });
}

// resolveModuleFromRoute()
if (route.includes("/nuevo")) return "nuevo_modulo";
```

2. **Frontend** (`action-route-map.ts`):
```typescript
'open-nuevo': (tenantId) => `/${tenantId}/nuevo`
```

3. **Tests**: Agregar casos en `buildingos.adapter.spec.ts`

4. **Validar**:
```bash
npm run test && npm run build
```

---

## Agregar nueva acción

En `buildingos.adapter.ts`, método `buildPermissionActions()`:

```typescript
if (permissions.includes("module.write")) {
  actions.push({
    key: "nueva-accion",
    label: "Nueva Acción",
    description: "Descripción para el usuario"
  });
}
```

Luego agregar ruta en `action-route-map.ts` y test.

---

## Mantener consistencia

### Copy

Al agregar respuestas fallback en `chat.service.ts`:
- Usar misma estructura: módulos → acciones → pasos
- Usar tono profesional pero amigable
- Máximo 3-4 líneas por sección

### Acciones

En `action-route-map.ts`:
- Labels en inglés: "View X", "Open Y", "Create Z"
- Keys consistentes: `verb-object` (snake_case)

### Testing

Antes de release:
- [ ] Tests pasan
- [ ] Módulos novos probados manualmente
- [ ] Role filtering verificado para cada rol
- [ ] Fallback funciona