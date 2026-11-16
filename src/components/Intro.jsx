import { useRef } from 'react'
import { gsap, useGSAP } from '../lib.js'
import { athlete, results, fastest, fmtTime } from '../data.js'
import Magnetic from './Magnetic.jsx'
import { scrollToId } from '../lib.js'

// words are revealed as you scroll; [img:x] tokens become inline photo pills
const COPY = `Vatharayuth — Rayuth to his teammates — is a student athlete [img:/img/blocks.jpg] who lives for the 50 free. ${results.length} personal bests in one season [img:/img/fly.jpg] a ${fmtTime(fastest.time)} sprint, and a goalkeeper’s instinct for reading the moment.`

export default function Intro() {
  const root = useRef(null)

  useGSAP(() => {
    const q = gsap.utils.selector(root)
    gsap.fromTo(q('.in-word'), { opacity: 0.12 }, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: q('.in-copy')[0], start: 'top 80%', end: 'bottom 45%', scrub: true },
    })
    q('.in-pill').forEach((p) => {
      gsap.fromTo(p, { width: 0 }, { width: '1.9em', ease: 'expo.out', duration: 1.2, scrollTrigger: { trigger: p, start: 'top 75%' } })
    })
    gsap.from(q('.in-meta > div'), { y: 40, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: q('.in-meta')[0], start: 'top 85%' } })
  }, { scope: root })

  const tokens = COPY.split(/(\[img:[^\]]+\])/).flatMap((chunk, ci) => {
    const m = chunk.match(/^\[img:(.+)\]$/)
    if (m) return [<span key={`p${ci}`} className="in-pill"><img src={m[1]} alt="" loading="lazy" /></span>]
    return chunk.split(' ').filter(Boolean).map((w, wi) => <span key={`${ci}-${wi}`} className="in-word">{w} </span>)
  })

  return (
    <section className="intro section" ref={root}>
      <p className="label in-label">(02) — About</p>
      <p className="in-copy">{tokens}</p>
      <div className="in-meta">
        <div><span className="label">Base</span><span>{athlete.location}</span></div>
        <div><span className="label">Strokes</span><span>{athlete.disciplines.join(' / ')}</span></div>
        <div><span className="label">Also</span><span>Football &amp; futsal goalkeeper</span></div>
        <div>
          <Magnetic as="button" className="btn-round" onClick={() => scrollToId('#results')} data-cursor="Results">
            <span data-magnetic-inner>See the times ↓</span>
          </Magnetic>
        </div>
      </div>
    </section>
  )
}
