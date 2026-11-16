import { useEffect, useRef } from 'react'
import { ScrollTrigger } from '../lib.js'
import { results, fmtTime } from '../data.js'

// Infinite marquee whose speed + skew react to scroll velocity.
export default function Marquee() {
  const track = useRef(null)
  const root = useRef(null)

  useEffect(() => {
    const el = track.current
    let x = 0, dir = -1, boost = 0, raf
    const half = () => el.scrollWidth / 2
    const st = ScrollTrigger.create({
      trigger: root.current, start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => {
        const v = self.getVelocity()
        dir = v > 0 ? -1 : 1
        boost = Math.min(Math.abs(v) / 120, 14)
      },
    })
    let sk = 0
    const loop = () => {
      x += dir * (1.2 + boost)
      boost *= 0.92
      const w = half()
      if (x < -w) x += w
      if (x > 0) x -= w
      sk += (-dir * boost * 0.9 - sk) * 0.1
      el.style.transform = `translate3d(${x}px,0,0) skewX(${sk.toFixed(2)}deg)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); st.kill() }
  }, [])

  const items = results.map((r) => (
    <span className="mq-item" key={r.event}>
      <span className="mq-time">{fmtTime(r.time)}</span>
      <span className="mq-event">{r.event}<small>{r.course}</small></span>
      <svg className="mq-sep" viewBox="0 0 40 20" aria-hidden><path d="M0 10c5 0 5-6 10-6s5 12 10 12 5-12 10-12 5 6 10 6" fill="none" stroke="currentColor" strokeWidth="2.5"/></svg>
    </span>
  ))

  return (
    <section className="marquee" ref={root} aria-label="Personal best times">
      <div className="mq-track" ref={track}>{items}{items}</div>
    </section>
  )
}
