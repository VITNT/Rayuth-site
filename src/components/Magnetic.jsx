import { useEffect, useRef } from 'react'
import { gsap, isTouch } from '../lib.js'

// Wrap any element: it gets pulled toward the pointer, its inner label pulled further.
export default function Magnetic({ children, strength = 0.35, inner = 0.6, className = '', ref: forwardedRef, as: Tag = 'div', ...rest }) {
  const ownRef = useRef(null)
  const el = forwardedRef ?? ownRef
  useEffect(() => {
    if (isTouch()) return
    const node = el.current
    const label = node.querySelector('[data-magnetic-inner]')
    const xTo = gsap.quickTo(node, 'x', { duration: 0.9, ease: 'elastic.out(1, 0.35)' })
    const yTo = gsap.quickTo(node, 'y', { duration: 0.9, ease: 'elastic.out(1, 0.35)' })
    const lx = label && gsap.quickTo(label, 'x', { duration: 0.9, ease: 'elastic.out(1, 0.35)' })
    const ly = label && gsap.quickTo(label, 'y', { duration: 0.9, ease: 'elastic.out(1, 0.35)' })
    const move = (e) => {
      const r = node.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2)
      const y = e.clientY - (r.top + r.height / 2)
      xTo(x * strength); yTo(y * strength)
      if (label) { lx(x * strength * inner); ly(y * strength * inner) }
    }
    const leave = () => { xTo(0); yTo(0); if (label) { lx(0); ly(0) } }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerleave', leave)
    return () => { node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', leave) }
  }, [el, strength, inner])
  return <Tag ref={el} className={`magnetic ${className}`} {...rest}>{children}</Tag>
}
