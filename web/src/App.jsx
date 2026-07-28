import { useCallback, useEffect, useRef, useState } from 'react'
import BinaryWaves from './components/BinaryWaves'
import Composer from './components/Composer'
import Hero from './components/Hero'
import Sidebar from './components/Sidebar'
import Thread from './components/Thread'
import TopBar from './components/TopBar'
import { CodeIcon, MenuIcon, SparkIcon, TargetIcon } from './components/Icons'
import {
  API_BASE,
  askDocument,
  getMessages,
  listConversations,
  sendChat,
  uploadAndProcess,
} from './lib/api'
import { extractPdfText } from './lib/pdf'
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
  {
    value: 'document',
    label: 'Document Q&A',
    hint: 'Upload a document and ask questions about it',
    Icon: SparkIcon,
  },
]

const USER = { name: 'Maya Chen', initials: 'M' }

// The stage is a 250vh scroller with a sticky 100vh viewport, so the usable
// scroll range is 150vh. `p` runs 0 → 1 across it and drives every transition.
const SCROLL_SPAN = 1.5
const COMPOSER_HEIGHT = 130
// how long the hero→chat commit takes when it is driven by sending, not scroll
const ENTER_DURATION = 720

// Below this the expanded sidebar would sit under the composer: the composer is
// centred on the thread, so its left edge is at vw/2 - 188px, which crosses the
// 264px panel at ~904px. Under 960 the sidebar becomes an overlay drawer.
const DRAWER_QUERY = '(max-width: 959px)'
const isDrawerWidth = () => window.matchMedia(DRAWER_QUERY).matches

/* Hash route, so a conversation survives a reload and the back button works.
   Deliberately not react-router: the hero and the chat are one continuous
   stage driven by --p, and splitting them across routes would unmount the very
   thing the transition animates. `entered` is what makes chat a "page". */
function readRoute() {
  const m = /^#\/c(?:\/(\d+))?$/.exec(window.location.hash)
  if (!m) return { entered: false, conversationId: null }
  return { entered: true, conversationId: m[1] ? Number(m[1]) : null }
}

function writeRoute(conversationId, replace = false) {
  const hash = conversationId != null ? `#/c/${conversationId}` : '#/c'
  if (window.location.hash === hash) return
  const url = `${window.location.pathname}${window.location.search}${hash}`
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url)
}

function clearRoute() {
  window.history.pushState(null, '', window.location.pathname + window.location.search)
}

export default function App() {
  const rootRef = useRef(null)
  const progressRef = useRef(0)
  const loadedIdRef = useRef(null)
  const enterRafRef = useRef(0)

  // Ingestion is queued and worked off asynchronously, so a document is not
  // answerable the moment the upload returns. docState tracks the worker.
  const [documentId, setDocumentId] = useState(null)
  const [docName, setDocName] = useState(null)
  const [docState, setDocState] = useState('idle') // idle | processing | ready | failed
  // lets a superseding upload, a new chat, or an unmount call off the poll
  const uploadAbortRef = useRef(null)

  const [conversations, setConversations] = useState([])
  // restored from the URL so a reload lands back in the conversation
  const [activeId, setActiveId] = useState(() => readRoute().conversationId)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState('general')
  const [loading, setLoading] = useState(false)
  // id of the reply Thread is currently typing out; null when nothing is
  // animating. Thread owns the reveal, this just says which message gets it.
  const [animatingId, setAnimatingId] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  // once a message is sent the landing page is retired; restored from the URL
  const [entered, setEntered] = useState(() => readRoute().entered)
  const enteredRef = useRef(entered)
  // mirrors activeId for callbacks that must not re-bind on every change
  const activeIdRef = useRef(activeId)

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  // the ask box stays locked until the worker has finished with the document
  const busy = loading || animatingId !== null || (mode === 'document' && docState === 'processing')

  /* ---------------------------------------------------------------- *
   * scroll-driven transition
   * ---------------------------------------------------------------- */

  const applyProgress = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const p = progressRef.current
    const vh = root.clientHeight || window.innerHeight
    // The composer is bottom-anchored in CSS; --drop is how far above that
    // resting spot it sits at the hero. Keep startTop in step with the hero
    // position the design was tuned to.
    const startTop = Math.max(vh * 0.36, vh * 0.14 + 195)

    root.style.setProperty('--p', String(p))
    root.style.setProperty('--drop', `${Math.max(0, vh - COMPOSER_HEIGHT - startTop)}px`)
    root.style.setProperty('--chat-pe', p > 0.6 ? 'auto' : 'none')
    root.style.setProperty('--hero-pe', p > 0.5 ? 'none' : 'auto')
  }, [])

  // Commit to the chat with no animation — used when --p is already at 1.
  // Collapsing the spacer is what makes the hero unreachable; the sidebar logo
  // is then the only way back.
  const commitEntered = useCallback(() => {
    if (enteredRef.current) return
    enteredRef.current = true
    cancelAnimationFrame(enterRafRef.current)
    progressRef.current = 1
    applyProgress()
    writeRoute(activeIdRef.current)
    setEntered(true)
  }, [applyProgress])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const onScroll = () => {
      // once committed to the chat the spacer is gone and --p stays pinned at 1
      if (enteredRef.current) return
      const vh = root.clientHeight || window.innerHeight
      const raw = Math.min(1, Math.max(0, root.scrollTop / (vh * SCROLL_SPAN)))
      // scrolling all the way through the spacer is itself a commit
      if (raw >= 0.995) {
        commitEntered()
        return
      }
      // easeInOut for a premium feel
      progressRef.current = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
      applyProgress()
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', applyProgress)

    if (enteredRef.current) {
      // restored straight into a conversation — skip the hero entirely
      progressRef.current = 1
      applyProgress()
    } else {
      onScroll()
    }

    return () => {
      root.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', applyProgress)
    }
  }, [applyProgress, commitEntered])

  // Auto-collapse once the composer would run under the panel.
  useEffect(() => {
    const mq = window.matchMedia(DRAWER_QUERY)
    const onChange = (e) => {
      if (e.matches) setSidebarCollapsed(true)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Back/forward between the hero and a conversation.
  useEffect(() => {
    const onPop = () => {
      const route = readRoute()
      enteredRef.current = route.entered
      setEntered(route.entered)
      progressRef.current = route.entered ? 1 : 0
      applyProgress()
      if (route.conversationId !== null) setActiveId(route.conversationId)
      if (!route.entered && rootRef.current) rootRef.current.scrollTop = 0
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [applyProgress])

  // Sending commits to the chat. Rather than smooth-scrolling (which leaves the
  // landing page one scroll-up away), drive --p to 1 on our own easing and then
  // collapse the spacer, so the hero is retired for the rest of the session.
  const enterChat = useCallback(() => {
    if (enteredRef.current) return
    enteredRef.current = true
    writeRoute(null)

    const from = progressRef.current
    const t0 = performance.now()

    const step = (now) => {
      const k = Math.min(1, (now - t0) / ENTER_DURATION)
      progressRef.current = from + (1 - from) * (1 - Math.pow(1 - k, 3))
      applyProgress()
      if (k < 1) enterRafRef.current = requestAnimationFrame(step)
      else setEntered(true)
    }

    enterRafRef.current = requestAnimationFrame(step)
  }, [applyProgress])

  useEffect(() => () => cancelAnimationFrame(enterRafRef.current), [])

  useEffect(() => () => uploadAbortRef.current?.abort(), [])

  // The sidebar logo is the only way back to the landing page.
  const goHome = () => {
    cancelAnimationFrame(enterRafRef.current)
    enteredRef.current = false
    setEntered(false)
    setSidebarCollapsed(true)
    clearRoute()
    progressRef.current = 0
    applyProgress()
    if (rootRef.current) rootRef.current.scrollTop = 0
  }

  /* ---------------------------------------------------------------- *
   * data
   * ---------------------------------------------------------------- */

  const refreshConversations = useCallback(
    () =>
      listConversations()
        .then((rows) => {
          setConversations(rows)
          return rows
        })
        .catch(() => []),
    [],
  )

  useEffect(() => {
    refreshConversations().then((rows) => {
      // a restored conversation carries its own mode; adopt it
      const restored = readRoute().conversationId
      const found = restored != null && rows.find((c) => c.id === restored)
      if (found?.mode) setMode(found.mode)
    })
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

  /* ---------------------------------------------------------------- *
   * actions
   * ---------------------------------------------------------------- */

  // Thread reports back when the typewriter finishes so the composer unlocks.
  const handleRevealDone = useCallback(() => setAnimatingId(null), [])

  const cancelReveal = () => setAnimatingId(null)

  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return

    enterChat()

    setMessages((m) => [...m, { id: `user-${Date.now()}`, role: 'user', content: text }])
    setDraft('')
    setLoading(true)

    try {
      let data, replyText
      if (mode === 'document') {
        // Only `ready` means the worker has stored the embeddings; asking any
        // earlier retrieves nothing and the answer is confidently empty.
        if (docState !== 'ready' || !documentId) {
          setLoading(false)
          setMessages((m) => [
            ...m,
            {
              id: `sys-${Date.now()}`,
              role: 'assistant',
              content:
                docState === 'failed'
                  ? `I couldn't process ${docName}. Try uploading it again.`
                  : 'Upload a document first, then ask your question.',
            },
          ])
          return
        }
        data = await askDocument({ question: text, documentId })
        replyText = data.answer ?? ''
      } else {
        data = await sendChat({ message: text, mode, conversationId: activeId })
        replyText = data.reply ?? ''
        if (data.conversationId && data.conversationId !== activeId) {
          loadedIdRef.current = data.conversationId
          setActiveId(data.conversationId)
        }
        // make the conversation addressable, without stacking a history entry
        writeRoute(data.conversationId ?? activeId, true)
      }
      const replyId = `assistant-${Date.now()}`
      setMessages((m) => [...m, { id: replyId, role: 'assistant', content: replyText }])
      setLoading(false)
      setAnimatingId(replyId)
      if (mode !== 'document') refreshConversations()
    } catch (err) {
      setLoading(false)
      setMessages((m) => [...m, errorMessage(err)])
    }
  }

  const handleUpload = async (file) => {
    if (!file) return

    // a second upload supersedes one still being embedded
    uploadAbortRef.current?.abort()
    const controller = new AbortController()
    uploadAbortRef.current = controller

    // the old document stops being askable the moment a new one is picked
    setDocumentId(null)
    setDocName(file.name)
    setDocState('processing')

    try {
      const text =
        file.type === 'application/pdf'
          ? await extractPdfText(file)
          : await file.text() // plain .txt fallback

      // resolves only once the worker has chunked, embedded and stored it
      const id = await uploadAndProcess(text, file.name, API_BASE, { signal: controller.signal })

      setDocumentId(id)
      setDocState('ready')
      setMessages((m) => [
        ...m,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          content: `Loaded **${file.name}** — ask me anything about it.`,
        },
      ])
    } catch (err) {
      if (err.name === 'AbortError') return // superseded; the newer upload owns the state
      setDocState('failed')
      setMessages((m) => [...m, errorMessage(err)])
    }
  }

  const selectConversation = (id) => {
    // where the sidebar is a drawer over the thread, picking dismisses it
    if (isDrawerWidth()) setSidebarCollapsed(true)
    commitEntered()
    if (id === activeId) return
    cancelReveal()
    setLoading(false)
    setActiveId(id)
    writeRoute(id)
    const found = conversations.find((c) => c.id === id)
    if (found?.mode) setMode(found.mode)
  }

  const newChat = () => {
    if (isDrawerWidth()) setSidebarCollapsed(true)
    writeRoute(null)
    cancelReveal()
    setLoading(false)
    loadedIdRef.current = null
    setActiveId(null)
    setMessages([])
    setDraft('')
    // reset document context on a fresh chat, poll included
    uploadAbortRef.current?.abort()
    setDocumentId(null)
    setDocName(null)
    setDocState('idle')
  }

  const activeConversation = conversations.find((c) => c.id === activeId)
  const title = activeConversation?.title || 'New chat'

  return (
    <div
      className={`h2c-root${entered ? ' is-entered' : ''}`}
      ref={rootRef}
      data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}
    >
      <div className={`h2c-scroll${entered ? ' is-entered' : ''}`}>
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
            {!sidebarCollapsed && (
              <button
                type="button"
                className="h2c-scrim"
                aria-label="Close sidebar"
                onClick={() => setSidebarCollapsed(true)}
              />
            )}

            <Sidebar
              conversations={conversations}
              activeId={activeId}
              onSelect={selectConversation}
              onNewChat={newChat}
              onHome={goHome}
              user={USER}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((v) => !v)}
            />

            <div className="h2c-main">
              <div className="h2c-main__header">
                <button
                  type="button"
                  className="h2c-menubtn"
                  onClick={() => setSidebarCollapsed(false)}
                  aria-label="Open sidebar"
                >
                  <MenuIcon />
                </button>
                <span className="h2c-main__title">{title}</span>
                <span className="h2c-main__mode">{MODES.find((m) => m.value === mode)?.label}</span>
                <button type="button" className="h2c-avatar h2c-header-avatar" aria-label="Account">
                  {USER.initials}
                </button>
              </div>

              <Thread
                messages={messages}
                loading={loading}
                animatingId={animatingId}
                onRevealDone={handleRevealDone}
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
            showUpload={mode === 'document'}
            onUpload={handleUpload}
            docName={docName}
            docState={docState}
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