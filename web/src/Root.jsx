import { useEffect, useState } from 'react'
import App from './App.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Landing from './pages/Landing.jsx'
import { useAuth } from './lib/auth-context'

/* The four surfaces, and who is allowed on them.
 *
 * This used to be a gate: signed in got the app, everyone else got a login
 * form. That meant the first thing a stranger ever saw was a password field for
 * a product they had not been shown. Now the app itself is open — you can read
 * the hero, switch modes, attach a resume and type — and the ask happens at the
 * one moment it is actually needed, when you send. App carries that gate; see
 * `send` there and `stashPending` in lib/session.
 *
 * Routes are hashes because the hero and the chat are one continuous
 * scroll-driven stage; a real router would unmount the thing the transition
 * animates. The product therefore owns a whole family of hashes — #/try is its
 * front door (the hero at rest) and #/c… every conversation past it.
 *
 * The default is the argument, not the app. A stranger arriving at the bare URL
 * used to land on a hero that asserted the product; now they land on the page
 * that makes the case for it and press an action to enter. Which also means the
 * fallback has to be `landing` rather than `app`: #/how-it-works, the address
 * this page used to live at, still resolves to the page it always meant.
 */
function readRoute() {
  const hash = window.location.hash
  if (hash.startsWith('#/signin')) return 'signin'
  if (hash.startsWith('#/dashboard')) return 'dashboard'
  if (hash.startsWith('#/try') || hash.startsWith('#/c')) return 'app'
  return 'landing'
}

export default function Root() {
  const { signedIn } = useAuth()
  const [route, setRoute] = useState(readRoute)

  // hashchange covers link clicks; popstate covers the app's own pushState
  useEffect(() => {
    const sync = () => setRoute(readRoute())
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  /* Leaving the sign-in route once it has served its purpose. Doing this here
     rather than in AuthScreen keeps that component ignorant of routing — it
     calls signIn and nothing else. `replace`, so Back does not land the user on
     a sign-in screen they have already passed. */
  useEffect(() => {
    if (route !== 'signin' || !signedIn) return
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/c`)
    /* replaceState is silent by design, so the listener above would never learn
       the route changed. Announcing it keeps this effect's only job "update an
       external system" and leaves the state change where it belongs — in the
       subscription callback. */
    window.dispatchEvent(new Event('hashchange'))
  }, [route, signedIn])

  /* A conversation deep link belongs to the session that made it. Left in place
     across a sign-out, the next login would restore #/c/12 and immediately 404
     against a conversation that now belongs to someone else. Only the id is
     dropped — #/c itself, and the landing route, are fine to be anonymous on. */
  useEffect(() => {
    if (signedIn || !/^#\/c\/\d+/.test(window.location.hash)) return
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/c`)
  }, [signedIn])

  if (route === 'landing') return <Landing />
  /* The one genuinely gated surface. Everything else on this site is readable
     signed out — the chat included, right up to the moment you send — but the
     dashboard is nothing *but* your own history, so there is no anonymous
     version of it to show. An anonymous arrival gets the sign-in screen rather
     than a redirect, so the address they were sent to is still in the bar when
     they come back through it. */
  if (route === 'dashboard') return signedIn ? <Dashboard /> : <AuthScreen />
  if (route === 'signin' && !signedIn) return <AuthScreen />
  return <App />
}
