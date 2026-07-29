import { TrendIcon } from './Icons'
import { formatDelta, scoreTone } from '../lib/scoring'

const SPARK_H = 24
const SPARK_STEP = 15
const SPARK_MIN_W = 60

/* Overall score per scored turn. Small on purpose — it answers "am I going up?"
   and nothing else; the per-criterion averages beside it carry the detail. */
function Sparkline({ points, max }) {
  const width = Math.max(SPARK_MIN_W, (points.length - 1) * SPARK_STEP)
  const y = (v) => SPARK_H - 3 - (v / max) * (SPARK_H - 6)
  const x = (i) => (points.length === 1 ? width / 2 : (i / (points.length - 1)) * width)
  const last = points.length - 1

  return (
    <svg
      className="h2c-session__spark"
      width={width}
      height={SPARK_H}
      viewBox={`0 0 ${width} ${SPARK_H}`}
      aria-hidden="true"
    >
      {points.length > 1 && (
        <polyline points={points.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      )}
      {points.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 2.6 : 1.6} data-last={i === last} />
      ))}
    </svg>
  )
}

/* The session tracker: a strip above the thread that turns a pile of individual
   scores into a direction of travel. Rendered only once something has been
   scored, so an ordinary chat never carries evaluation chrome it has no use for. */
export default function SessionProgress({ summary, subject = 'scored' }) {
  const { count, max, average, latest, best, delta, trend, criteria } = summary

  return (
    <section className="h2c-session" aria-label="Session progress">
      <div className="h2c-session__main">
        <span className="h2c-session__badge">
          <TrendIcon size={12} />
          Session
        </span>

        <Sparkline points={trend} max={max} />

        <dl className="h2c-session__stats">
          <div>
            <dt>{subject}</dt>
            <dd>{count}</dd>
          </div>
          <div>
            <dt>latest</dt>
            <dd data-tone={scoreTone(latest, max)}>{Math.round(latest)}</dd>
          </div>
          <div>
            <dt>average</dt>
            <dd>{Math.round(average)}</dd>
          </div>
          <div>
            <dt>best</dt>
            <dd>{Math.round(best)}</dd>
          </div>
        </dl>

        {/* The whole point of the strip. Absent on turn one, when there is no
            "since" to measure from. */}
        {delta != null && (
          <span
            className="h2c-session__delta"
            data-dir={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}
          >
            {formatDelta(delta)}
            <span className="h2c-session__delta-of">since your first</span>
          </span>
        )}
      </div>

      <ul className="h2c-session__criteria">
        {criteria.map((c) => (
          <li key={c.key} title={`average ${c.average} of ${max} across the session`}>
            <span className="h2c-session__cname">{c.label}</span>
            <span className="h2c-session__cval" data-tone={scoreTone(c.average, max)}>
              {Math.round(c.average)}
            </span>
            {c.delta != null && c.delta !== 0 && (
              <span className="h2c-session__cdelta" data-dir={c.delta > 0 ? 'up' : 'down'}>
                {formatDelta(c.delta)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
