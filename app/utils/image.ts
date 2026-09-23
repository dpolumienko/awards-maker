/**
 * Turns an uploaded file into something that survives being saved.
 *
 * `URL.createObjectURL` gives a `blob:` address that lives as long as the
 * document does - it went into the draft, into the published awards and into
 * localStorage, and every cover and image nominee died on the next page load.
 * That is why they disappeared after publishing.
 *
 * A data URL survives, but a 5 MB photo becomes ~6.7 MB of base64 and blows the
 * ~5 MB localStorage budget on its own, so the image is drawn down to `maxPx` on
 * the long edge first. When the API arrives this is where the upload call goes:
 * the callers already treat the result as an opaque address.
 */
export async function fileToStoredImage(file: File, maxPx = 1600, quality = 0.82): Promise<string> {
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
  return canvas.toDataURL('image/jpeg', quality)
}
