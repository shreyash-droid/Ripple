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

/** Collapse / expand the sidebar rail. */
export function PanelLeftIcon({ size = 17 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
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
