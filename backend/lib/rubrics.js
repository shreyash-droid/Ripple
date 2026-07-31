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

/* Every criterion is scored on the same scale so the frontend can render one
   meter and the session average means something across modes.

   0-100 rather than 0-5: a five-point scale collapses under its own coarseness —
   the model reaches for 3 and 4 for almost everything, so two genuinely different
   answers land on the same number and the session trend flatlines. A percentage
   is also the scale people already read scores in, so no legend is needed.
   Scorecards persisted under the old scale carry their own `max` and are rescaled
   on read by the frontend (web/src/lib/scoring.js). */
export const SCORE_MAX = 100;

/* Without anchors a 0-100 scale drifts: everything becomes an 85. These bands are
   stated in the prompt so the same work earns the same number across turns. */
const SCALE_ANCHORS =
  "- 90-100: exceptional. You would hold this up as the example.\n" +
  "- 75-89: strong. Minor polish left, nothing substantive.\n" +
  "- 60-74: solid but clearly improvable. The gap is nameable.\n" +
  "- 40-59: weak. A real deficiency a reviewer would stop on.\n" +
  "- 0-39: absent or misleading on this criterion.";

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
    // how the envelope describes a scorable turn, and what `next` should hold
    scorableWhen: "an answer to score",
    nextIs: "the next interview question to ask",
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
      "Score honestly. A generic answer with no numbers is a 45, not an 80 — inflated scores make " +
      "the session useless. Reserve the 90s for an answer you would pass to a hiring committee " +
      "unedited. Reference the user's own words in your notes so the feedback is clearly about " +
      "their answer.",
  },

  /* ---------------------------------------------------------------- *
   * Resume reviewer — score the resume, then name the first edit
   * ---------------------------------------------------------------- */
  /* The key stays `reviewer` even though the mode is now about resumes: it is
     the value persisted in conversations.mode, so renaming it would orphan every
     existing conversation. What the mode *is* lives in this object. */
  reviewer: {
    scored: true,
    subject: "resume",
    scorableWhen: "a resume, or a section of one, to review",
    nextIs: "the single highest-value edit to make first",
    labels: {
      strengths: "Working for you",
      improvements: "What to fix",
      next: "Change this first",
    },
    criteria: [
      {
        key: "impact",
        label: "Impact",
        hint: "Bullets state outcomes with numbers, scale or results — not the duties of the job",
      },
      {
        key: "relevance",
        label: "Relevance",
        hint: "Content is aimed at the target role; the skills and keywords a screener looks for are present and near the top",
      },
      {
        key: "clarity",
        label: "Clarity",
        hint: "Wording, structure and length a recruiter can scan in thirty seconds — strong verbs, no padding",
      },
      {
        key: "credibility",
        label: "Credibility",
        hint: "Specific and consistent — real titles, dates without unexplained gaps, claims a reference could confirm",
      },
    ],
    system:
      "You are a hiring manager and professional resume reviewer who has screened thousands of " +
      "resumes and knows what survives both an ATS filter and a six-second human scan.\n\n" +
      "Your workflow on every turn:\n" +
      "1. Decide whether the user's message actually contains resume content — a full resume, a " +
      "section, or even a handful of bullets.\n" +
      "2. If it does, score it against the rubric, list concrete findings (each one quoting the " +
      "exact bullet or line it is about), and name the single edit you would make first.\n" +
      "3. If it does not (they are asking how to phrase something, which format to use, or " +
      "following up on an earlier point), do not score. Answer the question directly.\n\n" +
      "If they name the role they are targeting, judge relevance against that role; if they have " +
      "not, say what you are assuming rather than scoring relevance blind.\n\n" +
      "Be specific over polite: \"'Responsible for the migration' names a duty, not a result\" beats " +
      "'consider adding more impact'. Where you flag a weak bullet, rewrite it — a stronger version " +
      "the user can paste in is worth more than a note telling them to write one. Do not invent " +
      "problems to fill the list: if a criterion is genuinely strong, score it high and say why.",
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
    `When the message IS ${workflow.scorableWhen}:\n` +
    "{\n" +
    '  "scored": true,\n' +
    '  "verdict": "one sentence summarising the overall quality",\n' +
    '  "criteria": {\n' +
    criteriaLines +
    "\n  },\n" +
    '  "strengths": ["1-3 short bullets, concrete"],\n' +
    '  "improvements": ["1-3 short bullets, each one actionable"],\n' +
    `  "next": "${workflow.nextIs}"\n` +
    "}\n\n" +
    "When it is NOT:\n" +
    '{ "scored": false, "reply": "your reply in markdown" }\n\n' +
    `Rubric — score each criterion 0-${SCORE_MAX}:\n` +
    workflow.criteria.map((c) => `- ${c.key} (${c.label}): ${c.hint}`).join("\n") +
    "\n\nWhat the numbers mean — use the whole range, and use these bands:\n" +
    SCALE_ANCHORS +
    "\nScore each criterion independently — strength on one does not carry the others. " +
    "Whole numbers only."
  );
}

/* What a scored mode is told on a turn that is NOT allowed to score.
 *
 * The envelope is not sent at all on these turns, so this replaces it rather
 * than qualifying it. Both sentences earn their place: without the first the
 * model re-reviews the resume it can still see in the history, and without the
 * second it answers the question and then volunteers a fresh set of scores in
 * prose — which is the same defect wearing a different format. */
export function followUpInstructions(workflow) {
  return (
    `The ${workflow.subject} in this conversation has already been reviewed and scored. ` +
    "Do not score it again, and do not produce another review, rubric or set of numbers " +
    "in any form.\n\n" +
    `Answer the user's question directly, using the ${workflow.subject} earlier in this ` +
    "conversation as your context. Be as specific as the review was — quote their own " +
    "lines back when it helps. Reply in markdown prose."
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
      // whole numbers: on a 0-100 scale a decimal place is false precision
      score: Math.max(0, Math.min(SCORE_MAX, Math.round(score))),
      note: typeof entry?.note === "string" ? entry.note.trim() : "",
    });
  }

  // One lone criterion is not a rubric; a card built from it would misreport the
  // session average, so fall back to treating the turn as unscored.
  if (criteria.length < 2) return null;

  const overall = criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length;

  return {
    max: SCORE_MAX,
    overall: Math.round(overall),
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
