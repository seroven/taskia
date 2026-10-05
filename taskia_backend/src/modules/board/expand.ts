import { defaultLabels, formatMeasure, rotateAround } from './geom.js'
import { evalExpr, parseMath, type ParsedMath } from './expression.js'
import { MAX_CANON, type Pt, type Scene, type SceneIssue, type SceneObject } from './types.js'

export type Canon =
  | { kind: 'point'; id: string; at?: Pt; sourceId: string }
  | { kind: 'segment'; id: string; from: string; to: string; label?: string; length?: number; sourceId: string; interactive?: boolean }
  | { kind: 'polygon'; id: string; vertices: string[]; sides?: Record<string, number>; angles?: Record<string, number>; sourceId: string }
  | { kind: 'circle'; id: string; center: string; radius: number; label?: string; rotation?: number; sourceId: string; interactive?: boolean }
  | { kind: 'arc'; id: string; center: string; from: string; to: string; sourceId: string }
  | { kind: 'angle'; id: string; vertex: string; from: string; to: string; degrees?: number; label?: string; sourceId: string }
  | { kind: 'label'; id: string; text: string; of: string; sourceId: string }
  | { kind: 'caption'; id: string; text: string; sourceId: string; interactive?: boolean }
  | { kind: 'number_line'; id: string; min: number; max: number; step: number; sourceId: string; interactive?: boolean }
  | { kind: 'expression'; id: string; text: string; math: ParsedMath; sourceId: string; interactive?: boolean }
  | { kind: 'midpoint'; id: string; of: [string, string]; sourceId: string }
  | { kind: 'parallel'; id: string; of: string; through: string; length: number; side: 'left' | 'right'; sourceId: string }
  | { kind: 'perpendicular'; id: string; of: string; through: string; length: number; side: 'left' | 'right'; sourceId: string }
  | { kind: 'reflection'; id: string; of: string; over: string; sourceId: string }
  | { kind: 'intersection'; id: string; of: [string, string]; sourceId: string }
  | { kind: 'on_circle'; id: string; circle: string; angleDeg: number | null; sourceId: string }
  | { kind: 'tangent'; id: string; circle: string; at: string; sourceId: string }
  | { kind: 'secant'; id: string; circle: string; through: [string, string]; sourceId: string }
  | { kind: 'central'; id: string; circle: string; from: string; to: string; degrees?: number; major?: boolean; label?: string; sourceId: string }
  | { kind: 'inscribed'; id: string; circle: string; vertex: string; from: string; to: string; sameArc?: string; label?: string; sourceId: string }
  | { kind: 'antipode'; id: string; circle: string; through: string; sourceId: string }
  | { kind: 'chord'; id: string; circle: string; from: string; to: string; sourceId: string }

export type Mark = {
  id: string
  kind: 'right_angle' | 'equal_side' | 'parallel' | 'dimension' | 'angle_arc'
  of: string
  group?: string
  text?: string
  sourceId: string
}

type Expander = (
  object: SceneObject,
  out: Canon[],
  issues: SceneIssue[],
  marks: Mark[],
  scene: Scene,
) => void

const expanders = new Map<string, Expander>()

export function registerExpander(type: string, expander: Expander) {
  expanders.set(type, expander)
}

export function expanderNames(): string[] {
  return [...expanders.keys()]
}

export function hasExpander(type: string) {
  return expanders.has(type)
}

export function expandScene(scene: Scene): { canon: Canon[]; marks: Mark[]; issues: SceneIssue[] } {
  const canon: Canon[] = []
  const marks: Mark[] = []
  const issues: SceneIssue[] = []
  for (const object of scene.objects) {
    const expander = expanders.get(object.type)
    if (!expander) {
      issues.push({ code: 'BAD_SCHEMA', objectId: object.id })
      continue
    }
    expander(object, canon, issues, marks, scene)
  }
  if (canon.length > MAX_CANON) issues.push({ code: 'BAD_SCHEMA' })
  return { canon, marks, issues }
}

function vertexId(shapeId: string, label: string) {
  return `${shapeId}.${label}`
}

function interactive(object: SceneObject) {
  return object.interactive === true
}

function emitLoop(
  object: SceneObject,
  points: Pt[],
  labels: string[],
  edgeLabels: Array<string | undefined>,
  out: Canon[],
) {
  const origin = points[0] ?? { x: 0, y: 0 }
  const rotation = typeof object.rotation === 'number' ? object.rotation : 0
  const placed = points.map((point) => rotateAround(point, origin, rotation))
  const ids = labels.map((label) => vertexId(object.id, label))
  placed.forEach((point, index) => {
    out.push({ kind: 'point', id: ids[index]!, at: point, sourceId: object.id })
  })
  for (let index = 0; index < ids.length; index += 1) {
    const next = (index + 1) % ids.length
    out.push({
      kind: 'segment',
      id: `${object.id}.e${index}`,
      from: ids[index]!,
      to: ids[next]!,
      label: edgeLabels[index],
      sourceId: object.id,
      interactive: interactive(object),
    })
  }
  out.push({ kind: 'polygon', id: object.id, vertices: ids, sourceId: object.id })
}

registerExpander('rectangle', (object, out) => {
  const width = Number(object.width)
  const height = Number(object.height)
  const labels = (object.vertexLabels as string[] | undefined) ?? defaultLabels(4)
  emitLoop(
    object,
    [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
    labels,
    [formatMeasure(width), formatMeasure(height), formatMeasure(width), formatMeasure(height)],
    out,
  )
})

registerExpander('right_triangle', (object, out) => {
  const a = Number(object.a)
  const b = Number(object.b)
  const labels = (object.vertexLabels as string[] | undefined) ?? defaultLabels(3)
  emitLoop(
    object,
    [
      { x: 0, y: 0 },
      { x: a, y: 0 },
      { x: 0, y: b },
    ],
    labels,
    [formatMeasure(a), undefined, formatMeasure(b)],
    out,
  )
})

registerExpander('regular_polygon', (object, out) => {
  const sides = Number(object.sides)
  const side = Number(object.sideLength)
  const labels = (object.vertexLabels as string[] | undefined) ?? defaultLabels(sides)
  const points: Pt[] = [{ x: 0, y: 0 }]
  let heading = 0
  for (let index = 1; index < sides; index += 1) {
    const prev = points[index - 1]!
    points.push({
      x: prev.x + Math.cos(heading) * side,
      y: prev.y + Math.sin(heading) * side,
    })
    heading += (2 * Math.PI) / sides
  }
  emitLoop(
    object,
    points,
    labels,
    Array.from({ length: sides }, (_, index) => (index === 0 ? formatMeasure(side) : undefined)),
    out,
  )
})

registerExpander('path', (object, out, issues) => {
  const steps = object.steps as Array<{ length: number; turn?: 'left' | 'right' }>
  const labels = (object.vertexLabels as string[] | undefined) ?? defaultLabels(steps.length)
  const points: Pt[] = [{ x: 0, y: 0 }]
  let heading = 0
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]!
    if (index > 0 && step.turn) heading += step.turn === 'left' ? Math.PI / 2 : -Math.PI / 2
    const prev = points[points.length - 1]!
    points.push({
      x: prev.x + Math.cos(heading) * Number(step.length),
      y: prev.y + Math.sin(heading) * Number(step.length),
    })
  }
  const end = points[points.length - 1]!
  if (Math.hypot(end.x, end.y) > 1e-3) {
    issues.push({ code: 'UNDERDETERMINED', objectId: object.id })
    return
  }
  points.pop()
  emitLoop(
    object,
    points,
    labels,
    steps.map((step) => formatMeasure(Number(step.length))),
    out,
  )
})

registerExpander('point', (object, out) => {
  out.push({ kind: 'point', id: object.id, sourceId: object.id })
})

registerExpander('segment', (object, out) => {
  out.push({
    kind: 'segment',
    id: object.id,
    from: String(object.from),
    to: String(object.to),
    label: typeof object.label === 'string' ? object.label : undefined,
    length: typeof object.length === 'number' ? object.length : undefined,
    sourceId: object.id,
    interactive: interactive(object),
  })
})

registerExpander('polygon', (object, out) => {
  const sides = object.sides
  const angles = object.angles
  out.push({
    kind: 'polygon',
    id: object.id,
    vertices: object.vertices as string[],
    sides: sides && typeof sides === 'object' ? (sides as Record<string, number>) : undefined,
    angles: angles && typeof angles === 'object' ? (angles as Record<string, number>) : undefined,
    sourceId: object.id,
  })
})

registerExpander('circle', (object, out) => {
  out.push({
    kind: 'circle',
    id: object.id,
    center: String(object.center),
    radius: Number(object.radius),
    label: typeof object.label === 'string' ? object.label : undefined,
    sourceId: object.id,
    interactive: interactive(object),
    ...(typeof object.rotation === 'number' ? { rotation: object.rotation } : {}),
  })
})

registerExpander('arc', (object, out) => {
  out.push({
    kind: 'arc',
    id: object.id,
    center: String(object.center),
    from: String(object.from),
    to: String(object.to),
    sourceId: object.id,
  })
})

registerExpander('angle', (object, out) => {
  out.push({
    kind: 'angle',
    id: object.id,
    vertex: String(object.vertex),
    from: String(object.from),
    to: String(object.to),
    degrees: typeof object.degrees === 'number' ? object.degrees : undefined,
    label: typeof object.label === 'string' ? object.label : undefined,
    sourceId: object.id,
  })
})

registerExpander('label', (object, out) => {
  out.push({
    kind: 'label',
    id: object.id,
    text: String(object.text),
    of: String(object.of),
    sourceId: object.id,
  })
})

registerExpander('caption', (object, out) => {
  out.push({
    kind: 'caption',
    id: object.id,
    text: String(object.text).trim(),
    sourceId: object.id,
    interactive: interactive(object),
  })
})

registerExpander('number_line', (object, out) => {
  out.push({
    kind: 'number_line',
    id: object.id,
    min: Number(object.min),
    max: Number(object.max),
    step: object.step == null ? 1 : Number(object.step),
    sourceId: object.id,
    interactive: interactive(object),
  })
})

registerExpander('expression', (object, out, issues) => {
  const parsed = parseMath(String(object.text ?? ''))
  if (!parsed.ok) {
    issues.push({ code: 'BAD_EXPRESSION', objectId: object.id })
    return
  }
  if (
    parsed.math.kind === 'value' &&
    parsed.math.variables.length === 0 &&
    !evalExpr(parsed.math.expr, {})
  ) {
    issues.push({ code: 'BAD_EXPRESSION', objectId: object.id })
    return
  }
  out.push({
    kind: 'expression',
    id: object.id,
    text: String(object.text).trim(),
    math: parsed.math,
    sourceId: object.id,
    interactive: interactive(object),
  })
})

registerExpander('midpoint', (object, out) => {
  const of = object.of as [string, string]
  out.push({ kind: 'midpoint', id: object.id, of, sourceId: object.id })
})

registerExpander('parallel_to', (object, out) => {
  out.push({
    kind: 'parallel',
    id: object.id,
    of: String(object.of),
    through: String(object.through),
    length: Number(object.length),
    side: object.side === 'right' ? 'right' : 'left',
    sourceId: object.id,
  })
})

registerExpander('perpendicular_to', (object, out) => {
  out.push({
    kind: 'perpendicular',
    id: object.id,
    of: String(object.of),
    through: String(object.through),
    length: Number(object.length),
    side: object.side === 'right' ? 'right' : 'left',
    sourceId: object.id,
  })
})

registerExpander('reflection_of', (object, out) => {
  out.push({
    kind: 'reflection',
    id: object.id,
    of: String(object.of),
    over: String(object.over),
    sourceId: object.id,
  })
})

registerExpander('intersection_of', (object, out) => {
  const of = object.of as [string, string]
  out.push({ kind: 'intersection', id: object.id, of, sourceId: object.id })
})

registerExpander('point_on_circle', (object, out) => {
  out.push({ kind: 'point', id: object.id, sourceId: object.id })
  out.push({
    kind: 'on_circle',
    id: object.id,
    circle: String(object.circle),
    angleDeg: typeof object.angleDeg === 'number' ? object.angleDeg : null,
    sourceId: object.id,
  })
})

registerExpander('radius', (object, out, issues, _marks, scene) => {
  const center = circleCenter(scene, object.circle)
  if (!center) {
    issues.push({ code: 'BAD_REFERENCE', objectId: object.id })
    return
  }
  out.push({
    kind: 'segment',
    id: object.id,
    from: center,
    to: String(object.to),
    label: typeof object.label === 'string' ? object.label : undefined,
    sourceId: object.id,
  })
})

registerExpander('diameter', (object, out, issues, _marks, scene) => {
  const center = circleCenter(scene, object.circle)
  if (!center) {
    issues.push({ code: 'BAD_REFERENCE', objectId: object.id })
    return
  }
  const from = typeof object.from === 'string' ? object.from : typeof object.through === 'string' ? object.through : ''
  const to = typeof object.to === 'string' ? object.to : `${object.id}.far`
  if (!from) {
    issues.push({ code: 'BAD_SCHEMA', objectId: object.id })
    return
  }
  if (typeof object.to !== 'string') {
    out.push({ kind: 'antipode', id: to, circle: String(object.circle), through: from, sourceId: object.id })
    out.push({ kind: 'point', id: to, sourceId: object.id })
  }
  out.push({
    kind: 'segment',
    id: object.id,
    from,
    to,
    label: typeof object.label === 'string' ? object.label : undefined,
    sourceId: object.id,
  })
  void center
})

registerExpander('chord', (object, out) => {
  out.push({
    kind: 'segment',
    id: object.id,
    from: String(object.from),
    to: String(object.to),
    label: typeof object.label === 'string' ? object.label : undefined,
    sourceId: object.id,
  })
  out.push({
    kind: 'chord',
    id: object.id,
    circle: String(object.circle),
    from: String(object.from),
    to: String(object.to),
    sourceId: object.id,
  })
})

registerExpander('tangent_line', (object, out) => {
  const a = `${object.id}.a`
  const b = `${object.id}.b`
  out.push({ kind: 'point', id: a, sourceId: object.id })
  out.push({ kind: 'point', id: b, sourceId: object.id })
  out.push({
    kind: 'segment',
    id: object.id,
    from: a,
    to: b,
    label: typeof object.label === 'string' ? object.label : undefined,
    sourceId: object.id,
  })
  out.push({
    kind: 'tangent',
    id: object.id,
    circle: String(object.circle),
    at: String(object.at),
    sourceId: object.id,
  })
})

registerExpander('secant', (object, out) => {
  const through = object.through as [string, string]
  const a = `${object.id}.a`
  const b = `${object.id}.b`
  out.push({ kind: 'point', id: a, sourceId: object.id })
  out.push({ kind: 'point', id: b, sourceId: object.id })
  out.push({
    kind: 'segment',
    id: object.id,
    from: a,
    to: b,
    label: typeof object.label === 'string' ? object.label : undefined,
    sourceId: object.id,
  })
  out.push({ kind: 'secant', id: object.id, circle: String(object.circle), through, sourceId: object.id })
})

registerExpander('central_angle', (object, out, issues, _marks, scene) => {
  const center = circleCenter(scene, object.circle)
  if (!center) {
    issues.push({ code: 'BAD_REFERENCE', objectId: object.id })
    return
  }
  out.push({
    kind: 'central',
    id: object.id,
    circle: String(object.circle),
    from: String(object.from),
    to: String(object.to),
    ...(typeof object.degrees === 'number' ? { degrees: object.degrees } : {}),
    ...(object.major === true ? { major: true } : {}),
    ...(typeof object.label === 'string' ? { label: object.label } : {}),
    sourceId: object.id,
  })
  out.push({
    kind: 'angle',
    id: object.id,
    vertex: center,
    from: String(object.from),
    to: String(object.to),
    label: typeof object.label === 'string' ? object.label : undefined,
    sourceId: object.id,
  })
})

registerExpander('inscribed_angle', (object, out) => {
  out.push({
    kind: 'inscribed',
    id: object.id,
    circle: String(object.circle),
    vertex: String(object.vertex),
    from: String(object.from),
    to: String(object.to),
    ...(typeof object.sameArc === 'string' ? { sameArc: object.sameArc } : {}),
    ...(typeof object.label === 'string' ? { label: object.label } : {}),
    sourceId: object.id,
  })
  out.push({
    kind: 'angle',
    id: object.id,
    vertex: String(object.vertex),
    from: String(object.from),
    to: String(object.to),
    label: typeof object.label === 'string' ? object.label : undefined,
    sourceId: object.id,
  })
})

registerExpander('mark', (object, _out, issues, marks) => {
  const kind = object.kind
  const allowed = new Set(['right_angle', 'equal_side', 'parallel', 'dimension', 'angle_arc'])
  if (typeof kind !== 'string' || !allowed.has(kind) || typeof object.of !== 'string') {
    issues.push({ code: 'BAD_SCHEMA', objectId: object.id })
    return
  }
  marks.push({
    id: object.id,
    kind: kind as Mark['kind'],
    of: object.of,
    ...(typeof object.group === 'string' ? { group: object.group } : {}),
    ...(typeof object.text === 'string' ? { text: object.text } : {}),
    sourceId: object.id,
  })
})

function circleCenter(scene: Scene | undefined, circleId: unknown) {
  if (!scene || typeof circleId !== 'string') return ''
  const circle = scene.objects.find((object) => object.id === circleId && object.type === 'circle')
  return circle && typeof circle.center === 'string' ? circle.center : ''
}
