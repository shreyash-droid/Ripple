import { query } from "../lib/db.js";

export const handler = async (event) => {
  try {
    const conversations = await query(
      `SELECT id, title, mode, created_at, updated_at
       FROM conversations
       ORDER BY updated_at DESC`
    );
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversations }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};