<script setup lang="ts">
// Combobox over the (mock) Streams Charts channel database. Keyboard first:
// arrows move, Enter picks, Esc closes - WCAG 4.1.2 / 2.1.1.
import { computed, ref, useId } from 'vue'
import PlatformDot from './PlatformDot.vue'
import LivePill from './LivePill.vue'
import { searchChannels, fmtFollowers } from '~/data/channels.mock'
import type { Channel } from '~/types/award'
import UiMaskIcon from './UiMaskIcon.vue'

const emit = defineEmits<{ pick: [Channel]; pickText: [string] }>()

const id = useId()
const q = ref('')
const open = ref(false)
const active = ref(-1)
const results = computed(() => searchChannels(q.value))
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

    <ul
      v-if="open && (results.length || canAddText)"
      :id="id + '-list'"
      role="listbox"
      class="absolute z-20 mt-2 w-full list-none overflow-hidden rounded-card border border-hair bg-s2 p-1 shadow-modal"
    >
      <li class="flex items-center gap-2 px-3 pb-1 pt-2" aria-hidden="true">
        <UiMaskIcon src="/img/icons/cat-clip.svg" class="h-3.5 w-3.5 text-gold opacity-70" />
        <span class="micro">Channels on</span>
        <PlatformDot platform="twitch" />
        <PlatformDot platform="kick" />
        <PlatformDot platform="youtube" />
      </li>
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
        <span aria-hidden="true" class="grid h-8 w-8 flex-none place-items-center rounded-pill bg-s1 text-xs font-bold text-ink-muted">
          {{ c.name.slice(0, 2).toUpperCase() }}
        </span>
        <span class="font-semibold">{{ c.name }}</span>
        <PlatformDot :platform="c.platform" :label="false" />
        <LivePill v-if="c.live" :game="c.game" />
        <span class="ml-auto shrink-0 text-sm text-ink-muted">{{ fmtFollowers(c.followers) }} followers</span>
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
