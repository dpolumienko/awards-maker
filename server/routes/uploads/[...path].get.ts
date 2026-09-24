import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'

/**
 * Serves what /api/uploads wrote. In production nginx can take this over, but
 * the app has to be able to do it alone - otherwise a dev server shows broken
 * images and a misconfigured proxy looks like lost uploads.
 */
const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export default defineEventHandler(async (event) => {
  const rel = String(getRouterParam(event, 'path') ?? '')
  const root = normalize(String(useRuntimeConfig().uploadsDir))
  const file = normalize(join(root, rel))

  // `..` in the path would otherwise read anything the process can reach
  if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad path' })
  }

  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const type = TYPES[file.split('.').pop()?.toLowerCase() ?? '']
  if (!type) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  setResponseHeader(event, 'Content-Type', type)
  // the name carries a uuid, so the bytes behind a URL never change
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return sendStream(event, createReadStream(file))
})
