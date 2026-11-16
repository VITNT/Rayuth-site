import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib.js'
import { results, latestPB, fmtTime } from '../data.js'

const PRELOAD = ['/img/fly.jpg', '/img/blocks.jpg', '/img/free-close.jpg', '/img/start.jpg', '/img/back.jpg']

const wavePath = (() => {
  let d = 'M0 0'
  for (let x = 0; x <= 2000; x += 25) d += ` L${x} ${Math.sin((x / 250) * Math.PI * 2) * 10}`
  return d + ' L2000 400 L0 400 Z'
})()

const STATUS = ['Take your marks', 'Set', 'Go']

export default function Preloader({ onDone }) {
  const root = useRef(null)
  const [pct, setPct] = useState(0)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const state = { real: 0, shown: 0 }
    let loadedCount = 0
    const total = PRELOAD.length + 1
    const bump = () => { loadedCount++; state.real = loadedCount / total }
    PRELOAD.forEach((src) => { const i = new Image(); i.onload = i.onerror = bump; i.src = src })
    ;(document.fonts?.ready ?? Promise.resolve()).then(bump)

    const q = gsap.utils.selector(root)
    const wave = q('.pl-wave')[0]
    const swimmer = q('.pl-dot')[0]

    gsap.from(q('.pl-in'), { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.1 })

    // displayed progress eases toward the real one but takes at least ~2.4s
    const minTime = 2.4
    const start = performance.now()
    let finished = false
    const tick = () => {
      const t = (performance.now() - start) / 1000
      const cap = Math.min(1, t / minTime)
      const target = Math.min(state.real, cap)
      state.shown += (target - state.shown) * 0.08
      if (target === 1 && state.shown > 0.995) state.shown = 1
      const p = state.shown
      setPct(p)
      gsap.set(wave, { y: 230 - p * 260 })
      gsap.set(swimmer, { left: `${p * 100}%` })
      if (p >= 1 && !finished) { finished = true; exit() }
      if (!finished) raf = requestAnimationFrame(tick)
    }
    let raf = requestAnimationFrame(tick)

    const exit = () => {
      const tl = gsap.timeline({ delay: 0.25 })
      tl.to(q('.pl-in'), { yPercent: -110, duration: 0.7, ease: 'expo.in', stagger: 0.03 })
        .to(q('.pl-curve path'), { attr: { d: 'M0 0 Q50 100 100 0 L100 0 L0 0Z' }, duration: 0.5, ease: 'power2.in' }, '-=0.15')
        .to(root.current, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '<')
        .to(q('.pl-curve path'), { attr: { d: 'M0 0 Q50 0 100 0 L100 0 L0 0Z' }, duration: 0.6, ease: 'power2.out' }, '-=0.45')
        .add(() => onDone?.(), '-=0.75')
        .add(() => setGone(true))
    }

    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (gone) return null
  const n = Math.round(pct * 100)
  const status = STATUS[Math.min(2, Math.floor(pct * 3))]

  return (
    <div className="preloader" ref={root} aria-label="Loading">
      <div className="pl-top">
        <span className="mask"><span className="pl-in">Vatharayuth Thy</span></span>
        <span className="mask"><span className="pl-in">Student Athlete — ’26</span></span>
      </div>

      <div className="pl-center">
        <span className="mask pl-svg-mask">
          <svg className="pl-in pl-word" viewBox="0 0 1000 220" aria-hidden>
            <defs>
              <clipPath id="pl-clip">
                <text x="500" y="196" textAnchor="middle" textLength="990" lengthAdjust="spacingAndGlyphs">RAYUTH</text>
              </clipPath>
            </defs>
            <text className="pl-outline" x="500" y="196" textAnchor="middle" textLength="990" lengthAdjust="spacingAndGlyphs">RAYUTH</text>
            <g clipPath="url(#pl-clip)">
              <g className="pl-wave"><path className="pl-wave-path" d={wavePath} /></g>
            </g>
          </svg>
        </span>

        <div className="pl-lane">
          <span className="mask"><span className="pl-in">0m</span></span>
          <div className="pl-track">
            <span className="pl-dot" />
          </div>
          <span className="mask"><span className="pl-in">50m</span></span>
        </div>
      </div>

      <div className="pl-bottom">
        <span className="mask"><span className="pl-in pl-status" key={status}>{status}</span></span>
        <span className="mask"><span className="pl-in pl-meta">PB {latestPB.event} · {fmtTime(latestPB.time)} · {results.length} events</span></span>
        <span className="mask"><span className="pl-in pl-count">{String(n).padStart(3, '0')}</span></span>
      </div>

      <svg className="pl-curve" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0 0 Q50 0 100 0 L100 0 L0 0Z" />
      </svg>
    </div>
  )
}
