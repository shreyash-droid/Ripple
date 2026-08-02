// Thin client over the serverless backend (see backend/serverless.yml).
// In dev, VITE_API_BASE is empty and Vite proxies /api to serverless-offline.
// In prod, set VITE_API_BASE to the deployed httpApi URL.

import { getToken } from './session'

export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

/* Every handler behind /api now calls requireAuth, so a 401 means the token is
   missing, expired or bad — the session is over regardless of which. The
   provider registers a handler here so one rejected request tears the session
   down everywhere instead of each caller discovering it separately. */
let onUnauthorized = null

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

// The auth endpoints are the one place a 401 is an answer rather than an
// expired session — "wrong password" must not log you out of the tab.
const isAuthPath = (path) => path.startsWith('/api/auth/')

async function request(path, options = {}, base = API_BASE) {
  const token = getToken()

  const res = await fetch(`${base}${path}`, {
    ...options,
    // built after the spread so a caller's own headers merge rather than
    // replace the ones every request needs
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : null),
      ...options.headers,
    },
  })

  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Unexpected response from ${path}`)
  }

  if (res.status === 401 && !isAuthPath(path)) onUnauthorized?.()

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

/* ------------------------------------------------------------------ *
 * auth
 * ------------------------------------------------------------------ */

/* All three resolve to the same { token, user } shape — the frontend never
   cares which credential got you in, only that there's a token to carry. */

export function signup({ name, email, password }) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function login({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/** `credential` is the ID token Google Identity Services hands the button. */
export function googleAuth(credential) {
  return request('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })
}

export function listConversations() {
  return request('/api/conversations').then((d) => d.conversations || [])
}

export function getMessages(conversationId) {
  return request(`/api/conversations/${conversationId}/messages`).then((d) => d.messages || [])
}

export function renameConversation(conversationId, title) {
  return request(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  }).then((d) => d.conversation)
}

export function deleteConversation(conversationId) {
  return request(`/api/conversations/${conversationId}`, { method: 'DELETE' })
}

/* Every scored turn the user has, oldest first — the dashboard's only read.
   Returned whole rather than pre-aggregated: lib/progress.js does the folding
   so the 0-5 → 0-100 rescaling in lib/scoring.js stays the single copy. */
export function getProgress() {
  return request('/api/progress')
}

/* `attachment` is `{ name, text }` on the turn that submits a resume, and null
   otherwise. It travels in its own field rather than glued into `message`: the
   message is what the user typed and is what the thread renders and the server
   stores, and a turn whose visible content was forty lines of somebody's own
   resume was hiding their question inside their evidence. Its presence is also
   what tells the reviewer "here is my resume" from "about that bullet in my
   resume" — the first kind is scored, the second is answered. */
export function sendChat({ message, mode, conversationId, attachment = null }) {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      mode,
      conversationId: conversationId ?? undefined,
      attachment,
    }),
  })
}

/* ------------------------------------------------------------------ *
 * document ingestion
 * ------------------------------------------------------------------ */

/* Ingestion is asynchronous. POST /api/ingest only stages the text and drops a
   job on the queue — it answers 202 { status: 'processing' } long before the
   document is answerable. The worker does the slow part (chunk → embed →
   store) and flips the row to `ready`, so the only way to know the document is
   usable is to poll it. Ask before then and retrieval matches nothing. */

const POLL_INTERVAL_MS = 1500
// generous: the worker itself is capped at 300s, plus SQS delivery
const POLL_TIMEOUT_MS = 5 * 60 * 1000

function abortError() {
  return new DOMException('Upload cancelled', 'AbortError')
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(abortError())
      },
      { once: true },
    )
  })
}

export function getDocumentStatus(documentId, base = API_BASE, { signal } = {}) {
  return request(`/api/documents/${documentId}`, { signal }, base)
}

/* Upload a document and resolve only once the worker has finished with it.
   Resolves with the documentId (safe to ask against); rejects if the worker
   failed, if polling timed out, or if `signal` was aborted. */
export async function uploadAndProcess(text, filename, base = API_BASE, { signal } = {}) {
  const { documentId } = await request(
    '/api/ingest',
    { method: 'POST', body: JSON.stringify({ text, filename }), signal },
    base,
  )

  const deadline = Date.now() + POLL_TIMEOUT_MS

  for (;;) {
    await sleep(POLL_INTERVAL_MS, signal)
    const doc = await getDocumentStatus(documentId, base, { signal })

    if (doc.status === 'ready') return documentId
    if (doc.status === 'failed') {
      throw new Error(doc.error || `Could not process ${filename}.`)
    }
    if (Date.now() > deadline) {
      throw new Error(`${filename} is taking longer than expected. Try uploading it again.`)
    }
  }
}

export function askDocument({ question, documentId }) {
  return request('/api/ask', {
    method: 'POST',
    body: JSON.stringify({ question, documentId }),
  })
}
