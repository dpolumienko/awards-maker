/*
  The Envelope landing hero (review 2026-10-16): three glass trophies that take
  turns on one lacquer plinth, each holding a platform mark (Twitch, Kick,
  YouTube), warm dust drifting up through the beam, and 2D copies of the same
  render behind the two interludes. Ported from the designer's prototype; the
  geometry, light and timings are his. three.js is loaded on demand, so only a
  visitor of this version's landing ever downloads it.
*/
/* eslint-disable @typescript-eslint/no-explicit-any -- three is loaded at runtime and kept untyped here */

export interface HeroEls {
  hero: HTMLElement
  vis: HTMLElement
  trophy: HTMLCanvasElement
  dust: HTMLCanvasElement
  /** interlude copies: drawn from the hero's canvas only while their band is on screen */
  copies: { canvas: HTMLCanvasElement; band: HTMLElement }[]
}

const PLATFORM_SVG = {
  tw: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.78134 1.33337L2.40039 3.71433L2.40039 12.2858L5.25753 12.2858L5.25753 14.6667L7.63849 12.2858L9.54325 12.2858L13.829 8.00004L13.829 1.33337L4.78134 1.33337Z" fill="#9147FF"/><path d="M10.9711 9.42863L12.8759 7.52386L12.8759 2.28577L5.25684 2.28577L5.25684 9.42863L7.1616 9.42863L7.1616 11.3334L9.06636 9.42863L10.9711 9.42863Z" fill="white"/><path d="M8.11426 4.19037L9.06664 4.19037L9.06664 7.04751L8.11426 7.04751L8.11426 4.19037ZM11.4476 4.19037L11.4476 7.04751L10.4952 7.04751L10.4952 4.19037L11.4476 4.19037Z" fill="#9147FF"/></svg>`,
  kk: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 2H6.75V5H8V3.71429H9.25V2H13V5.85714H11.75V7.14286H10.5V8.85714H11.75V10.1429H13V14H9.25V12.2857H8V11H6.75V14H3V2Z" fill="#53FC18"/></svg>`,
  yt: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.3917 4.84012C14.238 4.25101 13.7877 3.78653 13.2165 3.62793C12.1732 3.33337 7.99965 3.33337 7.99965 3.33337C7.99965 3.33337 3.82613 3.33337 2.78275 3.6166C2.22263 3.7752 1.76134 4.25101 1.60758 4.84012C1.33301 5.91636 1.33301 8.14815 1.33301 8.14815C1.33301 8.14815 1.33301 10.3913 1.60758 11.4562C1.76134 12.0453 2.21164 12.5098 2.78275 12.6684C3.83712 12.9629 7.99965 12.9629 7.99965 12.9629C7.99965 12.9629 12.1732 12.9629 13.2165 12.6797C13.7877 12.5211 14.238 12.0566 14.3917 11.4675C14.6663 10.3913 14.6663 8.15948 14.6663 8.15948C14.6663 8.15948 14.6773 5.91636 14.3917 4.84012Z" fill="#FF0000"/><path d="M6.6709 10.2101L10.1415 8.14822L6.6709 6.08636L6.6709 10.2101Z" fill="white"/></svg>`,
}

function ribbonGeometry(THREE: any) {
  // a glass band that rises out of the plinth, arches over and comes back down, turning half a turn on the way
  const pts: [number, number, number][] = [[-0.16, 0.2, 0], [-0.72, 1.1, 0.2], [-0.98, 2.2, 0.32], [-0.72, 3.3, 0.18], [0, 3.95, 0], [0.72, 3.3, -0.18], [0.98, 2.2, -0.32], [0.72, 1.1, -0.2], [0.16, 0.2, 0]]
  const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), false, 'centripetal')
  const L = 260, S = 48, P = 4, fr = curve.computeFrenetFrames(L, false)
  const pos: number[] = [], idx: number[] = [], v = new THREE.Vector3()
  for (let i = 0; i <= L; i++) {
    const u = i / L, c = curve.getPointAt(u), N = fr.normals[i], B = fr.binormals[i]
    const w = 0.16 + 0.34 * Math.sin(Math.PI * u), t = 0.075, phi = u * Math.PI
    for (let j = 0; j < S; j++) {
      const a = (j / S) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a)
      const x = w * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / P), y = t * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / P)
      const xr = x * Math.cos(phi) - y * Math.sin(phi), yr = x * Math.sin(phi) + y * Math.cos(phi)
      v.copy(c).addScaledVector(B, xr).addScaledVector(N, yr)
      pos.push(v.x, v.y, v.z)
    }
  }
  for (let i = 0; i < L; i++) for (let j = 0; j < S; j++) {
    const a = i * S + j, b = i * S + ((j + 1) % S), c = (i + 1) * S + j, d = (i + 1) * S + ((j + 1) % S)
    idx.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  // make sure the faces point outward: flip the winding if a mid-ribbon normal points at the centreline
  const k = (L >> 1) * S, nA = g.attributes.normal, c = curve.getPointAt(0.5)
  if ((pos[k * 3]! - c.x) * nA.getX(k) + (pos[k * 3 + 1]! - c.y) * nA.getY(k) + (pos[k * 3 + 2]! - c.z) * nA.getZ(k) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const q = idx[i + 1]!; idx[i + 1] = idx[i + 2]!; idx[i + 2] = q }
    g.setIndex(idx)
    g.computeVertexNormals()
  }
  return g
}

function spireGeometry(THREE: any) {
  // a soft three-lobed section that twists and tapers as it rises, closed by a small dome
  const N = 160, M = 220, H = 4.2, K = 20
  const lobe = (a: number) => 1 + 0.17 * Math.cos(3 * a)
  const scale = (t: number) => { const e = t * t * (3 - 2 * t); return 1 - 0.64 * e + 0.07 * Math.sin(Math.PI * t) }
  const twist = (t: number) => t * Math.PI * 1.05
  const rings: [number, number, number][] = [[0, 0, 0]]
  for (let j = 0; j <= M; j++) { const t = j / M; rings.push([t * H, scale(t), twist(t)]) }
  const sTop = scale(1)
  for (let k = 1; k <= K; k++) { const f = (k / K) * Math.PI / 2; rings.push([H + 0.34 * sTop * Math.sin(f), sTop * Math.cos(f), twist(1) + k * 0.004]) }
  const pos: number[] = [], idx: number[] = []
  rings.forEach(([y, sc, a0]) => { for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, r = 0.78 * sc * lobe(a); pos.push(r * Math.cos(a + a0), y, r * Math.sin(a + a0)) } })
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < N; j++) {
    const a = i * N + j, b = i * N + ((j + 1) % N), c = (i + 1) * N + j, d = (i + 1) * N + ((j + 1) % N)
    idx.push(a, c, b, b, c, d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function crystalGeometry(THREE: any) {
  // an eight-sided crystal that narrows and turns a little as it rises, its top cut on a slant
  const N = 8, H = 3.8, phi = 0.5, levels = [0, 0.15, 0.3, 0.42, 0.52, 0.62, 0.72, 0.82]
  const rad = (t: number) => 0.5 + 0.38 * Math.sin(Math.PI * t) - 0.28 * t, twist = (t: number) => (t * Math.PI) / 3
  const ring = (y: number, r: number, a0: number, slant: boolean) => {
    const out: [number, number, number][] = []
    for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 + a0; out.push([r * Math.cos(a), slant ? H + 0.42 * Math.cos(a - phi) : y, r * Math.sin(a)]) }
    return out
  }
  const rings = levels.map((t) => ring(t * H, rad(t), twist(t), false))
  rings.push(ring(H, rad(1), twist(1), true))
  const pos: number[] = [], idx: number[] = [], push = (v: [number, number, number]) => { pos.push(v[0], v[1], v[2]); return pos.length / 3 - 1 }
  const ids = rings.map((rg) => rg.map(push))
  for (let k = 0; k < ids.length - 1; k++) for (let i = 0; i < N; i++) {
    const a = ids[k]![i]!, b = ids[k]![(i + 1) % N]!, c = ids[k + 1]![i]!, d = ids[k + 1]![(i + 1) % N]!
    idx.push(a, c, b, b, c, d)
  }
  const bc = push([0, 0, 0]), tc = push([0, H, 0]), first = ids[0]!, last = ids[ids.length - 1]!
  for (let i = 0; i < N; i++) { idx.push(bc, first[i]!, first[(i + 1) % N]!); idx.push(tc, last[(i + 1) % N]!, last[i]!) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  const flat = g.toNonIndexed()
  flat.computeVertexNormals()
  return flat
}

function iconGroup(THREE: any, SVGL: any, svg: string, size: number, faces: string) {
  // a platform mark, extruded: every fill is its own layer a little forward; faces gold or pearl white, sides always gold
  const mk = (o: object) => new THREE.MeshPhysicalMaterial(o)
  const gold = mk({ color: 0xe2bd72, metalness: 1, roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.12, envMapIntensity: 2.2 })
  const pearl = mk({ color: 0xf5f0e6, emissive: 0x3a362f, metalness: 0, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.4 })
  const data = new SVGL().parse(svg), inner = new THREE.Group()
  data.paths.forEach((p: any, k: number) => {
    const geo = new THREE.ExtrudeGeometry(SVGL.createShapes(p), { depth: 2, bevelEnabled: true, bevelThickness: 0.36, bevelSize: 0.16, bevelSegments: 8, curveSegments: 64 })
    const mesh = new THREE.Mesh(geo, [faces[k] === 'w' ? pearl : gold, gold])
    mesh.position.z = k * 0.55
    inner.add(mesh)
  })
  // the back is the front's mirror: every layer above the body is repeated, reflected about the body's middle plane
  inner.children.slice(1).forEach((m: any, k: number) => { const b = m.clone(); b.scale.z = -1; b.position.z = 2 - (k + 1) * 0.55; inner.add(b) })
  const box = new THREE.Box3().setFromObject(inner), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3())
  inner.position.set(-c.x, -c.y, -c.z)
  const g = new THREE.Group()
  g.add(inner)
  const k = size / Math.max(sz.x, sz.y)
  g.scale.set(k, -k, k)
  return { g, mats: [gold, pearl] }
}

/* the trophy changes every 5 s: a plain crossfade, nothing moves but the turn */
const HOLD = 5000, FADE = 1700
// Only the glass goes transparent. Brass stays opaque and darkens to the page colour instead.
function fadeOn(m: any, on: boolean) {
  m.mats.forEach((x: any) => {
    if (!(x.transmission > 0)) return
    if (x.transparent !== on) { x.transparent = on; x.needsUpdate = true }
    x.depthWrite = !on
  })
}
function fadeSet(m: any, a: number) {
  m.mats.forEach((x: any) => {
    if (x.transmission > 0) { x.opacity = a; return }
    const u = x.userData
    if (!u.base) { u.base = x.color.clone(); u.env = x.envMapIntensity; u.cc = x.clearcoat || 0; u.sp = x.specularIntensity; u.em = x.emissive ? x.emissive.clone() : null }
    x.color.copy(u.base).multiplyScalar(a)
    x.envMapIntensity = u.env * a
    if (u.cc) x.clearcoat = Math.max(1e-3, u.cc * a)
    if (u.sp !== undefined) x.specularIntensity = u.sp * a
    if (u.em) x.emissive.copy(u.em).multiplyScalar(a)
  })
}

/** Starts the hero; returns the function that stops it and frees the GPU. */
export function mountEnvelopeHero(els: HeroEls, reduce: boolean): () => void {
  let alive = true
  let heroOn = true, copiesOn = false
  let traf = 0, tlast = 0, draf = 0, dlast = 0
  let T: any = null
  const copies = els.copies.map((c) => ({ ...c, on: false }))
  const off: (() => void)[] = []
  const listen = (t: EventTarget, ev: string, fn: EventListener) => { t.addEventListener(ev, fn); off.push(() => t.removeEventListener(ev, fn)) }

  /* the beam stands over the trophy: its centre is the visual's centre */
  function placeBeam() {
    const h = els.hero.getBoundingClientRect(), v = els.vis.getBoundingClientRect()
    els.hero.style.setProperty('--top', Math.round(h.top + scrollY) + 'px')
    if (els.vis.offsetWidth) els.hero.style.setProperty('--bx', (((v.left + v.width / 2 - h.left) / h.width) * 100).toFixed(2) + '%')
    if (D) { D.fit(); D.ps = D.ps.map(() => mote(true)) }
  }

  /* dust in the light: warm motes drifting up through the beam, only where the light is */
  const CONE = Math.tan((30 * Math.PI) / 180), APEX = -40, FADE_TOP = 0.34 * 860 + APEX, FADE_END = 0.8 * 860 + APEX
  const halfW = (y: number) => Math.max(0, (y - APEX) * CONE)
  let D: any = null
  function mote(anyY: boolean) {
    const y = anyY ? Math.random() * FADE_END : FADE_TOP + Math.random() * (FADE_END - FADE_TOP)
    const u = (Math.random() + Math.random() - 1) * 0.9
    const big = Math.random() < 0.12
    return {
      x: D.cx + u * halfW(y), y,
      r: big ? 1.6 + Math.random() * 1.4 : 0.5 + Math.random() * 1.1,
      a: big ? 0.12 + Math.random() * 0.12 : 0.3 + Math.random() * 0.5,
      vy: -(0.004 + Math.random() * 0.01), sway: 0.15 + Math.random() * 0.35, ph: Math.random() * 6.28, tw: 0.0012 + Math.random() * 0.002,
    }
  }
  function dustInit() {
    const c = els.dust, ctx = c.getContext('2d')
    if (!ctx) return
    D = { c, ctx, ps: [] as any[], w: 0, h: 0, cx: 0 }
    D.fit = () => {
      const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1)
      D.w = r.width; D.h = r.height
      D.cx = (D.w * (parseFloat(getComputedStyle(els.hero).getPropertyValue('--bx')) || 50)) / 100
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    D.fit()
    for (let i = 0; i < 110; i++) D.ps.push(mote(true))
  }
  function dustDraw(t: number, dt: number) {
    const { ctx, w, h, ps } = D
    ctx.clearRect(0, 0, w, h)
    for (const m of ps) {
      m.y += m.vy * dt
      m.x += Math.sin(t * 0.0006 + m.ph) * m.sway * dt * 0.01
      const hw = halfW(m.y), o = Math.abs(m.x - D.cx) / (hw || 1)
      if (m.y < 0 || o > 1) { Object.assign(m, mote(false)); continue }
      const vis = m.y < FADE_TOP ? 1 : Math.max(0, 1 - (m.y - FADE_TOP) / (FADE_END - FADE_TOP))
      const a = m.a * (0.55 + 0.45 * Math.sin(t * m.tw + m.ph)) * (1 - o * o) * vis
      if (a < 0.01) continue
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.r, 0, 6.2832)
      ctx.fillStyle = `rgba(255,232,190,${a.toFixed(3)})`
      ctx.fill()
    }
  }
  function dustLoop(t: number) {
    if (!alive) return
    if (heroOn) { const dt = dlast ? Math.min(50, t - dlast) : 16; dlast = t; dustDraw(t, dt) } else dlast = 0
    draf = requestAnimationFrame(dustLoop)
  }

  async function trophyInit() {
    const THREE: any = await import('three')
    const { SVGLoader } = await import('three/examples/jsm/loaders/SVGLoader.js')
    if (!alive) return
    const c = els.trophy
    const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, powerPreference: 'high-performance' })
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1))
    // an opaque clear in the page colour: with a transparent clear three.js fills the glass's transmission buffer with white
    r.setClearColor(0x0b0b0a, 1)
    r.toneMapping = THREE.ACESFilmicToneMapping
    r.toneMappingExposure = 1.1
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100)
    // studio light for the reflections: a dark room, a warm softbox above, two white strips, a warm rim behind
    const pm = new THREE.PMREMGenerator(r), es = new THREE.Scene()
    es.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ color: 0x040404, side: THREE.BackSide })))
    const panel = (w: number, h: number, col: number, k: number, x: number, y: number, z: number, rx = 0, ry = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }))
      m.position.set(x, y, z)
      m.rotation.set(rx, ry, 0)
      es.add(m)
    }
    panel(7, 7, 0xffe2b0, 4, 0, 9, 0, Math.PI / 2)
    panel(0.8, 16, 0xffffff, 6, -7, 2, 3, 0, Math.PI / 2)
    panel(0.8, 16, 0xffffff, 4, 7, 2, -2, 0, -Math.PI / 2)
    panel(10, 1.2, 0xffcf88, 3, 0, 1.5, -9)
    panel(9, 5, 0xffe7c2, 1.3, 0, 4.5, 10.5)
    sc.environment = pm.fromScene(es, 0.02).texture
    const glassM = () => new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.5, ior: 1.5,
      attenuationColor: new THREE.Color(0xfff4dc), attenuationDistance: 8, specularIntensity: 1, envMapIntensity: 2, iridescence: 0.12, iridescenceIOR: 1.3,
    })
    const brassM = () => new THREE.MeshStandardMaterial({ color: 0xc9a45c, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 })
    // the plinth stays; the trophy on it changes
    const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x0d0d0c, metalness: 0, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 })
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.24, 0.32, 128), lacquer)
    plinth.position.y = 0.16
    sc.add(plinth)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.05, 128), brassM())
    band.position.y = 0.345
    sc.add(band)
    const spin = new THREE.Group()
    sc.add(spin)
    const models: any[] = []
    const build = [
      () => { // 1. the glass ribbon arching over the mark
        const g = new THREE.Group(), gm = glassM()
        g.add(new THREE.Mesh(ribbonGeometry(THREE), gm))
        return { g, mats: [gm] }
      },
      () => { // 2. the twisted glass spire
        const g = new THREE.Group(), gm = glassM()
        const m = new THREE.Mesh(spireGeometry(THREE), gm)
        m.position.y = 0.37
        m.scale.setScalar(0.86)
        g.add(m)
        return { g, mats: [gm] }
      },
      () => { // 3. a faceted crystal on a brass octagonal collar
        const g = new THREE.Group(), gm = glassM(), bm = brassM()
        gm.flatShading = true; gm.thickness = 0.45; gm.envMapIntensity = 3; gm.iridescence = 0.35; gm.roughness = 0; bm.flatShading = true
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.7, 0.18, 8), bm)
        collar.position.y = 0.46
        g.add(collar)
        const cr = new THREE.Mesh(crystalGeometry(THREE), gm)
        cr.position.y = 0.55
        cr.scale.setScalar(0.92)
        g.add(cr)
        return { g, mats: [gm, bm] }
      },
    ]
    // each trophy holds a platform mark - Twitch, Kick, YouTube
    const ICONS: [keyof typeof PLATFORM_SVG, number, number, string][] = [['tw', 0.95, 2.3, 'gwg'], ['kk', 0.62, 2.15, 'w'], ['yt', 0.78, 2.3, 'gw']]
    const add = (i: number) => {
      if (!alive) return
      const mo: any = build[i]!()
      const [k, sz, y, f] = ICONS[i]!
      const ic = iconGroup(THREE, SVGLoader, PLATFORM_SVG[k], sz, f)
      ic.g.position.y = y
      mo.g.add(ic.g)
      mo.mats.push(...ic.mats)
      models[i] = mo
      spin.add(mo.g)
      mo.g.visible = i === 0
    }
    add(0)
    const idle = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 2500 }) : setTimeout(f, 200))
    idle(() => { add(1); idle(() => add(2)) })
    const top = new THREE.SpotLight(0xffe8be, 22, 30, Math.PI / 7, 0.7, 1.6)
    top.position.set(0, 11, 2)
    top.target.position.set(0, 2.3, 0)
    sc.add(top, top.target)
    sc.add(new THREE.AmbientLight(0xffffff, 0.15))
    T = { r, sc, cam, c, spin, models, cur: 0, nxt: -1, ts: 0, shown: 0, pm }
    T.size = () => {
      const w = c.clientWidth || 600, h = c.clientHeight || 700
      r.setSize(w, h, false)
      cam.aspect = w / h
      const z = 12 * Math.max(1, 0.8 / cam.aspect)
      cam.position.set(0, 2.9, z)
      cam.lookAt(0, 2.2, 0)
      cam.updateProjectionMatrix()
      r.render(sc, cam)
    }
    T.size()
    if (reduce) { spin.rotation.y = 0.6; r.render(sc, cam); return }
    traf = requestAnimationFrame(trophyLoop)
  }

  function trophyLoop(t: number) {
    if (!alive || !T) return
    if (!heroOn && !copiesOn) { tlast = 0; traf = requestAnimationFrame(trophyLoop); return }
    const dt = tlast ? Math.min(50, t - tlast) : 16
    tlast = t
    if (!T.shown) T.shown = t
    T.spin.rotation.y += dt * 0.00025
    const M = T.models
    if (T.nxt < 0 && t - T.shown > HOLD && M[(T.cur + 1) % 3]) {
      T.nxt = (T.cur + 1) % 3; T.ts = t
      fadeOn(M[T.cur], true); fadeOn(M[T.nxt], true); fadeSet(M[T.nxt], 0); M[T.nxt].g.visible = false
    }
    if (T.nxt >= 0) {
      // the old trophy goes first, the new one follows with a short overlap
      const k = Math.min(1, (t - T.ts) / FADE), sm = (v: number) => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v) }
      const eo = sm(k / 0.6), ei = sm((k - 0.4) / 0.6)
      fadeSet(M[T.cur], 1 - eo); M[T.cur].g.visible = eo < 1
      fadeSet(M[T.nxt], ei); M[T.nxt].g.visible = k > 0.4
      if (k >= 1) { M[T.cur].g.visible = false; fadeSet(M[T.cur], 1); fadeOn(M[T.cur], false); fadeOn(M[T.nxt], false); T.cur = T.nxt; T.nxt = -1; T.shown = t }
    }
    T.r.render(T.sc, T.cam)
    if (copiesOn) copies.forEach((o) => {
      if (!o.on) return
      const c2 = o.canvas
      if (c2.width !== T.c.width) { c2.width = T.c.width; c2.height = T.c.height }
      const x = c2.getContext('2d')
      if (!x) return
      x.clearRect(0, 0, c2.width, c2.height)
      x.drawImage(T.c, 0, 0)
    })
    traf = requestAnimationFrame(trophyLoop)
  }

  const ioHero = new IntersectionObserver((es) => { heroOn = !!es[0]?.isIntersecting }, { rootMargin: '80px' })
  ioHero.observe(els.hero)
  const ioCopies = new IntersectionObserver((es) => {
    es.forEach((e) => { const o = copies.find((c) => c.band === e.target); if (o) o.on = e.isIntersecting })
    copiesOn = copies.some((o) => o.on)
  }, { rootMargin: '100px' })
  copies.forEach((o) => ioCopies.observe(o.band))

  dustInit()
  placeBeam()
  if (D) { if (reduce) dustDraw(0, 0); else draf = requestAnimationFrame(dustLoop) }
  listen(window, 'resize', () => { placeBeam(); T?.size() })
  // three.js waits for an idle moment after load, as in the prototype
  const go = () => { trophyInit() }
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1200 })
  else setTimeout(go, 60)

  return () => {
    alive = false
    cancelAnimationFrame(traf)
    cancelAnimationFrame(draf)
    ioHero.disconnect()
    ioCopies.disconnect()
    off.forEach((f) => f())
    if (T) { T.pm.dispose(); T.r.dispose(); T.r.forceContextLoss() }
  }
}
