import { query } from "../lib/db.js";
import { generateReply } from "../lib/llm.js";

export const handler = async (event) => {
  try {
    // The frontend sends JSON in the request body; parse it.
    const body = JSON.parse(event.body || "{}");
    const { message, mode = "general" } = body;
    let { conversationId } = body;

    // Basic validation
    if (!message) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "message is required" }),
      };
    }

    // 1. If no conversationId, this is a new chat — create the conversation.
    if (!conversationId) {
      const created = await query(
        "INSERT INTO conversations (title, mode) VALUES ($1, $2) RETURNING *",
        [message.slice(0, 40), mode]  // use first 40 chars of message as the title
      );
      conversationId = created[0].id;
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
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
      [conversationId, "user", message]
    );

    // 4. Get the AI reply, passing prior history + the new message.
    const reply = await generateReply({ mode, message, history });

    // 5. Save the assistant's reply.
    await query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
      [conversationId, "assistant", reply]
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
      body: JSON.stringify({ conversationId, reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};