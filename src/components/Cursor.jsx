import { useEffect, useRef, useState } from 'react'
import { gsap, isTouch } from '../lib.js'

// Dot + lagging ring. Elements can set data-cursor="Label" to show a label,
// data-cursor-color="accent|ink" to tint, and any a/button grows the ring.
export default function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)
  const [label, setLabel] = useState('')
  const [enabled] = useState(() => !isTouch())

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-cursor')
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3' })
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3' })
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.55, ease: 'power3' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.55, ease: 'power3' })
    let last = { x: 0, y: 0, t: 0 }
    let shown = false

    const move = (e) => {
      if (!shown) { shown = true; gsap.to([dot.current, ring.current], { autoAlpha: 1, duration: 0.3 }) }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY)
      // stretch the ring with velocity
      const now = performance.now()
      const vx = (e.clientX - last.x) / Math.max(1, now - last.t)
      const vy = (e.clientY - last.y) / Math.max(1, now - last.t)
      const v = Math.min(1.6, Math.hypot(vx, vy))
      const ang = Math.atan2(vy, vx) * 180 / Math.PI
      gsap.to(ring.current.firstChild, { rotate: ang, scaleX: 1 + v * 0.22, scaleY: 1 - v * 0.12, duration: 0.3, overwrite: true })
      last = { x: e.clientX, y: e.clientY, t: now }
    }
    const over = (e) => {
      const t = e.target.closest?.('[data-cursor], a, button, [data-hover]')
      const lab = t?.getAttribute?.('data-cursor') || ''
      setLabel(lab)
      ring.current.classList.toggle('is-hover', !!t && !lab)
      ring.current.classList.toggle('is-label', !!lab)
      const c = t?.getAttribute?.('data-cursor-color')
      ring.current.dataset.color = c || ''
    }
    const down = () => gsap.to(ring.current, { scale: 0.75, duration: 0.2 })
    const up = () => gsap.to(ring.current, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
    const leave = () => { shown = false; gsap.to([dot.current, ring.current], { autoAlpha: 0, duration: 0.3 }) }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerover', over)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    document.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.removeEventListener('pointerleave', leave)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div className="cursor-ring" ref={ring} aria-hidden>
        <div className="cursor-ring-shape" />
        <span className="cursor-label">{label}</span>
      </div>
      <div className="cursor-dot" ref={dot} aria-hidden />
    </>
  )
}
