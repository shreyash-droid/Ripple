import { formatDelta, scoreTone } from '../lib/scoring'

/* The rubric card that sits above a scored reply.
 *
 * It renders whatever criteria the message was scored on rather than what the
 * mode's rubric currently says, so an older conversation still reads correctly
 * after the rubric is reworded. The prose below it deliberately repeats none of
 * these numbers — said twice, a turn reads like a form.
 */
export default function Scorecard({ scorecard, label = 'Score', previous = null }) {
  const { overall, max, criteria } = scorecard
  const delta = previous == null ? null : Math.round((overall - previous) * 10) / 10

  return (
    <section className="h2c-score" aria-label={`${label}: ${overall} out of ${max}`}>
      <header className="h2c-score__head">
        <span className="h2c-score__label">{label}</span>

        {/* Only worth the space once there is a previous turn to beat. A flat
            score is still information, so ±0.0 shows rather than hiding. */}
        {delta != null && (
          <span className="h2c-score__delta" data-dir={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}>
            {formatDelta(delta)} <span className="h2c-score__delta-of">vs last</span>
          </span>
        )}

        <span className="h2c-score__overall" data-tone={scoreTone(overall, max)}>
          {overall.toFixed(1)}
          <span className="h2c-score__outof">/{max}</span>
        </span>
      </header>

      <div className="h2c-score__grid">
        {criteria.map((c) => (
          <div className="h2c-score__cell" key={c.key}>
            <div className="h2c-score__cellhead">
              <span className="h2c-score__name">{c.label}</span>
              <span className="h2c-score__val" data-tone={scoreTone(c.score, max)}>
                {c.score}
              </span>
            </div>
            {/* the numbers are already readable text above, so the bar is decoration */}
            <div className="h2c-score__meter" aria-hidden="true">
              <i
                data-tone={scoreTone(c.score, max)}
                style={{ width: `${Math.max(2, (c.score / max) * 100)}%` }}
              />
            </div>
            {c.note && <p className="h2c-score__note">{c.note}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
