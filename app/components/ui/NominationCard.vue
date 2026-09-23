<script setup lang="ts">
// One nomination: its title, its nominees, and the two ways to add one.
import { computed, nextTick, ref } from 'vue'
import { fileToStoredImage } from '~/utils/image'
import ChannelSearch from './ChannelSearch.vue'

import PlatformDot from './PlatformDot.vue'
import LivePill from './LivePill.vue'
import { fmtFollowers } from '~/data/channels.mock'
import { PUBLISH, type Channel, type Nomination } from '~/types/award'
import UiIcon from './UiIcon.vue'

const { nomination, index, overFreeLimit = false } = defineProps<{
  nomination: Nomination
  index: number
  overFreeLimit?: boolean
}>()
const emit = defineEmits<{
  'update:title': [string]
  remove: []
  addChannel: [Channel]
  addText: [string]
  addMedia: [{ text: string; url?: string; image?: string }]
  removeNominee: [string]
}>()

// Image and clip nominees are a paid nominee type. They can be added freely and
// carry a Paid mark; what to do about it is decided at publish.
// Removing a nomination takes its nominees with it, so it asks once. Two states
// on one button instead of a dialog: quicker, and nothing to trap focus in.
const confirming = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | undefined
function onRemove() {
  if (confirming.value) {
    clearTimeout(confirmTimer)
    emit('remove')
    return
  }
  confirming.value = true
  confirmTimer = setTimeout(() => (confirming.value = false), 4000)
}

// An image and a clip are the same nominee with different sources: a clip lives
// behind a link, an image lives on the streamer's disk. One block, one name for
// both, and two ways to attach - asking for a "link to the image" was asking
// people to host the file themselves first.
const MAX_MB = 5
const mediaOpen = ref(false)
const mediaText = ref('')
const mediaUrl = ref('')
const mediaImage = ref('')
const mediaFile = ref('')
const mediaError = ref('')
const canAddMedia = computed(() => !!mediaText.value.trim() && (!!mediaImage.value || !!mediaUrl.value.trim()))

async function takeFile(file?: File | null) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    mediaError.value = 'That is not an image. A clip goes in the link field instead.'
    return
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    mediaError.value = `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`
    return
  }
  mediaError.value = ''
  mediaFile.value = file.name
  mediaUrl.value = ''
  // stored, not referenced - a blob: URL does not survive the page that made it
  try {
    mediaImage.value = await fileToStoredImage(file, 1200)
  } catch {
    mediaError.value = 'That image could not be read. Try a PNG or a JPG.'
    mediaFile.value = ''
  }
}
function clearFile() {
  mediaImage.value = ''
  mediaFile.value = ''
}
function onDrop(e: DragEvent) {
  dragging.value = false
  takeFile(e.dataTransfer?.files?.[0])
}
const dragging = ref(false)

function addMedia() {
  if (!canAddMedia.value) return
  emit('addMedia', {
    text: mediaText.value.trim(),
    url: mediaUrl.value.trim() || undefined,
    image: mediaImage.value || undefined,
  })
  mediaText.value = ''
  mediaUrl.value = ''
  mediaImage.value = ''
  mediaFile.value = ''
  mediaError.value = ''
  mediaOpen.value = false
}
const titleInput = ref<HTMLInputElement | null>(null)
defineExpose({
  focusTitle: async () => {
    await nextTick()
    titleInput.value?.focus()
  },
})

const shortMeta = (n: Nomination['nominees'][number]) =>
  n.kind === 'channel' ? n.channel.name : n.text
</script>

<template>
  <div class="rounded-card border bg-s1 p-5" :class="overFreeLimit ? 'border-gold-24' : 'border-hair'">
    <div v-if="overFreeLimit" class="mb-3 flex items-center gap-2">
      <span class="rounded-pill border border-gold-24 px-2 py-0.5 text-[11px] font-bold uppercase tracking-micro text-gold-text">Paid</span>
      <span class="text-sm text-ink-muted">Beyond the free {{ 5 }} nominations</span>
    </div>
    <div class="flex items-center gap-3">
      <span aria-hidden="true" class="tnum grid h-8 w-8 flex-none place-items-center rounded-btn border border-hair2 text-sm font-bold text-ink-muted">
        {{ index + 1 }}
      </span>
      <input
        ref="titleInput"
        :value="nomination.title"
        type="text"
        :aria-label="'Nomination ' + (index + 1) + ' title'"
        placeholder="Nomination title, e.g. Best moment of the year"
        class="h-11 w-full rounded-btn border border-hair bg-s2 px-3 text-base font-semibold text-ink placeholder:font-normal placeholder:text-ink-disabled hover:border-hair2 focus:border-gold focus:shadow-focus focus:outline-none"
        @input="emit('update:title', ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="h-11 flex-none rounded-btn border px-3 text-sm transition-colors"
        :class="confirming ? 'border-danger bg-danger/10 text-danger' : 'border-hair text-ink-muted hover:border-danger hover:text-danger'"
        :aria-label="confirming
          ? 'Confirm removing nomination ' + (index + 1) + ' and its nominees'
          : 'Remove nomination ' + (index + 1)"
        @click="onRemove"
      >
        {{ confirming ? 'Remove?' : 'Remove' }}
      </button>
    </div>

    <ul v-if="nomination.nominees.length" class="mt-4 list-none space-y-2 p-0">
      <li
        v-for="n in nomination.nominees"
        :key="n.id"
        class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-btn border border-hair bg-canvas px-3 py-2.5 text-sm"
      >
        <img
          v-if="n.kind === 'media' && n.image"
          :src="n.image"
          alt=""
          class="h-7 w-7 flex-none rounded-pill object-cover"
        />
        <span v-else aria-hidden="true" class="grid h-7 w-7 flex-none place-items-center rounded-pill bg-s3 text-[11px] font-bold text-ink-muted">
          {{ shortMeta(n).slice(0, 2).toUpperCase() }}
        </span>
        <template v-if="n.kind === 'channel'">
          <span class="font-semibold">{{ n.channel.name }}</span>
          <PlatformDot :platform="n.channel.platform" :label="false" />
          <LivePill v-if="n.channel.live" />
          <span class="text-sm text-ink-2">{{ fmtFollowers(n.channel.followers) }} followers</span>
        </template>
        <template v-else-if="n.kind === 'media'">
          <span class="font-semibold">{{ n.text }}</span>
          <span v-if="n.url" class="max-w-[160px] flex-none truncate text-sm text-ink-muted">{{ n.url }}</span>
          <span class="inline-flex items-center gap-1.5 rounded-pill border border-gold-24 px-2 py-0.5 text-[11px] uppercase tracking-micro text-gold-text">
            <img :src="asset('/img/icons/cat-clip.svg')" alt="" aria-hidden="true" class="h-3 w-3 opacity-70" />
            {{ n.image ? 'Image' : 'Clip' }} · Paid
          </span>
        </template>
        <template v-else>
          <span class="font-semibold">{{ n.text }}</span>
          <span class="rounded-pill border border-hair px-2 py-0.5 text-[11px] uppercase tracking-micro text-ink-muted">Text</span>
        </template>
        <button
          type="button"
          class="ml-auto rounded-btn px-2 py-1 text-sm text-ink-muted transition-colors hover:text-danger"
          :aria-label="'Remove ' + shortMeta(n)"
          @click="emit('removeNominee', n.id)"
        >
          <UiIcon name="close" :size="14" />
        </button>
      </li>
    </ul>

    <div class="mt-3">
      <ChannelSearch @pick="emit('addChannel', $event)" @pick-text="emit('addText', $event)" />
    </div>

    <div class="mt-3">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-btn border border-dashed border-hair2 px-3 py-2 text-sm text-ink-muted transition-colors hover:border-gold-24 hover:text-ink-2"
        :aria-expanded="mediaOpen"
        @click="mediaOpen = !mediaOpen"
      >
        <img :src="asset('/img/icons/cat-clip.svg')" alt="" aria-hidden="true" class="h-4 w-4 opacity-70" />
        Image or clip nominee
        <span class="rounded-pill border border-gold-24 px-2 py-0.5 text-[11px] font-bold uppercase tracking-micro text-gold-text">Paid</span>
      </button>

      <div v-if="mediaOpen" class="mt-3 rounded-btn border border-gold-24 bg-gold/[0.06] p-4">
        <div class="flex flex-wrap items-center gap-2">
          <p class="label">Image or clip nominee</p>
          <span class="rounded-pill border border-gold-24 px-2 py-0.5 text-[11px] font-bold uppercase tracking-micro text-gold-text">Paid</span>
        </div>

        <!-- one name, whichever source it has -->
        <label class="mt-3 block text-sm text-ink-2" :for="'media-name-' + nomination.id">Name on the ballot</label>
        <input
          :id="'media-name-' + nomination.id"
          v-model="mediaText"
          type="text"
          placeholder="The 3am raid"
          class="mt-2 h-11 w-full rounded-btn border border-hair bg-s2 px-3 text-sm text-ink placeholder:text-ink-disabled focus:border-gold focus:shadow-focus focus:outline-none"
        />
        <p class="mt-2 text-sm text-ink-muted">Viewers see this under the nominee - same for a clip and for an image.</p>

        <!-- min-w-0 on both columns: a grid track is min-content wide by default, so
             one long file name with no spaces in it stretched the whole builder -->
        <div class="mt-4 grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <!-- source 1: a file from the computer -->
          <div class="min-w-0">
            <p class="micro mb-2">Upload an image</p>
            <label
              class="flex h-[104px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-btn border border-dashed px-3 text-center text-sm transition-colors"
              :class="dragging ? 'border-gold bg-gold/[0.08] text-ink' : 'border-hair2 bg-canvas text-ink-muted hover:border-gold-24 hover:text-ink-2'"
              @dragover.prevent="dragging = true"
              @dragleave="dragging = false"
              @drop.prevent="onDrop"
            >
              <template v-if="mediaImage">
                <img :src="mediaImage" alt="" class="h-[88px] w-[88px] flex-none rounded-btn object-cover" />
                <span class="min-w-0 flex-1 text-left">
                  <span class="block truncate text-ink">{{ mediaFile }}</span>
                  <span class="block text-ink-muted">Click to replace</span>
                </span>
              </template>
              <span v-else>
                Drop a file or browse
                <span class="mt-1 block text-ink-disabled">PNG or JPG, up to {{ MAX_MB }} MB</span>
              </span>
              <input type="file" accept="image/*" class="sr-only" @change="takeFile(($event.target as HTMLInputElement).files?.[0])" />
            </label>
            <button
              v-if="mediaImage"
              type="button"
              class="mt-2 text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-danger"
              @click="clearFile"
            >
              Remove file
            </button>
          </div>

          <span aria-hidden="true" class="hidden self-center text-sm text-ink-disabled sm:block">or</span>

          <!-- source 2: a link, which is how a clip gets in -->
          <div class="min-w-0">
            <p class="micro mb-2">Paste a clip link</p>
            <input
              v-model="mediaUrl"
              type="url"
              :disabled="!!mediaImage"
              :aria-label="'Clip link for nomination ' + (index + 1)"
              placeholder="https://clips.twitch.tv/..."
              class="h-11 w-full rounded-btn border border-hair bg-s2 px-3 text-sm text-ink placeholder:text-ink-disabled focus:border-gold focus:shadow-focus focus:outline-none disabled:opacity-40"
            />
            <p class="mt-2 text-sm text-ink-muted">
              {{ mediaImage ? 'Remove the file to use a link instead.' : 'A Twitch clip, a YouTube video, or an image already online.' }}
            </p>
          </div>
        </div>

        <p v-if="mediaError" class="mt-3 text-sm text-danger" role="alert">{{ mediaError }}</p>

        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="h-11 rounded-btn bg-gold px-4 text-sm font-bold uppercase tracking-button text-canvas transition-colors hover:bg-gold-pressed disabled:opacity-40"
            :disabled="!canAddMedia"
            @click="addMedia"
          >
            Add nominee
          </button>
          <button type="button" class="text-sm text-ink-muted underline underline-offset-4 hover:text-ink" @click="mediaOpen = false">
            Cancel
          </button>
          <span v-if="!canAddMedia" class="text-sm text-ink-muted">A name and one source - a file or a link.</span>
        </div>
      </div>
    </div>

    <p v-if="nomination.nominees.length < PUBLISH.minNomineesPerNomination" class="mt-3 text-sm text-ink-muted">
      {{ PUBLISH.minNomineesPerNomination - nomination.nominees.length }} more nominee needed before this one counts.
    </p>
  </div>
</template>
