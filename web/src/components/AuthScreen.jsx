import { useEffect, useMemo, useRef, useState } from 'react'
import BinaryWaves from './BinaryWaves'
import GoogleButton from './GoogleButton'
import { AlertIcon, ArrowRightIcon, EyeIcon, EyeOffIcon } from './Icons'
import { googleAuth, login as loginRequest, signup as signupRequest } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { GOOGLE_ENABLED } from '../lib/google'
import { MODES } from '../lib/modes'
// for .h2c-binary and .h2c-orb, which this screen shares with the app shell —
// every rule in there is .h2c-scoped, so it carries nothing else onto the page
import '../styles/app.css'
import '../styles/auth.css'

/* The gate. Login and signup are one screen rather than two routes: they share
   a card, a Google button and most of a form, and animating between them is
   what makes switching feel like a change of intent rather than a page load.
 *
 * The two forms differ by exactly one field, so nothing unmounts when you
 * switch — the name row and the strength meter collapse to zero height instead.
 * That keeps what you already typed, and lets the card resize on its own.
 */

// Matches what the backend will accept (signup.js), so the form can say so
// before spending a round trip on it.
const MIN_PASSWORD = 8

// Deliberately loose. The server sends the confirmation, so the only job here
// is to catch a missing @ or a stray space before the request goes out.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EMPTY = { name: '', email: '', password: '' }

// How long each mode holds the left panel before the next one takes over.
const MODE_CYCLE_MS = 3600

/* Four bands, because the meter has four segments. Length carries the most
   weight: a long passphrase beats a short one with a symbol jammed in it. */
function strengthOf(password) {
  if (!password) return { score: 0, label: '' }

  let score = 0
  if (password.length >= MIN_PASSWORD) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1

  // anything under the minimum is weak regardless of what it contains
  if (password.length < MIN_PASSWORD) score = Math.min(score, 1)

  return { score, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] }
}

export default function AuthScreen() {
  const { signIn } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(null) // null | 'form' | 'google'
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [spotlight, setSpotlight] = useState(0)

  const nameRef = useRef(null)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  // BinaryWaves is scroll-driven in the app; here it just sits at its resting
  // state, so it gets a progress ref that never moves.
  const progressRef = useRef(0)

  const isSignup = mode === 'signup'
  const strength = useMemo(() => strengthOf(values.password), [values.password])

  /* The left panel cycles the modes the product actually ships. It is the one
     thing on this screen that says what you are signing in to. */
  useEffect(() => {
    const id = setInterval(() => setSpotlight((i) => (i + 1) % MODES.length), MODE_CYCLE_MS)
    return () => clearInterval(id)
  }, [])

  const validate = (next = values, forMode = mode) => {
    const found = {}

    if (forMode === 'signup' && !next.name.trim()) found.name = 'Tell us what to call you'

    if (!next.email.trim()) found.email = 'Email is required'
    else if (!EMAIL_RE.test(next.email.trim())) found.email = 'That does not look like an email'

    if (!next.password) found.password = 'Password is required'
    else if (forMode === 'signup' && next.password.length < MIN_PASSWORD) {
      found.password = `At least ${MIN_PASSWORD} characters`
    }

    return found
  }

  const setField = (key) => (event) => {
    const next = { ...values, [key]: event.target.value }
    setValues(next)
    // Re-validate as they type, but only for a field they have already left —
    // erroring on the first keystroke of an email is just noise.
    if (touched[key]) setErrors((prev) => ({ ...prev, [key]: validate(next)[key] }))
    if (formError) setFormError(null)
  }

  const blurField = (key) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    setErrors((prev) => ({ ...prev, [key]: validate()[key] }))
  }

  const switchMode = (next) => {
    if (next === mode) return
    setMode(next)
    setFormError(null)
    // Errors belong to the form you were filling in; the name field's is not a
    // finding about the form you just switched to.
    setErrors({})
    setTouched({})
    if (next === 'signup') requestAnimationFrame(() => nameRef.current?.focus())
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (busy) return

    const found = validate()
    setErrors(found)
    setTouched({ name: true, email: true, password: true })

    // Send focus to the first thing that needs fixing rather than making them
    // hunt for the red text. Source order, so it matches what they see.
    const refs = { name: nameRef, email: emailRef, password: passwordRef }
    const first = ['name', 'email', 'password'].find((key) => found[key])
    if (first) {
      refs[first].current?.focus()
      return
    }

    setBusy('form')
    setFormError(null)

    try {
      const payload = isSignup
        ? await signupRequest({
            name: values.name.trim(),
            email: values.email.trim(),
            password: values.password,
          })
        : await loginRequest({ email: values.email.trim(), password: values.password })

      // Deliberately no setBusy(null): this unmounts as the app takes over, and
      // clearing it would flash the button back to its resting state first.
      signIn(payload)
    } catch (err) {
      setFormError(err.message)
      setBusy(null)
    }
  }

  const handleCredential = async (credential) => {
    if (busy) return
    setBusy('google')
    setFormError(null)

    try {
      signIn(await googleAuth(credential))
    } catch (err) {
      setFormError(err.message)
      setBusy(null)
    }
  }

  const mark = MODES[spotlight]
  const SpotIcon = mark.Icon

  return (
    <div className="auth">
      {/* Glow first, then the binary field over it — the same stacking order the
          landing page uses, so the two screens read as one backdrop. */}
      <div className="auth__ambient" aria-hidden="true" />
      <BinaryWaves progressRef={progressRef} />

      <div className="auth__shell">
        {/* ---- brand panel ---- */}
        <aside className="auth__aside">
          <div className="auth__brand">
            <span className="h2c-orb" />
            <span className="auth__wordmark">Ripple</span>
          </div>

          <div className="auth__pitch">
            <h1 className="auth__headline">
              AI that adapts to <em>how you think</em>
            </h1>
            <p className="auth__sub">
              One account, four ways of working. Your conversations stay yours.
            </p>
          </div>

          {/* The name is the visual: rings leaving a still centre. */}
          <div className="auth__ripple" aria-hidden="true">
            <span className="auth__ring" />
            <span className="auth__ring" />
            <span className="auth__ring" />
            <span className="auth__core" />
          </div>

          <div className="auth__modes" aria-live="off">
            {/* keyed on the mode so each one re-runs the entrance animation */}
            <div className="auth__mode" key={mark.value}>
              <span className="auth__mode-icon">
                <SpotIcon size={15} />
              </span>
              <span className="auth__mode-text">
                <strong>{mark.label}</strong>
                <span>{mark.hint}</span>
              </span>
            </div>
            <div className="auth__dots">
              {MODES.map((m, i) => (
                <span key={m.value} className={i === spotlight ? 'is-on' : undefined} />
              ))}
            </div>
          </div>
        </aside>

        {/* ---- form card ---- */}
        <main className="auth__card">
          <header className="auth__head">
            <h2 className="auth__title">{isSignup ? 'Create an account' : 'Welcome back'}</h2>
            <p className="auth__lede">
              {isSignup
                ? 'A minute to set up, and every chat you have is saved to you.'
                : 'Sign in to pick up your conversations where you left them.'}
            </p>
          </header>

          {/* Segmented, not a text link: the thumb slides between the two so the
              switch reads as one control with two states. */}
          <div className="auth__switch" data-active={isSignup ? 'signup' : 'login'} role="tablist">
            <span className="auth__thumb" aria-hidden="true" />
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className="auth__tab"
              onClick={() => switchMode('login')}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className="auth__tab"
              onClick={() => switchMode('signup')}
            >
              Sign up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Collapses rather than unmounts, so a name typed before switching
                to login is still there on the way back. */}
            <div className={`auth-collapse${isSignup ? ' is-open' : ''}`}>
              <div className="auth-collapse__inner">
                <Field
                  id="auth-name"
                  label="Full name"
                  inputRef={nameRef}
                  value={values.name}
                  onChange={setField('name')}
                  onBlur={blurField('name')}
                  error={isSignup ? errors.name : undefined}
                  autoComplete="name"
                  // untabbable while collapsed, or login gets a hidden stop
                  disabled={!isSignup}
                  style={{ '--d': '0ms' }}
                />
              </div>
            </div>

            <Field
              id="auth-email"
              label="Email address"
              type="email"
              inputMode="email"
              inputRef={emailRef}
              value={values.email}
              onChange={setField('email')}
              onBlur={blurField('email')}
              error={errors.email}
              autoComplete="email"
              style={{ '--d': '60ms' }}
            />

            <Field
              id="auth-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              inputRef={passwordRef}
              value={values.password}
              onChange={setField('password')}
              onBlur={() => {
                setCapsLock(false)
                blurField('password')()
              }}
              onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
              error={errors.password}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              hint={capsLock ? 'Caps Lock is on' : undefined}
              style={{ '--d': '120ms' }}
              adornment={
                <button
                  type="button"
                  className="auth-field__reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            <div className={`auth-collapse${isSignup && values.password ? ' is-open' : ''}`}>
              <div className="auth-collapse__inner">
                <div className="auth-strength" data-score={strength.score}>
                  <div className="auth-strength__bars">
                    {[1, 2, 3, 4].map((n) => (
                      <span key={n} className={n <= strength.score ? 'is-lit' : undefined} />
                    ))}
                  </div>
                  <span className="auth-strength__label">{strength.label}</span>
                </div>
              </div>
            </div>

            {formError && (
              <p className="auth-alert" role="alert">
                <AlertIcon />
                {formError}
              </p>
            )}

            <button
              type="submit"
              className={`auth-submit${busy === 'form' ? ' is-busy' : ''}`}
              disabled={Boolean(busy)}
            >
              <span className="auth-submit__label">
                {isSignup ? 'Create account' : 'Log in'}
                <ArrowRightIcon />
              </span>
              <span className="auth-submit__spinner" aria-hidden="true" />
            </button>
          </form>

          {GOOGLE_ENABLED && (
            <>
              <div className="auth__divider">
                <span>or</span>
              </div>

              <GoogleButton
                onCredential={handleCredential}
                onError={setFormError}
                busy={Boolean(busy)}
                label={isSignup ? 'Sign up with Google' : 'Continue with Google'}
              />
            </>
          )}

          <p className="auth__foot">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="auth__link"
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
            >
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </main>
      </div>
    </div>
  )
}

/* A labelled input. The label starts inside the field and rises into the border
   once there is something to label — it doubles as the placeholder, so the row
   is never two pieces of text saying the same thing. */
function Field({ id, label, error, hint, adornment, inputRef, style, ...input }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={`auth-field${error ? ' has-error' : ''}`} style={style}>
      <div className="auth-field__box">
        <input
          id={id}
          ref={inputRef}
          className="auth-field__input"
          // a non-empty placeholder is what :placeholder-shown keys off, and a
          // space is the only one that stays invisible behind the label
          placeholder=" "
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...input}
        />
        <label className="auth-field__label" htmlFor={id}>
          {label}
        </label>
        {adornment}
      </div>

      {error && (
        <p className="auth-field__msg" id={`${id}-error`}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="auth-field__msg is-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  )
}
