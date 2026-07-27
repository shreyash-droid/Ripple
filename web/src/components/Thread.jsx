import { useEffect, useRef } from 'react'

const LOADER_LABEL = 'Generating'

function Loader() {
  return (
    <div className="h2c-loader">
      <div className="h2c-loader__circle" />
      <div className="h2c-loader__label" aria-label={`${LOADER_LABEL}…`}>
        {LOADER_LABEL.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.1}s` }} aria-hidden="true">
            {ch}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Thread({ messages, loading, streaming, emptyHint }) {
  const ref = useRef(null)

  // Pin to the bottom as content streams in.
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  return (
    <div className="h2c-thread" ref={ref}>
      <div className="h2c-thread__inner">
        {messages.length === 0 && !loading && <div className="h2c-empty">{emptyHint}</div>}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div className="h2c-msg-user" key={m.id ?? i}>
              <div className="h2c-msg-user__bubble">{m.content}</div>
            </div>
          ) : (
            <div className="h2c-msg-assistant" key={m.id ?? i}>
              <div className="h2c-msg-assistant__orb" />
              <div className={`h2c-msg-assistant__text${m.error ? ' is-error' : ''}`}>
                {m.content}
                {streaming && i === messages.length - 1 && <span className="h2c-caret">▍</span>}
              </div>
            </div>
          ),
        )}

        {loading && <Loader />}
      </div>
    </div>
  )
}
