import { PlusIcon } from './Icons'

export default function Sidebar({ conversations, activeId, onSelect, onNewChat, user }) {
  return (
    <aside className="h2c-sidebar">
      <div className="h2c-brand h2c-sidebar__brand">
        <div className="h2c-orb" />
        <span className="h2c-brand__name">Ripple</span>
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
