import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../lib.js'
import PoolScene from '../three/PoolScene.js'
import JumpText from './JumpText.jsx'
import { athlete } from '../data.js'

export default function Hero({ ready }) {
  const root = useRef(null)
  const canvas = useRef(null)
  const scene = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    try {
      scene.current = new PoolScene(canvas.current)
    } catch (e) {
      console.warn('WebGL unavailable', e)
      return
    }
    const io = new IntersectionObserver(([en]) => scene.current?.setVisible(en.isIntersecting))
    io.observe(root.current)
    return () => { io.disconnect(); scene.current?.dispose() }
  }, [])

  useGSAP(() => {
    const q = gsap.utils.selector(root)
    // Shrink the water surface and lift the name as the hero leaves view.
    gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (st) => scene.current?.setScroll(st.progress) } })
      .to(q('.hero-stage'), { scale: 0.9, borderRadius: '2.5vw', ease: 'none' }, 0)
      .to(q('.hero-name'), { yPercent: -18, ease: 'none' }, 0)
      .to(q('.hn-tag'), { y: -100, autoAlpha: 0, ease: 'none' }, 0)
  }, { scope: root })

  useGSAP(() => {
    if (!ready) return
    const q = gsap.utils.selector(root)
    gsap.timeline({ delay: 0.15 })
      .fromTo(q('.hero-stage'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' })
      .fromTo(q('.hero-name .jt-char'), { yPercent: 120, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.4, ease: 'expo.out', stagger: 0.035 }, '-=0.7')
      .fromTo(q('.hero-fade'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, '-=1.1')
  }, { scope: root, dependencies: [ready] })

  return (
    <section id="top" className="hero" ref={root}>
      <div className="hero-stage">
        <canvas ref={canvas} className="hero-canvas" aria-hidden="true" />

        <div className="hero-name">
          <p className="hn-tag hero-fade">
            <em>Student athlete</em> — sprint freestyle, butterfly &amp; backstroke. Goalkeeper on the weekends.
          </p>
          <h1 className="hn-title">
            <JumpText text={athlete.first.toUpperCase()} className="hn-first" />
            <JumpText text={athlete.last.toUpperCase()} className="hn-last" />
          </h1>
        </div>
      </div>
    </section>
  )
}
