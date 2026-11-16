import { useRef } from 'react'
import { gsap, useGSAP } from '../lib.js'
import { gallery } from '../data.js'
import JumpText from './JumpText.jsx'

// Pinned horizontal scroll; each photo parallaxes inside its frame.
export default function Gallery() {
  const root = useRef(null)
  const track = useRef(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 768px)', () => {
      const q = gsap.utils.selector(root)
      const dist = () => track.current.scrollWidth - window.innerWidth
      const tween = gsap.to(track.current, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
      })
      q('.gl-item').forEach((item) => {
        gsap.fromTo(item.querySelector('img'), { xPercent: -12 }, {
          xPercent: 12, ease: 'none',
          scrollTrigger: { trigger: item, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        })
        gsap.from(item.querySelector('.gl-cap'), {
          y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out',
          scrollTrigger: { trigger: item, containerAnimation: tween, start: 'left 80%' },
        })
      })
      gsap.to(q('.gl-progress i'), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${dist()}`, scrub: true } })
    })
    mm.add('(max-width: 767px)', () => {
      const q = gsap.utils.selector(root)
      q('.gl-item img').forEach((img) => gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img, scrub: true } }))
    })
  }, { scope: root })

  return (
    <section id="water" className="gallery" ref={root}>
      <div className="gl-track" ref={track}>
        <div className="gl-intro">
          <p className="label">(04) — In the water</p>
          <h2 className="display gl-title">
            <JumpText text="WET" reveal={false} /><br />
            <span className="serif-i">&amp; fast.</span>
          </h2>
          <p className="gl-desc">Meet days, early starts and the quiet second on the blocks before the buzzer. Scroll sideways →</p>
        </div>
        {gallery.map((g, i) => (
          <figure className={`gl-item gl-item-${i % 3}`} key={g.src} data-cursor={g.title}>
            <div className="gl-frame"><img src={g.src} alt={`${g.title} — ${g.note}`} loading="lazy" /></div>
            <figcaption className="gl-cap">
              <span className="gl-num">{String(i + 1).padStart(2, '0')}</span>
              <strong>{g.title}</strong>
              <span>{g.note}</span>
            </figcaption>
          </figure>
        ))}
        <div className="gl-end">
          <span className="serif-i">Next length</span>
          <span className="gl-end-arrow">→</span>
        </div>
      </div>
      <div className="gl-progress" aria-hidden><i /></div>
    </section>
  )
}
