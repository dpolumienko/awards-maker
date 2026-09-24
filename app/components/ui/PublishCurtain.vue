<script setup lang="ts">
// What happens the moment a show is published: the stage it will live on comes
// up full-bleed, its name arrives letter by letter in its own display face, a
// house light crosses it once, and the curtain wipes away into the page itself.
//
// It is a transition, not a dialog. There is no card, no tick in a circle and no
// confetti - the category defaults for "success" say nothing about this product,
// and a modal that interrupts to tell you what you just did is noise. What this
// shows instead is the thing that was made: the streamer's own theme, colour and
// typeface, and the address the link now lives at.
//
// The letter mechanic is ported from "Vertical Cut Reveal" on 21st.dev: each
// character sits in its own overflow-hidden box and slides up from below, with
// the stagger running out from the centre.
import { accentOf, tint } from '~/utils/accent'
import { computed, nextTick, ref, watch } from 'vue'
import { prefersReducedMotion, useGsap } from '~/composables/useReveal'
import { themeCss } from '~/data/themes'
import type { AwardLook } from '~/types/award'

const { open, name, url, look = {} } = defineProps<{
  open: boolean
  name: string
  /** Where the show now lives, shown as plain text - this is the payoff. */
  url: string
  look?: AwardLook
}>()
// `reveal` fires as the wipe starts, `done` when there is nothing left to see.
// Navigating on `done` is what made the screen flash: the wipe spent 0.7s
// uncovering the page underneath, which was still the builder.
const emit = defineEmits<{ reveal: []; done: [] }>()

const root = ref<HTMLElement | null>(null)
const accent = computed(() => accentOf(look))
const font = computed(() => (look.font ? `'${look.font}', Archivo, sans-serif` : undefined))
// Split on words first so a long name wraps where a name should wrap.
const words = computed(() => name.trim().split(/\s+/).map((w) => [...w]))

function play() {
  const { gsap } = useGsap()
  const q = gsap.utils.selector(root.value!)
  const tl = gsap.timeline({ onComplete: () => emit('done') })

  tl.fromTo(root.value, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' })
    .fromTo(
      q('.js-cut'),
      { yPercent: 115 },
      { yPercent: 0, duration: 0.95, ease: 'expo.out', stagger: { each: 0.025, from: 'center' } },
      0.1,
    )
    .fromTo(q('.js-beam'), { xPercent: -140 }, { xPercent: 240, duration: 1.1, ease: 'power2.inOut' }, 0.45)
    .fromTo(q('.js-where'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, 0.75)
    .to(
      root.value,
      { clipPath: 'inset(0 0 100% 0)', duration: 0.7, ease: 'expo.inOut', onStart: () => emit('reveal') },
      '+=0.55',
    )
}

watch(
  () => open,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    if (!root.value) return
    if (prefersReducedMotion()) {
      emit('reveal')
      setTimeout(() => emit('done'), 1400)
      return
    }
    play()
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="root"
      class="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-canvas px-6"
      style="clip-path: inset(0 0 0 0)"
      role="status"
      aria-live="polite"
    >
      <!-- the stage this show will live on, and a scrim so the name reads on it -->
      <span aria-hidden="true" class="absolute inset-0" :style="themeCss(look.theme, accent, look.coverUrl)" />
      <span aria-hidden="true" class="absolute inset-0 bg-black/45" />

      <!-- one house light, crossing once -->
      <span
        aria-hidden="true"
        class="js-beam absolute inset-y-[-30%] left-0 w-1/3 -rotate-12"
        :style="{
          background: `linear-gradient(100deg, transparent, ${tint(accent, '26')} 35%, ${tint(accent, '4D')} 50%, ${tint(accent, '26')} 65%, transparent)`,
        }"
      />

      <div class="relative flex flex-col items-center text-center">
        <p class="sr-only">{{ name }} is published at {{ url }}</p>

        <p
          aria-hidden="true"
          class="flex max-w-[22ch] flex-wrap justify-center gap-x-[0.28em] text-[clamp(2.6rem,9vw,7rem)] font-extrabold uppercase leading-[0.95] tracking-display"
          :style="{ fontFamily: font }"
        >
          <span v-for="(word, w) in words" :key="w" class="flex">
            <span v-for="(char, c) in word" :key="c" class="block overflow-hidden">
              <span class="js-cut block">{{ char }}</span>
            </span>
          </span>
        </p>

        <p class="js-where mt-8 flex max-w-full items-center justify-center gap-2.5 whitespace-nowrap text-sm text-ink-2">
          <span aria-hidden="true" class="h-1.5 w-1.5 rounded-pill" :style="{ background: accent }" />
          {{ url }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
