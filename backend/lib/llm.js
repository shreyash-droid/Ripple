import Groq from "groq-sdk";
import dotenv from "dotenv";
import {
  MODE_WORKFLOWS,
  composeReply,
  envelopeInstructions,
  followUpInstructions,
  normaliseScorecard,
} from "./rubrics.js";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile";

function workflowFor(mode) {
  return MODE_WORKFLOWS[mode] || MODE_WORKFLOWS.general;
}

// history is an array of { role, content } from earlier in the conversation.
async function complete({ system, message, history, json = false }) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    ...(json ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: system },
      ...history, // prior messages, in order
      { role: "user", content: message }, // the new message
    ],
  });

  return completion.choices[0].message.content;
}

/* Plain prose reply. Kept as its own export because handlers/ask.js drives
   document Q&A through it with an already-augmented message. */
export async function generateReply({ mode, message, history = [] }) {
  return complete({ system: workflowFor(mode).system, message, history });
}

/* One turn of a mode's workflow.
 *
 * For an evaluative mode this runs the model in JSON mode against the rubric
 * contract, then rebuilds the visible reply from the parsed fields — so the
 * turn always has the same shape and the scores are structured data rather than
 * numbers buried in prose.
 *
 * Returns { reply, scorecard }. `scorecard` is null whenever the turn was not
 * scoreable: an unscored mode, a turn the caller ruled out of scoring, a message
 * the model judged not to be an attempt (setting up the session, a follow-up
 * question), or a model reply that broke the contract. A null scorecard is a
 * normal outcome, not an error — the frontend simply shows no card for that turn.
 *
 * `allowScore: false` closes the door on scoring before the model is asked,
 * rather than asking it and discarding the answer. It matters that this is the
 * order: the envelope makes a score the expected output, and a model handed the
 * envelope produces one whether or not there is anything new to score.
 */
export async function generateTurn({ mode, message, history = [], allowScore = true }) {
  const workflow = workflowFor(mode);

  if (!workflow.scored) {
    const reply = await complete({ system: workflow.system, message, history });
    return { reply, scorecard: null };
  }

  if (!allowScore) {
    const reply = await complete({
      system: `${workflow.system}\n\n${followUpInstructions(workflow)}`,
      message,
      history,
    });
    return { reply, scorecard: null };
  }

  const system = `${workflow.system}\n\n${envelopeInstructions(workflow)}`;

  let parsed;
  try {
    parsed = JSON.parse(await complete({ system, message, history, json: true }));
  } catch {
    // The envelope did not come back as JSON. Losing the turn over a formatting
    // slip would be worse than losing the score, so re-ask in plain prose.
    const reply = await complete({ system: workflow.system, message, history });
    return { reply, scorecard: null };
  }

  if (parsed.scored === false) {
    return { reply: String(parsed.reply || "").trim(), scorecard: null };
  }

  const scorecard = normaliseScorecard(workflow, parsed);
  const reply = composeReply(workflow, parsed, scorecard);

  // Scores with no prose around them would render as a bare card; treat that as
  // a broken turn rather than shipping it.
  if (!reply) {
    const fallback = await complete({ system: workflow.system, message, history });
    return { reply: fallback, scorecard };
  }

  return { reply, scorecard };
}
