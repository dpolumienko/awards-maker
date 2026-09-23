<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGsap, prefersReducedMotion } from '~/composables/useReveal'

const { value, label } = defineProps<{ value: number; label: string }>()
const el = ref<HTMLElement | null>(null)
const shown = ref(0)
const fmt = (n: number) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')

onMounted(() => {
  if (prefersReducedMotion()) {
    shown.value = value
    return
  }
  const { gsap, ScrollTrigger } = useGsap()
  const obj = { n: 0 }
  gsap.to(obj, {
    n: value,
    duration: 1.6,
    ease: 'expo.out',
    onUpdate: () => (shown.value = obj.n),
    scrollTrigger: { trigger: el.value!, start: 'top 90%', once: true },
  })
  ScrollTrigger.refresh()
})
</script>

<template>
  <div ref="el">
    <b class="tnum block text-[32px] font-bold leading-none">{{ fmt(shown) }}</b>
    <span class="micro mt-2 block">{{ label }}</span>
  </div>
</template>
