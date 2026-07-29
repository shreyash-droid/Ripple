import { query } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({});

export const handler = async (event) => {
  try {
    // 0. Authenticate. Throws AuthError(401) without a valid Bearer token.
    const { userId } = requireAuth(event);

    const body = JSON.parse(event.body || "{}");
    const { text, filename = "untitled" } = body;

    if (!text) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "text is required" }),
      };
    }

    // 1. Create the row in `processing`, stamped with its owner so the document —
    //    and every chunk the worker derives from it — belongs to this user.
    const docRows = await query(
      "INSERT INTO documents (filename, status, raw_text, user_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [filename, "processing", text, userId]
    );
    const documentId = docRows[0].id;

    // 2. Drop a job on the queue — just the id; the worker reads text from the DB.
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.INGEST_QUEUE_URL,
        MessageBody: JSON.stringify({ documentId }),
      })
    );

    // 3. Return immediately — no embedding on this path, so we never hit the 30s cap.
    return {
      statusCode: 202,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, filename, status: "processing" }),
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500, // AuthError -> 401; everything else 500
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};