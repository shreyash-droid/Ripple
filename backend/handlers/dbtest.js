import { query } from "../lib/db.js";

export const handler = async (event) => {
  try {
    // 1. Insert a test conversation, returning the new row
    const inserted = await query(
      "INSERT INTO conversations (title, mode) VALUES ($1, $2) RETURNING *",
      ["DB test chat", "coach"]
    );

    // 2. Read all conversations back
    const all = await query("SELECT * FROM conversations ORDER BY id DESC");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Database connection works!",
        justInserted: inserted[0],
        totalConversations: all.length,
        allConversations: all,
      }),
    };
  } catch (err) {
    // If anything fails, return the real error so we can see it
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};