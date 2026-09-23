<script setup lang="ts">
// Two beams from above, swinging out of phase like rig lights over a stage.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useGsap, prefersReducedMotion } from '~/composables/useReveal'

const root = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!root.value || prefersReducedMotion()) return
  const { gsap } = useGsap()
  const ctx = gsap.context(() => {
    gsap.to('.js-beam-a', { rotate: 9, duration: 9, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    gsap.to('.js-beam-b', { rotate: -11, duration: 11, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    gsap.to('.js-beam', { opacity: 0.75, duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 1.4 })
  }, root.value)
  onBeforeUnmount(() => ctx.revert())
})
</script>

<template>
  <div ref="root" class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <span
      class="js-beam js-beam-a absolute -top-40 left-[18%] h-[900px] w-[320px] origin-top opacity-50 blur-2xl"
      style="
        transform: rotate(-14deg);
        background: linear-gradient(to bottom, rgba(217, 164, 65, 0.3), rgba(217, 164, 65, 0.06) 45%, transparent 72%);
        clip-path: polygon(42% 0, 58% 0, 100% 100%, 0 100%);
      "
    />
    <span
      class="js-beam js-beam-b absolute -top-40 right-[14%] h-[820px] w-[280px] origin-top opacity-40 blur-2xl"
      style="
        transform: rotate(12deg);
        background: linear-gradient(to bottom, rgba(239, 201, 122, 0.24), rgba(217, 164, 65, 0.05) 45%, transparent 70%);
        clip-path: polygon(44% 0, 56% 0, 100% 100%, 0 100%);
      "
    />
  </div>
</template>
