<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useReveal, useGsap, prefersReducedMotion } from '~/composables/useReveal'

const { heading, intro } = defineProps<{ heading: string; intro?: string }>()
const root = ref<HTMLElement | null>(null)
useReveal(root)

// The hairline above each heading draws itself in - the quietest way to mark a chapter.
onMounted(() => {
  if (!root.value || prefersReducedMotion()) return
  const { gsap } = useGsap()
  const ctx = gsap.context(() => {
    gsap.fromTo(
      '.js-rule',
      { scaleX: 0 },
      { scaleX: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: root.value!, start: 'top 85%', once: true } },
    )
  }, root.value)
  onBeforeUnmount(() => ctx.revert())
})
</script>

<template>
  <section ref="root" class="py-8 sm:py-12">
    <div class="shell">
      <span aria-hidden="true" class="js-rule block h-px w-full origin-left bg-hair" />
      <h2 class="js-reveal heading mt-12 max-w-[20ch]">{{ heading }}</h2>
      <p v-if="intro" class="js-reveal mt-4 max-w-copy text-lg text-ink-2">{{ intro }}</p>
      <slot />
    </div>
  </section>
</template>
