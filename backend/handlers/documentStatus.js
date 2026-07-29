import { query } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";

export const handler = async (event) => {
  try {
    // 0. Authenticate. Throws AuthError(401) without a valid Bearer token.
    const { userId } = requireAuth(event);

    const documentId = event.pathParameters?.id;
    if (!documentId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "id is required" }),
      };
    }

    // Scoped to the owner — `error` can carry parse detail from the source file,
    // so polling someone else's id has to look exactly like polling a missing one.
    const rows = await query(
      "SELECT id, filename, status, error FROM documents WHERE id = $1 AND user_id = $2",
      [documentId, userId]
    );
    if (rows.length === 0) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "document not found" }),
      };
    }

    const doc = rows[0];
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.id,
        filename: doc.filename,
        status: doc.status,
        error: doc.error,
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