<script setup lang="ts">
// The basics as Ed's prototype draws them (2026-10-22), split over the colleague's
// steps: name and description on Setup, the zone and the three dates on Schedule.
import { computed, watch } from 'vue'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { FIELD, FREE } from '~/types/award'
import { allTimeZones, zoneCity, zoneOffset } from '#shared/time'
import EnvSelect from './EnvSelect.vue'
import EnvDateTime from './EnvDateTime.vue'

const { part } = defineProps<{ part: 'show' | 'when'; missing?: string[] }>()
const { draft } = useAwardDraft()
const zones = computed(() => {
  const list = allTimeZones()
  if (draft.value.timezone && !list.includes(draft.value.timezone)) list.unshift(draft.value.timezone)
  return list.map((id) => ({ id, label: `${zoneCity(id)} (${zoneOffset(id)})`, sub: id.includes('/') ? id : undefined }))
})

// The dates run in order: opens, closes, ceremony. Each picker starts where the one
// before it ends, and moving an earlier date past a later one pushes the later one on
// by the gap it had, so the show keeps its length (Ed, 2026-10-22).
const nowIso = new Date().toISOString()
const t = (s?: string) => (s ? Date.parse(s) : NaN)
const DAY = 86_400_000
function keepOrder(key: 'closesAt' | 'ceremonyAt', after: string, gap: number) {
  const d = draft.value
  if (!after || !d[key]) return
  if (t(d[key]) <= t(after)) d[key] = new Date(t(after) + gap).toISOString()
}
watch(() => draft.value.opensAt, (now, was) => {
  const gap = was && draft.value.closesAt ? t(draft.value.closesAt) - t(was) : 7 * DAY
  keepOrder('closesAt', now, gap > 0 ? gap : 7 * DAY)
})
watch(() => draft.value.closesAt, (now, was) => {
  const gap = was && draft.value.ceremonyAt ? t(draft.value.ceremonyAt) - t(was) : DAY
  keepOrder('ceremonyAt', now, gap > 0 ? gap : DAY)
})
</script>

<template>
  <section class="cr-sec" :aria-labelledby="`crb-${part}`">
    <div class="cr-sec-h"><div><h2 :id="`crb-${part}`">{{ part === 'show' ? 'The basics' : 'Schedule' }}</h2></div></div>
    <div class="cr-fields">
      <template v-if="part === 'show'">
        <label class="cr-f" data-check="name" :class="missing?.includes('name') && 'is-bad'">
          <span class="cr-l">Awards name <em>{{ draft.name.length }} / {{ FREE.nameLimit }}</em></span>
          <input v-model="draft.name" type="text" :maxlength="FREE.nameLimit" placeholder="Chat Awards 2026" />
          <span class="cr-h">Shown as the page title and on every share image.</span>
        </label>
        <label class="cr-f" data-check="description" :class="missing?.includes('description') && 'is-bad'">
          <span class="cr-l">Description <em>{{ draft.description.length }} / {{ FIELD.descriptionLimit }}</em></span>
          <textarea v-model="draft.description" :maxlength="FIELD.descriptionLimit" rows="3" placeholder="What these awards are for, and who votes." />
          <span class="cr-h">A description is required before publishing. Two sentences is plenty.</span>
        </label>
      </template>
      <template v-else>
        <div class="cr-f">
          <span id="crb-tz" class="cr-l">Time zone</span>
          <EnvSelect v-model="draft.timezone" :options="zones" labelledby="crb-tz" />
          <span class="cr-h">Every date on the page is shown in this zone, and says so.</span>
        </div>
        <div class="cr-dates" data-check="dates" :class="missing?.includes('dates') && 'is-bad'">
          <div class="cr-f"><span class="cr-l">Voting opens</span><EnvDateTime v-model="draft.opensAt" label="Voting opens" :time-zone="draft.timezone" default-time="12:00" :min="nowIso" /></div>
          <div class="cr-f"><span class="cr-l">Voting closes</span><EnvDateTime v-model="draft.closesAt" label="Voting closes" :time-zone="draft.timezone" default-time="21:00" :min="draft.opensAt || nowIso" /></div>
          <div class="cr-f"><span class="cr-l">Ceremony</span><EnvDateTime v-model="draft.ceremonyAt" label="Ceremony" :time-zone="draft.timezone" default-time="20:00" :min="draft.closesAt || draft.opensAt || nowIso" /></div>
        </div>
      </template>
    </div>
  </section>
</template>
