CREATE TABLE conversations (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'New chat',
  mode        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id               SERIAL PRIMARY KEY,
  conversation_id  INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL,
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);