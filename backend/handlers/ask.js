import { retrieveChunks } from "../lib/retrieval.js";
import { generateReply } from "../lib/llm.js";
import { query } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";

// How many of the retrieved passages to report back as citations. All 10 go into
// the context, but a citation list that long stops being readable — and the tail
// of a similarity search is usually noise the model never leaned on.
const CITED = 4;

export const handler = async (event) => {
  try {
    // 0. Authenticate. Throws AuthError(401) if there's no valid Bearer token.
    const { userId } = requireAuth(event);

    const body = JSON.parse(event.body || "{}");
    const { question, documentId } = body;

    if (!question) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "question is required" }),
      };
    }

    // 0b. If the caller names a document, it has to be theirs. Without this check
    //     any logged-in user could read any document by guessing its id — the
    //     auth token alone doesn't scope *what* you can see, only *that* you're in.
    if (documentId) {
      const owned = await query(
        `SELECT 1 FROM documents WHERE id = $1 AND user_id = $2`,
        [documentId, userId]
      );
      if (owned.length === 0) {
        return {
          statusCode: 404, // 404 not 403 — don't reveal that the doc exists at all
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Document not found" }),
        };
      }
    }

    // 1. Retrieve the most relevant chunks.
    // 1. Retrieve the most relevant chunks — scoped to this user.
    const chunks = await retrieveChunks(question, userId, 10, documentId || null);

    // 2. Build a numbered context block. The numbering is load-bearing: the
    //    document workflow prompt cites these markers, and the frontend maps them
    //    back onto the sources it lists under the answer.
    const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");

    // 3. Ground the question in that context.
    const augmentedMessage = `Passages:\n${context}\n\nQuestion: ${question}`;

    // 4. Answer it under the document mode's retrieval workflow.
    const reply = await generateReply({
      mode: "document",
      message: augmentedMessage,
    });

    // 5. Return the answer plus the passages it stood on. The excerpt is what
    //    makes a citation checkable rather than decorative.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer: reply,
        sourcesUsed: chunks.slice(0, CITED).map((c, i) => ({
          marker: i + 1,
          documentId: c.document_id,
          chunkIndex: c.chunk_index,
          distance: c.distance,
          // pgvector's <=> is cosine distance, so this reads as a 0-1 match score
          relevance: Math.max(0, Math.min(1, 1 - Number(c.distance))),
          excerpt: excerpt(c.content),
        })),
      }),
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500, // AuthError carries 401; everything else 500
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// Enough of the passage to recognise it, cut on a word boundary.
function excerpt(text, limit = 220) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}