import { query } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";

export const handler = async (event) => {
  try {
    // 0. Authenticate. Throws AuthError(401) without a valid Bearer token.
    const { userId } = requireAuth(event);

    const conversationId = event.pathParameters?.id;

    if (!conversationId) {
      return json(400, { error: "conversation id is required" });
    }

    // messages.conversation_id is ON DELETE CASCADE (see schema.sql), so the
    // thread goes with it — no second statement, and no orphaned rows if this
    // one fails halfway.
    // The user_id predicate is the ownership check: someone else's conversation
    // simply matches nothing, so it's indistinguishable from one that's gone.
    const rows = await query(
      "DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id",
      [conversationId, userId]
    );

    // Nothing matched — either already deleted, or never theirs. Same answer
    // either way, so the response never confirms someone else's id exists.
    if (!rows.length) {
      return json(404, { error: "conversation not found" });
    }

    return json(200, { id: rows[0].id, deleted: true });
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message }); // AuthError -> 401
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
