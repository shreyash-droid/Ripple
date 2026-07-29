import { DocIcon, ResumeIcon, SparkIcon, TargetIcon } from '../components/Icons'

/* Mode definitions — the frontend half of backend/lib/rubrics.js.
 *
 * A mode is not just a label on a pill: it decides what the empty thread says,
 * what the composer invites you to type, whether replies come back with a rubric
 * card, and whether the session keeps a running trend. Everything a mode changes
 * about the UI is declared here so the components stay generic.
 *
 * `rubric` lists the criteria the backend scores for that mode, in the order they
 * should render. It exists for labelling and ordering only — the scores
 * themselves always come from the message's own scorecard, so a conversation
 * scored under an older rubric still renders correctly.
 *
 * `upload` is what puts the + button in the composer. Only the modes that
 * declare it get one: a mode with nothing to attach shows no attach affordance
 * at all, rather than a button that opens nothing.
 */
export const MODES = [
  {
    value: 'general',
    label: 'General',
    hint: 'A helpful, friendly assistant',
    Icon: SparkIcon,
    placeholder: 'Message Ripple',
    empty: {
      title: 'Ask anything.',
      body: 'Straight answers, no ceremony. Switch modes below to work differently.',
      starters: [
        'Explain how JWT auth actually works',
        'Compare Postgres and DynamoDB for a chat app',
      ],
    },
  },
  {
    value: 'coach',
    label: 'Coach',
    hint: 'Mock interview — every answer scored against a rubric',
    Icon: TargetIcon,
    placeholder: 'Answer as you would in the room',
    // what a scored turn is judged on; drives the card header and the trend strip
    scoreLabel: 'Answer score',
    rubric: ['structure', 'specifics', 'impact', 'ownership'],
    empty: {
      title: 'Mock interview, scored.',
      body: 'Name the role and Ripple starts asking. Every answer is scored, and the session tracks whether you are improving.',
      starters: [
        "I'm interviewing for a backend engineer role",
        'Ask me a behavioural question about conflict',
        'Start with something on leading a project',
      ],
    },
  },
  /* `value` stays 'reviewer' — it is the mode persisted on every existing
     conversation, so renaming it would strand their history. */
  {
    value: 'reviewer',
    label: 'Resume Review',
    hint: 'Resume review — scored against a hiring rubric, biggest fix first',
    Icon: ResumeIcon,
    placeholder: 'Paste your resume, or attach it with +',
    scoreLabel: 'Resume score',
    /* Attached, not ingested: the file's text goes straight into the next
       message, because this mode scores what you send it. Contrast `document`
       below, where the upload is chunked and embedded to be retrieved from. */
    upload: { label: 'Attach your resume', accept: '.pdf,.txt', sendsWithMessage: true },
    rubric: ['impact', 'relevance', 'clarity', 'credibility'],
    empty: {
      title: 'Attach your resume, get a real review.',
      body: 'Scored the way a hiring manager reads it, with your weakest bullets rewritten and the one change worth making first.',
      starters: [
        'Review my resume for a backend engineer role',
        'Rewrite my experience bullets to show impact',
        'Is my summary section worth keeping?',
      ],
    },
  },
  {
    value: 'document',
    label: 'Document Q&A',
    hint: 'Answers grounded in a document you upload, with citations',
    Icon: DocIcon,
    placeholder: 'Upload a document to begin',
    upload: { label: 'Upload a document', accept: '.pdf,.txt' },
    empty: {
      title: 'Upload it, then interrogate it.',
      body: 'Answers come only from the passages Ripple retrieves — and it shows you which ones it stood on.',
      // no starters: this mode's empty state is shown *before* a document
      // exists, so anything offered there would answer nothing. See
      // `suggestions` below, which are offered once there is something to ask.
      starters: [],
    },
    /* Quick actions, offered in the thread once a document is ready. They are
       separate from `starters` because the two appear at different moments —
       starters open an empty thread, these open a loaded document. */
    suggestions: [
      'Summarise this document',
      'Make notes on the key topics',
      'What should I take away from this?',
    ],
  },
]

const BY_VALUE = new Map(MODES.map((m) => [m.value, m]))

export function modeConfig(value) {
  return BY_VALUE.get(value) || BY_VALUE.get('general')
}

/** True for the modes whose replies carry a rubric scorecard. */
export function isScoredMode(value) {
  return Boolean(modeConfig(value).rubric)
}
