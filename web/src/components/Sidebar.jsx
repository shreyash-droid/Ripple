import { PanelLeftIcon, PlusIcon } from './Icons'

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onHome,
  user,
  collapsed,
  onToggle,
}) {
  if (collapsed) {
    return (
      <aside className="h2c-sidebar is-collapsed">
        <div className="h2c-rail">
          <button
            type="button"
            className="h2c-railbtn h2c-rail__home"
            onClick={onHome}
            aria-label="Ripple home"
            title="Home"
          >
            <span className="h2c-orb" />
          </button>
          <button
            type="button"
            className="h2c-railbtn"
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftIcon />
          </button>
          <button
            type="button"
            className="h2c-railbtn"
            onClick={onNewChat}
            aria-label="New chat"
            title="New chat"
          >
            <PlusIcon size={17} />
          </button>
        </div>

        <div className="h2c-rail__foot">
          <div className="h2c-sidebar__user-avatar" title={user.name}>
            {user.initials}
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="h2c-sidebar">
      <div className="h2c-sidebar__head">
        <button type="button" className="h2c-brand h2c-brand--home" onClick={onHome} title="Home">
          <span className="h2c-orb" />
          <span className="h2c-brand__name">Ripple</span>
        </button>
        <button
          type="button"
          className="h2c-railbtn"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftIcon />
        </button>
      </div>

      <div className="h2c-sidebar__new">
        <button type="button" className="h2c-newchat" onClick={onNewChat}>
          <PlusIcon />
          New chat
        </button>
      </div>

      <div className="h2c-sidebar__label">Recent</div>

      <div className="h2c-sidebar__list">
        {conversations.length === 0 ? (
          <div className="h2c-sidebar__empty">No conversations yet</div>
        ) : (
          conversations.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`h2c-chatitem${c.id === activeId ? ' is-active' : ''}`}
              onClick={() => onSelect(c.id)}
              title={c.title}
            >
              {c.title}
            </button>
          ))
        )}
      </div>

      <div className="h2c-sidebar__user">
        <div className="h2c-sidebar__user-avatar">{user.initials}</div>
        <span className="h2c-sidebar__user-name">{user.name}</span>
      </div>
    </aside>
  )
}
