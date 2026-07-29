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

/* ---- auth ---- */

/** Reveal the password. */
export function EyeIcon({ size = 17 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

/** Hide it again. */
export function EyeOffIcon({ size = 17 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <path d="M10.6 6.2A9.6 9.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4" />
      <path d="M6.4 7.9A16.6 16.6 0 0 0 2 12s3.6 6.5 10 6.5a9.9 9.9 0 0 0 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </Svg>
  )
}

/** Sits beside a form-level error. */
export function AlertIcon({ size = 15 }) {
  return (
    <Svg size={size} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.2v.3" />
    </Svg>
  )
}

/** Submit affordance — the form's forward motion. */
export function ArrowRightIcon({ size = 16 }) {
  return (
    <Svg size={size} strokeWidth={2.1}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  )
}

/** Ends the session, from the sidebar. */
export function LogOutIcon({ size = 15 }) {
  return (
    <Svg size={size} strokeWidth={1.6}>
      <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
      <path d="m15.5 16 4-4-4-4" />
      <path d="M19.5 12H9.5" />
    </Svg>
  )
}

/* Google's mark. Multi-colour by definition, so it opts out of the shared Svg
   wrapper's currentColor stroke entirely. */
export function GoogleIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7C7.8 41 15.3 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.8l7.4-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 30 2 24 2 15.3 2 7.8 7 4.3 14.2l7.4 5.7c1.7-5.2 6.6-9.1 12.3-9.1z"
      />
    </svg>
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
