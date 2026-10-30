<script setup lang="ts">
// Partners, the prototype's rows: name, link, remove.
import { nextTick } from 'vue'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { partnerHref } from '~/utils/partnerIcon'

const { draft, addPartner, removePartner } = useAwardDraft()
async function add() {
  addPartner()
  await nextTick()
  const rows = document.querySelectorAll<HTMLInputElement>('.cr-partner input[data-pn]')
  rows[rows.length - 1]?.focus()
}
</script>

<template>
  <section class="cr-sec" aria-labelledby="crp-h">
    <div class="cr-sec-h"><div><h2 id="crp-h">Partners<span class="cr-opt">Optional</span></h2><p>Anyone backing the show. Links are checked before they go live.</p></div></div>
    <div v-if="draft.partners.length" class="cr-partners">
      <div v-for="p in draft.partners" :key="p.id" class="cr-partner">
        <input v-model="p.name" type="text" data-pn placeholder="Loot Energy" aria-label="Partner name" />
        <input v-model="p.url" type="url" placeholder="https://" aria-label="Partner link" @blur="p.url = partnerHref(p.url) || p.url" />
        <button class="cr-x" type="button" :aria-label="`Remove partner ${p.name || ''}`" @click="removePartner(p.id)" />
      </div>
    </div>
    <button class="btn sm" type="button" @click="add">Add partner</button>
  </section>
</template>
