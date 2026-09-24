<script setup lang="ts">
// A floating panel for comparing the palettes and the primary-button
// treatments on the real pages (review 2026-09-24, items 1 and 14). Temporary by
// design: once a winner is picked, delete this, data/design.ts and the losing
// blocks in assets/css/palettes.css.
import { onMounted, ref, watch } from 'vue'
import { BUTTONS, DESIGN_KEYS, PALETTES } from '~/data/design'

const palette = ref<string>('gold')
const button = ref<string>('solid')
const copied = ref(false)
// collapsed to a pill by default: open, it covered the ballot's sticky submit bar
const open = ref(false)

onMounted(() => {
  const d = document.documentElement
  palette.value = d.dataset.palette || 'gold'
  button.value = d.dataset.button || 'solid'
})

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode: the choice lasts for this page */
  }
}
watch(palette, (v) => {
  document.documentElement.dataset.palette = v
  persist(DESIGN_KEYS.palette, v)
})
watch(button, (v) => {
  document.documentElement.dataset.button = v
  persist(DESIGN_KEYS.button, v)
})

async function share() {
  const url = new URL(location.href)
  url.searchParams.set('palette', palette.value)
  url.searchParams.set('button', button.value)
  try {
    await navigator.clipboard.writeText(url.toString())
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    /* no clipboard: nothing to say */
  }
}

const seg = (active: boolean) =>
  [
    'rounded-pill px-3 py-1 text-xs font-semibold transition-colors',
    active ? 'bg-ink text-canvas' : 'text-ink-2 hover:text-ink',
  ].join(' ')
</script>

<template>
  <ClientOnly>
    <!-- Floating, not in the flow: a strip above the header mounted after
         hydration and pushed every page down (CLS 0.1 in the SEO audit), and its
         words were the first text Google read on each page. -->
    <!-- A round tab on the left edge, halfway down: every corner is taken by a
         sticky bar or panel on some page (the ballot's submit bar, the side
         column, the builder preview - QA P1). Opens upwards from there. -->
    <div data-nosnippet class="fixed left-2 top-1/2 z-50 -translate-y-1/2 text-xs">
      <button
        v-if="!open"
        type="button"
        class="grid h-11 w-11 place-items-center rounded-pill border border-hair2 bg-s1/95 text-base shadow-modal backdrop-blur"
        :aria-expanded="false"
        aria-controls="design-preview"
        :aria-label="`Design preview: ${PALETTES.find((p) => p.id === palette)?.label}, ${BUTTONS.find((b) => b.id === button)?.label} button`"
        :title="`Design: ${PALETTES.find((p) => p.id === palette)?.label} · ${BUTTONS.find((b) => b.id === button)?.label}`"
        @click="open = true"
      >
        <span aria-hidden="true">🎨</span>
      </button>
      <div
        v-else
        id="design-preview"
        role="region"
        aria-label="Design preview"
        class="w-[min(760px,calc(100vw-24px))] rounded-card border border-hair2 bg-s1/95 shadow-modal backdrop-blur"
      >
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
          <span class="micro text-ink-muted">Design preview</span>
          <div class="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Palette">
            <span class="mr-1 text-ink-muted">Palette</span>
            <button
              v-for="p in PALETTES"
              :key="p.id"
              type="button"
              role="radio"
              :aria-checked="palette === p.id"
              :class="seg(palette === p.id)"
              @click="palette = p.id"
            >{{ p.label }}</button>
          </div>
          <div class="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Main button">
            <span class="mr-1 text-ink-muted">Button</span>
            <button
              v-for="b in BUTTONS"
              :key="b.id"
              type="button"
              role="radio"
              :aria-checked="button === b.id"
              :class="seg(button === b.id)"
              @click="button = b.id"
            >{{ b.label }}</button>
          </div>
          <button type="button" class="text-ink-2 underline underline-offset-4 hover:text-ink" @click="share">
            {{ copied ? 'Link copied' : 'Copy link' }}
          </button>
          <button type="button" class="ml-auto text-ink-muted hover:text-ink" aria-label="Close design preview" @click="open = false">✕</button>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>
