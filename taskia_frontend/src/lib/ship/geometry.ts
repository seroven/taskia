import type { Hull } from './types'

/** Todas las piezas se dibujan sobre este lienzo, con la nariz a la derecha y el eje de la nave en y = CY. */
export const VB_W = 240
export const VB_H = 120
export const CY = 60

/**
 * El casco es una superelipse con el punto más grueso en `um` (fracción del largo) y exponentes distintos
 * para la cola (`pT`) y la nariz (`pN`): cerca de 1 acaba en punta, cerca de 2 en redondo y mayor de 3 en caja.
 * `kTop` y `kBot` lo achatan por arriba o por abajo. Las piezas no usan números fijos: preguntan al casco
 * dónde está su borde (`top`, `bot`, `half`), así encajan en cualquiera.
 */
interface HullSpec {
  x0: number
  x1: number
  H: number
  um: number
  pT: number
  pN: number
  kTop: number
  kBot: number
}

const SPECS: Record<Hull, HullSpec> = {
  rocket: { x0: 44, x1: 202, H: 46, um: 0.42, pT: 2.3, pN: 1.12, kTop: 1, kBot: 1 },
  bean: { x0: 46, x1: 196, H: 54, um: 0.5, pT: 2.1, pN: 2.1, kTop: 1, kBot: 1 },
  arrow: { x0: 42, x1: 204, H: 36, um: 0.3, pT: 2.6, pN: 1.06, kTop: 1, kBot: 1 },
  barge: { x0: 48, x1: 194, H: 52, um: 0.5, pT: 5, pN: 3.4, kTop: 1, kBot: 1 },
  saucer: { x0: 42, x1: 200, H: 40, um: 0.5, pT: 1.65, pN: 1.65, kTop: 1.5, kBot: 0.5 },
  dart: { x0: 38, x1: 208, H: 30, um: 0.34, pT: 2.5, pN: 1.0, kTop: 1, kBot: 1 },
  drop: { x0: 40, x1: 190, H: 58, um: 0.66, pT: 1.15, pN: 2.0, kTop: 1, kBot: 1 },
  leaf: { x0: 48, x1: 198, H: 58, um: 0.5, pT: 1.2, pN: 1.2, kTop: 1, kBot: 1 },
  bullet: { x0: 48, x1: 200, H: 40, um: 0.5, pT: 12, pN: 1.45, kTop: 1, kBot: 1 },
  brick: { x0: 52, x1: 190, H: 50, um: 0.5, pT: 9, pN: 6, kTop: 1, kBot: 1 },
  dolphin: { x0: 44, x1: 200, H: 54, um: 0.3, pT: 2, pN: 1.3, kTop: 1.4, kBot: 0.7 },
  whale: { x0: 54, x1: 192, H: 66, um: 0.42, pT: 2.2, pN: 2.4, kTop: 0.9, kBot: 1.15 },
  needle: { x0: 36, x1: 210, H: 30, um: 0.3, pT: 2.2, pN: 1.0, kTop: 1, kBot: 1 },
  blimp: { x0: 30, x1: 214, H: 44, um: 0.5, pT: 2, pN: 2, kTop: 1, kBot: 1 },
  diamond: { x0: 46, x1: 198, H: 52, um: 0.48, pT: 1.0, pN: 1.0, kTop: 1, kBot: 1 },
}

export interface HullGeo {
  kind: Hull
  x0: number
  x1: number
  L: number
  H: number
  /** Posición x a una fracción `u` (0 cola, 1 nariz) del largo. */
  at: (u: number) => number
  /** Mitad del grueso del casco en `x`. */
  half: (x: number) => number
  top: (x: number) => number
  bot: (x: number) => number
  path: string
}

const cache = new Map<Hull, HullGeo>()

function round(value: number) {
  return Math.round(value * 10) / 10
}

export function hullGeo(kind: Hull): HullGeo {
  const cached = cache.get(kind)
  if (cached) return cached
  const spec = SPECS[kind]
  const L = spec.x1 - spec.x0

  const half = (x: number) => {
    const u = Math.min(1, Math.max(0, (x - spec.x0) / L))
    const left = u < spec.um
    const t = left ? (spec.um - u) / spec.um : (u - spec.um) / (1 - spec.um)
    const p = left ? spec.pT : spec.pN
    return (spec.H / 2) * Math.pow(Math.max(0, 1 - Math.pow(t, p)), 1 / p)
  }
  const top = (x: number) => CY - half(x) * spec.kTop
  const bot = (x: number) => CY + half(x) * spec.kBot

  // Muestras más juntas en los extremos, donde el borde se curva más.
  const steps = 72
  const xs = Array.from({ length: steps + 1 }, (_, i) => spec.x0 + L * 0.5 * (1 - Math.cos((Math.PI * i) / steps)))
  const upper = xs.map((x) => `${round(x)} ${round(top(x))}`)
  const lower = [...xs].reverse().map((x) => `${round(x)} ${round(bot(x))}`)
  const path = `M${upper.join(' L')} L${lower.join(' L')} Z`

  const geo: HullGeo = { kind, x0: spec.x0, x1: spec.x1, L, H: spec.H, at: (u) => spec.x0 + L * u, half, top, bot, path }
  cache.set(kind, geo)
  return geo
}
