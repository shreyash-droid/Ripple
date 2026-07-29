/* Where the signed-in session lives.
 *
 * localStorage, not an httpOnly cookie. The API is a different origin from the
 * static site (API Gateway vs. the CDN), so a cookie would have to be
 * SameSite=None; Secure and bring its own CSRF handling, and serverless-offline
 * in dev sits on a third. The cost of that choice is real: anything that can
 * run script on this page can read the token. Worth revisiting if the API ever
 * moves behind the same domain.
 *
 * Persisting the user alongside the token is what avoids a "logged out" flash
 * on reload — we render the app from the stored copy immediately instead of
 * waiting on a round trip to find out who this is.
 */

const TOKEN_KEY = 'ripple.token'
const USER_KEY = 'ripple.user'

// A token that expires in the next few seconds is already spent by the time the
// request lands, so treat it as gone rather than letting the API say so.
const EXPIRY_SKEW_S = 30

/* The `exp` claim, or null if the token isn't a JWT we can read. Purely a
   convenience so an obviously stale session never renders the app — the
   backend's verify is still the only thing that decides. */
function readExpiry(token) {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json)
    return typeof exp === 'number' ? exp : null
  } catch {
    return null
  }
}

export function isExpired(token) {
  const exp = readExpiry(token)
  // unreadable or no exp: let the API be the judge
  if (exp === null) return false
  return exp - EXPIRY_SKEW_S <= Date.now() / 1000
}

/** The stored session, or null. Clears itself if the token has already run out. */
export function readSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null

    if (isExpired(token)) {
      clearSession()
      return null
    }

    const raw = localStorage.getItem(USER_KEY)
    return { token, user: raw ? JSON.parse(raw) : null }
  } catch {
    // private-mode Safari and friends: no storage, no session
    return null
  }
}

export function writeSession({ token, user }) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user ?? null))
  } catch {
    // storage unavailable — the session still works for this tab, it just
    // won't survive a reload
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    /* nothing to clear */
  }
}

/** Read straight from storage — api.js needs this per request, not per render. */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** Fires when another tab logs in or out, so open tabs don't disagree. */
export function onSessionChange(handler) {
  const listener = (e) => {
    if (e.key === TOKEN_KEY || e.key === null) handler(readSession())
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}

/* "Maya Chen" -> "MC", "maya@ripple.dev" -> "M". Falls back to a dot rather
   than an empty circle for a user with neither a name nor a readable email. */
export function initialsOf(user) {
  const source = (user?.name || user?.email || '').trim()
  if (!source) return '·'

  const words = source.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return source[0].toUpperCase()
}

/** What to call this user in the UI. */
export function displayName(user) {
  return user?.name?.trim() || user?.email || 'Signed in'
}
