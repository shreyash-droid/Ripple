import { useEffect, useRef } from 'react'
import { ArrowUpIcon, PaperclipIcon } from './Icons'

export default function Composer({ draft, onDraftChange, onSend, modes, mode, onModeChange, busy }) {
  const fieldRef = useRef(null)
  const hasDraft = draft.trim().length > 0

  // Grow the textarea with its content, up to the CSS max-height.
  useEffect(() => {
    const el = fieldRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="h2c-composer">
      <div className="h2c-modes" id="modes">
        {modes.map((m) => (
          <button
            type="button"
            key={m.value}
            className={`h2c-mode${m.value === mode ? ' is-active' : ''}`}
            onClick={() => onModeChange(m.value)}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="h2c-inputbar">
        <PaperclipIcon />
        <textarea
          ref={fieldRef}
          rows={1}
          className="h2c-inputbar__field"
          placeholder="Message Ripple"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Message Ripple"
        />
        <button
          type="button"
          className={`h2c-send${hasDraft && !busy ? ' is-ready' : ''}`}
          onClick={onSend}
          disabled={!hasDraft || busy}
          aria-label="Send message"
        >
          <ArrowUpIcon />
        </button>
      </div>
    </div>
  )
}
