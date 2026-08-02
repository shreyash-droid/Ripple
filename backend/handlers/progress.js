import { query } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";
import { MODE_WORKFLOWS } from "../lib/rubrics.js";

/* GET /api/progress — everything the dashboard tracks, in one round trip.
 *
 * The dashboard is "have I got better since I arrived", so the unit is the
 * scored *turn* rather than the conversation: a session's whole story is the
 * sequence of cards inside it, and the platform-level story is those sequences
 * laid end to end. Both are the same rows, grouped differently, so this returns
 * the rows once and lets the client do the two foldings (web/src/lib/progress.js).
 *
 * Deliberately not aggregated in SQL. AVG() over `meta->'scorecard'->>'overall'`
 * would have to cast text to numeric per row and, worse, would average across
 * cards written under the old 0-5 scale together with 0-100 ones — the rescaling
 * lives in web/src/lib/scoring.js and there is exactly one copy of it. Sending
 * the cards up whole is what keeps that true.
 */

// The modes with a rubric. Derived rather than typed out: a fifth mode that
// declares `scored` should appear on the dashboard without anyone remembering
// to edit this file, and a mode that loses its rubric should drop off it.
const SCORED_MODES = Object.entries(MODE_WORKFLOWS)
  .filter(([, workflow]) => workflow.scored)
  .map(([mode]) => mode);

/* A ceiling on how much history one response carries. A user with thousands of
   scored turns does not need every one of them to see a trend, and an unbounded
   SELECT here is a slow query and a large payload on the one screen that has to
   feel instant. Ordered so the cut falls on the *oldest* rows and the recent
   history — the part a progress view is actually about — always survives. */
const MAX_CARDS = 600;

export const handler = async (event) => {
  try {
    // 0. Authenticate. Throws AuthError(401) without a valid Bearer token.
    const { userId } = requireAuth(event);

    /* Two queries rather than one join carrying the user's row on every card:
       "when did I join" is a single scalar and joining it onto 600 rows to read
       it once is wasted bytes both ways. */
    const [account] = await query(
      `SELECT created_at FROM users WHERE id = $1`,
      [userId]
    );

    /* Scoped to the caller through messages.user_id AND through the parent
       conversation — the denormalised column is there precisely so a dropped
       predicate cannot cross tenants, and using both means neither one is
       load-bearing on its own.

       `meta -> 'scorecard' IS NOT NULL` rather than the `?` existence operator:
       `?` is a placeholder character to more than one Postgres driver and
       pooler, and the two spellings mean the same thing here. */
    const rows = await query(
      `SELECT m.id,
              m.meta,
              m.created_at,
              c.id         AS conversation_id,
              c.title      AS conversation_title,
              c.mode       AS mode,
              c.created_at AS conversation_created_at
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
        WHERE m.user_id = $1
          AND c.user_id = $1
          AND c.mode = ANY($2::text[])
          AND m.meta -> 'scorecard' IS NOT NULL
        ORDER BY m.id DESC
        LIMIT $3`,
      [userId, SCORED_MODES, MAX_CARDS]
    );

    /* The LIMIT had to take the newest rows, but a trend reads forwards. Undo
       the ordering the cut needed, so the client receives history in the
       direction it happened and never has to know a window was applied. */
    const cards = rows.reverse().map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      title: row.conversation_title,
      mode: row.mode,
      // the whole card, unrescaled — scoring.js normalises `max` on read
      scorecard: row.meta.scorecard,
      createdAt: row.created_at,
      conversationCreatedAt: row.conversation_created_at,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // The "since you arrived" baseline every delta on the dashboard is read
        // against. Null is impossible for an authenticated caller, but the
        // client renders a dash rather than "Invalid Date" if it ever is.
        joinedAt: account?.created_at ?? null,
        modes: SCORED_MODES,
        // true when history was cut, so the client can say "last 600" rather
        // than quietly showing a partial trend as though it were the whole one
        truncated: rows.length === MAX_CARDS,
        cards,
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
