<script setup lang="ts">
// Live preview of the awards page being built. Same anatomy as the landing's
// AwardPagePreview - cover band, host row, ballot, category list - but fed by the
// draft instead of mock data. Empty fields show as placeholders, never as blanks.
import { computed, ref, watch } from 'vue'
import UiBadge from './UiBadge.vue'
import PlatformDot from './PlatformDot.vue'
import { nomineeName, nomineeSub } from '~/utils/nominee'
import { themeCss } from '~/data/themes'
import { accentText } from '~/utils/accent'
import { FREE, type Award } from '~/types/award'
import UiIcon from './UiIcon.vue'
import PartnerChip from './PartnerChip.vue'
import MediaLightbox from './MediaLightbox.vue'

const { award, state = 'draft', signedIn = false } = defineProps<{
  award: Award
  state?: 'draft' | 'published'
  signedIn?: boolean
}>()

const picked = ref<string | null>(null)
// Same rule as the real ballot: an image is looked at, not guessed from a thumb.
const viewing = ref<{ src?: string; url?: string; title: string } | null>(null)
// The Look settings are paid, but the preview honours them immediately - that is
// the whole point of letting people try them before the bill.
const accent = computed(() => award.look?.accent || '#D9A441')
// Accent as type has to clear 4.5:1; as a fill it stays exactly as picked.
const ink = computed(() => accentText(accent.value))
const headlineFont = computed(() =>
  award.look?.font ? `'${award.look.font}', Archivo, sans-serif` : undefined,
)
const title = computed(() => award.name.trim() || 'Your awards name')

// The ballot pages through the nominations instead of printing all of them: a
// show with ten categories would otherwise bury everything under it.
const at = ref(0)
const current = computed(() => award.nominations[Math.min(at.value, award.nominations.length - 1)])
const total = computed(() => award.nominations.length)
watch(total, () => (at.value = Math.min(at.value, Math.max(0, total.value - 1))))
const step = (d: number) => (at.value = (at.value + d + total.value) % total.value)
const label = (n?: { title: string }) => n?.title.trim() || 'Your first nomination'

// The summary list is paged the same way the ballot is: nine categories used to
// push the preview past the bottom of the page and keep growing.
const PER_PAGE = 5
const listAt = ref(0)
const listPages = computed(() => Math.max(1, Math.ceil(award.nominations.length / PER_PAGE)))
const listSlice = computed(() =>
  award.nominations
    .map((n, i) => ({ n, i }))
    .slice(listAt.value * PER_PAGE, listAt.value * PER_PAGE + PER_PAGE),
)
watch(listPages, () => (listAt.value = Math.min(listAt.value, listPages.value - 1)))
const stepList = (d: number) => (listAt.value = (listAt.value + d + listPages.value) % listPages.value)

const partners = computed(() => award.partners.filter((p) => p.name.trim()))

// There is no "draft" state in the product - a page is either not published yet
// or live - so the preview shows the badge the published page will carry.
const badge = computed(() => {
  const opens = award.opensAt ? new Date(award.opensAt) : null
  if (opens && opens.getTime() > Date.now()) {
    return { tone: 'ended' as const, text: `Opens ${opens.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` }
  }
  return { tone: 'live' as const, text: 'Voting open' }
})

const countdown = computed(() => {
  if (!award.closesAt) return null
  const diff = new Date(award.closesAt).getTime() - Date.now()
  if (Number.isNaN(diff) || diff <= 0) return null
  const days = Math.floor(diff / 86_400_000)
  const hrs = Math.floor((diff % 86_400_000) / 3_600_000)
  return { days: String(days).padStart(2, '0'), hrs: String(hrs).padStart(2, '0') }
})
</script>

<template>
  <div class="overflow-hidden rounded-card border border-hair bg-s1">
    <!-- cover band, the same treatment a published page gets -->
    <div class="relative h-28" :style="themeCss(award.look?.theme, accent, award.look?.coverUrl)">
      <img
        v-if="!award.look?.coverUrl && !award.look?.theme"
        :src="asset('/img/icons/cat-clip.svg')"
        alt=""
        aria-hidden="true"
        class="absolute -right-4 -top-3 h-32 w-32 opacity-20"
      />
      <span aria-hidden="true" class="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.85))]" />
      <!-- the host reads as a channel, not as a user chip: their name at reading
           size with the platform cue, and the avatar only once there is an
           account behind it -->
      <span class="absolute bottom-3 left-5 flex items-center gap-2">
        <span
          v-if="signedIn"
          aria-hidden="true"
          class="grid h-6 w-6 place-items-center rounded-pill text-[11px] font-bold"
          :style="{ background: accent, color: '#000' }"
        >
          {{ award.host.name.slice(0, 2).toUpperCase() }}
        </span>
        <span class="text-sm font-semibold">{{ award.host.name }}</span>
        <PlatformDot :platform="award.host.platform" :label="false" />
      </span>
      <span class="absolute right-4 top-4">
        <UiBadge :tone="badge.tone">{{ badge.text }}</UiBadge>
      </span>
    </div>

    <div class="p-6">
      <p
        class="text-[32px] font-bold uppercase leading-[1.05] tracking-heading"
        :class="!award.name.trim() && 'text-ink-muted'"
        :style="{ fontFamily: headlineFont }"
      >
        {{ title }}
      </p>
      <span aria-hidden="true" class="mt-3 block h-0.5 w-16" :style="{ background: accent }" />
      <p class="mt-2 text-sm text-ink-2">
        {{ award.description.trim() || 'Your description shows up here, under the title.' }}
      </p>

      <!-- partners ride high, under the description: nobody scrolls to the end of
           a ballot to find out who paid for the show -->
      <div v-if="partners.length" class="mt-5 flex flex-wrap items-center gap-2">
        <span class="micro mr-1">Partners</span>
        <PartnerChip v-for="p in partners" :key="p.id" :partner="p" :accent="accent" />
      </div>

      <!-- the ballot: this is what a viewer taps -->
      <div class="mt-6 flex items-center gap-3">
        <p class="label truncate">{{ label(current) }}</p>
        <div v-if="total > 1" class="ml-auto flex flex-none items-center gap-2">
          <span class="tnum text-xs text-ink-muted">{{ at + 1 }} / {{ total }}</span>
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-btn border border-hair text-ink-muted transition-colors hover:border-gold hover:text-ink"
            aria-label="Previous nomination"
            @click="step(-1)"
          ><UiIcon name="chevron-left" /></button>
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-btn border border-hair text-ink-muted transition-colors hover:border-gold hover:text-ink"
            aria-label="Next nomination"
            @click="step(1)"
          ><UiIcon name="chevron-right" /></button>
        </div>
      </div>
      <div v-if="current?.nominees.length" class="mt-3 flex flex-col gap-2">
        <div v-for="n in current.nominees" :key="n.id" class="flex items-stretch gap-2">
        <button
          type="button"
          :aria-pressed="picked === n.id"
          class="flex min-w-0 flex-1 items-center gap-3 rounded-btn border p-3 text-left transition-[background-color,border-color] duration-200"
          :class="picked === n.id ? 'bg-gold/[0.12]' : 'border-hair bg-s1 hover:border-hair2 hover:bg-s2'"
          :style="picked === n.id ? { borderColor: accent } : undefined"
          @click="picked = n.id"
        >
          <img v-if="n.kind === 'media' && n.image" :src="n.image" alt="" class="h-10 w-14 flex-none rounded-btn object-cover" />
          <span v-else aria-hidden="true" class="grid h-8 w-8 flex-none place-items-center rounded-pill bg-s3 text-[13px] font-bold text-ink-muted">
            {{ nomineeName(n).slice(0, 2).toUpperCase() }}
          </span>
          <span>
            <span class="block font-semibold">{{ nomineeName(n) }}</span>
            <span class="block text-[13px] text-ink-muted">{{ nomineeSub(n) }}</span>
          </span>
          <span
            aria-hidden="true"
            class="ml-auto grid h-5 w-5 place-items-center rounded-btn text-[12px] font-extrabold text-canvas transition-transform duration-300 ease-gala"
            :style="{ background: accent }"
            :class="picked === n.id ? 'scale-100' : 'scale-0'"
          ><UiIcon name="check" :size="12" /></span>
        </button>
        <button
          v-if="n.kind === 'media' && n.image"
          type="button"
          class="flex flex-none items-center rounded-btn border border-hair px-3 text-[13px] text-ink-2 transition-colors hover:border-gold hover:text-ink"
          @click="viewing = { src: n.image, title: nomineeName(n) }"
        >
          View
        </button>
        <button
          v-else-if="n.kind === 'media' && n.url"
          type="button"
          class="flex flex-none items-center rounded-btn border border-hair px-3 text-[13px] text-ink-2 no-underline transition-colors hover:border-gold hover:text-ink"
          @click="viewing = { url: n.url, title: nomineeName(n) }"
        >
          Play clip
        </button>
        </div>
      </div>
      <div v-else class="mt-3 rounded-btn border border-dashed border-hair2 px-4 py-6 text-center text-sm text-ink-muted">
        Nominees you add appear here, as your viewers will see them.
      </div>
      <p class="mt-4 text-sm text-ink-muted">One vote per category, Twitch login on submit</p>

      <!-- everything below the ballot: dates, the rest of the card -->
      <div class="mt-6 grid gap-6 border-t border-hair pt-6 sm:grid-cols-2">
        <div>
          <p class="label" :style="{ color: ink }">Voting closes in</p>
          <div v-if="countdown" class="mt-2 flex gap-2">
            <span class="min-w-[64px] rounded-btn border border-hair px-3 py-2 text-center">
              <b class="tnum block text-2xl font-bold leading-none">{{ countdown.days }}</b>
              <span class="micro">Days</span>
            </span>
            <span class="min-w-[64px] rounded-btn border border-hair px-3 py-2 text-center">
              <b class="tnum block text-2xl font-bold leading-none">{{ countdown.hrs }}</b>
              <span class="micro">Hrs</span>
            </span>
          </div>
          <p v-else class="mt-2 text-sm text-ink-muted">Set a closing date to start the clock.</p>
        </div>

        <div>
          <div class="flex items-center gap-3">
            <p class="label">Nominations</p>
            <div v-if="listPages > 1" class="ml-auto flex flex-none items-center gap-2">
              <span class="tnum text-xs text-ink-muted">{{ listAt + 1 }} / {{ listPages }}</span>
              <button
                type="button"
                class="grid h-6 w-6 place-items-center rounded-btn border border-hair text-ink-muted transition-colors hover:border-gold hover:text-ink"
                aria-label="Previous nominations"
                @click="stepList(-1)"
              ><UiIcon name="chevron-left" :size="12" /></button>
              <button
                type="button"
                class="grid h-6 w-6 place-items-center rounded-btn border border-hair text-ink-muted transition-colors hover:border-gold hover:text-ink"
                aria-label="Next nominations"
                @click="stepList(1)"
              ><UiIcon name="chevron-right" :size="12" /></button>
            </div>
          </div>
          <ul class="mt-2 list-none p-0">
            <li
              v-for="{ n, i } in listSlice"
              :key="n.id"
              class="flex items-center justify-between gap-3 border-b border-hair py-2 text-sm last:border-b-0"
            >
              <span class="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  class="block h-1.5 w-1.5 flex-none rounded-pill transition-opacity"
                  :style="{ background: accent, opacity: n.id === current?.id ? 1 : 0.25 }"
                />
                <span class="truncate" :class="!n.title.trim() && 'text-ink-muted'">{{ n.title.trim() || 'Untitled' }}</span>
                <span
                  v-if="i >= FREE.maxNominations"
                  class="flex-none rounded-pill border border-gold-24 px-1.5 text-[10px] font-bold uppercase tracking-micro text-gold-text"
                >Paid</span>
              </span>
              <span class="tnum text-sm" :style="n.nominees.length ? { color: ink } : undefined">{{ n.nominees.length }}</span>
            </li>
          </ul>
        </div>
      </div>


      <MediaLightbox
        :open="!!viewing"
        :src="viewing?.src ?? ''"
        :url="viewing?.url ?? ''"
        :title="viewing?.title ?? ''"
        @close="viewing = null"
      />
    </div>
  </div>
</template>
