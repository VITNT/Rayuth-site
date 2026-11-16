import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, scroller, prefersReducedMotion } from './lib.js'
import Preloader from './components/Preloader.jsx'
import Cursor from './components/Cursor.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Intro from './components/Intro.jsx'
import Marquee from './components/Marquee.jsx'
import Results from './components/Results.jsx'
import Gallery from './components/Gallery.jsx'
import Progression from './components/Progression.jsx'
import Pitch from './components/Pitch.jsx'
import Contact from './components/Contact.jsx'

export default function App() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: !prefersReducedMotion() })
    scroller.lenis = lenis
    if (import.meta.env.DEV) window.lenis = lenis
    lenis.stop()
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      scroller.lenis = null
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    scroller.lenis?.start()
    document.documentElement.classList.add('is-loaded')
    const t = setTimeout(() => ScrollTrigger.refresh(), 200)
    window.addEventListener('load', () => ScrollTrigger.refresh())
    return () => clearTimeout(t)
  }, [loaded])

  return (
    <>
      <Preloader onDone={() => setLoaded(true)} />
      <Cursor />
      <div className="grain" aria-hidden />
      <Header ready={loaded} />
      <main>
        <Hero ready={loaded} />
        <Intro />
        <Marquee />
        <Results />
        <Gallery />
        <Progression />
        <Pitch />
        <Contact />
      </main>
    </>
  )
}
