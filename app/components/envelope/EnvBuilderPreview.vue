<script setup lang="ts">
// The Envelope builder's live preview (Ed's prototype, 2026-10-22): the page in
// miniature as the dark room it is - the theme lit from the top, the host, the
// name, the dates and the categories - and a button that opens the whole page.
import { computed } from 'vue'
import type { Award } from '~/types/award'
import { envelopeDarkCss } from '~/data/themes'
import { accentOf } from '~/utils/accent'
import { formatInZone } from '#shared/time'
import { nomineeName } from '~/utils/nominee'
import '~/assets/css/envelope-builder.css'

const { award, signedIn = false } = defineProps<{ award: Award; signedIn?: boolean }>()
defineEmits<{ full: [] }>()

const accent = computed(() => accentOf(award.look))
const bg = computed(() => envelopeDarkCss(award.look?.theme, accent.value, award.look?.coverUrl, award.look?.bg, false))
const PF = { twitch: 'tw', kick: 'kk', youtube: 'yt' } as const
const pf = computed(() => PF[award.host.platform as keyof typeof PF] ?? 'tw')
const font = computed(() => (award.look?.font ? `'${award.look.font}', var(--font-body), sans-serif` : undefined))
const short = (iso: string) => (iso ? formatInZone(iso, award.timezone, { month: 'short', zone: false }) : 'Set a date')
const cats = computed(() => award.nominations.filter((n) => n.title.trim() || n.nominees.length))
</script>

<template>
  <div class="ebp">
    <div class="ebp-bg" :class="award.look?.coverUrl && 'has-cover'" :style="{ background: bg, '--ga': accent }" aria-hidden="true"><i class="ebp-glow" /></div>
    <span class="ebp-chip">Live preview</span>
    <div class="ebp-body">
      <div class="ebp-host">
        <span v-if="!award.look?.hideLogo && award.host.name" class="ebp-av">{{ award.host.name.slice(0, 2).toUpperCase() }}</span>
        <i class="pf" :class="pf" aria-hidden="true" />
        <b>{{ award.host.name || 'your_channel' }}</b>
        <span class="ebp-state">{{ signedIn ? 'Voting open' : 'Preview' }}</span>
      </div>
      <h3 :style="font ? { fontFamily: font } : undefined" :class="!award.name.trim() && 'is-empty'">{{ award.name.trim() || 'Your awards name' }}</h3>
      <p class="ebp-desc">{{ award.description.trim() || 'Your description goes here.' }}</p>
      <dl class="ebp-facts">
        <div><dt>Closes</dt><dd>{{ short(award.closesAt) }}</dd></div>
        <div><dt>Ceremony</dt><dd>{{ short(award.ceremonyAt) }}</dd></div>
      </dl>
      <ol class="ebp-cats">
        <li v-if="!cats.length" class="empty">Your nominations show up here</li>
        <li v-for="n in cats.slice(0, 5)" :key="n.id">
          <b>{{ n.title.trim() || 'Untitled category' }}</b>
          <span class="ebp-dots">
            <i v-for="x in n.nominees.slice(0, 4)" :key="x.id" :title="nomineeName(x)" />
          </span>
          <span class="tnum">{{ n.nominees.length }}</span>
        </li>
        <li v-if="cats.length > 5" class="more">+ {{ cats.length - 5 }} more</li>
      </ol>
      <span class="ebp-btn" aria-hidden="true">Start voting</span>
    </div>
  </div>
  <button type="button" class="ebp-full" @click="$emit('full')"><i aria-hidden="true" />Open full preview</button>
</template>
