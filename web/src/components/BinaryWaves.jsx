import { useEffect, useRef } from 'react'

// Three halftone wave layers of drifting 0/1 digits: dense at the bottom,
// dissolving toward the crest. `base` puts the crest at 60% of the height, so
// the field fills the bottom 40% of the screen. The waves recede, flatten and
// phase-shift as scroll progress (`progressRef`) moves hero → chat.
/* `alpha` is the layer's ceiling, and the digits never reach it: the depth
   factor below scales each one by 0.3–1.0 by how far it sits under the crest, so
   a 0.32 layer draws its faintest digits at about 0.1. These were 0.2 / 0.14 /
   0.1, which put the crest of the nearest layer at 6% over near-black — the
   field read as a smudge rather than as digits, and the scrim over it took what
   was left. Raised together and in proportion, so the three layers keep their
   depth order: nearest brightest, furthest faintest. */
const LAYERS = [
  { base: 0.6, amp: 0.055, k: 0.0045, k2: 0.011, speed: 0.3, color: '124,240,255', alpha: 0.32 },
  { base: 0.645, amp: 0.07, k: 0.0032, k2: 0.008, speed: -0.2, color: '41,121,255', alpha: 0.23 },
  { base: 0.69, amp: 0.085, k: 0.0024, k2: 0.006, speed: 0.13, color: '124,111,255', alpha: 0.17 },
]

// Cursor interaction: the crest bulges upward toward the pointer, digits in
// range brighten, and the ones nearest it flip more often.
const BULGE_HEIGHT = 54
const BULGE_SIGMA = 150

export default function BinaryWaves({ progressRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const isMobile = window.innerWidth < 760
    const cell = isMobile ? 26 : 17
    const radius = isMobile ? 150 : 230
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    const cursor = { x: -9999, y: -9999 }
    const target = { x: -9999, y: -9999 }

    let w = 0
    let h = 0
    let cols = 0
    let rows = 0
    let digits = []
    let thresh = []

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / cell) + 1
      rows = Math.ceil(h / cell) + 1
      digits = Array.from({ length: cols * rows }, () => (Math.random() < 0.5 ? '0' : '1'))
      thresh = Array.from({ length: cols * rows }, () => Math.random())
    }

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect()
      target.x = e.clientX - r.left
      target.y = e.clientY - r.top
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })

    let t = 0
    let frame = 0

    const loop = () => {
      t += 0.016
      cursor.x += (target.x - cursor.x) * 0.08
      cursor.y += (target.y - cursor.y) * 0.08

      // occasional digit flips
      for (let f = 0; f < 4; f++) {
        const i = (Math.random() * digits.length) | 0
        digits[i] = digits[i] === '0' ? '1' : '0'
      }

      ctx.clearRect(0, 0, w, h)
      ctx.font = `${cell - 5}px "JetBrains Mono", monospace`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'

      const sp = progressRef.current || 0
      const sink = h * 0.18 * sp
      const flat = 1 - sp * 0.65
      const phase = sp * 2.4

      // How strongly the pointer pulls at the surface: full effect when it
      // hovers the field, fading out as it moves up into the hero.
      const inField = cursor.y > -1000
      const reach = inField ? Math.max(0, 1 - Math.max(0, h * 0.5 - cursor.y) / (h * 0.5)) : 0

      for (let L = 0; L < LAYERS.length; L++) {
        const ly = LAYERS[L]
        for (let c = 0; c < cols; c++) {
          const x = c * cell + cell / 2
          // the crest lifts toward the pointer, most on the nearest layer
          const cdx = x - cursor.x
          const bulge =
            reach > 0
              ? Math.exp(-(cdx * cdx) / (2 * BULGE_SIGMA * BULGE_SIGMA)) *
                BULGE_HEIGHT *
                reach *
                (1 - L * 0.22)
              : 0
          // wave surface: two harmonics for a livelier crest
          const surf =
            h * ly.base +
            sink -
            bulge +
            Math.sin(x * ly.k + t * ly.speed + phase + L * 1.7) * h * ly.amp * flat +
            Math.sin(x * ly.k2 - t * ly.speed * 0.6 + phase * 0.7 + L) * h * ly.amp * 0.35 * flat
          const r0 = Math.max(0, Math.floor(surf / cell))

          for (let r2 = r0; r2 < rows; r2++) {
            const y = r2 * cell + cell / 2
            const depth = Math.min(1, (y - surf) / (h - surf + 1))
            // halftone dropout: sparse at the crest, dense below
            const density = Math.min(1, depth * 2.2 + 0.04)
            const idx = r2 * cols + c
            if (thresh[idx] > density) continue

            let a = ly.alpha * (0.3 + 0.7 * depth)
            const dx = x - cursor.x
            const dy = y - cursor.y
            const d2 = dx * dx + dy * dy
            if (d2 < radius * radius) {
              const boost = 1 - Math.sqrt(d2) / radius
              a += boost * boost * 0.34
              // digits right under the pointer churn
              if (boost > 0.55 && Math.random() < 0.025) {
                digits[idx] = digits[idx] === '0' ? '1' : '0'
              }
            }

            ctx.fillStyle = `rgba(${ly.color},${a.toFixed(3)})`
            ctx.fillText(digits[idx], x, y)
          }
        }
      }

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [progressRef])

  return (
    <>
      <canvas ref={canvasRef} className="h2c-binary" aria-hidden="true" />
      <div className="h2c-binary-scrim" />
    </>
  )
}
