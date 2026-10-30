<script setup lang="ts">
// Publish, as the prototype draws it: the checks (an unticked one takes you to its
// field), what in the draft is paid, the free meters, the rules box and one wide
// button. The rules themselves are the colleague's (useAwardDraft.checks).
import { computed, ref } from 'vue'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { FREE } from '~/types/award'

const props = defineProps<{ error?: string; signedIn?: boolean }>()
const emit = defineEmits<{ publish: []; fix: [string]; signIn: ['twitch' | 'kick'] }>()
const { draft, checks, canPublish, paidFeatures } = useAwardDraft()
const agreed = ref(false)
const used = computed(() => draft.value.nominations.length)
const ready = computed(() => canPublish.value && agreed.value)
const note = computed(() =>
  !canPublish.value ? 'Finish the unchecked items above to publish.' : !agreed.value ? 'Tick the rules box to publish.' : !props.signedIn ? 'Sign in to publish.' : paidFeatures.value.length ? 'You pay once at checkout. Nothing is charged before.' : `Free: up to ${FREE.maxVoters} voters.`,
)
</script>

<template>
  <section class="cr-sec cr-pub" aria-labelledby="crpub-h">
    <div class="cr-sec-h"><div><h2 id="crpub-h">Ready to publish?</h2><p>These are also the rules for search: below them the page stays out of Google.</p></div></div>
    <ul class="cr-checks">
      <li v-for="c in checks" :key="c.id" :class="c.ok && 'ok'">
        <button type="button" :tabindex="c.ok ? -1 : undefined" @click="!c.ok && emit('fix', c.id)"><i />{{ c.label }}<em v-if="!c.ok">Fix</em></button>
      </li>
    </ul>
    <div v-if="paidFeatures.length" class="cr-paid">
      <b>Paid features in this draft</b>
      <ul><li v-for="f in paidFeatures" :key="f.id"><b>{{ f.label }}</b> - {{ f.detail }}</li></ul>
      <span>Keep them and the awards go out on the paid tier - $50 once, no subscription. Or publish free: everything else you set stays.</span>
    </div>
    <div class="cr-meters">
      <div><span>Categories</span><b>{{ Math.min(used, 99) }} / {{ FREE.maxNominations }}</b><i><u :style="{ width: Math.min(100, (used / FREE.maxNominations) * 100) + '%' }" /></i></div>
      <div><span>Unique voters</span><b>0 / {{ FREE.maxVoters }}</b><i><u style="width: 0" /></i><small>On the free plan voting closes at {{ FREE.maxVoters }} voters. Votes already cast are kept.</small></div>
    </div>
    <label class="cr-agree"><input v-model="agreed" type="checkbox" /><span>I have read the <a href="https://streamscharts.com/terms" target="_blank" rel="noopener">rules</a> and the nominees are not impersonating anyone.</span></label>
    <!-- signed out: the login sits where it is needed, in place of the publish button
         (Ed, 2026-10-22) - nothing before this step asks for an account -->
    <div v-if="!props.signedIn" id="host-signin" class="cr-signin">
      <p>Sign in with the channel that hosts the show to publish it. Everything you set stays.</p>
      <div class="cr-signin-b">
        <button type="button" class="esi-p tw" :disabled="!ready" @click="emit('signIn', 'twitch')"><i aria-hidden="true" />Sign in with Twitch</button>
        <button type="button" class="esi-p kk" :disabled="!ready" @click="emit('signIn', 'kick')"><i aria-hidden="true" />Sign in with Kick</button>
      </div>
    </div>
    <button v-else class="btn p" type="button" :disabled="!ready" @click="emit('publish')">{{ paidFeatures.length ? 'Publish on the paid tier ($50)' : 'Publish awards' }}</button>
    <p v-if="props.error" class="cr-h is-err" role="alert">{{ props.error }}</p>
    <p v-if="props.signedIn" class="cr-pay-line">Your account has the paid tier. <NuxtLink to="/my-awards/billing">See your payments</NuxtLink></p>
  </section>
</template>
