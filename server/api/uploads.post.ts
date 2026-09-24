import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireUser } from '../utils/users'

/**
 * Where a cover or a media nominee's picture goes.
 *
 * It used to go into the record itself: `fileToStoredImage` returned a base64
 * data URL and that string was stored with the show. A single cover is up to a
 * megabyte and a show with twenty media nominees was several more, all of it
 * inside one row, re-sent on every read. Files go on disk; the row keeps a path.
 */
const MAX_BYTES = 6 * 1024 * 1024
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export default defineEventHandler(async (event) => {
  await requireUser(event)

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.filename)
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No file' })
  }
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'That image is too large' })
  }

  // The declared type is a hint from the browser; the magic bytes are the fact.
  const ext = TYPES[sniff(file.data) ?? String(file.type)]
  if (!ext) {
    throw createError({ statusCode: 415, statusMessage: 'Images only: JPEG, PNG, WebP or GIF' })
  }

  const dir = String(useRuntimeConfig().uploadsDir)
  // one directory per day, so the folder stays listable after a year
  const bucket = new Date().toISOString().slice(0, 10)
  await mkdir(join(dir, bucket), { recursive: true })

  const name = `${randomUUID()}.${ext}`
  await writeFile(join(dir, bucket, name), file.data)
  return { url: `/uploads/${bucket}/${name}` }
})

/** Enough of each header to tell the four formats apart. */
function sniff(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length > 8 && buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png'
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp'
  }
  if (buf.length > 6 && buf.subarray(0, 6).toString('ascii').startsWith('GIF8')) return 'image/gif'
  return null
}
