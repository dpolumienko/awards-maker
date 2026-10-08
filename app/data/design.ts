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
 * Two whole versions of the site, review 2026-10-02: today's dark stage and
 * Concept C, the Fanzine (outputs/awards-maker-concepts-2026-10-01). Same pages,
 * same logic; the Fanzine is a token set (assets/css/zine.css) plus the
 * components in components/zine/. Kept in a cookie, not localStorage: the
 * landing and the awards pages render on the server, and a version only the
 * browser knows would hydrate into the other one. `?version=zine` sets it.
 * Night (review 2026-10-06) is the Fanzine printed on black, lit by a follow-spot
 * (components/zine/ZineSpotlight.vue): the same components, its own tokens.
 */
export const VERSIONS = [
  { id: 'stage', label: 'Current' },
  { id: 'zine', label: 'Fanzine' },
  { id: 'night', label: 'Fanzine Night' },
  // Night v2 (review 2026-10-08): Night's palette with the reworked flows - the
  // builder in ticket steps, the dashboard's show desk with take-offline. Same
  // routes and API; only the builder and the dashboard lay out differently.
  { id: 'night2', label: 'Night v2' },
] as const
export type Version = (typeof VERSIONS)[number]['id']
export const VERSION_COOKIE = 'am-version'
export const isVersion = (v: unknown): v is Version => VERSIONS.some((x) => x.id === v)

/**
 * Runs inline in <head>, before first paint, so a returning viewer never sees
 * the default palette flash. `?palette=sc&button=warm` in a link sets and keeps
 * the choice - that is how a variant gets sent to someone.
 */
export const DESIGN_BOOT = `(function(){try{var q=new URLSearchParams(location.search),d=document.documentElement,
p=q.get('palette')||localStorage.getItem('${DESIGN_KEYS.palette}'),b=q.get('button')||localStorage.getItem('${DESIGN_KEYS.button}');
if(p&&/^(gold|sc|neon|platinum)$/.test(p)){d.dataset.palette=p;localStorage.setItem('${DESIGN_KEYS.palette}',p)}
if(b&&/^(solid|warm|outline|ivory|gradient)$/.test(b)){d.dataset.button=b;localStorage.setItem('${DESIGN_KEYS.button}',b)}}catch(e){}})()`
