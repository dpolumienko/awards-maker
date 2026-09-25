/**
 * Turns an uploaded file into an address that survives being saved.
 *
 * The history is worth keeping: `URL.createObjectURL` gives a `blob:` address
 * that lives only as long as the document, so every cover died on the next page
 * load. A data URL survives but a 5 MB photo becomes ~6.7 MB of base64, which
 * went into the record itself - one row carrying megabytes, re-sent on every
 * read, and enough to blow localStorage on its own.
 *
 * So: still scaled down here, because a 12-megapixel phone photo has no business
 * on the wire, but uploaded rather than inlined. The callers have always treated
 * the result as an opaque address, so none of them changed.
 */
export async function fileToStoredImage(file: File, maxPx = 1600, quality = 0.82): Promise<string> {
  let blob: Blob
  try {
    blob = await downscale(file, maxPx, quality)
  } catch {
    throw new ImageError('That image could not be read. Try a PNG or a JPG.')
  }
  // the static demo has nowhere to send it; what GitHub Pages answers a POST
  // with is not something to rely on
  if (useRuntimeConfig().public.demo) return blobToDataUrl(blob)
  try {
    return await upload(blob)
  } catch (e) {
    const status = (e as { statusCode?: number; status?: number }).statusCode ?? (e as { status?: number }).status
    // Not signed in yet (401/403), or no server behind the page at all - the
    // static demo answers 404 (QA 2026-09-25). The builder works signed out, so
    // the picture stays in the draft as a data URL and goes up on sign-in
    // (uploadInlineImages, called from useAwardDraft).
    if (!status || status === 401 || status === 403 || status === 404 || status === 405) return blobToDataUrl(blob)
    if (status === 413) throw new ImageError('That image is too large. Try one under 6 MB.')
    if (status === 415) throw new ImageError('Images only: JPEG, PNG, WebP or GIF.')
    throw new ImageError('The upload did not go through. Try again in a moment.')
  }
}

/** A message the builder can show as it is. */
export class ImageError extends Error {}

async function upload(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append('file', blob, 'upload.jpg')
  const { url } = await $fetch<{ url: string }>('/api/uploads', { method: 'POST', body: form })
  return url
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/**
 * Pictures added before sign-in live in the draft as data URLs; the server takes
 * only paths it handed out. Uploads each one and swaps in its path. A picture
 * that still fails stays out rather than blocking the whole draft.
 */
export async function uploadInlineImages<T extends { look?: Record<string, unknown>; nominations?: { nominees: { image?: string }[] }[] }>(award: T): Promise<T> {
  const lift = async (v: unknown) => {
    if (typeof v !== 'string' || !v.startsWith('data:')) return v
    try {
      return await upload(await (await fetch(v)).blob())
    } catch {
      return undefined
    }
  }
  const look = { ...(award.look ?? {}) }
  for (const key of ['coverUrl', 'logoUrl']) {
    if (key in look) look[key] = await lift(look[key])
  }
  const nominations = await Promise.all(
    (award.nominations ?? []).map(async (n) => ({
      ...n,
      nominees: await Promise.all(n.nominees.map(async (x) => (x.image ? { ...x, image: ((await lift(x.image)) as string | undefined) ?? '' } : x))),
    })),
  )
  return { ...award, look, nominations }
}

async function downscale(file: File, maxPx: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('no canvas context')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // PNG keeps transparency but triples the size of a photograph; the cover and a
  // nominee thumbnail are both photographic, so both go out as JPEG.
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode'))), 'image/jpeg', quality),
  )
}
