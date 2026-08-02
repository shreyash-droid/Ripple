import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ProfileBadge from './ProfileBadge'
import {
  DashIcon,
  LogInIcon,
  LogOutIcon,
  MoreIcon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from './Icons'

// Roughly how tall the menu gets, used only to keep it on screen near the
// bottom edge. Over-estimating costs a few px of gap; under-estimating would
// let the last item fall off, so this is the confirm state's height.
const MENU_H = 118

/* Inline rename. An input in the row rather than a modal: the surrounding list
   is the context that tells you which chat you are renaming, and a dialog would
   cover it. Commits on Enter and on blur, abandons on Escape. */
function RenameField({ value, onCommit, onCancel }) {
  const ref = useRef(null)
  const [draft, setDraft] = useState(value)
  // guards the blur handler — without it, committing with Enter (which blurs)
  // would fire onCommit twice, and Escape would commit the very thing it cancels
  const settled = useRef(false)

  useLayoutEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = () => {
    if (settled.current) return
    settled.current = true
    const clean = draft.trim()
    // an empty title would render as an unclickable blank row
    if (!clean || clean === value) onCancel()
    else onCommit(clean)
  }

  const cancel = () => {
    if (settled.current) return
    settled.current = true
    onCancel()
  }

  return (
    <input
      ref={ref}
      className="h2c-chatrename"
      value={draft}
      maxLength={120}
      aria-label="Conversation title"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          cancel()
        }
      }}
    />
  )
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onHome,
  onRename,
  onDelete,
  user,
  signedIn,
  onLogout,
  collapsed,
  onToggle,
}) {
  // { id, right, top } — anchored off the trigger's rect, see below
  const [menu, setMenu] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [renamingId, setRenamingId] = useState(null)

  const closeMenu = () => {
    setMenu(null)
    setConfirming(false)
  }

  /* The menu is position: fixed, not absolute. .h2c-sidebar__list scrolls, so an
     absolutely positioned dropdown would be clipped by its overflow the moment
     it extended past a row. Fixed escapes that, at the cost of having to close
     on anything that moves the anchor. */
  const openMenu = (event, id) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setConfirming(false)
    setMenu({
      id,
      right: window.innerWidth - rect.right,
      // clamped so a row near the bottom does not push the menu off screen
      top: Math.min(rect.bottom + 6, window.innerHeight - MENU_H - 8),
    })
  }

  useEffect(() => {
    if (!menu) return undefined

    const onPointerDown = (e) => {
      // the trigger toggles the menu itself; letting this also fire would close
      // and reopen it in the same gesture
      if (e.target.closest?.('.h2c-chatmenu, .h2c-chatmenu-btn')) return
      closeMenu()
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu()
    }
    // capture, because the scroll happens on the list, not on window
    window.addEventListener('scroll', closeMenu, true)
    window.addEventListener('resize', closeMenu)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('scroll', closeMenu, true)
      window.removeEventListener('resize', closeMenu)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menu])

  if (collapsed) {
    return (
      <aside className="h2c-sidebar is-collapsed">
        <div className="h2c-rail">
          <button
            type="button"
            className="h2c-railbtn h2c-rail__home"
            onClick={onHome}
            aria-label="Ripple home"
            title="Ripple home"
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
          {/* Signed-in only, and not because it would fail — because it would
              be a link to a page that exists solely to show you your own
              history, offered to someone who has none. */}
          {signedIn && (
            <a
              className="h2c-railbtn"
              href="#/dashboard"
              aria-label="Progress dashboard"
              title="Progress dashboard"
            >
              <DashIcon size={17} />
            </a>
          )}
        </div>

        <div className="h2c-rail__foot">
          {signedIn ? (
            <>
              <ProfileBadge
                user={user}
                avatarClassName="h2c-sidebar__user-avatar"
                placement="top-start"
              />
              <button
                type="button"
                className="h2c-railbtn"
                onClick={onLogout}
                aria-label="Log out"
                title="Log out"
              >
                <LogOutIcon size={16} />
              </button>
            </>
          ) : (
            <a className="h2c-railbtn" href="#/signin" aria-label="Log in" title="Log in">
              <LogInIcon size={16} />
            </a>
          )}
        </div>
      </aside>
    )
  }

  const menuTitle = conversations.find((c) => c.id === menu?.id)?.title

  return (
    <aside className="h2c-sidebar">
      <div className="h2c-sidebar__head">
        <button
          type="button"
          className="h2c-brand h2c-brand--home"
          onClick={onHome}
          title="Ripple home"
        >
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
        {/* Under the primary action and styled a step quieter: starting a chat
            is what this panel is for, and reviewing what came of the last ones
            is the thing you do second. */}
        {signedIn && (
          <a className="h2c-sidelink" href="#/dashboard">
            <DashIcon />
            Progress
          </a>
        )}
      </div>

      <div className="h2c-sidebar__label">Recent</div>

      <div className="h2c-sidebar__list">
        {conversations.length === 0 ? (
          <div className="h2c-sidebar__empty">No conversations yet</div>
        ) : (
          conversations.map((c) =>
            c.id === renamingId ? (
              <div className="h2c-chatrow is-renaming" key={c.id}>
                <RenameField
                  value={c.title}
                  onCommit={(title) => {
                    setRenamingId(null)
                    onRename(c.id, title)
                  }}
                  onCancel={() => setRenamingId(null)}
                />
              </div>
            ) : (
              <div
                className={`h2c-chatrow${c.id === activeId ? ' is-active' : ''}${
                  c.id === menu?.id ? ' is-menuopen' : ''
                }`}
                key={c.id}
              >
                <button
                  type="button"
                  className="h2c-chatitem"
                  onClick={() => onSelect(c.id)}
                  title={c.title}
                >
                  {c.title}
                </button>
                <button
                  type="button"
                  className="h2c-chatmenu-btn"
                  aria-label={`Options for ${c.title}`}
                  aria-haspopup="menu"
                  aria-expanded={c.id === menu?.id}
                  onClick={(e) => (c.id === menu?.id ? closeMenu() : openMenu(e, c.id))}
                >
                  <MoreIcon />
                </button>
              </div>
            ),
          )
        )}
      </div>

      {menu && (
        <div
          className="h2c-chatmenu"
          role="menu"
          style={{ right: menu.right, top: menu.top }}
        >
          {confirming ? (
            /* Deleting takes the messages with it and there is no undo, so it
               costs a second click. Confirming in place rather than in a dialog
               keeps the chat's name in view while you decide. */
            <div className="h2c-chatmenu__confirm">
              <p className="h2c-chatmenu__ask">
                Delete <strong>{menuTitle}</strong>? This also deletes its messages.
              </p>
              <div className="h2c-chatmenu__actions">
                <button type="button" className="h2c-menubtn-sm" onClick={closeMenu}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="h2c-menubtn-sm is-danger"
                  onClick={() => {
                    const { id } = menu
                    closeMenu()
                    onDelete(id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                className="h2c-chatmenu__item"
                onClick={() => {
                  setRenamingId(menu.id)
                  closeMenu()
                }}
              >
                <PencilIcon />
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                className="h2c-chatmenu__item is-danger"
                onClick={() => setConfirming(true)}
              >
                <TrashIcon />
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Anonymous visitors get the whole app, so this row cannot assume there is
          an account behind it: an avatar reading "·" beside a log-out button for
          someone who never logged in is chrome describing a state that does not
          exist. They get the invitation instead. */}
      <div className="h2c-sidebar__user">
        {signedIn ? (
          <>
            <ProfileBadge
              user={user}
              avatarClassName="h2c-sidebar__user-avatar"
              placement="top-start"
            />
            <span className="h2c-sidebar__user-name" title={user.name}>
              {user.name}
            </span>
            <button
              type="button"
              className="h2c-logout"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOutIcon />
            </button>
          </>
        ) : (
          <a className="h2c-signin" href="#/signin">
            <LogInIcon size={15} />
            Log in to save your chats
          </a>
        )}
      </div>
    </aside>
  )
}
