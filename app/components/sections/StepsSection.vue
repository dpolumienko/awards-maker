<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SectionShell from './SectionShell.vue'
import { useGsap, prefersReducedMotion } from '~/composables/useReveal'

const wrap = ref<HTMLElement | null>(null)

const steps = [
  {
    art: '/img/illustrations/illu-step-nominate.svg',
    title: 'Add nominations and nominees',
    body: 'Name your awards and add up to 5 nominations. For each one, search the Streams Charts database for a channel or type a nominee in by hand, whether that\u2019s a mod, a clip title or a running joke.',
  },
  {
    art: '/img/illustrations/illu-step-share.svg',
    title: 'Publish and share the link',
    body: 'Publishing gives your awards its own page and a spot in the community awards catalog. Copy the link into chat or post it to X.',
  },
  {
    art: '/img/illustrations/illu-step-reveal.svg',
    title: 'Close voting and announce the winners',
    body: 'Voting ends on the date you set or earlier if you close it yourself, and once you\u2019ve announced the winners on stream, you publish the results so the page matches what chat just heard.',
  },
]

// The gold line is scrubbed by scroll position, so the three steps read as one run.
onMounted(() => {
  if (!wrap.value || prefersReducedMotion()) return
  const { gsap } = useGsap()
  const ctx = gsap.context(() => {
    gsap.to('.js-progress', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: wrap.value!, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
    })
    gsap.utils.toArray<HTMLElement>('.js-step').forEach((step) => {
      // background stays opaque: a translucent fill let the connector line
      // show straight through the digits
      gsap.to(step.querySelector('.js-num'), {
        borderColor: '#D9A441',
        color: '#D9A441',
        backgroundColor: '#17171A',
        duration: 0.4,
        scrollTrigger: { trigger: step, start: 'top 75%', once: true },
      })
    })
  }, wrap.value)
  onBeforeUnmount(() => ctx.revert())
})
</script>

<template>
  <SectionShell id="how" heading="Create your awards in three steps">
    <div ref="wrap" class="relative mt-6 grid gap-6 lg:grid-cols-3">
      <span aria-hidden="true" class="absolute left-0 right-0 top-6 hidden h-px bg-hair lg:block" />
      <span aria-hidden="true" class="js-progress absolute left-0 right-0 top-6 hidden h-px origin-left scale-x-0 bg-gold lg:block" />
      <div v-for="(s, i) in steps" :key="s.title" class="js-step js-reveal group relative pt-14">
        <span class="js-num absolute left-0 top-0 z-10 grid h-12 w-12 place-items-center rounded-btn border border-hair2 bg-canvas text-lg font-bold tnum">
          {{ i + 1 }}
        </span>
        <div class="mb-6 overflow-hidden rounded-card border border-hair bg-s1">
          <img
            :src="asset(s.art)"
            :alt="''"
            aria-hidden="true"
            loading="lazy"
            class="h-44 w-full object-contain p-3"
          />
        </div>
        <h3 class="mb-2 text-xl font-semibold">{{ s.title }}</h3>
        <p class="m-0 text-ink-2">{{ s.body }}</p>
      </div>
    </div>
  </SectionShell>
</template>
