/* What an empty thread says.
 *
 * It used to be one line for all four modes ("Ask anything — pick a mode below"),
 * which meant switching mode changed nothing you could see until you had already
 * typed. Each mode now states its own workflow here, and the starters are the
 * cheapest way to begin it — Coach in particular needs a first move, since the
 * interview cannot start until the candidate says what they are interviewing for.
 */
export default function EmptyState({ empty, onStarter }) {
  const { title, body, starters = [] } = empty

  return (
    <div className="h2c-empty">
      <h2 className="h2c-empty__title">{title}</h2>
      <p className="h2c-empty__body">{body}</p>

      {starters.length > 0 && (
        <div className="h2c-empty__starters">
          {starters.map((text) => (
            <button
              type="button"
              key={text}
              className="h2c-starter"
              onClick={() => onStarter?.(text)}
            >
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
