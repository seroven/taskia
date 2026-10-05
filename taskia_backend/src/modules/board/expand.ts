import { defaultLabels, formatMeasure, rotateAround } from './geom.js'
import { parseMath, type ParsedMath } from './expression.js'
import { MAX_CANON, type Pt, type Scene, type SceneIssue, type SceneObject } from './types.js'

export type Canon =
  | { kind: 'point'; id: string; at?: Pt; sourceId: string }
  | { kind: 'segment'; id: string; from: string; to: string; label?: string; length?: number; sourceId: string; interactive?: boolean }
  | { kind: 'polygon'; id: string; vertices: string[]; sides?: Record<string, number>; angles?: Record<string, number>; sourceId: string }
  | { kind: 'circle'; id: string; center: string; radius: number; label?: string; sourceId: string; interactive?: boolean }
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

type Expander = (object: SceneObject, out: Canon[], issues: SceneIssue[]) => void

const expanders = new Map<string, Expander>()

export function registerExpander(type: string, expander: Expander) {
  expanders.set(type, expander)
}

export function expandScene(scene: Scene): { canon: Canon[]; issues: SceneIssue[] } {
  const canon: Canon[] = []
  const issues: SceneIssue[] = []
  for (const object of scene.objects) {
    const expander = expanders.get(object.type)
    if (!expander) {
      issues.push({ code: 'BAD_SCHEMA', objectId: object.id })
      continue
    }
    expander(object, canon, issues)
  }
  if (canon.length > MAX_CANON) issues.push({ code: 'BAD_SCHEMA' })
  return { canon, issues }
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
    [formatMeasure(a), formatMeasure(Math.hypot(a, b)), formatMeasure(b)],
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
    label: typeof object.label === 'string' ? object.label : formatMeasure(Number(object.radius)),
    sourceId: object.id,
    interactive: interactive(object),
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
