<script setup lang="ts">
// The Envelope landing (review 2026-10-16): the designer's prototype, section by
// section, on the app's own data - plans, ideas, limits and the FAQ come from the
// same files as every other version, so the numbers cannot drift (review items
// 13, 14, 17). Styles: assets/css/envelope-landing.css. The hero's WebGL and dust:
// utils/envelopeHero.ts.
import { h, onBeforeUnmount, onMounted, ref, type FunctionalComponent } from 'vue'
import type { FaqItem } from '~/components/sections/FaqSection.vue'
import { PLANS } from '~/data/plans'
import { IDEA_GROUPS, IDEA_TOTAL } from '~/data/ideas'
import { PLATFORM_NAMES } from '~/data/platforms'
import { FREE } from '#shared/limits'
import { mountEnvelopeHero } from '~/utils/envelopeHero'
import { envAsset } from '~/utils/envelopeAssets'
import '~/assets/css/envelope-landing.css'

defineProps<{ faq: FaqItem[] }>()

const PF = { tw: 'c7e608c5.svg', kk: 'd1de5e1d.svg', yt: 'f432bfd9.svg' } as const
type Pf = keyof typeof PF
interface Orb { img: string; pf?: Pf; x: number; y: number; s: number; d: number; dl: number; r: number; far?: boolean }
// faces drifting round the trophy: channels with their platform, emotes without one
const ORBIT: Orb[] = [
  { img: '395b371a.jpg', pf: 'tw', x: 12.6, y: 27.6, s: 61, d: 7.2, dl: -1.0, r: -4 },
  { img: '61c40564.jpg', pf: 'yt', x: 87.4, y: 22.1, s: 54, d: 8.1, dl: -3.2, r: 5 },
  { img: 'a23f6889.jpg', pf: 'tw', x: 92.6, y: 57.1, s: 46, d: 6.6, dl: -2.1, r: -3 },
  { img: '6bfdde55.jpg', pf: 'kk', x: 7.4, y: 60.8, s: 50, d: 7.7, dl: -4.4, r: 4 },
  { img: '1226e4a7.jpg', pf: 'tw', x: 23.0, y: 84.8, s: 40, d: 6.9, dl: -0.6, r: -5, far: true },
  { img: '5582de34.jpg', pf: 'tw', x: 79.1, y: 84.8, s: 43, d: 8.4, dl: -5.0, r: 3, far: true },
  { img: '7c7625b9.webp', x: 29.2, y: 12.1, s: 40, d: 6.2, dl: -2.4, r: -8 },
  { img: 'c66318dd.png', x: 70.8, y: 11.1, s: 32, d: 7.4, dl: -0.9, r: 7, far: true },
  { img: '5ae2efdb.webp', x: 1.1, y: 40.5, s: 37, d: 6.8, dl: -3.6, r: 6 },
  { img: '3fc1bfd1.png', x: 98.9, y: 38.7, s: 32, d: 7.9, dl: -1.7, r: -6, far: true },
  { img: '8e46bb62.webp', x: 96.8, y: 75.6, s: 32, d: 6.4, dl: -4.8, r: 8 },
  { img: '17fa6a98.webp', x: 3.2, y: 82.9, s: 34, d: 7.1, dl: -2.9, r: -7, far: true },
]
const CTA_ORBIT: Orb[] = ORBIT.slice(0, 6).map((o, i) => ({ ...o, far: false, s: 64, x: [9, 5, 9, 91, 95, 91][i], y: [26, 52, 78, 26, 52, 78][i] }))
const orbStyle = (o: Orb, i: number) =>
  `--x:${o.x}%;--y:${o.y}%;--s:${o.s};--d:${o.d}s;--dl:${o.dl}s;--r:${o.r}deg;--in:${i * 90}ms`

const SAY: Part[][] = [
  [{ t: 'Your chat already hands out awards.' }, { t: 'Every stream.', tag: 'em' }],
  [{ t: 'One account.' }, { t: 'One vote.', tag: 'em' }, { t: 'Every category.', tag: 'span' }],
  [{ t: 'Set it up tonight.' }, { t: 'Reveal it live.', tag: 'em' }],
]
// an interlude line, every word its own span so the scroll can lift it in and out of a blur
type Part = { t: string; tag?: string }
const wordsOf = (t: string) => t.split(' ').flatMap((w, i) => [i ? ' ' : '', h('span', { class: 'w' }, w)])
const SayLine: FunctionalComponent<{ parts: Part[] }> = ({ parts }) =>
  h('p', parts.flatMap((p, i) => [i ? ' ' : '', ...(p.tag ? [h(p.tag, wordsOf(p.t))] : wordsOf(p.t))]))
const pad = (i: number) => String(i + 1).padStart(2, '0')

const hero = ref<HTMLElement>()
const vis = ref<HTMLElement>()
const trophy = ref<HTMLCanvasElement>()
const dust = ref<HTMLCanvasElement>()
const band1 = ref<HTMLElement>()
const band2 = ref<HTMLElement>()
const tro2 = ref<HTMLCanvasElement>()
const tro3 = ref<HTMLCanvasElement>()
const steps = ref<HTMLOListElement>()
const pgdust = ref<HTMLCanvasElement>()
const root = ref<HTMLElement>()
const orbitIn = ref(false)

const stops: (() => void)[] = []
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function onScroll(fn: () => void) {
  let raf = 0
  const h = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fn() }) }
  addEventListener('scroll', h, { passive: true })
  addEventListener('resize', fn)
  stops.push(() => { removeEventListener('scroll', h); removeEventListener('resize', fn); cancelAnimationFrame(raf) })
  fn()
}

/* steps: focus follows the scroll */
function stepFocus() {
  const items = [...(steps.value?.children ?? [])] as HTMLElement[]
  const mid = innerHeight * 0.5
  let best: HTMLElement | null = null, bd = 1e9
  items.forEach((li) => { const r = li.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = li } })
  items.forEach((li) => li.classList.toggle('focus', li === best))
}

/* interludes: words rise in out of a blur as the line enters, and lift back into a blur as it leaves */
function interludes() {
  const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
  const vh = innerHeight
  root.value?.querySelectorAll<HTMLElement>('.say p').forEach((l) => {
    const r = l.getBoundingClientRect()
    if (r.bottom < -50 || r.top > vh + 50) return
    const ws = [...l.querySelectorAll<HTMLElement>('.w')], n = ws.length
    const e = cl((vh - r.top) / (vh * 0.5)), x = cl((vh * 0.32 - r.top) / (r.height * 1.25 + vh * 0.08))
    ws.forEach((w, i) => {
      const k = cl(e * 1.7 - (i / n) * 0.7), q0 = cl(x * 1.35 - (i / n) * 0.35), q = q0 * q0 * (3 - 2 * q0), a = k * (1 - q), b = Math.max(1 - k, q)
      w.style.opacity = a.toFixed(3)
      w.style.transform = `translateY(${((1 - k) * 0.45 - q * 0.45).toFixed(3)}em)`
      w.style.filter = b > 0 ? `blur(${(b * (k < 1 ? 8 : 6)).toFixed(1)}px)` : 'none'
    })
  })
}

/* warm dust rising through the gold band under the page preview */
function pageDust(c: HTMLCanvasElement, reduce: boolean) {
  const x = c.getContext('2d')
  if (!x) return () => {}
  let w = 0, h = 0, on = false, raf = 0, last = 0
  const fit = () => { const r = c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); w = r.width; h = r.height; c.width = w * d; c.height = h * d; x.setTransform(d, 0, 0, d, 0, 0) }
  const mk = (a: boolean) => ({ x: Math.random() * w, y: a ? Math.random() * h : h + 5, r: 0.5 + Math.random() * 1.6, v: 0.008 + Math.random() * 0.02, a: 0.15 + Math.random() * 0.5, p: Math.random() * 6.3 })
  fit()
  const ps = Array.from({ length: 90 }, () => mk(true))
  function draw(t: number) {
    const dt = last ? Math.min(50, t - last) : 16
    last = t
    x!.clearRect(0, 0, w, h)
    for (const m of ps) {
      m.y -= m.v * dt
      m.x += Math.sin(t * 0.0005 + m.p) * 0.15
      if (m.y < -5) Object.assign(m, mk(false))
      x!.globalAlpha = m.a * (m.y / h) * (0.6 + 0.4 * Math.sin(t * 0.002 + m.p))
      x!.beginPath()
      x!.arc(m.x, m.y, m.r, 0, 6.3)
      x!.fillStyle = '#ffe2aa'
      x!.fill()
    }
    if (on && !reduce) raf = requestAnimationFrame(draw)
  }
  addEventListener('resize', fit)
  const io = new IntersectionObserver((e) => { on = e[0].isIntersecting; cancelAnimationFrame(raf); last = 0; if (on) raf = requestAnimationFrame(draw) })
  io.observe(c)
  return () => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('resize', fit) }
}

function scrollPast() {
  const h = hero.value
  if (!h) return
  scrollTo({ top: h.getBoundingClientRect().bottom + scrollY, behavior: reduceMotion() ? 'auto' : 'smooth' })
}

onMounted(() => {
  const reduce = reduceMotion()
  if (hero.value && vis.value && trophy.value && dust.value && band1.value && band2.value && tro2.value && tro3.value) {
    stops.push(mountEnvelopeHero({
      hero: hero.value, vis: vis.value, trophy: trophy.value, dust: dust.value,
      copies: [{ canvas: tro2.value, band: band1.value }, { canvas: tro3.value, band: band2.value }],
    }, reduce))
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { orbitIn.value = true }))
  steps.value?.classList.add('scrolly')
  onScroll(stepFocus)
  if (!reduce) onScroll(interludes)
  if (pgdust.value) stops.push(pageDust(pgdust.value, reduce))
  // category rows pause while off screen
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('off', !e.isIntersecting)))
  root.value?.querySelectorAll('.marq').forEach((m) => io.observe(m))
  stops.push(() => io.disconnect())
})
onBeforeUnmount(() => stops.splice(0).forEach((f) => f()))
</script>

<template>
  <div ref="root" class="env-land">
    <section ref="hero" class="hero">
      <span class="beam" aria-hidden="true" /><canvas ref="dust" class="dust" aria-hidden="true" />
      <div class="shell hero-in">
        <h1>
          <span class="big"><span class="l1"><span class="kick">Awards Maker for streamers</span>Run your own</span><br><span class="gold">awards show</span></span>
        </h1>
        <p class="lead">
          Run your own streamer awards: pick the categories, nominate channels from Twitch, Kick and YouTube or your
          community's favorite meme, and let your viewers vote for every winner.
        </p>
        <div class="ctas">
          <NuxtLink class="btn p" to="/create">Create your awards</NuxtLink>
          <a class="btn" href="#ideas">Category ideas</a>
        </div>
        <div ref="vis" class="hero-vis" aria-hidden="true">
          <div class="trophy"><canvas ref="trophy" /></div>
          <div class="orbit" :class="{ in: orbitIn }">
            <span v-for="(o, i) in ORBIT" :key="o.img" class="oc" :class="[o.pf ? 'av' : 'em', o.far && 'far']" :style="orbStyle(o, i)">
              <img :src="envAsset(o.img)" alt="">
              <i v-if="o.pf" class="pb" :style="{ backgroundImage: `url(${envAsset(PF[o.pf])})` }" />
            </span>
          </div>
        </div>
      </div>
      <a class="scrollcue" href="#page" aria-label="Scroll to the next section" @click.prevent="scrollPast"><i aria-hidden="true" /></a>
    </section>

    <section class="shell figs" aria-label="Awards Maker in numbers">
      <div><b>{{ Object.keys(PLATFORM_NAMES).length }}</b><span>Platforms to nominate from</span></div>
      <div><b>{{ IDEA_TOTAL }}</b><span>Category ideas to start from</span></div>
      <div><b>{{ FREE.maxNominations }}</b><span>Categories free</span></div>
    </section>

    <section id="page" class="shell sec">
      <canvas ref="pgdust" class="pgdust" aria-hidden="true" /><span class="pgrays" aria-hidden="true" />
      <div class="sec-h">
        <h2>This is the page your awards get</h2>
        <p>Publishing gives you a page like this one: your categories and nominees, a countdown to the end of voting, and the winners once you announce them. It stays online after the show.</p>
      </div>
      <div class="halo-wrap">
        <span class="halo" aria-hidden="true" />
        <figure class="browser" style="margin-inline: 0">
          <div class="bb" aria-hidden="true"><i /><i /><i /><span>awards.streamscharts.com/a/night-owl-awards-2026</span></div>
          <div class="pv2">
            <div class="ap-hero pv2-hero">
              <div class="ap-intro">
                <span class="ap-hostchip"><span class="av hc-av">NO<i class="hc-pf pf tw" aria-label="Twitch" /></span><span><small class="org">Organized by</small><b>nightowl_tv</b></span></span>
                <p class="ap-pvh">Night Owl Awards 2026</p>
                <div class="ap-ctas"><span class="btn sm p" aria-hidden="true">Start voting</span></div>
              </div>
              <aside class="ap-status">
                <span class="state">Voting open</span>
                <p class="ap-cd-l">Voting closes in</p>
                <div class="ap-cd"><span><b>4</b><small>days</small></span><span><b>11</b><small>hours</small></span><span><b>38</b><small>min</small></span></div>
              </aside>
            </div>
            <div class="pv2-cat">
              <div class="ap-cat-h"><h3><small>Category 1 of 6</small>Streamer of the Year</h3><span class="lbl ok">Picked</span></div>
              <div class="ap-noms pv2-static" aria-hidden="true">
                <div class="ap-nom" aria-checked="false"><span class="ap-media pers"><img class="pv2-av" :src="envAsset('12017f8d.jpg')" alt=""></span><span class="ap-nm"><b>kaicenat</b><span><span class="pf tw">Twitch</span></span></span><span class="tick" /></div>
                <div class="ap-nom" aria-checked="true"><span class="ap-media pers"><img class="pv2-av" :src="envAsset('d284349b.jpg')" alt=""></span><span class="ap-nm"><b>IShowSpeed</b><span><span class="pf yt">YouTube</span></span></span><span class="tick" /></div>
                <div class="ap-nom" aria-checked="false"><span class="ap-media pers"><img class="pv2-av" :src="envAsset('6dd72bd0.jpg')" alt=""></span><span class="ap-nm"><b>xQc</b><span><span class="pf kk">Kick</span></span></span><span class="tick" /></div>
                <div class="ap-nom" aria-checked="false"><span class="ap-media pers"><img class="pv2-av" :src="envAsset('1e2fab6a.jpg')" alt=""></span><span class="ap-nm"><b>pokimane</b><span><span class="pf tw">Twitch</span></span></span><span class="tick" /></div>
              </div>
            </div>
          </div>
        </figure>
      </div>
    </section>

    <section class="shell say" aria-label="Interlude">
      <SayLine :parts="SAY[0]" />
    </section>

    <section id="how" class="shell sec">
      <div class="sec-h"><h2>Create your awards in three steps</h2><p /></div>
      <ol ref="steps" class="steps" style="margin: 0; padding: 0">
        <li>
          <div class="sv" aria-hidden="true"><div class="sv-field"><small>Category 02</small>Clip of the Year<i /></div><div class="sv-noms"><span><em class="pf tw" />nightowl_tv</span><span><em class="pf kk" />mira_plays</span><span class="add">+ The 3am raid</span></div></div>
          <span class="n"><i class="si si1" aria-hidden="true" /><b class="sl">Step 1</b></span>
          <div class="st"><h3>Add categories and nominees</h3><p>Name your awards and add up to {{ FREE.maxNominations }} categories. For each one, search the Streams Charts database for a channel or type a nominee in by hand, whether that’s a mod, a clip title or a running joke.</p></div>
        </li>
        <li>
          <div class="sv" aria-hidden="true"><div class="sv-link"><span>awards.streamscharts.com/a/night-owl</span><b>Copied</b></div><div class="sv-card"><small>Night Owl Awards 2026</small><b>Vote for the winners</b><span>6 categories · closes 12 Dec</span></div></div>
          <span class="n"><i class="si si2" aria-hidden="true" /><b class="sl">Step 2</b></span>
          <div class="st"><h3>Publish and share the link</h3><p>Publishing gives your awards its own page. Copy the link into chat or post it to X - the preview card comes with it.</p></div>
        </li>
        <li>
          <div class="sv" aria-hidden="true"><div class="sv-toggle"><span>Voting</span><em>Closed</em></div><div class="sv-win sv-win2"><span class="cm sv-av avw"><span class="av" style="background: #7a3b2e">VI</span><span class="ap-pf tw" /></span><small>Streamer of the Year</small><b>vika_plays</b><div class="sv-bar"><i /></div><span>612 of 1 284 votes · 47.6%</span></div></div>
          <span class="n"><i class="si si3" aria-hidden="true" /><b class="sl">Step 3</b></span>
          <div class="st"><h3>Close voting and announce the winners</h3><p>Voting ends on the date you set or earlier if you close it yourself, and once you’ve announced the winners on stream, you publish the results so the page matches what chat just heard.</p></div>
        </li>
      </ol>
    </section>

    <section id="voting" class="shell sec">
      <div class="sec-h"><h2>Let your viewers vote for every winner</h2><p>Three taps from a shared link to a counted vote.</p></div>
      <div class="flow">
        <div>
          <div class="vis chatbox">
            <div style="display: flex; justify-content: space-between" class="lbl"><span>Stream chat</span><span>1 284 watching</span></div>
            <p><b style="color: #7fcdae">mod_kira</b> link is pinned, go vote</p>
            <p><b style="color: #b2a8f5">pixelgoblin</b> voted 👀</p>
            <p><b style="color: #e39a84">lurker_2006</b> who's in clip of the year</p>
            <div class="pin">Pinned: vote in Chat Awards 2026 ↗</div>
          </div>
          <h3>The link goes wherever your viewers are</h3><p>No account needed to look at the nominees.</p>
        </div>
        <div>
          <div class="vis">
            <p class="lbl">Best moment of the year</p>
            <span class="opt"><span class="av" style="background: #3f3a6e">IS</span>ishowspeed</span>
            <span class="opt on"><span class="av" style="background: #7a3b2e">MA</span>maryana</span>
            <span class="opt"><span class="av" style="background: #4c5a2e">3A</span>The 3am raid</span>
          </div>
          <h3>One pick per category</h3><p>Choosing comes first, nothing blocks it.</p>
        </div>
        <div>
          <div class="vis" style="align-content: center; justify-items: center; text-align: center">
            <span class="btn tw" style="pointer-events: none">Sign in with Twitch or Kick</span>
            <p class="lbl">Asked once, at submit</p>
            <p class="lbl" style="color: var(--e-brass-hi)">1 vote per category</p>
          </div>
          <h3>The vote is counted</h3><p>Tied to a real account, so the result holds up.</p>
        </div>
      </div>
    </section>

    <section ref="band1" class="say-band" aria-label="Interlude">
      <div class="shell say r"><div class="say-in"><span class="beam2" aria-hidden="true" /><canvas ref="tro2" class="tro2" aria-hidden="true" />
        <SayLine :parts="SAY[1]" />
      </div></div>
    </section>

    <section class="shell sec">
      <div class="sec-h"><h2>Run your own streamer awards for your community</h2><p>You bring the categories and the community. Everything else is here.</p></div>
      <div class="feat">
        <div>
          <h3>Nominate any channel, or type in anything</h3><p>Every channel we track, or plain text when the nominee is a mod, a clip or a running joke.</p>
          <div class="demo">
            <div class="search"><i class="sico" aria-hidden="true" />xq</div>
            <div class="res"><img class="rav" :src="envAsset('364af4cc.jpg')" alt=""><span class="pf tw" /><span>xQc</span><span>Twitch</span></div>
            <div class="res"><img class="rav" :src="envAsset('1edd62a5.jpg')" alt=""><span class="pf kk" /><span>xqc</span><span>Kick</span></div>
            <div class="res"><img class="rav" :src="envAsset('a76f46db.jpg')" alt=""><span class="pf yt" /><span>xQcOW</span><span>YouTube</span></div>
            <div class="res" style="color: var(--e-brass-hi)">+ Add "the 3am raid" as text</div>
          </div>
        </div>
        <div>
          <h3>One account, one vote per category</h3><p>Always on, never a setting you can turn off.</p>
          <div class="demo">
            <div class="vote-line"><i class="vt" aria-hidden="true" />Best moment<span>1 / 1</span></div>
            <div class="vote-line"><i class="vt" aria-hidden="true" />Mod MVP<span>1 / 1</span></div>
            <div class="vote-line"><i class="vt" aria-hidden="true" />Best emote<span>1 / 1</span></div>
            <p class="lbl" style="margin-top: 4px">A second vote from the same account is refused</p>
          </div>
        </div>
        <div>
          <h3>Share nominees and winners with your community</h3><p>Every awards page carries its own preview image, so a link in chat or on X shows the show, not a bare URL.</p>
          <div class="demo share">
            <div><img class="sh-av" :src="envAsset('8ed9948a.jpg')" alt=""><small>Nominated</small><b>pokimane</b><span class="sh-m">Best moment</span></div>
            <div><img class="sh-av" :src="envAsset('03cc58a8.jpg')" alt=""><small>Winner</small><b>IShowSpeed</b><span class="sh-m">612 votes</span></div>
          </div>
        </div>
      </div>
    </section>

    <section id="ideas" class="shell sec">
      <div class="sec-h">
        <h2>End of year awards category ideas</h2>
        <div class="sec-sub"><p>Stuck? Here are all {{ IDEA_TOTAL }}, in {{ IDEA_GROUPS.length }} groups. <NuxtLink class="link" to="/ideas">See them with notes</NuxtLink></p></div>
      </div>
      <div class="ideas">
        <div v-for="(g, gi) in IDEA_GROUPS" :key="g.id">
          <h3>{{ g.title }}</h3>
          <div class="marq" :class="gi % 2 && 'rev'">
            <div class="track">
              <div v-for="copy in 2" :key="copy" class="set" :aria-hidden="copy === 2 || undefined"><span v-for="it in g.items" :key="it">{{ it }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section ref="band2" class="say-band say-band2" aria-label="Interlude">
      <div class="shell say r"><div class="say-in"><span class="beam2" aria-hidden="true" /><canvas ref="tro3" class="tro2" aria-hidden="true" />
        <SayLine :parts="SAY[2]" />
      </div></div>
    </section>

    <section id="plans" class="shell sec">
      <div class="sec-h"><h2>Free, paid, or we run it</h2><p>Start free. Pay once if the show needs more.</p></div>
      <div class="plans">
        <div v-for="p in PLANS" :key="p.id" :class="p.featured && 'feat-p'">
          <h3>{{ p.name }}<small v-if="p.featured">Most picked</small></h3>
          <div class="price">{{ p.price }}</div>
          <p class="per">{{ p.per }}</p>
          <ul><li v-for="f in p.features" :key="f">{{ f }}</li></ul>
          <NuxtLink v-if="p.cta.to.startsWith('/')" class="btn" :class="p.cta.variant === 'primary' && 'p'" :to="p.cta.to">{{ p.cta.label }}</NuxtLink>
          <a v-else class="btn" :href="p.cta.to">{{ p.cta.label }}</a>
        </div>
      </div>
      <div style="margin-top: 28px; text-align: center"><NuxtLink class="link" to="/plans">Compare the plans</NuxtLink></div>
    </section>

    <section class="shell">
      <div class="cta">
        <div class="cta-orbit orbit in" aria-hidden="true">
          <span v-for="(o, i) in CTA_ORBIT" :key="o.img" class="oc av" :style="orbStyle(o, i)">
            <img :src="envAsset(o.img)" alt=""><i class="pb" :style="{ backgroundImage: `url(${envAsset(PF[o.pf!])})` }" />
          </span>
        </div>
        <h2>Your viewers already<br>have <span>favorites</span></h2>
        <p>Give them a vote. Setup takes a few minutes, and the free plan covers a first season.</p>
        <NuxtLink class="btn p" to="/create">Create your awards</NuxtLink>
      </div>
    </section>

    <section id="faq" class="shell sec">
      <div class="sec-h"><h2>FAQ</h2><p /></div>
      <div class="faq">
        <details v-for="(f, i) in faq" :key="f.q">
          <summary><small>{{ pad(i) }}</small>{{ f.q }}</summary>
          <p>{{ f.a }} <a v-if="f.link" class="link" :href="f.link.href">{{ f.link.text }}</a></p>
        </details>
      </div>
    </section>
  </div>
</template>
