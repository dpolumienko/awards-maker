<script setup lang="ts">
// The design preview (review 2026-09-24, items 1 and 14; reworked 2026-10-06).
// Two levels, because they are two different decisions:
//   - Version: which whole site you are looking at. Always on screen, one click,
//     each option drawn as a tiny swatch of that version so they cannot be confused.
//   - Palette and main button: fine-tuning of the Current version only, behind the
//     settings button, out of the way.
// Temporary by design: once a winner is picked, delete this, data/design.ts and
// the losing blocks in assets/css/palettes.css / zine.css.
import { computed, onMounted, ref, watch } from 'vue'
import { BUTTONS, DESIGN_KEYS, PALETTES, VERSIONS } from '~/data/design'
import { useVersion } from '~/composables/useVersion'
import UiIcon from '~/components/ui/UiIcon.vue'

const palette = ref<string>('gold')
const button = ref<string>('solid')
const copied = ref(false)
const open = ref(false)
const { version, isZine, setVersion } = useVersion()

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
  url.searchParams.set('version', version.value)
  if (!isZine.value) {
    url.searchParams.set('palette', palette.value)
    url.searchParams.set('button', button.value)
  }
  try {
    await navigator.clipboard.writeText(url.toString())
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    /* no clipboard: nothing to say */
  }
}

const label = computed(() => VERSIONS.find((v) => v.id === version.value)?.label ?? '')
const seg = (active: boolean) =>
  [
    'rounded-pill px-3 py-1 text-xs font-semibold transition-colors',
    active ? 'bg-ink text-canvas' : 'text-ink-2 hover:text-ink',
  ].join(' ')
</script>

<template>
  <ClientOnly>
    <!-- Floating, not in the flow (CLS, and its words were the first text Google
         read), on the left edge halfway down: every corner is taken by a sticky
         bar on some page (QA P1). Fixed dark chrome in both versions - it is a
         tool on top of the site, not part of it. -->
    <div data-nosnippet class="ds fixed left-2 top-1/2 z-50 -translate-y-1/2">
      <div class="ds-rail" role="radiogroup" aria-label="Site version">
        <span class="ds-cap" aria-hidden="true">Version</span>
        <button
          v-for="v in VERSIONS"
          :key="v.id"
          type="button"
          role="radio"
          class="ds-ver"
          :aria-checked="version === v.id"
          :title="`${v.label} version`"
          @click="setVersion(v.id)"
        >
          <span class="ds-swatch" :class="`ds-swatch-${v.id}`" aria-hidden="true"><i /><b /></span>
          <span class="ds-name">{{ v.label }}</span>
        </button>
        <button
          type="button"
          class="ds-more"
          :aria-expanded="open"
          aria-controls="design-preview"
          :aria-label="open ? 'Close design options' : `Design options for ${label}`"
          @click="open = !open"
        >
          <UiIcon :name="open ? 'chevron-left' : 'chevron-right'" :size="14" />
        </button>
      </div>

      <div v-if="open" id="design-preview" role="region" :aria-label="`Design options, ${label}`" class="ds-panel">
        <p class="ds-title">{{ label }} version</p>
        <template v-if="!isZine">
          <div class="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Palette">
            <span class="ds-k">Palette</span>
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
            <span class="ds-k">Button</span>
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
        </template>
        <p v-else class="ds-note">The Fanzine prints in its own two inks, on paper or on black, so it has no palette or button options.</p>
        <button type="button" class="ds-link" @click="share">{{ copied ? 'Link copied' : 'Copy link to this view' }}</button>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
/* fixed colours on purpose: the preview tool looks the same in either version */
.ds {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: Archivo, 'Helvetica Neue', Arial, sans-serif;
}
.ds-rail {
  display: grid;
  gap: 6px;
  padding: 8px 6px 6px;
  border-radius: 12px;
  background: rgba(20, 20, 24, 0.94);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}
.ds-cap {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #a5a5ac;
  text-align: center;
}
.ds-ver {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 5px 4px 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #a5a5ac;
  cursor: pointer;
}
.ds-ver:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}
.ds-ver[aria-checked='true'] {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 0 0 1.5px #fff;
}
.ds-ver:focus-visible,
.ds-more:focus-visible,
.ds-link:focus-visible {
  outline: 2px solid #6ec4ff;
  outline-offset: 2px;
}
.ds-name {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
/* each version as a postage stamp of itself */
.ds-swatch {
  position: relative;
  display: block;
  width: 44px;
  height: 30px;
  border-radius: 4px;
  overflow: hidden;
}
.ds-swatch i,
.ds-swatch b {
  position: absolute;
  display: block;
}
.ds-swatch-stage {
  background: #0a0a0c;
  box-shadow: inset 0 0 0 1px #3a3a42;
}
.ds-swatch-stage i {
  left: 7px;
  top: 8px;
  width: 22px;
  height: 4px;
  background: #fff;
}
.ds-swatch-stage b {
  left: 7px;
  top: 17px;
  width: 16px;
  height: 6px;
  border-radius: 2px;
  background: #d9a441;
}
.ds-swatch-zine {
  background: #fafaf7;
  border-radius: 0;
}
.ds-swatch-zine i {
  left: 6px;
  top: 6px;
  width: 26px;
  height: 8px;
  background: #0078bf;
}
.ds-swatch-zine b {
  left: 8px;
  top: 8px;
  width: 26px;
  height: 8px;
  background: #ff48b0;
  mix-blend-mode: multiply;
}
.ds-swatch-night {
  background: #111113;
  border-radius: 0;
  box-shadow: inset 0 0 0 1px #3a3a42;
}
.ds-swatch-night i {
  left: 6px;
  top: 6px;
  width: 26px;
  height: 8px;
  background: #5cace8;
}
.ds-swatch-night b {
  left: 8px;
  top: 8px;
  width: 26px;
  height: 8px;
  background: #ff48b0;
  mix-blend-mode: screen;
}
.ds-more {
  display: grid;
  place-items: center;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
}
.ds-more:hover {
  background: rgba(255, 255, 255, 0.16);
}
.ds-panel {
  display: grid;
  gap: 10px;
  width: min(520px, calc(100vw - 110px));
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(20, 20, 24, 0.96);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 12px;
}
.ds-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #a5a5ac;
}
.ds-k {
  margin-right: 4px;
  color: #a5a5ac;
}
.ds-note {
  color: #c9c9ce;
  line-height: 1.45;
}
.ds-link {
  justify-self: start;
  border: 0;
  background: none;
  padding: 0;
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}
/* the panel keeps the site's segmented buttons, readable on the dark chrome */
.ds-panel :deep(button[role='radio']) {
  color: #c9c9ce;
}
.ds-panel :deep(button[role='radio'][aria-checked='true']) {
  background: #fff;
  color: #0a0a0c;
}
</style>
