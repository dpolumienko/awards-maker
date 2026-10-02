<script setup lang="ts">
// One countdown, two shapes. Three number blocks need about 250px; at 200% text
// on a 320px screen they do not get it, so below `sm` the same numbers read as
// one line. Same markup either way, so nothing is hidden from anyone.
// The Fanzine prints only the line: three number tiles are a scoreboard, and a
// printed page states the date (design review 2026-10-01).
import { useVersion } from '~/composables/useVersion'

const { isZine } = useVersion()
defineProps<{
  label: string
  days: string
  hrs: string
  mins: string
  /** Accent, already lightened for type by utils/accent. */
  ink: string
}>()
</script>

<template>
  <div>
    <p class="label" :style="{ color: ink }">{{ label }}</p>
    <p class="tnum mt-2 text-xl font-bold" :class="!isZine && 'sm:hidden'">{{ days }}d {{ hrs }}h {{ mins }}m</p>
    <div v-if="!isZine" class="mt-2 hidden flex-wrap items-end gap-2 sm:flex">
      <span
        v-for="u in [{ v: days, n: 'Days' }, { v: hrs, n: 'Hrs' }, { v: mins, n: 'Min' }]"
        :key="u.n"
        class="min-w-[56px] rounded-btn border border-hair px-3 py-2 text-center"
      >
        <b class="tnum block text-2xl font-bold leading-none">{{ u.v }}</b>
        <span class="micro">{{ u.n }}</span>
      </span>
    </div>
  </div>
</template>
