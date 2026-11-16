import { useRef } from 'react'
import { gsap, useGSAP } from '../lib.js'
import { pitch } from '../data.js'
import JumpText from './JumpText.jsx'

// Off-track: the goalkeeper side. Stacked photos with differing parallax speeds.
export default function Pitch() {
  const root = useRef(null)

  useGSAP(() => {
    const q = gsap.utils.selector(root)
    q('.pt-card').forEach((c) => {
      const sp = Number(c.dataset.speed)
      gsap.fromTo(c, { y: 120 * sp }, { y: -120 * sp, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.fromTo(c.querySelector('.pt-frame'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: c, start: 'top 90%' } })
    })
    gsap.fromTo(q('.pt-big'), { xPercent: 10 }, { xPercent: -25, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } })
  }, { scope: root })

  return (
    <section id="pitch" className="pitch section" ref={root}>
      <div className="pt-big" aria-hidden>GOALKEEPER · GOALKEEPER ·</div>
      <div className="pt-head">
        <p className="label">(06) — On the pitch</p>
        <h2 className="display"><JumpText text="SAFE" reveal={false} /> <span className="serif-i">hands.</span></h2>
        <p className="pt-desc">Out of the pool he trades goggles for gloves — keeping goal for his school’s football and futsal teams. Same reflexes as a relay takeover, just with a ball coming at your face.</p>
      </div>
      <div className="pt-cards">
        {pitch.map((p, i) => (
          <figure className={`pt-card pt-card-${i}`} key={p.src} data-speed={[0.4, 1, 0.6, 1.3][i]} data-cursor={p.title}>
            <div className="pt-frame"><img src={p.src} alt={p.title} loading="lazy" /></div>
            <figcaption className="label">{p.title}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
