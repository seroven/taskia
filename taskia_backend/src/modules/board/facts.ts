import { hasExpander } from './expand.js'
import { nearly } from './geom.js'
import type { Scene, SceneIssue, SceneObject } from './types.js'
import { SCENE_DRAWN_MESSAGE, SCENE_FALLBACK_MESSAGE } from './types.js'

const RELATIONS = new Set([
  'midpoint',
  'parallel_to',
  'perpendicular_to',
  'reflection_of',
  'intersection_of',
])

export type BoardFact =
  | { kind: 'object'; type: string }
  | { kind: 'relation'; type: string }
  | { kind: 'number'; value: number }
  | { kind: 'label'; text: string }
  | { kind: 'question'; target: string }

export type BoardFactsResult = {
  facts: BoardFact[]
  statement: string
  unsupported: string | null
}

export function normalizeGapKey(raw: string) {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z_]/g, '')
    .slice(0, 40)
  return key || 'other'
}

export function parseFactsPayload(raw: unknown): BoardFactsResult {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const facts = Array.isArray(row.facts) ? row.facts.slice(0, 30).flatMap(parseFact) : []
  const statement = typeof row.statement === 'string' ? row.statement.trim().slice(0, 280) : ''
  const named = typeof row.unsupported === 'string' ? row.unsupported.trim() : ''
  const fromFacts = unsupportedInFacts(facts)
  const unsupported = named || fromFacts
  return { facts, statement, unsupported: unsupported ? normalizeGapKey(unsupported) : null }
}

export function parseStoredFacts(raw: string | null | undefined): BoardFactsResult | null {
  if (!raw?.trim()) return null
  try {
    const parsed = parseFactsPayload(JSON.parse(raw) as unknown)
    if (!parsed.facts.length && !parsed.unsupported && !parsed.statement) return null
    return parsed
  } catch {
    return null
  }
}

export function coverScene(facts: BoardFact[], scene: Scene): SceneIssue[] {
  const blocked = unsupportedInFacts(facts)
  if (blocked) return [{ code: 'UNSUPPORTED', objectId: normalizeGapKey(blocked) }]
  const issues: SceneIssue[] = []
  const objects = countBy(scene.objects, (object) => object.type)
  const relations = countBy(
    scene.objects.filter((object) => RELATIONS.has(object.type)),
    (object) => object.type,
  )
  const wantedObjects = countBy(
    facts.filter((fact): fact is Extract<BoardFact, { kind: 'object' }> => fact.kind === 'object'),
    (fact) => fact.type,
  )
  const wantedRelations = countBy(
    facts.filter((fact): fact is Extract<BoardFact, { kind: 'relation' }> => fact.kind === 'relation'),
    (fact) => fact.type,
  )
  for (const [type, count] of wantedObjects) {
    if ((objects.get(type) ?? 0) < count) issues.push({ code: 'MISSING_FACT', objectId: type })
  }
  for (const [type, count] of wantedRelations) {
    if ((relations.get(type) ?? 0) < count) issues.push({ code: 'MISSING_FACT', objectId: type })
  }
  const numbers = collectNumbers(scene.objects)
  for (const fact of facts) {
    if (fact.kind === 'number' && !numbers.some((value) => nearly(value, fact.value))) {
      issues.push({ code: 'MISSING_FACT', objectId: 'number' })
    }
    if (fact.kind === 'label' && !collectTexts(scene.objects).some((text) => text.includes(fact.text.toLowerCase()))) {
      issues.push({ code: 'MISSING_FACT', objectId: 'label' })
    }
    if (fact.kind === 'question' && scene.task?.target !== fact.target) {
      issues.push({ code: 'MISSING_FACT', objectId: fact.target })
    }
  }
  return issues
}

export function unsupportedOf(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const value = (raw as { unsupported?: unknown }).unsupported
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function isConfirmMessage(text: string) {
  return /^(s[ií]|ok|okay|dale|dibuja(?:lo)?|correcto|de acuerdo|est[aá] bien|yes|va|claro|adelante)[.!?\s]*$/i.test(
    text.trim(),
  )
}

export function factsConfirmText(result: BoardFactsResult) {
  const bits = result.facts.map(describeFact)
  const lead = result.statement ? `${result.statement} ` : ''
  const body = bits.length > 0 ? `Entendí esto: ${bits.join('; ')}. ` : ''
  return `${lead}${body}¿Lo dibujo así?`.trim()
}

export function finishSpeak(speak: string, mode: 'drawn' | 'fallback', statement = '') {
  if (mode === 'fallback') return SCENE_FALLBACK_MESSAGE
  const parts = [statement.trim(), speak.trim()].filter(Boolean)
  const joined = parts.join(' ')
  if (joined.includes(SCENE_DRAWN_MESSAGE)) return joined
  return `${joined} ${SCENE_DRAWN_MESSAGE}`.trim()
}

function parseFact(raw: unknown): BoardFact[] {
  if (!raw || typeof raw !== 'object') return []
  const row = raw as Record<string, unknown>
  if (row.kind === 'object' && typeof row.type === 'string' && row.type.trim()) {
    return [{ kind: 'object', type: row.type.trim().slice(0, 40) }]
  }
  if (row.kind === 'relation' && typeof row.type === 'string' && row.type.trim()) {
    return [{ kind: 'relation', type: row.type.trim().slice(0, 40) }]
  }
  if (row.kind === 'number' && typeof row.value === 'number' && Number.isFinite(row.value)) {
    return [{ kind: 'number', value: row.value }]
  }
  if (row.kind === 'label' && typeof row.text === 'string' && row.text.trim()) {
    return [{ kind: 'label', text: row.text.trim().slice(0, 40) }]
  }
  if (row.kind === 'question' && typeof row.target === 'string' && row.target.trim()) {
    return [{ kind: 'question', target: row.target.trim().slice(0, 40) }]
  }
  return []
}

function unsupportedInFacts(facts: BoardFact[]) {
  for (const fact of facts) {
    if (fact.kind === 'object' && !hasExpander(fact.type)) return fact.type
    if (fact.kind === 'relation' && !RELATIONS.has(fact.type)) return fact.type
  }
  return ''
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const name = key(item)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return counts
}

function collectNumbers(objects: SceneObject[]) {
  const found: number[] = []
  for (const object of objects) collectNumberValues(object, found)
  return found
}

function collectNumberValues(value: unknown, found: number[]) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    found.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumberValues(item, found)
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, item] of Object.entries(value)) {
    if (key === 'id' || key === 'type' || key === 'vertexLabels') continue
    collectNumberValues(item, found)
  }
}

function collectTexts(objects: SceneObject[]) {
  const found: string[] = []
  for (const object of objects) {
    for (const [key, value] of Object.entries(object)) {
      if (key === 'id' || key === 'type') continue
      if (typeof value === 'string' && value.trim()) found.push(value.toLowerCase())
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item.trim()) found.push(item.toLowerCase())
        }
      }
    }
  }
  return found
}

function describeFact(fact: BoardFact) {
  if (fact.kind === 'object') return fact.type
  if (fact.kind === 'relation') return fact.type
  if (fact.kind === 'number') return String(fact.value)
  if (fact.kind === 'label') return fact.text
  return fact.target
}
