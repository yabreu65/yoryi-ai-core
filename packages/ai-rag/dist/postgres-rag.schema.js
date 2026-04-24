"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSTGRES_RAG_SCHEMA_SQL = void 0;
exports.POSTGRES_RAG_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY,
  app_id TEXT NOT NULL,
  type TEXT NOT NULL,
  module TEXT,
  role_scope TEXT[],
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  metadata JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (app_id, file_path)
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  token_count INT NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_documents_app_id ON rag_documents(app_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_module ON rag_documents(module);
CREATE INDEX IF NOT EXISTS idx_rag_documents_role_scope ON rag_documents USING GIN(role_scope);

-- IVF index requires data first; create after initial load in production as needed:
-- CREATE INDEX idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
`;
