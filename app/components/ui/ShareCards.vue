<script setup lang="ts">
// Share cards for the three people an awards show produces: the host who runs it,
// the nominee who wants their followers to vote, and the voter who just did.
// Every category gets its own card too - "Clip of the Year" travels further than
// "an awards show" does.
//
// Cards are drawn in the browser (utils/shareCard.ts) and downloaded as PNG. No
// server, no waiting, and the card carries the show's own look.
import { computed, ref, watch } from 'vue'
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'
import SnapCarousel from './SnapCarousel.vue'
import { nomineeName } from '~/utils/nominee'
import { FORMATS, NOMINEE_CTAS, cardCopy, renderShareCard, type ShareFormat, type ShareRole } from '~/utils/shareCard'
import type { Award } from '~/types/award'

const { award, url, closes = '', winners = {}, isHost = false, hasVoted = false } = defineProps<{
  award: Award
  url: string
  closes?: string
  /** Nomination id → winning nominee name, once the results are out. */
  winners?: Record<string, string>
  /** Only the host is offered the host's card. */
  isHost?: boolean
  /** "I voted" is a claim; it is only offered to somebody who did. */
  hasVoted?: boolean
}>()

const ROLES: { id: ShareRole; label: string; note: string }[] = [
  { id: 'host', label: 'Host', note: 'You are running this. Post it where your viewers are.' },
  { id: 'nominee', label: 'Nominee', note: 'You are on a ballot. Ask your own followers to vote.' },
  { id: 'voter', label: 'Voter', note: 'You voted. This is the one that brings the next voter.' },
]

const role = ref<ShareRole>(isHost ? 'host' : 'nominee')
const format = ref<ShareFormat>('link')
const nomineeChoice = ref('')
const nomineeCta = ref<string>(NOMINEE_CTAS[0].id)
const ctaText = computed(() => NOMINEE_CTAS.find((c) => c.id === nomineeCta.value)?.cta || undefined)

const hasWinners = computed(() => Object.keys(winners).length > 0)

// A card is a claim about who you are, so the page only offers the ones that are
// true here: the host's card to the host, "I voted" to somebody who voted, the
// winner's card once there are winners.
const roles = computed(() => {
  const out = ROLES.filter((r) => (r.id === 'host' ? isHost : r.id === 'voter' ? hasVoted : true))
  if (hasWinners.value) out.push({ id: 'winner', label: 'Winner', note: 'The result, one card per category.' })
  return out
})
watch(roles, (list) => {
  if (!list.some((r) => r.id === role.value)) role.value = list[0]?.id ?? 'nominee'
}, { immediate: true })

/** Everyone a nominee card could be about, flattened. */
const nominees = computed(() =>
  award.nominations.flatMap((n) => n.nominees.map((x) => ({ id: `${n.id}:${x.id}`, nomination: n, name: nomineeName(x) }))),
)
watch(nominees, (list) => { if (!nomineeChoice.value && list[0]) nomineeChoice.value = list[0].id }, { immediate: true })

/** One card for the whole show, then one per category. */
const cards = computed(() => {
  const picked = nominees.value.find((n) => n.id === nomineeChoice.value)
  const base = { look: award.look, url: plainUrl.value, format: format.value }

  if (role.value === 'nominee') {
    return picked
      ? [{
          key: 'nominee',
          title: `${picked.name} in ${picked.nomination.title}`,
          ...base,
          role: role.value,
          ...cardCopy('nominee', award, { nomination: picked.nomination.title, nominee: picked.name, closes, cta: ctaText.value }),
        }]
      : []
  }

  if (role.value === 'winner') {
    return award.nominations
      .filter((n) => winners[n.id])
      .map((n) => ({
        key: n.id,
        title: n.title,
        ...base,
        role: role.value,
        ...cardCopy('winner', award, { nomination: n.title, nominee: winners[n.id] }),
      }))
  }

  return [
    {
      key: 'all',
      title: 'The whole show',
      ...base,
      role: role.value,
      ...cardCopy(role.value, award, { closes }),
    },
    ...award.nominations.map((n) => ({
      key: n.id,
      title: n.title,
      ...base,
      role: role.value,
      ...cardCopy(role.value, award, { nomination: n.title, closes }),
    })),
  ]
})

// The card shows the address the way a person reads it out: no scheme, and none
// of the payload the link carries while there is no backend to look a show up in.
const plainUrl = computed(() => url.replace(/^https?:\/\//, '').split('?')[0]!)

const images = ref<Record<string, string>>({})
const drawing = ref(false)

async function draw() {
  if (!import.meta.client) return
  drawing.value = true
  const next: Record<string, string> = {}
  for (const card of cards.value) {
    next[card.key] = await renderShareCard(card)
  }
  images.value = next
  drawing.value = false
}
watch(cards, draw, { immediate: true, deep: true })

function download(key: string, title: string) {
  const href = images.value[key]
  if (!href) return
  // A data: URL that long has to come off a Blob, and the anchor has to be in the
  // document: clicking a detached one with a multi-megabyte href downloaded nothing.
  const [meta, b64] = href.split(',')
  const bytes = Uint8Array.from(atob(b64!), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: meta!.slice(5).split(';')[0] })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${award.slug}-${role.value}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`.replace(/-+/g, '-')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const shareText = computed(() => {
  const copy = cardCopy(role.value, award, { closes })
  return `${copy.kicker}: ${copy.headline}`
})
</script>

<template>
  <section class="rounded-card border border-hair bg-s1 p-5 sm:p-6">
    <h2 class="text-xl font-semibold">Share cards</h2>
    <p class="mt-1 max-w-copy text-sm text-ink-2">
      A card for every part you play in this show, and one for every category. Download it, post it,
      the link comes back with people.
    </p>

    <div class="mt-5 flex flex-wrap items-center gap-2">
      <button
        v-for="r in roles"
        :key="r.id"
        type="button"
        class="rounded-pill border px-4 py-2 text-sm transition-colors"
        :class="role === r.id ? 'border-gold bg-gold/[0.12] text-gold-text' : 'border-hair text-ink-2 hover:border-hair2 hover:text-ink'"
        :aria-pressed="role === r.id"
        @click="role = r.id"
      >
        {{ r.label }}
      </button>

      <span class="ml-auto flex items-center gap-2">
        <button
          v-for="(f, id) in FORMATS"
          :key="id"
          type="button"
          class="rounded-pill border px-4 py-2 text-sm transition-colors"
          :class="format === id ? 'border-gold bg-gold/[0.12] text-gold-text' : 'border-hair text-ink-2 hover:border-hair2 hover:text-ink'"
          :aria-pressed="format === id"
          @click="format = id as ShareFormat"
        >
          {{ f.name }}
        </button>
      </span>
    </div>

    <p class="mt-3 text-sm text-ink-muted">{{ roles.find((r) => r.id === role)?.note }}</p>

    <!-- a nominee card is about one person, and it is the one card that asks the
         reader for something - both choices sit on their own line -->
    <div v-if="role === 'nominee'" class="mt-5 grid gap-4 sm:grid-cols-2">
      <label class="block">
        <span class="label">Who are you on this ballot?</span>
        <select
          v-model="nomineeChoice"
          class="mt-2 h-11 w-full rounded-btn border border-hair bg-s2 px-3 text-sm text-ink focus:border-gold focus:shadow-focus focus:outline-none"
        >
          <option v-for="n in nominees" :key="n.id" :value="n.id">{{ n.name }} - {{ n.nomination.title }}</option>
        </select>
      </label>
      <label class="block">
        <span class="label">What the card asks for</span>
        <select
          v-model="nomineeCta"
          class="mt-2 h-11 w-full rounded-btn border border-hair bg-s2 px-3 text-sm text-ink focus:border-gold focus:shadow-focus focus:outline-none"
        >
          <option v-for="c in NOMINEE_CTAS" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
      </label>
    </div>

    <!-- one card at a time, dragged: four thumbnails in a row read as a contact
         sheet, and the card is the thing being chosen, not a line item -->
    <div class="mt-6">
      <SnapCarousel
        v-if="cards.length > 1"
        :key="`${role}-${format}`"
        label="Share cards"
        :count="cards.length"
        :per-view="format === 'story' ? 4 : 2"
        :gap="20"
        :peek="28"
      >
        <template #slide="{ i }">
          <figure class="m-0 flex h-full flex-col overflow-hidden rounded-card border border-hair bg-s1">
            <figcaption class="flex items-center gap-3 border-b border-hair px-4 py-3">
              <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ cards[i]!.title }}</span>
              <button
                type="button"
                class="inline-flex flex-none items-center gap-1.5 text-sm text-gold-text underline underline-offset-4 transition-colors hover:text-ink disabled:opacity-40"
                :disabled="!images[cards[i]!.key]"
                @click="download(cards[i]!.key, cards[i]!.title)"
              >
                Download
                <UiIcon name="chevron-right" :size="12" />
              </button>
            </figcaption>
            <img
              v-if="images[cards[i]!.key]"
              :src="images[cards[i]!.key]"
              :alt="`${cards[i]!.kicker}: ${cards[i]!.headline}`"
              class="w-full"
              :width="FORMATS[format].w"
              :height="FORMATS[format].h"
            />
            <span v-else class="block w-full bg-s2" :style="{ aspectRatio: `${FORMATS[format].w} / ${FORMATS[format].h}` }" />
          </figure>
        </template>
      </SnapCarousel>

      <!-- a single card has nothing to swipe through -->
      <figure
        v-else-if="cards[0]"
        class="m-0 flex flex-col overflow-hidden rounded-card border border-hair bg-s1"
        :class="format === 'story' ? 'max-w-[230px]' : 'max-w-md'"
      >
        <figcaption class="flex items-center gap-3 border-b border-hair px-4 py-3">
          <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ cards[0].title }}</span>
          <button
            type="button"
            class="inline-flex flex-none items-center gap-1.5 text-sm text-gold-text underline underline-offset-4 transition-colors hover:text-ink disabled:opacity-40"
            :disabled="!images[cards[0].key]"
            @click="download(cards[0].key, cards[0].title)"
          >
            Download
            <UiIcon name="chevron-right" :size="12" />
          </button>
        </figcaption>
        <img
          v-if="images[cards[0].key]"
          :src="images[cards[0].key]"
          :alt="`${cards[0].kicker}: ${cards[0].headline}`"
          class="w-full"
          :width="FORMATS[format].w"
          :height="FORMATS[format].h"
        />
        <span v-else class="block w-full bg-s2" :style="{ aspectRatio: `${FORMATS[format].w} / ${FORMATS[format].h}` }" />
      </figure>
    </div>

    <p v-if="drawing" class="mt-4 text-sm text-ink-muted">Drawing the cards…</p>

    <div class="mt-6 flex flex-wrap items-center gap-3 border-t border-hair pt-5">
      <UiButton
        :to="`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`"
        variant="ghost"
        size="sm"
      >
        Post on X
      </UiButton>
      <p class="text-sm text-ink-muted">
        {{ FORMATS[format].note }}. Attach the card you downloaded - a post with an image travels further
        than a link on its own.
      </p>
    </div>
  </section>
</template>
