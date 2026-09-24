// The temporary design switcher's options (review 2026-09-24, items 1 and 14).
// Lives in data/, not utils/: Nuxt's auto-import scanner read the boot script's
// `,b=` as a second exported name. Delete with components/DesignSwitcher.vue and assets/css/palettes.css once a
// palette and a button are chosen.

export const PALETTES = [
  { id: 'gold', label: 'Gold' },
  { id: 'sc', label: 'SC Blue' },
  { id: 'neon', label: 'SC Neon' },
  { id: 'platinum', label: 'Platinum' },
] as const

export const BUTTONS = [
  { id: 'solid', label: 'Solid' },
  { id: 'warm', label: 'Warm' },
  { id: 'outline', label: 'Outline' },
  { id: 'ivory', label: 'Ivory' },
  { id: 'gradient', label: 'Gradient' },
] as const

export const DESIGN_KEYS = { palette: 'am-palette', button: 'am-button' } as const

/**
 * Runs inline in <head>, before first paint, so a returning viewer never sees
 * the default palette flash. `?palette=sc&button=warm` in a link sets and keeps
 * the choice - that is how a variant gets sent to someone.
 */
export const DESIGN_BOOT = `(function(){try{var q=new URLSearchParams(location.search),d=document.documentElement,
p=q.get('palette')||localStorage.getItem('${DESIGN_KEYS.palette}'),b=q.get('button')||localStorage.getItem('${DESIGN_KEYS.button}');
if(p&&/^(gold|sc|neon|platinum)$/.test(p)){d.dataset.palette=p;localStorage.setItem('${DESIGN_KEYS.palette}',p)}
if(b&&/^(solid|warm|outline|ivory|gradient)$/.test(b)){d.dataset.button=b;localStorage.setItem('${DESIGN_KEYS.button}',b)}}catch(e){}})()`
