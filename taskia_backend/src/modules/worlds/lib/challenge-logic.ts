import type { MissionView } from '../repositories/world.repository.js'

export function shuffleArray<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]!
    next[i] = next[j]!
    next[j] = tmp
  }
  return next
}

export function groupMissionsByCourse(missions: MissionView[]) {
  const groups: Array<{ course_id: number; course_name: string; missions: MissionView[] }> = []
  const index = new Map<number, (typeof groups)[number]>()
  for (const mission of missions) {
    let group = index.get(mission.course_id)
    if (!group) {
      group = { course_id: mission.course_id, course_name: mission.course_name, missions: [] }
      index.set(mission.course_id, group)
      groups.push(group)
    }
    group.missions.push(mission)
  }
  return groups
}

export function distributeQuestionCounts(weights: number[], total: number): number[] {
  const sum = weights.reduce((acc, n) => acc + n, 0)
  if (sum <= 0 || total <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (total * w) / sum)
  const counts = raw.map((n) => Math.floor(n))
  let leftover = total - counts.reduce((acc, n) => acc + n, 0)
  const order = raw
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac)
  for (const item of order) {
    if (leftover <= 0) break
    counts[item.i] += 1
    leftover -= 1
  }
  return counts
}

export function estimateMaxQuestionsFromMaterial(
  missions: Array<{
    description: string | null
    topic_summary: string
    context_summary: string
    studied_text: string
  }>,
  requested: number,
): number {
  let chars = 0
  let withBody = 0
  for (const mission of missions) {
    const body = [mission.studied_text, mission.topic_summary, mission.context_summary, mission.description ?? '']
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join('\n')
    if (body.length < 24) continue
    withBody += 1
    chars += body.length
  }
  if (withBody === 0) return Math.min(requested, 3)
  const fromChars = Math.floor(chars / 40)
  const fromMissions = withBody * 8
  const estimated = Math.max(fromChars, fromMissions)
  return Math.max(1, Math.min(requested, estimated))
}

export function normalizeOptionsList(raw: unknown): string[] | null {
  if (raw == null) return null
  let value: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed || trimmed === 'null') return null
    try {
      value = JSON.parse(trimmed)
    } catch {
      return null
    }
  }
  if (Array.isArray(value)) {
    const texts = value
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          const candidate = obj.text ?? obj.label ?? obj.option ?? obj.value ?? obj.content
          return typeof candidate === 'string' ? candidate.trim() : ''
        }
        return ''
      })
      .filter(Boolean)
      .map((text) => text.replace(/^[A-D][).:\-]\s*/i, '').trim())
      .filter(Boolean)
    return texts.length > 0 ? texts : null
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const ordered = ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd', '1', '2', '3', '4']
    const fromKeys: string[] = []
    for (const key of ordered) {
      const entry = obj[key]
      if (typeof entry === 'string' && entry.trim()) {
        fromKeys.push(entry.trim().replace(/^[A-D][).:\-]\s*/i, ''))
      }
    }
    if (fromKeys.length >= 2) return fromKeys
  }
  return null
}

export function normalizeAnswerKey(kind: string, answerKey: string, options: string[] | null) {
  const raw = answerKey.trim()
  if (kind !== 'multiple_choice') return raw
  const letter = /^[A-D]/i.exec(raw)?.[0]?.toUpperCase()
  if (letter) return letter
  if (options) {
    const idx = options.findIndex((option) => option.toLowerCase() === raw.toLowerCase())
    if (idx >= 0 && idx < 4) return String.fromCharCode(65 + idx)
  }
  return raw || 'A'
}

export function formatCorrectAnswer(kind: string, answerKey: string, options: string[] | null) {
  const key = answerKey.trim()
  if (kind === 'multiple_choice' && options && options.length > 0) {
    const letter = /^[A-D]/i.exec(key)?.[0]?.toUpperCase()
    if (letter) {
      const idx = letter.charCodeAt(0) - 65
      const text = options[idx]
      if (text) return `${letter}. ${text}`
      return letter
    }
  }
  return key || 'â€”'
}

export function gradeMultipleChoice(answerText: string, answerKey: string) {
  const normalized = answerText.trim().toUpperCase()
  const key = answerKey.trim().toUpperCase()
  const keyLetter = /^[A-D](?=$|[\s).:-])/.exec(key)?.[0]
  const answerLetter = /^[A-D](?=$|[\s).:-])/.exec(normalized)?.[0]
  return Boolean(
    normalized &&
      key &&
      (normalized === key || (keyLetter != null && answerLetter === keyLetter)),
  )
}
