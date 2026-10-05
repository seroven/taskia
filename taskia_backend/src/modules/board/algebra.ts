import type { Canon, Mark } from './expand.js'
import { angleDegrees, nearly } from './geom.js'
import { parseAngleLabel, rDiv, rEq, rFromClaim, rInt, type Rational } from './rational.js'
import type { Pt, SceneIssue } from './types.js'

export function checkTheorems(canon: Canon[], points: Map<string, Pt>): SceneIssue[] {
  const issues: SceneIssue[] = []
  for (const tangent of canon) {
    if (tangent.kind !== 'tangent') continue
    const circle = circleOf(canon, tangent.circle)
    if (!circle) continue
    const center = points.get(circle.center)
    const at = points.get(tangent.at)
    const end = points.get(`${tangent.id}.a`)
    if (!center || !at || !end) continue
    const radius = { x: at.x - center.x, y: at.y - center.y }
    const line = { x: end.x - at.x, y: end.y - at.y }
    const denom = Math.hypot(radius.x, radius.y) * Math.hypot(line.x, line.y)
    const cos = denom === 0 ? 1 : (radius.x * line.x + radius.y * line.y) / denom
    const degrees = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
    if (!nearly(degrees, 90)) issues.push({ code: 'OVERCONSTRAINED', objectId: tangent.id })
  }
  for (const inscribed of canon) {
    if (inscribed.kind !== 'inscribed' || !inscribed.sameArc) continue
    const central = canon.find((item) => item.kind === 'central' && item.id === inscribed.sameArc)
    if (!central || central.kind !== 'central' || central.degrees == null) continue
    const vertex = points.get(inscribed.vertex)
    const from = points.get(inscribed.from)
    const to = points.get(inscribed.to)
    if (!vertex || !from || !to) continue
    if (!nearly(angleDegrees(from, vertex, to), central.degrees / 2)) {
      issues.push({ code: 'OVERCONSTRAINED', objectId: inscribed.id })
    }
  }
  return issues
}

export function bindLabels(canon: Canon[], marks: Mark[], points: Map<string, Pt>) {
  const bindings: Record<string, Rational> = {}
  const issues: SceneIssue[] = []
  const texts: Array<{ id: string; text: string; of: string }> = []
  for (const item of canon) {
    if ((item.kind === 'angle' || item.kind === 'central' || item.kind === 'inscribed') && item.label) {
      texts.push({ id: item.id, text: item.label, of: item.id })
    }
  }
  for (const mark of marks) {
    if (mark.kind === 'angle_arc' && mark.text) texts.push({ id: mark.id, text: mark.text, of: mark.of })
  }
  for (const row of texts) {
    const parsed = parseAngleLabel(row.text)
    if (!parsed) continue
    const exact = exactAngle(canon, row.of)
    const geometric = geometricAngle(canon, points, row.of)
    if (parsed.kind === 'number') {
      if (exact && !rEq(parsed.value, exact)) issues.push({ code: 'OVERCONSTRAINED', objectId: row.id })
      else if (!exact && geometric != null && !nearly(geometric, Number(parsed.value.n) / Number(parsed.value.d))) {
        issues.push({ code: 'OVERCONSTRAINED', objectId: row.id })
      }
      continue
    }
    if (!exact) {
      issues.push({ code: 'UNDERDETERMINED', objectId: row.id })
      continue
    }
    const value = rDiv(exact, parsed.coefficient)
    if (!value) {
      issues.push({ code: 'BAD_EXPRESSION', objectId: row.id })
      continue
    }
    const previous = bindings[parsed.name]
    if (previous && !rEq(previous, value)) issues.push({ code: 'OVERCONSTRAINED', objectId: row.id })
    else bindings[parsed.name] = value
  }
  return { bindings, issues }
}

export function exactAngle(canon: Canon[], id: string): Rational | null {
  const angle = canon.find((item) => item.kind === 'angle' && item.id === id)
  if (angle && angle.kind === 'angle') {
    for (const tangent of canon) {
      if (tangent.kind !== 'tangent' || tangent.at !== angle.vertex) continue
      const circle = circleOf(canon, tangent.circle)
      if (!circle) continue
      const rays = new Set([angle.from, angle.to])
      const hitsEnd = rays.has(`${tangent.id}.a`) || rays.has(`${tangent.id}.b`)
      if (hitsEnd && rays.has(circle.center)) {
        const right = rInt(90n)
        if (right) return right
      }
    }
  }
  const inscribed = canon.find((item) => item.kind === 'inscribed' && item.id === id)
  if (inscribed && inscribed.kind === 'inscribed' && inscribed.sameArc) {
    const central = canon.find((item) => item.kind === 'central' && item.id === inscribed.sameArc)
    if (central && central.kind === 'central' && central.degrees != null) {
      const whole = rFromClaim(central.degrees)
      const two = rInt(2n)
      if (whole && two) return rDiv(whole, two)
    }
  }
  const central = canon.find((item) => item.kind === 'central' && item.id === id)
  if (central && central.kind === 'central' && central.degrees != null) return rFromClaim(central.degrees)
  return null
}

function geometricAngle(canon: Canon[], points: Map<string, Pt>, id: string) {
  const angle = canon.find((item) => item.kind === 'angle' && item.id === id)
  if (!angle || angle.kind !== 'angle') return null
  const vertex = points.get(angle.vertex)
  const from = points.get(angle.from)
  const to = points.get(angle.to)
  if (!vertex || !from || !to) return null
  return angleDegrees(from, vertex, to)
}

function circleOf(canon: Canon[], id: string) {
  const found = canon.find((item) => item.kind === 'circle' && item.id === id)
  return found && found.kind === 'circle' ? found : null
}
