import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ProfileBadge from '../components/ProfileBadge'
import { DocIcon, ResumeIcon, SparkIcon, TargetIcon } from '../components/Icons'
import { useAuth } from '../lib/auth-context'
import { displayName, initialsOf } from '../lib/session'
/* For .h2c-avatar and the account popover the badge in the rail is built from.
   Same reason AuthScreen imports it: every rule in there is .h2c-scoped, so it
   carries nothing else onto this page, and the alternative is restating the
   avatar and its popover a third time in .rl- prefixes. */
import '../styles/app.css'
/* The one threshold, imported rather than restated. This page draws the line at
   75 in two charts and the dashboard draws it in two more; a second copy of the
   number is a second thing that can drift away from the band anchors in
   backend/lib/rubrics.js. */
import { STRONG } from '../lib/progress'
import '../styles/landing.css'

/* ══════════════════════════════════════════════════════════════════════════
 * DIRECTION CONTRACT — the front page (Persuade)
 *
 * This is what a stranger arrives at. It used to be a side trip off the product
 * — you met the chat hero first and could click through to the argument — which
 * had the order backwards: the hero asserts, this page proves, and nobody is
 * persuaded by the assertion they have already skipped past. So the two swapped.
 * Every action here leaves for ENTER, the hero, which is now a door rather than
 * a front page and is reached only by pressing something.
 *
 * THESIS: The page is the system powering up and granting access. It refuses
 *   the AI-startup scaffold — hero, three feature cards, logo wall, testimonial
 *   — because Ripple's claim is not "we have features", it is "you will be
 *   measured, and the number will move".
 *
 * OWN-WORLD: A near-black console field lit by a single ice-cyan wash — full
 *   bleed at the open, an inset frame at the close. Hairline rules and a dotted
 *   grid instead of cards. Bracketed mono is the entire button vocabulary;
 *   JetBrains Mono carries only addresses and measurements, Inter carries voice
 *   at extreme size contrast. No gradient text, no glass for decoration. The
 *   one hue is the accent; red and amber appear only as the published score
 *   bands, never as decoration.
 *
 * STORY: A skeptic who has used generic AI chat sees a real scored turn happen,
 *   understands four modes means four rubrics, believes the score because the
 *   criteria and their notes are on the page, and presses START A CHAT.
 *
 * FIRST VIEWPORT: Cyan-to-black vertical wash, full bleed — no stroke, no
 *   radius, no inset, and the dotted field runs to both edges of the screen.
 *   Top rail: brand left, status readout centre, [ START A CHAT ] right.
 *   Centre: two lines of uppercase display at clamp(2.1rem, 7.4vw, 5.5rem),
 *   then the mark at scale — a lit sphere in three banks of drifting fog, ringed
 *   by four tilted orbits that pass behind it and back out, two of them carrying
 *   a travelling dash — flanked symmetrically by two mono captions. The
 *   assembly is layered, never 3D: far arcs, sphere, near arcs, fog. Primary
 *   action — the same
 *   [ START A CHAT ], loud — sits bottom-centre, and the view boots.
 *
 * ONE INTERACTION: the pointer is the light. This world is lit by a single
 *   ice-cyan source, so moving across the first viewport moves that source —
 *   the terminator swings round the sphere, the specular follows it, the fog
 *   parallaxes the other way and the orbits roll with it. A sphere proves it
 *   has a form by being lit from somewhere, which is the one thing the flat
 *   tile could not do.
 *
 * FORM: Candidate 7 of 7 on the grounded list — "the surface as a system coming
 *   online". Seed key 079787b2, surface scope, degraded roll (no challengers
 *   were dealt; the roll service was unreachable).
 * ══════════════════════════════════════════════════════════════════════════ */

/* The door out of this page and into the product: App's stage at rest, which is
   the hero. Named once because five controls point at it and a page whose only
   job is to send you somewhere cannot afford one of them going somewhere else. */
const ENTER = '#/try'

/* One authored motion moment for the whole page: sections resolve as they are
   reached, staggered by child index. The default state is *visible* — the
   observer removes a class rather than adding one — so no JS and no
   prefers-reduced-motion means a complete page, never a blank one. */
function useReveal() {
  const ref = useRef(null)

  /* useLayoutEffect, not useEffect: an effect runs after paint, so hiding the
     targets there meant the whole page rendered complete, snapped to blank, then
     faded back in — a flicker on the one viewport that has to land. */
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || typeof IntersectionObserver === 'undefined') return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    /* Anything already on screen at first paint is simply present. The opening
       frame is not something to reveal on scroll — it is what the visitor
       arrived at, and it has its own boot sequence in CSS. */
    const waiting = [...root.querySelectorAll('[data-reveal]')].filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.85,
    )
    waiting.forEach((el) => el.classList.add('is-waiting'))

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.remove('is-waiting')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    )
    waiting.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return ref
}

/* The action, kept within reach of the whole page.
 *
 * The opening view carries the loud one, but this is a five-section scroll and
 * a front page whose primary action is four screens behind the reader is a
 * front page that argues its case and then makes you go looking. So it comes
 * back as a floating command through the middle of the page.
 *
 * "The middle" is defined by the views that already carry an action — the boot
 * at the open, the dashboard section's own command, and the access frame at the
 * close — rather than by a scroll offset. That is what guarantees the floating
 * copy can never appear beside a real one: it exists exactly in the gap where
 * none of them is on screen, so the page never shows two commands at once.
 *
 * The dashboard section is in that list for a reason that cost a bug: it is
 * mid-page, so the floating command was live while it was being read, and once
 * the section stacks to one column its own [ Open your dashboard ] sits bottom-
 * left of the viewport with a fixed [ Start a chat ] pinned bottom-right. Two
 * different destinations, close enough to hit the wrong one — and on a narrow
 * screen they overlap outright. An anchor is the fix, not a z-index.
 *
 * Stays false where IntersectionObserver is missing, which is the right
 * degradation: the in-page actions are still there, unmoved.
 */
function useJump() {
  const bootRef = useRef(null)
  const boardRef = useRef(null)
  const accessRef = useRef(null)
  const [away, setAway] = useState(false)

  useEffect(() => {
    const anchors = [bootRef.current, boardRef.current, accessRef.current].filter(Boolean)
    if (!anchors.length || typeof IntersectionObserver === 'undefined') return undefined

    /* One observer, one map, because the answer is about both anchors at once —
       two independent booleans in state would let a render land between them
       and flash the control on as the closing frame arrives. */
    const onScreen = new Map(anchors.map((el) => [el, true]))

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) onScreen.set(entry.target, entry.isIntersecting)
        setAway(![...onScreen.values()].some(Boolean))
      },
      { threshold: 0 },
    )
    anchors.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return [bootRef, boardRef, accessRef, away]
}

/* ---------------------------------------------------------------- *
 * content
 * ---------------------------------------------------------------- */

/* The four bays. `criteria` are the real rubric keys the backend scores, kept
   in step with backend/lib/rubrics.js — the page would lose its whole argument
   if it advertised a rubric the product does not run. */
const BAYS = [
  {
    address: 'GEN',
    name: 'General',
    Icon: SparkIcon,
    line: 'A direct assistant with no ceremony.',
    body:
      'No rubric, no scoring, no workflow. When you want a straight answer rather than an ' +
      'assessment, this is the mode that gets out of the way.',
    criteria: null,
    signal: 'UNSCORED — CONVERSATIONAL',
  },
  {
    address: 'CO',
    name: 'Coach',
    Icon: TargetIcon,
    line: 'A mock interview that grades you and raises the bar.',
    body:
      'Name the role and it starts asking. Every answer is scored, told what worked and what ' +
      'to tighten, and followed by a harder question — or the same ground again if you did ' +
      'not earn the harder one.',
    criteria: ['structure', 'specifics', 'impact', 'ownership'],
    signal: 'SCORED 0–100 · TREND TRACKED',
  },
  {
    address: 'RES',
    name: 'Resume Review',
    Icon: ResumeIcon,
    line: 'A hiring manager reading your resume in the six seconds it really gets.',
    body:
      'Attach a PDF or paste it in. Findings quote your own bullets, weak ones come back ' +
      'rewritten so you can paste the stronger version straight in, and one change is named ' +
      'as the one to make first.',
    criteria: ['impact', 'relevance', 'clarity', 'credibility'],
    signal: 'SCORED 0–100 · PDF INTAKE',
  },
  {
    address: 'DOC',
    name: 'Document Q&A',
    Icon: DocIcon,
    line: 'Answers built only from passages it can point at.',
    body:
      'Upload a document and it is chunked, embedded and retrieved against. Every claim cites ' +
      'the passage it stood on, and when the passages do not contain the answer it says so ' +
      'instead of filling the gap from memory.',
    criteria: null,
    signal: 'RETRIEVAL · INLINE CITATIONS',
  },
]

/* A reconstructed coach turn. Synthetic by construction — it is written to be a
   believable mediocre answer, because a demonstration that scores 95 proves
   nothing about a rubric. Labelled as synthetic on the page. */
const DEMO = {
  question: 'Tell me about a time you disagreed with a senior engineer.',
  answer:
    'I had a disagreement with a senior engineer about our architecture. I felt strongly that ' +
    'my approach was better, so I explained my reasoning and we discussed it as a team. ' +
    'Eventually we came to a good solution together and the project went well.',
  overall: 41,
  criteria: [
    { key: 'structure', label: 'Structure', score: 58, note: 'A shape is there, but the result arrives as a summary rather than an outcome.' },
    { key: 'specifics', label: 'Specifics', score: 22, note: 'No system, no timeline, no number. "Our architecture" could be any team on earth.' },
    { key: 'impact', label: 'Impact', score: 30, note: '"The project went well" is not a result a listener can weigh.' },
    { key: 'ownership', label: 'Ownership', score: 54, note: 'Explains what you argued, then hands the decision to "we" without saying what you did.' },
  ],
  verdict: 'A safe answer that a committee would forget by the afternoon.',
  next: 'Re-run this with one number in it — how long the migration took, or how many services it touched.',
}

// One session, three turns. The whole product argument in three integers.
const TREND = [
  { turn: 1, score: 41, label: 'first attempt' },
  { turn: 2, score: 63, label: 'added specifics' },
  { turn: 3, score: 84, label: 'named the outcome' },
]

/* The dashboard, drawn rather than screenshotted.
 *
 * A screenshot of a real dashboard would either be someone's actual data or a
 * mocked-up image that ages the moment the UI changes. This is neither: it is
 * the page's own vocabulary — hairlines, one accent, mono measurements — drawing
 * the same three instruments the dashboard itself renders, from constants that
 * live next to the rest of the page's synthetic evidence and are labelled
 * synthetic on the section, the same as the scorecard above it.
 *
 * Eight turns across four sittings, because the argument here is the one thing
 * a single session cannot show: that the line keeps going after you close the
 * tab and come back a week later. */
const BOARD = {
  turns: [38, 41, 52, 63, 58, 71, 79, 84],
  criteria: [
    { key: 'structure', label: 'Structure', average: 74 },
    { key: 'specifics', label: 'Specifics', average: 61 },
    { key: 'impact', label: 'Impact', average: 68 },
    { key: 'ownership', label: 'Ownership', average: 77 },
  ],
}

const BOARD_SHOWS = [
  {
    address: 'CO',
    claim: 'Coach, session by session',
    body:
      'Every scored answer in order, against the line the model itself calls strong — and which ' +
      'of the four criteria moved to get you there.',
  },
  {
    address: 'RES',
    claim: 'Resume Review, draft by draft',
    body:
      'Each pass over your resume scored on its own rubric, so the third draft is measured ' +
      'against the first rather than against a feeling.',
  },
  {
    address: '—',
    claim: 'Never one blended number',
    body:
      'The two rubrics measure different things, so they are never averaged together. Two ' +
      'panels, two baselines, and both start the day you arrived.',
  },
]

const REGISTER = [
  {
    address: '01',
    claim: 'The score shows its work.',
    body:
      'Every criterion carries the one sentence that earned it. A number you cannot argue with ' +
      'is a number you cannot learn from.',
  },
  {
    address: '02',
    claim: 'One conversation, one mode.',
    body:
      'Enforced on the server from the conversation itself, so a thread can never change the ' +
      'rules halfway through and leave you comparing two different rubrics.',
  },
  {
    address: '03',
    claim: 'Citations instead of recall.',
    body:
      'Document answers quote the retrieved passages inline and name what is missing when the ' +
      'document simply does not say.',
  },
  {
    address: '04',
    claim: 'The trend is the point.',
    body:
      'Scores persist on the message, so reopening a conversation rebuilds its trend. You are ' +
      'not told you improved — you are shown the three numbers.',
  },
]

/* ---------------------------------------------------------------- *
 * pieces
 * ---------------------------------------------------------------- */

/** The bracketed mono control that is this page's only button shape. */
function Command({ href, children, tone = 'default', onClick }) {
  return (
    <a className="rl-cmd" data-tone={tone} href={href} onClick={onClick}>
      <span className="rl-cmd__text">{children}</span>
    </a>
  )
}

/* The core object: the brand mark as a lit sphere in a bank of fog.
 *
 * The interaction is the page's own premise made literal. This whole world is
 * described as "lit by a single ice-cyan wash" — so the pointer *is* that light.
 * Moving it across the first viewport moves the terminator round the sphere and
 * pushes the fog the other way, which is the one thing a sphere can do that a
 * flat tile cannot: prove it has a form by being lit from somewhere.
 *
 * Written straight to the element's style rather than through state. A pointer
 * moving across the hero fires ~120 events a second; re-rendering the tree at
 * that rate to move a gradient would be absurd, and the values are only ever
 * read by CSS. One rAF coalesces a burst of moves into a single write.
 */
const LIGHT = { x: [22, 60], y: [16, 54], rest: [35, 30], drift: 13, roll: 7 }
const mix = (r, t) => r[0] + (r[1] - r[0]) * t

/* The orbits. Four rings around the mark, each a tilted ellipse — which on
 * screen is the same thing as a circle seen edge-on from somewhere else.
 *
 * Every ring is cut into two halves and the sphere is stacked between them, so
 * a ring genuinely passes behind the mark and comes back out the other side.
 * That split is the whole illusion: an ellipse drawn in one piece over a sphere
 * is a hoop painted on a ball, and no amount of glow rescues it.
 *
 * Semi-major axes all clear the sphere (radius 117 in these units) so the rings
 * emerge at the sides; the semi-minor axes are small, so each ring crosses the
 * face as a near-flat line — the read that says "tilted circle" rather than
 * "oval". `flow` rings carry a travelling dash, which is the field-line effect:
 * not a bead going round a track, but the line itself in motion.
 */
const ORB = { c: 150, r: 117 }

const ORBITS = [
  { a: 148, b: 38, rot: -18, flow: '4.6s', w: 1.1 },
  { a: 168, b: 23, rot: 33, w: 1 },
  { a: 139, b: 62, rot: 85, flow: '7.4s', w: 1.05, rev: true },
  { a: 176, b: 15, rot: 126, w: 0.85 },
]

/* Sampled rather than built from an SVG arc command: `A` picks its half by way
   of two flags whose meaning flips with the sweep direction, and the one thing
   this figure cannot afford is a ring whose front half is quietly its back. */
const halfArc = (a, b, from, to, n = 40) => {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n
    pts.push(`${(ORB.c + a * Math.cos(t)).toFixed(1)} ${(ORB.c + b * Math.sin(t)).toFixed(1)}`)
  }
  return `M${pts.join('L')}`
}

const RINGS = ORBITS.map((o, i) => ({
  ...o,
  i,
  // y is down in SVG, so negative sine is the top of the ellipse — the far side.
  back: halfArc(o.a, o.b, Math.PI, Math.PI * 2),
  front: halfArc(o.a, o.b, 0, Math.PI),
}))

function Orbits({ layer }) {
  return (
    <svg
      className={`rl-orbits rl-orbits--${layer}`}
      viewBox="0 0 300 300"
      aria-hidden="true"
      focusable="false"
    >
      {RINGS.map((ring) => (
        <path
          key={ring.i}
          className={`rl-orbit${ring.flow ? ' rl-orbit--flow' : ''}`}
          d={ring[layer]}
          transform={`rotate(${ring.rot} ${ORB.c} ${ORB.c})`}
          style={{ '--w': ring.w, '--dur': ring.flow, '--dir': ring.rev ? 1 : -1 }}
        />
      ))}
    </svg>
  )
}

function Core() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    const host = el?.closest('.rl-boot')
    if (!host) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    let frame = 0
    let next = null

    const write = () => {
      frame = 0
      if (!next || !ref.current) return
      const s = ref.current.style
      s.setProperty('--lx', `${next.lx.toFixed(1)}%`)
      s.setProperty('--ly', `${next.ly.toFixed(1)}%`)
      s.setProperty('--dx', `${next.dx.toFixed(1)}px`)
      s.setProperty('--dy', `${next.dy.toFixed(1)}px`)
      s.setProperty('--roll', `${next.roll.toFixed(2)}deg`)
    }

    /* The listener is on the whole first viewport, not on the sphere: an object
       that only wakes up when you touch it is a button, and this is a light. */
    const onMove = (e) => {
      const r = host.getBoundingClientRect()
      const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      const ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      next = {
        lx: mix(LIGHT.x, nx),
        ly: mix(LIGHT.y, ny),
        /* Fog against the light, sphere with it — the parallax is what keeps
           the two from reading as one flat sticker. */
        dx: (0.5 - nx) * LIGHT.drift * 2,
        dy: (0.5 - ny) * LIGHT.drift,
        /* The rings turn with the pointer. Seven degrees end to end — enough
           that they answer the cursor, not so much that the assembly swings
           and gives away that the tilt is painted on. */
        roll: (nx - 0.5) * LIGHT.roll * 2,
      }
      if (!frame) frame = requestAnimationFrame(write)
    }

    const onLeave = () => {
      next = { lx: LIGHT.rest[0], ly: LIGHT.rest[1], dx: 0, dy: 0, roll: 0 }
      if (!frame) frame = requestAnimationFrame(write)
    }

    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)
    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="rl-core" ref={ref}>
      {/* Three banks on coprime periods so the drift never resolves into a
          loop you can watch, and one of them passes in front of the sphere —
          fog you are only ever behind is just a glow. */}
      <div className="rl-fog" aria-hidden="true">
        <i data-bank="0" />
        <i data-bank="1" />
        <i data-bank="2" />
      </div>

      {/* The far halves, then the mark, then the near halves. The stack IS the
          depth — there is no 3D here, only three layers in the right order. */}
      <Orbits layer="back" />

      <div className="rl-sphere" aria-hidden="true">
        <span className="rl-sphere__spec" />
      </div>

      <Orbits layer="front" />
      <i className="rl-fog__front" aria-hidden="true" />
    </div>
  )
}

function Meter({ score }) {
  return (
    <div className="rl-meter" aria-hidden="true">
      <i style={{ '--fill': `${score}%` }} data-band={score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low'} />
    </div>
  )
}

/* ---- the three facts, drawn ---- *
 *
 * A page whose whole argument is "show the measurement" cannot state its own
 * three numbers in a bare table. Each is drawn as the thing it counts, in the
 * page's own vocabulary — hairlines, one hue, mono for measurements. These are
 * instruments, not decoration: every value in them is a real property of the
 * product, and each is pulled from the same constant the rest of the page uses.
 */

/* Even steps of the one accent family, not four different hues: the arcs are
   equal in length because the four criteria are equal in weight, and a tonal
   step reads as a sweep turning rather than as a ranking. Hover turns the ring
   by exactly one criterion. */
const ARC_TONES = [
  'var(--emerald-100)',
  'var(--emerald-300)',
  'var(--emerald-500)',
  'var(--emerald-600)',
]

/* Four EQUAL arcs. The hero's core ring is the weighted one; a scored mode's
   four criteria carry the same weight as each other, so this one must not
   borrow that ring's uneven sweep. */
function FigRubric() {
  const R = 34
  const CIRC = 2 * Math.PI * R
  const SEG = CIRC / 4
  const GAP = 9

  return (
    <svg className="rl-fig" viewBox="0 0 176 108" aria-hidden="true" focusable="false">
      {/* two groups, not one: the entrance animation owns the outer transform
          and the hover turn owns the inner one, because an animation and a
          transition fighting over the same property is a stuck ring */}
      <g className="rl-fig__boot">
        <g className="rl-fig__ring">
          <circle className="rl-fig__track" cx="88" cy="52" r={R} />
          {ARC_TONES.map((tone, i) => (
            <g key={tone} className="rl-fig__arc" style={{ '--i': i, '--arc': tone }}>
              <circle
                cx="88"
                cy="52"
                r={R}
                strokeDasharray={`${SEG - GAP} ${CIRC - SEG + GAP}`}
                strokeDashoffset={-i * SEG}
              />
            </g>
          ))}
        </g>
      </g>
      <circle className="rl-fig__core" cx="88" cy="52" r="4" />
    </svg>
  )
}

/* The band a score falls in, on the page's one published tone scale. The same
   two thresholds every other number on this page is coloured by — the scorecard
   values, the meters, the trend bars — so the ruler cannot show a scale the rest
   of the page disagrees with. */
const bandOf = (n) => (n >= 70 ? 'high' : n >= 45 ? 'mid' : 'low')

/* The scale drawn as a banded ruler rather than one accent line. 0–100 is not a
   neutral span: it is three bands with a threshold in it, and colouring it that
   way is the difference between showing a range and showing what the range
   means. STRONG is where the scoring prompt itself starts calling an answer
   good, and it is the same line the trend chart below is measured against. */
const SCALE_BANDS = [
  { from: 0, to: 45 },
  { from: 45, to: 70 },
  { from: 70, to: 100 },
]

function FigScale() {
  const X0 = 18
  const X1 = 158
  const at = (n) => X0 + ((X1 - X0) * n) / 100
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10)

  return (
    <svg className="rl-fig" viewBox="0 0 176 108" aria-hidden="true" focusable="false">
      {ticks.map((n, i) => (
        <line
          key={n}
          className="rl-fig__tick"
          data-band={bandOf(n)}
          style={{ '--i': i }}
          x1={at(n)}
          y1="62"
          x2={at(n)}
          y2={n % 50 === 0 ? 74 : 68}
        />
      ))}
      <line className="rl-fig__axis" x1={X0} y1="62" x2={X1} y2="62" />
      {SCALE_BANDS.map((b, i) => (
        <line
          key={b.from}
          className="rl-fig__sweep"
          data-band={bandOf(b.from)}
          style={{ '--i': i }}
          pathLength="1"
          x1={at(b.from)}
          y1="62"
          x2={at(b.to)}
          y2="62"
        />
      ))}

      <line className="rl-fig__mark" x1={at(STRONG)} y1="36" x2={at(STRONG)} y2="62" />
      <circle className="rl-fig__markdot" cx={at(STRONG)} cy="62" r="3" />
      <text className="rl-fig__hot" x={at(STRONG)} y="28" textAnchor="middle">
        {STRONG} strong
      </text>
    </svg>
  )
}

/* The four bays with one of them bracketed — the same brackets that are this
   page's entire control vocabulary, closing on the single mode a conversation
   is held to. Addresses come from BAYS so the figure cannot drift from the
   section under it. */
function FigLane() {
  const TILE = 30
  const GAP = 12
  const x = (i) => 10 + i * (TILE + GAP)
  const ON = 1 // Coach — the bay that leads the section below, for the same reason

  return (
    <svg className="rl-fig" viewBox="0 0 176 108" aria-hidden="true" focusable="false">
      {BAYS.map((b, i) => (
        <g
          key={b.address}
          className={`rl-fig__slot${i === ON ? ' is-on' : ''}`}
          /* the two bays that carry a rubric read in the accent, the two that
             do not stay neutral — the same distinction the list below makes */
          data-scored={b.criteria ? '' : undefined}
          style={{ '--i': i }}
        >
          <rect x={x(i)} y="32" width={TILE} height={TILE} rx="7" />
          <text x={x(i) + TILE / 2} y="84" textAnchor="middle">
            {b.address}
          </text>
        </g>
      ))}
      {/* wrapped for the same reason the ring is: the entrance closes the
          brackets inward, the hover nudges them back out, and they cannot both
          own the transform of one element. --from is set on the wrapper and
          inherited, so one value drives both directions. */}
      <g className="rl-fig__brkwrap" style={{ '--from': '-9px' }}>
        <path
          className="rl-fig__brk"
          d={`M ${x(ON) - 3} 26 L ${x(ON) - 8} 26 L ${x(ON) - 8} 68 L ${x(ON) - 3} 68`}
        />
      </g>
      <g className="rl-fig__brkwrap" style={{ '--from': '9px' }}>
        <path
          className="rl-fig__brk"
          d={`M ${x(ON) + TILE + 3} 26 L ${x(ON) + TILE + 8} 26 L ${x(ON) + TILE + 8} 68 L ${x(ON) + TILE + 3} 68`}
        />
      </g>
      <circle className="rl-fig__core" cx={x(ON) + TILE / 2} cy="47" r="4.5" />
    </svg>
  )
}

const FACTS = [
  { value: '4', label: 'Rubric criteria per scored mode', Fig: FigRubric },
  { value: '0–100', label: 'Scale, everywhere', Fig: FigScale },
  { value: '1', label: 'Modes per conversation', Fig: FigLane },
]

/* ---- the dashboard, drawn ---- *
 *
 * The one figure on this page that depicts another screen, so the temptation is
 * a device frame and a fake window chrome. It gets neither: what is drawn is
 * the three instruments the dashboard actually renders — the trend against the
 * threshold, the criterion bars, and the stat readouts — in this page's own
 * hairlines and single accent, at a scale where they read as a diagram of a
 * measurement rather than as a thumbnail of a screenshot.
 *
 * Marks carry `vector-effect="non-scaling-stroke"` so a hairline stays a
 * hairline at every width. Without it the whole figure is scaled by the
 * viewBox and the "1px rule" that carries this page's structure would render at
 * 0.6px on a phone and 1.8px on a monitor.
 */
const FIG = { w: 320, h: 210 }

function FigBoard() {
  const plot = { x: 16, y: 46, w: 288, h: 76 }
  const pts = BOARD.turns
  const px = (i) => plot.x + (i / (pts.length - 1)) * plot.w
  const py = (v) => plot.y + plot.h - (v / 100) * plot.h

  const bar = { x: 16, y: 148, w: 190, gap: 15 }

  return (
    <svg
      className="rl-board__fig"
      viewBox={`0 0 ${FIG.w} ${FIG.h}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* the three readouts along the top, drawn as what they are: a label rule
          and a numeral, which is all a stat tile has ever been */}
      {[
        { x: 16, k: 'TURNS', v: '8' },
        { x: 116, k: 'LATEST', v: '84' },
        { x: 216, k: 'SINCE 1ST', v: '+46' },
      ].map((s) => (
        <g key={s.k} className="rl-board__stat">
          <line className="rl-board__rule" x1={s.x} y1="14" x2={s.x + 88} y2="14" />
          <text className="rl-board__k" x={s.x} y="27">
            {s.k}
          </text>
          <text className="rl-board__v" x={s.x + 88} y="27" textAnchor="end">
            {s.v}
          </text>
        </g>
      ))}

      {/* the threshold, and the only dashed line in the figure */}
      <line
        className="rl-board__thresh"
        x1={plot.x}
        y1={py(STRONG)}
        x2={plot.x + plot.w}
        y2={py(STRONG)}
      />
      <text className="rl-board__k" x={plot.x + plot.w} y={py(STRONG) - 6} textAnchor="end">
        {STRONG}
      </text>

      <polyline
        className="rl-board__line"
        points={pts.map((v, i) => `${px(i)},${py(v)}`).join(' ')}
      />

      {/* the accent is spent on the turns that cleared the bar, and on nothing
          else in this figure — the same discipline the real chart runs */}
      {pts.map((v, i) => (
        <circle
          key={i}
          className="rl-board__dot"
          cx={px(i)}
          cy={py(v)}
          r={i === pts.length - 1 ? 3.4 : 2.4}
          data-strong={v >= STRONG || undefined}
        />
      ))}

      <line
        className="rl-board__axis"
        x1={plot.x}
        y1={plot.y + plot.h}
        x2={plot.x + plot.w}
        y2={plot.y + plot.h}
      />

      {BOARD.criteria.map((c, i) => (
        <g key={c.key} className="rl-board__bar">
          <text className="rl-board__k" x={bar.x} y={bar.y + i * bar.gap + 3}>
            {c.label.toUpperCase()}
          </text>
          <line
            className="rl-board__track"
            x1={bar.x + 78}
            y1={bar.y + i * bar.gap}
            x2={bar.x + 78 + bar.w - 78}
            y2={bar.y + i * bar.gap}
          />
          <line
            className="rl-board__fill"
            data-strong={c.average >= STRONG || undefined}
            x1={bar.x + 78}
            y1={bar.y + i * bar.gap}
            x2={bar.x + 78 + ((bar.w - 78) * c.average) / 100}
            y2={bar.y + i * bar.gap}
          />
          <text
            className="rl-board__v rl-board__v--sm"
            x={FIG.w - 16}
            y={bar.y + i * bar.gap + 3}
            textAnchor="end"
          >
            {c.average}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function Landing() {
  const { user, signedIn } = useAuth()
  const pageRef = useReveal()
  const [bootRef, boardRef, accessRef, away] = useJump()
  const [bay, setBay] = useState(1) // Coach leads: it is the clearest case
  const active = BAYS[bay]

  /* The same derivation the chat shell and the dashboard use, from the same
     helpers — one person cannot have two different avatars depending on which
     surface they are standing on. */
  const identity = useMemo(
    () => ({
      name: displayName(user),
      initials: initialsOf(user),
      email: user?.email || '',
      avatar: user?.avatar_url || '',
    }),
    [user],
  )

  const toTop = (e) => {
    e.preventDefault()
    pageRef.current?.scrollTo({
      top: 0,
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }

  return (
    <div className="rl-page" ref={pageRef}>
      {/* ============================ BOOT ============================ */}
      <section className="rl-frame rl-boot" ref={bootRef}>
        <div className="rl-field" aria-hidden="true" />

        <header className="rl-rail">
          {/* The mark is the way to this page from every other surface, and
              this page is where it points — so here it returns to the top of
              it. The href stays for the middle-click and the status bar, but
              the handler has to do the scrolling: `#` moves the *document*, and
              the thing that actually scrolls on this route is .rl-page. */}
          <a className="rl-brand" href="#" onClick={toTop}>
            <span className="rl-orb" aria-hidden="true" />
            <span className="rl-brand__name">Ripple</span>
          </a>
          <p className="rl-rail__status">
            <span className="rl-dot" aria-hidden="true" />
            four modes · four rubrics · one score
          </p>
          {/* Quiet here, loud below. The rail's job is to prove the action
              exists before you have read anything; the one under the mark is
              the one the page is actually asking for.

              Log in sits beside it in the page's own bracketed vocabulary
              rather than as a nav word, and it is the *plain* tone: a returning
              user knows where their account is, and the one thing this page has
              to win is the visitor who does not have one yet. Which is also why
              it takes the outer slot — the accent command leads the pair, and
              the account link trails it. It disappears once there is a session,
              because a signed-in visitor pressing "Log in" is the page telling
              them it has not noticed them — the avatar takes its place, which is
              the same swap the chat shell's rail makes. */}
          <div className="rl-rail__act">
            <Command href={ENTER} tone="accent">
              Start a chat
            </Command>
            {/* The account slot, either way round: a stranger gets the way in,
                a returning user gets the one page that is only theirs and the
                badge that says who "theirs" means. */}
            {signedIn ? (
              <>
                <Command href="#/dashboard">Dashboard</Command>
                <ProfileBadge user={identity} className="rl-rail__badge" />
              </>
            ) : (
              <Command href="#/signin">Log in</Command>
            )}
          </div>
        </header>

        <div className="rl-boot__mid">
          {/* The operative word carries the emphasis. <em> rather than a span
              because this is stress emphasis in the sentence, not decoration on
              a syllable — the styling then turns off the italic the tag brings
              with it. */}
          <h1 className="rl-display">
            You can&apos;t improve
            <br />
            what nobody <em className="rl-display__key">scores.</em>
          </h1>

          <div className="rl-core-row">
            <p className="rl-flank rl-flank--l">
              Four modes.
              <br />
              Each one a rubric,
              <br />
              not a personality.
            </p>

            <Core />

            <p className="rl-flank rl-flank--r">
              Every turn scored
              <br />
              nought to a hundred,
              <br />
              and tracked.
            </p>
          </div>

          {/* Deliberately the same words as the rail above it. Two names for one
              destination inside a single viewport reads as two destinations —
              so what separates them is weight, not wording. */}
          <div className="rl-boot__act">
            <Command href={ENTER} tone="primary">
              Start a chat
            </Command>
            <span className="rl-boot__hint">No card. Sign in only when you send.</span>
          </div>
        </div>
      </section>

      {/* ========================== WHO WE ARE ========================== */}
      <section className="rl-section rl-who">
        <div className="rl-who__lead" data-reveal>
          <p className="rl-kicker">Who we are</p>
          <h2 className="rl-h2">
            Not a chat box wearing
            <br />
            four personalities.
          </h2>
        </div>
        <div className="rl-who__body" data-reveal>
          <p className="rl-lede">
            A mode used to be one line of system prompt. That made every mode the same shape —
            you type, prose comes back — and the only difference between a coach and an
            assistant was tone.
          </p>
          <p className="rl-prose">
            Here a mode is a <em>workflow</em>: a role, a set of steps it runs every turn, and a
            rubric it has to score you against before it is allowed to move on. The evaluative
            modes do not answer in prose at all. They answer in a fixed envelope, and the server
            composes what you read — so the shape of a turn is the same every time even though
            the words never are.
          </p>
        </div>

        {/* Out of the prose column and across the full width: these are the
            section's evidence, not a footnote to its last paragraph. */}
        <dl className="rl-facts" data-reveal>
          {FACTS.map(({ value, label, Fig }) => (
            <div className="rl-fact" key={label}>
              <div className="rl-fact__fig">
                <Fig />
              </div>
              {/* dt before dd is the only order a definition list allows; the
                  cell reorders them so the drawn value leads and the label
                  captions it. */}
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ============================ BAYS ============================ */}
      <section className="rl-section rl-bays">
        <div className="rl-bays__head" data-reveal>
          <p className="rl-kicker">What we do</p>
          <h2 className="rl-h2">Pick the rubric you want to be held to.</h2>
        </div>

        <div className="rl-bays__body">
          <ul className="rl-baylist" data-reveal>
            {BAYS.map((b, i) => (
              <li key={b.address}>
                <button
                  type="button"
                  className={`rl-bay${i === bay ? ' is-on' : ''}`}
                  onClick={() => setBay(i)}
                  aria-pressed={i === bay}
                >
                  <span className="rl-bay__addr">{b.address}</span>
                  <span className="rl-bay__name">{b.name}</span>
                  <span className="rl-bay__icon">
                    <b.Icon size={15} />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* keyed on the address so switching bays re-mounts and replays the
              one transition this page owns, the way the app's own mode pills do */}
          <div className="rl-detail" data-reveal key={active.address}>
            <p className="rl-detail__signal">{active.signal}</p>
            <h3 className="rl-detail__title">{active.line}</h3>
            <p className="rl-prose">{active.body}</p>

            {active.criteria ? (
              <>
                <p className="rl-detail__label">Scored on</p>
                <ul className="rl-crits">
                  {active.criteria.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="rl-detail__note">
                No rubric here. This mode&apos;s honesty signal is
                {active.address === 'DOC'
                  ? ' which passages the answer stood on'
                  : ' a straight answer'}
                , not a score.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ============================ PROOF ============================ */}
      <section className="rl-section rl-proof">
        <div className="rl-proof__head" data-reveal>
          <p className="rl-kicker">Why choose us</p>
          <h2 className="rl-h2">
            Here is the rubric being
            <br />
            unkind to a real answer.
          </h2>
          <p className="rl-synthetic">Synthetic session, written to be average. Replace with your own.</p>
        </div>

        <div className="rl-turn" data-reveal>
          <div className="rl-turn__q">
            <span className="rl-turn__who">Coach</span>
            <p>{DEMO.question}</p>
          </div>
          <div className="rl-turn__a">
            <span className="rl-turn__who">You</span>
            <p>{DEMO.answer}</p>
          </div>

          <div className="rl-card">
            <header className="rl-card__head">
              <span className="rl-card__label">Answer score</span>
              <span className="rl-card__overall" data-band="low">
                {DEMO.overall}
                <span className="rl-card__outof">/100</span>
              </span>
            </header>
            <p className="rl-card__verdict">{DEMO.verdict}</p>
            <div className="rl-card__grid">
              {DEMO.criteria.map((c) => (
                <div className="rl-crit" key={c.key}>
                  <div className="rl-crit__top">
                    <span className="rl-crit__name">{c.label}</span>
                    <span
                      className="rl-crit__val"
                      data-band={c.score >= 70 ? 'high' : c.score >= 45 ? 'mid' : 'low'}
                    >
                      {c.score}
                    </span>
                  </div>
                  <Meter score={c.score} />
                  <p className="rl-crit__note">{c.note}</p>
                </div>
              ))}
            </div>
            <p className="rl-card__next">
              <span>Next</span> {DEMO.next}
            </p>
          </div>
        </div>
      </section>

      {/* ============================ TREND ============================ */}
      <section className="rl-section rl-trend">
        <div className="rl-trend__lead" data-reveal>
          <h2 className="rl-h2">Then it moves.</h2>
          <p className="rl-prose">
            Scores live on the message, not on a counter — so the trend is a fold over the
            thread. Reopen the conversation a week later and it rebuilds itself.
          </p>
        </div>

        <figure className="rl-plot" data-reveal>
          {/* The synthetic label belongs here too. The one in the proof section
              above does not carry across a section boundary, and "+43 across the
              session" otherwise reads as a measured product result. */}
          <figcaption>
            One session · three answers to the same question · synthetic
          </figcaption>
          {/* Three separately-aligned rows sharing one column template, rather
              than one grid the bars and the threshold both try to occupy. The
              plot area owns a known height, which is what lets the threshold sit
              at an exact percentage of the scale instead of an exact percentage
              of "the grid, labels included". */}
          <div className="rl-plot__row rl-plot__values">
            {TREND.map((t) => (
              <span
                key={t.turn}
                data-band={t.score >= 70 ? 'high' : t.score >= 45 ? 'mid' : 'low'}
              >
                {t.score}
              </span>
            ))}
          </div>

          <div className="rl-plot__row rl-plot__area">
            {TREND.map((t) => (
              <div className="rl-col" key={t.turn}>
                <i
                  style={{ '--h': `${t.score}%` }}
                  data-band={t.score >= 70 ? 'high' : t.score >= 45 ? 'mid' : 'low'}
                  data-cleared={t.score >= STRONG || undefined}
                />
              </div>
            ))}

            {/* The line the third answer finally clears. Not decoration: 75 is
                where the scoring prompt's own bands call an answer strong, so the
                chart is measured against the threshold the model is held to. */}
            <span className="rl-thresh" style={{ '--at': `${STRONG}%` }}>
              <i aria-hidden="true" />
              <em>{STRONG} — strong</em>
            </span>
          </div>

          <div className="rl-plot__row rl-plot__labels">
            {TREND.map((t) => (
              <div key={t.turn}>
                <span className="rl-bar__turn">turn {t.turn}</span>
                <span className="rl-bar__label">{t.label}</span>
              </div>
            ))}
          </div>
          <p className="rl-plot__delta">
            <span>+43</span> across the session
          </p>
        </figure>
      </section>

      {/* =========================== DASHBOARD =========================== *
        *
        * Placed here and nowhere else. The section above it has just shown a
        * score moving inside one session; the only honest next sentence is
        * "and it keeps moving after you close the tab", which is the whole
        * claim of a dashboard. Put before the trend it would be a feature
        * list; put after the register it would be an afterthought.
        */}
      <section className="rl-section rl-board">
        <div className="rl-board__lead" data-reveal>
          <h2 className="rl-h2">
            Then it keeps moving,
            <br />
            across every session.
          </h2>
          <p className="rl-lede">
            Scored turns do not end with the conversation they happened in. Your dashboard
            replays every one of them, per mode, measured from the day you arrived.
          </p>
          <p className="rl-prose">
            Coach and Resume Review each get their own panel, their own baseline and their own
            four criteria — never one blended figure, because the two rubrics do not measure the
            same thing and an average across them would mean nothing. The other two modes answer
            rather than assess, so they are not on it.
          </p>
          <ul className="rl-board__list">
            {BOARD_SHOWS.map((s) => (
              <li key={s.claim}>
                <span className="rl-board__addr">{s.address}</span>
                <h3 className="rl-board__claim">{s.claim}</h3>
                <p className="rl-board__body">{s.body}</p>
              </li>
            ))}
          </ul>
          <div className="rl-board__act" ref={boardRef}>
            {/* Signed in, the dashboard is a place they can go; signed out it is
                a thing they have to earn a first score to fill, so the action is
                the same one the rest of the page is asking for. Two different
                destinations would be dishonest in either direction. */}
            {signedIn ? (
              <Command href="#/dashboard" tone="accent">
                Open your dashboard
              </Command>
            ) : (
              <Command href={ENTER} tone="accent">
                Start a chat
              </Command>
            )}
            <span className="rl-board__hint">
              {signedIn
                ? 'Everything you have been scored on, in one place.'
                : 'It fills in from your first scored turn.'}
            </span>
          </div>
        </div>

        <figure className="rl-board__figwrap" data-reveal>
          <FigBoard />
          {/* The third synthetic label on the page, for the same reason as the
              other two: it does not carry across a section boundary, and a
              drawn arc from 38 to 84 would otherwise read as a measured result. */}
          <figcaption>
            The Coach panel · eight turns over four sittings · synthetic
          </figcaption>
        </figure>
      </section>

      {/* =========================== REGISTER =========================== */}
      <section className="rl-section rl-register">
        <h2 className="rl-h2 rl-register__h" data-reveal>
          What holds it together.
        </h2>
        <ul>
          {REGISTER.map((r) => (
            <li key={r.address} data-reveal>
              <span className="rl-register__addr">{r.address}</span>
              <h3 className="rl-register__claim">{r.claim}</h3>
              <p className="rl-register__body">{r.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* =========================== ACCESS =========================== */}
      <section className="rl-frame rl-access" ref={accessRef}>
        <div className="rl-field" aria-hidden="true" />
        <div className="rl-access__mid" data-reveal>
          <h2 className="rl-display rl-display--sm">
            Find out what
            <br />
            you actually score.
          </h2>
          <Command href={ENTER} tone="primary">
            Start a chat
          </Command>
          <p className="rl-access__hint">
            Browse every mode first. We ask who you are only when you send your first message.
          </p>
          {/* This slot used to carry "Soon — a dashboard". The dashboard ships,
              so the coming-soon note went with it rather than being downgraded
              to a second link: the section above already argues for it at
              length, and the closing frame is asking for exactly one thing. */}
        </div>
      </section>

      <footer className="rl-foot">
        <span className="rl-brand__name">Ripple</span>
        <span>four modes · four rubrics · 0–100</span>
        <a href={ENTER}>Start a chat</a>
      </footer>

      {/* Rendered only while it applies, rather than parked off-screen with a
          class: a link that is invisible but still in the tab order is a trap
          for anyone arriving by keyboard, and there is no exit transition worth
          paying that for. */}
      {away && (
        <div className="rl-jump">
          <Command href={ENTER} tone="primary">
            Start a chat
          </Command>
        </div>
      )}
    </div>
  )
}
