# Multi-SaaS Checklist (Fase 7)

## Objetivo

Soportar BuildingOS y JurisManager con el mismo core, aislando lógica por adapter.

## Entregables

- Adapter `JurisManagerAdapter` en `ai-adapters`.
- Knowledge base `knowledge/jurismanager/`.
- Registry de adapters en API (`appId -> adapter`).

## Reglas de seguridad

1. `appId` efectivo viene del contexto auth server-side.
2. Body del cliente no puede forzar cambio de tenant/role/app.
3. Permisos y acciones se validan por adapter.

## Criterio de aceptación

1. `appId=buildingos` responde con BuildingOSAdapter.
2. `appId=jurismanager` responde con JurisManagerAdapter.
3. Ambos respetan aislamiento tenant y autorización.
