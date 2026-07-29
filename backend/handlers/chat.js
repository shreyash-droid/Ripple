import { query } from "../lib/db.js";
import { generateTurn } from "../lib/llm.js";
import { requireAuth } from "../lib/auth.js";

export const handler = async (event) => {
  try {
    // 0. Authenticate. Throws AuthError(401) without a valid Bearer token.
    const { userId } = requireAuth(event);

    // The frontend sends JSON in the request body; parse it.
    const body = JSON.parse(event.body || "{}");
    const { message, mode = "general" } = body;
    let { conversationId } = body;
    // A conversation runs in exactly one mode. For a new chat that is whatever
    // the client asked for; for an existing one it is whatever the conversation
    // was created with, resolved below.
    let effectiveMode = mode;

    // Basic validation
    if (!message) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "message is required" }),
      };
    }

    // 1. If no conversationId, this is a new chat — create the conversation,
    //    stamped with its owner so every later read can be scoped to them.
    if (!conversationId) {
      const created = await query(
        "INSERT INTO conversations (title, mode, user_id) VALUES ($1, $2, $3) RETURNING *",
        [message.slice(0, 40), mode, userId]  // use first 40 chars of message as the title
      );
      conversationId = created[0].id;
    } else {
      // Continuing an existing chat: it has to be theirs. Without this check any
      // logged-in user could append to — and read the history of — someone else's
      // conversation by guessing its id.
      const owned = await query(
        `SELECT mode FROM conversations WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      );
      if (owned.length === 0) {
        return {
          statusCode: 404, // 404 not 403 — don't reveal that the conversation exists
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "conversation not found" }),
        };
      }
      /* The conversation's own mode wins over whatever the client sent. The UI
         starts a new chat on every mode switch, so the two normally agree — but
         a stale tab could otherwise score a coach turn against the resume rubric
         and land two incompatible scorecards in one session trend. */
      effectiveMode = owned[0].mode || mode;
    }

    // 2. Fetch recent history BEFORE saving the new message
    //    (so the current message isn't double-counted).
    const HISTORY_LIMIT = 10; // last 10 messages — tune as you like
    const historyRows = await query(
      `SELECT role, content FROM messages
       WHERE conversation_id = $1
       ORDER BY id DESC
       LIMIT $2`,
      [conversationId, HISTORY_LIMIT]
    );
    // Fetched newest-first for the LIMIT to work; reverse to chronological order.
    const history = historyRows.reverse();

    // 3. Now save the user's new message.
    await query(
      "INSERT INTO messages (conversation_id, role, content, user_id) VALUES ($1, $2, $3, $4)",
      [conversationId, "user", message, userId]
    );

    // 4. Run the mode's workflow. Evaluative modes (coach, reviewer) also return
    //    a scorecard; the rest return scorecard: null.
    const { reply, scorecard } = await generateTurn({ mode: effectiveMode, message, history });

    // 5. Save the assistant's reply, with the scorecard alongside it. It lives on
    //    the message rather than on the conversation so reopening a chat restores
    //    every card and the session trend rebuilds itself from history.
    const saved = await query(
      `INSERT INTO messages (conversation_id, role, content, meta, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        conversationId,
        "assistant",
        reply,
        scorecard ? JSON.stringify({ scorecard }) : null,
        userId,
      ]
    );

    // 6. Bump the conversation's updated_at so recent chats sort to top later.
    await query(
      "UPDATE conversations SET updated_at = now() WHERE id = $1",
      [conversationId]
    );

    // 7. Return everything the frontend needs.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        messageId: saved[0].id,
        // the mode the turn actually ran in, so a client whose pill drifted out
        // of step with the conversation can correct itself
        mode: effectiveMode,
        reply,
        scorecard,
      }),
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500, // AuthError -> 401; everything else 500
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
