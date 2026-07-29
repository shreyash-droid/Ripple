POST /api/chat
body: { conversationId, mode, message }
response: { conversationId, messageId, reply, scorecard }

  `scorecard` is null unless the mode runs a rubric (coach, reviewer) AND the
  model judged the message scoreable — a setup message or a follow-up question
  is answered without a score. When present:

  {
    max: 5,
    overall: 3.5,                       // mean of the criteria below
    verdict: "one-line summary",
    criteria: [{ key, label, score, note }, ...]
  }

  The same object is persisted to messages.meta.scorecard, so reopening a
  conversation restores every card and the session trend rebuilds from history.
  Rubrics live in backend/lib/rubrics.js.

GET /api/conversations
response: [{ id, title, mode, updatedAt }]

GET /api/conversations/:id/messages
response: [{ id, role, content, meta, createdAt }]

POST /api/ask
body: { question, documentId }
response: { answer, sourcesUsed }

  The answer cites its passages inline as [1], [2]; `sourcesUsed` is the top 4
  of them as { marker, documentId, chunkIndex, distance, relevance, excerpt },
  where `relevance` is 1 − cosine distance.
