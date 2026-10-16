// The Envelope version's pictures (assets/envelope/): the designer's avatars,
// emotes and marks, under the content-hash names they were cut out with. One map,
// so a component asks for a file by name and Vite still hashes and bases the URL.
const files = import.meta.glob<string>('../assets/envelope/*', { eager: true, import: 'default' })

export const envAsset = (name: string): string => files[`../assets/envelope/${name}`] ?? ''
