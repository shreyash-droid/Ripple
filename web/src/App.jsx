import { useCallback, useEffect, useRef, useState } from 'react'
import BinaryWaves from './components/BinaryWaves'
import Composer from './components/Composer'
import Hero from './components/Hero'
import Sidebar from './components/Sidebar'
import Thread from './components/Thread'
import TopBar from './components/TopBar'
import { CodeIcon, SparkIcon, TargetIcon } from './components/Icons'
import { getMessages, listConversations, sendChat } from './lib/api'
import './styles/app.css'

// Mirrors MODE_PROMPTS in backend/lib/llm.js.
const MODES = [
  { value: 'general', label: 'General', hint: 'A helpful, friendly assistant', Icon: SparkIcon },
  {
    value: 'coach',
    label: 'Coach',
    hint: 'Interview coaching with constructive feedback',
    Icon: TargetIcon,
  },
  {
    value: 'reviewer',
    label: 'Reviewer',
    hint: 'Senior code review — bugs, style, improvements',
    Icon: CodeIcon,
  },
]

const USER = { name: 'Maya Chen', initials: 'M' }

// The stage is a 250vh scroller with a sticky 100vh viewport, so the usable
// scroll range is 150vh. `p` runs 0 → 1 across it and drives every transition.
const SCROLL_SPAN = 1.5
const COMPOSER_HEIGHT = 130

export default function App() {
  const rootRef = useRef(null)
  const progressRef = useRef(0)
  const streamTimerRef = useRef(null)
  const loadedIdRef = useRef(null)

  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState('general')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const busy = loading || streaming

  /* ---------------------------------------------------------------- *
   * scroll-driven transition
   * ---------------------------------------------------------------- */

  const applyProgress = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const p = progressRef.current
    const vh = root.clientHeight || window.innerHeight
    // The composer starts where the CSS `top` puts it and drops to the bottom.
    // Mirrors the `top` in .h2c-composer.
    const startTop = Math.max(vh * 0.36, vh * 0.14 + 195)

    root.style.setProperty('--p', String(p))
    root.style.setProperty('--drop', `${Math.max(0, vh - COMPOSER_HEIGHT - startTop)}px`)
    root.style.setProperty('--chat-pe', p > 0.6 ? 'auto' : 'none')
    root.style.setProperty('--hero-pe', p > 0.5 ? 'none' : 'auto')
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const onScroll = () => {
      const vh = root.clientHeight || window.innerHeight
      const raw = Math.min(1, Math.max(0, root.scrollTop / (vh * SCROLL_SPAN)))
      // easeInOut for a premium feel
      progressRef.current = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
      applyProgress()
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', applyProgress)
    onScroll()

    return () => {
      root.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', applyProgress)
    }
  }, [applyProgress])

  const scrollToChat = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const vh = root.clientHeight || window.innerHeight
    root.scrollTo({ top: vh * SCROLL_SPAN, behavior: 'smooth' })
  }, [])

  /* ---------------------------------------------------------------- *
   * data
   * ---------------------------------------------------------------- */

  const refreshConversations = useCallback(
    () => listConversations().then(setConversations).catch(() => {}),
    [],
  )

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  // Load history when a conversation is picked from the sidebar. Conversations
  // we just created by sending are pre-marked in loadedIdRef so we don't
  // refetch over the reply that is still streaming in.
  useEffect(() => {
    if (activeId == null || loadedIdRef.current === activeId) return
    loadedIdRef.current = activeId
    let cancelled = false
    getMessages(activeId)
      .then((rows) => {
        if (!cancelled) setMessages(rows)
      })
      .catch((err) => {
        if (!cancelled) setMessages([errorMessage(err)])
      })
    return () => {
      cancelled = true
    }
  }, [activeId])

  useEffect(() => () => clearInterval(streamTimerRef.current), [])

  /* ---------------------------------------------------------------- *
   * actions
   * ---------------------------------------------------------------- */

  const stopStream = () => {
    clearInterval(streamTimerRef.current)
    streamTimerRef.current = null
    setStreaming(false)
  }

  // The backend replies in one shot; reveal it progressively so the thread
  // reads the way the design does. Pace is normalised so long and short
  // replies both land in roughly a second and a half.
  const streamReply = (full) => {
    clearInterval(streamTimerRef.current)
    const step = Math.max(2, Math.ceil(full.length / 90))
    let i = 0

    setLoading(false)
    setStreaming(true)
    setMessages((m) => [...m, { id: `assistant-${Date.now()}`, role: 'assistant', content: '' }])

    streamTimerRef.current = setInterval(() => {
      i = Math.min(full.length, i + step)
      const slice = full.slice(0, i)
      setMessages((m) => {
        const next = m.slice()
        next[next.length - 1] = { ...next[next.length - 1], content: slice }
        return next
      })
      if (i >= full.length) stopStream()
    }, 16)
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return

    if (progressRef.current < 0.9) scrollToChat()

    setMessages((m) => [...m, { id: `user-${Date.now()}`, role: 'user', content: text }])
    setDraft('')
    setLoading(true)

    try {
      const data = await sendChat({ message: text, mode, conversationId: activeId })
      if (data.conversationId && data.conversationId !== activeId) {
        loadedIdRef.current = data.conversationId
        setActiveId(data.conversationId)
      }
      streamReply(data.reply)
      refreshConversations()
    } catch (err) {
      setLoading(false)
      setMessages((m) => [...m, errorMessage(err)])
    }
  }

  const selectConversation = (id) => {
    if (id === activeId) return
    stopStream()
    setLoading(false)
    setActiveId(id)
    const found = conversations.find((c) => c.id === id)
    if (found?.mode) setMode(found.mode)
  }

  const newChat = () => {
    stopStream()
    setLoading(false)
    loadedIdRef.current = null
    setActiveId(null)
    setMessages([])
    setDraft('')
  }

  const activeConversation = conversations.find((c) => c.id === activeId)
  const title = activeConversation?.title || 'New chat'

  return (
    <div className="h2c-root" ref={rootRef}>
      <div className="h2c-scroll">
        <div className="h2c-stage">
          <div className="h2c-ambient">
            <div className="h2c-ambient__wake">
              <div className="h2c-ambient__glow" />
            </div>
          </div>

          <BinaryWaves progressRef={progressRef} />

          <Hero />

          <TopBar initials={USER.initials} />

          <div className="h2c-chat">
            <Sidebar
              conversations={conversations}
              activeId={activeId}
              onSelect={selectConversation}
              onNewChat={newChat}
              user={USER}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((v) => !v)}
            />

            <div className="h2c-main">
              <div className="h2c-main__header">
                <span className="h2c-main__title">{title}</span>
                <span className="h2c-main__mode">{MODES.find((m) => m.value === mode)?.label}</span>
              </div>

              <Thread
                messages={messages}
                loading={loading}
                streaming={streaming}
                emptyHint="Ask anything — pick a mode below to shape how Ripple answers."
              />
            </div>
          </div>

          <Composer
            draft={draft}
            onDraftChange={setDraft}
            onSend={send}
            modes={MODES}
            mode={mode}
            onModeChange={setMode}
            busy={busy}
          />
        </div>
      </div>
    </div>
  )
}

function errorMessage(err) {
  return {
    id: `error-${Date.now()}`,
    role: 'assistant',
    content: err?.message || 'Something went wrong. Please try again.',
    error: true,
  }
}
