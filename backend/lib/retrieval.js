import { query } from "./db.js";
import { embedOne } from "./embeddings.js";

// Given a question, find the most similar chunks.
export async function retrieveChunks(question, limit = 10, documentId = null) {
  // 1. Embed the question — note "search_query" input type.
  const qVector = await embedOne(question, "search_query");
  const vectorLiteral = `[${qVector.join(",")}]`;

  // 2. Similarity search. The <=> operator is pgvector's cosine distance.
  //    Smaller distance = more similar, so we ORDER BY it ascending.
  let sql = `
    SELECT content, document_id, chunk_index,
           embedding <=> $1 AS distance
    FROM document_chunks
  `;
  const params = [vectorLiteral];

  if (documentId) {
    sql += ` WHERE document_id = $2`;
    params.push(documentId);
  }

  sql += ` ORDER BY distance ASC LIMIT ${limit}`;

  return query(sql, params);
}