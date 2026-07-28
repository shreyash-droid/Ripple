import { embedOne } from "../lib/embeddings.js";

export const handler = async (event) => {
  try {
    const vector = await embedOne("hello world");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dimension: vector.length,      // THIS is the number we need
        sample: vector.slice(0, 5),    // first 5 values, just to see it
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