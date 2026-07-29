import { useState } from 'react'

/* The contents of an avatar circle — the photo, or the initials.
 *
 * Callers own the circle itself, because it is sized and coloured differently
 * everywhere it appears (32px in the top bar, 38px in the profile card, 28px in
 * the sidebar). This owns only the part that has a decision in it.
 *
 * The fallback is not just for accounts without a photo. `avatar_url` is stored
 * at sign-in and never revalidated, so a provider URL can start 404ing or rate
 * limiting months later — and a blank circle is strictly worse than the initials
 * we can always derive.
 */
export default function AvatarContent({ user }) {
  const [broken, setBroken] = useState(false)

  if (!user?.avatar || broken) return user?.initials ?? '·'

  return (
    <img
      className="h2c-avatar__img"
      src={user.avatar}
      alt=""
      /* Google serves profile images 403 to requests carrying a referrer from an
         unrecognised origin, which is every deploy of this app. */
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  )
}
