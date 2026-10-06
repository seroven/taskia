import { callGemini, type LlmUsageContext } from '../../infrastructure/gemini/gemini.client.js'
import { stripMathDelimiters } from './text.js'

const MAX_BRIEF = 2200

export const EXERCISE_BRIEF_SYSTEM = `Eres el cuaderno privado de Taskia. El niño no lee esto.
Analiza el ejercicio completo y deja el desarrollo hasta la respuesta correcta.
Responde SOLO JSON:
{"exercise":"","steps":[],"answer":"","attempt":""}
exercise: el enunciado, en texto plano.
steps: el proceso en orden, cada paso una frase corta.
answer: el resultado final, en texto plano.
attempt: lo que el niño ya escribió en la foto, si se ve; si no, "".
Sin signos $, sin LaTeX. Si no hay un ejercicio claro, exercise="" y answer="".`

export function planExerciseMemory(input: {
  help: boolean
  review: boolean
  hasPhoto: boolean
  hasBrief: boolean
}) {
  const newProblem = input.help && input.hasPhoto && !input.review
  const firstLook = !input.hasBrief && (input.help || input.hasPhoto)
  const solve = newProblem || firstLook
  const sendPhoto = input.hasPhoto && input.review && input.hasBrief && !newProblem
  return { solve, sendPhoto }
}

export function formatExerciseBrief(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let value: { exercise?: unknown; steps?: unknown; answer?: unknown; attempt?: unknown }
  try {
    value = JSON.parse(raw.slice(start, end + 1)) as typeof value
  } catch {
    return null
  }
  const exercise = typeof value.exercise === 'string' ? value.exercise.trim() : ''
  const answer = typeof value.answer === 'string' ? value.answer.trim() : ''
  const attempt = typeof value.attempt === 'string' ? value.attempt.trim() : ''
  const steps = Array.isArray(value.steps)
    ? value.steps.map((step) => String(step).trim()).filter(Boolean).slice(0, 8)
    : []
  if (!exercise && !answer) return null
  const lines = [
    exercise ? `Enunciado: ${exercise}` : '',
    steps.length > 0 ? `Proceso:\n${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}` : '',
    answer ? `Respuesta: ${answer}` : '',
    attempt ? `Intento visible: ${attempt}` : '',
  ].filter(Boolean)
  const text = stripMathDelimiters(lines.join('\n')).trim()
  return text ? text.slice(0, MAX_BRIEF) : null
}

export async function solveExerciseBrief(opts: {
  text: string
  photoBase64: string | null
  usage: LlmUsageContext
}): Promise<string | null> {
  if (!opts.text.trim() && !opts.photoBase64) return null
  try {
    const raw = await callGemini({
      system: EXERCISE_BRIEF_SYSTEM,
      user: JSON.stringify({ exercise_text: opts.text.slice(0, 2000) }),
      photoBase64: opts.photoBase64,
      photoCaption:
        'Ejercicio a resolver de una sola vez. Si ya hay un intento escrito, anótalo aparte y resuelve igual la respuesta correcta.',
      usage: opts.usage,
    })
    return formatExerciseBrief(raw)
  } catch {
    return null
  }
}

export function hideExerciseBrief<T extends { exercise_brief?: string }>(context: T): Omit<T, 'exercise_brief'> {
  const copy = { ...context }
  delete copy.exercise_brief
  return copy
}
