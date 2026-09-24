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
  const blob = await downscale(file, maxPx, quality)

  const form = new FormData()
  form.append('file', blob, 'upload.jpg')
  const { url } = await $fetch<{ url: string }>('/api/uploads', { method: 'POST', body: form })
  return url
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
