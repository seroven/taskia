import { callGemini } from '../infrastructure/gemini/gemini.client.js'
import { TASK_EFFORT_SYSTEM } from '../prompts/task-effort.js'
import { clampEffortScore } from './xp.js'
import { extractJson, truncateChars } from '../utils/helpers.js'

/** Esfuerzo 1–100 para XP de tarea/proyecto cerrado con Taskia. */
export async function scoreTaskEffort(opts: {
  userId: number
  evidence: string
  userTurns: number
  topicSummary: string
}) {
  try {
    const raw = await callGemini({
      system: TASK_EFFORT_SYSTEM,
      user: JSON.stringify({
        evidence: truncateChars(opts.evidence, 240),
        user_turns: opts.userTurns,
        topic_summary: truncateChars(opts.topicSummary, 120),
      }),
      short: true,
      usage: { userId: opts.userId, kind: 'task_tutor' },
    })
    const parsed = JSON.parse(extractJson(raw)) as { effort?: unknown }
    return clampEffortScore(parsed.effort, {
      passed: true,
      hasEvidence: Boolean(opts.evidence.trim()),
    })
  } catch {
    return clampEffortScore(null, {
      passed: true,
      hasEvidence: Boolean(opts.evidence.trim()),
    })
  }
}
