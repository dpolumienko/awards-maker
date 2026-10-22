<script setup lang="ts">
// Three choices before going live: the stage, the face, and how a winner arrives.
// A modal earns its place here - it is a deliberate, self-contained setup a host
// opens once before a stream, and every choice is previewed inside it.
import { computed, nextTick, ref, watch } from 'vue'
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'
import { THEMES, themeCss } from '~/data/themes'
import { CEREMONY_FONTS, COVER, IMAGE, REVEALS, stageImage, type CeremonySettings } from '~/composables/useCeremony'
import { prefersReducedMotion, useGsap } from '~/composables/useReveal'
import { playRevealMotion } from '~/utils/revealMotion'
import { ImageError, fileToStoredImage } from '~/utils/image'

const { open, settings, accent, name, cover = '', hasPartners = false } = defineProps<{
  open: boolean
  settings: CeremonySettings
  accent: string
  /** The show's name, so the preview is the real thing and not lorem. */
  name: string
  /** The uploaded cover, if this show has one - then it is a stage of its own. */
  cover?: string
  /** the switch for the partners' corner only shows when there are partners */
  hasPartners?: boolean
}>()
const emit = defineEmits<{ close: []; update: [Partial<CeremonySettings>]; start: [] }>()

const STEPS = [
  { id: 'Stage', note: 'The background behind every slide of the show.' },
  { id: 'Type', note: 'The face the category and the winner are set in.' },
  { id: 'Reveal', note: 'How the winner arrives when you click.' },
] as const
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
  gsap.killTweensOf([el, letters, el.parentElement])
  gsap.set([el, letters], { clearProps: 'all' })
  playRevealMotion(gsap, settings.reveal, { line: el, letters, stage: el.parentElement })
}

// The stage can be a picture of the host's own, uploaded right here (review
// 2026-10-08: "the setup lost the way to put an image behind the stage")
const picture = computed(() => stageImage(settings, cover))
const uploading = ref(false)
const pictureError = ref('')
async function pickPicture(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  pictureError.value = ''
  uploading.value = true
  try {
    emit('update', { stage: IMAGE, image: await fileToStoredImage(file, 1920) })
  } catch (err) {
    pictureError.value = err instanceof ImageError ? err.message : 'That image could not be read. Try a PNG or a JPG.'
  } finally {
    uploading.value = false
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
      <div ref="dialog" class="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-card border border-hair bg-s1">
        <div class="flex items-center gap-4 border-b border-hair px-6 py-4">
          <p class="font-semibold">Set up the ceremony</p>
          <ol class="ml-auto flex list-none items-center gap-2 p-0">
            <li v-for="(s, i) in STEPS" :key="s.id" class="flex items-center gap-2">
              <button
                type="button"
                class="text-[11px] font-semibold uppercase tracking-micro transition-colors"
                :class="i === step ? 'text-ink' : 'text-ink-muted hover:text-ink-2'"
                :aria-current="i === step ? 'step' : undefined"
                @click="step = i"
              >{{ s.id }}</button>
              <span v-if="i < STEPS.length - 1" aria-hidden="true" class="h-px w-4 bg-hair2" />
            </li>
          </ol>
        </div>

        <!-- what the choice does, at the size it will be seen -->
        <div
          class="grid aspect-[16/7] place-items-center overflow-hidden border-b border-hair"
          :style="themeCss(picture ? undefined : settings.stage, accent, picture)"
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
          <p class="mb-4 text-sm text-ink-2">{{ STEPS[step]!.note }}</p>

          <!-- 1. stage: one row, however many there are -->
          <div v-if="step === 0">
          <div class="grid grid-cols-4 gap-3 sm:grid-cols-8">
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
            <!-- a picture of the host's own: uploaded here, kept with the ceremony -->
            <button
              v-if="settings.image"
              type="button"
              class="group flex flex-col gap-2 text-left"
              :aria-pressed="settings.stage === IMAGE"
              @click="emit('update', { stage: IMAGE })"
            >
              <span
                class="block h-12 overflow-hidden rounded-btn border transition-colors"
                :class="settings.stage === IMAGE ? 'border-ink' : 'border-hair group-hover:border-hair2'"
              >
                <img :src="settings.image" alt="" class="h-full w-full object-cover" />
              </span>
              <span class="text-xs" :class="settings.stage === IMAGE ? 'text-ink' : 'text-ink-muted'">Your picture</span>
            </button>
            <label v-else class="group flex cursor-pointer flex-col gap-2 text-left">
              <span class="grid h-12 place-items-center rounded-btn border border-dashed border-hair2 text-xl leading-none text-ink-muted transition-colors group-hover:border-ink-muted group-hover:text-ink">+</span>
              <span class="text-xs text-ink-muted">{{ uploading ? 'Uploading…' : 'Upload' }}</span>
              <input type="file" accept="image/*" class="sr-only" @change="pickPicture" />
            </label>
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
          <p v-if="pictureError" class="mt-3 text-sm text-danger">{{ pictureError }}</p>
          <label v-else-if="settings.image" class="mt-3 inline-block cursor-pointer text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
            {{ uploading ? 'Uploading…' : 'Replace your picture' }}
            <input type="file" accept="image/*" class="sr-only" @change="pickPicture" />
          </label>
          <!-- sponsors on stream: a corner of every slide, the host's to switch off -->
          <label v-if="hasPartners" class="mt-5 flex cursor-pointer items-start gap-3 border-t border-hair pt-4 text-sm">
            <input
              type="checkbox"
              :checked="settings.partners"
              class="mt-0.5 h-5 w-5 flex-none rounded-btn border border-hair2 bg-s2 accent-gold focus:shadow-focus focus:outline-none"
              @change="emit('update', { partners: ($event.target as HTMLInputElement).checked })"
            />
            <span>
              <b class="font-semibold">Show the partners</b>
              <span class="block text-ink-muted">Their names and logos sit in the bottom right corner of every slide.</span>
            </span>
          </label>
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
          <!-- seven ways in: one row each, so none wraps and no cell sits empty -->
          <div v-else class="grid gap-2">
            <button
              v-for="r in REVEALS"
              :key="r.id"
              type="button"
              class="grid grid-cols-[8.5rem_minmax(0,1fr)_14px] items-baseline gap-3 rounded-btn border px-4 py-2.5 text-left transition-colors"
              :class="settings.reveal === r.id ? 'border-ink' : 'border-hair hover:border-hair2'"
              :aria-pressed="settings.reveal === r.id"
              @click="emit('update', { reveal: r.id })"
            >
              <span class="font-semibold">{{ r.label }}</span>
              <span class="text-sm text-ink-2">{{ r.note }}</span>
              <UiIcon v-show="settings.reveal === r.id" name="check" :size="14" class="self-center" />
            </button>
            <!-- the numbers are the host's to say or not (review 2026-10-08) -->
            <label class="col-span-full mt-2 flex cursor-pointer items-start gap-3 border-t border-hair pt-4 text-sm">
              <input
                type="checkbox"
                :checked="settings.counts"
                class="mt-0.5 h-5 w-5 flex-none rounded-btn border border-hair2 bg-s2 accent-gold focus:shadow-focus focus:outline-none"
                @change="emit('update', { counts: ($event.target as HTMLInputElement).checked })"
              />
              <span>
                <b class="font-semibold">Show the votes</b>
                <span class="block text-ink-muted">The winner's screen says how many votes and what share, and the rest get their %.</span>
              </span>
            </label>
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
