import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import AvatarContent from './Avatar'

/* The account popover behind a profile icon.
 *
 * Hover *and* click, because they answer different needs. Hovering is the cheap
 * "who am I signed in as?" glance and should cost nothing; a click pins the card
 * open so the email can be read and selected without holding the cursor still.
 * Touch devices have no hover at all, so the click path is the only one they get
 * — which is why this is not a hover-only tooltip.
 *
 * Two placements, because the profile icon appears in opposite corners:
 *
 *   bottom-end  the top bar and the chat header. Absolutely positioned, hanging
 *               from the avatar's right edge so it cannot run off screen.
 *   top-start   the sidebar, top and collapsed. Opens upward, and is position:
 *               fixed rather than absolute — .h2c-sidebar sets overflow: hidden,
 *               which would otherwise clip the card away entirely. That is the
 *               same reason .h2c-chatmenu is fixed. The cost of escaping the
 *               clip is that the card no longer follows its anchor, so anything
 *               that moves the anchor has to close it.
 */

// A cursor crossing the avatar on its way somewhere else shouldn't open the
// card; the few pixels of gap between the avatar and the card shouldn't close
// it. One small delay on each side buys both.
const OPEN_DELAY = 110
const CLOSE_DELAY = 200

// how far above/below the anchor the card sits
const OFFSET = 10

export default function ProfileBadge({
  user,
  className = '',
  avatarClassName = 'h2c-avatar',
  placement = 'bottom-end',
}) {
  const [open, setOpen] = useState(false)
  // viewport coordinates for the fixed placement; unused by the absolute one
  const [coords, setCoords] = useState(null)
  // Pinned by a click. Kept in a ref rather than state because the timers below
  // read it after a delay, and a stale closure there would reopen a card the
  // user just dismissed.
  const pinnedRef = useRef(false)
  const timerRef = useRef(0)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)

  const isFixed = placement === 'top-start'

  const clearTimer = () => clearTimeout(timerRef.current)

  const openAfter = (ms) => {
    clearTimer()
    timerRef.current = setTimeout(() => setOpen(true), ms)
  }

  const closeAfter = (ms) => {
    if (pinnedRef.current) return // a pinned card is dismissed, not hovered away
    clearTimer()
    timerRef.current = setTimeout(() => setOpen(false), ms)
  }

  // Stable, so the listeners below are bound once per open rather than on every
  // render — and never hold a dismiss from a render that has since been replaced.
  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current)
    pinnedRef.current = false
    setOpen(false)
  }, [])

  useEffect(() => clearTimer, [])

  /* Measured before paint, so the card never renders at a stale position and
     jumps. Anchored by its bottom edge, which is what lets it grow upward as
     the content decides its height rather than needing that height up front. */
  useLayoutEffect(() => {
    if (!open || !isFixed) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      setCoords({ left: rect.left, bottom: window.innerHeight - rect.top + OFFSET })
    }
  }, [open, isFixed])

  // Escape and a click anywhere else close it, the way they would any popover.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) dismiss()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)

    // A fixed card is pinned to the viewport, not to the avatar, so anything
    // that moves the avatar out from under it has to close it. Capture, because
    // the scroll happens on an inner element rather than on window.
    if (isFixed) {
      window.addEventListener('scroll', dismiss, true)
      window.addEventListener('resize', dismiss)
    }

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [open, isFixed, dismiss])

  const toggle = () => {
    if (pinnedRef.current) return dismiss()
    clearTimer()
    pinnedRef.current = true
    setOpen(true)
  }

  // hidden until measured, so the first paint of a fixed card is never at 0,0
  const cardStyle = isFixed
    ? coords
      ? { left: coords.left, bottom: coords.bottom }
      : { visibility: 'hidden' }
    : undefined

  return (
    <div
      className={`h2c-profile ${className}`.trim()}
      data-placement={placement}
      ref={rootRef}
      onMouseEnter={() => openAfter(OPEN_DELAY)}
      onMouseLeave={() => closeAfter(CLOSE_DELAY)}
    >
      <button
        type="button"
        ref={triggerRef}
        className={avatarClassName}
        aria-label="Account"
        aria-expanded={open}
        onClick={toggle}
        // keyboard focus is the same intent as a hover, with no delay to earn
        onFocus={() => openAfter(0)}
        onBlur={() => closeAfter(CLOSE_DELAY)}
      >
        <AvatarContent user={user} />
      </button>

      {open && (
        <div className="h2c-profile__card" role="tooltip" style={cardStyle}>
          <span className="h2c-profile__avatar">
            <AvatarContent user={user} />
          </span>
          <span className="h2c-profile__text">
            <span className="h2c-profile__name" title={user.name}>
              {user.name}
            </span>
            {/* displayName() already falls back to the email when there is no
                name, so printing it again below would just say it twice. */}
            {user.email && user.email !== user.name && (
              <span className="h2c-profile__email" title={user.email}>
                {user.email}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
