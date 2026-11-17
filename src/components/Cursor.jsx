import { useEffect, useRef, useState } from 'react'
import { gsap, isTouch } from '../lib.js'

// Dot + spring-driven ring. Elements can set data-cursor="Label" to show a label,
// data-cursor-color="accent|ink" to tint, and any a/button grows the ring.
// <Magnetic> elements swallow the cursor: the ring morphs into the element's outline and
// rides along with it, then gets yanked back out to the pointer when the magnet lets go.
export default function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)
  const [label, setLabel] = useState('')
  const [enabled] = useState(() => !isTouch())

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-cursor')
    const ringEl = ring.current
    const shape = ringEl.firstChild
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3' })
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3' })
    const setX = gsap.quickSetter(ringEl, 'x', 'px')
    const setY = gsap.quickSetter(ringEl, 'y', 'px')
    const setRot = gsap.quickSetter(shape, 'rotate', 'deg')
    const setSX = gsap.quickSetter(shape, 'scaleX')
    const setSY = gsap.quickSetter(shape, 'scaleY')

    const ptr = { x: -100, y: -100 }
    const pos = { x: -100, y: -100 }
    const vel = { x: 0, y: 0 }
    let stuck = null          // magnetic element the cursor is merged into
    let releasedAt = -1e9     // time of last tear-off (springier for a moment after)
    let hoverTarget = null
    let shown = false

    const applyHover = () => {
      const t = hoverTarget
      const lab = t?.getAttribute?.('data-cursor') || ''
      setLabel(lab)
      ringEl.classList.toggle('is-hover', !stuck && !!t && !lab)
      ringEl.classList.toggle('is-label', !stuck && !!lab)
      ringEl.dataset.color = t?.getAttribute?.('data-cursor-color') || ''
    }

    const tick = () => {
      const dt = gsap.ticker.deltaRatio(60)
      if (stuck) {
        // glue to the element's live centre (it moves with its own magnetic tween) — no spring,
        // so the ring can never drift off the button
        const r = stuck.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const a = 1 - Math.pow(1 - 0.35, dt)
        vel.x = (cx - pos.x) * a; vel.y = (cy - pos.y) * a
        pos.x += vel.x; pos.y += vel.y
        setX(pos.x); setY(pos.y)
        setRot(0); setSX(1); setSY(1)
        return
      }
      const tx = ptr.x, ty = ptr.y
      let k, damp
      if (performance.now() - releasedAt < 700) {
        k = 0.11; damp = 0.8      // snap-out: loose and wobbly
      } else {
        k = 0.13; damp = 0.68
      }
      vel.x = (vel.x + (tx - pos.x) * k * dt) * Math.pow(damp, dt)
      vel.y = (vel.y + (ty - pos.y) * k * dt) * Math.pow(damp, dt)
      pos.x += vel.x * dt
      pos.y += vel.y * dt
      setX(pos.x); setY(pos.y)
      // stretch along the direction of travel
      const speed = Math.min(1, Math.hypot(vel.x, vel.y) / 45)
      setRot(Math.atan2(vel.y, vel.x) * 180 / Math.PI)
      setSX(1 + speed * 0.45)
      setSY(1 - speed * 0.25)
    }
    gsap.ticker.add(tick)

    const stick = (e) => {
      const node = e.detail.node
      stuck = node
      // morph to the exact footprint of the element, fading out as it lands — the cursor
      // disappears into the button and the button itself shows the engaged state
      const r = node.getBoundingClientRect()
      shape.style.width = `${r.width}px`
      shape.style.height = `${r.height}px`
      shape.style.borderRadius = getComputedStyle(node).borderRadius
      ringEl.classList.add('is-stuck')
      applyHover()
      gsap.to(dot.current, { scale: 0, duration: 0.3, ease: 'power3.out', overwrite: 'auto' })
    }
    const unstick = (e) => {
      if (e.detail.node !== stuck) return
      stuck = null
      releasedAt = performance.now()
      shape.style.width = shape.style.height = shape.style.borderRadius = ''
      ringEl.classList.remove('is-stuck')
      hoverTarget = document.elementFromPoint(ptr.x, ptr.y)?.closest?.('[data-cursor], a, button, [data-hover]') || null
      applyHover()
      gsap.to(dot.current, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' })
    }

    const move = (e) => {
      ptr.x = e.clientX; ptr.y = e.clientY
      if (!shown) {
        shown = true
        if (pos.x < 0) { pos.x = ptr.x; pos.y = ptr.y }
        gsap.to([dot.current, ringEl], { autoAlpha: 1, duration: 0.3 })
      }
      dx(e.clientX); dy(e.clientY)
    }
    const over = (e) => {
      hoverTarget = e.target.closest?.('[data-cursor], a, button, [data-hover]') || null
      applyHover()
    }
    const down = () => gsap.to(ringEl, { scale: 0.75, duration: 0.2 })
    const up = () => gsap.to(ringEl, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
    const leave = () => { shown = false; gsap.to([dot.current, ringEl], { autoAlpha: 0, duration: 0.3 }) }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerover', over)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('magnetic:enter', stick)
    window.addEventListener('magnetic:leave', unstick)
    document.addEventListener('pointerleave', leave)
    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('magnetic:enter', stick)
      window.removeEventListener('magnetic:leave', unstick)
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
