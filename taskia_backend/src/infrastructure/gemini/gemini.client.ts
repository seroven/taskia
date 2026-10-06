import { env } from '../../config/env.js'
import { AppDataSource } from '../database/data-source.js'
import { LlmUsage } from '../database/entities/index.js'
import { BOARD_INTENT_SYSTEM } from '../../prompts/board-intent.js'
import { TRANSCRIBE_SYSTEM } from '../../prompts/transcribe.js'
import { AppError } from '../../shared/errors/app-error.js'

export type LlmUsageKind =
  | 'task_tutor'
  | 'mission_tutor'
  | 'transcribe'
  | 'challenge_generate'
  | 'challenge_grade'
  | 'parent_tutor'
  | 'planet_generate'
  | 'daily_summary'
  | 'board_intent'
  | 'board_facts'
  | 'board_image'

export interface LlmUsageContext {
  userId: number
  kind: LlmUsageKind
}

function readInlineImage(raw: string, fallbackMime = 'image/png') {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(raw.trim())
  if (match) {
    return { mime: match[1] === 'image/jpg' ? 'image/jpeg' : match[1], data: match[2].replace(/\s/g, '') }
  }
  return { mime: fallbackMime, data: raw.trim().replace(/\s/g, '') }
}

export async function callGemini(opts: {
  system: string
  user: string
  boardImageBase64?: string | null
  boardImages?: Array<{ data: string; caption?: string; mimeType?: string }>
  photoBase64?: string | null
  photoCaption?: string
  usage?: LlmUsageContext
}): Promise<string> {
  const apiKey = env.gemini.apiKey.trim().replace(/^["']|["']$/g, '')
  if (!apiKey) throw new AppError('Configura GEMINI_API_KEY en el archivo .env')
  const model = env.gemini.model.trim().replace(/^["']|["']$/g, '') || 'gemini-2.0-flash'

  const parts: Array<Record<string, unknown>> = [{ text: opts.user }]
  const images: Array<{ data: string; caption?: string; mimeType?: string }> = []
  if (opts.boardImages && opts.boardImages.length > 0) {
    images.push(...opts.boardImages)
  } else if (opts.boardImageBase64?.trim()) {
    images.push({
      data: opts.boardImageBase64,
      mimeType: 'image/png',
      caption:
        'Imagen de la pizarra del niño. Léela para ver su respuesta.',
    })
  }
  if (opts.photoBase64?.trim()) {
    images.push({
      data: opts.photoBase64,
      mimeType: 'image/jpeg',
      caption:
        opts.photoCaption ??
        'Foto del cuaderno. Léela para ver su respuesta. No es la pizarra.',
    })
  }
  for (const image of images) {
    const inline = readInlineImage(image.data, image.mimeType || 'image/png')
    if (!inline.data) continue
    parts.push({ inline_data: { mime_type: inline.mime, data: inline.data } })
    if (image.caption) {
      parts.push({ text: image.caption })
    }
  }

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
  }
  const modelL = model.toLowerCase()
  if (modelL.includes('gemini-3')) {
    generationConfig.thinkingConfig = { thinkingLevel: 'low' }
  } else if (modelL.includes('2.5')) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 }
    generationConfig.temperature = 0.6
  } else {
    generationConfig.temperature = 0.6
  }

  const generated = await generateGeminiText({
    apiKey,
    model,
    system: opts.system,
    parts,
    generationConfig,
  })
  if (opts.usage) {
    void recordLlmUsage(opts.usage, model, generated.usage)
  }
  return generated.text
}

const NONE_INTENT = { reviewDrawing: false, drawExercise: false, helpExercise: false }

/** Pregunta barata: solo la frase del niño y la última de Taskia. Sin imagen ni resumen. */
export async function classifyBoardIntent(opts: {
  message: string
  previous: string
  usage?: LlmUsageContext
}): Promise<{ reviewDrawing: boolean; drawExercise: boolean; helpExercise: boolean }> {
  const apiKey = env.gemini.apiKey.trim().replace(/^["']|["']$/g, '')
  if (!apiKey) return NONE_INTENT
  const model = env.gemini.model.trim().replace(/^["']|["']$/g, '') || 'gemini-2.0-flash'
  const modelL = model.toLowerCase()
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 80,
    temperature: 0,
    responseMimeType: 'application/json',
  }
  if (modelL.includes('gemini-3')) {
    generationConfig.thinkingConfig = { thinkingLevel: 'minimal' }
  } else if (modelL.includes('2.5')) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 }
  }

  const parts = [
    {
      text: JSON.stringify({
        previous: opts.previous.slice(0, 180),
        message: opts.message.slice(0, 400),
      }),
    },
  ]
  try {
    let generated: Awaited<ReturnType<typeof generateGeminiText>>
    try {
      generated = await generateGeminiText({
        apiKey,
        model,
        system: BOARD_INTENT_SYSTEM,
        parts,
        generationConfig,
      })
    } catch {
      const { thinkingConfig: _drop, ...plain } = generationConfig
      generated = await generateGeminiText({
        apiKey,
        model,
        system: BOARD_INTENT_SYSTEM,
        parts,
        generationConfig: plain,
      })
    }
    if (opts.usage) void recordLlmUsage(opts.usage, model, generated.usage)
    return parseBoardIntent(generated.text)
  } catch {
    return NONE_INTENT
  }
}

function parseBoardIntent(raw: string): { reviewDrawing: boolean; drawExercise: boolean; helpExercise: boolean } {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return NONE_INTENT
  try {
    const value = JSON.parse(raw.slice(start, end + 1)) as {
      review_drawing?: unknown
      draw_exercise?: unknown
      help_exercise?: unknown
    }
    return {
      reviewDrawing: value.review_drawing === true,
      drawExercise: value.draw_exercise === true,
      helpExercise: value.help_exercise === true,
    }
  } catch {
    return NONE_INTENT
  }
}

const MAX_AUDIO_BASE64_CHARS = 5_500_000

export async function callGeminiTranscribe(opts: {
  audioBase64: string
  mimeType: string
  durationSeconds?: number
  usage?: LlmUsageContext
}): Promise<{ text: string; truncated: boolean }> {
  const apiKey = env.gemini.apiKey.trim().replace(/^["']|["']$/g, '')
  if (!apiKey) throw new AppError('Configura GEMINI_API_KEY en el archivo .env')
  const model = env.gemini.model.trim().replace(/^["']|["']$/g, '') || 'gemini-2.0-flash'

  let data = opts.audioBase64.trim()
  const dataUrl = /^data:([^;]+);base64,(.+)$/s.exec(data)
  let mimeType = opts.mimeType.trim() || 'audio/webm'
  if (dataUrl) {
    mimeType = dataUrl[1] || mimeType
    data = dataUrl[2]
  }
  data = data.replace(/\s/g, '')

  if (!data) throw new AppError('No llegó audio para transcribir')
  if (data.length > MAX_AUDIO_BASE64_CHARS) {
    throw new AppError('El audio es demasiado largo. Máximo 90 segundos.')
  }

  const allowed = new Set([
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/ogg;codecs=opus',
  ])
  const mimeBase = mimeType.split(';')[0].trim().toLowerCase()
  if (!allowed.has(mimeType.toLowerCase()) && !allowed.has(mimeBase)) {
    throw new AppError('Formato de audio no soportado')
  }

  const durationHint =
    opts.durationSeconds != null && Number.isFinite(opts.durationSeconds)
      ? ` Duración aproximada: ${Math.round(opts.durationSeconds)} s.`
      : ''

  const parts: Array<Record<string, unknown>> = [
    {
      text: `Transcribe TODO este audio de un niño o niña explicando o leyendo un tema de estudio, de principio a fin, sin resumir ni cortar el final.${durationHint}`,
    },
    {
      inline_data: {
        mime_type: mimeBase === 'audio/mp3' ? 'audio/mpeg' : mimeBase,
        data,
      },
    },
  ]

  const { text, finishReason, usage } = await generateGeminiText({
    apiKey,
    model,
    system: TRANSCRIBE_SYSTEM,
    parts,
    generationConfig: {
      // Lecturas largas (~90s) necesitan margen amplio de salida
      maxOutputTokens: 8192,
      temperature: 0.1,
    },
  })
  if (opts.usage) {
    void recordLlmUsage(opts.usage, model, usage)
  }

  const cleaned = text
    .replace(/^```(?:\w+)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  if (!cleaned) throw new AppError('No se pudo transcribir el audio')
  return {
    text: cleaned,
    truncated: finishReason === 'MAX_TOKENS',
  }
}

async function generateGeminiText(opts: {
  apiKey: string
  model: string
  system: string
  parts: Array<Record<string, unknown>>
  generationConfig: Record<string, unknown>
}): Promise<{
  text: string
  finishReason?: string
  usage: { prompt: number; output: number; total: number }
}> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: 'user', parts: opts.parts }],
      generationConfig: opts.generationConfig,
    }),
  })

  const payload = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    const err = payload.error as { message?: string } | undefined
    throw new AppError(err?.message ?? 'Error al llamar a Gemini')
  }

  const candidates = payload.candidates as
    | Array<{
        finishReason?: string
        content?: { parts?: Array<{ text?: string; thought?: boolean }> }
      }>
    | undefined
  const candidate = candidates?.[0]
  const partsOut = candidate?.content?.parts ?? []
  const texts = partsOut
    .filter((p) => !p.thought && p.text?.trim())
    .map((p) => p.text!.trim())
  const joined = texts.join('\n').trim()
  if (!joined) throw new AppError('Gemini no devolvió texto útil')
  const meta = payload.usageMetadata as
    | {
        promptTokenCount?: number
        candidatesTokenCount?: number
        totalTokenCount?: number
      }
    | undefined
  const prompt = Number(meta?.promptTokenCount ?? 0)
  const output = Number(meta?.candidatesTokenCount ?? 0)
  const total = Number(meta?.totalTokenCount ?? prompt + output)
  return {
    text: joined,
    finishReason: candidate?.finishReason,
    usage: { prompt, output, total },
  }
}

function imageFromParts(parts: Array<Record<string, unknown>>) {
  for (const part of parts) {
    const inline = (part.inlineData ?? part.inline_data) as
      | { mimeType?: string; mime_type?: string; data?: string }
      | undefined
    const data = typeof inline?.data === 'string' ? inline.data.replace(/\s/g, '') : ''
    if (!data) continue
    const mime = inline?.mimeType || inline?.mime_type || 'image/png'
    return { mime, base64: data }
  }
  return null
}

/** Imagen de una hoja de ejercicio. Null si el modelo no devuelve bitmap. */
export async function callGeminiImage(opts: {
  system: string
  user: string
  photoBase64?: string | null
  model?: string
  usage?: LlmUsageContext
}): Promise<{ mime: string; base64: string } | null> {
  const apiKey = env.gemini.apiKey.trim().replace(/^["']|["']$/g, '')
  if (!apiKey) return null
  const model =
    (opts.model ?? env.gemini.imageModel).trim().replace(/^["']|["']$/g, '') || 'gemini-2.5-flash-image'
  const parts: Array<Record<string, unknown>> = [{ text: opts.user }]
  if (opts.photoBase64?.trim()) {
    const inline = readInlineImage(opts.photoBase64, 'image/jpeg')
    if (inline.data) {
      parts.push({
        text: 'Genera un ejercicio similar a esta captura. Si la foto está vertical, el ejercicio va en horizontal.',
      })
      parts.push({ inline_data: { mime_type: inline.mime, data: inline.data } })
    }
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '4:3' },
        },
      }),
    })
    const payload = (await response.json()) as Record<string, unknown>
    if (!response.ok) return null
    const candidates = payload.candidates as
      | Array<{ content?: { parts?: Array<Record<string, unknown>> } }>
      | undefined
    const partsOut = candidates?.[0]?.content?.parts ?? []
    const image = imageFromParts(partsOut)
    if (opts.usage) {
      const meta = payload.usageMetadata as
        | { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
        | undefined
      const prompt = Number(meta?.promptTokenCount ?? 0)
      const output = Number(meta?.candidatesTokenCount ?? 0)
      void recordLlmUsage({ userId: opts.usage.userId, kind: 'board_image' }, model, {
        prompt,
        output,
        total: Number(meta?.totalTokenCount ?? prompt + output),
      })
    }
    return image
  } catch {
    return null
  }
}

async function recordLlmUsage(
  ctx: LlmUsageContext,
  model: string,
  usage: { prompt: number; output: number; total: number },
) {
  try {
    await AppDataSource.getRepository(LlmUsage).insert({
      userId: ctx.userId,
      kind: ctx.kind,
      model,
      promptTokens: Math.max(0, usage.prompt),
      outputTokens: Math.max(0, usage.output),
      totalTokens: Math.max(0, usage.total),
    })
  } catch {
    /* la tabla puede no existir aún; no cortar la sesión del niño */
  }
}
