# Guía para Extender el Copiloto

Esta guía cubre cómo agregar una nueva capacidad al copiloto de usuarios.

## Arquitectura General

```
ai-core        → Lógica reusable (ChatService, métricas, tipos)
ai-adapters  → Específico por SaaS (acciones, roles, rutas)
ai-assistant-api → Orquestación HTTP
frontend    → Widget y experiencia de usuario
```

---

## Paso 1: Agregar Nuevo Módulo al Adapter

En `packages/ai-adapters/src/buildingos/buildingos.adapter.ts`:

### 1.1 Agregar módulo en `getModules()`

```typescript
async getModules(): Promise<AppModuleDefinition[]> {
  return [
    // ... módulos existentes
    { key: "nuevo_modulo", label: "Nuevo Módulo" },
  ];
}
```

### 1.2 Agregar knowledge scope en `getKnowledgeScopes()`

```typescript
async getKnowledgeScopes(): Promise<KnowledgeScope[]> {
  return [
    // ... scopes existentes
    { 
      appId: "buildingos", 
      module: "nuevo_modulo", 
      roleScope: ["SUPER_ADMIN", "TENANT_ADMIN", "OPERATOR", "RESIDENT"] 
    },
  ];
}
```

### 1.3 Agregar permisos en `resolvePermissions()`

```typescript
const allPermissions = [
  // ... permisos existentes
  "nuevo_modulo.read",
  "nuevo_modulo.write",
];
```

---

## Paso 2: Definir Acciones Sugeridas

En `buildPermissionActions()`:

```typescript
if (permissions.includes("nuevo_modulo.read")) {
  actions.push({
    key: "open-nuevo-modulo",
    label: "Open Nuevo Módulo",
    description: "Navigate to the Nuevo Módulo",
  });

  if (permissions.includes("nuevo_modulo.write")) {
    actions.push({
      key: "create-item",
      label: "Create Item",
      description: "Create a new item",
    });
  }
}
```

---

## Paso 3: Configurar Role Filtering

En `filterActionsByRole()`:

```typescript
const residentAllowedKeys = [
  // ... acciones existentes
  "open-nuevo-modulo",
  // NO crear items (solo admin)
];

const operatorLimitedKeys = [
  // ... acciones existentes + operator
  "open-nuevo-modulo",
  "create-item",
];
```

---

## Paso 4: Mapear Rutas

En `resolveModuleFromRoute()`:

```typescript
private resolveModuleFromRoute(route: string): string {
  if (route.includes("/nuevo")) return "nuevo_modulo";
  // ... otros módulos
}
```

---

## Paso 5: Frontend - Action Route Map

En `apps/web/shared/components/assistant/action-route-map.ts`:

```typescript
export const ACTION_ROUTE_MAP = {
  // ... acciones existentes
  'open-nuevo-modulo': (tenantId) => `/${tenantId}/nuevo`,
  'create-item': (tenantId) => `/${tenantId}/nuevo/new`,
};
```

---

## Paso 6: Frontend - API Mapping

En `apps/web/features/assistant/services/assistant.api.ts`:

```typescript
private mapActionKeyToType(actionKey: string): SuggestedAction['type'] {
  const mapping = {
    // ... mappings existentes
    'open-nuevo-modulo': 'VIEW_REPORTS',
    'create-item': 'CREATE_TICKET',
  };
  return mapping[actionKey] || 'VIEW_REPORTS';
}
```

---

## Paso 7: UX Conversacional (Opcional)

En `packages/ai-core/src/chat.service.ts`, método `buildFallbackAnswer()`:

```typescript
if (normalized.includes("nuevo") || normalized.includes("item")) {
  return [
    "Para gestionar nuevo módulo:",
    "1. Ve al módulo de Nuevo",
    "2. Crea un nuevo item",
    "",
    "Actions disponibles:",
    "- Abrir Nuevo: para ver items",
    "- Crear Item: para agregar nuevo",
  ].join("\n");
}
```

---

## Validación de Nueva Integración

1. **Build**: Verificar que todo compile
   ```bash
   cd packages/ai-core && npm run build
   cd packages/ai-adapters && npm run build
   cd apps/web && npx tsc --noEmit
   ```

2. **Test manual**: Probar consultas
   ```bash
   curl -X POST "http://localhost:4001/api/assistant/chat" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "how do I use nuevo modulo?",
       "context": {
         "userId": "user-123",
         "tenantId": "tenant-001",
         "role": "TENANT_ADMIN",
         "route": "/nuevo"
       }
     }'
   ```

3. **Verificar respuesta**:
   - `answer` tiene texto útil
   - `actions` contiene acciones apropiadas para el rol
   - `context.currentModule` es correcto

---

## Patrones de Naming

| Tipo | Pattern | Ejemplo |
|------|---------|---------|
| Módulo | lowercase | `tickets`, `payments` |
| Acción | verb-object | `open-tickets`, `view-my-balance` |
| Ruta | /{tenantId}/modulo | `/${tenantId}/support` |
| Permiso | modulo.operacion | `tickets.read`, `payments.write` |

---

## Contratos Clave

### ActionDefinition
```typescript
{ key: string; label: string; description?: string; }
```

### ResolvedAssistantContext
```typescript
{ 
  currentModule: string; 
  permissions: string[];
  // ... contexto original
}
```

### ChatResponse
```typescript
{
  answer: string;
  actions: ActionDefinition[];
  context: ResolvedAssistantContext;
}
```