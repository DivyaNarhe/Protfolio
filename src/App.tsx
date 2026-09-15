import { useState, useEffect, useRef, useCallback } from 'react'
import divyaPhoto from './assets/n_1.png'

// ══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════════════════════════

function useObserver(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible') },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// Count-up animation triggered when element enters viewport
function useCountUp<T extends HTMLElement = HTMLDivElement>(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const ref = useRef<T>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setValue(Math.round(ease * target))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])
  return { ref, value }
}

// Active section tracking for navbar
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState('')
  useEffect(() => {
    const observers = ids.map(id => {
      const el = document.getElementById(id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id) },
        { threshold: 0.3, rootMargin: '-64px 0px -40% 0px' }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [ids])
  return active
}

// Typewriter cycling through role phrases
function useTypewriter(phrases: string[], speed = 60, pauseMs = 2000) {
  const [display, setDisplay] = useState('')
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = phrases[phaseIdx]
    let timeout: ReturnType<typeof setTimeout>
    if (!deleting) {
      if (charIdx < current.length) {
        timeout = setTimeout(() => {
          setDisplay(current.slice(0, charIdx + 1))
          setCharIdx(c => c + 1)
        }, speed)
      } else {
        timeout = setTimeout(() => setDeleting(true), pauseMs)
      }
    } else {
      if (charIdx > 0) {
        timeout = setTimeout(() => {
          setDisplay(current.slice(0, charIdx - 1))
          setCharIdx(c => c - 1)
        }, speed / 2)
      } else {
        setDeleting(false)
        setPhaseIdx(i => (i + 1) % phrases.length)
      }
    }
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, phaseIdx, phrases, speed, pauseMs])

  return display
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL EFFECTS: Custom Cursor + Scroll Progress
// ══════════════════════════════════════════════════════════════════════════════

function GlobalEffects() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -100, y: -100 })
  const raf = useRef<number>(0)

  useEffect(() => {
    // Cursor position via RAF
    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY }
    }
    const loop = () => {
      if (cursorRef.current) {
        cursorRef.current.style.left = pos.current.x + 'px'
        cursorRef.current.style.top = pos.current.y + 'px'
      }
      raf.current = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', move, { passive: true })
    raf.current = requestAnimationFrame(loop)

    // Hover state via event delegation — no MutationObserver needed
    const INTERACTIVE = 'a, button, [role="button"], .project-card, .skill-tag, input, label'
    const onOver = (e: MouseEvent) => {
      if ((e.target as Element).closest(INTERACTIVE)) document.body.classList.add('cursor-hover')
    }
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element).closest(INTERACTIVE)) document.body.classList.remove('cursor-hover')
    }
    document.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseout', onOut, { passive: true })

    return () => {
      window.removeEventListener('mousemove', move)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  useEffect(() => {
    const bar = document.getElementById('scroll-progress')
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight
      const pct = max > 0 ? window.scrollY / max : 0
      if (bar) bar.style.transform = `scaleX(${pct})`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <div id="scroll-progress" style={{ width: '100%' }} />
      <div id="custom-cursor" ref={cursorRef}>
        <div id="cursor-dot" />
        <div id="cursor-ring" />
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STAR FIELD (Hero Background)
// ══════════════════════════════════════════════════════════════════════════════

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let w = 0, h = 0

    type Star = { x: number; y: number; r: number; speed: number; opacity: number; drift: number }
    let stars: Star[] = []

    const resize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
      stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.2,
        speed: Math.random() * 0.15 + 0.03,
        opacity: Math.random() * 0.5 + 0.1,
        drift: (Math.random() - 0.5) * 0.04,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        s.y -= s.speed
        s.x += s.drift
        if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w }
        if (s.x < -2) s.x = w + 2
        if (s.x > w + 2) s.x = -2
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.r > 0.9 ? '0,163,255' : '141,168,188'},${s.opacity})`
        ctx.fill()
      }
      animId = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    draw()
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return (
    <canvas ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function Tag({ children }: { children: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 12px', borderRadius: '999px',
      border: '1px solid #294761',
      fontSize: '0.75rem', color: '#8FA8BC',
      background: 'rgba(6,28,50,0.6)',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      {children}
    </span>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.14em', color: '#008FF5', textTransform: 'uppercase' }}>
        {children}
      </span>
      <div style={{ height: '1px', width: '64px', background: '#294761' }} />
    </div>
  )
}

// ── Animated Code Editor ──────────────────────────────────────────────────────
function CodeVisual() {
  const [visibleLines, setVisibleLines] = useState(0)

  const lines: { code: React.ReactNode }[] = [
    { code: <><span style={{ color: '#00A3FF' }}>const</span><span style={{ color: '#D9E5EF' }}> developer</span><span style={{ color: '#8FA8BC' }}> = {'{'}</span></> },
    { code: <><span style={{ color: '#8FA8BC' }}>{'  '}name</span><span style={{ color: '#5A7A94' }}>: </span><span style={{ color: '#22D3EE' }}>"Divya Narhe"</span><span style={{ color: '#5A7A94' }}>,</span></> },
    { code: <><span style={{ color: '#8FA8BC' }}>{'  '}role</span><span style={{ color: '#5A7A94' }}>: </span><span style={{ color: '#22D3EE' }}>"Software Developer"</span><span style={{ color: '#5A7A94' }}>,</span></> },
    { code: <><span style={{ color: '#8FA8BC' }}>{'  '}location</span><span style={{ color: '#5A7A94' }}>: </span><span style={{ color: '#22D3EE' }}>"Pune, India"</span><span style={{ color: '#5A7A94' }}>,</span></> },
    { code: <><span style={{ color: '#8FA8BC' }}>{'  '}experience</span><span style={{ color: '#5A7A94' }}>: </span><span style={{ color: '#00A3FF' }}>4</span><span style={{ color: '#5A7A94' }}>,</span></> },
    { code: <><span style={{ color: '#8FA8BC' }}>{'  '}stack</span><span style={{ color: '#5A7A94' }}>: [</span></> },
    { code: <><span style={{ color: '#5A7A94' }}>{'    '}</span><span style={{ color: '#22D3EE' }}>"WordPress"</span><span style={{ color: '#5A7A94' }}>,</span></> },
    { code: <><span style={{ color: '#5A7A94' }}>{'    '}</span><span style={{ color: '#22D3EE' }}>"JavaScript"</span><span style={{ color: '#5A7A94' }}>,</span></> },
    { code: <><span style={{ color: '#5A7A94' }}>{'    '}</span><span style={{ color: '#22D3EE' }}>"PHP"</span><span style={{ color: '#5A7A94' }}>,</span></> },
    { code: <><span style={{ color: '#5A7A94' }}>{'    '}</span><span style={{ color: '#22D3EE' }}>"REST API"</span></> },
    { code: <><span style={{ color: '#5A7A94' }}>{'  '}],</span></> },
    { code: <><span style={{ color: '#8FA8BC' }}>{'  '}available</span><span style={{ color: '#5A7A94' }}>: </span><span style={{ color: '#00A3FF' }}>true</span></> },
    { code: <><span style={{ color: '#D9E5EF' }}>{'}'}</span></> },
  ]

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleLines(i)
      if (i >= lines.length) clearInterval(interval)
    }, 90)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      background: '#040F1A',
      borderRadius: '14px',
      border: '1px solid #1A3A55',
      overflow: 'hidden',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12.5px',
      lineHeight: '1.75',
      boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,143,245,0.1)',
    }}>
      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 16px', borderBottom: '1px solid #1A3A55', background: '#050E1A' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3A3A' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3A3A' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3A3A' }} />
        <span style={{ marginLeft: 12, color: '#2D5070', fontSize: '11px' }}>portfolio.ts</span>
        <span style={{ marginLeft: 'auto', color: '#294761', fontSize: '10px' }}>TypeScript</span>
      </div>
      {/* Code lines — appear one by one */}
      <div style={{ padding: '20px 0', minHeight: '260px' }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'baseline', padding: '0 20px',
            opacity: i < visibleLines ? 1 : 0,
            transform: i < visibleLines ? 'none' : 'translateX(-8px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}>
            <span style={{ color: '#1E3A52', fontSize: '11px', minWidth: '28px', userSelect: 'none', textAlign: 'right', marginRight: '20px', flexShrink: 0 }}>{i + 1}</span>
            <span>{l.code}</span>
          </div>
        ))}
        {/* Cursor row */}
        <div style={{ display: 'flex', alignItems: 'baseline', padding: '0 20px' }}>
          <span style={{ color: '#1E3A52', fontSize: '11px', minWidth: '28px', userSelect: 'none', textAlign: 'right', marginRight: '20px', flexShrink: 0 }}>{lines.length + 1}</span>
          <span className="cursor-blink" style={{ display: 'inline-block', width: '7px', height: '14px', background: '#008FF5', borderRadius: '1px', verticalAlign: 'middle' }} />
        </div>
      </div>
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 20px', background: '#008FF5', fontSize: '10.5px', color: 'rgba(255,255,255,0.85)' }}>
        <span>● main</span>
        <span>Ln {lines.length + 1}, Col 1</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}

// ── Stat Card with count-up ───────────────────────────────────────────────────
function StatCard({ rawNum, label }: { rawNum: string; label: string }) {
  const numeric = parseInt(rawNum.replace(/\D/g, ''), 10)
  const suffix = rawNum.replace(/\d/g, '')
  const { ref, value } = useCountUp(numeric, 1600)
  return (
    <div style={{ background: '#102F4A', padding: '32px 28px' }}>
      <div ref={ref} style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#00A3FF', marginBottom: '6px' }}>
        {value}{suffix}
      </div>
      <div style={{ fontSize: '0.8125rem', color: '#5A7A94', lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

// ── Browser Mockup ────────────────────────────────────────────────────────────
function BrowserMockup({ label, accentColor, rows }: { label: string; accentColor: string; rows: number[] }) {
  return (
    <div style={{ borderRadius: '10px 10px 0 0', border: '1px solid #1A3A55', overflow: 'hidden', aspectRatio: '16/10', background: '#061C32' }}>
      <div style={{ background: '#050E1A', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #1A3A55' }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#1A3A55' }} />)}
        <div style={{ flex: 1, background: '#0A1E30', borderRadius: '4px', height: '16px', marginLeft: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '9px', color: '#2D5070', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
        </div>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', height: 'calc(100% - 32px)' }}>
        <div style={{ height: '6px', background: accentColor, borderRadius: '3px', width: '40%', opacity: 0.6 }} />
        {rows.map((w, i) => <div key={i} style={{ height: '5px', background: '#0A2A40', borderRadius: '3px', width: `${w}%` }} />)}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flex: 1 }}>
          <div style={{ flex: 1, background: '#081E30', borderRadius: '6px', border: '1px solid #1A3A55' }} />
          <div style={{ flex: 1, background: '#081E30', borderRadius: '6px', border: '1px solid #1A3A55' }} />
        </div>
        <div style={{ height: '20px', background: accentColor, borderRadius: '4px', width: '30%', opacity: 0.5, marginTop: 'auto' }} />
      </div>
    </div>
  )
}

// ── Magnetic Button ───────────────────────────────────────────────────────────
function MagneticBtn({ children, className, style, onClick, href }: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  href?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) * 0.25
    const dy = (e.clientY - (r.top + r.height / 2)) * 0.25
    el.style.transform = `translate(${dx}px, ${dy}px)`
  }, [])
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = ''
  }, [])

  const shared = { onMouseMove: onMove, onMouseLeave: onLeave, className, style }

  if (href) return (
    <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} {...shared}
      style={{ ...style, transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), background 0.2s, box-shadow 0.2s' }}>
      {children}
    </a>
  )
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} onClick={onClick} {...shared}
      style={{ ...style, transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), background 0.2s, box-shadow 0.2s' }}>
      {children}
    </button>
  )
}

// ── Project Card with spotlight ───────────────────────────────────────────────
function ProjectCard({ p }: {
  p: {
    num: string; category: string; title: string; description: string; highlight: string;
    tags: string[]; cta: string; mockupLabel: string; mockupAccent: string; mockupRows: number[]
  }
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [spot, setSpot] = useState({ x: 0, y: 0, show: false })

  const onMove = (e: React.MouseEvent) => {
    const r = cardRef.current?.getBoundingClientRect()
    if (!r) return
    setSpot({ x: e.clientX - r.left, y: e.clientY - r.top, show: true })
  }

  return (
    <div ref={cardRef} className="project-card"
      style={{ display: 'grid', gridTemplateColumns: '1fr 380px', background: '#102F4A', border: '1px solid #294761', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}
      onMouseMove={onMove}
      onMouseLeave={() => setSpot(s => ({ ...s, show: false }))}>
      {/* Spotlight overlay */}
      {spot.show && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, borderRadius: '16px',
          background: `radial-gradient(400px circle at ${spot.x}px ${spot.y}px, rgba(0,143,245,0.06), transparent 70%)`,
        }} />
      )}
      {/* Content */}
      <div style={{ padding: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 3 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: '#294761' }}>Project {p.num}</span>
            <span style={{ fontSize: '0.78rem', color: '#5A7A94', background: '#061C32', border: '1px solid #294761', padding: '2px 10px', borderRadius: '999px' }}>{p.category}</span>
          </div>
          <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px', letterSpacing: '-0.01em' }}>{p.title}</h3>
          <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: '#8FA8BC', marginBottom: '16px' }}>{p.description}</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', background: 'rgba(0,143,245,0.08)', border: '1px solid rgba(0,143,245,0.2)', borderRadius: '8px', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.8125rem', color: '#00A3FF', fontWeight: 500 }}>✦ {p.highlight}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
            {p.tags.map(t => <Tag key={t}>{t}</Tag>)}
          </div>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#008FF5', background: 'none', border: 'none', cursor: 'none', padding: 0, transition: 'color 0.2s, gap 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00A3FF'; (e.currentTarget as HTMLElement).style.gap = '10px' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#008FF5'; (e.currentTarget as HTMLElement).style.gap = '6px' }}>
          {p.cta}
        </button>
      </div>
      {/* Mockup */}
      <div style={{ borderLeft: '1px solid #1A3A55', padding: '28px', display: 'flex', alignItems: 'center', background: '#0A2540', position: 'relative', zIndex: 3 }}>
        <div style={{ width: '100%' }}>
          <BrowserMockup label={p.mockupLabel} accentColor={p.mockupAccent} rows={p.mockupRows} />
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// NAVBAR
// ══════════════════════════════════════════════════════════════════════════════

function Navbar({ openModal }: { openModal: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navLinks = ['about', 'experience', 'projects', 'skills', 'education', 'contact']
  const activeSection = useActiveSection(navLinks)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(6,28,50,0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(24px) saturate(1.5)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(1.5)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(41,71,97,0.5)' : '1px solid transparent',
      transition: 'all 0.35s ease',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '15px', color: '#FFFFFF', background: 'none', border: 'none', cursor: 'none', padding: 0, letterSpacing: '-0.01em' }}>
          Divya Narhe
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="hidden-mobile">
          {navLinks.map(link => (
            <button key={link} onClick={() => scrollTo(link)}
              className={`nav-link${activeSection === link ? ' active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'none', padding: '2px 0', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>
              {link.charAt(0).toUpperCase() + link.slice(1)}
            </button>
          ))}
          <MagneticBtn className="btn-primary"
            onClick={openModal}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'none' }}>
            Let's Talk →
          </MagneticBtn>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-only"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none', flexDirection: 'column', gap: '5px', padding: '4px' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              display: 'block', width: '22px', height: '2px', background: '#D9E5EF', transition: 'all 0.2s',
              transform: menuOpen ? (i === 0 ? 'rotate(45deg) translateY(7px)' : i === 2 ? 'rotate(-45deg) translateY(-7px)' : 'none') : 'none',
              opacity: menuOpen && i === 1 ? 0 : 1
            }} />
          ))}
        </button>
      </div>

      {menuOpen && (
        <div style={{ background: 'rgba(6,28,50,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #294761', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {navLinks.map(link => (
            <button key={link} onClick={() => scrollTo(link)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, sans-serif', fontSize: '1.1rem', fontWeight: 600, color: activeSection === link ? '#00A3FF' : '#D9E5EF', padding: '4px 0', textTransform: 'capitalize' }}>
              {link.charAt(0).toUpperCase() + link.slice(1)}
            </button>
          ))}
          <button onClick={() => { openModal(); setMenuOpen(false) }}
            style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', background: '#008FF5', color: 'white', border: 'none', cursor: 'pointer', textAlign: 'center', marginTop: '8px', width: '100%' }}>
            Let's Talk →
          </button>
        </div>
      )}
    </nav>
  )
}

// ── Portrait Frame ────────────────────────────────────────────────────────────
function PortraitFrame() {
  const [hovered, setHovered] = useState(false)

  const chips = ['WordPress', 'JavaScript', 'PHP', 'REST API', 'Elementor']
  const stats = [
    { val: '4+', label: 'Years', color: '#00A3FF' },
    { val: '30+', label: 'Templates', color: '#22D3EE' },
    { val: '400+', label: 'Pages', color: '#008FF5' },
  ]

  return (
    <div style={{ position: 'relative', display: 'inline-block', padding: '24px 32px 24px 24px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* ── Ambient glow orbs ── */}
      <div style={{ position: 'absolute', top: '-20px', right: '0px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,143,245,0.18) 0%, transparent 70%)', pointerEvents: 'none', transition: 'opacity 0.5s', opacity: hovered ? 1 : 0.6 }} />
      <div style={{ position: 'absolute', bottom: '10px', left: '-10px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)', pointerEvents: 'none', transition: 'opacity 0.5s', opacity: hovered ? 1 : 0.5 }} />

      {/* ── Main card ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '300px',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: hovered
          ? '0 48px 96px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,143,245,0.3), 0 0 60px rgba(0,143,245,0.12)'
          : '0 28px 72px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,143,245,0.14)',
        transition: 'box-shadow 0.45s ease, transform 0.45s cubic-bezier(0.16,1,0.3,1)',
        transform: hovered ? 'translateY(-8px)' : 'none',
      }}>

        {/* Photo — full bleed, tall */}
        <div style={{ position: 'relative', height: '360px', overflow: 'hidden', background: '#061C32' }}>

          {/* Dot-grid texture overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(0,143,245,0.08) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }} />

          {/* Multi-stop gradient: transparent top → deep navy bottom */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(6,28,50,0.15) 0%, transparent 25%, transparent 45%, rgba(4,12,22,0.75) 72%, rgba(4,12,22,0.97) 100%)',
          }} />

          <img
            src="https://plain-apac-prod-public.komododecks.com/202608/19/XZMmqdbYkyBGEDsvUucZ/image.png"
            alt="Divya Narhe — Software Developer"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center top',
              display: 'block',
              transition: 'transform 0.65s cubic-bezier(0.16,1,0.3,1)',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />

          {/* Status pill — top right corner */}
          <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 4,
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 11px',
            background: 'rgba(4,13,24,0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(34,211,238,0.3)',
            borderRadius: '999px',
          }}>
            <span className="pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22D3EE', flexShrink: 0 }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: '#22D3EE', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Open to work</span>
          </div>

          {/* Name overlay — pinned above gradient fade */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3, padding: '0 24px 22px' }}>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.375rem', color: '#FFFFFF', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: '4px' }}>
              Divya Narhe
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.67rem', color: '#8FA8BC', letterSpacing: '0.04em' }}>
              Software Developer · Pune, India
            </div>
          </div>
        </div>

        {/* Glass info panel */}
        <div style={{
          background: 'rgba(8,28,46,0.92)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,143,245,0.15)',
          padding: '18px 20px 20px',
        }}>

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            {stats.map((s, i) => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                {i > 0 && <div style={{ position: 'absolute', left: 0, top: '10%', height: '80%', width: '1px', background: '#1A3A55' }} />}
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#5A7A94', marginTop: '3px', letterSpacing: '0.02em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #1A3A55, transparent)', marginBottom: '14px' }} />

          {/* Skill chips — scrolling row */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {chips.map(c => (
              <span key={c} style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem',
                color: '#5A7A94', letterSpacing: '0.04em',
                padding: '3px 9px',
                background: 'rgba(0,143,245,0.06)',
                border: '1px solid rgba(0,143,245,0.15)',
                borderRadius: '999px',
              }}>{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating accent card — top-left ── */}
      <div style={{
        position: 'absolute', top: '12px', left: '-8px', zIndex: 5,
        background: '#102F4A',
        border: '1px solid #1A3A55',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transform: hovered ? 'translate(-4px, -6px) rotate(-3deg)' : 'rotate(-3deg)',
        transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#00A3FF', letterSpacing: '-0.02em' }}>4+</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#5A7A94' }}>Yrs Exp</div>
      </div>

      {/* ── Floating accent card — bottom-right ── */}
      <div style={{
        position: 'absolute', bottom: '36px', right: '4px', zIndex: 5,
        background: '#102F4A',
        border: '1px solid #1A3A55',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transform: hovered ? 'translate(4px, 6px) rotate(2deg)' : 'rotate(2deg)',
        transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#22D3EE', letterSpacing: '-0.02em' }}>400+</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#5A7A94' }}>Pages</div>
      </div>

    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════════════════════════════════

function Hero({ openModal }: { openModal: () => void }) {
  const roles = [
    'Software Developer',
    'WordPress Developer',
    'Frontend Engineer',
    'PHP Developer',
    'UI/UX Implementer',
  ]
  const typed = useTypewriter(roles, 65, 2200)

  const stats = [
    { value: '3+', label: 'Years Experience' },
    { value: '40+', label: 'Projects Shipped' },
    { value: '15+', label: 'Happy Clients' },
  ]

  const skills = [
    'WordPress', 'PHP', 'React', 'REST APIs', 'MySQL', 'Tailwind', 'UI/UX', 'Team Leadership',
  ]

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <StarField />

      {/* pt-32 on ALL breakpoints so content clears the fixed 64px navbar with room to spare */}
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12 relative z-10 pt-32 pb-16 md:pb-16">

        <div className="grid md:grid-cols-[1.15fr_0.85fr] gap-14 md:gap-10 items-center">

          {/* Left — headline + stats */}
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 border border-[#008FF5]/30 rounded-full bg-[#008FF5]/10">
              <span className="glow-pulse w-2 h-2 rounded-full bg-[#008FF5] shrink-0" />
              <span className="font-mono text-[0.65rem] tracking-[0.14em] text-[#8FA8BC] uppercase">
                Available for opportunities
              </span>
            </div>

            <h1 className="font-display font-extrabold text-white mb-6 leading-[1.06] tracking-tight text-[clamp(2.25rem,4.6vw,4rem)]">
              Divya Narhe
              <br />
              <span
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#008FF5] to-[#22D3EE] inline-block"
                style={{ minHeight: '1.2em' }}
              >
                {typed}
                <span className="typewriter-caret" />
              </span>
            </h1>

            <p className="text-[1rem] md:text-lg leading-[1.75] text-[#8FA8BC] mb-10 max-w-[480px]">
              I build fast, scalable, user-focused web products — from WordPress sites to custom PHP applications and modern frontend interfaces.
            </p>

            <MagneticBtn className="btn-primary flex items-center justify-center font-body font-semibold text-[0.9375rem] px-7 py-3.5 rounded-xl border-none cursor-none mb-12"
              onClick={openModal}>
              Let's Talk →
            </MagneticBtn>

            {/* Stats row */}
            <div className="flex items-center gap-8 md:gap-12 flex-wrap">
              {stats.map((s, i) => (
                <div key={s.label} className="flex items-center gap-8 md:gap-12">
                  <div>
                    <div className="font-display font-extrabold text-2xl md:text-3xl text-white leading-none mb-1">
                      {s.value}
                    </div>
                    <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[#5C7A93]">
                      {s.label}
                    </div>
                  </div>
                  {i < stats.length - 1 && (
                    <div className="w-px h-9 bg-[#1E3A54] hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right — photo card */}
          <div className="relative w-full flex justify-center md:justify-end">
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>

              <div style={{
                position: 'absolute',
                inset: '-10%',
                background: 'radial-gradient(circle at 50% 20%, rgba(0,143,245,0.28), transparent 65%)',
                filter: 'blur(24px)',
                zIndex: 0,
              }} />

              <div style={{
                position: 'relative',
                zIndex: 1,
                aspectRatio: '4 / 5',
                borderRadius: '24px',
                overflow: 'hidden',
                background: 'linear-gradient(160deg, #008FF5, #22D3EE)',
                boxShadow: '0 30px 80px rgba(0,143,245,0.22)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <img
                  src={divyaPhoto}
                  alt="Divya Narhe — Software Developer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                />

                <div style={{
                  position: 'absolute',
                  left: 0, right: 0, bottom: 0,
                  padding: '20px',
                  background: 'linear-gradient(to top, rgba(6,28,50,0.85), transparent)',
                }}>
                </div>
              </div>

              <div style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                zIndex: 2,
                background: '#FFFFFF',
                color: '#061C32',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '10px 18px',
                borderRadius: '999px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                whiteSpace: 'nowrap',
              }}>
                ✦ UI/UX Focused
              </div>
            </div>
          </div>
        </div>

        {/* Skill ticker strip */}
        <div className="mt-16 md:mt-20 pt-8 border-t border-[#1E3A54] flex flex-wrap items-center gap-x-8 gap-y-3">
          {skills.map(skill => (
            <span key={skill} className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[#5C7A93] flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#008FF5]" />
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: '#294761', letterSpacing: '0.12em', textTransform: 'uppercase' }}>scroll</span>
        <div style={{ width: '1px', height: '36px', background: 'linear-gradient(to bottom, #294761, transparent)' }} />
      </div>
    </section>
  )
}
// ══════════════════════════════════════════════════════════════════════════════
// ABOUT
// ══════════════════════════════════════════════════════════════════════════════

function About() {
  const ref = useObserver()
  const stats = [
    { rawNum: '4+', label: 'Years Experience' },
    { rawNum: '30+', label: 'Templates Built' },
    { rawNum: '400+', label: 'Pages Migrated' },
    { rawNum: '2', label: 'Developers Led' },
  ]
  return (
    <section id="about" style={{ padding: '120px 32px', borderTop: '1px solid #294761', background: '#082846' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div ref={ref} className="section-observe">
          <SectionLabel>01 — About</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', marginBottom: '64px', maxWidth: '560px' }}>
            Turning ideas into reliable digital experiences.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }} className="about-grid">
            <div>
              <p style={{ fontSize: '1.0625rem', lineHeight: 1.8, color: '#8FA8BC', marginBottom: '20px' }}>
                I'm a Software Developer based in Pune, India, focused on building clean, performant, and maintainable web experiences. I take pride in writing code that's both functional and easy to work with.
              </p>
              <p style={{ fontSize: '1.0625rem', lineHeight: 1.8, color: '#8FA8BC' }}>
                I work across WordPress, PHP, and modern frontend technologies — building responsive interfaces, optimizing performance, integrating REST APIs, implementing authentication systems, and delivering client-facing applications. From pixel-perfect Figma-to-HTML work to leading development teams, I bring ownership and craft to every project.
              </p>
            </div>
            {/* Animated count-up stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#294761', border: '1px solid #294761', borderRadius: '12px', overflow: 'hidden' }}>
              {stats.map(s => <StatCard key={s.label} rawNum={s.rawNum} label={s.label} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPERIENCE
// ══════════════════════════════════════════════════════════════════════════════

function Experience() {
  const ref = useObserver()

  const bullets = (items: string[], accent = false) => (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map(item => (
        <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.9375rem', color: '#8FA8BC', lineHeight: 1.65 }}>
          <span style={{ color: accent ? '#008FF5' : '#294761', marginTop: '3px', flexShrink: 0, fontWeight: 700 }}>—</span>
          {item}
        </li>
      ))}
    </ul>
  )

  return (
    <section id="experience" style={{ padding: '120px 32px', borderTop: '1px solid #294761', background: '#061C32' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div ref={ref} className="section-observe">
          <SectionLabel>02 — Experience</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', marginBottom: '72px', maxWidth: '600px' }}>
            Experience that combines development, ownership and leadership.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '48px', paddingBottom: '64px', borderBottom: '1px solid #1A3A55' }} className="exp-grid">
            <div style={{ paddingTop: '4px' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#5A7A94', marginBottom: '14px', lineHeight: 1.6 }}>Jul 2025<br />Present</div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#008FF5', boxShadow: '0 0 12px rgba(0,143,245,0.6)' }} className="glow-pulse" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.375rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>WordPress Developer</h3>
              <p style={{ fontSize: '0.9375rem', color: '#5A7A94', marginBottom: '28px' }}>Ambit Software · Pune</p>
              {bullets(['Developed and optimized the corporate WordPress website.', 'Built responsive pages using Elementor and WPBakery.', 'Migrated 400+ pages from legacy WPBakery architecture to Elementor.', 'Collaborated directly with business stakeholders and leadership.', 'Implemented UI/UX improvements and responsive layouts.', 'Worked on SEO, redirects and website performance optimization.', 'Managed development, staging and production deployments.'], true)}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '40px' }}>
                {['WordPress', 'Elementor', 'WPBakery', 'PHP', 'HTML', 'CSS', 'JavaScript', 'SEO'].map(t => <Tag key={t}>{t}</Tag>)}
              </div>
              <div style={{ background: '#0A2540', border: '1px solid #1A3A55', borderLeft: '3px solid #008FF5', borderRadius: '12px', padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', color: '#008FF5', textTransform: 'uppercase' }}>Featured Client Project</span>
                  <div style={{ height: '1px', flex: 1, background: '#1A3A55' }} />
                </div>
                <h4 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '24px' }}>LG Portal</h4>
                {bullets(['Built the portal from scratch.', 'Developed an administration dashboard.', 'Implemented Active Directory authentication.', 'Implemented role-based access control.', 'Created factory drill-down navigation.', 'Built reusable frontend components.', 'Integrated frontend components with backend APIs.', 'Managed production deployment and post-launch support.', 'Led a team of 2 developers.', 'Conducted code reviews and mentored junior developers.'], true)}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['HTML', 'CSS', 'JavaScript', 'PHP', 'REST API', 'Active Directory', 'APIs'].map(t => <Tag key={t}>{t}</Tag>)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '48px', paddingTop: '64px' }} className="exp-grid">
            <div style={{ paddingTop: '4px' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#5A7A94', marginBottom: '14px', lineHeight: 1.6 }}>Aug 2022<br />Jun 2025</div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #294761' }} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.375rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>Software Developer</h3>
              <p style={{ fontSize: '0.9375rem', color: '#5A7A94', marginBottom: '28px' }}>Hummingbird Web Solution · Pune</p>
              {bullets(['Developed responsive interfaces using HTML, CSS and JavaScript.', 'Converted Figma designs into pixel-perfect responsive websites.', 'Optimized websites for PageSpeed and GTmetrix performance.', 'Customized WordPress themes and plugins.', 'Extended third-party plugin functionality.', 'Built 30+ website templates.', 'Resolved complex frontend and performance issues.', 'Worked with designers, backend developers and stakeholders.', 'Used Git and participated in code reviews.'])}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['WordPress', 'PHP', 'HTML', 'CSS', 'JavaScript', 'jQuery', 'Git', 'Figma'].map(t => <Tag key={t}>{t}</Tag>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════════════════════════

function Projects() {
  const ref = useObserver()
  const projects = [
    { num: '01', category: 'Enterprise Web Application', title: 'LG Portal', description: 'A secure client portal built from the ground up with administration capabilities, Active Directory authentication, role-based access, factory drill-down navigation and reusable frontend components.', highlight: 'Team of 2 led · Production deployed', tags: ['PHP', 'JavaScript', 'REST API', 'Active Directory'], cta: 'View Case Study →', mockupLabel: 'lg-portal.ambit.com', mockupAccent: '#008FF5', mockupRows: [85, 60, 75, 50] },
    { num: '02', category: 'Corporate Website', title: 'Ambit Software Website', description: 'A scalable WordPress corporate website focused on responsive design, maintainability, SEO and performance.', highlight: '400+ pages migrated to Elementor', tags: ['WordPress', 'Elementor', 'SEO', 'Performance'], cta: 'View Project →', mockupLabel: 'ambit.co', mockupAccent: '#00A3FF', mockupRows: [90, 70, 55, 80] },
    { num: '03', category: 'Web Development', title: 'High-Performance WordPress Websites', description: 'Responsive WordPress websites optimized for speed, usability, maintainability and cross-device performance.', highlight: '30+ website templates developed', tags: ['WordPress', 'PHP', 'HTML', 'CSS', 'JavaScript'], cta: 'Explore Work →', mockupLabel: 'portfolio.dev', mockupAccent: '#22D3EE', mockupRows: [75, 90, 65, 70] },
  ]
  return (
    <section id="projects" style={{ padding: '120px 32px', borderTop: '1px solid #294761', background: '#082846' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div ref={ref} className="section-observe">
          <SectionLabel>03 — Selected Work</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', marginBottom: '64px', maxWidth: '520px' }}>
            A selection of projects I've built and delivered.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {projects.map(p => <ProjectCard key={p.num} p={p} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════════════════════════════

function Skills() {
  const ref = useObserver()
  const categories = [
    { title: 'Frontend', skills: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'Media Queries', 'Responsive Web Design', 'Figma to HTML'] },
    { title: 'Backend', skills: ['PHP', 'MySQL', 'REST API', 'Active Directory Authentication'] },
    { title: 'CMS & Page Builders', skills: ['WordPress', 'Elementor', 'WPBakery', 'Gutenberg'] },
    { title: 'Tools & Collaboration', skills: ['Git', 'Bitbucket', 'SVN', 'Visual Studio Code', 'Sublime'] },
    { title: 'Methodology & Leadership', skills: ['Agile / Scrum', 'Sprint Planning', 'Team Leadership', 'Code Review', 'Mentoring', 'Technical Interviewing'] },
  ]
  return (
    <section id="skills" style={{ padding: '120px 32px', borderTop: '1px solid #294761', background: '#061C32' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div ref={ref} className="section-observe">
          <SectionLabel>04 — Skills</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', marginBottom: '64px', maxWidth: '440px' }}>
            Tools, technologies & expertise.
          </h2>
          <div>
            {categories.map((cat, i) => (
              <div key={cat.title}
                style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '48px', padding: '28px 0', borderTop: '1px solid #1A3A55', alignItems: 'start', borderBottom: i === categories.length - 1 ? '1px solid #1A3A55' : 'none' }}
                className="skills-row">
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: '#D9E5EF', paddingTop: '4px' }}>{cat.title}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {cat.skills.map((s, si) => (
                    <span key={s} className="skill-tag"
                      style={{ animationDelay: `${si * 0.04}s` }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EDUCATION
// ══════════════════════════════════════════════════════════════════════════════

function Education() {
  const ref = useObserver()
  const entries = [
    { degree: 'Bachelor of Engineering — Information Technology', institution: 'Savitribai Phule Pune University', year: '2022', grade: '8.9 CGPA' },
    { degree: 'HSC — 12th Standard', institution: '', year: '2018', grade: '66%' },
    { degree: 'SSC — 10th Standard', institution: '', year: '2016', grade: '88%' },
  ]
  return (
    <section id="education" style={{ padding: '120px 32px', borderTop: '1px solid #294761', background: '#082846' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div ref={ref} className="section-observe">
          <SectionLabel>05 — Education</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', marginBottom: '64px' }}>
            Academic foundation.
          </h2>
          <div style={{ maxWidth: '720px' }}>
            {entries.map((e, i) => (
              <div key={e.degree} style={{ display: 'flex', gap: '40px', padding: '36px 0', borderTop: '1px solid #1A3A55', borderBottom: i === entries.length - 1 ? '1px solid #1A3A55' : 'none', transition: 'background 0.2s' }}
                onMouseEnter={el => (el.currentTarget.style.background = 'rgba(0,143,245,0.03)')}
                onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                <div style={{ flexShrink: 0, width: '72px' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', color: '#5A7A94', fontWeight: 500 }}>{e.year}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.0625rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>{e.degree}</div>
                  {e.institution && <div style={{ fontSize: '0.9rem', color: '#5A7A94', marginBottom: '12px' }}>{e.institution}</div>}
                  <span style={{ display: 'inline-flex', padding: '3px 14px', background: 'rgba(0,143,245,0.1)', border: '1px solid rgba(0,143,245,0.25)', borderRadius: '999px', fontSize: '0.8125rem', color: '#00A3FF', fontWeight: 600 }}>
                    {e.grade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LEADERSHIP
// ══════════════════════════════════════════════════════════════════════════════

function Leadership() {
  const ref = useObserver()
  const items = [
    { title: 'Team Leadership', body: 'Led a team of 2 developers on the LG Portal project, assigning tasks and monitoring sprint progress.' },
    { title: 'Code Reviews', body: 'Conducted thorough code reviews to maintain quality standards and consistency across the codebase.' },
    { title: 'Mentoring', body: 'Mentored junior developers, supporting their technical growth and problem-solving skills.' },
    { title: 'Technical Hiring', body: 'Participated in technical hiring interviews to evaluate frontend and WordPress candidates.' },
    { title: 'Client Collaboration', body: 'Collaborated directly with clients and business stakeholders throughout project lifecycles.' },
    { title: 'Agile / Scrum', body: 'Worked in Agile/Scrum environments with structured sprint planning and retrospectives.' },
  ]
  return (
    <section style={{ padding: '120px 32px', borderTop: '1px solid #294761', background: '#0A3154' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div ref={ref} className="section-observe">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.14em', color: '#00A3FF', textTransform: 'uppercase' }}>Beyond Development</span>
            <div style={{ height: '1px', width: '64px', background: '#294761' }} />
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', marginBottom: '64px', maxWidth: '560px' }}>
            Development with leadership and ownership.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#294761', border: '1px solid #294761', borderRadius: '14px', overflow: 'hidden' }} className="leadership-grid">
            {items.map(item => (
              <div key={item.title} style={{ background: '#102F4A', padding: '32px', transition: 'background 0.25s ease' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#132E47')}
                onMouseLeave={e => (e.currentTarget.style.background = '#102F4A')}>
                <div style={{ width: '28px', height: '2px', background: '#008FF5', marginBottom: '18px', borderRadius: '1px' }} />
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>{item.title}</div>
                <p style={{ fontSize: '0.875rem', color: '#5A7A94', lineHeight: 1.65 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTACT
// ══════════════════════════════════════════════════════════════════════════════

function Contact({ openModal }: { openModal: () => void }) {
  const ref = useObserver()
  const details = [
    { label: 'Email', value: 'divyanarhe02@gmail.com', href: 'mailto:divyanarhe02@gmail.com' },
    { label: 'Phone', value: '+91 9096462991', href: 'tel:+919096462991' },
    { label: 'Location', value: 'Pune, India', href: null },
    { label: 'LinkedIn', value: 'linkedin.com/in/divya-narhe', href: 'https://www.linkedin.com/in/divya-narhe' },
    { label: 'GitHub', value: 'github.com/divyanarhe', href: 'https://github.com/divyanarhe' },
  ]
  return (
    <section id="contact" style={{ padding: '120px 32px', borderTop: '1px solid #294761', background: '#061C32' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div ref={ref} className="section-observe">
          <SectionLabel>06 — Contact</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }} className="contact-grid">
            <div>
              <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.75rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', marginBottom: '20px', lineHeight: 1.15 }}>
                Have a project in mind?<br />
                <span style={{ color: '#00A3FF' }}>Let's build something great.</span>
              </h2>
              <p style={{ fontSize: '1.0625rem', lineHeight: 1.75, color: '#8FA8BC', marginBottom: '36px' }}>
                I'm always interested in discussing interesting projects, new opportunities and ideas around web development.
              </p>
              <MagneticBtn className="btn-primary"
                onClick={openModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '1rem', padding: '14px 28px', borderRadius: '10px', border: 'none', cursor: 'none' }}>
                Start a Conversation →
              </MagneticBtn>
            </div>
            <div>
              {details.map((c, i) => (
                <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderTop: '1px solid #1A3A55', borderBottom: i === details.length - 1 ? '1px solid #1A3A55' : 'none', transition: 'padding-left 0.2s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.paddingLeft = '8px')}
                  onMouseLeave={e => (e.currentTarget.style.paddingLeft = '0px')}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#294761', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{c.label}</span>
                  {c.href ? (
                    <a href={c.href} target={c.href.startsWith('http') ? '_blank' : '_self'} rel="noreferrer"
                      style={{ fontSize: '0.9375rem', color: '#D9E5EF', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#00A3FF')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#D9E5EF')}>
                      {c.value} →
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.9375rem', color: '#D9E5EF', fontWeight: 500 }}>{c.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// FOOTER
// ══════════════════════════════════════════════════════════════════════════════

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #1A3A55', padding: '28px 32px', background: '#040D18' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <span style={{ fontSize: '0.875rem', color: '#294761' }}>© 2026 Divya Narhe</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#1A3A55', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Software Developer · WordPress Developer</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { label: 'LinkedIn', href: 'https://www.linkedin.com/in/divya-narhe' },
            { label: 'GitHub', href: 'https://github.com/divyanarhe' },
            { label: 'Email', href: 'mailto:divyanarhe02@gmail.com' },
          ].map(l => (
            <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : '_self'} rel="noreferrer"
              style={{ fontSize: '0.875rem', color: '#294761', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#008FF5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#294761')}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTACT MODAL
// ══════════════════════════════════════════════════════════════════════════════

function ContactModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [closing, setClosing] = useState(false)

  const close = () => {
    setClosing(true)
    setTimeout(onClose, 220)
  }

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('sending')
    const formData = new FormData(e.currentTarget)
    formData.append('access_key', 'a55aa26e-5bf7-4425-8b23-c62e5f0049c9')
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData })
      const data = await res.json()
      setStatus(data.success ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: 'Manrope, sans-serif', fontWeight: 600,
    fontSize: '0.8125rem', color: '#D9E5EF', marginBottom: '4px',
  }
  const optStyle: React.CSSProperties = { fontWeight: 400, color: '#5A7A94', fontSize: '0.75rem' }

  return (
    <div className={`modal-backdrop${closing ? ' closing' : ''}`} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className={`modal-card${closing ? ' closing' : ''}`} style={{
        width: '100%', maxWidth: '480px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'linear-gradient(160deg, #0D2640 0%, #071B30 100%)',
        border: '1px solid #1A3A55',
        borderRadius: '20px',
        boxShadow: '0 48px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,143,245,0.12)',
        position: 'relative',
      }}>

        {/* Top accent bar */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #008FF5, #22D3EE, #008FF5)', backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }} />

        {/* Header */}
        <div style={{ padding: '20px 24px 0', position: 'relative' }}>
          {/* Close button */}
          <button onClick={close} style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'rgba(0,143,245,0.08)', border: '1px solid #1A3A55',
            color: '#5A7A94', fontSize: '16px', lineHeight: 1,
            cursor: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s, color 0.2s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,143,245,0.15)'; (e.currentTarget as HTMLElement).style.color = '#FFFFFF' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,143,245,0.08)'; (e.currentTarget as HTMLElement).style.color = '#5A7A94' }}>
            ×
          </button>

          {/* Icon */}
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,143,245,0.1)', border: '1px solid rgba(0,143,245,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#008FF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>

          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Let's build something great
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem', color: '#5A7A94', marginBottom: '16px', lineHeight: 1.5 }}>
            Fill in the form and I'll get back to you within 24 hours.
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #1A3A55, transparent)', margin: '0 24px' }} />

        {/* Form or Success */}
        <div style={{ padding: '16px 24px 24px' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: '#FFFFFF', marginBottom: '8px' }}>Message sent!</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#5A7A94', marginBottom: '20px' }}>Thanks for reaching out. I'll respond soon.</div>
              <button onClick={close} className="btn-primary"
                style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'none' }}>
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Your Name</label>
                <input name="name" type="text" required placeholder="Divya Narhe" className="modal-input" style={{ padding: '10px 14px' }} />
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email Address</label>
                <input name="email" type="email" required placeholder="hello@example.com" className="modal-input" style={{ padding: '10px 14px' }} />
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>Phone Number <span style={optStyle}>(Optional)</span></label>
                <input name="phone" type="tel" placeholder="+91 98765 43210" className="modal-input" style={{ padding: '10px 14px' }} />
              </div>

              {/* Message */}
              <div>
                <label style={labelStyle}>Message</label>
                <textarea name="message" required placeholder="Tell me about your project..." rows={3} className="modal-input"
                  style={{ resize: 'vertical', minHeight: '70px', padding: '10px 14px', fontFamily: 'Inter, sans-serif' }} />
              </div>

              {/* Error */}
              {status === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#EF4444' }}>Something went wrong. Please try again.</span>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={status === 'sending'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.875rem',
                  padding: '12px', borderRadius: '8px', border: 'none', cursor: 'none', marginTop: '4px',
                  background: status === 'sending' ? '#0070CC' : '#008FF5',
                  color: '#FFFFFF',
                  transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
                  boxShadow: '0 4px 16px rgba(0,143,245,0.25)',
                }}
                onMouseEnter={e => { if (status !== 'sending') { (e.currentTarget as HTMLElement).style.background = '#00A3FF'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,143,245,0.4)' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#008FF5'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,143,245,0.25)' }}>
                {status === 'sending' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin-ring 0.8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const openModal = () => setModalOpen(true)

  return (
    <>
      <GlobalEffects />
      {modalOpen && <ContactModal onClose={() => setModalOpen(false)} />}
      <div style={{ background: '#061C32', minHeight: '100vh' }}>
        <Navbar openModal={openModal} />
        <main>
          <Hero openModal={openModal} />
          <About />
          <Experience />
          <Projects />
          <Skills />
          <Education />
          <Leadership />
          <Contact openModal={openModal} />
        </main>
        <Footer />
      </div>
    </>
  )
}
