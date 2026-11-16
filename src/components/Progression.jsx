import { useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../lib.js'
import { results, fmtTime, fmtDate } from '../data.js'
import JumpText from './JumpText.jsx'

const entries = [...results].sort((a, b) => a.date.localeCompare(b.date))

// lane-line path that wiggles down the page; drawn as you scroll
const PATH = 'M40 0 V180 C40 220 80 220 80 260 V520 C80 560 40 560 40 600 V860 C40 900 80 900 80 940 V1200 C80 1240 40 1240 40 1280 V1600'

export default function Progression() {
  const root = useRef(null)
  const [active, setActive] = useState(0)

  useGSAP(() => {
    const q = gsap.utils.selector(root)
    const path = q('.pg-path')[0]
    const len = path.getTotalLength()
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len })
    gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: q('.pg-list')[0], start: 'top 70%', end: 'bottom 60%', scrub: true } })
    q('.pg-entry').forEach((el, i) => {
      ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'bottom 60%', onToggle: (s) => s.isActive && setActive(i) })
      gsap.from(el.querySelectorAll('.pg-anim'), { y: 60, autoAlpha: 0, stagger: 0.08, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 80%' } })
    })
    gsap.fromTo(q('.pg-photo img'), { yPercent: -10, scale: 1.15 }, { yPercent: 10, scale: 1.15, ease: 'none', scrollTrigger: { trigger: root.current, scrub: true } })
  }, { scope: root })

  const cur = entries[active]
  const year = cur.date.slice(0, 4)

  return (
    <section className="progress section" ref={root}>
      <div className="pg-head">
        <p className="label">(05) — Progression</p>
        <h2 className="display"><JumpText text="SEASON" reveal={false} /> <span className="serif-i">in splits</span></h2>
      </div>

      <div className="pg-grid">
        <div className="pg-sticky">
          <div className="pg-year" aria-live="polite">
            {[...year].map((d, i) => (
              <span className="pg-digit" key={i}>
                <span className="pg-digit-strip" style={{ transform: `translateY(${-Number(d) * 10}%)` }}>
                  {[...'0123456789'].map((n) => <span key={n}>{n}</span>)}
                </span>
              </span>
            ))}
          </div>
          <figure className="pg-photo"><img src="/img/medals.jpg" alt="A row of race medals on a pillow next to a teddy bear wearing sunglasses" loading="lazy" /></figure>
          <p className="pg-caption label">Medal count — growing. Bear — unbothered.</p>
        </div>

        <div className="pg-list">
          <svg className="pg-line" viewBox="0 0 120 1600" preserveAspectRatio="none" aria-hidden>
            <path className="pg-path-bg" d={PATH} />
            <path className="pg-path" d={PATH} />
          </svg>
          {entries.map((r, i) => (
            <article className={`pg-entry ${i === active ? 'is-active' : ''}`} key={r.event}>
              <span className="pg-dot" />
              <span className="label pg-anim">{fmtDate(r.date, { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <h3 className="pg-time pg-anim">{fmtTime(r.time)}</h3>
              <p className="pg-event pg-anim">{r.event} <em>{r.stroke} · {r.course === 'LCM' ? 'Long course' : 'Short course'}</em></p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
