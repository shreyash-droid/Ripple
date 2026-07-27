export default function TopBar({ initials }) {
  return (
    <header className="h2c-topbar">
      <div className="h2c-brand">
        <div className="h2c-orb" />
        <span className="h2c-brand__name">Ripple</span>
      </div>
      <button type="button" className="h2c-avatar" aria-label="Account">
        {initials}
      </button>
    </header>
  )
}
