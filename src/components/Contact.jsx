import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, scroller } from '../lib.js'
import { athlete } from '../data.js'
import Magnetic from './Magnetic.jsx'
import JumpText from './JumpText.jsx'

function LocalTime() {
  const [t, setT] = useState('')
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString('en-GB', { timeZone: athlete.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    f()
    const id = setInterval(f, 1000)
    return () => clearInterval(id)
  }, [])
  return <span>{t}</span>
}

export default function Contact() {
  const root = useRef(null)

  useGSAP(() => {
    const q = gsap.utils.selector(root)
    gsap.from(q('.ct-title .jt-char'), { yPercent: 110, rotate: 10, stagger: 0.03, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: q('.ct-title')[0], start: 'top 85%' } })
    gsap.fromTo(q('.ct-wave path'), { attr: { d: 'M0 0 Q50 100 100 0 V0 H0Z' } }, { attr: { d: 'M0 0 Q50 0 100 0 V0 H0Z' }, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 30%', scrub: true } })
    gsap.fromTo(q('.ft-name'), { yPercent: 60 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: q('.footer')[0], start: 'top bottom', end: 'bottom bottom', scrub: true } })
  }, { scope: root })

  return (
    <section id="contact" className="contact" ref={root}>
      <svg className="ct-wave" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><path d="M0 0 Q50 100 100 0 V0 H0Z" /></svg>
      <div className="ct-inner section">
        <p className="label">(07) — Contact</p>
        <h2 className="ct-title display">
          <JumpText text="LET’S" reveal={false} /><br />
          <JumpText text="RACE." reveal={false} className="ct-accent" />
        </h2>
        <div className="ct-row">
          <p className="ct-desc">Coaches, clubs, teams and schools — get in touch about meets, trials or training.</p>
          <Magnetic as="a" href={`mailto:${athlete.email}`} className="ct-cta" strength={0.4} data-cursor="Say hi" data-cursor-color="accent">
            <span data-magnetic-inner className="ct-cta-inner">Get in touch</span>
          </Magnetic>
        </div>
      </div>

      <footer className="footer">
        <div className="ft-row">
          <div><span className="label">Local time — {athlete.location}</span><LocalTime /></div>
          <div className="ft-links">
            {athlete.socials.map((s) => <a key={s.label} href={s.href} className="ul-link">{s.label}</a>)}
            <a href={`mailto:${athlete.email}`} className="ul-link">Email</a>
          </div>
          <Magnetic as="button" className="btn-round btn-light" onClick={() => scroller.lenis?.scrollTo(0, { duration: 2.2 })} data-cursor="Lap again">
            <span data-magnetic-inner>Back to top ↑</span>
          </Magnetic>
        </div>
        <div className="ft-name-wrap" aria-hidden><div className="ft-name">VATHARAYUTH</div></div>
        <div className="ft-legal label"><span>© {new Date().getFullYear()} {athlete.first} {athlete.last}</span><span>Designed in the deep end</span></div>
      </footer>
    </section>
  )
}
