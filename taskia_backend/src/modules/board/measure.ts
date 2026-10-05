import type { Canon } from './expand.js'
import { solveFor } from './expression.js'
import { dist } from './geom.js'
import type { Pt, Scene } from './types.js'

export type Measure = { status: 'value'; value: number } | { status: 'unverifiable' }

type Measurer = (
  scene: Scene,
  canon: Canon[],
  points: Map<string, Pt>,
  target: string,
) => Measure | null

const measurers: Measurer[] = []

export function registerMeasurer(measurer: Measurer) {
  measurers.push(measurer)
}

export function measureTarget(
  scene: Scene,
  canon: Canon[],
  points: Map<string, Pt>,
  target: string,
): Measure {
  for (const measurer of measurers) {
    const found = measurer(scene, canon, points, target)
    if (found) return found
  }
  return { status: 'unverifiable' }
}

registerMeasurer((_scene, canon, points, target) => {
  if (!target.startsWith('length:')) return null
  const id = target.slice('length:'.length)
  const segment = canon.find((item) => item.kind === 'segment' && item.id === id)
  if (!segment || segment.kind !== 'segment') return { status: 'unverifiable' }
  const a = points.get(segment.from)
  const b = points.get(segment.to)
  if (!a || !b) return { status: 'unverifiable' }
  return { status: 'value', value: dist(a, b) }
})

registerMeasurer((_scene, canon, points, target) => {
  if (!target.startsWith('perimeter:')) return null
  const id = target.slice('perimeter:'.length)
  const polygon = canon.find((item) => item.kind === 'polygon' && item.id === id)
  if (polygon && polygon.kind === 'polygon') {
    let sum = 0
    for (let index = 0; index < polygon.vertices.length; index += 1) {
      const a = points.get(polygon.vertices[index]!)
      const b = points.get(polygon.vertices[(index + 1) % polygon.vertices.length]!)
      if (!a || !b) return { status: 'unverifiable' }
      sum += dist(a, b)
    }
    return { status: 'value', value: sum }
  }
  const circle = canon.find((item) => item.kind === 'circle' && item.id === id)
  if (circle && circle.kind === 'circle') return { status: 'value', value: 2 * Math.PI * circle.radius }
  return { status: 'unverifiable' }
})

registerMeasurer((_scene, canon, points, target) => {
  if (!target.startsWith('area:')) return null
  const id = target.slice('area:'.length)
  const polygon = canon.find((item) => item.kind === 'polygon' && item.id === id)
  if (polygon && polygon.kind === 'polygon') {
    const verts = polygon.vertices.map((vertex) => points.get(vertex))
    if (verts.some((vertex) => !vertex)) return { status: 'unverifiable' }
    return { status: 'value', value: Math.abs(shoelace(verts as Pt[])) }
  }
  const circle = canon.find((item) => item.kind === 'circle' && item.id === id)
  if (circle && circle.kind === 'circle') return { status: 'value', value: Math.PI * circle.radius * circle.radius }
  return { status: 'unverifiable' }
})

registerMeasurer((_scene, canon, points, target) => {
  if (!target.startsWith('angle:')) return null
  const id = target.slice('angle:'.length)
  const angle = canon.find((item) => item.kind === 'angle' && item.id === id)
  if (!angle || angle.kind !== 'angle') return { status: 'unverifiable' }
  const vertex = points.get(angle.vertex)
  const from = points.get(angle.from)
  const to = points.get(angle.to)
  if (!vertex || !from || !to) return { status: 'unverifiable' }
  return { status: 'value', value: angleAt(from, vertex, to) }
})

registerMeasurer((scene, canon, _points, target) => {
  const expressions = canon.filter((item) => item.kind === 'expression')
  const named = expressions.find((item) => item.id === target)
  const pool = named && named.kind === 'expression' ? [named] : expressions
  for (const item of pool) {
    if (item.kind !== 'expression') continue
    if (item.math.kind === 'value' && item.math.variables.length === 0 && (target === item.id || pool.length === 1)) {
      const value = solveFor(item.math, '')
      if (value != null) return { status: 'value', value }
    }
    if (!item.math.variables.includes(target) && target !== item.id) continue
    const variable = item.math.variables.includes(target) ? target : item.math.variables[0]
    if (!variable) continue
    const value = solveFor(item.math, variable)
    if (value == null) return { status: 'unverifiable' }
    return { status: 'value', value }
  }
  if (scene.task?.target === target && expressions.length === 0) return { status: 'unverifiable' }
  return null
})

function shoelace(verts: Pt[]) {
  let sum = 0
  for (let index = 0; index < verts.length; index += 1) {
    const next = verts[(index + 1) % verts.length]!
    const current = verts[index]!
    sum += current.x * next.y - next.x * current.y
  }
  return sum / 2
}

function angleAt(from: Pt, vertex: Pt, to: Pt) {
  const a = Math.atan2(from.y - vertex.y, from.x - vertex.x)
  const b = Math.atan2(to.y - vertex.y, to.x - vertex.x)
  let turn = Math.abs(b - a)
  if (turn > Math.PI) turn = Math.PI * 2 - turn
  return (turn * 180) / Math.PI
}
