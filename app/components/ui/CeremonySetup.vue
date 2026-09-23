<script setup lang="ts">
// Three choices before going live: the stage, the face, and how a winner arrives.
// A modal earns its place here - it is a deliberate, self-contained setup a host
// opens once before a stream, and every choice is previewed inside it.
import { computed, nextTick, ref, watch } from 'vue'
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'
import { THEMES, themeCss } from '~/data/themes'
import { CEREMONY_FONTS, COVER, REVEALS, type CeremonySettings } from '~/composables/useCeremony'
import { prefersReducedMotion, useGsap } from '~/composables/useReveal'

const { open, settings, accent, name, cover = '' } = defineProps<{
  open: boolean
  settings: CeremonySettings
  accent: string
  /** The show's name, so the preview is the real thing and not lorem. */
  name: string
  /** The uploaded cover, if this show has one - then it is a stage of its own. */
  cover?: string
}>()
const emit = defineEmits<{ close: []; update: [Partial<CeremonySettings>]; start: [] }>()

const STEPS = ['Stage', 'Type', 'Reveal'] as const
const step = ref(0)
const dialog = ref<HTMLElement | null>(null)
const preview = ref<HTMLElement | null>(null)

watch(
  () => open,
  async (isOpen) => {
    if (!isOpen) return
    step.value = 0
    await nextTick()
    dialog.value?.querySelector<HTMLElement>('button')?.focus()
  },
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

/** Replays the chosen reveal on the sample word, so the choice is a thing you see. */
async function playPreview() {
  await nextTick()
  const el = preview.value
  if (!el || prefersReducedMotion()) return
  const { gsap } = useGsap()
  const letters = el.querySelectorAll('.js-p-cut')
  gsap.killTweensOf([el, letters])

  if (settings.reveal === 'cut') {
    gsap.fromTo(letters, { yPercent: 115 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: { each: 0.03, from: 'center' } })
  } else if (settings.reveal === 'spotlight') {
    gsap.fromTo(el, { opacity: 0.15, scale: 0.94, filter: 'blur(6px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' })
  } else {
    gsap.fromTo(el, { rotateX: -92, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.4)', transformPerspective: 700 })
  }
}

watch(() => [settings.reveal, step.value, open] as const, () => open && step.value === 2 && playPreview())

const font = computed(() => `'${settings.font}', Archivo, sans-serif`)
const sample = computed(() => [...(name.trim().split(/\s+/)[0] ?? 'Winner')])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center bg-canvas/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ceremony setup"
      @keydown="onKey"
      @click.self="emit('close')"
    >
      <div ref="dialog" class="w-full max-w-2xl overflow-hidden rounded-card border border-hair bg-s1">
        <div class="flex items-center gap-4 border-b border-hair px-6 py-4">
          <p class="font-semibold">Set up the ceremony</p>
          <ol class="ml-auto flex list-none items-center gap-2 p-0">
            <li v-for="(s, i) in STEPS" :key="s" class="flex items-center gap-2">
              <button
                type="button"
                class="text-[11px] font-semibold uppercase tracking-micro transition-colors"
                :class="i === step ? 'text-ink' : 'text-ink-muted hover:text-ink-2'"
                :aria-current="i === step ? 'step' : undefined"
                @click="step = i"
              >{{ s }}</button>
              <span v-if="i < STEPS.length - 1" aria-hidden="true" class="h-px w-4 bg-hair2" />
            </li>
          </ol>
        </div>

        <!-- what the choice does, at the size it will be seen -->
        <div
          class="grid aspect-[16/7] place-items-center overflow-hidden border-b border-hair"
          :style="themeCss(settings.stage === COVER ? undefined : settings.stage, accent, settings.stage === COVER ? cover : undefined)"
        >
          <p
            ref="preview"
            class="flex gap-[0.04em] px-6 text-center text-[clamp(1.8rem,5vw,3.4rem)] font-extrabold uppercase leading-none"
            :style="{ fontFamily: font, color: '#fff' }"
          >
            <span v-for="(c, i) in sample" :key="i" class="block overflow-hidden">
              <span class="js-p-cut block">{{ c }}</span>
            </span>
          </p>
        </div>

        <div class="p-6">
          <!-- 1. stage -->
          <div v-if="step === 0" class="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <!-- a show with a cover keeps it unless the host picks otherwise -->
            <button
              v-if="cover"
              type="button"
              class="group flex flex-col gap-2 text-left"
              :aria-pressed="settings.stage === COVER"
              @click="emit('update', { stage: COVER })"
            >
              <span
                class="block h-12 overflow-hidden rounded-btn border transition-colors"
                :class="settings.stage === COVER ? 'border-ink' : 'border-hair group-hover:border-hair2'"
              >
                <img :src="cover" alt="" class="h-full w-full object-cover" />
              </span>
              <span class="text-xs" :class="settings.stage === COVER ? 'text-ink' : 'text-ink-muted'">Your cover</span>
            </button>
            <button
              v-for="t in THEMES"
              :key="t.id"
              type="button"
              class="group flex flex-col gap-2 text-left"
              :aria-pressed="settings.stage === t.id"
              @click="emit('update', { stage: t.id })"
            >
              <span
                class="block h-12 rounded-btn border transition-colors"
                :class="settings.stage === t.id ? 'border-ink' : 'border-hair group-hover:border-hair2'"
                :style="themeCss(t.id, accent)"
              />
              <span class="text-xs" :class="settings.stage === t.id ? 'text-ink' : 'text-ink-muted'">{{ t.name }}</span>
            </button>
          </div>

          <!-- 2. type -->
          <div v-else-if="step === 1" class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="f in CEREMONY_FONTS"
              :key="f"
              type="button"
              class="flex items-center justify-between gap-3 rounded-btn border px-4 py-3 text-left transition-colors"
              :class="settings.font === f ? 'border-ink' : 'border-hair hover:border-hair2'"
              :aria-pressed="settings.font === f"
              @click="emit('update', { font: f })"
            >
              <span class="truncate text-xl" :style="{ fontFamily: `'${f}', Archivo, sans-serif` }">{{ f }}</span>
              <UiIcon v-show="settings.font === f" name="check" :size="14" class="flex-none" />
            </button>
          </div>

          <!-- 3. reveal -->
          <div v-else class="grid gap-3 sm:grid-cols-3">
            <button
              v-for="r in REVEALS"
              :key="r.id"
              type="button"
              class="flex h-full flex-col rounded-btn border p-4 text-left transition-colors"
              :class="settings.reveal === r.id ? 'border-ink' : 'border-hair hover:border-hair2'"
              :aria-pressed="settings.reveal === r.id"
              @click="emit('update', { reveal: r.id })"
            >
              <span class="grid grid-cols-[minmax(0,1fr)_14px] items-center gap-2 font-semibold">
                <span class="min-w-0">{{ r.name }}</span>
                <UiIcon v-show="settings.reveal === r.id" name="check" :size="14" />
              </span>
              <span class="mt-1 text-sm text-ink-2">{{ r.blurb }}</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 border-t border-hair px-6 py-4">
          <UiButton v-if="step > 0" variant="ghost" size="sm" @click="step -= 1">Back</UiButton>
          <UiButton v-if="step < 2" size="sm" @click="step += 1">Next</UiButton>
          <UiButton v-else size="sm" @click="emit('start')">Start the show</UiButton>
          <button
            type="button"
            class="ml-auto text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
