import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTypewriter } from '../hooks/useTypewriter'

const LOADER_LABEL = 'Generating'

// Distance from the bottom within which the thread keeps following new text.
// Past it, the reader has scrolled up to re-read and we leave them alone.
const FOLLOW_THRESHOLD = 140

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function AssistantMessage({ message, animate, onRevealDone }) {
  // The hook is called unconditionally and `animate` decides whether it types
  // — calling it conditionally would change the hook count between renders.
  const typing = animate && !prefersReducedMotion()
  const displayed = useTypewriter(message.content, 15, typing)
  const done = displayed === message.content

  useEffect(() => {
    if (animate && done) onRevealDone?.()
  }, [animate, done, onRevealDone])

  // The caret is a CSS ::after on the last block rather than a sibling node —
  // as a sibling it would drop below the markdown's block-level output.
  const cls = [
    'h2c-msg-assistant__text',
    message.error && 'is-error',
    typing && !done && 'is-typing',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="h2c-msg-assistant">
      <div className="h2c-msg-assistant__orb" />
      <div className={cls}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayed}</ReactMarkdown>
      </div>
    </div>
  )
}

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

export default function Thread({ messages, loading, animatingId, onRevealDone, emptyHint }) {
  const scrollRef = useRef(null)
  const innerRef = useRef(null)

  // Jump to the bottom when the list itself changes.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, loading])

  // Follow the typewriter as it grows — the message count doesn't change while
  // it types, so the effect above never fires for it.
  useEffect(() => {
    const el = scrollRef.current
    const inner = innerRef.current
    if (!el || !inner || typeof ResizeObserver === 'undefined') return undefined

    const ro = new ResizeObserver(() => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD) {
        el.scrollTop = el.scrollHeight
      }
    })
    ro.observe(inner)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="h2c-thread" ref={scrollRef}>
      <div className="h2c-thread__inner" ref={innerRef}>
        {messages.length === 0 && !loading && <div className="h2c-empty">{emptyHint}</div>}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div className="h2c-msg-user" key={m.id ?? i}>
              <div className="h2c-msg-user__bubble">{m.content}</div>
            </div>
          ) : (
            <AssistantMessage
              key={m.id ?? i}
              message={m}
              animate={m.id != null && m.id === animatingId}
              onRevealDone={onRevealDone}
            />
          ),
        )}

        {loading && <Loader />}
      </div>
    </div>
  )
}
