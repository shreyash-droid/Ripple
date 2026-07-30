import ProfileBadge from './ProfileBadge'

/* The hero's top rail.
 *
 * It carries the one outbound link on the landing view — "How it works" — in the
 * bracketed monospace the landing page is built out of, so the control looks like
 * where it goes rather than like a generic nav item. The account slot is the
 * session's tell: a signed-in visitor gets their avatar, an anonymous one gets
 * Log in, and nothing here ever blocks them from using the chat first.
 */
export default function TopBar({ user, signedIn }) {
  return (
    <header className="h2c-topbar">
      <div className="h2c-brand">
        <div className="h2c-orb" />
        <span className="h2c-brand__name">Ripple</span>
      </div>

      <nav className="h2c-topnav" aria-label="Site">
        <a className="h2c-navcmd" href="#/how-it-works">
          <span>How it works</span>
        </a>
      </nav>

      {signedIn ? (
        <ProfileBadge user={user} />
      ) : (
        <a className="h2c-navcmd is-accent" href="#/signin">
          <span>Log in</span>
        </a>
      )}
    </header>
  )
}
