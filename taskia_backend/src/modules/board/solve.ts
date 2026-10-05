import type { Canon } from './expand.js'
import { dist, lookupNamed, nearly } from './geom.js'
import type { Pt, SceneIssue } from './types.js'

type PointState = { x?: number; y?: number }

export type Solved = {
  points: Map<string, Pt>
  canon: Canon[]
  issues: SceneIssue[]
}

export function solveCanon(canon: Canon[]): Solved {
  const issues: SceneIssue[] = []
  const points = new Map<string, PointState>()
  const produced = new Set<string>()
  for (const item of canon) {
    if (item.kind === 'point') {
      points.set(item.id, item.at ? { ...item.at } : {})
      produced.add(item.id)
    }
  }
  for (const item of canon) {
    if (item.kind === 'midpoint' || item.kind === 'intersection' || item.kind === 'reflection') {
      produced.add(item.id)
    }
    if (item.kind === 'parallel' || item.kind === 'perpendicular') produced.add(`${item.id}.end`)
    if (item.kind === 'polygon') {
      for (const vertex of item.vertices) {
        if (!points.has(vertex)) points.set(vertex, {})
        produced.add(vertex)
      }
    }
    if (item.kind === 'on_circle') produced.add(item.id)
    if (item.kind === 'tangent' || item.kind === 'secant') {
      produced.add(`${item.id}.a`)
      produced.add(`${item.id}.b`)
    }
    if (item.kind === 'antipode') produced.add(item.id)
  }

  let guard = 0
  let progressed = true
  while (progressed && guard < 40) {
    guard += 1
    progressed = false
    for (const item of canon) {
      if (item.kind === 'midpoint' && placeMidpoint(item, points)) progressed = true
      if (item.kind === 'intersection' && placeIntersection(item, canon, points, issues)) progressed = true
      if (item.kind === 'parallel' && placeOffset(item, canon, points, false)) progressed = true
      if (item.kind === 'perpendicular' && placeOffset(item, canon, points, true)) progressed = true
      if (item.kind === 'reflection' && placeReflection(item, canon, points)) progressed = true
      if (item.kind === 'polygon' && placePolygon(item, points, issues)) progressed = true
      if (placeCircle(item, canon, points)) progressed = true
    }
  }
  checkOnCircle(canon, points, issues)

  for (const item of canon) {
    if (item.kind !== 'segment' || item.length == null) continue
    const a = ready(points, item.from)
    const b = ready(points, item.to)
    if (!a || !b) continue
    if (!nearly(dist(a, b), item.length)) issues.push({ code: 'SIDE_MISMATCH', objectId: item.sourceId })
  }

  const unresolved = classifyUnresolved(canon, points, produced)
  if (
    unresolved &&
    !issues.some((issue) =>
      issue.code === 'BAD_REFERENCE' ||
      issue.code === 'UNDERDETERMINED' ||
      issue.code === 'OVERCONSTRAINED',
    )
  ) {
    issues.push(unresolved)
  }

  const solved = new Map<string, Pt>()
  for (const [id, point] of points) {
    if (point.x != null && point.y != null) solved.set(id, { x: point.x, y: point.y })
  }
  return { points: solved, canon, issues: unique(issues) }
}

function placeMidpoint(item: Extract<Canon, { kind: 'midpoint' }>, points: Map<string, PointState>) {
  if (ready(points, item.id)) return false
  const a = ready(points, item.of[0])
  const b = ready(points, item.of[1])
  if (!a || !b) return false
  points.set(item.id, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  return true
}

function placeIntersection(
  item: Extract<Canon, { kind: 'intersection' }>,
  canon: Canon[],
  points: Map<string, PointState>,
  issues: SceneIssue[],
) {
  if (ready(points, item.id)) return false
  const first = segmentEnds(canon, item.of[0])
  const second = segmentEnds(canon, item.of[1])
  if (!first || !second) return false
  const a = ready(points, first.from)
  const b = ready(points, first.to)
  const c = ready(points, second.from)
  const d = ready(points, second.to)
  if (!a || !b || !c || !d) return false
  const hit = lineHit(a, b, c, d)
  if (!hit) {
    issues.push({ code: 'OVERCONSTRAINED', objectId: item.id })
    points.set(item.id, { x: 0, y: 0 })
    return true
  }
  points.set(item.id, hit)
  return true
}

function placeOffset(
  item: Extract<Canon, { kind: 'parallel' | 'perpendicular' }>,
  canon: Canon[],
  points: Map<string, PointState>,
  perpendicular: boolean,
) {
  const endId = `${item.id}.end`
  if (ready(points, endId)) return false
  const through = ready(points, item.through)
  const ends = segmentEnds(canon, item.of)
  if (!through || !ends) return false
  const a = ready(points, ends.from)
  const b = ready(points, ends.to)
  if (!a || !b) return false
  let dx = b.x - a.x
  let dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return false
  dx /= len
  dy /= len
  if (perpendicular) {
    const turn = item.side === 'right' ? { x: dy, y: -dx } : { x: -dy, y: dx }
    dx = turn.x
    dy = turn.y
  } else if (item.side === 'right') {
    dx = -dx
    dy = -dy
  }
  points.set(endId, { x: through.x + dx * item.length, y: through.y + dy * item.length })
  return true
}

function placeReflection(
  item: Extract<Canon, { kind: 'reflection' }>,
  canon: Canon[],
  points: Map<string, PointState>,
) {
  if (ready(points, item.id)) return false
  const ends = segmentEnds(canon, item.over)
  if (!ends) return false
  const a = ready(points, ends.from)
  const b = ready(points, ends.to)
  const source = ready(points, item.of)
  if (!a || !b || !source) return false
  points.set(item.id, reflectPoint(source, a, b))
  return true
}

function placePolygon(
  item: Extract<Canon, { kind: 'polygon' }>,
  points: Map<string, PointState>,
  issues: SceneIssue[],
) {
  if (item.vertices.every((id) => ready(points, id))) {
    checkPolygon(item, points, issues)
    return false
  }
  if (!item.sides && !item.angles) return false
  const ids = item.vertices
  const first = points.get(ids[0]!) ?? {}
  if (first.x == null) points.set(ids[0]!, { x: 0, y: 0 })
  let heading = 0
  let moved = false
  for (let index = 0; index < ids.length - 1; index += 1) {
    const current = ready(points, ids[index]!)
    const nextId = ids[index + 1]!
    const next = points.get(nextId) ?? {}
    if (!current) return moved
    const side = lookupNamed(item.sides, ids[index]!, nextId)
    if (next.x != null && next.y != null) {
      if (side != null && !nearly(dist(current, { x: next.x, y: next.y }), side)) {
        issues.push({ code: 'SIDE_MISMATCH', objectId: item.id })
      }
      heading = Math.atan2(next.y - current.y, next.x - current.x)
    } else if (side == null) {
      issues.push({ code: 'UNDERDETERMINED', objectId: item.id })
      return moved
    } else {
      points.set(nextId, {
        x: current.x + Math.cos(heading) * side,
        y: current.y + Math.sin(heading) * side,
      })
      moved = true
    }
    const turnAt = ids[index + 1]!
    const angle = lookupNamed(item.angles, turnAt)
    if (angle != null) heading += ((180 - angle) * Math.PI) / 180
    else if (index + 1 < ids.length - 1 && !ready(points, ids[index + 2]!)) {
      issues.push({ code: 'UNDERDETERMINED', objectId: item.id })
      return moved
    }
  }
  checkPolygon(item, points, issues)
  return moved
}

function checkPolygon(
  item: Extract<Canon, { kind: 'polygon' }>,
  points: Map<string, PointState>,
  issues: SceneIssue[],
) {
  const ids = item.vertices
  if (!ids.every((id) => ready(points, id))) return
  const close = lookupNamed(item.sides, ids[ids.length - 1]!, ids[0]!)
  const last = ready(points, ids[ids.length - 1]!)!
  const first = ready(points, ids[0]!)!
  if (close != null && !nearly(dist(last, first), close)) {
    issues.push({ code: 'OVERCONSTRAINED', objectId: item.id })
  }
  for (let index = 0; index < ids.length; index += 1) {
    const angle = lookupNamed(item.angles, ids[index]!)
    if (angle == null) continue
    const prev = ready(points, ids[(index - 1 + ids.length) % ids.length]!)!
    const vertex = ready(points, ids[index]!)!
    const next = ready(points, ids[(index + 1) % ids.length]!)!
    if (!nearly(interiorDegrees(prev, vertex, next), angle)) {
      issues.push({ code: 'OVERCONSTRAINED', objectId: item.id })
    }
  }
}

function classifyUnresolved(
  canon: Canon[],
  points: Map<string, PointState>,
  produced: Set<string>,
): SceneIssue | null {
  for (const item of canon) {
    for (const ref of refsOf(item)) {
      const known =
        produced.has(ref) ||
        points.has(ref) ||
        canon.some((row) => row.kind === 'segment' && (row.id === ref || row.from === ref || row.to === ref))
      if (!known) return { code: 'BAD_REFERENCE', objectId: item.sourceId }
    }
  }
  const unsolved = canon.find((item) => {
    if (item.kind === 'midpoint' || item.kind === 'intersection' || item.kind === 'reflection') {
      return !ready(points, item.id)
    }
    if (item.kind === 'parallel' || item.kind === 'perpendicular') return !ready(points, `${item.id}.end`)
    if (item.kind === 'segment') return !ready(points, item.from) || !ready(points, item.to)
    if (item.kind === 'polygon') return item.vertices.some((id) => !ready(points, id))
    return false
  })
  if (!unsolved) return null
  if (hasCycle(canon, points)) return { code: 'BAD_REFERENCE', objectId: unsolved.id }
  return { code: 'UNDERDETERMINED', objectId: unsolved.id }
}

function hasCycle(canon: Canon[], points: Map<string, PointState>) {
  const deps = new Map<string, string[]>()
  for (const item of canon) {
    if (item.kind === 'midpoint' && !ready(points, item.id)) deps.set(item.id, [...item.of])
    if (item.kind === 'intersection' && !ready(points, item.id)) deps.set(item.id, [...item.of])
    if (item.kind === 'reflection' && !ready(points, item.id)) deps.set(item.id, [item.of, item.over])
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  function walk(id: string): boolean {
    if (visited.has(id)) return false
    if (visiting.has(id)) return true
    visiting.add(id)
    for (const dep of deps.get(id) ?? []) {
      if (deps.has(dep) && walk(dep)) return true
    }
    visiting.delete(id)
    visited.add(id)
    return false
  }
  for (const id of deps.keys()) {
    if (walk(id)) return true
  }
  return false
}

function refsOf(item: Canon): string[] {
  if (item.kind === 'segment') return [item.from, item.to]
  if (item.kind === 'circle' || item.kind === 'label') return [item.kind === 'circle' ? item.center : item.of]
  if (item.kind === 'arc') return [item.center, item.from, item.to]
  if (item.kind === 'angle') return [item.vertex, item.from, item.to]
  if (item.kind === 'midpoint' || item.kind === 'intersection') return [...item.of]
  if (item.kind === 'parallel' || item.kind === 'perpendicular') return [item.of, item.through]
  if (item.kind === 'reflection') return [item.of, item.over]
  if (item.kind === 'polygon') return [...item.vertices]
  if (item.kind === 'tangent') return [item.at]
  if (item.kind === 'secant' || item.kind === 'chord') return item.kind === 'secant' ? [...item.through] : [item.from, item.to]
  if (item.kind === 'central') return [item.from, item.to]
  if (item.kind === 'inscribed') return [item.vertex, item.from, item.to]
  if (item.kind === 'antipode') return [item.through]
  return []
}

function placeCircle(item: Canon, canon: Canon[], points: Map<string, PointState>) {
  if (item.kind === 'circle') return placeCenter(item, canon, points)
  if (item.kind === 'on_circle' && item.angleDeg != null) return placePolar(item.id, item.circle, item.angleDeg, canon, points)
  if (item.kind === 'central') return placeCentral(item, canon, points)
  if (item.kind === 'inscribed') return placeInscribed(item, canon, points)
  if (item.kind === 'on_circle') return placeDefaultOnCircle(item, canon, points)
  if (item.kind === 'antipode') return placeAntipode(item, canon, points)
  if (item.kind === 'tangent') return placeTangent(item, canon, points)
  if (item.kind === 'secant') return placeSecant(item, canon, points)
  return false
}

function placeCenter(circle: Extract<Canon, { kind: 'circle' }>, canon: Canon[], points: Map<string, PointState>) {
  if (ready(points, circle.center)) return false
  if (canon.some((item) => item.kind === 'on_circle' && item.id === circle.center)) return false
  if (canon.some((item) => item.kind === 'point' && item.id === circle.center && item.at)) return false
  points.set(circle.center, { x: 0, y: 0 })
  return true
}

function placePolar(id: string, circleId: string, degrees: number, canon: Canon[], points: Map<string, PointState>) {
  if (ready(points, id)) return false
  const circle = canon.find((item) => item.kind === 'circle' && item.id === circleId)
  if (!circle || circle.kind !== 'circle') return false
  const center = ready(points, circle.center)
  if (!center) return false
  const rad = ((degrees + (circle.rotation ?? 0)) * Math.PI) / 180
  points.set(id, { x: center.x + circle.radius * Math.cos(rad), y: center.y + circle.radius * Math.sin(rad) })
  return true
}

function placeCentral(item: Extract<Canon, { kind: 'central' }>, canon: Canon[], points: Map<string, PointState>) {
  if (item.degrees == null || ready(points, item.to)) return false
  const circle = canon.find((row) => row.kind === 'circle' && row.id === item.circle)
  if (!circle || circle.kind !== 'circle') return false
  const center = ready(points, circle.center)
  if (!center) return false
  if (!ready(points, item.from)) {
    const on = canon.find((row) => row.kind === 'on_circle' && row.id === item.from && row.angleDeg == null)
    if (!on) return false
    return placePolar(item.from, item.circle, defaultDegrees(defaultSlot(canon, item.from)), canon, points)
  }
  const from = ready(points, item.from)
  if (!from) return false
  const fromDeg = bearing(center, from)
  const rad = ((fromDeg + item.degrees) * Math.PI) / 180
  points.set(item.to, {
    x: center.x + circle.radius * Math.cos(rad),
    y: center.y + circle.radius * Math.sin(rad),
  })
  return true
}

function placeInscribed(item: Extract<Canon, { kind: 'inscribed' }>, canon: Canon[], points: Map<string, PointState>) {
  if (ready(points, item.vertex)) return false
  const circle = canon.find((row) => row.kind === 'circle' && row.id === item.circle)
  if (!circle || circle.kind !== 'circle') return false
  const center = ready(points, circle.center)
  const from = ready(points, item.from)
  const to = ready(points, item.to)
  if (!center || !from || !to) return false
  const central = item.sameArc
    ? canon.find((row) => row.kind === 'central' && row.id === item.sameArc)
    : null
  const fromDeg = bearing(center, from)
  const sweep =
    central && central.kind === 'central' && central.degrees != null
      ? central.degrees
      : minorSweep(fromDeg, bearing(center, to))
  const rad = ((fromDeg + sweep / 2 + 180) * Math.PI) / 180
  points.set(item.vertex, {
    x: center.x + circle.radius * Math.cos(rad),
    y: center.y + circle.radius * Math.sin(rad),
  })
  return true
}

function placeDefaultOnCircle(item: Extract<Canon, { kind: 'on_circle' }>, canon: Canon[], points: Map<string, PointState>) {
  if (canon.some((row) => row.kind === 'inscribed' && row.vertex === item.id)) return false
  if (canon.some((row) => row.kind === 'central' && row.degrees != null && row.to === item.id)) return false
  return placePolar(item.id, item.circle, defaultDegrees(defaultSlot(canon, item.id)), canon, points)
}

function placeAntipode(item: Extract<Canon, { kind: 'antipode' }>, canon: Canon[], points: Map<string, PointState>) {
  if (ready(points, item.id)) return false
  const circle = canon.find((row) => row.kind === 'circle' && row.id === item.circle)
  if (!circle || circle.kind !== 'circle') return false
  const center = ready(points, circle.center)
  const through = ready(points, item.through)
  if (!center || !through) return false
  points.set(item.id, { x: 2 * center.x - through.x, y: 2 * center.y - through.y })
  return true
}

function placeTangent(item: Extract<Canon, { kind: 'tangent' }>, canon: Canon[], points: Map<string, PointState>) {
  if (ready(points, `${item.id}.a`) && ready(points, `${item.id}.b`)) return false
  const circle = canon.find((row) => row.kind === 'circle' && row.id === item.circle)
  if (!circle || circle.kind !== 'circle') return false
  const center = ready(points, circle.center)
  const at = ready(points, item.at)
  if (!center || !at) return false
  const dx = at.x - center.x
  const dy = at.y - center.y
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  points.set(`${item.id}.a`, { x: at.x + px * circle.radius, y: at.y + py * circle.radius })
  points.set(`${item.id}.b`, { x: at.x - px * circle.radius, y: at.y - py * circle.radius })
  return true
}

function placeSecant(item: Extract<Canon, { kind: 'secant' }>, canon: Canon[], points: Map<string, PointState>) {
  if (ready(points, `${item.id}.a`) && ready(points, `${item.id}.b`)) return false
  const circle = canon.find((row) => row.kind === 'circle' && row.id === item.circle)
  if (!circle || circle.kind !== 'circle') return false
  const a = ready(points, item.through[0])
  const b = ready(points, item.through[1])
  if (!a || !b) return false
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  points.set(`${item.id}.a`, { x: a.x - (dx / len) * circle.radius, y: a.y - (dy / len) * circle.radius })
  points.set(`${item.id}.b`, { x: b.x + (dx / len) * circle.radius, y: b.y + (dy / len) * circle.radius })
  return true
}

function checkOnCircle(canon: Canon[], points: Map<string, PointState>, issues: SceneIssue[]) {
  const watch: Array<{ id: string; circle: string; sourceId: string }> = []
  for (const item of canon) {
    if (item.kind === 'on_circle' || item.kind === 'tangent') {
      watch.push({ id: item.kind === 'tangent' ? item.at : item.id, circle: item.circle, sourceId: item.sourceId })
    }
    if (item.kind === 'chord') {
      watch.push({ id: item.from, circle: item.circle, sourceId: item.sourceId })
      watch.push({ id: item.to, circle: item.circle, sourceId: item.sourceId })
    }
    if (item.kind === 'central' || item.kind === 'inscribed') {
      watch.push({ id: item.from, circle: item.circle, sourceId: item.sourceId })
      watch.push({ id: item.to, circle: item.circle, sourceId: item.sourceId })
      if (item.kind === 'inscribed') watch.push({ id: item.vertex, circle: item.circle, sourceId: item.sourceId })
    }
  }
  for (const item of watch) {
    const circle = canon.find((row) => row.kind === 'circle' && row.id === item.circle)
    if (!circle || circle.kind !== 'circle') {
      issues.push({ code: 'BAD_REFERENCE', objectId: item.sourceId })
      continue
    }
    const center = ready(points, circle.center)
    const point = ready(points, item.id)
    if (!center || !point) continue
    if (!nearly(dist(center, point), circle.radius)) {
      issues.push({ code: 'SIDE_MISMATCH', objectId: item.sourceId })
    }
  }
}

function defaultSlot(canon: Canon[], id: string) {
  let slot = 0
  for (const item of canon) {
    if (item.kind !== 'on_circle' || item.angleDeg != null) continue
    if (canon.some((row) => row.kind === 'inscribed' && row.vertex === item.id)) continue
    if (item.id === id) return slot
    slot += 1
  }
  return slot
}

function defaultDegrees(slot: number) {
  if (slot < 4) return [0, 90, 180, 270][slot] ?? 0
  return (slot - 3) * 36
}

function bearing(center: Pt, point: Pt) {
  let deg = (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
  if (deg < 0) deg += 360
  return deg
}

function minorSweep(fromDeg: number, toDeg: number) {
  let sweep = toDeg - fromDeg
  while (sweep <= -180) sweep += 360
  while (sweep > 180) sweep -= 360
  return sweep
}

function segmentEnds(canon: Canon[], id: string) {
  const found = canon.find((item) => item.kind === 'segment' && item.id === id)
  if (found && found.kind === 'segment') return found
  return null
}

function ready(points: Map<string, PointState>, id: string): Pt | null {
  const point = points.get(id)
  if (!point || point.x == null || point.y == null) return null
  return { x: point.x, y: point.y }
}

function lineHit(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const den = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)
  if (Math.abs(den) < 1e-9) return null
  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / den
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
}

function reflectPoint(point: Pt, a: Pt, b: Pt): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2
  const px = a.x + t * dx
  const py = a.y + t * dy
  return { x: 2 * px - point.x, y: 2 * py - point.y }
}

function interiorDegrees(prev: Pt, vertex: Pt, next: Pt) {
  const incoming = Math.atan2(vertex.y - prev.y, vertex.x - prev.x)
  const outgoing = Math.atan2(next.y - vertex.y, next.x - vertex.x)
  let turn = outgoing - incoming
  while (turn <= -Math.PI) turn += Math.PI * 2
  while (turn > Math.PI) turn -= Math.PI * 2
  return (Math.PI - turn) * (180 / Math.PI)
}

function unique(issues: SceneIssue[]) {
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.objectId ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
