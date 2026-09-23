// Every award category idea in the product lives here: the drifting rows on the
// landing, the "add one" list in the builder and the /ideas page all read this
// file. They used to hold three separate lists that had already drifted apart.
//
// Names are descriptive and generic on purpose - we never name another show, and
// never use the phrase "Streamer Awards" as a set name (see data/templates.ts).

export interface IdeaGroup {
  id: string
  title: string
  /** One line on the page: who this group is for and how to use it. */
  blurb: string
  icon: string
  items: string[]
}

export const IDEA_GROUPS: IdeaGroup[] = [
  {
    id: 'chat',
    title: 'For your chat',
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
    title: 'Streams and collabs',
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
    title: 'Funny categories',
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
    title: 'Award-show classics',
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
  {
    id: 'games',
    title: 'By game and genre',
    blurb:
      'Split by what people actually watch. Works best on a channel with a mixed schedule, or for a whole game community.',
    icon: '/img/icons/cat-comeback.svg',
    items: [
      'Best FPS Streamer',
      'Best MOBA Streamer',
      'Best Roleplay Streamer',
      'Best Music Streamer',
      'Best Creative Arts Streamer',
      'Best New Game on Stream',
      'Best Horror Stream',
      'Best Retro Stream',
      'Game of the Year on This Channel',
    ],
  },
  {
    id: 'community',
    title: 'For a Discord or a guild',
    blurb:
      'Not everything happens on stream. These work for a server, a clan or any group that spends the year together.',
    icon: '/img/icons/cat-mod.svg',
    items: [
      'Server Moment of the Year',
      'Event Organizer of the Year',
      'Most Helpful Member',
      'Best Fan Art',
      'Voice Chat MVP',
      'Best Newcomer',
      'Most Likely to Ping Everyone',
      'Best Bot Command',
    ],
  },
]

export const IDEA_TOTAL = IDEA_GROUPS.reduce((sum, g) => sum + g.items.length, 0)

export const ideaGroup = (id: string) => IDEA_GROUPS.find((g) => g.id === id)
