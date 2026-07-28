import { CohereClient } from "cohere-ai";
import dotenv from "dotenv";

dotenv.config();

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

// Embeds an array of texts, returns an array of vectors.
// inputType matters: "search_document" for chunks you store,
// "search_query" for the user's question at query time.
export async function embedTexts(texts, inputType = "search_document") {
  const response = await cohere.embed({
    texts,
    model: "embed-v4.0",
    inputType,
    embeddingTypes: ["float"],
  });
  return response.embeddings.float;
}

// Convenience for a single text.
export async function embedOne(text, inputType = "search_document") {
  const [vec] = await embedTexts([text], inputType);
  return vec;
}