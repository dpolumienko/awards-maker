<script setup lang="ts">
// Blank forms are where builders die. Three prepared packs fill the categories in
// one click; "Or pick single ideas" opens the chips right here and adds one idea
// at a time - it never leaves the builder (Ed, 2026-10-22).
import { ref } from 'vue'
import { TEMPLATES, type AwardTemplate } from '~/data/templates'
import { IDEA_GROUPS } from '~/data/ideas'
import PaywallNote from './PaywallNote.vue'
import UiMaskIcon from './UiMaskIcon.vue'
import { FREE } from '~/types/award'

// Six chips per group is as much as fits under the form without turning the
// builder into a catalogue.
const ideaChips = IDEA_GROUPS.map((g) => ({ ...g, items: g.items.slice(0, 6) }))

const { used, active } = defineProps<{ used: number; active?: string; compact?: boolean; env?: boolean }>()
const emit = defineEmits<{ apply: [AwardTemplate]; addIdea: [string] }>()

const openIdeas = ref(false)
const added = ref(new Set<string>())
// `applied` is the momentary "it landed" flash; `active` is the pack the draft is
// actually built on, and it stays lit until another pack replaces it.
const applied = ref<string | null>(null)

function apply(t: AwardTemplate) {
  emit('apply', t)
  applied.value = t.id
  setTimeout(() => (applied.value = null), 2400)
}
function addIdea(item: string) {
  emit('addIdea', item)
  added.value = new Set(added.value).add(item)
}
</script>

<template>
  <section class="etp" aria-labelledby="etp-h">
    <div class="etp-h">
      <div>
        <h2 id="etp-h">Start from a pack</h2>
      </div>
      <button type="button" class="etp-more" :aria-expanded="openIdeas" aria-controls="etp-ideas" @click="openIdeas = !openIdeas">
        {{ openIdeas ? 'Hide single ideas' : 'Or pick single ideas' }}
      </button>
    </div>
    <div class="etp-grid">
      <button v-for="t in TEMPLATES" :key="t.id" type="button" class="etp-card" :aria-pressed="active === t.id" @click="apply(t)">
        <span class="etp-i" aria-hidden="true"><UiMaskIcon :src="t.icon" class="h-4 w-4" /></span>
        <span class="min-w-0">
          <b>{{ t.name }}</b>
          <small>{{ applied === t.id ? 'Added to Categories' : active === t.id ? 'In use' : `${t.nominations.length} categories` }}</small>
        </span>
      </button>
    </div>
    <div v-show="openIdeas" id="etp-ideas" class="etp-ideas">
      <div v-for="g in ideaChips" :key="g.title">
        <p>{{ g.title }}</p>
        <div class="etp-chips">
          <button v-for="item in g.items" :key="item" type="button" :class="added.has(item) && 'is-added'" @click="addIdea(item)">
            {{ added.has(item) ? '✓' : '+' }} {{ item }}
          </button>
        </div>
      </div>
      <!-- past the free limit the chips keep working; this only explains the bill -->
      <PaywallNote v-if="used >= FREE.maxNominations" compact />
    </div>
  </section>
</template>
