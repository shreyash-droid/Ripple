import { query } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";

export const handler = async (event) => {
  try {
    // 0. Authenticate. Throws AuthError(401) without a valid Bearer token.
    const { userId } = requireAuth(event);

    // The conversation id comes from the URL path, e.g. /api/conversations/5/messages
    const conversationId = event.pathParameters?.id;

    if (!conversationId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "conversation id is required" }),
      };
    }

    // The thread is only readable through its conversation, so ownership is
    // checked once on the parent — a miss here and a conversation that doesn't
    // exist are the same answer to the caller.
    const owned = await query(
      `SELECT 1 FROM conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    if (owned.length === 0) {
      return {
        statusCode: 404, // 404 not 403 — don't reveal that the conversation exists
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "conversation not found" }),
      };
    }

    // `meta` carries the rubric scorecard for turns the coach/reviewer scored,
    // so reopening a conversation restores its cards and its session trend.
    const messages = await query(
      `SELECT id, role, content, meta, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY id ASC`,
      [conversationId]
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, messages }),
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500, // AuthError -> 401; everything else 500
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};