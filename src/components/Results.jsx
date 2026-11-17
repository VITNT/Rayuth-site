import { useEffect, useRef } from 'react'
import { gsap, useGSAP, isTouch } from '../lib.js'
import { results, fmtTime, fmtDate, per50, speed, fastest, latestPB } from '../data.js'
import JumpText from './JumpText.jsx'

const DIGITS = [...'0123456789']

function Odometer({ value }) {
  return (
    <span className="odo" aria-label={value}>
      {[...value].map((ch, i) =>
        /\d/.test(ch) ? (
          <span className="odo-col" key={i} data-digit={ch} aria-hidden>
            <span className="odo-strip">{DIGITS.map((d) => <span key={d}>{d}</span>)}</span>
          </span>
        ) : (
          <span className="odo-sep" key={i} aria-hidden>{ch}</span>
        )
      )}
    </span>
  )
}

function Counter({ to, decimals = 0, suffix = '' }) {
  const el = useRef(null)
  useGSAP(() => {
    const o = { v: 0 }
    gsap.to(o, {
      v: to, duration: 2, ease: 'expo.out',
      scrollTrigger: { trigger: el.current, start: 'top 90%' },
      onUpdate: () => { el.current.textContent = o.v.toFixed(decimals) },
    })
  })
  return <><span ref={el}>{(0).toFixed(decimals)}</span>{suffix && <small>{suffix}</small>}</>
}

export default function Results() {
  const root = useRef(null)
  const preview = useRef(null)

  useGSAP(() => {
    const q = gsap.utils.selector(root)
    gsap.from(q('.rs-title .jt-char'), { yPercent: 100, autoAlpha: 0, stagger: 0.04, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: q('.rs-title')[0], start: 'top 85%' } })
    q('.rs-row').forEach((row) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 90%' } })
      tl.from(row.querySelector('.rs-line'), { scaleX: 0, duration: 1.2, ease: 'expo.inOut' })
        .from(row.querySelectorAll('.rs-cell'), { yPercent: 60, autoAlpha: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out' }, '-=0.8')
        .add(() => {
          row.querySelectorAll('.odo-col').forEach((c, i) => {
            gsap.fromTo(c.firstChild, { yPercent: 0 }, { yPercent: -10 * Number(c.dataset.digit), duration: 1.6 + i * 0.12, ease: 'expo.out' })
          })
        }, '-=0.7')
      const bar = row.querySelector('.rs-bar i')
      if (bar) tl.from(bar, { scaleX: 0, duration: 1.4, ease: 'expo.out' }, '<')
    })
    gsap.from(q('.rs-kpi'), { y: 50, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: q('.rs-kpis')[0], start: 'top 85%' } })
  }, { scope: root })

  // floating photo preview that follows the cursor across rows.
  // Hover state is derived from what's actually under the pointer (on move AND scroll),
  // so fast scrolling can't leave a stale preview on screen.
  useEffect(() => {
    if (isTouch()) return
    const p = preview.current
    const imgs = p.querySelectorAll('img')
    const xTo = gsap.quickTo(p, 'x', { duration: 0.6, ease: 'power3' })
    const yTo = gsap.quickTo(p, 'y', { duration: 0.6, ease: 'power3' })
    const rTo = gsap.quickTo(p, 'rotation', { duration: 0.8, ease: 'power3' })
    let lx = -1, ly = -1, active = null, raf = 0

    const show = (img) => {
      imgs.forEach((el) => gsap.to(el, { autoAlpha: el.dataset.src === img ? 1 : 0, scale: el.dataset.src === img ? 1 : 1.2, duration: 0.5, overwrite: 'auto' }))
      gsap.to(p, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'expo.out', overwrite: 'auto' })
    }
    const hide = () => gsap.to(p, { scale: 0.8, autoAlpha: 0, duration: 0.2, ease: 'power2.out', overwrite: 'auto' })

    const sync = () => {
      raf = 0
      const el = lx < 0 ? null : document.elementFromPoint(lx, ly)
      const row = el && root.current.contains(el) ? el.closest('.rs-row[data-img]') : null
      const img = row ? row.dataset.img : null
      if (img === active) return
      active = img
      img ? show(img) : hide()
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(sync) }

    const move = (e) => {
      xTo(e.clientX); yTo(e.clientY); rTo(gsap.utils.clamp(-12, 12, (e.clientX - lx) * 0.6))
      lx = e.clientX; ly = e.clientY
      queue()
    }
    const leave = () => { lx = ly = -1; queue() }
    window.addEventListener('pointermove', move)
    window.addEventListener('scroll', queue, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('scroll', queue)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [])

  const slowest50 = Math.max(...results.map(per50))

  return (
    <section id="results" className="results section" ref={root}>
      <div className="rs-head">
        <p className="label">(03) — Personal bests</p>
        <h2 className="rs-title display"><JumpText text="THE BOARD" reveal={false} /></h2>
        <p className="rs-note">Best times across freestyle, butterfly and backstroke. LCM = 50m pool, SCM = 25m pool.</p>
      </div>

      <div className="rs-kpis">
        <div className="rs-kpi"><span className="label">Events</span><strong><Counter to={results.length} /></strong></div>
        <div className="rs-kpi"><span className="label">Fastest 50</span><strong><Counter to={fastest.time} decimals={2} suffix="s" /></strong></div>
        <div className="rs-kpi"><span className="label">Top speed</span><strong><Counter to={speed(fastest)} decimals={2} suffix="m/s" /></strong></div>
        <div className="rs-kpi"><span className="label">Latest PB</span><strong className="rs-kpi-date">{fmtDate(latestPB.date, { day: '2-digit', month: 'short' })}</strong></div>
      </div>

      <div className="rs-table" role="table" aria-label="Personal best times">
        <div className="rs-row rs-row-head" role="row">
          <span className="rs-line" />
          <span className="rs-cell label" role="columnheader">#</span>
          <span className="rs-cell label" role="columnheader">Event</span>
          <span className="rs-cell label" role="columnheader">Time</span>
          <span className="rs-cell label rs-hide-sm" role="columnheader">Pace / 50m</span>
          <span className="rs-cell label rs-hide-sm" role="columnheader">Date</span>
        </div>
        {results.map((r, i) => (
          <div className="rs-row" role="row" key={r.event} data-img={r.img} data-cursor={r.stroke}>
            <span className="rs-line" />
            <span className="rs-cell rs-idx" role="cell">{String(i + 1).padStart(2, '0')}</span>
            <span className="rs-cell rs-event" role="cell">
              {r.event}<em className={`badge badge-${r.course.toLowerCase()}`}>{r.course}</em>
            </span>
            <span className="rs-cell rs-time" role="cell"><Odometer value={fmtTime(r.time)} /></span>
            <span className="rs-cell rs-pace rs-hide-sm" role="cell">
              <span>{per50(r).toFixed(2)}s</span>
              <span className="rs-bar"><i style={{ '--w': per50(fastest) / per50(r) }} /></span>
            </span>
            <span className="rs-cell rs-date rs-hide-sm" role="cell">{fmtDate(r.date)}</span>
          </div>
        ))}
      </div>
      <p className="rs-foot label">Bar = relative pace per 50m · slowest split {slowest50.toFixed(2)}s</p>

      <div className="rs-preview" ref={preview} aria-hidden>
        {results.map((r) => <img key={r.event} data-src={r.img} src={r.img} alt="" loading="lazy" />)}
      </div>
    </section>
  )
}
