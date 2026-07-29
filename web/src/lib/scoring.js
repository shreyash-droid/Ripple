/* Session scoring — derived state, never stored.
 *
 * Every scored turn carries its own scorecard on the message (messages.meta in
 * the database), so the session trend is a pure function of the thread. Nothing
 * here has to be kept in sync with anything: reopening a conversation replays its
 * history and the trend rebuilds itself, and a failed turn simply contributes
 * nothing instead of leaving a hole in a counter.
 */

/* The scale every score is shown on, matching SCORE_MAX in backend/lib/rubrics.js.
   Whole numbers throughout: out of 100, a decimal place is false precision. */
export const SCORE_SCALE = 100

const whole = (n) => Math.round(n)
const mean = (nums) => nums.reduce((sum, n) => sum + n, 0) / nums.length

/* Conversations scored before the scale moved to 0-100 carry cards with max: 5.
   Rescaling them on read is what keeps the UI honest about being "out of 100"
   everywhere — and, more importantly, stops a session average from being taken
   across two different scales, which would be a meaningless number. */
function toScale(card) {
  const from = Number(card.max) || SCORE_SCALE
  if (from === SCORE_SCALE) return card
  const up = (n) => whole((n / from) * SCORE_SCALE)
  return {
    ...card,
    max: SCORE_SCALE,
    overall: up(card.overall),
    criteria: card.criteria.map((c) => ({ ...c, score: up(c.score) })),
  }
}

/* jsonb comes back parsed from pg, but a message built optimistically in the
   client passes the scorecard straight through — accept either shape. */
function readScorecard(message) {
  const meta = typeof message?.meta === 'string' ? safeParse(message.meta) : message?.meta
  const card = message?.scorecard || meta?.scorecard
  return Array.isArray(card?.criteria) && card.criteria.length ? toScale(card) : null
}

function safeParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Scorecards in the thread, oldest first, paired with the message they came on. */
export function collectScorecards(messages) {
  const out = []
  for (const message of messages) {
    const scorecard = readScorecard(message)
    if (scorecard) out.push({ id: message.id, scorecard })
  }
  return out
}

/** Overall of the scored turn before `id`, so a card can show its own delta. */
export function previousOverall(scorecards, id) {
  const i = scorecards.findIndex((s) => s.id === id)
  return i > 0 ? scorecards[i - 1].scorecard.overall : null
}

/* Roll the session up into the numbers the trend strip shows. Returns null below
   one scored turn — a "session" of nothing has no trend to report. */
export function summarizeSession(scorecards) {
  if (!scorecards.length) return null

  const cards = scorecards.map((s) => s.scorecard)
  const trend = cards.map((c) => c.overall)
  // every card has been normalised to one scale by now, so the last one speaks
  // for all of them
  const max = cards[cards.length - 1].max || SCORE_SCALE

  /* Order by the newest card: if the rubric was reworded between turns, the
     criteria the user is being scored on *now* are the ones worth leading with.
     Older keys still appear, just after them. */
  const order = []
  const seen = new Set()
  for (const card of [...cards].reverse()) {
    for (const c of card.criteria) {
      if (!seen.has(c.key)) {
        seen.add(c.key)
        order.push({ key: c.key, label: c.label })
      }
    }
  }

  const criteria = order.map(({ key, label }) => {
    // a criterion only counts on the turns that actually scored it
    const scores = cards
      .map((card) => card.criteria.find((c) => c.key === key)?.score)
      .filter((n) => typeof n === 'number')
    return {
      key,
      label,
      average: whole(mean(scores)),
      latest: scores[scores.length - 1],
      delta: scores.length > 1 ? whole(scores[scores.length - 1] - scores[0]) : null,
    }
  })

  return {
    count: cards.length,
    max,
    trend,
    first: trend[0],
    latest: trend[trend.length - 1],
    best: whole(Math.max(...trend)),
    average: whole(mean(trend)),
    // improvement is only meaningful once there is something to improve on
    delta: trend.length > 1 ? whole(trend[trend.length - 1] - trend[0]) : null,
    criteria,
  }
}

/* Three bands, so a glance at the colour says as much as reading the number.
   Thresholds are fractions of max rather than absolutes so they survive a change
   to the scale. */
export function scoreTone(score, max = SCORE_SCALE) {
  const ratio = max ? score / max : 0
  if (ratio >= 0.7) return 'high'
  if (ratio >= 0.45) return 'mid'
  return 'low'
}

/** Signed, for delta chips: 12 → "+12". */
export function formatDelta(delta) {
  return `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(whole(delta))}`
}
