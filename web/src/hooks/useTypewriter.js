import { useEffect, useState } from 'react'

/**
 * Reveals `fullText` progressively, one word at a time.
 * Returns the portion shown so far — it equals `fullText` once finished, so
 * callers can test `shown === fullText` to know it is done.
 *
 * Pass `enabled: false` to skip the animation and get the text whole (history
 * messages, reduced-motion). The hook still runs, so it stays safe to call
 * unconditionally.
 */
export function useTypewriter(fullText, speed = 15, enabled = true) {
  const text = fullText ?? ''
  const [state, setState] = useState({ text, count: 0 })

  // Restarting when the source text changes is done during render, not in an
  // effect: an effect would set state after a committed paint and cascade a
  // second render (react-hooks/set-state-in-effect).
  if (state.text !== text) {
    setState({ text, count: 0 })
  }

  const words = text ? text.split(' ') : []
  const count = enabled ? (state.text === text ? state.count : 0) : words.length
  const done = count >= words.length

  useEffect(() => {
    if (!enabled || done) return undefined
    const timer = setInterval(() => {
      // ignore ticks left over from a previous text
      setState((s) => (s.text === text ? { text: s.text, count: s.count + 1 } : s))
    }, speed * 4) // ~60ms per word at the default speed
    return () => clearInterval(timer)
  }, [text, speed, enabled, done])

  return words.slice(0, count).join(' ')
}
