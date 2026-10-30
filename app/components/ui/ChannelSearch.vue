<script setup lang="ts">
// Combobox over the Streams Charts channel base (server/api/channels/search.get.ts;
// sample channels until the API keys are set). Keyboard first: arrows move,
// Enter picks, Esc closes - WCAG 4.1.2 / 2.1.1.
import { channelAvatar, avatarFallback } from '~/utils/nominee'
import { computed, ref, useId, watch } from 'vue'
import PlatformDot from './PlatformDot.vue'
import LivePill from './LivePill.vue'
import { searchChannels, fmtFollowers } from '~/data/channels.mock'
import type { Channel } from '~/types/award'
import UiMaskIcon from './UiMaskIcon.vue'

const emit = defineEmits<{ pick: [Channel]; pickText: [string]; pickMedia: [{ text: string; image: string }] }>()
// Envelope (Ed's prototype, 2026-10-22): the list also offers the host's own Twitch
// moderators and channel emotes, and opens on them when the category asks for one.
// Twitch gives both to a signed-in host (Get Moderators needs moderation:read;
// channel emotes need only the app token). Sample data until that is wired.
const { env = false, title = '' } = defineProps<{ env?: boolean; title?: string }>()
type Tab = 'ch' | 'mods' | 'emo'
const MODS = ['mod_kira', 'sleepymod', 'timeout_tina', 'banhammer_bo', 'lurk_patrol', 'quiet_quinn']
const EMOTES = [['Kappa', 'kappa'], ['LUL', 'lul'], ['PogChamp', 'pogchamp'], ['Kreygasm', 'kreygasm'], ['NotLikeThis', 'notlikethis'], ['SeemsGood', 'seemsgood']].map(([n, f]) => ({ name: n!, src: asset(`/img/emotes/twitch-${f}.png`) }))
const autoTab = computed<Tab>(() => (/emote/i.test(title) ? 'emo' : /mods?|moderator/i.test(title) ? 'mods' : 'ch'))
const chosen = ref<Tab | null>(null)
const tab = computed<Tab>(() => chosen.value ?? autoTab.value)
const mods = computed(() => MODS.filter((m) => !q.value.trim() || m.includes(q.value.trim().toLowerCase())))
const emotes = computed(() => EMOTES.filter((e) => !q.value.trim() || e.name.toLowerCase().includes(q.value.trim().toLowerCase())))
function pickMod(m: string) {
  emit('pickText', m)
  q.value = ''
  open.value = false
}
function pickEmote(e: { name: string; src: string }) {
  emit('pickMedia', { text: e.name, image: e.src })
  q.value = ''
  open.value = false
}
const input = ref<HTMLInputElement | null>(null)
function openTab(t: Tab) {
  chosen.value = t
  active.value = -1
  open.value = true
  input.value?.focus()
}

const id = useId()
const q = ref('')
const open = ref(false)
const active = ref(-1)
const results = ref<Channel[]>([])
const searching = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
let seq = 0
// asked once the typing pauses; a page with no server behind it (the static
// demo) searches the sample list in the browser instead
watch(q, (v) => {
  if (timer) clearTimeout(timer)
  const term = v.trim()
  if (term.length < 2) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(async () => {
    const mine = ++seq
    let found: Channel[]
    try {
      found = (await $fetch<{ channels: Channel[] }>('/api/channels/search', { query: { q: term } })).channels
    } catch {
      found = searchChannels(term)
    }
    if (mine !== seq) return
    results.value = found
    searching.value = false
  }, 250)
})
const canAddText = computed(() => q.value.trim().length >= 2)

function choose(c: Channel) {
  emit('pick', c)
  q.value = ''
  open.value = false
}
function chooseText() {
  if (!canAddText.value) return
  emit('pickText', q.value.trim())
  q.value = ''
  open.value = false
}
function onKey(e: KeyboardEvent) {
  if (env && tab.value !== 'ch') {
    const list = tab.value === 'mods' ? mods.value : emotes.value
    if (e.key === 'Escape') open.value = false
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); open.value = true; active.value = list.length ? (active.value + 1) % list.length : -1 }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); active.value = list.length ? (active.value <= 0 ? list.length - 1 : active.value - 1) : -1 }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const i = active.value >= 0 ? active.value : 0
      if (tab.value === 'mods' && mods.value[i]) pickMod(mods.value[i]!)
      else if (tab.value === 'emo' && emotes.value[i]) pickEmote(emotes.value[i]!)
      else chooseText()
    }
    return
  }
  const total = results.value.length + (canAddText.value ? 1 : 0)
  if (e.key === 'Escape') {
    open.value = false
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    open.value = true
    active.value = total ? (active.value + 1) % total : -1
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = total ? (active.value <= 0 ? total - 1 : active.value - 1) : -1
  } else if (e.key === 'Enter') {
    e.preventDefault()
    // nothing highlighted yet: Enter takes the first match, then the text option
    const c = results.value[active.value >= 0 ? active.value : 0]
    if (c) choose(c)
    else chooseText()
  }
}
</script>

<template>
  <div class="relative">
    <label :for="id" class="sr-only">Search a channel or type a nominee</label>
    <input
      :id="id"
      ref="input"
      v-model="q"
      type="text"
      role="combobox"
      aria-expanded="true"
      :aria-controls="id + '-list'"
      :aria-activedescendant="open && active >= 0 && results.length ? id + '-opt-' + active : undefined"
      autocomplete="off"
      placeholder="Search a channel, or type any nominee"
      class="h-12 w-full rounded-btn border border-hair bg-s2 px-4 text-base text-ink transition-colors placeholder:text-ink-disabled hover:border-hair2 focus:border-gold focus:shadow-focus focus:outline-none"
      @focus="open = true"
      @input="open = true; active = -1"
      @keydown="onKey"
      @blur="open = false"
    />

    <!-- Envelope: the category asks for mods or emotes - say where to find them -->
    <button v-if="env && !open && autoTab !== 'ch'" type="button" class="ecs-sugg" @click="openTab(autoTab)">
      <span class="ecs-sugg-i" aria-hidden="true">
        <template v-if="autoTab === 'emo'"><img v-for="e in EMOTES.slice(0, 3)" :key="e.name" :src="e.src" alt="" /></template>
        <template v-else><i v-for="m in MODS.slice(0, 3)" :key="m">{{ m.slice(0, 2).toUpperCase() }}</i></template>
      </span>
      {{ autoTab === 'emo' ? 'Pick from your Twitch emotes' : 'Pick from your Twitch mods' }}
    </button>

    <ul
      v-if="env && open && tab !== 'ch'"
      :id="id + '-list'"
      role="listbox"
      class="ecs-list absolute z-20 mt-2 w-full list-none overflow-hidden rounded-card bg-s2 p-1 shadow-modal"
    >
      <li class="ecs-tabs" role="presentation">
        <button v-for="[k, l] in ([['ch', 'Channels'], ['mods', 'Twitch mods'], ['emo', 'Twitch emotes']] as const)" :key="k" type="button" :aria-pressed="tab === k" @mousedown.prevent="openTab(k)">{{ l }}</button>
      </li>
      <li class="micro px-3 pb-1 pt-2" aria-hidden="true">{{ tab === 'mods' ? 'Your Twitch moderators' : 'Your Twitch channel emotes' }}</li>
      <template v-if="tab === 'mods'">
        <li
          v-for="(m, i) in mods"
          :key="m"
          role="option"
          :aria-selected="i === active"
          class="flex h-12 cursor-pointer items-center gap-3 rounded-btn px-3 text-sm"
          :class="i === active ? 'bg-s3' : 'hover:bg-s3'"
          @mousedown.prevent="pickMod(m)"
          @mouseenter="active = i"
        >
          <span aria-hidden="true" class="grid h-8 w-8 flex-none place-items-center rounded-pill bg-s1 text-xs font-bold text-ink-muted">{{ m.slice(0, 2).toUpperCase() }}</span>
          <span class="font-semibold">{{ m }}</span>
          <i class="ecs-pf tw" aria-hidden="true" />
        </li>
      </template>
      <li v-else class="ecs-emo" role="presentation">
        <button
          v-for="(e, i) in emotes"
          :key="e.name"
          type="button"
          role="option"
          :aria-selected="i === active"
          @mousedown.prevent="pickEmote(e)"
          @mouseenter="active = i"
        ><img :src="e.src" alt="" />{{ e.name }}</button>
        <span v-if="!emotes.length" class="text-sm text-ink-muted">No emote with that name</span>
      </li>
      <li
        v-if="canAddText"
        role="option"
        class="flex h-12 cursor-pointer items-center gap-3 rounded-btn px-3 text-sm text-ink-2 hover:bg-s3"
        @mousedown.prevent="chooseText"
      >
        <span aria-hidden="true" class="grid h-8 w-8 flex-none place-items-center rounded-pill border border-hair2">+</span>
        Add "{{ q.trim() }}" as a text nominee
      </li>
    </ul>

    <ul
      v-else-if="open && (env || results.length || canAddText || searching)"
      :id="id + '-list'"
      role="listbox"
      class="absolute z-20 mt-2 w-full list-none overflow-hidden rounded-card border border-hair bg-s2 p-1 shadow-modal"
    >
      <li v-if="env" class="ecs-tabs" role="presentation">
        <button v-for="[k, l] in ([['ch', 'Channels'], ['mods', 'Twitch mods'], ['emo', 'Twitch emotes']] as const)" :key="k" type="button" :aria-pressed="tab === k" @mousedown.prevent="openTab(k)">{{ l }}</button>
      </li>
      <li v-if="env && !results.length && !canAddText && !searching" class="px-3 py-3 text-sm text-ink-muted">Type a channel name, or any nominee.</li>
      <li v-if="env" class="ecs-on" aria-hidden="true">Channels on <i class="ecs-pf tw" />Twitch <i class="ecs-pf kk" />Kick <i class="ecs-pf yt" />YouTube</li>
      <li v-else class="flex items-center gap-2 px-3 pb-1 pt-2" aria-hidden="true">
        <UiMaskIcon src="/img/icons/cat-clip.svg" class="h-3.5 w-3.5 text-gold opacity-70" />
        <span class="micro">Channels on</span>
        <PlatformDot platform="twitch" :size="13" />
        <PlatformDot platform="kick" :size="13" />
        <PlatformDot platform="youtube" :size="13" />
      </li>
      <li v-if="searching && !results.length" class="px-3 py-3 text-sm text-ink-muted" aria-live="polite">Searching Streams Charts…</li>
      <li
        v-for="(c, i) in results"
        :id="id + '-opt-' + i"
        :key="c.id"
        role="option"
        :aria-selected="i === active"
        class="flex h-14 cursor-pointer items-center gap-3 rounded-btn px-3 text-sm"
        :class="i === active ? 'bg-s3' : 'hover:bg-s3'"
        @mousedown.prevent="choose(c)"
        @mouseenter="active = i"
      >
        <img v-if="env" :src="channelAvatar(c)" alt="" @error="avatarFallback($event, c.name)" class="h-8 w-8 flex-none rounded-pill object-cover" />
        <span v-else aria-hidden="true" class="grid h-8 w-8 flex-none place-items-center rounded-pill bg-s1 text-xs font-bold text-ink-muted">
          {{ c.name.slice(0, 2).toUpperCase() }}
        </span>
        <span class="font-semibold">{{ c.name }}</span>
        <i v-if="env" class="ecs-pf" :class="{ twitch: 'tw', kick: 'kk', youtube: 'yt' }[c.platform]" :aria-label="c.platform" />
        <PlatformDot v-else :platform="c.platform" :label="false" :size="14" />
        <LivePill v-if="c.live" :game="c.game" />
        <span v-if="c.followers" class="ml-auto shrink-0 text-sm text-ink-muted">{{ fmtFollowers(c.followers) }} followers</span>
      </li>

      <li
        v-if="canAddText"
        role="option"
        :aria-selected="active === results.length"
        class="flex h-14 cursor-pointer items-center gap-3 rounded-btn border border-dashed border-hair2 px-3 text-sm text-ink-2"
        :class="active === results.length ? 'bg-s3' : 'hover:bg-s3'"
        @mousedown.prevent="chooseText"
        @mouseenter="active = results.length"
      >
        <span aria-hidden="true" class="grid h-8 w-8 flex-none place-items-center rounded-pill border border-hair2">+</span>
        Add "{{ q.trim() }}" as a text nominee
      </li>
    </ul>
  </div>
</template>
