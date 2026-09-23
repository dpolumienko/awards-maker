import type { Config } from 'tailwindcss'
import { PLATFORM_COLORS } from './app/data/platforms'

// Tokens come from assets/design/awards-maker/DESIGN.md in the SC Product workspace.
// Radius scale is deliberately tiny: card / btn / pill and nothing else.
export default <Config>{
  content: [
    './app/components/**/*.{vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/composables/**/*.ts',
    './app/plugins/**/*.ts',
    './app/app.vue',
  ],
  theme: {
    extend: {
      // The surface ramp carries all the depth in this theme - there are no shadows
      // to fall back on. On a #000 canvas a #0E0E10 card was a 6/255 step and read
      // as one flat sheet of black; every surface here is one visible step above
      // the last, and the canvas sits just off black so a card can be darker too.
      colors: {
        canvas: '#0A0A0C',
        s1: '#15151A',
        s2: '#1E1E24',
        s3: '#292930',
        hair: '#32323A',
        hair2: '#484851',
        gold: { DEFAULT: '#D9A441', pressed: '#B9862E', text: '#EFC97A', 24: 'rgba(217,164,65,0.24)' },
        silver: '#C9CCD1',
        bronze: '#B87333',
        ink: { DEFAULT: '#FFFFFF', 2: '#A5A5AC', muted: '#8A8A93', disabled: '#6E6E76' },
        live: '#3DD68C',
        onair: '#FF4E45',
        warn: '#FFB020',
        ...PLATFORM_COLORS,
        danger: '#FF5C5C',
      },
      fontFamily: {
        sans: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        display: '-0.02em',
        heading: '-0.015em',
        button: '0.06em',
        label: '0.12em',
        micro: '0.14em',
      },
      transitionTimingFunction: {
        gala: 'cubic-bezier(.16,1,.3,1)',
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(217,164,65,0.24)',
        modal: '0 24px 80px rgba(0,0,0,0.9)',
      },
      borderRadius: {
        card: '10px',
        btn: '8px',
        pill: '999px',
      },
      maxWidth: {
        shell: '1280px',
        copy: '68ch',
      },
    },
  },
  plugins: [],
}
