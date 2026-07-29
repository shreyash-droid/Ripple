import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../lib/auth-context'
import { setUnauthorizedHandler } from '../lib/api'
import { clearSession, onSessionChange, readSession, writeSession } from '../lib/session'

/* One source of truth for "who is signed in".
 *
 * The session is restored synchronously from localStorage in the initial state,
 * so there is no loading phase to render around — the first paint is already
 * either the auth screen or the app, never a flash of one becoming the other.
 */
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)

  /* Signing in and out are the same operation from the UI's point of view:
     replace the session and let everything downstream re-render. `signIn` takes
     the { token, user } payload exactly as the three auth endpoints return it. */
  const signIn = useCallback((payload) => {
    writeSession(payload)
    setSession({ token: payload.token, user: payload.user ?? null })
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  // A rejected request anywhere in the app ends the session here, so an expired
  // token surfaces as the login screen rather than as a failed sidebar load.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      setSession(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // Log out in one tab, log out in all of them.
  useEffect(() => onSessionChange(setSession), [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      signedIn: Boolean(session?.token),
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
