import { useEffect, useRef } from 'react'
import { ArrowUpIcon, PlusIcon } from './Icons'

export default function Composer({
  draft,
  onDraftChange,
  onSend,
  modes,
  mode,
  onModeChange,
  busy,
  showUpload,
  onUpload,
  docName,
  ingesting,
}) {
  const fieldRef = useRef(null)
  const fileRef = useRef(null)
  const hasDraft = draft.trim().length > 0

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

  const placeholder =
    mode === 'document'
      ? docName
        ? `Ask about ${docName}`
        : 'Upload a document to begin'
      : 'Message Ripple'

  return (
    <div className="h2c-composer">
      <div className="h2c-modes">
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

      {showUpload && docName && (
        <div className="h2c-docchip">
          <span className="h2c-docchip__dot" />
          {ingesting ? `Processing ${docName}…` : docName}
        </div>
      )}

      <div className="h2c-inputbar">
        {showUpload ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                onUpload(e.target.files?.[0])
                e.target.value = '' // allow re-uploading same file
              }}
            />
            <button
              type="button"
              className="h2c-attach"
              aria-label="Upload a document"
              title="Upload a document"
              onClick={() => fileRef.current?.click()}
              disabled={ingesting}
            >
              <PlusIcon size={17} />
            </button>
          </>
        ) : (
          <button type="button" className="h2c-attach" aria-label="Add an attachment">
            <PlusIcon size={17} />
          </button>
        )}

        <textarea
          ref={fieldRef}
          rows={1}
          className="h2c-inputbar__field"
          placeholder={placeholder}
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