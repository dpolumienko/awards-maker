<script setup lang="ts">
// The Categories step as Ed's prototype draws it (2026-10-22): a card per
// category - number, title, remove - its nominees as chips, one search for
// channels, the host's Twitch mods and channel emotes, and the image-or-clip
// panel. Same draft, same rules as the colleague's NominationCard; only the
// markup and the styles are the prototype's (assets/css/envelope-cr.css).
import { avatarFallback, channelAvatar } from '~/utils/nominee'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { Channel, Nomination, Nominee } from '~/types/award'
import { FREE } from '~/types/award'
import { searchChannels, fmtFollowers } from '~/data/channels.mock'
import { ImageError, fileToStoredImage } from '~/utils/image'
import { useAwardDraft } from '~/composables/useAwardDraft'

const { draft, addNomination, removeNomination, addNominee, removeNominee } = useAwardDraft()
const emit = defineEmits<{ added: [] }>()

type Tab = 'ch' | 'mods' | 'emo'
const MODS = ['mod_kira', 'sleepymod', 'timeout_tina', 'banhammer_bo', 'lurk_patrol', 'quiet_quinn']
const EMOTES = [['Kappa', 'kappa'], ['LUL', 'lul'], ['PogChamp', 'pogchamp'], ['Kreygasm', 'kreygasm'], ['NotLikeThis', 'notlikethis'], ['SeemsGood', 'seemsgood']].map(([n, f]) => ({ name: n!, src: `/img/emotes/twitch-${f}.png` }))
const PF = { twitch: 'tw', kick: 'kk', youtube: 'yt' } as const

interface UiState { q: string; open: boolean; act: number; tab: Tab | null; found: Channel[]; m: null | { nm: string; link: string; file: string; image: string; err: string } }
const ui = reactive<Record<string, UiState>>({})
const st = (n: Nomination) => (ui[n.id] ??= { q: '', open: false, act: -1, tab: null, found: [], m: null })
const autoTab = (n: Nomination): Tab => (/emote/i.test(n.title) ? 'emo' : /\bmods?\b|moderator/i.test(n.title) ? 'mods' : 'ch')
// a category holds either people (channels, mods) or emotes, never both
const isEmo = (x: Nominee) => x.kind === 'media' && EMOTES.some((e) => e.name === x.text)
const locked = (n: Nomination): Tab[] => (n.nominees.some(isEmo) ? ['ch', 'mods'] : n.nominees.some((x) => x.kind !== 'media') ? ['emo'] : [])
const tabOf = (n: Nomination): Tab => {
  const t = st(n).tab ?? autoTab(n), l = locked(n)
  return !l.includes(t) ? t : l.includes('emo') ? 'ch' : 'emo'
}

const used = computed(() => draft.value.nominations.length)
const nameOf = (x: Nominee) => (x.kind === 'channel' ? x.channel.name : x.text)
const has = (n: Nomination, name: string) => n.nominees.some((x) => nameOf(x).toLowerCase() === name.toLowerCase())

// channel search: the server when there is one, the sample list in the demo
const timers: Record<string, ReturnType<typeof setTimeout>> = {}
function search(n: Nomination) {
  const s = st(n), term = s.q.trim()
  clearTimeout(timers[n.id])
  if (term.length < 2) return (s.found = [])
  timers[n.id] = setTimeout(async () => {
    let found: Channel[]
    try {
      found = (await $fetch<{ channels: Channel[] }>('/api/channels/search', { query: { q: term } })).channels
    } catch {
      found = searchChannels(term)
    }
    if (s.q.trim() === term) s.found = found
  }, 200)
}
type Item = { kind: 'ch'; c: Channel } | { kind: 'mod'; name: string } | { kind: 'emo'; name: string; src: string }
function items(n: Nomination): Item[] {
  const s = st(n), q = s.q.trim().toLowerCase(), t = tabOf(n)
  if (t === 'mods') return MODS.filter((m) => !has(n, m) && (!q || m.includes(q))).map((name) => ({ kind: 'mod', name }))
  if (t === 'emo') return EMOTES.filter((e) => !has(n, e.name) && (!q || e.name.toLowerCase().includes(q))).map((e) => ({ kind: 'emo', ...e }))
  return s.found.filter((c) => !has(n, c.name)).map((c) => ({ kind: 'ch', c }))
}
function take(n: Nomination, it: Item) {
  if (it.kind === 'ch') addNominee(n.id, { kind: 'channel', channel: it.c })
  else if (it.kind === 'mod') addNominee(n.id, { kind: 'text', text: it.name })
  else addNominee(n.id, { kind: 'media', text: it.name, image: asset(it.src) })
  const s = st(n)
  s.q = ''
  s.found = []
  s.act = -1
  s.open = false
}
function addText(n: Nomination) {
  const s = st(n), t = s.q.trim()
  if (!t) return
  addNominee(n.id, { kind: 'text', text: t })
  s.q = ''
  s.found = []
  s.open = false
}
function onKey(e: KeyboardEvent, n: Nomination) {
  const s = st(n), list = items(n), free = tabOf(n) !== 'ch', max = list.length + (free && s.q.trim() ? 1 : 0) - 1
  if (e.key === 'ArrowDown') { e.preventDefault(); s.open = true; s.act = Math.min(max, s.act + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); s.act = Math.max(-1, s.act - 1) }
  else if (e.key === 'Escape') s.open = false
  else if (e.key === 'Enter') {
    e.preventDefault()
    if (s.act >= 0 && list[s.act]) take(n, list[s.act]!)
    else if (free && s.act === list.length && s.q.trim()) addText(n)
    else if (list.length === 1) take(n, list[0]!)
    else if (free) addText(n)
  }
}
function openTab(n: Nomination, t: Tab) {
  const s = st(n)
  s.tab = t
  s.act = -1
  s.open = true
  nextTick(() => document.querySelector<HTMLInputElement>(`[data-nom="${n.id}"] [data-q]`)?.focus())
}
function onBlur(n: Nomination) {
  setTimeout(() => {
    if (!document.activeElement?.closest(`[data-nom="${n.id}"] .cr-search`)) st(n).open = false
  }, 120)
}

async function add() {
  addNomination()
  emit('added')
  await nextTick()
  const last = draft.value.nominations[draft.value.nominations.length - 1]
  if (last) document.querySelector<HTMLInputElement>(`[data-nom="${last.id}"] [data-title]`)?.focus()
}
watch(() => draft.value.nominations.map((n) => n.id).join(), () => {})

// image or clip nominee
function openMedia(n: Nomination) {
  st(n).m = { nm: '', link: '', file: '', image: '', err: '' }
  nextTick(() => document.querySelector<HTMLInputElement>(`[data-nom="${n.id}"] [data-mname]`)?.focus())
}
async function takeFile(n: Nomination, e: Event) {
  const m = st(n).m, input = e.target as HTMLInputElement, f = input.files?.[0]
  if (!m || !f) return
  m.err = ''
  if (!f.type.startsWith('image/')) return (m.err = 'That is not an image. A clip goes in the link field instead.')
  if (f.size > 5 * 1024 * 1024) return (m.err = `That file is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`)
  try {
    m.image = await fileToStoredImage(f, 1200)
    m.file = f.name
  } catch (err) {
    m.err = err instanceof ImageError ? err.message : 'That image could not be read. Try a PNG or a JPG.'
  }
  input.value = ''
}
function addMedia(n: Nomination) {
  const m = st(n).m
  if (!m || !m.nm.trim() || !(m.image || m.link.trim())) return
  addNominee(n.id, { kind: 'media', text: m.nm.trim(), url: m.link.trim() || undefined, image: m.image || undefined })
  st(n).m = null
}
const sub = (x: Nominee) =>
  x.kind === 'channel' ? (x.channel.followers ? `${fmtFollowers(x.channel.followers)}` : '') : x.kind === 'media' ? (x.image && !x.url ? 'Image · Paid' : 'Clip · Paid') : 'Text'
</script>

<template>
  <section class="cr-sec" id="nominations" data-check="nominations" aria-labelledby="crn-h">
    <span data-check="nominees" class="sr-only" />
    <div class="cr-sec-h">
      <div>
        <h2 id="crn-h">Categories<span class="cr-count" :class="used > FREE.maxNominations && 'over'">{{ used > FREE.maxNominations ? `${used} categories · ${used - FREE.maxNominations} paid` : `${used} of ${FREE.maxNominations} free` }}</span></h2>
        <p>At least two nominees in each. Any channel we track, or plain text for a mod, a clip or a running joke.</p>
      </div>
    </div>
    <div class="cr-noms">
      <div v-for="(n, i) in draft.nominations" :key="n.id" class="cr-nom" :data-nom="n.id">
        <span v-if="i >= FREE.maxNominations" class="cr-paidline">Paid · beyond the free {{ FREE.maxNominations }} categories</span>
        <div class="cr-nom-h">
          <span>{{ i + 1 }}</span>
          <input type="text" data-title :value="n.title" :aria-label="`Category ${i + 1} title`" placeholder="Category title, e.g. Best moment of the year" @input="n.title = ($event.target as HTMLInputElement).value" />
          <button class="cr-x" type="button" :aria-label="`Remove category ${i + 1}`" @click="removeNomination(n.id)" />
        </div>
        <div v-if="n.nominees.length" class="cr-chips">
          <span v-for="x in n.nominees" :key="x.id" class="cr-chip2">
            <img v-if="x.kind === 'channel'" class="av" :src="channelAvatar(x.channel)" alt="" @error="avatarFallback($event, x.channel.name)" />
            <span v-else-if="x.kind === 'media' && x.image" class="av emo"><img :src="x.image" alt="" /></span>
            <span v-else class="av" :style="{ background: 'var(--c-s3)' }">{{ x.kind === 'media' ? '▶' : x.kind === 'channel' ? x.channel.name.slice(0, 2).toUpperCase() : 'Aa' }}</span>
            <span v-if="x.kind === 'channel'" class="pf" :class="PF[x.channel.platform]" />
            {{ nameOf(x) }}<small>{{ sub(x) }}</small>
            <button class="cr-x" type="button" :aria-label="`Remove ${nameOf(x)}`" @click="removeNominee(n.id, x.id)" />
          </span>
        </div>
        <div class="cr-search" @focusout="onBlur(n)">
          <i class="sico" aria-hidden="true" />
          <input
            v-model="st(n).q"
            type="text"
            data-q
            role="combobox"
            :aria-expanded="st(n).open"
            aria-label="Search a channel or type a nominee"
            placeholder="Search a channel, or type any nominee"
            autocomplete="off"
            @input="st(n).open = true; st(n).act = -1; search(n)"
            @focus="st(n).open = true"
            @keydown="onKey($event, n)"
          />
          <ul v-if="st(n).open" class="cr-res" :class="tabOf(n) === 'emo' && 'is-emo'" role="listbox">
            <li class="tabs" role="presentation">
              <button v-for="[k, l] in ([['ch', 'Channels'], ['mods', 'Twitch mods'], ['emo', 'Twitch emotes']] as const)" :key="k" type="button" :aria-pressed="tabOf(n) === k" :disabled="locked(n).includes(k)" :title="locked(n).includes(k) ? (k === 'emo' ? 'This category already has channels' : 'This category already has emotes') : undefined" @mousedown.prevent="!locked(n).includes(k) && openTab(n, k)">{{ l }}</button>
            </li>
            <li class="hd" aria-hidden="true">{{ { ch: 'Channels on Twitch, Kick and YouTube', mods: 'Your Twitch moderators', emo: 'Your Twitch channel emotes' }[tabOf(n)] }}</li>
            <li v-if="tabOf(n) === 'emo'" class="emo-grid" role="presentation">
              <button v-for="(it, k) in items(n)" :key="k" type="button" role="option" class="emo-o" :aria-selected="st(n).act === k" @mousedown.prevent="take(n, it)">
                <img :src="asset((it as { src: string }).src)" alt="" />{{ (it as { name: string }).name }}
              </button>
              <span v-if="!items(n).length" class="emo-none">No emote with that name</span>
            </li>
            <template v-else>
              <li v-for="(it, k) in items(n)" :key="k" role="option" :aria-selected="st(n).act === k" @mousedown.prevent="take(n, it)" @mouseenter="st(n).act = k">
                <template v-if="it.kind === 'ch'">
                  <img class="av" :src="channelAvatar(it.c)" alt="" @error="avatarFallback($event, it.c.name)" />
                  <span class="pf" :class="PF[it.c.platform]" />{{ it.c.name }}<small v-if="it.c.followers">{{ fmtFollowers(it.c.followers) }} followers</small>
                </template>
                <template v-else-if="it.kind === 'mod'">
                  <span class="av" :style="{ background: 'var(--c-s3)' }">{{ it.name.slice(0, 2).toUpperCase() }}</span>{{ it.name }}<small>Twitch</small>
                </template>
              </li>
              <li v-if="tabOf(n) === 'ch' && st(n).q.trim().length >= 2 && !items(n).length" class="hd">No such channel on Twitch, Kick or YouTube</li>
            </template>
            <!-- a typed name is a text nominee only off the Channels tab: a channel has to be one
                 the search found (Ed, 2026-10-22: nothing that does not exist can be nominated) -->
            <li v-if="st(n).q.trim() && tabOf(n) !== 'ch'" role="option" class="add" :aria-selected="st(n).act === items(n).length" @mousedown.prevent="addText(n)">+ Add "{{ st(n).q.trim() }}" as a text nominee</li>
          </ul>
        </div>
        <button v-if="!st(n).open && autoTab(n) !== 'ch'" class="cr-sugg" type="button" @click="openTab(n, autoTab(n))">
          <span class="cr-sugg-i">
            <template v-if="autoTab(n) === 'emo'"><img v-for="e in EMOTES.slice(0, 3)" :key="e.name" :src="asset(e.src)" alt="" /></template>
            <template v-else><i v-for="m in MODS.slice(0, 3)" :key="m" /></template>
          </span>
          {{ autoTab(n) === 'emo' ? 'Pick from your Twitch emotes' : 'Pick from your Twitch mods' }}
        </button>

        <div v-if="st(n).m" class="md-p" role="group" aria-label="Image or clip nominee" @keydown.esc="st(n).m = null">
          <div class="md-h"><b>Image or clip nominee</b><span class="cr-paidline">Paid</span></div>
          <label class="md-f">
            <span class="md-lw"><span class="md-l">Name on the page</span><small>Viewers see this under the nominee, for a clip and for an image alike.</small></span>
            <input v-model="st(n).m!.nm" type="text" data-mname placeholder="The 3am raid" />
          </label>
          <div class="md-src">
            <div class="md-f">
              <span class="md-lw"><span class="md-l">Upload an image</span><small>PNG or JPG, up to 5 MB.</small></span>
              <label class="md-drop" :class="st(n).m!.file && 'has'">
                <input type="file" accept="image/png,image/jpeg" @change="takeFile(n, $event)" />
                <i class="md-ic up" /><b>{{ st(n).m!.file || 'Drop a file or browse' }}</b><small v-if="st(n).m!.file">Click to replace</small>
              </label>
            </div>
            <span class="md-or">or</span>
            <label class="md-f">
              <span class="md-lw"><span class="md-l">Paste a clip link</span><small>A Twitch clip, a YouTube video, or an image already online.</small></span>
              <span class="md-in"><i class="md-ic ln" /><input v-model="st(n).m!.link" type="url" placeholder="https://clips.twitch.tv/..." /></span>
            </label>
          </div>
          <p v-if="st(n).m!.err" class="md-err" role="alert">{{ st(n).m!.err }}</p>
          <div class="md-foot">
            <button class="btn sm p" type="button" :disabled="!(st(n).m!.nm.trim() && (st(n).m!.image || st(n).m!.link.trim()))" @click="addMedia(n)">Add nominee</button>
            <button class="link md-x" type="button" @click="st(n).m = null">Cancel</button>
          </div>
        </div>
        <button v-else class="link cr-media" type="button" @click="openMedia(n)"><span class="cr-media-t">+ Image or clip nominee</span><span class="cr-paidline">Paid</span></button>
      </div>
    </div>
    <button class="btn sm" type="button" @click="add">Add category</button>
    <div v-if="used > FREE.maxNominations" class="cr-pay"><b>The {{ FREE.maxNominations + 1 }}th category starts the paid tier.</b><span>$50 once per awards, no subscription. Keep building: you choose at publish.</span></div>
  </section>
</template>
