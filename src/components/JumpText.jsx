import { useRef } from 'react'

// Splits text into characters so headings can animate in letter by letter.
export default function JumpText({ text, className = '', as: Tag = 'span', reveal = true, ...rest }) {
  const root = useRef(null)
  const words = text.split(' ')
  let idx = 0

  return (
    <Tag ref={root} className={`jt ${reveal ? 'jt-reveal' : ''} ${className}`} aria-label={text} {...rest}>
      {words.map((w, wi) => (
        <span className="jt-word" key={wi} aria-hidden>
          {[...w].map((ch) => {
            const i = idx++
            return (
              <span className="jt-char" key={i} style={{ '--i': i }}>
                <span className="jt-char-inner">{ch}</span>
              </span>
            )
          })}
          {wi < words.length - 1 && <span className="jt-space"> </span>}
        </span>
      ))}
    </Tag>
  )
}
