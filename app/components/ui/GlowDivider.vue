<!--
  Light bar from "Sparkles Title" on 21st.dev.
  Source: https://21st.dev/@uilayout.contact/components/sparkles-title3
  Three stacked gradient rules of decreasing width (blurred, sharp, hot core) read
  as a lit strip rather than a border. Neutrals swapped for our gold.
-->
<template>
  <div class="relative h-px w-full" aria-hidden="true">
    <span class="absolute inset-x-0 top-0 mx-auto h-[2px] w-2/4 bg-gradient-to-r from-transparent via-gold/70 to-transparent blur-[2px]" />
    <span class="absolute inset-x-0 top-0 mx-auto h-px w-2/4 bg-gradient-to-r from-transparent via-gold to-transparent" />
    <span class="absolute inset-x-0 top-0 mx-auto h-px w-1/4 bg-gradient-to-r from-transparent via-gold-text to-transparent" />
  </div>
</template>
