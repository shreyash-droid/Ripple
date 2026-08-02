import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BinaryWaves from './components/BinaryWaves'
import Composer from './components/Composer'
import Hero from './components/Hero'
import ProfileBadge from './components/ProfileBadge'
import SessionProgress from './components/SessionProgress'
import Sidebar from './components/Sidebar'
import Thread from './components/Thread'
import TopBar from './components/TopBar'
import { MenuIcon } from './components/Icons'
import {
  API_BASE,
  askDocument,
  deleteConversation,
  getMessages,
  listConversations,
  renameConversation,
  sendChat,
  uploadAndProcess,
} from './lib/api'
import { MODES, modeConfig } from './lib/modes'
import { collectScorecards, summarizeSession } from './lib/scoring'
import { extractPdfText } from './lib/pdf'
import { useAuth } from './lib/auth-context'
import { displayName, initialsOf, peekPending, stashPending, takePending } from './lib/session'
import './styles/app.css'

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
   thing the transition animates. `entered` is what makes chat a "page", and
   anything that is not #/c — #/try included — leaves the stage at progress 0. */
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

/* Sends the visitor to the sign-in route, keeping the message they composed and
   the file they attached to it. Both, because in reviewer mode the attachment
   is often the whole turn and an empty box is normal — stashing only the text
   would land them back on the other side of the login with their resume gone
   and nothing to explain why. */
function requestSignIn(message, mode, attachment) {
  if (message || attachment) stashPending(message, mode, attachment)
  window.location.hash = '#/signin'
}

export default function App() {
  const { user, signedIn, signOut } = useAuth()
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

  /* A resume attached in reviewer mode. Deliberately nothing like the document
     above: it is never uploaded, chunked or embedded, because the reviewer
     scores the text you hand it rather than retrieving from a store. The file is
     read in the browser and its text is folded into the next message, so a
     resume that has been sent lives in the thread like anything else the user
     typed — and reloads, exports and history all work with no special case. */
  const [resume, setResume] = useState(null) // { name, status, text } | null

  const [conversations, setConversations] = useState([])
  // restored from the URL so a reload lands back in the conversation
  const [activeId, setActiveId] = useState(() => readRoute().conversationId)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  /* A message stashed on the way to sign-in was composed in a particular mode,
     and it has to be sent back in that mode or it meets the wrong rubric. Adopted
     in the initial state, not in an effect, so `send` below already closes over
     the right mode on the very first render and needs no resequencing. */
  const [mode, setMode] = useState(() => peekPending()?.mode || 'general')
  // a mode the user has asked for but not yet confirmed, since switching ends
  // the current chat; null when nothing is being asked
  const [pendingMode, setPendingMode] = useState(null)
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

  // the ask box stays locked until the worker has finished with the document,
  // and until a resume has actually been read out of its PDF
  const busy =
    loading ||
    animatingId !== null ||
    (mode === 'document' && docState === 'processing') ||
    (mode === 'reviewer' && resume?.status === 'processing')

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

  /* The wordmark goes home, and home is the front page — the same destination
     the mark has in the top rail and on the front page's own rail, because a
     logo that means three different things depending on which surface you are
     standing on is not a logo.
   *
   * It leaves App entirely, so nothing here resets the stage: assigning the
   * hash fires hashchange, Root swaps the surface, and this whole tree
   * unmounts. Conversations live on the server, so coming back through the
   * front page's action costs a list fetch and nothing else. */
  const goHome = () => {
    window.location.hash = '#/'
  }

  /* ---------------------------------------------------------------- *
   * data
   * ---------------------------------------------------------------- */

  /* Anonymous visitors have no conversations to list, and asking anyway would
     spend a 401 that the unauthorized handler reads as an expired session. */
  const refreshConversations = useCallback(
    () =>
      signedIn
        ? listConversations()
            .then((rows) => {
              setConversations(rows)
              return rows
            })
            .catch(() => [])
        : Promise.resolve([]),
    [signedIn],
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
    if (!signedIn || activeId == null || loadedIdRef.current === activeId) return
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
    // signedIn matters: the early return above leaves loadedIdRef untouched, so
    // without it a conversation opened before signing in would never load its
    // history afterwards.
  }, [activeId, signedIn])

  /* ---------------------------------------------------------------- *
   * actions
   * ---------------------------------------------------------------- */

  // Thread reports back when the typewriter finishes so the composer unlocks.
  const handleRevealDone = useCallback(() => setAnimatingId(null), [])

  const cancelReveal = () => setAnimatingId(null)

  /* `override` lets a caller send without waiting a render for state to land.
     Two shapes: a bare string is an empty-state starter's own text, and
     `{ text, attachment }` is a turn resumed from the other side of the sign-in
     gate, which has to bring back the resume that was on the composer when the
     user pressed send. The send button passes onSend straight to onClick, so a
     click arrives here as an event — neither shape, and it falls through to the
     draft and whatever is actually attached. */
  const send = async (override) => {
    const forced =
      typeof override === 'string'
        ? { text: override, attachment: null }
        : override && typeof override.text === 'string'
          ? { text: override.text, attachment: override.attachment ?? null }
          : null

    const text = (forced ? forced.text : draft).trim()
    // A ready resume is itself something to send, so an empty box is fine when
    // one is attached.
    const attached = forced
      ? forced.attachment
      : mode === 'reviewer' && resume?.status === 'ready'
        ? resume
        : null
    if ((!text && !attached) || busy) return

    /* The file rides in its own field from here on. It used to be folded into
       the message text right at this point, which meant the thread rendered the
       whole resume as the user's turn and their actual question ended up as a
       "Context:" footnote under it. The server keeps the two apart the same way
       — see composeUserTurn in handlers/chat.js, which is the only place they
       are ever one string, and only on the way into the model. */
    const outgoing = attached ? { name: attached.name, text: attached.text } : null

    /* The one moment we ask who they are. The stash carries the attachment too,
       so someone who attached a PDF and pressed send does not have to attach it
       again on the other side of the login. Nothing is cleared here — App is
       about to unmount, and if they abandon the sign-in the thread should be
       exactly as they left it. */
    if (!signedIn) {
      requestSignIn(text, mode, outgoing)
      return
    }

    /* The attachment stops being an attachment the moment it is sent: it is now
       part of the conversation on the server, so leaving it on the composer
       would submit the same resume again on the next turn. */
    if (attached) setResume(null)

    enterChat()

    setMessages((m) => [
      ...m,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        // the same shape getMessages returns, so an optimistic row and a
        // restored one render through one path — chip included
        meta: outgoing ? { attachment: { name: outgoing.name } } : null,
      },
    ])
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
        data = await sendChat({
          message: text,
          mode,
          conversationId: activeId,
          // present only on the turn the resume arrives, which is what tells the
          // reviewer to score it rather than answer a question about it
          attachment: outgoing,
        })
        replyText = data.reply ?? ''
        // the server runs the conversation's own mode, so if the two ever drift
        // the pill follows the turn that actually happened
        if (data.mode && data.mode !== mode) setMode(data.mode)
        if (data.conversationId && data.conversationId !== activeId) {
          loadedIdRef.current = data.conversationId
          setActiveId(data.conversationId)
        }
        // make the conversation addressable, without stacking a history entry
        writeRoute(data.conversationId ?? activeId, true)
      }
      const replyId = `assistant-${Date.now()}`
      setMessages((m) => [
        ...m,
        {
          id: replyId,
          role: 'assistant',
          content: replyText,
          // The workflow's structured output travels with the message it belongs
          // to, in the same shape getMessages returns it — so a reply that just
          // arrived and one restored from history render through one path.
          scorecard: data.scorecard ?? null,
          sources: data.sourcesUsed ?? null,
        },
      ])
      setLoading(false)
      setAnimatingId(replyId)
      if (mode !== 'document') refreshConversations()
    } catch (err) {
      setLoading(false)
      setMessages((m) => [...m, errorMessage(err)])
    }
  }

  /* The other side of the gate: send what they composed before signing in.
     `send` is rebuilt every render, so it is reached through a ref rather than
     named as a dependency — this has to fire once on arrival, not again on every
     keystroke. takePending clears as it reads, which is also what makes a
     double-invoked StrictMode effect harmless. */
  const sendRef = useRef(null)
  sendRef.current = send

  useEffect(() => {
    if (!signedIn) return
    const pending = takePending()
    // an attachment alone is a whole turn in reviewer mode, so either half is
    // enough to resume on
    if (pending?.message || pending?.attachment) {
      sendRef.current?.({ text: pending.message || '', attachment: pending.attachment ?? null })
    }
  }, [signedIn])

  /* Reviewer's upload. Reads the file in the browser and stops — no request, no
     ingestion queue — because the text is destined for the next message rather
     than for a vector store. */
  const attachResume = async (file) => {
    if (!file) return
    setResume({ name: file.name, status: 'processing', text: '' })

    try {
      const raw =
        file.type === 'application/pdf'
          ? await extractPdfText(file)
          : await file.text() // plain .txt fallback

      // pdf.js joins text items with spaces, which leaves ragged runs of
      // whitespace where a two-column resume layout was
      const text = raw.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim()

      /* A scanned or image-only resume extracts to nothing. Silently attaching an
         empty file would send the reviewer a blank message and earn a confused
         reply, so this fails loudly and says what to do instead. */
      if (!text) {
        throw new Error(
          `I couldn't read any text out of ${file.name} — it looks like a scan or an image. ` +
            'Try exporting it from your editor as a text PDF, or paste the text in directly.',
        )
      }

      setResume({ name: file.name, status: 'ready', text })
    } catch (err) {
      setResume({ name: file.name, status: 'failed', text: '' })
      setMessages((m) => [...m, errorMessage(err)])
    }
  }

  const handleUpload = async (file) => {
    if (!file) return

    /* Unlike a resume, a Q&A document cannot be read in the browser and held —
       it has to be embedded server-side to be retrievable, so this is the one
       attachment that needs a token before it can even start. There is no
       message to stash; they pick the file again on the other side. */
    if (!signedIn) {
      requestSignIn(null, mode)
      return
    }

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
    // whatever switch was being proposed, opening a conversation answers it:
    // this thread's own mode is the one that applies now
    setPendingMode(null)
    if (id === activeId) return
    cancelReveal()
    setLoading(false)
    setActiveId(id)
    writeRoute(id)
    const found = conversations.find((c) => c.id === id)
    if (found?.mode) setMode(found.mode)
  }

  // Everything that makes the thread show a conversation. Shared by "new chat"
  // and by deleting the conversation currently on screen, which has to land in
  // the same empty state rather than on a thread whose rows no longer exist.
  const clearActiveThread = () => {
    writeRoute(null)
    cancelReveal()
    setLoading(false)
    loadedIdRef.current = null
    setActiveId(null)
    setMessages([])
    // reset document context too, poll included
    uploadAbortRef.current?.abort()
    setDocumentId(null)
    setDocName(null)
    setDocState('idle')
    // an unsent resume belongs to the thread that was being composed
    setResume(null)
  }

  const newChat = () => {
    if (isDrawerWidth()) setSidebarCollapsed(true)
    setPendingMode(null)
    clearActiveThread()
    setDraft('')
  }

  /* One chat, one mode.
   *
   * A thread that changes rules halfway through is unreadable in both
   * directions: the user scrolls back through answers judged by a rubric that
   * no longer applies, and the session trend averages coach scores together
   * with resume scores as though they measured the same thing. So a mode switch
   * starts a new conversation instead of mutating the current one — which is
   * also what lets the backend treat conversations.mode as the truth.
   *
   * The confirmation is only asked when there is something to leave behind. On
   * an empty thread the switch costs nothing, and a dialog there would be
   * ceremony in front of the very first thing a new user tries. */
  const applyMode = (next) => {
    setPendingMode(null)
    if (next === mode) return
    setMode(next)
    clearActiveThread()
    // The draft deliberately survives. Pasting a resume and *then* realising you
    // are in the wrong mode is the common case, and clearing it punishes exactly
    // the user who is trying to do the right thing.
  }

  const requestModeChange = (next) => {
    if (next === mode) return setPendingMode(null)
    if (messages.length === 0) applyMode(next)
    else setPendingMode(next)
  }

  /* Rename and delete are optimistic: both are instant in the sidebar and rolled
     back if the request fails. The alternative — waiting on a round trip before
     the row changes — makes the sidebar feel broken on a slow connection, and
     the failure case here is rare and recoverable. */
  const renameChat = async (id, title) => {
    const before = conversations
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)))
    try {
      await renameConversation(id, title)
    } catch {
      setConversations(before)
    }
  }

  const deleteChat = async (id) => {
    const before = conversations
    setConversations((cs) => cs.filter((c) => c.id !== id))
    if (id === activeId) clearActiveThread()

    try {
      await deleteConversation(id)
    } catch {
      // put the row back; the thread stays cleared, which is recoverable by
      // clicking it again, whereas a half-deleted sidebar is not
      setConversations(before)
    }
  }

  /* What the sidebar and the avatars render. Derived from the token's user
     rather than stored, so it follows whoever is actually signed in. */
  const identity = useMemo(
    () => ({
      name: displayName(user),
      initials: initialsOf(user),
      email: user?.email || '',
      // set for Google accounts, null for email/password ones — AvatarContent
      // falls back to the initials either way
      avatar: user?.avatar_url || '',
    }),
    [user],
  )

  const activeConversation = conversations.find((c) => c.id === activeId)
  const title = activeConversation?.title || 'New chat'
  const config = modeConfig(mode)

  /* Document Q&A's quick actions.
   *
   * Every other mode puts its openers in the empty state, but this one's empty
   * state is shown *before* a document exists — offering "summarise this" there
   * would only earn "upload a document first". By the time there is something to
   * summarise, the "Loaded X" message has already retired the empty state. So
   * these are offered in the thread instead, and withdrawn once the first
   * question has been asked and they would be clutter. */
  const suggestions =
    mode === 'document' && docState === 'ready' && !messages.some((m) => m.role === 'user')
      ? (config.suggestions ?? [])
      : []

  /* Derived, not stored: every scored turn carries its own card, so the session
     trend is a fold over the thread. Reopening a conversation therefore restores
     the trend for free, and a turn the model failed to score simply doesn't
     contribute rather than leaving a gap in a running counter. */
  const session = useMemo(() => summarizeSession(collectScorecards(messages)), [messages])

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

          <TopBar user={identity} signedIn={signedIn} />

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
              onRename={renameChat}
              onDelete={deleteChat}
              user={identity}
              signedIn={signedIn}
              onLogout={signOut}
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
                <span className="h2c-main__mode">{config.label}</span>
                <ProfileBadge user={identity} className="h2c-header-avatar" />
              </div>

              {/* Only the evaluative modes ever produce one, so an ordinary chat
                  never carries scoring chrome it has no use for. */}
              {session && (
                <SessionProgress
                  summary={session}
                  subject={mode === 'reviewer' ? 'reviews' : 'answers'}
                />
              )}

              <Thread
                messages={messages}
                loading={loading}
                animatingId={animatingId}
                onRevealDone={handleRevealDone}
                empty={config.empty}
                onStarter={send}
                suggestions={suggestions}
                scoreLabel={config.scoreLabel}
              />
            </div>
          </div>

          <Composer
            draft={draft}
            onDraftChange={setDraft}
            onSend={send}
            modes={MODES}
            mode={mode}
            onModeChange={requestModeChange}
            pendingMode={pendingMode}
            onConfirmMode={applyMode}
            onCancelMode={() => setPendingMode(null)}
            busy={busy}
            /* Only the modes that declare an upload get a + — and never on the
               landing page, where the composer is a plain entry point and the
               mode pills are not even interactive yet. */
            showUpload={entered && Boolean(config.upload)}
            onUpload={mode === 'reviewer' ? attachResume : handleUpload}
            // detaching only makes sense for a file waiting to be sent; an
            // ingested document is the mode's whole subject
            onDetach={mode === 'reviewer' ? () => setResume(null) : undefined}
            attachName={mode === 'reviewer' ? (resume?.name ?? null) : docName}
            attachState={mode === 'reviewer' ? (resume?.status ?? 'idle') : docState}
            entered={entered}
          />
        </div>
      </div>
    </div>
  )
}

/* `withResume` used to live here, folding the resume into the message text
   before it was sent. It is gone: the attachment travels in its own field now,
   and the one place the two are ever a single string is composeUserTurn in
   backend/handlers/chat.js, on the way into the model. */

function errorMessage(err) {
  return {
    id: `error-${Date.now()}`,
    role: 'assistant',
    content: err?.message || 'Something went wrong. Please try again.',
    error: true,
  }
}