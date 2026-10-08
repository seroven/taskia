import { callGemini } from '../infrastructure/gemini/gemini.client.js'
import type { LlmUsageKind } from '../infrastructure/gemini/gemini.client.js'
import { STUDY_MODE_SYSTEM, parseStudyMode } from '../prompts/study-mode.js'
import { truncateChars } from '../utils/helpers.js'

/** null si la llamada falla: el caller reintenta en el próximo turno. */
export async function classifyStudyMode(opts: {
  userId: number
  kind: Extract<LlmUsageKind, 'task_tutor' | 'mission_tutor'>
  title: string
  description: string
  notebook?: string
}): Promise<'theoretical' | 'practical' | null> {
  try {
    const raw = await callGemini({
      system: STUDY_MODE_SYSTEM,
      user: JSON.stringify({
        title: truncateChars(opts.title, 160),
        description: truncateChars(opts.description, 400),
        notebook: truncateChars(opts.notebook ?? '', 2000),
      }),
      short: true,
      usage: { userId: opts.userId, kind: opts.kind },
    })
    return parseStudyMode(raw)
  } catch {
    return null
  }
}
