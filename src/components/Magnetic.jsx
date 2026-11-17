import { useEffect, useRef } from 'react'
import { gsap, isTouch } from '../lib.js'

// Only one magnet may hold the cursor at a time.
let active = null
const pointer = { x: -1e4, y: -1e4 }

// Wrap any element: once the pointer enters, it latches on like a magnet — the element
// follows the pointer (inner label further) and keeps holding on a little past its edge,
// until the pointer pulls `release` px away and it snaps back.
// Emits `magnetic:enter` / `magnetic:leave` on window so the cursor can merge into it.
export default function Magnetic({ children, strength = 0.35, inner = 0.6, release = 36, className = '', ref: forwardedRef, as: Tag = 'div', ...rest }) {
  const ownRef = useRef(null)
  const el = forwardedRef ?? ownRef
  useEffect(() => {
    if (isTouch()) return
    const node = el.current
    const label = node.querySelector('[data-magnetic-inner]')
    const ease = 'elastic.out(1, 0.35)'
    const xTo = gsap.quickTo(node, 'x', { duration: 0.9, ease })
    const yTo = gsap.quickTo(node, 'y', { duration: 0.9, ease })
    const lx = label && gsap.quickTo(label, 'x', { duration: 0.9, ease })
    const ly = label && gsap.quickTo(label, 'y', { duration: 0.9, ease })

    const emit = (type) => window.dispatchEvent(new CustomEvent(type, { detail: { node } }))
    const letGo = () => {
      if (active !== node) return
      active = null
      node.classList.remove('is-engaged')
      xTo(0); yTo(0)
      if (label) { lx(0); ly(0) }
      emit('magnetic:leave')
    }

    const update = () => {
      // resting rect (strip the current magnetic offset)
      const r = node.getBoundingClientRect()
      const cx = r.left - gsap.getProperty(node, 'x') + r.width / 2
      const cy = r.top - gsap.getProperty(node, 'y') + r.height / 2
      const x = pointer.x - cx
      const y = pointer.y - cy
      const ox = Math.max(0, Math.abs(x) - r.width / 2)
      const oy = Math.max(0, Math.abs(y) - r.height / 2)

      if (active !== node) {
        if (active || ox > 0 || oy > 0) return
        // must actually be the thing under the pointer (not covered by the header/menu, not hidden)
        if (!node.contains(document.elementFromPoint(pointer.x, pointer.y))) return
        active = node
        node.classList.add('is-engaged')
        emit('magnetic:enter')
      } else if (Math.hypot(ox, oy) > release) {
        letGo()
        return
      }
      xTo(x * strength); yTo(y * strength)
      if (label) { lx(x * strength * inner); ly(y * strength * inner) }
    }
    const move = (e) => { pointer.x = e.clientX; pointer.y = e.clientY; update() }
    // while holding the cursor, keep checking every frame — the element can move out from under a
    // still pointer (scrolling, the header sliding away) and the magnet must let go then too
    const hold = () => { if (active === node) update() }
    gsap.ticker.add(hold)

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    document.addEventListener('pointerleave', letGo)
    window.addEventListener('blur', letGo)
    return () => {
      gsap.ticker.remove(hold)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('scroll', update)
      document.removeEventListener('pointerleave', letGo)
      window.removeEventListener('blur', letGo)
      letGo()
    }
  }, [el, strength, inner, release])
  return <Tag ref={el} className={`magnetic ${className}`} {...rest}>{children}</Tag>
}
