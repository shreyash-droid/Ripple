import { CodeIcon, DocIcon, SparkIcon, TargetIcon } from '../components/Icons'

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
      body: 'Straight answers, no ceremony. Switch modes below when you want Ripple to work differently.',
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
      body: 'Name the role and Ripple starts asking. Every answer is scored on structure, specifics, impact and ownership — and the session tracks whether you are getting better.',
      starters: [
        "I'm interviewing for a backend engineer role",
        'Ask me a behavioural question about conflict',
        'Start with something on leading a project',
      ],
    },
  },
  {
    value: 'reviewer',
    label: 'Reviewer',
    hint: 'Senior code review — scored findings, hardest fix first',
    Icon: CodeIcon,
    placeholder: 'Paste the code you want reviewed',
    scoreLabel: 'Code score',
    rubric: ['correctness', 'robustness', 'clarity', 'efficiency'],
    empty: {
      title: 'Paste code, get a real review.',
      body: 'Ripple scores every submission on correctness, robustness, clarity and efficiency, lists what it found, then names the one fix worth making first.',
      starters: [
        'Review this function for edge cases',
        'Is this request handler production-ready?',
      ],
    },
  },
  {
    value: 'document',
    label: 'Document Q&A',
    hint: 'Answers grounded in a document you upload, with citations',
    Icon: DocIcon,
    placeholder: 'Upload a document to begin',
    empty: {
      title: 'Upload it, then interrogate it.',
      body: 'Attach a PDF or .txt with the + button. Answers come only from the passages Ripple retrieves — and it shows you which ones it stood on.',
      starters: [],
    },
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
