-- Ripple — full schema.
--
-- Run once against a fresh Postgres (Neon in production):
--   psql "$DATABASE_URL" -f backend/schema.sql
--
-- Every statement is IF NOT EXISTS, so running this file is safe and repeatable.
-- It is NOT a migration, though: IF NOT EXISTS skips a table that already exists
-- rather than reconciling it, so a column added here will not appear on an older
-- database. Adding a column to a live table is an ALTER, and it goes in
-- backend/migrations/ (see 001_message_meta.sql) as well as here. This file is
-- the current truth about a *fresh* database.

-- pgvector powers the document Q&A retrieval (lib/retrieval.js). Without it the
-- document_chunks table below will not create.
CREATE EXTENSION IF NOT EXISTS vector;


-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
-- Both credential paths land in one row. A user who signed up with a password
-- has password_hash and no google_sub; a user who came in through Google has the
-- reverse; a user who did both has both — handlers/googleAuth.js links the
-- Google identity onto an existing row matched by email rather than creating a
-- second account.
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  -- Stored lowercased by handlers/signup.js so "Alice@" and "alice@" are one
  -- account. UNIQUE is the real duplicate guard: signup lets the constraint fire
  -- and translates 23505 into a 409, rather than racing a check-then-insert.
  email          TEXT NOT NULL UNIQUE,
  -- NULL for Google-only accounts. handlers/login.js treats a NULL hash as
  -- "invalid credentials" — the same vague message as a wrong password, so the
  -- response never reveals which accounts have passwords.
  password_hash  TEXT,
  -- Google's stable subject claim. NULL until the account is linked to Google.
  google_sub     TEXT UNIQUE,
  name           TEXT,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Written by handlers/googleAuth.js when it links a Google identity onto an
  -- existing password account.
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
-- One mode for the whole life of a conversation. handlers/chat.js reads this
-- column and ignores whatever mode the client sent, so a stale tab can never
-- score a coach turn against the resume rubric and land two incompatible
-- scorecards in one session trend.
CREATE TABLE IF NOT EXISTS conversations (
  id          SERIAL PRIMARY KEY,
  -- Ownership. Every read is scoped through this column; a query without a
  -- user_id predicate is a cross-tenant leak, not an optimisation.
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New chat',
  -- 'general' | 'coach' | 'reviewer' | 'document'. Deliberately not an enum: the
  -- authoritative list lives in backend/lib/rubrics.js, and an enum would turn
  -- adding a mode into a migration. Note 'reviewer' is the resume-review mode —
  -- the key is frozen because renaming it would orphan existing conversations.
  mode        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Bumped on every chat turn so the sidebar sorts by recency. Deliberately NOT
  -- bumped by a rename (handlers/renameConversation.js) — renaming is not
  -- activity, and reshuffling the list under the user mid-rename is hostile.
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The sidebar's only query: this user's chats, newest activity first.
CREATE INDEX IF NOT EXISTS conversations_user_updated_idx
  ON conversations (user_id, updated_at DESC);


-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id               SERIAL PRIMARY KEY,
  conversation_id  INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  -- Denormalised from the parent conversation. Redundant by design: it lets a
  -- handler filter by owner without a join, and it means a bug that drops the
  -- conversation predicate still cannot cross tenants.
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role             TEXT NOT NULL,  -- 'user' | 'assistant'
  content          TEXT NOT NULL,
  -- Structured output from the mode's workflow, e.g.
  --   { "scorecard": { max, overall, verdict, criteria: [{ key, label, score, note }] } }
  -- for the coach and reviewer rubrics. NULL for turns that produced only prose.
  --
  -- The card lives on the message, not on the conversation, which is what makes
  -- the session trend a pure function of the thread: reopening a chat replays
  -- every card in place and the trend rebuilds itself with nothing to keep in
  -- sync. Cards written before the scale moved from 0-5 to 0-100 carry their own
  -- `max` and are rescaled on read by web/src/lib/scoring.js.
  meta             JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Thread reads, and the history window handlers/chat.js takes before each turn.
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx
  ON messages (conversation_id, id);


-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
-- Ingestion is asynchronous: handlers/ingest.js writes the row as 'processing'
-- and drops the id on SQS, then handlers/ingestWorker.js does the slow part and
-- flips it to 'ready'. The client polls GET /api/documents/:id until then,
-- because asking before the chunks exist retrieves nothing.
CREATE TABLE IF NOT EXISTS documents (
  id          SERIAL PRIMARY KEY,
  -- The wall behind document Q&A. document_chunks has no owner column of its
  -- own; lib/retrieval.js joins through to here and filters on this, which is
  -- what stops one user's question retrieving another user's passages.
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL DEFAULT 'untitled',
  -- 'processing' | 'ready' | 'failed'
  status      TEXT NOT NULL DEFAULT 'processing',
  -- Staging only. The worker nulls this out once the chunks are embedded, so a
  -- ready document does not keep a second full copy of its own text around.
  raw_text    TEXT,
  -- The worker's failure message, surfaced to the user instead of a generic
  -- "upload failed". Cleared when a retry succeeds.
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents (user_id);


-- ---------------------------------------------------------------------------
-- document_chunks
-- ---------------------------------------------------------------------------
-- ~1000-character overlapping chunks (lib/chunk.js) with their Cohere embedding.
--
-- The vector width must equal what lib/embeddings.js actually returns for
-- `embed-v4.0` at its default output dimension. GET /api/embedtest exists to
-- report that number from a live call — check it before creating this table on a
-- new database, because a mismatch fails at insert time, not at create time.
CREATE TABLE IF NOT EXISTS document_chunks (
  id           SERIAL PRIMARY KEY,
  document_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  -- Position in the document, so a citation can be traced back to where it came
  -- from. Unique per document: the worker deletes and re-inserts a document's
  -- chunks wholesale, which is what makes an at-least-once SQS redelivery safe.
  chunk_index  INTEGER NOT NULL,
  content      TEXT NOT NULL,
  embedding    VECTOR(1536) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

-- Cosine distance, matching the `<=>` operator in lib/retrieval.js. HNSW rather
-- than IVFFlat: it needs no training pass over existing rows, so it behaves on a
-- table that starts empty and grows one upload at a time.
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- The worker's delete-then-reinsert path, and the optional single-document
-- narrowing in retrieveChunks().
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx
  ON document_chunks (document_id);
