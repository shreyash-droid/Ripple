import { query } from "../lib/db.js";

export const handler = async (event) => {
  try {
    // The conversation id comes from the URL path, e.g. /api/conversations/5/messages
    const conversationId = event.pathParameters?.id;

    if (!conversationId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "conversation id is required" }),
      };
    }

    const messages = await query(
      `SELECT id, role, content, created_at
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
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};