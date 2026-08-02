import { query } from "../lib/db.js";
import { generateTurn } from "../lib/llm.js";
import { requireAuth } from "../lib/auth.js";

/* What the model reads for a user turn, as against what the user actually said.
 *
 * These used to be the same string. The client folded the whole resume into the
 * message before sending it, so a turn that was really "does my summary earn
 * its space?" arrived — and was stored, and was rendered in the thread, and was
 * used as the conversation's title — as forty lines of resume with the question
 * buried under a "Context:" label at the bottom. The user's own words were the
 * one part of their message they could not see.
 *
 * Now the attachment travels in its own field. `content` is what the person
 * typed and is what gets persisted and displayed; the resume lives in the
 * message's `meta` and is folded back in here, on the way to the model only.
 *
 * This function is the single composer for that, and it is deliberately used
 * twice — once for the live turn and once per user row when history is rebuilt.
 * If the two ever diverged, the model would see the resume on the turn it
 * arrived and then lose it on the next question about it.
 */
function composeUserTurn(content, attachment) {
  if (!attachment?.text) return content;
  const head = `Here is my resume (${attachment.name}):\n\n${attachment.text}`;
  return content ? `${head}\n\n---\n\n${content}` : head;
}

/* A conversation's name in the sidebar. The user's own first words when there
   are any; otherwise the file they sent, because "Here is my resume (cv.pdf):"
   was never a title — it was the first forty characters of a wrapper. */
function titleFor(message, attachment) {
  if (message) return message.slice(0, 40);
  return attachment?.name ? `Resume — ${attachment.name}`.slice(0, 40) : "New chat";
}

export const handler = async (event) => {
  try {
    // 0. Authenticate. Throws AuthError(401) without a valid Bearer token.
    const { userId } = requireAuth(event);

    // The frontend sends JSON in the request body; parse it.
    const body = JSON.parse(event.body || "{}");
    /* `attachment` is `{ name, text }` when this turn submits a file, and absent
       otherwise. It used to be a boolean, because the resume had already been
       glued into `message` before it left the browser and the flag was the only
       way left to tell "here is my resume" from "about that bullet in my
       resume". Carrying the file in its own field means the distinction is the
       payload's shape rather than a claim about it. */
    const { message = "", mode = "general", attachment = null } = body;
    let { conversationId } = body;

    // What the person typed, kept apart from the file all the way through.
    const said = typeof message === "string" ? message.trim() : "";
    const file =
      attachment && typeof attachment.text === "string" && attachment.text.trim()
        ? { name: attachment.name || "resume", text: attachment.text }
        : null;
    // A conversation runs in exactly one mode. For a new chat that is whatever
    // the client asked for; for an existing one it is whatever the conversation
    // was created with, resolved below.
    let effectiveMode = mode;

    /* Either is enough on its own. Sending a resume with an empty box is the
       normal way to start a review — the composer invites exactly that — so
       requiring `message` would 400 the mode's main path now that the file is
       no longer smuggled inside it. */
    if (!said && !file) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "a message or an attachment is required" }),
      };
    }

    // 1. If no conversationId, this is a new chat — create the conversation,
    //    stamped with its owner so every later read can be scoped to them.
    if (!conversationId) {
      const created = await query(
        "INSERT INTO conversations (title, mode, user_id) VALUES ($1, $2, $3) RETURNING *",
        [titleFor(said, file), mode, userId]
      );
      conversationId = created[0].id;
    } else {
      // Continuing an existing chat: it has to be theirs. Without this check any
      // logged-in user could append to — and read the history of — someone else's
      // conversation by guessing its id.
      const owned = await query(
        `SELECT mode FROM conversations WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      );
      if (owned.length === 0) {
        return {
          statusCode: 404, // 404 not 403 — don't reveal that the conversation exists
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "conversation not found" }),
        };
      }
      /* The conversation's own mode wins over whatever the client sent. The UI
         starts a new chat on every mode switch, so the two normally agree — but
         a stale tab could otherwise score a coach turn against the resume rubric
         and land two incompatible scorecards in one session trend. */
      effectiveMode = owned[0].mode || mode;
    }

    // 2. Fetch recent history BEFORE saving the new message
    //    (so the current message isn't double-counted).
    const HISTORY_LIMIT = 10; // last 10 messages — tune as you like
    const historyRows = await query(
      `SELECT role, content, meta FROM messages
       WHERE conversation_id = $1
       ORDER BY id DESC
       LIMIT $2`,
      [conversationId, HISTORY_LIMIT]
    );
    /* Fetched newest-first for the LIMIT to work; reverse to chronological
       order, and fold each user turn's attachment back in on the way past. The
       resume is stored beside the message rather than inside it, so without
       this the model would read the file on the turn it arrived and then answer
       every follow-up question about a resume it could no longer see. */
    const history = historyRows.reverse().map((row) => ({
      role: row.role,
      content:
        row.role === "user"
          ? composeUserTurn(row.content, row.meta?.attachment)
          : row.content,
    }));

    /* 3. Save the user's new message — their words as the content, the file as
     *    metadata beside it.
     *
     * This is the split that fixes the thread: `content` is what gets rendered
     * in their bubble, returned by GET /messages, and used as the title, so it
     * is exactly what they typed and nothing else. The resume rides in `meta`
     * where the composer above can reach it and the UI can show a chip for it.
     */
    await query(
      `INSERT INTO messages (conversation_id, role, content, meta, user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        conversationId,
        "user",
        said,
        file ? JSON.stringify({ attachment: file }) : null,
        userId,
      ]
    );

    /* 4. Decide whether this turn is allowed to score.
     *
     * Reviewer only. Coach scores every answer because every answer is a new
     * attempt — that is the mode. A resume is not: it is submitted once and then
     * discussed, so re-scoring it on "how should I word the summary?" produced a
     * second card with a near-identical number, and a session trend that moved
     * without the resume having changed. Worse, the numbers did drift a little
     * turn to turn, which reads as progress the user did not make.
     *
     * A resume turn is one that submits a resume: the attachment turn, or the
     * first submission in the conversation, which is how a pasted resume arrives
     * (reviewer's composer invites either). After that the resume has a score,
     * and later turns answer questions about it — until a new file is attached,
     * which is a new resume and earns a new card.
     */
    let allowScore = true;
    if (effectiveMode === "reviewer" && !file) {
      /* `meta->'scorecard' IS NOT NULL` rather than the jsonb `?` operator: a
         bare ? in a query string is the placeholder syntax for half the drivers
         in the ecosystem, and this one is one migration away from being read by
         something that would rewrite it. */
      const scored = await query(
        `SELECT 1 FROM messages
         WHERE conversation_id = $1 AND role = 'assistant'
           AND meta->'scorecard' IS NOT NULL
         LIMIT 1`,
        [conversationId]
      );
      allowScore = scored.length === 0;
    }

    // 5. Run the mode's workflow. Evaluative modes (coach, reviewer) also return
    //    a scorecard; the rest return scorecard: null.
    const { reply, scorecard } = await generateTurn({
      mode: effectiveMode,
      // the composed form — the only place the resume text and the question are
      // one string is on the way into the model
      message: composeUserTurn(said, file),
      history,
      allowScore,
    });

    // 6. Save the assistant's reply, with the scorecard alongside it. It lives on
    //    the message rather than on the conversation so reopening a chat restores
    //    every card and the session trend rebuilds itself from history.
    const saved = await query(
      `INSERT INTO messages (conversation_id, role, content, meta, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        conversationId,
        "assistant",
        reply,
        scorecard ? JSON.stringify({ scorecard }) : null,
        userId,
      ]
    );

    // 7. Bump the conversation's updated_at so recent chats sort to top later.
    await query(
      "UPDATE conversations SET updated_at = now() WHERE id = $1",
      [conversationId]
    );

    // 8. Return everything the frontend needs.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        messageId: saved[0].id,
        // the mode the turn actually ran in, so a client whose pill drifted out
        // of step with the conversation can correct itself
        mode: effectiveMode,
        reply,
        scorecard,
      }),
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500, // AuthError -> 401; everything else 500
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
