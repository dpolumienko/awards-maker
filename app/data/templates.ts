// Prepared starts for the builder: three sets of five, plus single ideas below
// them. One set follows the kind of categories the big streaming award shows run
// (verified against a published category list, see the project log), the other two
// are built for one channel and its chat.
//
// Category names are descriptive and generic on purpose. We never name another
// show in the UI, never imply a tie to one, and never use the phrase "Streamer
// Awards" as a set name - our own naming rule keeps pages with it out of search.

export interface AwardTemplate {
  id: string
  name: string
  blurb: string
  icon: string
  nominations: string[]
  /** A starting look, so a set changes the page and not only the form. Paid, like
   *  every Look setting - it is marked as such at publish. */
  look: { theme: string; accent: string; font: string }
}

export const TEMPLATES: AwardTemplate[] = [
  {
    id: 'classics',
    name: 'Award-show classics',
    blurb: 'The headline streamer awards categories: Streamer of the Year, Rising Star, Best Variety.',
    icon: '/img/icons/cat-chatter.svg',
    nominations: ['Streamer of the Year', 'Rising Star', 'Best Variety Streamer', 'Best IRL Streamer', 'Best Just Chatting Streamer'],
    // a stage, gold, and the condensed face: the ceremony register
    look: { theme: 'stage', accent: '#D9A441', font: 'Anton' },
  },
  {
    id: 'chat',
    name: 'Chat Awards',
    blurb: 'Chat awards for your own community: Chatter of the Year, Mod MVP, Best Emote.',
    icon: '/img/icons/cat-mod.svg',
    nominations: ['Chatter of the Year', 'Mod MVP', 'Best Emote', 'Lurker of the Year', 'Most Loyal Viewer'],
    // the channel's own room: Twitch purple, a beam wash, a plainer face
    look: { theme: 'spotlights', accent: '#9147FF', font: 'Space Grotesk' },
  },
  {
    id: 'funny',
    name: 'Chaos Awards',
    blurb: 'Funny end of year awards: Rage Quit of the Year, Best Fail, Most Chaotic Stream.',
    icon: '/img/icons/cat-rage-quit.svg',
    nominations: ['Rage Quit of the Year', 'Best Fail', 'Meme That Wouldn’t Die', 'Most Chaotic Stream', 'Technical Difficulties Award'],
    // loud on purpose: on-air red, a glow wash and the display serif
    look: { theme: 'glow', accent: '#FF4E45', font: 'Playfair Display' },
  },
]

/** Single ideas to drop in one at a time. One source for all of them: data/ideas.ts. */
export { IDEA_GROUPS, type IdeaGroup } from './ideas'
