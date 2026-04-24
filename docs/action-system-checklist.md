# Assistant Action System Checklist (Fase 8)

## Objetivo

Habilitar acciones del assistant de forma controlada, con validación estricta de permisos y confirmación para acciones sensibles.

## Endpoint

- `POST /assistant/actions/execute`

### Request

```json
{
  "actionKey": "publish-charges",
  "confirmed": false,
  "context": {
    "route": "/tenant/charges"
  },
  "params": {
    "entityType": "unit",
    "entityId": "unit-42"
  }
}
```

### Response (ejemplos)

- `status=executed`
- `status=confirmation_required`
- `status=forbidden`
- `status=not_found`

## Reglas de seguridad

1. El contexto de auth es **server-authoritative** (body no pisa tenant/role/user).
2. Cada acción se valida por permiso requerido (`requiredPermission`).
3. Acciones destructivas (`destructive=true`) exigen `confirmed=true`.
4. Si no existe acción registrada, devuelve `not_found`.

## Implementación actual

- Registry central de acciones BuildingOS en adapter layer.
- Confirmación explícita para `publish-charges`.
- Soporte de acción genérica `open-entity` con validación por tipo de entidad + permisos.

## Criterio de aceptación

- Nunca ejecuta acción sin permisos.
- Nunca ejecuta acción destructiva sin confirmación.
- Responde con estado claro y ejecutable por frontend.
