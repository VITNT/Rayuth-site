// ─────────────────────────────────────────────────────────────
// All editable site content lives here.
// ─────────────────────────────────────────────────────────────

export const athlete = {
  first: 'Vatharayuth',
  last: 'Thy',
  nickname: 'Rayuth',
  role: 'Student Athlete',
  disciplines: ['Freestyle', 'Butterfly', 'Backstroke'],
  location: 'Phnom Penh, Cambodia',
  timezone: 'Asia/Phnom_Penh',
  // TODO: replace with a real contact address
  email: 'hello@example.com',
  socials: [
    { label: 'Instagram', href: '#' },
    { label: 'SwimCloud', href: '#' },
  ],
}

// Personal bests — from the "Main Swimming Events" table.
// time is in seconds; course: LCM = 50m pool, SCM = 25m pool.
export const results = [
  { event: '50 Free', distance: 50, stroke: 'Freestyle', course: 'LCM', time: 26.6, date: '2026-10-23', img: '/img/free-close.jpg' },
  { event: '100 Free', distance: 100, stroke: 'Freestyle', course: 'LCM', time: 61.66, date: '2026-10-23', img: '/img/free.jpg' },
  { event: '200 Free', distance: 200, stroke: 'Freestyle', course: 'LCM', time: 139.75, date: '2026-10-22', img: '/img/free-wide.jpg' },
  { event: '400 Free', distance: 400, stroke: 'Freestyle', course: 'LCM', time: 314.95, date: '2025-11-29', img: '/img/breath.jpg' },
  { event: '50 Fly', distance: 50, stroke: 'Butterfly', course: 'LCM', time: 28.99, date: '2026-06-12', img: '/img/fly.jpg' },
  { event: '50 Back', distance: 50, stroke: 'Backstroke', course: 'SCM', time: 31.54, date: '2025-11-28', img: '/img/back.jpg' },
]

export const gallery = [
  { src: '/img/fly.jpg', title: 'Butterfly', note: 'Breakout, lane 4' },
  { src: '/img/blocks.jpg', title: 'On the blocks', note: 'Take your marks' },
  { src: '/img/free-close.jpg', title: 'Freestyle', note: 'Catch & pull' },
  { src: '/img/start.jpg', title: 'The start', note: 'Reaction is free speed' },
  { src: '/img/back.jpg', title: 'Backstroke', note: 'Reach, rotate, repeat' },
  { src: '/img/dive.jpg', title: 'Into the water', note: 'Meet day' },
  { src: '/img/trophy.jpg', title: 'Podium', note: 'Team silverware' },
]

export const pitch = [
  { src: '/img/keeper-catch.jpg', title: 'Safe hands' },
  { src: '/img/keeper.jpg', title: 'Warm-up' },
  { src: '/img/keeper-throw.jpg', title: 'Distribution' },
  { src: '/img/futsal.jpg', title: 'Futsal squad' },
]

// ─── helpers ────────────────────────────────────────────────
export const fmtTime = (s) => {
  const m = Math.floor(s / 60)
  const rest = (s - m * 60).toFixed(2).padStart(5, '0')
  return m > 0 ? `${m}:${rest}` : (s).toFixed(2)
}

export const fmtDate = (iso, opts = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', opts)

export const speed = (r) => r.distance / r.time // m/s
export const per50 = (r) => r.time / (r.distance / 50)

export const latestPB = [...results].sort((a, b) => b.date.localeCompare(a.date))[0]
export const fastest = [...results].sort((a, b) => speed(b) - speed(a))[0]
export const totalMeters = results.reduce((a, r) => a + r.distance, 0)
