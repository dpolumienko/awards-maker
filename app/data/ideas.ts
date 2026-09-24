// Every award category idea in the product lives here: the drifting rows on the
// landing, the "add one" list in the builder and the /ideas page all read this
// file. They used to hold three separate lists that had already drifted apart.
//
// Four sets, not six. "By game and genre" and the Discord set were both under a
// hundred searches a month and pulled the page away from streamer awards, which
// is what it ranks for.
//
// Names are descriptive and generic on purpose - we never name another show, and
// never use the phrase "Streamer Awards" as a set name (see data/templates.ts).

export interface IdeaGroup {
  id: string
  title: string
  /** One line on the page: who this group is for and how to use it. */
  blurb: string
  icon: string
  /** Big and in colour on /ideas - the page read as a wall of grey pills. */
  emoji: string
  /**
   * How many of the items the "use this set" button puts in the builder. Two of
   * the four sets fit the free plan exactly; the other two are deliberately
   * bigger, because a show with ten categories is what the paid tier is for and
   * the page should say so before the builder does.
   */
  set: number
  items: string[]
}

export const IDEA_GROUPS: IdeaGroup[] = [
  {
    id: 'chat',
    emoji: '💬',
    title: 'For your community',
    set: 5,
    blurb:
      'The ones your regulars will argue about. Every name here points at a person in the room, which is why these get the most votes.',
    icon: '/img/icons/cat-chatter.svg',
    items: [
      'Chatter of the Year',
      'Mod MVP',
      'Best Emote',
      'Lurker of the Year',
      'Most Loyal Viewer',
      'Best Clip Maker',
      'Hype Train Conductor',
      'First Chatter Award',
      'Best Community Meme',
      'Most Wholesome Chatter',
      'Best Copypasta',
      'Donation of the Year',
    ],
  },
  {
    id: 'streams',
    emoji: '🎬',
    title: 'Streams and collabs',
    set: 8,
    blurb:
      'A year of broadcasts, cut into categories. Pair each one with clips as nominees and the voting turns into a rewatch.',
    icon: '/img/icons/cat-collab.svg',
    items: [
      'Clip of the Year',
      'Stream of the Year',
      'Best Collab',
      'Best Stream Duo',
      'Best Marathon Stream',
      'Best Streamed Event',
      'Best Charity Stream',
      'Speedrun of the Year',
      'Best IRL Moment',
      'Biggest Comeback',
      'Best Guest Streamer',
      'Best Subathon Moment',
    ],
  },
  {
    id: 'funny',
    emoji: '🤪',
    title: 'Funny categories',
    set: 12,
    blurb:
      'Where the show actually gets shared. Two or three of these next to the serious ones is the right dose.',
    icon: '/img/icons/cat-rage-quit.svg',
    items: [
      'Rage Quit of the Year',
      'Best Fail',
      'Most Chaotic Stream',
      'Worst Take of the Year',
      'Best Background Cameo',
      'Pet of the Year',
      'Meme That Wouldn’t Die',
      'Technical Difficulties Award',
      'Game We Should Never Have Played',
      'Longest "Just One More Game"',
      'Loudest Scream',
      'Worst Aim, Best Vibes',
    ],
  },
  {
    id: 'classics',
    emoji: '🏆',
    title: 'Award-show classics',
    set: 5,
    blurb:
      'The headline categories every awards show runs. Good for a channel that wants the ceremony to read as a ceremony.',
    icon: '/img/icons/cat-clip.svg',
    items: [
      'Streamer of the Year',
      'Rising Star',
      'Best Variety Streamer',
      'Best IRL Streamer',
      'Best Just Chatting Streamer',
      'Breakout of the Year',
      'Best Returning Streamer',
      'Content Creator of the Year',
    ],
  },
]

/** One emoji per idea, so a list of forty-four reads at a glance. */
export const IDEA_EMOJI: Record<string, string> = {
  'Chatter of the Year': '🗣️',
  'Mod MVP': '🛡️',
  'Best Emote': '😂',
  'Lurker of the Year': '👀',
  'Most Loyal Viewer': '🤝',
  'Best Clip Maker': '✂️',
  'Hype Train Conductor': '🚂',
  'First Chatter Award': '🥇',
  'Best Community Meme': '🐸',
  'Most Wholesome Chatter': '🥰',
  'Best Copypasta': '📋',
  'Donation of the Year': '💸',
  'Clip of the Year': '🎞️',
  'Stream of the Year': '📺',
  'Best Collab': '🤜',
  'Best Stream Duo': '👯',
  'Best Marathon Stream': '⏱️',
  'Best Streamed Event': '🎪',
  'Best Charity Stream': '💛',
  'Speedrun of the Year': '🏃',
  'Best IRL Moment': '📍',
  'Biggest Comeback': '🔥',
  'Best Guest Streamer': '🎙️',
  'Best Subathon Moment': '🌙',
  'Rage Quit of the Year': '😡',
  'Best Fail': '💥',
  'Most Chaotic Stream': '🌪️',
  'Worst Take of the Year': '🙃',
  'Best Background Cameo': '🐾',
  'Pet of the Year': '🐶',
  'Meme That Wouldn’t Die': '🧟',
  'Technical Difficulties Award': '🔌',
  'Game We Should Never Have Played': '🎮',
  'Longest "Just One More Game"': '⏳',
  'Loudest Scream': '📢',
  'Worst Aim, Best Vibes': '🎯',
  'Streamer of the Year': '🏆',
  'Rising Star': '⭐',
  'Best Variety Streamer': '🎲',
  'Best IRL Streamer': '🌍',
  'Best Just Chatting Streamer': '☕',
  'Breakout of the Year': '🚀',
  'Best Returning Streamer': '🔁',
  'Content Creator of the Year': '🎥',
}

/** An idea's emoji, or the group's when it has none of its own. */
export const ideaEmoji = (name: string, group?: IdeaGroup) => IDEA_EMOJI[name] ?? group?.emoji ?? '🏅'

export const IDEA_TOTAL = IDEA_GROUPS.reduce((sum, g) => sum + g.items.length, 0)

export const ideaGroup = (id: string) => IDEA_GROUPS.find((g) => g.id === id)
