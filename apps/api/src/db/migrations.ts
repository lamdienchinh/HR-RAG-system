import { pool } from './pool.js';

export const runMigrations = async (): Promise<void> => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      sensitivity TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      content TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS policy_revisions (
      id BIGSERIAL PRIMARY KEY,
      policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
      version TEXT NOT NULL,
      content TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding vector(384) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Add tsv column if missing (for existing tables without it)
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_chunks' AND column_name = 'tsv'
      ) THEN
        ALTER TABLE document_chunks
          ADD COLUMN tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', title || ' ' || content)) STORED;
      END IF;
    END $$
  `);

  // Migrate tsv from 'english' to 'simple' config if needed (supports Vietnamese)
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_attrdef
        WHERE adrelid = 'document_chunks'::regclass
        AND pg_get_expr(adbin, adrelid) LIKE '%english%'
      ) THEN
        ALTER TABLE document_chunks DROP COLUMN tsv;
        ALTER TABLE document_chunks
          ADD COLUMN tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', title || ' ' || content)) STORED;
      END IF;
    END $$
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw
    ON document_chunks USING hnsw (embedding vector_cosine_ops)
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS document_chunks_policy_id_idx ON document_chunks(policy_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS document_chunks_tsv_gin ON document_chunks USING gin(tsv)');

  // Conversation tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS chat_messages_conv_idx ON chat_messages(conversation_id, created_at)');

  // Removed: conversation_chunks table — conversation history is now passed
  // directly via chat_messages → Gemini prompt (no vector embedding needed).
  await pool.query('DROP TABLE IF EXISTS conversation_chunks');

  // Add citations column if missing
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'citations'
      ) THEN
        ALTER TABLE chat_messages ADD COLUMN citations JSONB;
      END IF;
    END $$
  `);

  // Add user_id to conversations for per-user isolation
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'user_id'
      ) THEN
        ALTER TABLE conversations ADD COLUMN user_id TEXT;
      END IF;
    END $$
  `);

  // Auth: users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Auth: is_private column on policies
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies' AND column_name = 'is_private'
      ) THEN
        ALTER TABLE policies ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;
      END IF;
    END $$
  `);

  // Sync is_private to document_chunks for retrieval filtering
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_chunks' AND column_name = 'is_private'
      ) THEN
        ALTER TABLE document_chunks ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;
      END IF;
    END $$
  `);

};
