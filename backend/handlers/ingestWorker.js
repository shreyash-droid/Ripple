import { query } from "../lib/db.js";
import { embedTexts } from "../lib/embeddings.js";
import { chunkText } from "../lib/chunk.js";

export const handler = async (event) => {
  for (const record of event.Records) {
    let documentId;
    try {
      ({ documentId } = JSON.parse(record.body));

      // Load the staged text and current status.
      const rows = await query(
        "SELECT status, raw_text FROM documents WHERE id = $1",
        [documentId]
      );
      const doc = rows[0];
      if (!doc) throw new Error(`Document ${documentId} not found`);

      // Duplicate delivery after a prior success — SQS is at-least-once. No-op.
      if (doc.status === "ready") continue;

      const text = doc.raw_text;
      if (!text) throw new Error(`No raw_text for document ${documentId}`);

      // Idempotency: a job can run more than once, so clear old chunks first.
      await query("DELETE FROM document_chunks WHERE document_id = $1", [documentId]);

      // The slow part — chunk + embed + store (identical to your old ingest).
      const chunks = chunkText(text);
      const vectors = await embedTexts(chunks, "search_document");

      for (let i = 0; i < chunks.length; i++) {
        const vectorLiteral = `[${vectors[i].join(",")}]`;
        await query(
          `INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
           VALUES ($1, $2, $3, $4)`,
          [documentId, i, chunks[i], vectorLiteral]
        );
      }

      // Flip processing -> ready, clear any stale error, free the staged text.
      await query(
        "UPDATE documents SET status = 'ready', error = NULL, raw_text = NULL WHERE id = $1",
        [documentId]
      );
    } catch (err) {
      console.error("worker failed", documentId, err);
      if (documentId) {
        await query(
          "UPDATE documents SET status = 'failed', error = $2 WHERE id = $1",
          [documentId, err.message]
        );
      }
      throw err; // rethrow -> SQS retries -> DLQ after 3 attempts
    }
  }
};