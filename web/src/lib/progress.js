/* The dashboard's fold — every scored turn, grouped the two ways it gets read.
 *
 * The backend sends cards whole and in order and does no arithmetic (see
 * handlers/progress.js for why). Everything the dashboard shows is derived
 * here, on top of lib/scoring.js, so there is exactly one implementation of the
 * 0-5 → 0-100 rescaling and exactly one definition of a session summary — the
 * one the chat's own trend strip already uses.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: scores from different modes are never
 * combined. Coach scores an answer against four interview criteria; the
 * reviewer scores a resume against four hiring criteria. An average across the
 * two measures nothing, and a single "your score" figure on a dashboard is
 * exactly the kind of number that looks authoritative and means nothing. So the
 * fold is per mode all the way down, and the only cross-mode figures are counts
 * — sessions, scored turns, days — which are the same unit whatever produced
 * them.
 */

import { collectScorecards, summarizeSession, SCORE_SCALE } from './scoring'

/* Where the scoring prompt's own band anchors start calling an answer strong.
   The same 75 the landing page's trend chart is measured against and the same
   line backend/lib/rubrics.js states in SCALE_ANCHORS — the dashboard would be
   drawing a threshold the model is not held to if these ever drifted apart. */
export const STRONG = 75

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Whole days from `iso` to now, floored at 0. Null for a missing date. */
export function daysSince(iso) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return Math.max(0, Math.floor((Date.now() - then) / MS_PER_DAY))
}

/* Short and absolute — "12 Mar", "12 Mar 2024" once it is not this year.
   Deliberately never relative: "3 months ago" on a progress view forces the
   reader to do date arithmetic to compare two sessions, which is the one thing
   the axis of a trend is supposed to do for them. */
export function formatDay(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? null : { year: 'numeric' }),
  })
}

/* One session's own arc. `summarizeSession` already knows how to roll a thread
   of cards into count/first/latest/best/average/delta, so a session here is
   that same summary plus the identity needed to link back to the thread. */
function foldSession(cards) {
  const head = cards[0]
  const summary = summarizeSession(collectScorecards(cards))

  return {
    id: head.conversationId,
    title: head.title,
    mode: head.mode,
    startedAt: head.conversationCreatedAt || head.createdAt,
    lastScoredAt: cards[cards.length - 1].createdAt,
    ...summary,
  }
}

/* One mode's panel.
 *
 * `overall` is the mode's whole history folded as though it were a single long
 * session, which is precisely what "progress since you joined" means: the first
 * card is the baseline, the latest is where you are, and the per-criterion
 * deltas say which part of the rubric moved. The per-session rollup underneath
 * it is the same data cut by sitting, so a reader can see whether a good
 * average came from one strong day or from steady work.
 */
function foldMode(mode, cards) {
  const timeline = collectScorecards(cards).map(({ scorecard }, i) => ({
    // the card's own message id, so a point is addressable and React-keyable
    id: cards[i].id,
    conversationId: cards[i].conversationId,
    title: cards[i].title,
    at: cards[i].createdAt,
    score: scorecard.overall,
    turn: i + 1,
  }))

  // group by conversation, keeping first-seen order — the query is already
  // oldest-first, so insertion order is chronological with no second sort
  const byConversation = new Map()
  for (const card of cards) {
    const bucket = byConversation.get(card.conversationId)
    if (bucket) bucket.push(card)
    else byConversation.set(card.conversationId, [card])
  }

  const sessions = [...byConversation.values()].map(foldSession)

  return {
    mode,
    overall: summarizeSession(collectScorecards(cards)),
    timeline,
    /* Newest first. The list is a history, and a history is read from where you
       are now backwards — the chart above it is the one that runs forwards. */
    sessions: sessions.reverse(),
    /* How many turns cleared the bar the model itself calls strong. The one
       figure on the panel that is about the rubric rather than about the user's
       own baseline, which is what makes it worth showing beside the deltas. */
    strongTurns: timeline.filter((p) => p.score >= STRONG).length,
  }
}

/**
 * The whole dashboard, from one /api/progress response.
 *
 * `modes` arrives from the server so a mode that gains or loses a rubric shows
 * up here without a second list to keep in step. Modes with no scored turns yet
 * still get a panel — an empty panel says "nothing here yet, here is the way
 * in", where a missing one just looks like the feature is broken.
 */
export function summarizeProgress(payload) {
  const cards = payload?.cards ?? []
  const modes = payload?.modes ?? []

  const byMode = new Map(modes.map((mode) => [mode, []]))
  for (const card of cards) {
    // a card whose mode the server did not advertise is not something to guess
    // about — it is dropped rather than filed under a panel it does not belong to
    byMode.get(card.mode)?.push(card)
  }

  const panels = [...byMode.entries()].map(([mode, modeCards]) =>
    modeCards.length ? foldMode(mode, modeCards) : { mode, overall: null, timeline: [], sessions: [], strongTurns: 0 },
  )

  /* Counted off the panels, not off `cards`. Those two differ by exactly the
     rows the loop above declined to file — a card in a mode the server did not
     advertise — and totalling the raw list would report turns that appear on no
     panel, so the header would say six where the page shows five. */
  const filed = panels.flatMap((p) => p.timeline)

  return {
    joinedAt: payload?.joinedAt ?? null,
    daysIn: daysSince(payload?.joinedAt),
    truncated: Boolean(payload?.truncated),
    max: SCORE_SCALE,
    panels,
    /* Cross-mode figures, and the only ones there will ever be: counts, not
       scores. See the rule at the top of this file. */
    totals: {
      scoredTurns: filed.length,
      sessions: panels.reduce((n, p) => n + p.sessions.length, 0),
      modesPractised: panels.filter((p) => p.timeline.length).length,
    },
    // whether there is anything at all to draw, which decides page vs empty state
    any: filed.length > 0,
  }
}
