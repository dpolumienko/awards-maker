<script setup lang="ts">
// Blank forms are where builders die. Three prepared sets fill the nominations in
// one click; the chips below add a single idea at a time.
// Cards are equal height with mark, name, copy and action each on its own row -
// the first version let the icon and the text drift from card to card.
import { ref } from 'vue'
import { TEMPLATES, type AwardTemplate } from '~/data/templates'
import { IDEA_GROUPS, IDEA_TOTAL } from '~/data/ideas'

// Six chips per group is as much as fits under the form without turning the
// builder into a catalogue; the whole list is a page of its own.
const ideaChips = IDEA_GROUPS.map((g) => ({ ...g, items: g.items.slice(0, 6) }))
import PaywallNote from './PaywallNote.vue'
import UiIcon from './UiIcon.vue'
import { FREE } from '~/types/award'
import UiMaskIcon from './UiMaskIcon.vue'

const { used, active } = defineProps<{ used: number; active?: string }>()
const emit = defineEmits<{ apply: [AwardTemplate]; addIdea: [string] }>()

const openIdeas = ref(false)
// `applied` is the momentary "it landed" flash; `active` is the set the draft is
// actually built on, and it stays lit until another set replaces it.
const applied = ref<string | null>(null)
const full = () => used >= FREE.maxNominations

// Clicking a set fills the form below, which is off screen on a laptop - so the
// card says what happened instead of looking broken.
function apply(t: AwardTemplate) {
  emit('apply', t)
  applied.value = t.id
  setTimeout(() => (applied.value = null), 2400)
}
</script>

<template>
  <section class="rounded-card border border-hair bg-s1 p-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold">Ready-made streamer awards categories</h2>
        <p class="mt-1 max-w-copy text-sm text-ink-2">
          Five nominations, filled in. Rename or remove anything after.
        </p>
      </div>
      <button
        type="button"
        class="py-1.5 text-sm text-gold-text underline underline-offset-4 transition-colors hover:text-ink"
        :aria-expanded="openIdeas"
        aria-controls="idea-chips"
        @click="openIdeas = !openIdeas"
      >
        {{ openIdeas ? 'Hide single ideas' : 'Or pick ideas one by one' }}
      </button>
    </div>

    <!-- three sets, divided rather than boxed: a card inside a card is a frame
         around nothing, and the panel already is the frame -->
    <div class="mt-5 grid items-stretch gap-y-6 border-t border-hair pt-6 sm:-mx-6 sm:grid-cols-3 sm:divide-x sm:divide-hair">
      <button
        v-for="t in TEMPLATES"
        :key="t.id"
        type="button"
        :aria-pressed="active === t.id"
        class="group flex h-full flex-col text-left transition-transform duration-300 ease-gala motion-safe:hover:-translate-y-0.5 sm:px-6"
        @click="apply(t)"
      >
        <span
          class="grid h-9 w-9 flex-none place-items-center rounded-btn border bg-s2 transition-colors duration-300"
          :class="active === t.id ? 'border-ink bg-s3' : 'border-hair group-hover:border-hair2'"
        >
          <UiMaskIcon :src="t.icon" class="h-4 w-4 text-gold" />
        </span>
        <!-- the tick has its own reserved column: appearing between the name and
             the text used to shove the whole card's copy sideways and down -->
        <span class="mt-3 grid grid-cols-[minmax(0,1fr)_14px] items-center gap-2 font-semibold leading-snug">
          <span class="min-w-0">{{ t.name }}</span>
          <UiIcon v-show="active === t.id" name="check" :size="14" class="text-ink" />
        </span>
        <span class="mt-1 block text-sm leading-snug text-ink-2">{{ t.blurb }}</span>
        <span
          class="mt-auto block pt-4 text-[11px] font-semibold uppercase tracking-micro leading-4 transition-colors"
          :class="active === t.id ? 'text-ink' : 'text-ink-muted group-hover:text-ink'"
        >
          <span class="block h-4 whitespace-nowrap">
            {{ applied === t.id ? 'Added below' : active === t.id ? 'In use' : 'Use this template' }}
          </span>
        </span>
      </button>
    </div>

    <div v-show="openIdeas" id="idea-chips" class="mt-6 space-y-4 border-t border-hair pt-6">
      <div v-for="g in ideaChips" :key="g.title">
        <p class="micro">{{ g.title }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="item in g.items"
            :key="item"
            type="button"
            class="rounded-pill border border-hair px-3.5 py-1.5 text-sm text-ink-2 transition-[color,border-color,transform] duration-300 ease-gala hover:border-gold hover:text-ink motion-safe:hover:-translate-y-0.5"
            @click="emit('addIdea', item)"
          >
            + {{ item }}
          </button>
        </div>
      </div>
      <p class="text-sm text-ink-muted">
        <NuxtLink to="/ideas" class="text-gold-text underline underline-offset-4">All {{ IDEA_TOTAL }} category ideas</NuxtLink>
        - opens in a new page, your draft stays here.
      </p>
      <!-- past the free limit the chips keep working; this only explains the bill -->
      <PaywallNote v-if="full()" compact />
    </div>
  </section>
</template>
