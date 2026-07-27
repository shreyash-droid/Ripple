import { ArrowDownIcon } from './Icons'

export default function Hero() {
  return (
    <div className="h2c-hero-layer">
      <div className="h2c-hero">
        <h1 className="h2c-hero__title">AI that adapts to how you think</h1>
        <p className="h2c-hero__sub">One conversation, shaped around your way of reasoning.</p>
      </div>
      <div className="h2c-scrollcue">
        Scroll
        <ArrowDownIcon />
      </div>
    </div>
  )
}
