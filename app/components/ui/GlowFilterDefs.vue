<!--
  Port of the glow filter from "Illuminated Hero" on 21st.dev.
  Source: https://21st.dev/@efferd/components/illuminated-hero
  The filter stack (four blurs, seven colour-matrix layers, offsets, merge) is the
  author's, unchanged - its matrices are already warm amber, which is what our gold is.
  Rendered once in app.vue; GlowText.vue only references the filter id.
  One deviation: the deep layers' vertical offsets were tuned for ~60px text and
  at our 104px display they read as a second ghost word, so the deep layers were pulled in to dy 10 and 6 - the spill now hugs the letters.
-->
<template>
  <svg class="absolute -z-10 h-0 w-0" width="1440" height="300" viewBox="0 0 1440 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <filter id="glow-gold" color-interpolation-filters="sRGB" x="-50%" y="-200%" width="200%" height="500%">
        <feGaussianBlur in="SourceGraphic" std-deviation="4" result="blur4" />
        <feGaussianBlur in="SourceGraphic" std-deviation="19" result="blur19" />
        <feGaussianBlur in="SourceGraphic" std-deviation="9" result="blur9" />
        <feGaussianBlur in="SourceGraphic" std-deviation="30" result="blur30" />
        <feColorMatrix in="blur4" result="c0" type="matrix" values="1 0 0 0 0  0 0.98 0 0 0  0 0 0.96 0 0  0 0 0 0.8 0" />
        <feOffset in="c0" result="l0" dx="0" dy="0" />
        <feColorMatrix in="blur19" result="c1" type="matrix" values="0.8156 0 0 0 0  0 0.4941 0 0 0  0 0 0.2627 0 0  0 0 0 1 0" />
        <feOffset in="c1" result="l1" dx="0" dy="2" />
        <feColorMatrix in="blur9" result="c2" type="matrix" values="1 0 0 0 0  0 0.6666 0 0 0  0 0 0.3647 0 0  0 0 0 0.65 0" />
        <feOffset in="c2" result="l2" dx="0" dy="2" />
        <feColorMatrix in="blur30" result="c3" type="matrix" values="1 0 0 0 0  0 0.6117 0 0 0  0 0 0.3921 0 0  0 0 0 1 0" />
        <feOffset in="c3" result="l3" dx="0" dy="2" />
        <feColorMatrix in="blur30" result="c4" type="matrix" values="0.4549 0 0 0 0  0 0.1647 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        <feOffset in="c4" result="l4" dx="0" dy="6" />
        <feColorMatrix in="blur30" result="c5" type="matrix" values="0.4235 0 0 0 0  0 0.1960 0 0 0  0 0 0.1137 0 0  0 0 0 1 0" />
        <feOffset in="c5" result="l5" dx="0" dy="10" />
        <feColorMatrix in="blur30" result="c6" type="matrix" values="0.2117 0 0 0 0  0 0.1098 0 0 0  0 0 0.0745 0 0  0 0 0 1 0" />
        <feOffset in="c6" result="l6" dx="0" dy="10" />
        <feColorMatrix in="blur30" result="c7" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.68 0" />
        <feOffset in="c7" result="l7" dx="0" dy="10" />
        <feMerge>
          <feMergeNode in="l0" /><feMergeNode in="l1" /><feMergeNode in="l2" /><feMergeNode in="l3" />
          <feMergeNode in="l4" /><feMergeNode in="l5" /><feMergeNode in="l6" /><feMergeNode in="l7" />
          <feMergeNode in="l0" /><feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
</template>
