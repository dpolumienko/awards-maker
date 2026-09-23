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
import { nomineeName } from '~/utils/nominee'
import { FORMATS, cardCopy, renderShareCard, type ShareFormat, type ShareRole } from '~/utils/shareCard'
import type { Award } from '~/types/award'

const { award, url, closes = '', winners = {} } = defineProps<{
  award: Award
  url: string
  closes?: string
  /** Nomination id → winning nominee name, once the results are out. */
  winners?: Record<string, string>
}>()

const ROLES: { id: ShareRole; label: string; note: string }[] = [
  { id: 'host', label: 'Host', note: 'You are running this. Post it where your chat is.' },
  { id: 'nominee', label: 'Nominee', note: 'You are on a ballot. Ask your own followers to vote.' },
  { id: 'voter', label: 'Voter', note: 'You voted. This is the one that brings the next voter.' },
]

const role = ref<ShareRole>('host')
const format = ref<ShareFormat>('link')
const nomineeChoice = ref('')

const hasWinners = computed(() => Object.keys(winners).length > 0)
const roles = computed(() =>
  hasWinners.value
    ? [...ROLES, { id: 'winner' as const, label: 'Winner', note: 'The result, one card per category.' }]
    : ROLES,
)

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
          ...cardCopy('nominee', award, { nomination: picked.nomination.title, nominee: picked.name, closes }),
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

// The card shows the address the way a person reads it out, without the scheme.
const plainUrl = computed(() => url.replace(/^https?:\/\//, ''))

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
  const a = document.createElement('a')
  a.href = href
  a.download = `${award.slug}-${role.value}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`.replace(/-+/g, '-')
  a.click()
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

    <!-- a nominee card is about one person, so it asks which one -->
    <label v-if="role === 'nominee'" class="mt-4 block">
      <span class="label">Who are you on this ballot?</span>
      <select
        v-model="nomineeChoice"
        class="mt-2 h-11 w-full max-w-md rounded-btn border border-hair bg-s2 px-3 text-sm text-ink focus:border-gold focus:shadow-focus focus:outline-none"
      >
        <option v-for="n in nominees" :key="n.id" :value="n.id">{{ n.name }} - {{ n.nomination.title }}</option>
      </select>
    </label>

    <div class="mt-6 grid gap-5" :class="format === 'story' ? 'sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-2'">
      <figure v-for="card in cards" :key="card.key" class="m-0">
        <img
          v-if="images[card.key]"
          :src="images[card.key]"
          :alt="`${card.kicker}: ${card.headline}`"
          class="w-full rounded-card border border-hair"
          :width="FORMATS[format].w"
          :height="FORMATS[format].h"
        />
        <span
          v-else
          class="block w-full rounded-card border border-dashed border-hair2"
          :style="{ aspectRatio: `${FORMATS[format].w} / ${FORMATS[format].h}` }"
        />
        <figcaption class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span class="min-w-0 flex-1 truncate text-sm text-ink-2">{{ card.title }}</span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-sm text-gold-text underline underline-offset-4 transition-colors hover:text-ink disabled:opacity-40"
            :disabled="!images[card.key]"
            @click="download(card.key, card.title)"
          >
            Download
            <UiIcon name="chevron-right" :size="12" />
          </button>
        </figcaption>
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
