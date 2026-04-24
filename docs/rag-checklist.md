# RAG Checklist (Fase 3)

## Objetivo

Habilitar retrieval semántico con fallback seguro a markdown cuando no hay resultados.

## Variables

- `RAG_ENABLED` (default: `false`)
- `RAG_DB_URL` (si está presente, usa `PostgresRagStore` con pgvector; si no, fallback a `InMemoryRagStore`)
- `RAG_EMBEDDING_MODEL` (default: `nomic-embed-text`)
- `RAG_TOP_K` (default: `5`)
- `RAG_MIN_SCORE` (default: `0.35`)
- `RAG_REINDEX_TOKEN` (opcional, protege `/assistant/rag/reindex`)

## Endpoint interno

- `POST /assistant/rag/reindex`
  - body opcional: `{ "apps": ["buildingos", "jurismanager"] }`
  - header opcional de seguridad: `x-internal-token`

## Criterio de aceptación

1. Con `RAG_ENABLED=true`, el retrieval semántico se intenta primero.
2. Si falla retrieval o no hay hits, el assistant mantiene fallback a markdown.
3. Con `RAG_DB_URL` configurado, `/assistant/rag/reindex` persiste embeddings en Postgres+pgvector.
4. Reindex incremental evita reprocesar documentos sin cambios (checksum).
