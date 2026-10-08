<script setup lang="ts">
// Share cards for the people an awards show produces: the host who runs it, the
// nominee who wants their followers to vote, the voter who just did, and the
// winners once they are out. Every category gets its own card too - "Clip of the
// Year" travels further than "an awards show" does.
//
// Rebuilt 2026-10-08 (review: "the block looks crippled, host and voter should
// work like the nominee"): every role is the same form - who you are, which card,
// the format - on the left, and the one card it makes on the right, to open,
// download or post. One card drawn at a time instead of a carousel of all.
//
// Cards are drawn in the browser (utils/shareCard.ts) and saved as PNG. No
// server, no waiting, and the card carries the show's own look.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiButton from './UiButton.vue'
import UiSelect from './UiSelect.vue'
import { nomineeName } from '~/utils/nominee'
import { FORMATS, NOMINEE_CTAS, cardCopy, renderShareCard, type ShareFormat, type ShareRole } from '~/utils/shareCard'
import type { Award } from '~/types/award'
import { useVersion } from '~/composables/useVersion'

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

const ROLES: { value: ShareRole; label: string; note: string }[] = [
  { value: 'host', label: 'The host', note: 'You are running this. Post it where your viewers are.' },
  { value: 'nominee', label: 'A nominee', note: 'You are on a ballot. Ask your own followers to vote.' },
  { value: 'voter', label: 'A voter', note: 'You voted. This is the card that brings the next voter.' },
  { value: 'winner', label: 'A winner', note: 'The result, one card per category.' },
]
const hasWinners = computed(() => Object.keys(winners).length > 0)
// A card is a claim about who you are, so the page only offers the ones that are
// true here: the host's card to the host, "I voted" to somebody who voted, the
// winner's card once there are winners.
const roles = computed(() =>
  ROLES.filter((r) => ({ host: isHost, voter: hasVoted, winner: hasWinners.value, nominee: true })[r.value]),
)
const role = ref<ShareRole>(isHost ? 'host' : 'nominee')
watch(roles, (list) => {
  if (!list.some((r) => r.value === role.value)) role.value = list[0]?.value ?? 'nominee'
}, { immediate: true })

/** What the card is about: the whole show or a category, a nominee, a winner. */
const subjects = computed(() => {
  if (role.value === 'nominee') {
    return award.nominations.flatMap((n) =>
      n.nominees.map((x) => ({ value: `${n.id}:${x.id}`, label: `${nomineeName(x)} - ${n.title}`, nomination: n.title, nominee: nomineeName(x) })),
    )
  }
  if (role.value === 'winner') {
    return award.nominations
      .filter((n) => winners[n.id])
      .map((n) => ({ value: n.id, label: `${n.title}: ${winners[n.id]}`, nomination: n.title, nominee: winners[n.id] }))
  }
  return [
    { value: 'all', label: 'The whole show', nomination: undefined, nominee: undefined },
    ...award.nominations.map((n) => ({ value: n.id, label: n.title, nomination: n.title, nominee: undefined })),
  ]
})
const subject = ref('all')
watch(subjects, (list) => {
  if (!list.some((s) => s.value === subject.value)) subject.value = list[0]?.value ?? ''
}, { immediate: true })
const SUBJECT_LABEL: Record<ShareRole, string> = { host: 'Which card', voter: 'Which card', nominee: 'Who are you on this ballot?', winner: 'Which category' }

const nomineeCta = ref<string>(NOMINEE_CTAS[0].id)
const ctaOptions = NOMINEE_CTAS.map((c) => ({ value: c.id as string, label: c.label }))
const format = ref<ShareFormat>('link')
const formatOptions = (Object.keys(FORMATS) as ShareFormat[]).map((id) => ({ value: id, label: `${FORMATS[id].name} - ${FORMATS[id].note}` }))

// the Fanzine draws flyers instead of stage cards
const { isZine } = useVersion()
// The card shows the address the way a person reads it out: no scheme, and none
// of the payload the link carries while there is no backend to look a show up in.
const plainUrl = computed(() => url.replace(/^https?:\/\//, '').split('?')[0]!)

const card = computed(() => {
  const s = subjects.value.find((x) => x.value === subject.value)
  if (!s) return null
  const cta = role.value === 'nominee' ? NOMINEE_CTAS.find((c) => c.id === nomineeCta.value)?.cta || undefined : undefined
  return {
    title: s.label,
    look: award.look,
    url: plainUrl.value,
    href: url,
    format: format.value,
    zine: isZine.value,
    role: role.value,
    ...cardCopy(role.value, award, { nomination: s.nomination, nominee: s.nominee, closes, cta }),
  }
})

const image = ref('')
const drawing = ref(false)
async function draw() {
  if (!import.meta.client || !card.value) return
  drawing.value = true
  image.value = await renderShareCard(card.value)
  drawing.value = false
}
// Drawn after mount, not during setup: flipping `drawing` before hydration
// made the client's first render disagree with the server's.
// a canvas cannot read CSS variables: a default-colour show is repainted when
// the palette switches, or its card stays in the old accent
let palette: MutationObserver | null = null
onMounted(() => {
  watch(card, draw, { immediate: true, deep: true })
  palette = new MutationObserver(() => draw())
  palette.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'data-version'] })
})
onBeforeUnmount(() => palette?.disconnect())

/**
 * A data: URL that long has to come off a Blob: browsers refuse to open one in
 * a tab, and a detached anchor with a multi-megabyte href downloaded nothing.
 */
function blobOf(href: string) {
  const [meta, b64] = href.split(',')
  const bytes = Uint8Array.from(atob(b64!), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: meta!.slice(5).split(';')[0] })
}
const fileName = computed(() =>
  `${award.slug}-${role.value}-${(card.value?.title ?? 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`.replace(/-+/g, '-'),
)
function open() {
  if (!image.value) return
  const href = URL.createObjectURL(blobOf(image.value))
  window.open(href, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(href), 60_000)
}
function download() {
  if (!image.value) return
  const href = URL.createObjectURL(blobOf(image.value))
  const a = document.createElement('a')
  a.href = href
  a.download = fileName.value
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
// The phone's own share sheet takes the image itself; elsewhere it is a post on X
const canShareFile = ref(false)
onMounted(() => {
  try {
    canShareFile.value = !!navigator.canShare?.({ files: [new File([new Blob()], 'x.png', { type: 'image/png' })] })
  } catch {
    canShareFile.value = false
  }
})
const shareText = computed(() => (card.value ? `${card.value.kicker}: ${card.value.headline}` : award.name))
async function shareFile() {
  if (!image.value) return
  const file = new File([blobOf(image.value)], fileName.value, { type: 'image/png' })
  try {
    await navigator.share({ files: [file], text: shareText.value, url })
  } catch {
    /* closed the sheet */
  }
}
</script>

<template>
  <section class="rounded-card border border-hair bg-s1 p-5 sm:p-6">
    <h2 class="text-xl font-semibold">Share cards</h2>
    <p class="mt-1 max-w-copy text-sm text-ink-2">A card for every part you play in this show, and one for every category.</p>

    <div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <!-- the form: the same three questions for every role -->
      <div class="space-y-5">
        <div>
          <UiSelect v-model="role" label="You are" :options="roles" />
          <p class="mt-2 text-sm text-ink-muted">{{ roles.find((r) => r.value === role)?.note }}</p>
        </div>
        <UiSelect v-model="subject" :label="SUBJECT_LABEL[role]" :options="subjects" />
        <UiSelect v-if="role === 'nominee'" v-model="nomineeCta" label="What the card asks for" :options="ctaOptions" />
        <UiSelect v-model="format" label="Format" :options="formatOptions" />
      </div>

      <!-- the card, and what to do with it -->
      <figure class="m-0" :class="format === 'story' && 'max-w-[300px]'">
        <img
          v-if="image"
          :src="image"
          :alt="card ? `${card.kicker}: ${card.headline}` : ''"
          class="w-full rounded-card border border-hair"
          :width="FORMATS[format].w"
          :height="FORMATS[format].h"
        />
        <span v-else class="block w-full rounded-card bg-s2" :style="{ aspectRatio: `${FORMATS[format].w} / ${FORMATS[format].h}` }" />
        <figcaption class="mt-4 flex flex-wrap items-center gap-3">
          <UiButton size="sm" :disabled="!image" @click="download">Download</UiButton>
          <UiButton size="sm" variant="ghost" :disabled="!image" @click="open">Open</UiButton>
          <UiButton v-if="canShareFile" size="sm" variant="ghost" :disabled="!image" @click="shareFile">Share</UiButton>
          <UiButton
            v-else
            size="sm"
            variant="ghost"
            :to="`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`"
          >
            Post on X
          </UiButton>
          <span class="text-sm text-ink-muted" aria-live="polite">{{ drawing ? 'Drawing the card…' : '' }}</span>
        </figcaption>
      </figure>
    </div>
  </section>
</template>
