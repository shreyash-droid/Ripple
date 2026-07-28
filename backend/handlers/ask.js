import { retrieveChunks } from "../lib/retrieval.js";
import { generateReply } from "../lib/llm.js";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { question, documentId } = body;

    if (!question) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "question is required" }),
      };
    }

    // 1. Retrieve the most relevant chunks.
    const chunks = await retrieveChunks(question, 10, documentId || null);

    // 2. Build a context block from them.
    const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");

    // 3. Construct a prompt that grounds the answer in the context.
    const augmentedMessage = `Use the following context to answer the question. If the answer isn't in the context, say so.

Context:
${context}

Question: ${question}`;

    // 4. Generate the answer using your existing LLM module.
    const reply = await generateReply({
      mode: "general",
      message: augmentedMessage,
    });

    // 5. Return the answer plus which chunks were used (nice for debugging/UX).
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer: reply,
        sourcesUsed: chunks.map((c) => ({
          documentId: c.document_id,
          chunkIndex: c.chunk_index,
          distance: c.distance,
        })),
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