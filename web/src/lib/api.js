// Thin client over the serverless backend (see backend/serverless.yml).
// In dev, VITE_API_BASE is empty and Vite proxies /api to serverless-offline.
// In prod, set VITE_API_BASE to the deployed httpApi URL.

export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function request(path, options = {}, base = API_BASE) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Unexpected response from ${path}`)
  }

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
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

export function sendChat({ message, mode, conversationId }) {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, mode, conversationId: conversationId ?? undefined }),
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
