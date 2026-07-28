function Svg({ size, strokeWidth = 1.8, className, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function PlusIcon({ size = 15, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Svg>
  )
}

export function ArrowUpIcon({ size = 16 }) {
  return (
    <Svg size={size} strokeWidth={2.2}>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </Svg>
  )
}

/** Opens the sidebar as a drawer on narrow screens. */
export function MenuIcon({ size = 18 }) {
  return (
    <Svg size={size} strokeWidth={1.7}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  )
}

/** Collapse / expand the sidebar rail. */
export function PanelLeftIcon({ size = 17 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </Svg>
  )
}

/* ---- conversation row actions ---- */

/** Opens a conversation's rename / delete menu. */
export function MoreIcon({ size = 15 }) {
  return (
    <Svg size={size}>
      {/* dots, not strokes — the shared Svg sets fill="none", so say otherwise */}
      <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function PencilIcon({ size = 14 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="m14.5 7.5 3 3" />
    </Svg>
  )
}

export function TrashIcon({ size = 14 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <path d="M4 7h16" />
      <path d="M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M6.5 7.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-11.5" />
    </Svg>
  )
}

/* ---- mode glyphs ---- */

/** General — a spark. */
export function SparkIcon({ size = 13 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <path d="M12 3.5 13.7 9 19 10.7 13.7 12.4 12 18l-1.7-5.6L5 10.7 10.3 9z" />
    </Svg>
  )
}

/** Coach — a target. */
export function TargetIcon({ size = 13 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
    </Svg>
  )
}

/** Reviewer — code brackets. */
export function CodeIcon({ size = 13 }) {
  return (
    <Svg size={size} strokeWidth={1.8}>
      <path d="m9 7-5 5 5 5" />
      <path d="m15 7 5 5-5 5" />
    </Svg>
  )
}

/** Document Q&A — a page with a folded corner. */
export function DocIcon({ size = 13 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </Svg>
  )
}

/** Session trend — an upward step. */
export function TrendIcon({ size = 13 }) {
  return (
    <Svg size={size} strokeWidth={1.9}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </Svg>
  )
}
