import { useLayoutEffect, useRef, useState } from 'react'
import { DocIcon, ResumeIcon, SparkIcon, TargetIcon } from '../components/Icons'
import '../styles/landing.css'

/* ══════════════════════════════════════════════════════════════════════════
 * DIRECTION CONTRACT — "How it works" (Persuade)
 *
 * THESIS: The page is the system powering up and granting access. It refuses
 *   the AI-startup scaffold — hero, three feature cards, logo wall, testimonial
 *   — because Ripple's claim is not "we have features", it is "you will be
 *   measured, and the number will move".
 *
 * OWN-WORLD: One inset console frame on a near-black field lit by a single
 *   ice-cyan wash. Hairline rules and a dotted grid instead of cards. Bracketed
 *   mono is the entire button vocabulary; JetBrains Mono carries only addresses
 *   and measurements, Inter carries voice at extreme size contrast. No second
 *   hue, no gradient text, no glass for decoration.
 *
 * STORY: A skeptic who has used generic AI chat sees a real scored turn happen,
 *   understands four modes means four rubrics, believes the score because the
 *   criteria and their notes are on the page, and presses START A CHAT.
 *
 * FIRST VIEWPORT: Cyan-to-black vertical wash. Console frame inset 20px with a
 *   hairline border and dotted field. Top rail: brand left, status readout
 *   centre, [ START A CHAT ] right. Centre: two lines of uppercase display at
 *   clamp(2.1rem, 7.4vw, 5.5rem), then the glowing core tile flanked
 *   symmetrically by two mono captions. Primary action — the same [ START A
 *   CHAT ], loud — sits bottom-centre in the frame, and the frame boots.
 *
 * FORM: Candidate 7 of 7 on the grounded list — "the surface as a system coming
 *   online". Seed key 079787b2, surface scope, degraded roll (no challengers
 *   were dealt; the roll service was unreachable).
 * ══════════════════════════════════════════════════════════════════════════ */

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

/* Where the scoring prompt's own band anchors call an answer strong. Shared by
   the chart's threshold and its colour bands so the page cannot drift from the
   scale the backend actually applies. */
const STRONG = 75

// One session, three turns. The whole product argument in three integers.
const TREND = [
  { turn: 1, score: 41, label: 'first attempt' },
  { turn: 2, score: 63, label: 'added specifics' },
  { turn: 3, score: 84, label: 'named the outcome' },
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

function Meter({ score }) {
  return (
    <div className="rl-meter" aria-hidden="true">
      <i style={{ '--fill': `${score}%` }} data-band={score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low'} />
    </div>
  )
}

export default function Landing() {
  const pageRef = useReveal()
  const [bay, setBay] = useState(1) // Coach leads: it is the clearest case
  const active = BAYS[bay]

  return (
    <div className="rl-page" ref={pageRef}>
      {/* ============================ BOOT ============================ */}
      <section className="rl-frame rl-boot">
        <div className="rl-field" aria-hidden="true" />

        <header className="rl-rail">
          <a className="rl-brand" href="#/c">
            <span className="rl-orb" aria-hidden="true" />
            <span className="rl-brand__name">Ripple</span>
          </a>
          <p className="rl-rail__status">
            <span className="rl-dot" aria-hidden="true" />
            four modes · four rubrics · one score
          </p>
          <Command href="#/c" tone="accent">
            Start a chat
          </Command>
        </header>

        <div className="rl-boot__mid">
          <h1 className="rl-display">
            You can&apos;t improve
            <br />
            what nobody scores.
          </h1>

          <div className="rl-core-row">
            <p className="rl-flank rl-flank--l">
              Four modes.
              <br />
              Each one a rubric,
              <br />
              not a personality.
            </p>

            {/* The core. Built, not illustrated: the ring is a real conic sweep
                of the four rubric weights and the orb is the app's own mark. */}
            <div className="rl-core">
              <div className="rl-core__glow" aria-hidden="true" />
              <div className="rl-core__tile">
                <span className="rl-core__ring" aria-hidden="true" />
                <span className="rl-orb rl-core__orb" aria-hidden="true" />
              </div>
            </div>

            <p className="rl-flank rl-flank--r">
              Every turn scored
              <br />
              nought to a hundred,
              <br />
              and tracked.
            </p>
          </div>

          {/* Deliberately the same words as the rail above it. Two names for one
              destination inside a single viewport reads as two destinations. */}
          <div className="rl-boot__act">
            <Command href="#/c" tone="accent">
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
          <dl className="rl-facts">
            <div>
              <dt>Rubric criteria per scored mode</dt>
              <dd>4</dd>
            </div>
            <div>
              <dt>Scale, everywhere</dt>
              <dd>0–100</dd>
            </div>
            <div>
              <dt>Modes per conversation</dt>
              <dd>1</dd>
            </div>
          </dl>
        </div>
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
              <span key={t.turn} data-cleared={t.score >= STRONG || undefined}>
                {t.score}
              </span>
            ))}
          </div>

          <div className="rl-plot__row rl-plot__area">
            {TREND.map((t) => (
              <div className="rl-col" key={t.turn}>
                <i
                  style={{ '--h': `${t.score}%` }}
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
      <section className="rl-frame rl-access">
        <div className="rl-field" aria-hidden="true" />
        <div className="rl-access__mid" data-reveal>
          <h2 className="rl-display rl-display--sm">
            Find out what
            <br />
            you actually score.
          </h2>
          <Command href="#/c" tone="accent">
            Start a chat
          </Command>
          <p className="rl-access__hint">
            Browse every mode first. We ask who you are only when you send your first message.
          </p>
        </div>
      </section>

      <footer className="rl-foot">
        <span className="rl-brand__name">Ripple</span>
        <span>four modes · four rubrics · 0–100</span>
        <a href="#/c">Back to the chat</a>
      </footer>
    </div>
  )
}
