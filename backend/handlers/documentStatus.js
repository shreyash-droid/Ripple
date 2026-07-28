import { query } from "../lib/db.js";

export const handler = async (event) => {
  try {
    const documentId = event.pathParameters?.id;
    if (!documentId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "id is required" }),
      };
    }

    const rows = await query(
      "SELECT id, filename, status, error FROM documents WHERE id = $1",
      [documentId]
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
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};