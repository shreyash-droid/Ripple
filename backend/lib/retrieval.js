import { query } from "./db.js";
import { embedOne } from "./embeddings.js";

// Given a question, find the most similar chunks BELONGING TO THIS USER.
//
// userId is required, not optional: every retrieval is scoped to one user. The
// chunks table has no user_id of its own, so we join through to documents (which
// now carries user_id) and filter there. This is the wall that stops one user's
// question from ever retrieving another user's document chunks.
export async function retrieveChunks(question, userId, limit = 10, documentId = null) {
  if (!userId) {
    // Guard against a caller forgetting to pass it — without this a bug upstream
    // could silently reintroduce the cross-user leak.
    throw new Error("retrieveChunks requires a userId");
  }

  // 1. Embed the question — note "search_query" input type.
  const qVector = await embedOne(question, "search_query");
  const vectorLiteral = `[${qVector.join(",")}]`;

  // 2. Similarity search, joined to documents so we can filter by owner.
  //    The <=> operator is pgvector's cosine distance — smaller = more similar.
  let sql = `
    SELECT c.content, c.document_id, c.chunk_index,
           c.embedding <=> $1 AS distance
    FROM document_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE d.user_id = $2
  `;
  const params = [vectorLiteral, userId];

  // Optional narrowing to a single document — layered on top of the user filter,
  // so it can only ever match a document the user already owns.
  if (documentId) {
    sql += ` AND c.document_id = $3`;
    params.push(documentId);
  }

  sql += ` ORDER BY distance ASC LIMIT ${limit}`;

  return query(sql, params);
}