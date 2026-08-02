import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ProfileBadge from '../components/ProfileBadge'
import { ResumeIcon, TargetIcon, TrendIcon } from '../components/Icons'
import { API_BASE, getProgress } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { formatDelta, scoreTone } from '../lib/scoring'
import { STRONG, daysSince, formatDay, summarizeProgress } from '../lib/progress'
import { modeConfig } from '../lib/modes'
import { displayName, initialsOf } from '../lib/session'
import '../styles/dashboard.css'

/* ══════════════════════════════════════════════════════════════════════════
 * THE DASHBOARD — the Operate world, built as an instrument panel
 *
 * WHAT IT REFUSES TO DO: show you a single number. Coach scores an interview
 * answer, the reviewer scores a resume, and the two rubrics have nothing to do
 * with each other — so there is no "your Ripple score", no cross-mode average,
 * and no leaderboard. Every score sits under the mode that produced it, and the
 * only figures that cross modes are counts.
 *
 * THE FORM: one masthead per mode, carrying exactly one dominant measurement —
 * the change since your first scored turn. That figure is the product's whole
 * claim ("you will be measured, and the number will move"), so it is the only
 * thing on the panel allowed to be large; everything under it steps down hard.
 * The first draft of this page gave eleven numbers the same weight inside cards
 * nested in cards, and read as a settings screen.
 *
 * Structure is carried by rules and mono addresses, the way the rest of the
 * product carries it. One card per mode and nothing bounded inside it — a
 * panel-in-a-panel is a container standing in for hierarchy.
 *
 * CHART RULES, from DESIGN.md's "Bands Are Data" rule: amber and red belong to
 * the scorecard, which is the product quoting its own artifact. Out here the
 * marks are monochrome and the one accent marks only what clears STRONG.
 * ══════════════════════════════════════════════════════════════════════════ */

const MODE_ICONS = { coach: TargetIcon, reviewer: ResumeIcon }

// What a scored turn is called in each mode, so the masthead caption reads as
// the thing that was actually measured rather than as "turns" everywhere.
const SUBJECT = { coach: 'answer', reviewer: 'review' }

/* Mono addresses for a mode's criteria, in the product's own `GEN` / `CO` /
   `RES` idiom. Two letters unless that collides inside this rubric, then three
   — a rubric that ever ships `clarity` and `closure` should not print `CL`
   twice and leave the reader matching rows by position. */
function addressesFor(criteria) {
  const used = new Set()
  return criteria.map((c) => {
    let n = 2
    let addr = c.key.slice(0, n).toUpperCase()
    while (used.has(addr) && n < c.key.length) {
      n += 1
      addr = c.key.slice(0, n).toUpperCase()
    }
    used.add(addr)
    return addr
  })
}

/* Width, measured rather than assumed.
 *
 * The chart is drawn at real pixel sizes instead of inside a scaled viewBox,
 * because every mark spec worth following is stated in pixels — a 2px line, an
 * 8px marker. Scale a viewBox to fit and all of them become "2px times whatever
 * the container happened to be", which is how a chart ends up with hairline
 * strokes on a phone and fat ones on a monitor. */
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}

/* ---------------------------------------------------------------- *
 * small parts
 * ---------------------------------------------------------------- */

/* The direction mark. Drawn rather than set as ▲, because the glyph is missing
   from JetBrains Mono and falls through to whatever the OS has — which lands a
   differently-weighted triangle beside the one figure the page is built on. */
function Dir({ dir, size = 9 }) {
  return (
    <svg className="h2c-dash__dir" width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
      <path d={dir === 'down' ? 'M1 3 L9 3 L5 9 Z' : 'M1 7 L9 7 L5 1 Z'} />
    </svg>
  )
}

/** Signed change, coloured by direction rather than by band. */
function Delta({ value, of }) {
  if (value == null) return null
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  return (
    <span className="h2c-dash__delta" data-dir={dir}>
      {dir !== 'flat' && <Dir dir={dir} />}
      {formatDelta(value)}
      {of && <em>{of}</em>}
    </span>
  )
}

/* One cell of a measurement rail. Not a tile: no border, no ground, no radius —
   the rail's dividers do the separating, so a row of these reads as one
   instrument with several readings rather than as a row of little cards. */
function Cell({ label, value, tone, hint }) {
  return (
    <div className="h2c-dash__cell">
      <span className="h2c-dash__cell-label">{label}</span>
      <span className="h2c-dash__cell-value" data-tone={tone}>
        {value}
      </span>
      {hint && <em>{hint}</em>}
    </div>
  )
}

/* ---------------------------------------------------------------- *
 * the trend chart
 * ---------------------------------------------------------------- */

/* Plot geometry. The container is sized to include the axis band rather than
   just the plot, so labels can never be the thing that overflows and earns the
   card a nested scrollbar. Tall on purpose: this chart is the evidence behind
   the masthead figure, and at 180px it was a sparkline pretending otherwise. */
const PLOT = { top: 28, right: 54, bottom: 34, left: 40, height: 300 }
const DOT = 4 // 8px marker
const HIT = 24 // minimum comfortable hit target, per point

/* One series, so no legend — the panel heading already says what is plotted.
 *
 * The line is de-emphasised and the accent is spent on exactly one thing: the
 * turns that cleared STRONG. That is the whole reading of the chart, and it is
 * why the marks are not coloured by score band — a three-colour ramp here would
 * double-encode height as hue and bury the only comparison that matters.
 */
function TrendChart({ points, max, label }) {
  const [wrapRef, width] = useWidth()
  const [active, setActive] = useState(null)

  const inner = Math.max(0, width - PLOT.left - PLOT.right)
  const plotH = PLOT.height - PLOT.top - PLOT.bottom

  const x = useCallback(
    (i) => PLOT.left + (points.length === 1 ? inner / 2 : (i / (points.length - 1)) * inner),
    [inner, points.length],
  )
  const y = useCallback((v) => PLOT.top + plotH - (v / max) * plotH, [max, plotH])

  /* Nearest point along x, rather than hit-testing the dots themselves: an 8px
     circle you have to land on dead centre is a pinpoint target, and the reader
     is pointing at a moment in the series, not at a disc. */
  const onMove = (e) => {
    if (!points.length || !inner) return
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    let best = 0
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i
    }
    setActive(Math.abs(x(best) - px) <= Math.max(HIT, inner / points.length) ? best : null)
  }

  if (!points.length) return null

  const last = points.length - 1
  const shown = active == null ? last : active
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.score)}`).join(' ')

  return (
    <div className="h2c-dash__plot" ref={wrapRef}>
      {width > 0 && (
        <svg
          width={width}
          height={PLOT.height}
          role="img"
          aria-label={label}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
        >
          {/* The instrument face. A tonal ground rather than an outline: the
              plot needs a body to read as a measured field, and a box drawn
              around it would be a card inside the panel. */}
          <rect
            className="h2c-dash__face"
            x={PLOT.left}
            y={y(max)}
            width={Math.max(0, width - PLOT.left - PLOT.right)}
            height={plotH}
          />

          {/* Solid hairlines, one step off the surface. Dashing a grid reads as
              "projection" when it is only a ruler. */}
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line
                className="h2c-dash__grid"
                x1={PLOT.left}
                y1={y(v)}
                x2={width - PLOT.right}
                y2={y(v)}
              />
              <text className="h2c-dash__tick" x={PLOT.left - 12} y={y(v) + 4} textAnchor="end">
                {v}
              </text>
            </g>
          ))}

          {/* The threshold, and the one line here allowed to be dashed — it is
              not chrome, it is the bar the model is held to. */}
          <line
            className="h2c-dash__thresh"
            x1={PLOT.left}
            y1={y(STRONG)}
            x2={width - PLOT.right}
            y2={y(STRONG)}
          />
          <text className="h2c-dash__thresh-label" x={width - PLOT.right + 8} y={y(STRONG) + 4}>
            {STRONG}
          </text>

          {points.length > 1 && <path className="h2c-dash__line" d={path} />}

          {points.map((p, i) => (
            <circle
              key={p.id}
              className="h2c-dash__dot"
              cx={x(i)}
              cy={y(p.score)}
              r={i === shown ? DOT + 1.5 : DOT}
              data-strong={p.score >= STRONG || undefined}
              data-on={i === shown || undefined}
            />
          ))}

          {/* One direct label, on the point being read — the endpoint at rest,
              whatever is hovered otherwise. A value beside every dot is chaos. */}
          <text
            className="h2c-dash__endlabel"
            x={Math.min(x(shown) + 12, width - PLOT.right + 4)}
            y={Math.max(y(points[shown].score) - 14, 14)}
          >
            {points[shown].score}
          </text>

          <text className="h2c-dash__axis" x={PLOT.left} y={PLOT.height - 10}>
            {formatDay(points[0].at)}
          </text>
          {points.length > 1 && (
            <text
              className="h2c-dash__axis"
              x={width - PLOT.right}
              y={PLOT.height - 10}
              textAnchor="end"
            >
              {formatDay(points[last].at)}
            </text>
          )}
        </svg>
      )}

      {/* Enhances, never gates: every one of these values is in the table view,
          and the endpoint is directly labelled on the chart itself. */}
      {active != null && (
        <div
          className="h2c-dash__tip"
          style={{ '--x': `${x(active)}px`, '--y': `${y(points[active].score)}px` }}
          aria-hidden="true"
        >
          <b>{points[active].score}</b>
          <span>
            turn {points[active].turn} · {formatDay(points[active].at)}
          </span>
          <span className="h2c-dash__tip-title">{points[active].title}</span>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- *
 * criterion averages
 * ---------------------------------------------------------------- */

/* A register, not a chart card: address, name, track, value, change — a rule
   under every row. One series, so one fill for every bar; colouring each bar
   darker-where-bigger would spend the only free channel on information the bar
   length already carries. The accent marks the criteria that cleared STRONG. */
function CriterionRows({ criteria, max }) {
  const addresses = addressesFor(criteria)

  return (
    <ul className="h2c-dash__rows">
      {criteria.map((c, i) => (
        <li key={c.key}>
          <span className="h2c-dash__addr">{addresses[i]}</span>
          <span className="h2c-dash__row-name">{c.label}</span>
          <span className="h2c-dash__track">
            <i
              style={{ '--fill': `${Math.max(0, Math.min(100, (c.average / max) * 100))}%` }}
              data-strong={c.average >= STRONG || undefined}
            />
          </span>
          <span className="h2c-dash__row-val">{c.average}</span>
          <Delta value={c.delta} />
        </li>
      ))}
    </ul>
  )
}

/* ---------------------------------------------------------------- *
 * sessions
 * ---------------------------------------------------------------- */

const SPARK = { w: 68, h: 20 }

function Sparkline({ trend, max }) {
  const y = (v) => SPARK.h - 3 - (v / max) * (SPARK.h - 6)
  const x = (i) => (trend.length === 1 ? SPARK.w / 2 : (i / (trend.length - 1)) * SPARK.w)
  const last = trend.length - 1

  return (
    <svg className="h2c-dash__spark" width={SPARK.w} height={SPARK.h} aria-hidden="true">
      {trend.length > 1 && <polyline points={trend.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />}
      <circle
        cx={x(last)}
        cy={y(trend[last])}
        r="2.6"
        data-strong={trend[last] >= STRONG || undefined}
      />
    </svg>
  )
}

/* The whole row is the link — a session is one thing, and giving it a separate
   "open" affordance makes the row look like a container for a button. */
function SessionRow({ session, max }) {
  return (
    <li className="h2c-dash__session">
      <a href={`#/c/${session.id}`}>
        <span className="h2c-dash__addr">{formatDay(session.startedAt)}</span>
        <span className="h2c-dash__row-name">{session.title}</span>
        <span className="h2c-dash__session-count">
          {session.count} {session.count === 1 ? 'turn' : 'turns'}
        </span>
        <Sparkline trend={session.trend} max={max} />
        <span className="h2c-dash__row-val" data-tone={scoreTone(session.latest, max)}>
          {session.latest}
        </span>
        <Delta value={session.delta} />
      </a>
    </li>
  )
}

/* ---------------------------------------------------------------- *
 * the table twin
 * ---------------------------------------------------------------- */

/* Every chart here has one. Not a fallback — the readable, selectable,
   screen-reader-navigable version of exactly the same numbers, which is what
   makes the tooltip an enhancement rather than the only way to read a value. */
function TurnTable({ points, max }) {
  return (
    <div className="h2c-dash__tablewrap">
      <table className="h2c-dash__table">
        <caption>Every scored turn, oldest first.</caption>
        <thead>
          <tr>
            <th scope="col">Turn</th>
            <th scope="col">Date</th>
            <th scope="col">Session</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.id}>
              <td>{p.turn}</td>
              <td>{formatDay(p.at)}</td>
              <td>
                <a href={`#/c/${p.conversationId}`}>{p.title}</a>
              </td>
              <td data-tone={scoreTone(p.score, max)}>
                {p.score}
                <span className="h2c-dash__outof">/{max}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------------------------------------------------------------- *
 * a mode's panel
 * ---------------------------------------------------------------- */

function ModePanel({ panel, max }) {
  const [table, setTable] = useState(false)
  const config = modeConfig(panel.mode)
  const Icon = MODE_ICONS[panel.mode] || TrendIcon
  const { overall } = panel
  const subject = SUBJECT[panel.mode] || 'turn'

  /* The one dominant figure, and what it is measuring.
   *
   * The delta is the product's claim, so it leads whenever it exists. On a
   * single scored turn there is no "since" yet — that turn IS the baseline —
   * so the figure becomes the score itself and says so, rather than printing a
   * ±0 that reads as "you did not improve" on someone's first ever attempt. */
  const lead =
    overall && overall.delta != null
      ? {
          value: formatDelta(overall.delta),
          dir: overall.delta > 0 ? 'up' : overall.delta < 0 ? 'down' : 'flat',
          caption: `since your first ${subject}`,
        }
      : overall
        ? {
            value: overall.latest,
            dir: 'flat',
            caption: `your first ${subject}, scored — this is the baseline`,
          }
        : null

  return (
    <section className="h2c-dash__panel" aria-label={`${config.label} progress`}>
      <header className="h2c-dash__masthead">
        <div className="h2c-dash__ident">
          <span className="h2c-dash__plate">
            <Icon size={14} />
            {config.label === 'Coach' ? 'CO' : 'RES'}
          </span>
          <div>
            <h2>{config.label}</h2>
            <p>{config.hint}</p>
          </div>
        </div>

        {lead && (
          <div className="h2c-dash__lead-figure" data-dir={lead.dir}>
            <b>
              {lead.dir !== 'flat' && <Dir dir={lead.dir} size={16} />}
              {lead.value}
            </b>
            <span>{lead.caption}</span>
          </div>
        )}
      </header>

      {!overall ? (
        <div className="h2c-dash__blank">
          <p>
            Nothing scored here yet. <a href="#/c">Start a session</a> in {config.label} and this
            panel fills in from your very first turn — that first score becomes the baseline
            everything after it is measured against.
          </p>
        </div>
      ) : (
        <>
          <div className="h2c-dash__rail">
            <Cell label="Latest" value={overall.latest} tone={scoreTone(overall.latest, max)} />
            <Cell label="Best" value={overall.best} tone={scoreTone(overall.best, max)} />
            <Cell label="Average" value={overall.average} hint={`of ${overall.count} scored`} />
            <Cell
              label={`Over ${STRONG}`}
              value={panel.strongTurns}
              hint={`of ${overall.count} · ${panel.sessions.length} session${
                panel.sessions.length === 1 ? '' : 's'
              }`}
            />
          </div>

          <div className="h2c-dash__block">
            <div className="h2c-dash__block-head">
              <h3>
                Every scored {subject}, in order
                <em>Evenly spaced — the axis is sequence, not time.</em>
              </h3>
              <button
                type="button"
                className="h2c-dash__toggle"
                onClick={() => setTable((v) => !v)}
                aria-pressed={table}
              >
                {table ? 'Chart' : 'Table'}
              </button>
            </div>

            {table ? (
              <TurnTable points={panel.timeline} max={max} />
            ) : (
              <TrendChart
                points={panel.timeline}
                max={max}
                label={`${config.label}: ${panel.timeline.length} scored turns, from ${overall.first} to ${overall.latest} out of ${max}.`}
              />
            )}
          </div>

          {overall.criteria.length > 0 && (
            <div className="h2c-dash__block">
              <div className="h2c-dash__block-head">
                <h3>
                  By criterion
                  <em>Average across every turn, and the change since your first.</em>
                </h3>
              </div>
              <CriterionRows criteria={overall.criteria} max={max} />
            </div>
          )}

          <div className="h2c-dash__block">
            <div className="h2c-dash__block-head">
              <h3>
                Sessions
                <em>Newest first. Open one to read the turn it came from.</em>
              </h3>
            </div>
            <ul className="h2c-dash__rows h2c-dash__sessions">
              {panel.sessions.map((s) => (
                <SessionRow key={s.id} session={s} max={max} />
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------- *
 * loading
 * ---------------------------------------------------------------- */

/* A skeleton of the real layout, not a spinner in the middle of the content.
   The shapes are the masthead, the rail and the plot, so the page does not
   change composition when the data lands — which is the entire point of a
   skeleton and the reason a centred spinner is worse than nothing. */
function Skeleton() {
  return (
    <div className="h2c-dash__skeleton" aria-hidden="true">
      {[0, 1].map((i) => (
        <section className="h2c-dash__panel" key={i}>
          <div className="h2c-dash__sk-mast">
            <i className="h2c-dash__sk" style={{ '--w': '120px', '--h': '38px' }} />
            <i className="h2c-dash__sk" style={{ '--w': '150px', '--h': '46px' }} />
          </div>
          <div className="h2c-dash__sk-rail">
            {[0, 1, 2, 3].map((n) => (
              <i className="h2c-dash__sk" key={n} style={{ '--w': '70%', '--h': '34px' }} />
            ))}
          </div>
          <i className="h2c-dash__sk" style={{ '--w': '100%', '--h': '300px' }} />
        </section>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- *
 * failure
 * ---------------------------------------------------------------- */

/* What went wrong, said usefully.
 *
 * This page is served by an endpoint that ships separately from it — the client
 * is a static bundle, the API is a Lambda behind API Gateway — so the failure
 * that actually happens is a frontend deployed against a backend that has not
 * been. "Request failed (404)" sends whoever hits that reading the dashboard's
 * own source; naming the route and the base URL puts them one command from the
 * fix. A blocked CORS preflight surfaces as a rejected fetch with no status at
 * all, indistinguishable from being offline, so that case says both things it
 * could be rather than picking one confidently. */
function explain(err) {
  const message = err?.message || 'Something went wrong.'

  if (/\(404\)/.test(message)) {
    return {
      headline: 'This build of the API does not have the progress endpoint.',
      detail: `GET /api/progress answered 404 at ${API_BASE || 'the local proxy'}. Deploy the backend (it is defined in backend/serverless.yml), or point VITE_API_BASE at an API that has it.`,
    }
  }

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return {
      headline: 'Could not reach the API.',
      detail: `No response from ${API_BASE || 'the local proxy'} — the backend is down, or it answered without the CORS headers the browser needs.`,
    }
  }

  return { headline: 'Could not load your progress.', detail: message }
}

/* ---------------------------------------------------------------- *
 * the page
 * ---------------------------------------------------------------- */

export default function Dashboard() {
  const { user, signedIn } = useAuth()
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  // bumped by Retry; the fetch effect keys off it so a transient failure does
  // not cost a reload of the whole surface
  const [attempt, setAttempt] = useState(0)

  /* One read, on arrival. `signedIn` is the dependency rather than nothing at
     all because signing out and back in as someone else has to fetch the new
     person's history — and because the effect must not fire for an anonymous
     visitor, who would only spend a 401 that the unauthorized handler reads as
     an expired session. */
  useEffect(() => {
    if (!signedIn) return undefined
    let cancelled = false

    getProgress()
      .then((payload) => {
        if (!cancelled) setState({ status: 'ready', data: summarizeProgress(payload), error: null })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', data: null, error: explain(err) })
      })

    return () => {
      cancelled = true
    }
  }, [signedIn, attempt])

  /* Same derivation the chat shell uses, from the same helpers — the avatar in
     this rail and the one in the sidebar have to be the same person. */
  const identity = useMemo(
    () => ({
      name: displayName(user),
      initials: initialsOf(user),
      email: user?.email || '',
      avatar: user?.avatar_url || '',
    }),
    [user],
  )

  const data = state.data
  const joined = data?.joinedAt
  const days = daysSince(joined)

  return (
    <div className="h2c-dash">
      <header className="h2c-dash__bar">
        <a className="h2c-brand h2c-brand--home" href="#/" title="How it works">
          <div className="h2c-orb" />
          <span className="h2c-brand__name">Ripple</span>
        </a>
        <nav className="h2c-dash__nav" aria-label="Dashboard">
          <a className="h2c-navcmd" href="#/c">
            <span>Back to chat</span>
          </a>
        </nav>
        <ProfileBadge user={identity} />
      </header>

      <main className="h2c-dash__body">
        <div className="h2c-dash__lead">
          <p className="h2c-dash__kicker">
            <TrendIcon size={12} />
            Your progress
          </p>
          <h1>What has actually moved.</h1>
          <p className="h2c-dash__lede">
            Scored turn by scored turn, per mode — because a coach score and a resume score
            measure different things, and averaging them would mean nothing.
          </p>

          {data?.any && (
            <div className="h2c-dash__rail h2c-dash__rail--top">
              <Cell label="Scored turns" value={data.totals.scoredTurns} />
              <Cell label="Sessions" value={data.totals.sessions} />
              <Cell
                label="Days on Ripple"
                value={days ?? '—'}
                hint={joined ? `since ${formatDay(joined)}` : undefined}
              />
            </div>
          )}
        </div>

        {state.status === 'loading' && <Skeleton />}

        {state.status === 'error' && state.error && (
          <div className="h2c-dash__fail" role="alert">
            <h2>{state.error.headline}</h2>
            <p>{state.error.detail}</p>
            <button
              type="button"
              className="h2c-dash__toggle"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {data &&
          (!data.any ? (
            <div className="h2c-dash__empty">
              <h2>Nothing to track yet.</h2>
              <p>
                This fills in from your first scored turn. Coach and Resume Review are the two
                modes that score you — the other two answer, they do not assess.
              </p>
              <a className="h2c-dash__cta" href="#/c">
                Start a scored session
              </a>
            </div>
          ) : (
            <>
              {data.truncated && (
                <p className="h2c-dash__note">Showing your most recent 600 scored turns.</p>
              )}
              {data.panels.map((panel) => (
                <ModePanel key={panel.mode} panel={panel} max={data.max} />
              ))}
            </>
          ))}
      </main>
    </div>
  )
}
