import { useEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion, scroller, scrollToId } from '../lib.js'
import Magnetic from './Magnetic.jsx'
import NavLoader from './NavLoader.jsx'
import { athlete } from '../data.js'

const NAV = [
  { label: 'Home', id: '#top' },
  { label: 'Results', id: '#results' },
  { label: 'In the water', id: '#water' },
  { label: 'On the pitch', id: '#pitch' },
  { label: 'Contact', id: '#contact' },
]

export default function Header({ ready }) {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [activeId, setActiveId] = useState('#top')
  const root = useRef(null)
  const menu = useRef(null)
  const tl = useRef(null)
  const toggle = useRef(null)
  const loader = useRef(null)

  useEffect(() => {
    if (!ready) return
    gsap.fromTo(root.current.querySelectorAll('.hd-in'), { yPercent: 120 }, {
      yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: 0.35,
      // un-clip the header buttons once revealed so their magnetic pull isn't cut off by the mask
      onComplete: () => root.current?.querySelectorAll('.hd-right .mask').forEach((m) => { m.style.overflow = 'visible' }),
    })
  }, [ready])

  // The logo can't use mix-blend-mode to invert (the fixed header isolates it), so look at what's
  // actually painted behind it and switch to dark ink over light backgrounds.
  // Sections can override with data-tone="light|dark".
  useEffect(() => {
    const header = root.current
    const logo = header.querySelector('.logo')
    const isLight = (rgb) => {
      const [r, g, b] = rgb.match(/[\d.]+/g).map(Number)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150
    }
    const lightAt = (x, y) => {
      for (const el of document.elementsFromPoint(x, y)) {
        if (header.contains(el)) continue
        // sections can declare their tone when what you see isn't hit-testable (e.g. the WebGL hero)
        const tone = el.closest('[data-tone]')?.dataset.tone
        if (tone) return tone === 'light'
        if (/^(CANVAS|IMG|VIDEO)$/.test(el.tagName)) return false // water / photos read as dark
        const cs = getComputedStyle(el)
        if (cs.backgroundImage !== 'none' && !cs.backgroundImage.includes('data:')) return false
        const bg = cs.backgroundColor
        const a = bg.startsWith('rgba') ? parseFloat(bg.split(',')[3]) : 1
        if (bg !== 'transparent' && a > 0.5) return isLight(bg)
      }
      return isLight(getComputedStyle(document.body).backgroundColor)
    }
    let frame = 0, last = null
    const check = () => {
      if (++frame % 6) return // ~10x a second is plenty
      const r = logo.getBoundingClientRect()
      // sample the middle and the left edge; light only if both are light
      const light = lightAt(r.left + 4, r.top + r.height / 2) && lightAt(r.left + r.width / 2, r.top + r.height / 2)
      if (light !== last) { last = light; header.classList.toggle('on-light', light) }
    }
    gsap.ticker.add(check)
    return () => gsap.ticker.remove(check)
  }, [])

  // hide on scroll down, show on scroll up
  useEffect(() => {
    let last = 0
    const on = () => {
      const y = window.scrollY
      setHidden(y > 200 && y > last && !open)
      last = y
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [open])

  useEffect(() => {
    if (prefersReducedMotion()) return
    const panel = menu.current
    tl.current = gsap.timeline({ paused: true })
      .fromTo(panel, { clipPath: 'circle(0% at 96% 5%)' }, { clipPath: 'circle(150% at 96% 5%)', duration: 0.85, ease: 'expo.inOut' })
      .fromTo(panel.querySelectorAll('.mn-link'), { yPercent: 75, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.05 }, '-=0.40')
      .fromTo(panel.querySelector('.mn-foot'), { opacity: 0 }, { opacity: 1, duration: 0.45 }, '-=0.40')
    const timeline = tl.current
    return () => { timeline.revert(); tl.current = null }
  }, [])

  // lets the hero's WebGL water pause while the opaque menu covers it
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
    return () => document.documentElement.classList.remove('menu-open')
  }, [open])

  useEffect(() => {
    if (open) {
      tl.current?.timeScale(1).play()
      scroller.lenis?.stop()
      const onKey = (e) => {
        if (e.key !== 'Escape') return
        setOpen(false)
        toggle.current?.focus()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    tl.current?.timeScale(1.6).reverse()
    if (ready) scroller.lenis?.start()
  }, [open, ready])

  const toggleMenu = () => {
    if (!open) {
      const current = NAV.findLast(({ id }) => document.querySelector(id)?.getBoundingClientRect().top <= window.innerHeight * 0.35)
      setActiveId(current?.id ?? '#top')
    }
    setOpen(!open)
  }

  const go = (id) => {
    if (loader.current?.busy) return
    if (open && menu.current.contains(document.activeElement)) toggle.current?.focus()

    if (prefersReducedMotion() || !loader.current) {
      setOpen(false)
      setTimeout(() => (id === '#top' ? scroller.lenis?.scrollTo(0, { duration: 1.6 }) : scrollToId(id)), 500)
      return
    }

    const label = NAV.find((n) => n.id === id)?.label ?? ''
    loader.current.play(label, () => {
      // page is fully covered: snap the menu shut and jump straight to the section
      tl.current?.pause(0)
      setOpen(false)
      const target = id === '#top' ? 0 : document.querySelector(id)
      if (target == null) return
      if (scroller.lenis) scroller.lenis.scrollTo(target, { immediate: true, force: true })
      else if (target === 0) window.scrollTo(0, 0)
      else target.scrollIntoView()
      setHidden(false)
    })
  }

  return (
    <>
      <header className={`header ${hidden ? 'is-hidden' : ''} ${open ? 'is-open' : ''}`} ref={root}>
        <a href="#top" className="logo" onClick={(e) => { e.preventDefault(); go('#top') }} aria-label="Vatharayuth Thy — home">
          <span className="mask"><span className="hd-in logo-first">{athlete.first}</span></span>
          <span className="mask"><span className="hd-in logo-last">{athlete.last}</span></span>
        </a>


        <div className="hd-right">
          <span className="mask"><span className="hd-in">
            <Magnetic as="button" className="btn-lime" onClick={() => go('#contact')} data-cursor-color="accent">
              <span data-magnetic-inner className="btn-lime-inner">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M8 11l3-7 6 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Contact
              </span>
            </Magnetic>
          </span></span>
          <span className="mask"><span className="hd-in">
            <Magnetic as="button" className={`btn-menu ${open ? 'is-open' : ''}`} ref={toggle} onClick={toggleMenu} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu">
              <span data-magnetic-inner className="btn-menu-lines"><i /><i /></span>
            </Magnetic>
          </span></span>
        </div>
      </header>

      <nav id="site-menu" className={`menu${open ? ' is-open' : ''}`} ref={menu} aria-label="Main navigation" inert={!open}>
        <ul className="mn-list">
          {NAV.map(({ id, label }) => (
            <li key={id} className="mn-item">
              <a className="mn-link" href={id} aria-label={label} aria-current={id === activeId ? 'location' : undefined} onClick={(e) => { e.preventDefault(); go(id) }}>
                <span className="mn-label" aria-hidden="true">
                  {Array.from(label, (ch, i) => {
                    const c = ch === ' ' ? '\u00A0' : ch
                    return (
                      <span key={i} className="mn-char" style={{ '--i': i }}>
                        <span className="mn-char-in" data-c={c}>{c}</span>
                      </span>
                    )
                  })}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mn-foot">
          <span>Swimmer · Goalkeeper · Student</span>
          <span>{athlete.location}</span>
        </div>
      </nav>

      <NavLoader ref={loader} />
    </>
  )
}
