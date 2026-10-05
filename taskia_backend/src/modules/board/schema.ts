import { parseMath } from './expression.js'
import { MAX_OBJECTS, type Scene, type SceneIssue, type SceneObject, type SceneTask } from './types.js'

const ID = /^[A-Za-z][A-Za-z0-9_]{0,16}$/
const REF = /^[A-Za-z][A-Za-z0-9_.]{0,40}$/

const TYPES = new Set([
  'rectangle',
  'right_triangle',
  'regular_polygon',
  'path',
  'point',
  'segment',
  'polygon',
  'circle',
  'arc',
  'angle',
  'label',
  'caption',
  'number_line',
  'expression',
  'midpoint',
  'parallel_to',
  'perpendicular_to',
  'reflection_of',
  'intersection_of',
])

export function parseScene(raw: unknown): { ok: true; scene: Scene } | { ok: false; issues: SceneIssue[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
  }
  const rec = raw as Record<string, unknown>
  if (rec.schemaVersion !== 1) return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
  if (!Array.isArray(rec.objects) || rec.objects.length === 0 || rec.objects.length > MAX_OBJECTS) {
    return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
  }
  const objects: SceneObject[] = []
  const seen = new Set<string>()
  for (const item of rec.objects) {
    const parsed = parseObject(item)
    if (!parsed.ok) return parsed
    if (seen.has(parsed.object.id)) {
      return { ok: false, issues: [{ code: 'BAD_SCHEMA', objectId: parsed.object.id }] }
    }
    seen.add(parsed.object.id)
    objects.push(parsed.object)
  }
  const task = parseTask(rec.task)
  if (task && !task.ok) return task
  return { ok: true, scene: { schemaVersion: 1, objects, ...(task ? { task: task.task } : {}) } }
}

function parseObject(raw: unknown): { ok: true; object: SceneObject } | { ok: false; issues: SceneIssue[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
  }
  const rec = raw as Record<string, unknown>
  const id = typeof rec.id === 'string' ? rec.id : ''
  const type = typeof rec.type === 'string' ? rec.type : ''
  if (!ID.test(id) || !TYPES.has(type)) {
    return { ok: false, issues: [{ code: 'BAD_SCHEMA', objectId: id || undefined }] }
  }
  const object: SceneObject = { ...rec, id, type }
  const issue = checkObject(object)
  if (issue) return { ok: false, issues: [issue] }
  return { ok: true, object }
}

function checkObject(object: SceneObject): SceneIssue | null {
  const id = object.id
  if (object.type === 'rectangle') return needSize(object, id, ['width', 'height'])
  if (object.type === 'right_triangle') return needSize(object, id, ['a', 'b'])
  if (object.type === 'regular_polygon') {
    const sides = num(object.sides)
    const side = num(object.sideLength)
    if (sides == null || side == null || sides < 3 || sides > 12 || side <= 0) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    return labelsOk(object, id, sides) ?? rotationOk(object, id)
  }
  if (object.type === 'path') {
    if (!Array.isArray(object.steps) || object.steps.length < 3 || object.steps.length > 24) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    for (const step of object.steps) {
      if (!step || typeof step !== 'object') return { code: 'BAD_SCHEMA', objectId: id }
      const row = step as { length?: unknown; turn?: unknown }
      const length = num(row.length)
      if (length == null || length <= 0) return { code: 'BAD_SCHEMA', objectId: id }
      if (row.turn != null && row.turn !== 'left' && row.turn !== 'right') {
        return { code: 'BAD_SCHEMA', objectId: id }
      }
    }
    return labelsOk(object, id, object.steps.length) ?? rotationOk(object, id)
  }
  if (object.type === 'point') return null
  if (object.type === 'segment') {
    if (!isRef(object.from) || !isRef(object.to)) return { code: 'BAD_SCHEMA', objectId: id }
    if (object.length != null && !positive(object.length)) return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'polygon') {
    if (!Array.isArray(object.vertices) || object.vertices.length < 3 || object.vertices.length > 12) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    if (!object.vertices.every((vertex) => typeof vertex === 'string' && isRef(vertex))) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    return null
  }
  if (object.type === 'circle') {
    if (!isRef(object.center) || !positive(object.radius)) return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'arc' || object.type === 'angle') {
    if (!isRef(object.center ?? object.vertex) || !isRef(object.from) || !isRef(object.to)) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    if (object.type === 'angle' && object.degrees != null && !positive(object.degrees)) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    return null
  }
  if (object.type === 'label') {
    if (typeof object.text !== 'string' || !object.text.trim() || object.text.length > 40 || !isRef(object.of)) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    return null
  }
  if (object.type === 'caption') {
    if (typeof object.text !== 'string' || !object.text.trim() || object.text.length > 80) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    return null
  }
  if (object.type === 'number_line') {
    const min = num(object.min)
    const max = num(object.max)
    const step = object.step == null ? 1 : num(object.step)
    if (min == null || max == null || step == null || !(max > min) || step <= 0 || max - min > 1000) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    return null
  }
  if (object.type === 'expression') {
    if (typeof object.text !== 'string') return { code: 'BAD_EXPRESSION', objectId: id }
    const parsed = parseMath(object.text)
    if (!parsed.ok) return { code: 'BAD_EXPRESSION', objectId: id }
    return null
  }
  if (object.type === 'midpoint' || object.type === 'intersection_of') {
    if (!Array.isArray(object.of) || object.of.length !== 2 || !object.of.every((ref) => isRef(ref))) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    return null
  }
  if (object.type === 'parallel_to' || object.type === 'perpendicular_to') {
    if (!isRef(object.of) || !isRef(object.through) || !positive(object.length)) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    if (object.side != null && object.side !== 'left' && object.side !== 'right') {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    return null
  }
  if (object.type === 'reflection_of') {
    if (!isRef(object.of) || !isRef(object.over)) return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  return { code: 'BAD_SCHEMA', objectId: id }
}

function parseTask(raw: unknown): { ok: true; task: SceneTask } | { ok: false; issues: SceneIssue[] } | null {
  if (raw == null) return null
  if (!raw || typeof raw !== 'object') return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
  const rec = raw as Record<string, unknown>
  if (rec.type !== 'enter_value' || typeof rec.target !== 'string' || !rec.target.trim()) {
    return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
  }
  const task: SceneTask = { type: 'enter_value', target: rec.target.trim() }
  if (typeof rec.unit === 'string' && rec.unit.trim()) task.unit = rec.unit.trim().slice(0, 16)
  if (typeof rec.claimedAnswer === 'number' && Number.isFinite(rec.claimedAnswer)) {
    task.claimedAnswer = rec.claimedAnswer
  } else if (typeof rec.claimedAnswer === 'string' && rec.claimedAnswer.trim()) {
    task.claimedAnswer = rec.claimedAnswer.trim().slice(0, 40)
  }
  return { ok: true, task }
}

function needSize(object: SceneObject, id: string, keys: string[]) {
  for (const key of keys) {
    if (!positive(object[key])) return { code: 'BAD_SCHEMA' as const, objectId: id }
  }
  const count = object.type === 'rectangle' ? 4 : 3
  return labelsOk(object, id, count) ?? rotationOk(object, id)
}

function labelsOk(object: SceneObject, id: string, count: number): SceneIssue | null {
  if (object.vertexLabels == null) return null
  if (
    !Array.isArray(object.vertexLabels) ||
    object.vertexLabels.length !== count ||
    !object.vertexLabels.every((label) => typeof label === 'string' && ID.test(label))
  ) {
    return { code: 'BAD_SCHEMA', objectId: id }
  }
  return null
}

function rotationOk(object: SceneObject, id: string): SceneIssue | null {
  if (object.rotation == null) return null
  const rotation = num(object.rotation)
  if (rotation == null || Math.abs(rotation) > 360) return { code: 'BAD_SCHEMA', objectId: id }
  return null
}

function isRef(value: unknown) {
  return typeof value === 'string' && REF.test(value)
}

function positive(value: unknown) {
  const n = num(value)
  return n != null && n > 0 && n <= 10000
}

function num(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
