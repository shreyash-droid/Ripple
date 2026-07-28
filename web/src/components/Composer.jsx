import { useEffect, useRef } from 'react'
import { ArrowUpIcon, PlusIcon } from './Icons'
import { modeConfig } from '../lib/modes'

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
  docState = 'idle',
  entered,
}) {
  const fieldRef = useRef(null)
  const fileRef = useRef(null)
  const boxRef = useRef(null)
  const hasDraft = draft.trim().length > 0

  useEffect(() => {
    const el = fieldRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  // Publish the composer's real height so the thread can reserve room for it.
  // It changes with the doc chip and with the textarea wrapping, so a fixed
  // padding in the thread would either clip messages or waste space.
  useEffect(() => {
    const el = boxRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--composer-h', `${el.offsetHeight}px`)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  // Ingestion is queued, so a named document is not yet an answerable one —
  // the placeholder has to say which of the two the user is looking at.
  const DOC_PLACEHOLDERS = {
    processing: `Processing ${docName}…`,
    ready: `Ask about ${docName}`,
    failed: 'Upload the document again',
  }

  /* On the landing page the mode pills are hidden too, so the composer reads as
     a plain entry point — naming the loaded document, or prompting for code,
     would be the same leak as the chip above. Inside the chat the placeholder is
     the mode's, since what you are expected to type differs sharply between
     "message Ripple" and "answer as you would in the room". */
  const placeholder = !entered
    ? 'Message Ripple'
    : mode === 'document'
      ? DOC_PLACEHOLDERS[docState] || modeConfig(mode).placeholder
      : modeConfig(mode).placeholder

  return (
    <div className="h2c-composer" ref={boxRef}>
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
        <div className={`h2c-docchip is-${docState}`}>
          <span className="h2c-docchip__dot" />
          {docState === 'processing'
            ? `Processing ${docName}…`
            : docState === 'failed'
              ? `Couldn't process ${docName}`
              : docName}
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
              disabled={docState === 'processing'}
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