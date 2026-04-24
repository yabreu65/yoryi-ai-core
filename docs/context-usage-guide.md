# Guía de Uso de Contexto en el Copiloto

Esta guía explica cómo usar el sistema de contexto para mejorar las respuestas del copiloto.

---

## Contexto Disponible

El copiloto recibe contexto a través de `AssistantRuntimeContext`:

```typescript
{
  appId: string;
  tenantId?: string;
  userId: string;
  role: string;
  route: string;
  currentModule?: string;
  entityType?: string;
  entityId?: string;
  screenTitle?: string;
  unitOccupantRole?: "OWNER" | "RESIDENT";
}
```

---

## Cómo Agregar Nueva Señal de Contexto

### Paso 1: Agregar al Tipo

En `packages/ai-types/src/assistant-runtime-context.ts`:

```typescript
export type AssistantRuntimeContext = {
  // ... campos existentes
  newField?: string; // opcional
};
```

### Paso 2: Consumir en contextual-actions

En `packages/ai-core/src/contextual-actions.ts`:

```typescript
export interface ContextHint {
  currentModule?: string;
  currentRoute?: string;
  screenTitle?: string;
  role?: string;
  // agregar nuevo campo aquí
}
```

### Paso 3: Usar en Priorización

En las funciones de `contextual-actions.ts`:

```typescript
export function prioritizeActionsByContext(
  actions: ActionDefinition[],
  hint: ContextHint,
  question: string
): ActionHint[] {
  // usar hint.newField para priorización
}
```

---

## Cómo Priorizar Acciones por Contexto

El sistema prioriza acciones basándose en:

1. **Intención del usuario**: palabras clave en la pregunta
2. **Módulo actual**: `currentModule` o ruta
3. **Rol**: filtrado de acciones

### Ejemplo de Priorización

```typescript
const MODULE_DEFAULT_ACTIONS: Record<string, string[]> = {
  payments: ["view-my-balance", "view-pending-charges", "report-payment"],
  tickets: ["open-tickets", "view-my-tickets", "create-ticket"],
  communications: ["open-communications", "view-notices", "view-my-inbox"],
};
```

Las acciones del módulo actual se mueven al inicio de la lista.

---

## Sugerencias Proactivas

El sistema detecta preguntas proactivas y responde con acciones relevantes:

```typescript
const PROACTIVE_QUESTIONS = [
  "help",
  "help me", 
  "what can i do",
  "i'm lost",
  "que puedo hacer",
  "ayuda",
];
```

Cuando el usuario hace una pregunta proactiva, el copiloto:
1. Detecta el módulo actual desde la ruta
2. Devuelve acciones por defecto de ese módulo
3. Añade acciones genéricas si no hay contexto

---

## Fallback Contextual

Cuando la pregunta no coincide exactamente:

```typescript
export function getContextualFallback(hint: ContextHint, question: string): string | null {
  const contextHints: Record<string, string[]> = {
    tickets: ["En esta sección de Support podés:", ...],
    payments: ["En esta sección de Pagos podés:", ...],
  };
  // usa hint.currentModule para elegir el hint correcto
}
```

---

## UX Textual mejorada

Las respuestas ahora incluyen contexto cuando corresponde:

```typescript
// Antes: "Your balance is $100"
// Después: "(Finanzas) Your balance is $100"
```

Esto ayuda al usuario a entender en qué sección está.

---

## Guardrails

Para evitar que el contexto rompa comportamiento:

1. **Intención del usuario primero**: Si pregunta específicamente por otro módulo, usar ese módulo
2. **Rol filtering intacto**: El contexto no debe permitir ver acciones fuera del rol
3. **Fallback conservativo**: Si no hay contexto claro, usar comportamiento genérico

---

## Testing de Contexto

Verificar:

1. **Priorización**: Las acciones del módulo actual aparecen primero
2. **Proactividad**: "help" devuelve acciones útiles
3. **Fallback**: Incluye hint del módulo cuando corresponde
4. **UX**: Respuesta incluye prefijo de módulo cuando hay acciones

```bash
# Test proactivo
curl -X POST "http://localhost:4001/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "help",
    "context": {
      "role": "RESIDENT",
      "route": "/resident/finanzas"
    }
  }'

# Test priorización
curl -X POST "http://localhost:4001/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "my balance",
    "context": {
      "role": "RESIDENT",
      "route": "/resident/finanzas"
    }
  }'
```