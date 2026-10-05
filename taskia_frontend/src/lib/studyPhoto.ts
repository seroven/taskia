const MAX_EDGE = 1600
const MAX_DATA_URL = 5_500_000

/** Baja la foto a JPEG para que quepa en el mensaje y Gemini pueda leerla. */
export async function compressStudyPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Elige una foto (JPG, PNG o WebP).')
  }
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('No pude preparar la foto.')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const data = canvas.toDataURL('image/jpeg', 0.82)
  if (data.length > MAX_DATA_URL) {
    throw new Error('La foto sigue siendo muy grande. Prueba con otra.')
  }
  return data
}
