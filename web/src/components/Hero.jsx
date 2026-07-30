/* The landing hero.
 *
 * Positioned as a skills platform, not a chat product: the promise is that you
 * get better at the things you are assessed on, and the four modes are the
 * surfaces that happens on. It deliberately does not restate the "How it works"
 * page's line ("You can't improve what nobody scores") — that page argues the
 * case, this one is the door you walk through.
 *
 * Both lines are white-space: nowrap above 760px, so the title has roughly 34
 * characters before it starts overhanging the 760px column. Keep it short.
 */
export default function Hero() {
  return (
    <div className="h2c-hero-layer">
      <div className="h2c-hero">
        <h1 className="h2c-hero__title">
          Sharpen what <em>you&apos;re measured on</em>
        </h1>
        <p className="h2c-hero__sub">
          Mock interviews, resume reviews, your own documents -{' '}
          <em>every attempt scored</em>.
        </p>
      </div>
    </div>
  )
}
