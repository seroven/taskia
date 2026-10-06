import { decodeStudyPhoto, uploadStudyPhoto } from '../../infrastructure/cloudinary/cloudinary.client.js'
import { callGemini, callGeminiImage, type LlmUsageContext } from '../../infrastructure/gemini/gemini.client.js'
import { extractJson } from '../../utils/helpers.js'

export type BoardSheet = { text: string } | { imageSrc: string }

export type SheetPlan =
  | { mode: 'none' }
  | { mode: 'need_reference' }
  | { mode: 'text' }
  | { mode: 'image'; imageSrc: string }

const GRAPHIC_SYSTEM = `Miras un ejercicio de primaria. Responde SOLO JSON {"graphic":true|false}.
graphic=true solo si hace falta una figura, gráfica, diagrama o dibujo para entender el ejercicio.
graphic=false si basta con el enunciado escrito.`

const IMAGE_SYSTEM = `Genera UNA ficha nueva del mismo ejercicio, con otros números.
Conserva la figura: los mismos puntos, qué toca qué y los ángulos rectos. No inventes otra.
Fondo blanco, horizontal, solo el enunciado y la figura, sin opciones.
No copies el papel, la letra a mano ni si la foto está torcida o vertical.`

const SHORT_REQUEST =
  /^(s[ií]|ok|dale|ya|listo|otro|un ejercicio|dame un ejercicio|hazme un ejercicio|otro ejercicio|uno similar|parecido)[.!?\s]*$/i

/** Textos que sí son un ejercicio de referencia. Omite pedidos cortos de “otro”. */
export function exerciseReference(parts: string[]): string {
  const kept = parts
    .map((part) => part.trim())
    .filter((part) => part.length >= 12 && !SHORT_REQUEST.test(part))
  return kept.join('\n').slice(-2000)
}

export function parseGraphicFlag(raw: string): boolean {
  try {
    const parsed = JSON.parse(extractJson(raw)) as { graphic?: unknown }
    return parsed.graphic === true
  } catch {
    return false
  }
}

export function stripDrewPhrase(speak: string): string {
  return speak.replace(/te lo dibuj[eé] en la pizarra\.?\s*/gi, '').trim()
}

/** Quita delimitadores de fórmula ($3x$, $$…$$, \(…\)) y deja el texto de adentro. */
export function stripMathDelimiters(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, '$1')
    .replace(/\\\[([\s\S]+?)\\\]/g, '$1')
    .replace(/\\\(([\s\S]+?)\\\)/g, '$1')
    .replace(/(^|[^$\\])\$(?!\$)([^$\n]+?)\$(?!\$)/g, '$1$2')
}

export async function loadReferencePhoto(
  current: string | null,
  imageUrls: Array<string | null | undefined>,
): Promise<string | null> {
  if (current?.trim()) return current
  const url = [...imageUrls].reverse().find((item) => typeof item === 'string' && item.startsWith('https://'))
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 32 || buf.length > 4 * 1024 * 1024) return null
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0]?.trim() || 'image/jpeg'
    if (!mime.startsWith('image/')) return null
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

async function publishImage(mime: string, base64: string): Promise<string> {
  const dataUrl = `data:${mime};base64,${base64}`
  try {
    const photo = decodeStudyPhoto(dataUrl)
    if (!photo) return dataUrl
    return await uploadStudyPhoto(photo)
  } catch {
    return dataUrl
  }
}

export async function needsGraphic(opts: {
  text: string
  photoBase64: string | null
  usage: LlmUsageContext
}): Promise<boolean> {
  try {
    const raw = await callGemini({
      system: GRAPHIC_SYSTEM,
      user: JSON.stringify({
        ejercicio: opts.text.slice(0, 2000),
        hay_foto: Boolean(opts.photoBase64),
      }),
      photoBase64: opts.photoBase64,
      usage: opts.usage,
    })
    return parseGraphicFlag(raw)
  } catch {
    return false
  }
}

export async function planExerciseSheet(opts: {
  draw: boolean
  referenceText: string
  photoBase64: string | null
  usage: LlmUsageContext
}): Promise<SheetPlan> {
  if (!opts.draw) return { mode: 'none' }
  const text = opts.referenceText.trim()
  if (!text && !opts.photoBase64) return { mode: 'need_reference' }
  const graphic = await needsGraphic({
    text,
    photoBase64: opts.photoBase64,
    usage: opts.usage,
  })
  if (!graphic) return { mode: 'text' }
  const image = await callGeminiImage({
    system: IMAGE_SYSTEM,
    user:
      text ||
      'Misma figura que la foto, otros números. Fondo blanco, horizontal, enunciado y figura, sin opciones.',
    photoBase64: opts.photoBase64,
    usage: opts.usage,
  })
  if (!image) return { mode: 'text' }
  return { mode: 'image', imageSrc: await publishImage(image.mime, image.base64) }
}

export async function sheetForPrompt(prompt: string, usage: LlmUsageContext): Promise<BoardSheet> {
  const text = prompt.trim() || 'Resuelve el ejercicio.'
  const graphic = await needsGraphic({ text, photoBase64: null, usage })
  if (!graphic) return { text }
  const image = await callGeminiImage({
    system: IMAGE_SYSTEM,
    user: text,
    usage,
  })
  if (!image) return { text }
  return { imageSrc: await publishImage(image.mime, image.base64) }
}
