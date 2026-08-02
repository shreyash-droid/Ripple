POST /api/chat
body: { conversationId, mode, message }
response: { conversationId, messageId, mode, reply, scorecard }

  `mode` in the body only takes effect when creating a conversation. On an
  existing one the stored conversations.mode wins and is echoed back as `mode`
  in the response — a conversation runs in exactly one mode for its whole life,
  so the client starts a new chat rather than switching mid-thread.

  `scorecard` is null unless the mode runs a rubric (coach, reviewer) AND the
  model judged the message scoreable — a setup message or a follow-up question
  is answered without a score. When present:

  {
    max: 100,
    overall: 72,                        // mean of the criteria below, whole
    verdict: "one-line summary",
    criteria: [{ key, label, score, note }, ...]
  }

  The same object is persisted to messages.meta.scorecard, so reopening a
  conversation restores every card and the session trend rebuilds from history.
  Cards written before the scale moved from 0-5 to 0-100 keep their own `max`
  and are rescaled on read by web/src/lib/scoring.js.
  Rubrics live in backend/lib/rubrics.js.

GET /api/conversations
response: [{ id, title, mode, updatedAt }]

GET /api/conversations/:id/messages
response: [{ id, role, content, meta, createdAt }]

GET /api/progress
response: { joinedAt, modes, truncated, cards: [{ id, conversationId, title,
            mode, scorecard, createdAt, conversationCreatedAt }] }

  Every scored turn the caller has, oldest first, across the modes that declare
  a rubric (coach and reviewer today — the list is derived from
  backend/lib/rubrics.js, not hardcoded). Cards are sent whole and unrescaled;
  the dashboard folds them per mode through web/src/lib/scoring.js, which owns
  the 0-5 → 0-100 normalisation. `joinedAt` is users.created_at, the baseline
  every "since you arrived" delta is measured from. History is capped at the 600
  most recent turns and `truncated` says whether the cap was hit.

POST /api/ask
body: { question, documentId }
response: { answer, sourcesUsed }

  The answer cites its passages inline as [1], [2]; `sourcesUsed` is the top 4
  of them as { marker, documentId, chunkIndex, distance, relevance, excerpt },
  where `relevance` is 1 − cosine distance.
