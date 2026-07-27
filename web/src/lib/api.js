// Thin client over the serverless backend (see backend/serverless.yml).
// In dev, VITE_API_BASE is empty and Vite proxies /api to serverless-offline.
// In prod, set VITE_API_BASE to the deployed httpApi URL.

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
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

export function sendChat({ message, mode, conversationId }) {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, mode, conversationId: conversationId ?? undefined }),
  })
}
