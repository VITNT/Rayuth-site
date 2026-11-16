import { useEffect, useRef, useState } from 'react'
import { SplitText } from 'gsap/SplitText'
import { gsap, prefersReducedMotion, scroller, scrollToId } from '../lib.js'
import Magnetic from './Magnetic.jsx'
import { athlete } from '../data.js'

gsap.registerPlugin(SplitText)

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

  useEffect(() => {
    if (!ready) return
    gsap.fromTo(root.current.querySelectorAll('.hd-in'), { yPercent: 120 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: 0.35 })
  }, [ready])

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

  useEffect(() => {
    const motion = gsap.matchMedia()
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const cleanups = Array.from(menu.current.querySelectorAll('.mn-link'), (link) => {
        const split = SplitText.create(link.querySelector('.mn-label'), {
          type: 'words,chars', tag: 'span', charsClass: 'mn-char', aria: 'none',
        })
        const bounce = gsap.timeline({ paused: true })
          .to(split.chars, {
            yPercent: -15, textShadow: '0 0.14em 0.10em rgba(0, 0, 0, 0.4)',
            duration: 0.14, ease: 'power2.out', stagger: 0.038,
          })
          .to(split.chars, {
            yPercent: 5, textShadow: '0 0.025em 0.05em rgba(0, 0, 0, 0.18)',
            duration: 0.16, ease: 'power2.in', stagger: 0.038,
          }, 0.14)
          .to(split.chars, {
            yPercent: 0, textShadow: '0 0 0 rgba(0, 0, 0, 0)',
            duration: 0.24, ease: 'power2.out', stagger: 0.038,
          }, 0.30)

        const play = (event) => {
          if (event.pointerType === 'touch' || (event.type === 'focus' && !link.matches(':focus-visible'))) return
          if (!bounce.isActive()) bounce.restart()
        }
        link.addEventListener('pointerenter', play)
        link.addEventListener('focus', play)

        return () => {
          link.removeEventListener('pointerenter', play)
          link.removeEventListener('focus', play)
          split.revert()
        }
      })
      return () => cleanups.forEach((cleanup) => cleanup())
    })
    return () => motion.revert()
  }, [])

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
    if (open && menu.current.contains(document.activeElement)) toggle.current?.focus()
    setOpen(false)
    setTimeout(() => (id === '#top' ? scroller.lenis?.scrollTo(0, { duration: 1.6 }) : scrollToId(id)), 500)
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
                <span className="mn-label" aria-hidden="true">{label}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mn-foot">
          <span>Swimmer · Goalkeeper · Student</span>
          <span>{athlete.location}</span>
        </div>
      </nav>
    </>
  )
}
