# Assistant Auth Rollout Checklist

## Objetivo

Activar identidad **server-authoritative** para `/assistant/chat` con rechazo estricto de requests no verificadas.

## Variables requeridas (strict mode)

Para `ASSISTANT_STRICT_AUTH=true`, el servicio requiere:

- `ASSISTANT_AUTH_JWT_HS_SECRET` **o** `ASSISTANT_AUTH_JWT_PUBLIC_KEY` **o** `ASSISTANT_AUTH_JWKS_URL`
- `ASSISTANT_AUTH_JWT_ISSUER`
- `ASSISTANT_AUTH_JWT_AUDIENCE`

Variable opcional de canary:

- `ASSISTANT_STRICT_ROLLOUT_PERCENT` (0..100, default `100`)
  - `0`: compatibilidad total (sin enforcement estricto)
  - `100`: enforcement estricto completo
  - `1..99`: canary determinístico por request

## Fases de rollout

### Fase 1 — Staging

1. Configurar variables anteriores.
2. Validar `/health` y revisar bloque `auth`.
3. Ejecutar smoke tests:
   - JWT válido => 200
   - JWT inválido => 401
   - JWT expirado => 401
   - `iss`/`aud` incorrectos => 401
   - body spoofing (`tenantId`/`role`) => prevalece token

### Fase 2 — Canary en producción

1. Habilitar `ASSISTANT_STRICT_AUTH=true`.
2. Configurar `ASSISTANT_STRICT_ROLLOUT_PERCENT` (ej. `10`).
3. Monitorear:
   - tasa de 401
   - latencia p95 en `/assistant/chat`
   - errores de claims JWT
4. Verificar `/health`:
   - `auth.strictMode=true`
   - `auth.strictRolloutPercent=<valor configurado>`

### Fase 3 — Full rollout

1. Escalar `ASSISTANT_STRICT_ROLLOUT_PERCENT=100`.
2. Mantener alerta por picos de 401.
3. Revisar semanalmente intentos de spoofing detectados.

## Criterio de aceptación

- No se aceptan requests sin identidad verificada en strict mode.
- El rol/tenant del body no sobreescribe identidad de token.
- El servicio mantiene respuestas funcionales para usuarios con token válido.

## Observabilidad deuda exacta (Fase 7)

Endpoint operativo:

- `GET /api/analytics/metrics/debt?tenantId=<id>&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

Métricas clave:

- `debtQueries`
- `exactAnswers`
- `exactAnswerRate`
- `fallbackDebtAnswers`
- `fallbackRate`
- `avgGatewayLatencyMs`
- `answerSourceBreakdown` (`live_data`, `knowledge`, `fallback`)
