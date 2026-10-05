import { truncateChars } from '../../../utils/helpers.js'
import { isSceneRecord, prepareScene } from '../../board/pipeline.js'
import type { MissionView } from '../repositories/world.repository.js'

export function normalizeDrawOps(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function drawableOps(raw: unknown): unknown[] {
  return normalizeDrawOps(raw).filter((op) => {
    if (!op || typeof op !== 'object') return false
    const kind = String((op as { op?: string }).op ?? '')
    return kind !== 'clear_board' && kind !== 'clear_layer' && kind !== 'clear'
  })
}

function hasUsableDrawOps(raw: unknown) {
  return drawableOps(raw).length > 0
}

function looksLikeSymbolicPrompt(prompt: string) {
  const t = prompt.toLowerCase()
  return /ecuaci|inc[oó]gnit|despej|\bx\s*[=+\-]|[=+\-×x*/÷]\s*\d|\d+\s*[=+\-×x*/÷]/.test(t)
}

function drawOpsHaveProblemText(ops: unknown) {
  return drawableOps(ops).some((op) => {
    if (!op || typeof op !== 'object') return false
    const rec = op as { op?: string; type?: string; label?: string }
    return rec.op === 'shape' && rec.type === 'text' && String(rec.label ?? '').trim() !== ''
  })
}

function isFrameShape(op: unknown) {
  if (!op || typeof op !== 'object') return false
  const rec = op as { op?: string; type?: string; id?: string }
  if (rec.op === 'stamp' && rec.id === 'square') return true
  if (rec.op === 'shape' && (rec.type === 'rectangle' || rec.type === 'square')) return true
  return false
}

function sanitizeBoardDrawOps(prompt: string, ops: unknown): unknown[] {
  let next = normalizeDrawOps(ops)
  if (looksLikeSymbolicPrompt(prompt)) {
    next = next.filter((op) => !isFrameShape(op))
  }
  return next
}

function drawOpsAreGenericFrame(ops: unknown) {
  const drawable = drawableOps(ops)
  if (drawable.length === 0) return true
  return drawable.every(isFrameShape) && !drawOpsHaveProblemText(ops)
}

export function itemWantsBoard(item: Record<string, unknown>, missionUsesBoard: boolean) {
  if (!missionUsesBoard) return false
  const kind = String(item.kind ?? '')
  if (kind === 'multiple_choice' || kind === 'short_text' || kind === 'fill_blank') return false
  if (kind === 'board_prompt') return true
  return item.requires_board === true || item.requires_board === 1
}

export function drawOpsFitPrompt(prompt: string, ops: unknown) {
  if (!hasUsableDrawOps(ops)) return false
  if (drawOpsAreGenericFrame(ops)) return false
  if (looksLikeSymbolicPrompt(prompt) && !drawOpsHaveProblemText(ops)) return false
  return true
}

export function figureFitsPrompt(prompt: string, raw: unknown) {
  if (isSceneRecord(raw)) {
    const prepared = prepareScene(raw)
    if (!prepared.ok) return false
    if (looksLikeSymbolicPrompt(prompt)) {
      return prepared.scene.objects.some((object) => object.type === 'expression')
    }
    return true
  }
  return drawOpsFitPrompt(prompt, raw)
}

export function packScene(raw: unknown) {
  const prepared = prepareScene(isSceneRecord(raw) ? raw : null)
  if (!prepared.ok || !prepared.scene) return null
  return { ...prepared.scene, items: prepared.items }
}

export function fallbackSceneForPrompt(prompt: string) {
  const text = truncateChars(prompt.trim() || 'Resuelve en la pizarra', 80)
  const expression = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'eq', type: 'expression', text }],
  })
  if (expression.ok && expression.scene) return { ...expression.scene, items: expression.items }
  const caption = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 't', type: 'caption', text }],
  })
  if (caption.ok && caption.scene) return { ...caption.scene, items: caption.items }
  return {
    schemaVersion: 1,
    objects: [{ id: 't', type: 'caption', text: 'Resuelve en la pizarra' }],
    items: [],
  }
}

export function publishPromptFigure(raw: unknown) {
  if (Array.isArray(raw)) return normalizeDrawOps(raw)
  if (raw && typeof raw === 'object') return raw
  return []
}

export function fallbackDrawOpsForPrompt(prompt: string): unknown[] {
  const label = truncateChars(prompt.trim() || 'Resuelve en la pizarra', 80)
  return [
    { op: 'clear_board' },
    { op: 'shape', type: 'text', col: 6, row: 8, w: 20, h: 2, label },
  ]
}

export function describeBoardJson(raw: unknown): string {
  if (raw == null) return ''
  let value: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    try {
      value = JSON.parse(trimmed) as unknown
    } catch {
      return truncateChars(trimmed, 800)
    }
  }
  if (!value || typeof value !== 'object') return ''
  const rec = value as {
    type?: string
    source?: string
    cols?: number
    rows?: number
    items?: unknown
    elements?: unknown
  }
  const items = Array.isArray(rec.items) ? rec.items : []
  if (rec.type === 'taskia-grid' || rec.source === 'taskia-grid' || items.length > 0) {
    const cols = Number(rec.cols ?? 160)
    const rows = Number(rec.rows ?? 100)
    const header = `Grilla ${cols}x${rows} (col 0–${cols - 1}, fila 0–${rows - 1}). Origen arriba-izquierda.`
    const rowsOut = items.slice(0, 40).map((el) => {
      if (!el || typeof el !== 'object') return ''
      const item = el as Record<string, unknown>
      const who = item.layer === 'ai' ? 'AI' : 'Alumno'
      const kind = String(item.stamp ?? item.kind ?? 'forma')
      const text = typeof item.text === 'string' && item.text.trim() ? ` "${item.text.trim()}"` : ''
      return `${who}: ${kind}${text} en (${Number(item.col ?? 0)},${Number(item.row ?? 0)}) ${Number(item.w ?? 1)}x${Number(item.h ?? 1)}`
    })
    if (items.length === 0) return `${header}\nLa pizarra está vacía.`
    const extra = items.length > 40 ? `\n…y ${items.length - 40} formas más.` : ''
    return `${header}\n${rowsOut.filter(Boolean).join('\n')}${extra}`
  }
  const elements = Array.isArray(rec.elements) ? rec.elements : []
  if (elements.length === 0) return 'La pizarra está vacía.'
  return `La pizarra tiene ${elements.length} elemento(s) en un formato viejo.`
}

export function sanitizeFittedDrawOps(prompt: string, ops: unknown) {
  return sanitizeBoardDrawOps(prompt, ops)
}

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
  return key || '—'
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
