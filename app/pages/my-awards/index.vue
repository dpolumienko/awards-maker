<script setup lang="ts">
// The list between the builder and the dashboards. A host comes back here for
// three things: what state each awards is in, how close it is to the free
// ceiling, and whether it is waiting on them - which it is, every time voting
// has closed and the winners are still unannounced. A row opens that awards'
// dashboard; the public page is one click further, from there.
import { computed } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { useMyAwards, type AwardSummary } from '~/composables/useAwards'
import { phaseOf } from '~/composables/useVoting'
import { FREE } from '~/types/award'
import { formatInZone } from '#shared/time'
import '~/assets/css/envelope-pages.css'

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

// the prototype's state dots: green while voting runs, brass once results are out
const badges = {
  soon: { cls: 'end', text: 'Not open yet' },
  open: { cls: '', text: 'Voting open' },
  capped: { cls: 'wait', text: 'Closed at the limit' },
  counting: { cls: 'wait', text: 'Voting closed' },
  revealed: { cls: 'res', text: 'Results out' },
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
      return a.ceremonyAt ? `Ceremony done ${fmt(a.ceremonyAt, a.timezone)}` : 'Winners announced'
  }
}
const waiting = (a: AwardSummary) => ['counting', 'capped'].includes(phaseOf(a as never, a.voters))

// A draft is not an awards yet, but it is the thing most likely to be abandoned,
// so it gets a row instead of hiding inside a button label.
const hasDraft = computed(() => !!draft.value.name.trim() || draft.value.nominations.some((n) => n.title.trim()))

useSeoMeta({ title: 'Your awards', robots: 'noindex, follow' })
</script>

<template>
  <div class="shell env-pg">
    <nav class="pg-crumbs" aria-label="Breadcrumb">
      <NuxtLink to="/">Awards Maker</NuxtLink><span aria-hidden="true">/</span><span aria-current="page">Your awards</span>
    </nav>
    <div class="pg-head">
      <div>
        <h1>Your awards</h1>
        <p class="pg-sub">Drafts, live votes and finished shows, all in one place.</p>
      </div>
      <UiButton to="/create">Create your awards</UiButton>
    </div>

    <div v-if="published.length || hasDraft" class="my-list">
      <!-- unfinished first: it is the one that goes cold -->
      <NuxtLink v-if="hasDraft" to="/create" class="my-row">
        <span class="state end">Not published</span>
        <span class="my-nm">{{ draft.name.trim() || 'Untitled awards' }}</span>
        <span class="my-meta tnum">{{ draft.nominations.length }} {{ draft.nominations.length === 1 ? 'nomination' : 'nominations' }}</span>
        <span class="my-meta zero">No voters yet</span>
        <span class="my-next" />
        <span class="my-go">Continue</span>
      </NuxtLink>

      <div v-for="a in published" :key="a.slug" class="my-item has-rm">
        <NuxtLink :to="`/my-awards/${a.slug}`" class="my-row">
          <span class="state" :class="badges[phaseOf(a as never, a.voters)].cls">{{ badges[phaseOf(a as never, a.voters)].text }}</span>
          <span class="my-nm">{{ a.name }}</span>
          <span class="my-meta tnum">{{ a.categories }} {{ a.categories === 1 ? 'nomination' : 'nominations' }}</span>
          <!-- the ceiling is a free-plan thing; a paid show has none -->
          <span v-if="a.tier === 'paid'" class="my-meta tnum" :class="!a.voters && 'zero'">{{ a.voters ? `${a.voters} voters` : 'No voters yet' }}</span>
          <span v-else class="my-meta tnum" :class="a.voters / FREE.maxVoters >= 0.8 && 'near'">{{ a.voters }} / {{ FREE.maxVoters }} voters</span>
          <span v-if="a.offline" class="my-next wait">Offline</span>
          <span v-else class="my-next" :class="waiting(a) && 'wait'">{{ next(a) }}</span>
          <span class="my-go">Dashboard</span>
        </NuxtLink>
        <!-- publishing used to be one-way: there was no way to take a test show down -->
        <UiConfirmButton variant="quiet" class="my-rm" :aria-label="'Remove ' + a.name" @confirm="removeAward(a.slug)" />
      </div>
    </div>

    <!-- empty: say what lands here and give the one action, in the same frame -->
    <div v-else class="pg-empty">
      <p>Nothing here yet. Awards you publish show up in this list with their state, their vote count and whatever they are waiting on.</p>
      <UiButton to="/create">Create your awards</UiButton>
    </div>
  </div>
</template>
