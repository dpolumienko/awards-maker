<script setup lang="ts">
// The Look step, rebuilt: theme first, then colour, then type, then the cover.
// Everything here is paid, but nothing is blocked - you set it, the preview
// follows, and the bill only comes up at publish.
//
// The channel logo is not an upload: it is the avatar of the account that signs
// in, so the control is a sign-in button until there is one.
import { THEMES, themeCss } from '~/data/themes'
import { ref } from 'vue'
import { fileToStoredImage } from '~/utils/image'
import { accentReadable } from '~/utils/accent'
import type { AwardLook } from '~/types/award'
import UiMaskIcon from './UiMaskIcon.vue'

const { look, signedIn = false, channel = '' } = defineProps<{
  look: AwardLook
  signedIn?: boolean
  channel?: string
}>()
const emit = defineEmits<{ 'update:look': [AwardLook]; signIn: [] }>()

// First swatch is the free default; the rest are the paid palette, plus a custom
// picker for a channel that has its own brand colour.
const accents = [
  '#D9A441', '#EFC97A', '#B87333', '#C9CCD1',
  '#3DD68C', '#1FA98C', '#5AA9FF', '#3B5BDB',
  '#9147FF', '#C86DD7', '#FF4E45', '#FF8A3D',
]
const fonts = ['Archivo', 'Anton', 'Playfair Display', 'Space Grotesk']

const accent = () => look.accent ?? accents[0]!
const theme = () => look.theme ?? 'plain'

function set(patch: Partial<AwardLook>) {
  emit('update:look', { ...look, ...patch })
}
// The cover is stored, not referenced: a blob: URL dies with the document, so
// every published cover came back broken on the next load.
const coverError = ref('')
async function pickCover(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  coverError.value = ''
  try {
    set({ coverUrl: await fileToStoredImage(file, 1800) })
  } catch {
    coverError.value = 'That image could not be read. Try a PNG or a JPG.'
  }
  input.value = ''
}
function clearCover() {
  set({ coverUrl: undefined })
}
</script>

<template>
  <section class="rounded-card border border-hair bg-s1 p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold">Look</h2>
        <p class="mt-1 text-sm text-ink-2">
          Set it now and watch the preview. Anything you change here is part of the paid tier.
        </p>
      </div>
      <span class="rounded-pill border border-gold-24 px-3 py-1 text-[11px] font-bold uppercase tracking-micro text-gold-text">
        Paid
      </span>
    </div>

    <!-- theme -->
    <div class="mt-6">
      <div class="mb-2 flex h-6 items-center gap-2">
        <p class="label">Background theme</p>
        <span v-if="look.theme" class="flex-none text-xs text-gold-text">in use</span>
      </div>
      <div class="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <button
          v-for="t in THEMES"
          :key="t.id"
          type="button"
          class="overflow-hidden rounded-btn border-2 text-left transition-transform duration-300 ease-gala motion-safe:hover:-translate-y-0.5"
          :class="theme() === t.id ? 'border-ink' : 'border-transparent'"
          :aria-pressed="theme() === t.id"
          :aria-label="'Theme ' + t.name"
          @click="set({ theme: t.id === 'plain' ? undefined : t.id })"
        >
          <span class="block h-14 w-full" :style="themeCss(t.id, accent())" />
          <span class="block bg-canvas px-2 py-1.5 text-[11px] uppercase leading-tight tracking-micro text-ink-muted">
            {{ t.name }}
          </span>
        </button>
      </div>
      <p class="mt-2 text-sm text-ink-muted">Plain is the free default. Every theme is built from the accent colour.</p>
    </div>

    <!-- accent -->
    <div class="mt-6">
      <div class="mb-2 flex h-6 items-center gap-2">
        <p class="label">Accent colour</p>
        <span v-if="look.accent" class="flex-none text-xs text-gold-text">in use</span>
      </div>
      <div class="grid grid-cols-6 gap-2">
        <button
          v-for="c in accents"
          :key="c"
          type="button"
          class="h-11 w-full rounded-btn border-2 transition-transform duration-300 ease-gala motion-safe:hover:-translate-y-0.5"
          :class="accent() === c ? 'border-ink' : 'border-transparent opacity-80'"
          :style="{ background: c }"
          :aria-label="'Accent colour ' + c"
          :aria-pressed="accent() === c"
          @click="set({ accent: c === accents[0] ? undefined : c })"
        />
      </div>
      <p v-if="!accentReadable(accent())" class="mt-3 text-sm text-ink-2">
        Too dark to read as text: headings and counters on your page use a lighter shade of it.
        Fills, borders and bars keep the colour exactly as picked.
      </p>
      <div class="mt-3 flex items-center gap-3">
        <label class="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input
            type="color"
            class="h-8 w-10 cursor-pointer rounded-btn border border-hair bg-s2 p-0.5"
            :value="accent()"
            aria-label="Custom accent colour"
            @input="set({ accent: ($event.target as HTMLInputElement).value })"
          />
          Custom
        </label>
        <button
          v-if="look.accent"
          type="button"
          class="text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
          @click="set({ accent: undefined })"
        >
          Back to gold
        </button>
      </div>
    </div>

    <div class="mt-6 grid gap-5 sm:grid-cols-2">
      <!-- type -->
      <div>
        <div class="mb-2 flex h-6 items-center gap-2">
          <p class="label">Headline type</p>
          <span v-if="look.font" class="flex-none text-xs text-gold-text">in use</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="f in fonts"
            :key="f"
            type="button"
            class="rounded-pill border px-3.5 py-1.5 text-sm transition-colors"
            :class="(look.font ?? fonts[0]) === f ? 'border-gold text-ink' : 'border-hair text-ink-muted hover:border-gold-24'"
            :style="{ fontFamily: `'${f}', Archivo, sans-serif` }"
            :aria-pressed="(look.font ?? fonts[0]) === f"
            @click="set({ font: f === fonts[0] ? undefined : f })"
          >
            {{ f }}
          </button>
        </div>
        <p class="mt-2 text-sm text-ink-muted">Archivo is the free default.</p>
      </div>

      <!-- cover -->
      <div>
        <div class="mb-2 flex h-6 items-center gap-2">
          <p class="label truncate">Cover image</p>
          <span v-if="look.coverUrl" class="flex-none text-xs text-gold-text">in use</span>
          <button
            v-if="look.coverUrl"
            type="button"
            class="ml-auto flex-none text-xs text-ink-muted underline underline-offset-4 transition-colors hover:text-danger"
            @click="clearCover"
          >
            Remove
          </button>
        </div>
        <label
          class="flex h-28 w-full cursor-pointer items-center justify-center overflow-hidden rounded-btn border border-dashed border-hair2 bg-canvas text-sm text-ink-muted transition-colors hover:border-gold-24 hover:text-ink-2"
        >
          <img v-if="look.coverUrl" :src="look.coverUrl" alt="" class="h-full w-full object-cover" />
          <span v-else class="flex items-center gap-2">
            <UiMaskIcon src="/img/icons/cat-clip.svg" class="h-4 w-4 text-gold opacity-70" />
            Upload a 21:9 cover
          </span>
          <input type="file" accept="image/*" class="sr-only" @change="pickCover" />
        </label>
        <p v-if="coverError" class="mt-2 text-sm text-danger">{{ coverError }}</p>
        <p v-else class="mt-2 text-sm text-ink-muted">A cover replaces the theme on the page.</p>
      </div>
    </div>

    <!-- logo comes from the account, not from a file picker -->
    <div class="mt-6 border-t border-hair pt-5">
      <p class="label mb-2">Channel logo</p>
      <div v-if="signedIn" class="flex flex-wrap items-center gap-3">
        <span aria-hidden="true" class="grid h-10 w-10 place-items-center rounded-pill bg-s3 text-xs font-bold text-ink-muted">
          {{ channel.slice(0, 2).toUpperCase() }}
        </span>
        <span class="text-sm">Taken from <b class="font-semibold">{{ channel }}</b>.</span>
        <span class="text-sm text-ink-muted">Change it there and the awards page follows.</span>
      </div>
      <div v-else class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="flex h-11 items-center gap-2 rounded-btn bg-twitch px-4 text-sm font-bold uppercase tracking-button text-white transition-opacity hover:opacity-90"
          @click="emit('signIn')"
        >
          Sign in with Twitch
        </button>
        <span class="text-sm text-ink-2">Your channel avatar becomes the logo on the awards page.</span>
      </div>
    </div>
  </section>
</template>
