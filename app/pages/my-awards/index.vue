<script setup lang="ts">
// The list between the builder and the dashboards. A host comes back here for
// three things: what state each awards is in, how close it is to the free
// ceiling, and whether it is waiting on them - which it is, every time voting
// has closed and the winners are still unannounced. A row opens that awards'
// dashboard; the public page is one click further, from there.
import { computed } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import UiBadge from '~/components/ui/UiBadge.vue'
import UiIcon from '~/components/ui/UiIcon.vue'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { useMyAwards, type AwardSummary } from '~/composables/useAwards'
import { phaseOf } from '~/composables/useVoting'
import { FREE } from '~/types/award'
import { formatInZone } from '#shared/time'

const { draft, load, unpublish } = useAwardDraft()
const { data, refresh } = await useMyAwards()

// drafts live in the same table, so the list filters them out and the draft row
// below is built from the one the builder is holding
const published = computed(() => (data.value?.awards ?? []).filter((a) => a.status === 'published'))

onMounted(load)

async function removeAward(slug: string) {
  await unpublish(slug)
  await refresh()
}

const badges = {
  soon: { tone: 'ended' as const, text: 'Not open yet' },
  open: { tone: 'live' as const, text: 'Voting open' },
  capped: { tone: 'ended' as const, text: 'Closed at the limit' },
  counting: { tone: 'results' as const, text: 'Voting closed' },
  revealed: { tone: 'results' as const, text: 'Winners announced' },
}

// UTC instants, shown in the show's own zone
const fmt = (d?: string, zone = 'UTC') => (d ? formatInZone(d, zone, { month: 'short', zone: false }) : '')

/** What happens next, in the host's words. */
function next(a: AwardSummary) {
  switch (phaseOf(a as never, a.voters)) {
    case 'soon':
      return `Opens ${fmt(a.opensAt, a.timezone)}`
    case 'open':
      return a.closesAt ? `Closes ${fmt(a.closesAt, a.timezone)}` : 'Open until you close it'
    case 'counting':
    case 'capped':
      return 'Waiting on you: publish the winners'
    default:
      return a.ceremonyAt ? `Announced ${fmt(a.ceremonyAt, a.timezone)}` : 'Winners announced'
  }
}
const waiting = (a: AwardSummary) => ['counting', 'capped'].includes(phaseOf(a as never, a.voters))

// A draft is not an awards yet, but it is the thing most likely to be abandoned,
// so it gets a row instead of hiding inside a button label.
const hasDraft = computed(() => !!draft.value.name.trim() || draft.value.nominations.some((n) => n.title.trim()))

useSeoMeta({ title: 'Your awards', robots: 'noindex, follow' })
</script>

<template>
  <div class="shell py-10">
    <h1 class="heading">Your awards</h1>

    <div v-if="published.length || hasDraft" class="mt-8 space-y-3">
      <!-- unfinished first: it is the one that goes cold -->
      <NuxtLink
        v-if="hasDraft"
        to="/create"
        class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-dashed border-hair2 bg-s1 p-5 no-underline transition-colors hover:border-gold"
      >
        <UiBadge tone="ended">Not published</UiBadge>
        <span class="text-lg font-semibold">{{ draft.name.trim() || 'Untitled awards' }}</span>
        <span class="tnum text-sm text-ink-muted">{{ draft.nominations.length }} nominations</span>
        <span class="ml-auto flex items-center gap-1.5 text-sm text-gold-text">
          Continue
          <UiIcon name="chevron-right" :size="14" />
        </span>
      </NuxtLink>

      <div
        v-for="a in published"
        :key="a.slug"
        class="relative"
      >
      <NuxtLink
        :to="`/my-awards/${a.slug}`"
        class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border bg-s1 p-5 no-underline transition-colors"
        :class="waiting(a) ? 'border-gold-24 hover:border-gold' : 'border-hair hover:border-gold'"
      >
        <UiBadge :tone="badges[phaseOf(a as never, a.voters)].tone">{{ badges[phaseOf(a as never, a.voters)].text }}</UiBadge>
        <span class="text-lg font-semibold">{{ a.name }}</span>
        <span class="tnum text-sm text-ink-muted">{{ a.categories }} nominations</span>
        <!-- the ceiling is a free-plan thing; a paid show has none -->
        <span v-if="a.tier === 'paid'" class="tnum text-sm text-ink-muted">{{ a.voters }} voters</span>
        <span v-else class="tnum text-sm" :class="a.voters / FREE.maxVoters >= 0.8 ? 'text-warn' : 'text-ink-muted'">
          {{ a.voters }} / {{ FREE.maxVoters }} voters
        </span>
        <span class="text-sm" :class="waiting(a) ? 'text-gold-text' : 'text-ink-muted'">{{ next(a) }}</span>
        <span class="ml-auto flex items-center gap-1.5 pr-24 text-sm text-gold-text">
          Dashboard
          <UiIcon name="chevron-right" :size="14" />
        </span>
      </NuxtLink>
      <!-- publishing used to be one-way: there was no way to take a test show down -->
      <UiConfirmButton
        variant="quiet"
        class="absolute right-5 top-1/2 -translate-y-1/2"
        :aria-label="'Remove ' + a.name"
        @confirm="removeAward(a.slug)"
      />
      </div>
    </div>

    <!-- empty: say what lands here and give the one action, in the same frame -->
    <div v-else class="mt-8 rounded-card border border-dashed border-hair2 p-8 text-center">
      <p class="mx-auto max-w-copy text-ink-2">
        Nothing here yet. Awards you publish show up in this list with their state, their vote count and
        whatever they are waiting on.
      </p>
      <div class="mt-5 flex justify-center">
        <UiButton to="/create">Create your awards</UiButton>
      </div>
    </div>

    <div v-if="published.length || hasDraft" class="mt-8 flex flex-wrap gap-3">
      <UiButton to="/create">{{ hasDraft ? 'Continue your draft' : 'Create your awards' }}</UiButton>
      <UiButton to="/" variant="ghost">Back to the landing</UiButton>
    </div>
  </div>
</template>
