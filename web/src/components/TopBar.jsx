import ProfileBadge from './ProfileBadge'

export default function TopBar({ user }) {
  return (
    <header className="h2c-topbar">
      <div className="h2c-brand">
        <div className="h2c-orb" />
        <span className="h2c-brand__name">Ripple</span>
      </div>
      <ProfileBadge user={user} />
    </header>
  )
}
