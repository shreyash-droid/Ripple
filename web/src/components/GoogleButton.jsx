import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleIcon } from './Icons'
import { CLIENT_ID, GOOGLE_ENABLED, loadGis } from '../lib/google'

/* Continue with Google.
 *
 * Identity Services' own button is the only way to get the ID token the backend
 * verifies (see lib/google.js), and its styling isn't ours to control. So we
 * render it transparent and lay it over a button we did design: the visible
 * face is inert, and every click lands on Google's real button underneath. The
 * flow stays entirely first-party while matching the rest of the card.
 */

// GIS renders `size: 'large'` at a fixed 40px and centres it in our 44px face,
// leaving a 2px band top and bottom that isn't clickable — close enough that no
// one finds the seam, and it leaves the face free to be the height we want.
const GIS_HEIGHT = 40

// The API rejects anything wider and falls back to its own default width.
const GIS_MAX_WIDTH = 400

export default function GoogleButton({
  onCredential,
  onError,
  busy,
  label = 'Continue with Google',
}) {
  const hostRef = useRef(null)
  const faceRef = useRef(null)
  // Held in a ref so re-rendering the button on resize never has to re-run
  // initialize() just to pick up a fresh closure.
  const handlersRef = useRef({ onCredential, onError })

  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    handlersRef.current = { onCredential, onError }
  }, [onCredential, onError])

  /* Google measures the button in px, so it has to be re-rendered whenever the
     card changes width — renderButton takes no percentage. */
  const draw = useCallback(() => {
    const host = hostRef.current
    const face = faceRef.current
    if (!host || !face || !window.google?.accounts?.id) return

    const width = Math.min(Math.round(face.getBoundingClientRect().width), GIS_MAX_WIDTH)
    if (width <= 0) return // laid out but not yet visible

    host.innerHTML = ''
    window.google.accounts.id.renderButton(host, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'center',
      width,
    })
  }, [])

  useEffect(() => {
    if (!GOOGLE_ENABLED) return undefined

    let cancelled = false
    let observer

    loadGis()
      .then(() => {
        if (cancelled) return

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => handlersRef.current.onCredential?.(credential),
          // One Tap would race the button we just rendered, and this layout has
          // nowhere to put its prompt.
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        setReady(true)
        draw()

        if (faceRef.current) {
          observer = new ResizeObserver(draw)
          observer.observe(faceRef.current)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setFailed(true)
        handlersRef.current.onError?.(err.message)
      })

    return () => {
      cancelled = true
      observer?.disconnect()
    }
  }, [draw])

  if (!GOOGLE_ENABLED) return null

  return (
    <div className={`auth-google${ready ? ' is-ready' : ''}${busy ? ' is-busy' : ''}`}>
      {/* What the user sees. Inert — the real target is the layer above it. */}
      <div className="auth-google__face" ref={faceRef} aria-hidden="true">
        <GoogleIcon />
        <span>{failed ? 'Google sign-in unavailable' : label}</span>
      </div>

      {/* Google's own button: full width, invisible, on top. */}
      <div className="auth-google__gis" ref={hostRef} style={{ height: GIS_HEIGHT }} />
    </div>
  )
}
