import { useEffect, useRef } from 'react'
import { ArrowUpIcon, PlusIcon } from './Icons'

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
        {modes.map(({ value, label, hint, Icon }) => (
          <button
            type="button"
            key={value}
            className={`h2c-mode${value === mode ? ' is-active' : ''}`}
            onClick={() => onModeChange(value)}
            title={hint}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      <div className="h2c-inputbar">
        <button type="button" className="h2c-attach" aria-label="Add an attachment">
          <PlusIcon size={17} />
        </button>
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
