CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_documents_embedding ON kb_documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

