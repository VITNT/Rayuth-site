import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { gsap } from '../lib.js'

// curves for the panel's leading / trailing edges (viewBox 0 0 100 100, stretched)
const FLAT_TOP = 'M0 100 Q50 100 100 100 L100 100 L0 100Z'
const BULGE_TOP = 'M0 100 Q50 0 100 100 L100 100 L0 100Z'
const FLAT_BOT = 'M0 0 Q50 0 100 0 L100 0 L0 0Z'
const BULGE_BOT = 'M0 0 Q50 100 100 0 L100 0 L0 0Z'

/**
 * Page-transition loader shown after a nav click.
 * play(label, onCovered) → panel sweeps up over the page, runs onCovered
 * (jump scroll / close menu while hidden), then sweeps away.
 */
const NavLoader = forwardRef(function NavLoader(_, ref) {
  const root = useRef(null)
  const busy = useRef(false)
  const [label, setLabel] = useState('')

  useImperativeHandle(ref, () => ({
    get busy() { return busy.current },
    play(nextLabel, onCovered) {
      if (busy.current) return
      busy.current = true
      setLabel(nextLabel)

      const q = gsap.utils.selector(root)
      const el = root.current
      gsap.killTweensOf([el, ...q('*')])

      gsap.timeline({
        onComplete: () => {
          busy.current = false
          gsap.set(el, { visibility: 'hidden' })
        },
      })
        .set(el, { visibility: 'visible', y: 0, yPercent: 100 })
        .set(q('.nl-in'), { yPercent: 110 })
        .set(q('.nl-fill'), { scaleX: 0 })
        .set(q('.nl-dot'), { left: '0%' })
        .set(q('.nl-curve-top path'), { attr: { d: FLAT_TOP } })
        .set(q('.nl-curve-bot path'), { attr: { d: FLAT_BOT } })
        // sweep in
        .to(q('.nl-curve-top path'), { attr: { d: BULGE_TOP }, duration: 0.4, ease: 'power2.in' })
        .to(el, { yPercent: 0, duration: 0.85, ease: 'expo.inOut' }, '<')
        .to(q('.nl-curve-top path'), { attr: { d: FLAT_TOP }, duration: 0.5, ease: 'power2.out' }, '-=0.4')
        .to(q('.nl-in'), { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.05 }, '-=0.35')
        // progress lane
        .to(q('.nl-fill'), { scaleX: 1, duration: 0.75, ease: 'power2.inOut' }, '-=0.5')
        .to(q('.nl-dot'), { left: '100%', duration: 0.75, ease: 'power2.inOut' }, '<')
        .add(() => onCovered?.())
        // sweep out
        .to(q('.nl-in'), { yPercent: -110, duration: 0.55, ease: 'expo.in', stagger: 0.03 }, '+=0.1')
        .to(q('.nl-curve-bot path'), { attr: { d: BULGE_BOT }, duration: 0.4, ease: 'power2.in' }, '-=0.15')
        .to(el, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '<')
        .to(q('.nl-curve-bot path'), { attr: { d: FLAT_BOT }, duration: 0.5, ease: 'power2.out' }, '-=0.4')
    },
  }), [])

  return (
    <div className="nav-loader" ref={root} aria-hidden="true">
      <svg className="nl-curve nl-curve-top" viewBox="0 0 100 100" preserveAspectRatio="none"><path d={FLAT_TOP} /></svg>

      <div className="nl-center">
        <span className="mask"><span className="nl-in nl-kicker">Diving to</span></span>
        <span className="mask"><span className="nl-in nl-title">{label}</span></span>
        <div className="nl-lane">
          <span className="mask"><span className="nl-in">0m</span></span>
          <div className="nl-track">
            <span className="nl-fill" />
            <span className="nl-dot" />
          </div>
          <span className="mask"><span className="nl-in">50m</span></span>
        </div>
      </div>

      <svg className="nl-curve nl-curve-bot" viewBox="0 0 100 100" preserveAspectRatio="none"><path d={FLAT_BOT} /></svg>
    </div>
  )
})

export default NavLoader
