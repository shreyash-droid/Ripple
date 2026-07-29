import { useEffect, useRef } from 'react'
import { ArrowUpIcon, CloseIcon, PlusIcon } from './Icons'
import { modeConfig } from '../lib/modes'

export default function Composer({
  draft,
  onDraftChange,
  onSend,
  modes,
  mode,
  onModeChange,
  pendingMode,
  onConfirmMode,
  onCancelMode,
  busy,
  showUpload,
  onUpload,
  onDetach,
  attachName,
  attachState = 'idle',
  entered,
}) {
  const fieldRef = useRef(null)
  const fileRef = useRef(null)
  const boxRef = useRef(null)
  const hasDraft = draft.trim().length > 0

  const upload = modeConfig(mode).upload
  /* An attached resume becomes the message, so it can be sent with an empty box
     — anything typed beside it is optional context. An ingested document is the
     opposite: it is the thing being asked *about*, so an empty question there is
     still nothing to send. */
  const canSend = (hasDraft || (upload?.sendsWithMessage && attachState === 'ready')) && !busy

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

  // Escape backs out of the mode-switch prompt, the way it would any dialog.
  useEffect(() => {
    if (!pendingMode) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onCancelMode?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingMode, onCancelMode])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  /* On the landing page the mode pills are hidden too, so the composer reads as
     a plain entry point — naming the loaded document, or prompting for a resume,
     would be the same leak as the chip above. Inside the chat the placeholder is
     the mode's, since what you are expected to type differs sharply between
     "message Ripple" and "answer as you would in the room". */
  function placeholderFor() {
    if (!entered) return 'Message Ripple'
    const fallback = modeConfig(mode).placeholder

    if (attachState === 'processing') return `Reading ${attachName}…`
    if (attachState === 'failed') return `Attach ${attachName} again`

    if (attachState === 'ready') {
      // Ingestion is queued, so a named document is only answerable now that the
      // worker is done — and a resume that is attached still needs sending.
      return upload?.sendsWithMessage
        ? 'Add the role you are targeting — or just send it'
        : `Ask about ${attachName}`
    }
    return fallback
  }

  const placeholder = placeholderFor()

  return (
    <div className="h2c-composer" ref={boxRef}>
      {/* Floated above the pills rather than inserted before them: the composer
          is bottom-anchored, so laying this out in flow would shove the whole
          input bar up the screen just to ask a yes/no question. */}
      {pendingMode && (
        <div
          className="h2c-modeswitch"
          role="dialog"
          aria-labelledby="h2c-modeswitch-title"
        >
          <p className="h2c-modeswitch__title" id="h2c-modeswitch-title">
            Start a new chat in {modeConfig(pendingMode).label}?
          </p>
          <p className="h2c-modeswitch__body">
            Each chat stays in one mode. This one stays in your history.
          </p>
          <div className="h2c-modeswitch__actions">
            <button type="button" className="h2c-modeswitch__btn" onClick={onCancelMode}>
              Cancel
            </button>
            <button
              type="button"
              className="h2c-modeswitch__btn is-primary"
              onClick={() => onConfirmMode(pendingMode)}
              autoFocus
            >
              Start new chat
            </button>
          </div>
        </div>
      )}

      <div className="h2c-modes">
        {modes.map(({ value, label, hint, Icon }) => (
          <button
            type="button"
            key={value}
            className={`h2c-mode${value === mode ? ' is-active' : ''}${
              value === pendingMode ? ' is-pending' : ''
            }`}
            onClick={() => onModeChange(value)}
            title={hint}
            aria-pressed={value === mode}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      {showUpload && attachName && (
        <div className={`h2c-docchip is-${attachState}`}>
          <span className="h2c-docchip__dot" />
          {attachState === 'processing'
            ? `Reading ${attachName}…`
            : attachState === 'failed'
              ? `Couldn't read ${attachName}`
              : attachName}
          {/* Only for attachments that are about to be sent. Picking the wrong
              file is otherwise a dead end until you start a new chat. */}
          {onDetach && attachState !== 'processing' && (
            <button
              type="button"
              className="h2c-docchip__x"
              onClick={onDetach}
              aria-label={`Remove ${attachName}`}
              title="Remove"
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      )}

      <div className={`h2c-inputbar${showUpload ? '' : ' is-plain'}`}>
        {/* No + at all in the modes that take no attachment, and none on the
            landing page. A button that opens nothing is worse than no button:
            it advertises a capability the mode does not have. */}
        {showUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={upload.accept}
              style={{ display: 'none' }}
              onChange={(e) => {
                onUpload(e.target.files?.[0])
                e.target.value = '' // allow re-uploading same file
              }}
            />
            <button
              type="button"
              className="h2c-attach"
              aria-label={upload.label}
              title={upload.label}
              onClick={() => fileRef.current?.click()}
              disabled={attachState === 'processing'}
            >
              <PlusIcon size={17} />
            </button>
          </>
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
          className={`h2c-send${canSend ? ' is-ready' : ''}`}
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          <ArrowUpIcon />
        </button>
      </div>
    </div>
  )
}