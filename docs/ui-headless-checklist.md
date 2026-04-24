# UI Headless SDK Checklist (Fase 4)

## Objetivo

Proveer SDK reusable sin lock-in de framework para integrar assistant chat/actions/events.

## Package

- `@yoryi/ai-ui`

## API principal

- `createAssistantClient({ baseUrl, getAuthToken })`
  - `chat.send(...)`
  - `actions.execute(...)`
  - `events.track(...)`
- `createAssistantSessionStore(sessionId)`
- Helpers:
  - `normalizeAssistantResponse(...)`
  - `isConfirmationRequired(...)`

## Criterio de aceptación

1. Cliente maneja token bearer cuando está disponible.
2. Session store mantiene historial liviano y estado loading/error.
3. UI puede resolver fácil flujo de confirmación de acciones.
