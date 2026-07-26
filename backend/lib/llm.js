import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODE_PROMPTS = {
  coach: "You are a supportive interview coach. Ask tough but fair behavioral questions and give constructive feedback.",
  reviewer: "You are a senior code reviewer. Point out bugs, style issues, and improvements clearly and concisely.",
  general: "You are a helpful, friendly assistant.",
};

// history is an array of { role, content } from earlier in the conversation.
export async function generateReply({ mode, message, history = [] }) {
  const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.general;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,                                  // prior messages, in order
      { role: "user", content: message },          // the new message
    ],
  });

  return completion.choices[0].message.content;
}