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
  'point_on_circle',
  'radius',
  'diameter',
  'chord',
  'tangent_line',
  'secant',
  'central_angle',
  'inscribed_angle',
  'mark',
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
    return rotationOk(object, id)
  }
  if (object.type === 'point_on_circle') {
    if (!isRef(object.circle)) return { code: 'BAD_SCHEMA', objectId: id }
    if (object.angleDeg != null && num(object.angleDeg) == null) return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'radius') {
    if (!isRef(object.circle) || !isRef(object.to)) return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'diameter') {
    if (!isRef(object.circle)) return { code: 'BAD_SCHEMA', objectId: id }
    const pair = isRef(object.from) && isRef(object.to)
    const one = isRef(object.through) && object.from == null && object.to == null
    if (!pair && !one) return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'chord') {
    if (!isRef(object.circle) || !isRef(object.from) || !isRef(object.to)) return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'tangent_line') {
    if (!isRef(object.circle) || !isRef(object.at)) return { code: 'BAD_SCHEMA', objectId: id }
    if (object.arrows != null && typeof object.arrows !== 'boolean') return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'secant') {
    if (!isRef(object.circle) || !Array.isArray(object.through) || object.through.length !== 2) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    if (!object.through.every((ref) => isRef(ref))) return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'central_angle') {
    if (!isRef(object.circle) || !isRef(object.from) || !isRef(object.to)) return { code: 'BAD_SCHEMA', objectId: id }
    if (object.degrees != null && !positive(object.degrees)) return { code: 'BAD_SCHEMA', objectId: id }
    if (object.major != null && typeof object.major !== 'boolean') return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'inscribed_angle') {
    if (!isRef(object.circle) || !isRef(object.vertex) || !isRef(object.from) || !isRef(object.to)) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    if (object.degrees != null) return { code: 'BAD_SCHEMA', objectId: id }
    if (object.sameArc != null && !isRef(object.sameArc)) return { code: 'BAD_SCHEMA', objectId: id }
    return null
  }
  if (object.type === 'mark') {
    const kinds = new Set(['right_angle', 'equal_side', 'parallel', 'dimension', 'angle_arc'])
    if (typeof object.kind !== 'string' || !kinds.has(object.kind) || !isRef(object.of)) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    if ((object.kind === 'dimension' || object.kind === 'angle_arc') && (typeof object.text !== 'string' || !object.text.trim() || object.text.length > 16)) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
    if (object.group != null && (typeof object.group !== 'string' || !/^[a-z0-9]{1,4}$/.test(object.group))) {
      return { code: 'BAD_SCHEMA', objectId: id }
    }
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
  if ((rec.type !== 'enter_value' && rec.type !== 'multiple_choice') || typeof rec.target !== 'string' || !rec.target.trim()) {
    return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
  }
  const task: SceneTask = { type: rec.type, target: rec.target.trim() }
  if (typeof rec.unit === 'string' && rec.unit.trim()) task.unit = rec.unit.trim().slice(0, 16)
  if (rec.type === 'multiple_choice') {
    if (rec.claimedAnswer != null) return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
    if (!Array.isArray(rec.choices) || rec.choices.length < 2 || rec.choices.length > 5) {
      return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
    }
    const choices = []
    const seen = new Set<string>()
    for (const choice of rec.choices) {
      if (!choice || typeof choice !== 'object') return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
      const row = choice as { id?: unknown; text?: unknown }
      const id = typeof row.id === 'string' ? row.id : ''
      const text = typeof row.text === 'string' ? row.text.trim() : ''
      if (!/^[a-z]$/.test(id) || !text || text.length > 20 || seen.has(id)) {
        return { ok: false, issues: [{ code: 'BAD_SCHEMA' }] }
      }
      seen.add(id)
      choices.push({ id, text })
    }
    task.choices = choices
    return { ok: true, task }
  }
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
