<script setup lang="ts">
// The Look step of the Envelope builder (Ed's prototype, 2026-10-22): one list of
// settings, label on the left and the control on the right. A "Custom look"
// switch turns the whole thing off (the free page) and back on with what was
// picked; Custom opens an editor for the host's own background.
import EnvColorPicker from './EnvColorPicker.vue'
import { computed, ref } from 'vue'
import { ENV_THEMES, DEFAULT_BG, envelopeDarkCss } from '~/data/themes'
import { ImageError, fileToStoredImage } from '~/utils/image'
import { DEFAULT_ACCENT, accentReadable } from '~/utils/accent'
import type { AwardLook, CustomBg } from '~/types/award'
import '~/assets/css/envelope-builder.css'

const { look } = defineProps<{ look: AwardLook }>()
const emit = defineEmits<{ 'update:look': [AwardLook] }>()

const ACCENTS = ['#C9A45C', '#E8543C', '#3FD39A', '#9B7BFF', '#FF6FB1', '#3FA9FF', '#F3F0E8']
const FONTS = ['Hanken Grotesk', 'Gloock', 'Anton', 'Playfair Display', 'Space Grotesk']
const accent = computed(() => look.accent ?? DEFAULT_ACCENT)
const theme = computed(() => look.theme ?? 'plain')
const bg = computed<CustomBg>(() => ({ ...DEFAULT_BG, ...(look.bg ?? {}) }))
const set = (patch: Partial<AwardLook>) => emit('update:look', { ...look, ...patch })
const setBg = (patch: Partial<CustomBg>) => set({ bg: { ...bg.value, ...patch } })

// the switch: off is the free page; what was picked comes back when it is on again
const keep = ref<AwardLook | null>(null)
function toggle() {
  if (keep.value === null) {
    keep.value = { ...look }
    emit('update:look', {})
  } else {
    emit('update:look', keep.value)
    keep.value = null
  }
}
const isOn = computed(() => keep.value === null)


const coverError = ref('')
async function pickCover(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  coverError.value = ''
  try {
    set({ coverUrl: await fileToStoredImage(file, 1800) })
  } catch (err) {
    coverError.value = err instanceof ImageError ? err.message : 'That image could not be read. Try a PNG or a JPG.'
  }
  input.value = ''
}

const PATTERNS: [CustomBg['pattern'], string][] = [['none', 'None'], ['rays', 'Rays'], ['rings', 'Rings'], ['dots', 'Dots'], ['grid', 'Grid'], ['stripes', 'Stripes'], ['bokeh', 'Lights']]
const GLOWS: [CustomBg['glow'], string][] = [['top', 'Top'], ['corner', 'Corner'], ['center', 'Centre'], ['bottom', 'Bottom'], ['none', 'Off']]
const pct = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`
</script>

<template>
  <section class="elk rounded-card bg-s1 p-6" :class="!isOn && 'is-off'">
    <div class="elk-head">
      <div>
        <h2 class="text-xl font-semibold">Look <span class="elk-paid">Paid</span></h2>
        <p class="mt-1 text-sm text-ink-2">Your own theme, colour, type and cover. Switch it off to keep the free default look.</p>
      </div>
      <button type="button" class="elk-sw" role="switch" :aria-checked="isOn" @click="toggle">
        <span class="elk-sw-t" aria-hidden="true" /><b>Custom look</b>
      </button>
    </div>

    <div v-if="isOn" class="elk-list">
      <div class="elk-row">
        <div class="elk-k"><b>Theme</b><small>Plain is free. Every theme is built from the accent colour.</small></div>
        <div>
          <div class="elk-themes">
            <button
              v-for="t in ENV_THEMES"
              :key="t.id"
              type="button"
              class="elk-th"
              :aria-pressed="theme === t.id"
              @click="set({ theme: t.id === 'plain' ? undefined : t.id, coverUrl: undefined })"
            >
              <i :class="t.id === 'custom' && 'is-custom'" :style="{ background: envelopeDarkCss(t.id, accent, undefined, look.bg) }" />
              <span>{{ t.name }}</span>
            </button>
          </div>

          <!-- the host's own background -->
          <div v-if="theme === 'custom'" class="elk-bgx">
            <div class="elk-bgx-r">
              <span>Pattern</span>
              <div class="elk-seg">
                <button v-for="[v, l] in PATTERNS" :key="v" type="button" :aria-pressed="bg.pattern === v" @click="setBg({ pattern: v })">{{ l }}</button>
              </div>
            </div>
            <label class="elk-bgx-r"><span>Pattern strength</span><input class="elk-rg" type="range" min="0" max="100" :value="bg.strength" :style="{ '--p': pct(bg.strength, 0, 100) }" @input="setBg({ strength: +($event.target as HTMLInputElement).value })" /><output>{{ bg.strength }}</output></label>
            <label class="elk-bgx-r"><span>Scale</span><input class="elk-rg" type="range" min="10" max="100" :value="bg.size" :style="{ '--p': pct(bg.size, 10, 100) }" @input="setBg({ size: +($event.target as HTMLInputElement).value })" /><output>{{ bg.size }}</output></label>
            <label class="elk-bgx-r"><span>Angle</span><input class="elk-rg" type="range" min="0" max="180" :value="bg.angle" :style="{ '--p': pct(bg.angle, 0, 180) }" @input="setBg({ angle: +($event.target as HTMLInputElement).value })" /><output>{{ bg.angle }}°</output></label>
            <div class="elk-bgx-r">
              <span>Light from</span>
              <div class="elk-seg">
                <button v-for="[v, l] in GLOWS" :key="v" type="button" :aria-pressed="bg.glow === v" @click="setBg({ glow: v })">{{ l }}</button>
              </div>
            </div>
            <label class="elk-bgx-r"><span>Light strength</span><input class="elk-rg" type="range" min="0" max="100" :value="bg.glowStrength" :style="{ '--p': pct(bg.glowStrength, 0, 100) }" @input="setBg({ glowStrength: +($event.target as HTMLInputElement).value })" /><output>{{ bg.glowStrength }}</output></label>
            <div class="elk-bgx-r">
              <span>Pattern colour</span>
              <div class="elk-dots">
                <button type="button" class="same" :aria-pressed="!bg.color" @click="setBg({ color: undefined })">Accent</button>
                <button v-for="c in ACCENTS" :key="c" type="button" :aria-pressed="bg.color === c" :aria-label="'Pattern colour ' + c" :style="{ background: c }" @click="setBg({ color: c })" />
              </div>
            </div>
            <div class="elk-bgx-f"><button type="button" class="elk-link" @click="set({ bg: undefined })">Reset</button></div>
          </div>
        </div>
      </div>

      <div class="elk-row">
        <div class="elk-k"><b>Cover image</b><small>Replaces the theme on the page.</small></div>
        <div>
          <label class="elk-cover" :class="look.coverUrl && 'has'" :style="look.coverUrl ? { backgroundImage: `url(${look.coverUrl})` } : undefined">
            <input type="file" accept="image/*" class="sr-only" @change="pickCover" />
            <span v-if="!look.coverUrl"><i class="elk-up" aria-hidden="true" />Upload a 21:9 cover</span>
            <button v-if="look.coverUrl" type="button" class="elk-rm" @click.prevent="set({ coverUrl: undefined })"><i aria-hidden="true" />Remove</button>
          </label>
          <p v-if="coverError" class="mt-2 text-sm text-danger">{{ coverError }}</p>
        </div>
      </div>

      <div class="elk-row">
        <div class="elk-k"><b>Accent colour</b><small>Buttons, highlights and the theme.</small></div>
        <div>
          <div class="elk-dots big">
            <button
              v-for="(c, i) in ACCENTS"
              :key="c"
              type="button"
              :aria-pressed="i === 0 ? !look.accent : look.accent === c"
              :aria-label="'Accent colour ' + c"
              :style="{ background: c }"
              @click="set({ accent: i === 0 ? undefined : c })"
            />
            <EnvColorPicker :model-value="look.accent" :pressed="!!look.accent && !ACCENTS.includes(look.accent)" @apply="set({ accent: $event })" />
          </div>
          <p v-if="look.accent && !accentReadable(look.accent)" class="mt-2 text-sm text-ink-muted">Too dark to read as text: headings use a lighter shade of it.</p>
        </div>
      </div>

      <div class="elk-row">
        <div class="elk-k"><b>Headline type</b><small>Used for the awards name.</small></div>
        <div class="elk-fonts">
          <button
            v-for="(f, i) in FONTS"
            :key="f"
            type="button"
            :aria-pressed="i === 0 ? !look.font : look.font === f"
            :style="{ fontFamily: `'${f}', var(--font-body), sans-serif` }"
            @click="set({ font: i === 0 ? undefined : f })"
          >{{ f.split(' ')[0] }}</button>
        </div>
      </div>

      <div class="elk-row">
        <div class="elk-k"><b>Channel logo</b><small>Show the name only, without the avatar.</small></div>
        <div>
          <button type="button" class="elk-sw" role="switch" :aria-checked="!!look.hideLogo" @click="set({ hideLogo: look.hideLogo ? undefined : true })">
            <span class="elk-sw-t" aria-hidden="true" /><span>Hide the channel logo</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
