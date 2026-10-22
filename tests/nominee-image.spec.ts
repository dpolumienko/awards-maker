import { describe, expect, it } from 'vitest'
import { nomineeImage } from '../app/utils/nominee'
import type { Nominee } from '../app/types/award'

const media = (url: string, image?: string) => ({ id: 'n', kind: 'media', text: 'Clip', url, image }) as unknown as Nominee

describe('nomineeImage', () => {
  it('prefers the upload', () => {
    expect(nomineeImage(media('https://youtu.be/abc', 'data:image/png;base64,x'))).toBe('data:image/png;base64,x')
  })
  it('reads YouTube and sharded Kick posters off their CDNs', () => {
    expect(nomineeImage(media('https://youtu.be/abc123'))).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg')
    expect(nomineeImage(media('https://streamscharts.com/clips?platform=kick&clip=b5__clip_01ABC'))).toBe('https://clips.kick.com/clips/b5/clip_01ABC/thumbnail.webp')
  })
  it('asks our server for a Twitch frame', () => {
    const url = 'https://www.twitch.tv/x/clip/Slug-123'
    expect(nomineeImage(media(url))).toBe(`/api/clip-poster?url=${encodeURIComponent(url)}`)
  })
  it('has nothing for a link it cannot read', () => {
    expect(nomineeImage(media('not a link at all'))).toBe('')
  })
})
