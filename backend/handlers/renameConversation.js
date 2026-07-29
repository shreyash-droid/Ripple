import { query } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";

// The sidebar shows one ellipsised line, so anything past this is invisible
// weight in every list query. Long enough for a real sentence.
const MAX_TITLE = 120;

export const handler = async (event) => {
  try {
    // 0. Authenticate. Throws AuthError(401) without a valid Bearer token.
    const { userId } = requireAuth(event);

    const conversationId = event.pathParameters?.id;
    const { title } = JSON.parse(event.body || "{}");

    if (!conversationId) {
      return json(400, { error: "conversation id is required" });
    }

    // Trimmed first: a title of only spaces would render as a blank row that
    // still has to be clicked to identify.
    const clean = String(title ?? "").trim().slice(0, MAX_TITLE);
    if (!clean) {
      return json(400, { error: "title is required" });
    }

    // Deliberately does not touch updated_at — renaming a chat is not activity,
    // and bumping it would reshuffle the sidebar out from under the rename.
    // The user_id predicate is the ownership check: someone else's conversation
    // simply matches nothing, which falls through to the same 404 as a missing one.
    const rows = await query(
      `UPDATE conversations SET title = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, title, mode, created_at, updated_at`,
      [clean, conversationId, userId]
    );

    if (!rows.length) {
      return json(404, { error: "conversation not found" });
    }

    return json(200, { conversation: rows[0] });
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
