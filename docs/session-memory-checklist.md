# Assistant Session Memory Checklist (Fase 9)

## Objetivo

Mejorar continuidad conversacional con memoria de sesión, detección de preguntas repetidas y respuestas adaptativas.

## Alcance implementado

- `ChatRequest.sessionId` para agrupar interacciones.
- Memoria en `ai-core` por `appId + tenantId + userId + sessionId`.
- `sessionInsights` en respuesta:
  - `interactionCount`
  - `repeatedQuestion`
  - `recentModule`
- Priorización adaptativa de acciones según historial de la sesión.
- En fallback, hint de módulo reciente para evitar respuestas genéricas fuera de contexto.

## Reglas

1. La memoria es acotada (últimas 25 interacciones por sesión).
2. No guarda PII extra ni payloads completos; sólo señal mínima (pregunta normalizada, módulo, keys de acciones sugeridas).
3. No reemplaza autorización ni contexto server-authoritative.

## Criterio de aceptación

- Una consulta repetida en la misma sesión marca `repeatedQuestion=true`.
- Si la conversación venía en un módulo y cae a `general`, el assistant preserva contexto reciente.
- Las acciones sugeridas reflejan preferencia histórica de la sesión cuando aplica.
