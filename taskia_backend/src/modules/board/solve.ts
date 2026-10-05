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
    }
  }

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
  return []
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
