/*
  The ceremony's drumroll and what comes with it (review 2026-10-16), from the
  designer's prototype: a light runs over the nominees, speeds up, slows down
  and lands on the winner; then a flash, confetti from the winner's plate and a
  chord. Sound is synthesised with Web Audio - nothing to download - and the
  stage's warm motes drift up through the beam. Timings are his.
*/

/** Web Audio, made on the first sound so the browser's autoplay rule is met by the host's click. */
export function createCeremonySound() {
  let ac: AudioContext | null = null
  let on = true
  const ctx = () => {
    if (!on) return null
    if (!ac) {
      try {
        ac = new AudioContext()
      } catch {
        return null
      }
    }
    if (ac.state === 'suspended') ac.resume()
    return ac
  }
  const noise = (a: AudioContext, dur: number) => {
    const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const n = a.createBufferSource()
    n.buffer = b
    return n
  }
  return {
    get on() { return on },
    set(v: boolean) { on = v; if (!v) ac?.suspend() },
    /** the snare under the run */
    roll(dur: number) {
      const a = ctx()
      if (!a) return
      const t = a.currentTime, n = noise(a, dur + 0.2), bp = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(), am = a.createGain()
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7
      lfo.frequency.setValueAtTime(14, t); lfo.frequency.linearRampToValueAtTime(26, t + dur); lg.gain.value = 0.5
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.15); g.gain.linearRampToValueAtTime(0.26, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.15)
      am.gain.value = 0.5
      lfo.connect(lg); lg.connect(am.gain); n.connect(bp); bp.connect(am); am.connect(g); g.connect(a.destination)
      n.start(t); lfo.start(t); n.stop(t + dur + 0.2); lfo.stop(t + dur + 0.2)
    },
    /** one step of the light, a little higher as it goes */
    tick(p: number) {
      const a = ctx()
      if (!a) return
      const t = a.currentTime, o = a.createOscillator(), g = a.createGain()
      o.type = 'triangle'; o.frequency.value = 520 + p * 380
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.08)
    },
    /** cymbal, kick and a C major chord */
    hit() {
      const a = ctx()
      if (!a) return
      const t = a.currentTime
      const n = noise(a, 2.2), hp = a.createBiquadFilter(), g = a.createGain()
      hp.type = 'highpass'; hp.frequency.value = 5200; g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2)
      n.connect(hp); hp.connect(g); g.connect(a.destination); n.start(t)
      const k = a.createOscillator(), kg = a.createGain()
      k.frequency.setValueAtTime(140, t); k.frequency.exponentialRampToValueAtTime(45, t + 0.25)
      kg.gain.setValueAtTime(0.5, t); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      k.connect(kg); kg.connect(a.destination); k.start(t); k.stop(t + 0.4)
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const o = a.createOscillator(), og = a.createGain(), st = t + 0.04 + i * 0.06
        o.type = 'sine'; o.frequency.value = f
        og.gain.setValueAtTime(0, st); og.gain.linearRampToValueAtTime(0.09, st + 0.02); og.gain.exponentialRampToValueAtTime(0.0001, st + 1.8)
        o.connect(og); og.connect(a.destination); o.start(st); o.stop(st + 1.9)
      })
    },
  }
}
export type CeremonySound = ReturnType<typeof createCeremonySound>

/**
 * The light runs over `cards` - three times round, then on to the winner -
 * fast at first and slowing down, and resolves when it has landed.
 */
export function drumroll(cards: HTMLElement[], winner: number, sound: CeremonySound): Promise<void> {
  const N = cards.length
  const steps = N * 3 + ((((winner - ((N * 3) % N)) % N) + N) % N)
  sound.roll(1.6 + steps * 0.012)
  return new Promise((done) => {
    let k = 0
    const tick = () => {
      cards.forEach((c) => c.classList.remove('is-hot'))
      cards[k % N]?.classList.add('is-hot')
      sound.tick(k / steps)
      if (k >= steps) { setTimeout(done, 380); return }
      k++
      setTimeout(tick, 55 + Math.pow(k / steps, 3) * 420)
    }
    tick()
  })
}

/** Confetti from a point of the canvas (0..1 each way), in the stage's warm colours. */
export function confetti(cv: HTMLCanvasElement, ux: number, uy: number, colours = ['#C9A45C', '#E8CF94', '#F6F4EE', '#B7A4FF', '#FFF1C9']) {
  const x = cv.getContext('2d')
  if (!x) return
  const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), W = r.width, H = r.height
  cv.width = W * d; cv.height = H * d
  x.setTransform(d, 0, 0, d, 0, 0)
  let ps = Array.from({ length: 140 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = (0.35 + Math.random() * 0.9) * W * 0.012
    return { x: ux * W, y: uy * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v - W * 0.004, s: 2 + Math.random() * W * 0.006, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colours[i % colours.length]!, l: 1, round: Math.random() < 0.35 }
  })
  const loop = () => {
    x.clearRect(0, 0, W, H)
    ps = ps.filter((q) => q.l > 0 && q.y < H + 40)
    for (const q of ps) {
      q.vy += W * 0.00022; q.vx *= 0.985; q.x += q.vx; q.y += q.vy; q.r += q.vr; q.l -= 0.006
      x.save()
      x.globalAlpha = Math.max(0, Math.min(1, q.l * 1.6))
      x.translate(q.x, q.y); x.rotate(q.r); x.fillStyle = q.c
      if (q.round) { x.beginPath(); x.arc(0, 0, q.s * 0.45, 0, 7); x.fill() } else x.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2.2)
      x.restore()
    }
    if (ps.length) requestAnimationFrame(loop)
    else x.clearRect(0, 0, W, H)
  }
  requestAnimationFrame(loop)
}

/** Slow warm motes drifting up through the beam, brighter near the middle. Returns the stop. */
export function stageMotes(cv: HTMLCanvasElement): () => void {
  const x = cv.getContext('2d')
  if (!x) return () => {}
  let W = 0, H = 0, raf = 0
  let ms: { x: number; y: number; r: number; v: number; ph: number; a: number }[] = []
  const size = () => {
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1)
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d
    x.setTransform(d, 0, 0, d, 0, 0)
    ms = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 2.2, v: 0.08 + Math.random() * 0.28, ph: Math.random() * 6.28, a: 0.15 + Math.random() * 0.45 }))
  }
  const loop = (t: number) => {
    if (!W) size()
    x.clearRect(0, 0, W, H)
    for (const m of ms) {
      m.y -= m.v; m.x += Math.sin(t / 2400 + m.ph) * 0.18
      if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W }
      const near = 1 - Math.min(1, Math.abs(m.x - W / 2) / (W * 0.3)), al = m.a * (0.35 + 0.65 * near) * (0.6 + 0.4 * Math.sin(t / 900 + m.ph))
      x.beginPath(); x.fillStyle = `rgba(232,207,148,${al.toFixed(3)})`; x.arc(m.x, m.y, m.r, 0, 7); x.fill()
    }
    raf = requestAnimationFrame(loop)
  }
  const onResize = () => { W = 0 }
  addEventListener('resize', onResize)
  raf = requestAnimationFrame(loop)
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', onResize) }
}
