/* Mode workflows.
 *
 * A mode used to be a single system-prompt line. That made every mode the same
 * shape — you type, prose comes back — and the difference between "coach" and
 * "general" was tone alone. Here a mode is a *workflow*: a role, a set of steps
 * it runs every turn, and (for the evaluative modes) a rubric it has to score
 * the user against before it is allowed to move on.
 *
 * `scored: true` modes answer in a fixed JSON envelope instead of prose. The
 * backend then composes the visible markdown itself, so the shape of a turn is
 * deterministic even though the words are not — that is what makes it a
 * workflow rather than a hopeful prompt. The parsed scores travel to the
 * frontend as a scorecard and are persisted on the message, which is what lets
 * the session track improvement across turns.
 */

// Every criterion is scored on the same scale so the frontend can render one
// meter and the session average means something across modes.
export const SCORE_MAX = 5;

export const MODE_WORKFLOWS = {
  general: {
    scored: false,
    system:
      "You are a helpful, friendly assistant. Be direct and concrete. " +
      "Prefer a short answer that lands over a long one that hedges. " +
      "Use markdown only when structure genuinely helps.",
  },

  /* ---------------------------------------------------------------- *
   * Interview coach — score the answer, then raise the bar
   * ---------------------------------------------------------------- */
  coach: {
    scored: true,
    // what the rubric is judging, used in the prompt and in the UI card
    subject: "answer",
    labels: {
      strengths: "What worked",
      improvements: "What to tighten",
      next: "Next question",
    },
    criteria: [
      {
        key: "structure",
        label: "Structure",
        hint: "Situation, action and result arrive in an order a listener can follow",
      },
      {
        key: "specifics",
        label: "Specifics",
        hint: "Real detail — numbers, tools, timelines, names — not generalities",
      },
      {
        key: "impact",
        label: "Impact",
        hint: "A stated outcome, and why it mattered to the team or the business",
      },
      {
        key: "ownership",
        label: "Ownership",
        hint: "Clear on what the candidate did versus what the team did",
      },
    ],
    system:
      "You are a demanding but supportive interview coach running a practice session.\n\n" +
      "Your workflow on every turn:\n" +
      "1. Decide whether the user's message is an attempt at answering an interview question.\n" +
      "2. If it is, score it against the rubric, name what worked and what to tighten, then ask " +
      "the next question — harder if they scored well, a re-run of the same ground if they did not.\n" +
      "3. If it is not an answer (they are setting up the session, asking about the process, or " +
      "asking you to change the role or difficulty), do not score. Reply briefly and ask them " +
      "the first or next interview question so the session keeps moving.\n\n" +
      "Score honestly. A generic answer with no numbers is a 2, not a 4 — inflated scores make " +
      "the session useless. Reserve 5 for an answer you would pass to a hiring committee. " +
      "Reference the user's own words in your notes so the feedback is clearly about their answer.",
  },

  /* ---------------------------------------------------------------- *
   * Code reviewer — score the change, then name the first fix
   * ---------------------------------------------------------------- */
  reviewer: {
    scored: true,
    subject: "code",
    labels: {
      strengths: "Holds up well",
      improvements: "Findings",
      next: "Fix this first",
    },
    criteria: [
      {
        key: "correctness",
        label: "Correctness",
        hint: "The logic holds for the stated inputs and for the edge cases",
      },
      {
        key: "robustness",
        label: "Robustness",
        hint: "Errors, nulls, boundaries and concurrent access are handled",
      },
      {
        key: "clarity",
        label: "Clarity",
        hint: "Naming and structure a stranger could follow without the author",
      },
      {
        key: "efficiency",
        label: "Efficiency",
        hint: "Algorithmic and allocation cost are sane for the expected scale",
      },
    ],
    system:
      "You are a senior engineer reviewing code.\n\n" +
      "Your workflow on every turn:\n" +
      "1. Decide whether the user's message actually contains code or a described change to review.\n" +
      "2. If it does, score it against the rubric, list concrete findings (each one anchored to a " +
      "specific line, function or construct), and name the single fix you would make first.\n" +
      "3. If it does not (they are asking a general engineering question, or following up on an " +
      "earlier finding), do not score. Answer the question directly.\n\n" +
      "Be specific over polite: 'this loses the error' beats 'consider error handling'. " +
      "Do not invent problems to fill the list — if a criterion is genuinely clean, score it high " +
      "and say why. Quote the identifier you are talking about so the author can find it.",
  },

  /* ---------------------------------------------------------------- *
   * Document Q&A — answer only from the retrieved passages
   * ---------------------------------------------------------------- */
  /* No rubric here: this mode's workflow is retrieval, and its honesty signal is
     which passages the answer stood on, not a score. handlers/ask.js assembles
     the numbered context block this prompt refers to. */
  document: {
    scored: false,
    system:
      "You answer strictly from the numbered passages the user provides. Your workflow:\n" +
      "1. Answer the question using only those passages.\n" +
      "2. Cite the passages you used inline as [1], [2] — every claim traceable to one.\n" +
      "3. If the passages do not contain the answer, say so plainly and name what is missing. " +
      "Never fill the gap from your own knowledge, and never cite a passage you did not use.",
  },
};

/* The JSON contract for a scored mode. Built per-mode so the criteria keys in
   the prompt are exactly the ones we will read back. */
export function envelopeInstructions(workflow) {
  const criteriaLines = workflow.criteria
    .map((c) => `      "${c.key}": { "score": 0-${SCORE_MAX}, "note": "one sentence, specific to their ${workflow.subject}" }`)
    .join(",\n");

  return (
    "Reply with a single JSON object and nothing else.\n\n" +
    `When the message IS ${workflow.subject === "code" ? "code to review" : "an answer to score"}:\n` +
    "{\n" +
    '  "scored": true,\n' +
    '  "verdict": "one sentence summarising the overall quality",\n' +
    '  "criteria": {\n' +
    criteriaLines +
    "\n  },\n" +
    '  "strengths": ["1-3 short bullets, concrete"],\n' +
    '  "improvements": ["1-3 short bullets, each one actionable"],\n' +
    `  "next": "${workflow.subject === "code" ? "the single highest-value fix" : "the next interview question to ask"}"\n` +
    "}\n\n" +
    "When it is NOT:\n" +
    '{ "scored": false, "reply": "your reply in markdown" }\n\n' +
    "Rubric — score each criterion 0-" +
    SCORE_MAX +
    ":\n" +
    workflow.criteria.map((c) => `- ${c.key} (${c.label}): ${c.hint}`).join("\n")
  );
}

/* Trust nothing from the model: clamp the scores, drop keys we did not ask for,
   and attach the display label so a persisted scorecard stays readable even if
   the rubric is later reworded. Returns null when too little came back to be
   worth showing a card for. */
export function normaliseScorecard(workflow, parsed) {
  const raw = parsed?.criteria;
  if (!raw || typeof raw !== "object") return null;

  const criteria = [];
  for (const { key, label } of workflow.criteria) {
    const entry = raw[key];
    const score = Number(entry?.score ?? entry);
    if (!Number.isFinite(score)) continue; // criterion missing — leave it out
    criteria.push({
      key,
      label,
      score: Math.max(0, Math.min(SCORE_MAX, Math.round(score * 10) / 10)),
      note: typeof entry?.note === "string" ? entry.note.trim() : "",
    });
  }

  // One lone criterion is not a rubric; a card built from it would misreport the
  // session average, so fall back to treating the turn as unscored.
  if (criteria.length < 2) return null;

  const overall = criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length;

  return {
    max: SCORE_MAX,
    overall: Math.round(overall * 10) / 10,
    criteria,
    verdict: typeof parsed.verdict === "string" ? parsed.verdict.trim() : "",
  };
}

/* Compose the visible message from the structured fields, so every scored turn
   reads the same way regardless of how the model chose to phrase itself. The
   numbers are deliberately NOT repeated here — the frontend renders those as a
   card above this text, and printing them twice made the reply feel like a form. */
export function composeReply(workflow, parsed, scorecard) {
  const { labels } = workflow;
  const parts = [];

  if (scorecard?.verdict) parts.push(`**${scorecard.verdict}**`);

  const bullets = (items) =>
    (Array.isArray(items) ? items : [])
      .filter((s) => typeof s === "string" && s.trim())
      .map((s) => `- ${s.trim()}`)
      .join("\n");

  const strengths = bullets(parsed.strengths);
  if (strengths) parts.push(`**${labels.strengths}**\n${strengths}`);

  const improvements = bullets(parsed.improvements);
  if (improvements) parts.push(`**${labels.improvements}**\n${improvements}`);

  const next = typeof parsed.next === "string" ? parsed.next.trim() : "";
  if (next) parts.push(`---\n\n**${labels.next} —** ${next}`);

  return parts.join("\n\n");
}
