POST /api/chat
body: { conversationId, mode, message }
response: text/event-stream — chunks of { type: "token", content: "..." }
                              ends with { type: "done", messageId }

GET /api/conversations
response: [{ id, title, mode, updatedAt }]

GET /api/conversations/:id/messages
response: [{ id, role, content, createdAt }]