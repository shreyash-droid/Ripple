/* Google Identity Services — the non-component half.
 *
 * The backend verifies a Google *ID token* (handlers/googleAuth.js calls
 * verifyIdToken), and GIS only mints one of those through its rendered button
 * or One Tap; the oauth2 token-client flow hands back an access token, which
 * that endpoint cannot use. So the button is the flow — see GoogleButton.jsx
 * for how it gets styled without losing the click.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'

export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/** Lets the card drop the divider and the button together when unconfigured. */
export const GOOGLE_ENABLED = Boolean(CLIENT_ID)

let scriptPromise = null

/** Resolves once window.google.accounts.id exists. Loads the script once. */
export function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = GIS_SRC
    el.async = true
    el.defer = true
    el.onload = () => resolve()
    el.onerror = () => {
      // drop the cached promise so a later mount can retry rather than
      // inheriting a failure from a moment of bad network
      scriptPromise = null
      reject(new Error('Could not reach Google. Check your connection and try again.'))
    }
    document.head.appendChild(el)
  })

  return scriptPromise
}
