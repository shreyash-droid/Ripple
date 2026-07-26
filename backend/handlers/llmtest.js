import { generateReply } from "../lib/llm.js";

export const handler = async (event) => {
  try {
    const reply = await generateReply({
      mode: "general",
      message: "Say hello in one short sentence.",
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};