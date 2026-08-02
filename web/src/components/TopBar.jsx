import ProfileBadge from './ProfileBadge'

/* The hero's top rail.
 *
 * Two things and no nav. The named "How it works" link is gone because the
 * wordmark now does that job: the front page is home, so the mark beside it is
 * the way back to it — the same gesture it makes in the sidebar and on the
 * front page's own rail. A rail carrying a logo and a link to the same place is
 * offering one destination twice.
 *
 * The account slot is the session's tell: a signed-in visitor gets their
 * avatar, an anonymous one gets Log in, and nothing here ever blocks them from
 * using the chat first.
 */
export default function TopBar({ user, signedIn }) {
  return (
    <header className="h2c-topbar">
      {/* '#/' rather than a bare '#': Root reads the hash, and an empty one on
          a page whose own route is #/try would leave the address ambiguous
          about which surface it means. */}
      <a className="h2c-brand h2c-brand--home" href="#/" title="How it works">
        <div className="h2c-orb" />
        <span className="h2c-brand__name">Ripple</span>
      </a>

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
