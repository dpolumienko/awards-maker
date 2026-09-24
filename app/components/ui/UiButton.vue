<script setup lang="ts">
import { computed } from 'vue'
import { NuxtLink } from '#components'
interface Props {
  variant?: 'primary' | 'ghost' | 'text'
  size?: 'md' | 'sm'
  to?: string
}
const { variant = 'primary', size = 'md', to } = defineProps<Props>()

// An internal route goes through the router - an <a href> here meant every
// "Create your awards" click reloaded the whole app and lost the draft in flight.
const internal = computed(() => !!to && to.startsWith('/'))

const base =
  'relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-btn font-bold uppercase tracking-button transition-[background-color,border-color,color,transform] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-40'
const sizes = { md: 'h-12 px-6 text-[15px]', sm: 'h-11 px-4 text-[13px]' }
const variants = {
  // colours in assets/css/palettes.css, which has the treatments under review
  primary: 'btn-primary',
  ghost: 'border border-white/50 text-ink hover:border-white hover:bg-white/[0.06]',
  text: 'px-1 text-gold-text underline underline-offset-4 hover:text-ink',
}
</script>

<template>
  <component
    :is="internal ? NuxtLink : to ? 'a' : 'button'"
    :to="internal ? to : undefined"
    :href="internal ? undefined : to"
    :class="[base, sizes[size], variants[variant], variant === 'primary' && 'group']"
  >
    <span class="relative z-10"><slot /></span>
    <!-- gold sheen: the one decorative flourish a primary button gets -->
    <span
      v-if="variant === 'primary'"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -translate-x-[120%] bg-[linear-gradient(100deg,transparent_35%,rgba(255,255,255,.55)_50%,transparent_65%)] transition-transform duration-700 ease-gala group-hover:translate-x-[120%] motion-reduce:hidden"
    />
  </component>
</template>
