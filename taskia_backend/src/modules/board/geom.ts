import type { Pt } from './types.js'

export function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function nearly(a: number, b: number) {
  const tol = Math.max(0.02, 1e-3 * Math.max(Math.abs(a), Math.abs(b)))
  return Math.abs(a - b) <= tol
}

export function rotateAround(point: Pt, origin: Pt, degrees: number): Pt {
  if (!degrees) return point
  const rad = (degrees * Math.PI) / 180
  const dx = point.x - origin.x
  const dy = point.y - origin.y
  return {
    x: origin.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: origin.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  }
}

export function formatMeasure(value: number) {
  const rounded = Math.round(value * 1000) / 1000
  if (Number.isInteger(rounded)) return String(rounded)
  return String(rounded)
}

export function refLabel(id: string) {
  const dot = id.lastIndexOf('.')
  return dot >= 0 ? id.slice(dot + 1) : id
}

export function lookupNamed(map: Record<string, number> | undefined, a: string, b?: string) {
  if (!map) return undefined
  if (b == null) {
    return map[a] ?? map[refLabel(a)]
  }
  const keys = [
    `${a}${b}`,
    `${b}${a}`,
    `${refLabel(a)}${refLabel(b)}`,
    `${refLabel(b)}${refLabel(a)}`,
    `${a}-${b}`,
    `${b}-${a}`,
  ]
  for (const key of keys) {
    if (map[key] != null && Number.isFinite(map[key])) return map[key]
  }
  return undefined
}

export function defaultLabels(count: number) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return Array.from({ length: count }, (_, index) => letters[index] ?? `V${index + 1}`)
}
