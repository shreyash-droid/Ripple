import { useEffect } from 'react'
import App from './App.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import { useAuth } from './lib/auth-context'

/* The gate. App is mounted only while signed in, so logging out drops every
   conversation, message and document it was holding — the next person to log in
   on this browser starts from nothing rather than from the last user's sidebar. */
export default function Root() {
  const { signedIn } = useAuth()

  /* A conversation deep link belongs to the session that made it. Left in
     place, the next login would restore #/c/12 and immediately 404 against a
     conversation that now belongs to someone else. */
  useEffect(() => {
    if (signedIn || !window.location.hash) return
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [signedIn])

  return signedIn ? <App /> : <AuthScreen />
}
