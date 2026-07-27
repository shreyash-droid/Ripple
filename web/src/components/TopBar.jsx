export default function TopBar({ initials }) {
  return (
    <header className="h2c-topbar">
      <div className="h2c-brand">
        <div className="h2c-orb" />
        <span className="h2c-brand__name">Ripple</span>
      </div>
      <nav className="h2c-topbar__nav">
        <a className="h2c-navlink" href="#modes">
          Modes
        </a>
        <a className="h2c-navlink" href="#pricing">
          Pricing
        </a>
        <div className="h2c-avatar">{initials}</div>
      </nav>
    </header>
  )
}
