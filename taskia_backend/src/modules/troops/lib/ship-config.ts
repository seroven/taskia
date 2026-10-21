import { z } from 'zod'

/**
 * Nave de una tripulación: qué pieza va en cada ranura y los colores. El dibujo lo hace el frontend
 * (`taskia_frontend/src/components/ship/ShipRenderer.tsx`); las listas de abajo deben ser las mismas
 * que en `taskia_frontend/src/lib/ship/types.ts`.
 */
export const HULLS = ['rocket', 'bean', 'arrow', 'barge', 'saucer', 'dart', 'drop', 'leaf', 'bullet', 'brick', 'dolphin', 'whale', 'needle', 'blimp', 'diamond'] as const
export const NOSES = ['none', 'probe', 'cap', 'drill', 'ball', 'cone', 'fork', 'ring', 'beak', 'lamp', 'spark', 'bumper', 'whisker', 'pennant'] as const
export const COCKPITS = ['none', 'bubble', 'visor', 'dome', 'twin', 'porthole', 'slit', 'hood', 'panorama', 'periscope', 'eye', 'tower', 'wedge'] as const
export const WINGS = ['none', 'delta', 'swept', 'stub', 'blade', 'leaf', 'manta', 'steps', 'hook', 'biplane', 'scissor', 'butterfly', 'saw', 'boomerang'] as const
export const TAILS = ['none', 'shark', 'twin', 'block', 'fins', 'sail', 'spike', 'crest', 'fishtail', 'sickle', 'disc', 'notch', 'zig', 'rotor', 'crown'] as const
export const ENGINES = ['bell', 'pods', 'ring', 'orb'] as const
export const FLAMES = ['classic', 'bolt', 'puff', 'none'] as const
export const TOPS = ['none', 'antenna', 'dish', 'solar', 'beacon'] as const
export const BELLIES = ['none', 'pod', 'legs', 'tank'] as const
export const DECALS = ['none', 'stripe', 'chevrons', 'checker', 'star'] as const
export const WINDOWS = ['round', 'square', 'arch', 'hex', 'diamond', 'star', 'heart', 'slot', 'tri', 'oval', 'cross', 'moon', 'drop'] as const

const HEX = /^#([0-9a-fA-F]{6})$/

const hex = z
  .string()
  .trim()
  .regex(HEX)
  .transform((value) => value.toLowerCase())

export const shipConfigSchema = z.object({
  seed: z.string().trim().min(1).max(80),
  hull: z.enum(HULLS),
  nose: z.enum(NOSES),
  cockpit: z.enum(COCKPITS),
  wings: z.enum(WINGS),
  tail: z.enum(TAILS),
  engine: z.object({
    kind: z.enum(ENGINES),
    count: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    flame: z.enum(FLAMES),
  }),
  top: z.enum(TOPS),
  belly: z.enum(BELLIES),
  decal: z.enum(DECALS),
  windows: z.enum(WINDOWS),
  palette: z.object({ hull: hex, trim: hex, accent: hex, glass: hex }),
})

export type ShipConfig = z.infer<typeof shipConfigSchema>
type Palette = ShipConfig['palette']

/** Paletas de la casa (las mismas del editor): colores vivos o pastel. */
const PALETTES: Palette[] = [
  { hull: '#7dd3fc', trim: '#3b82f6', accent: '#fbbf24', glass: '#fef9c3' },
  { hull: '#86efac', trim: '#22c55e', accent: '#fde68a', glass: '#ecfeff' },
  { hull: '#fda4af', trim: '#f43f5e', accent: '#fde68a', glass: '#fff7ed' },
  { hull: '#c4b5fd', trim: '#8b5cf6', accent: '#fbcfe8', glass: '#f5f3ff' },
  { hull: '#fdba74', trim: '#f97316', accent: '#fef08a', glass: '#fffbeb' },
  { hull: '#e2e8f0', trim: '#94a3b8', accent: '#f472b6', glass: '#e0f2fe' },
  { hull: '#fde68a', trim: '#f59e0b', accent: '#38bdf8', glass: '#fffbeb' },
  { hull: '#5eead4', trim: '#0d9488', accent: '#fda4af', glass: '#f0fdfa' },
  { hull: '#fecdd3', trim: '#fb7185', accent: '#a5b4fc', glass: '#fff1f2' },
  { hull: '#a5b4fc', trim: '#4338ca', accent: '#fcd34d', glass: '#e0e7ff' },
]

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(value: string) {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)]!
}

function hexToRgb(color: string): [number, number, number] {
  const h = color.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function mixHex(a: string, b: string, t: number) {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const part = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${part(ar + (br - ar) * t)}${part(ag + (bg - ag) * t)}${part(ab + (bb - ab) * t)}`
}

function luminance(color: string) {
  const [r, g, b] = hexToRgb(color)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/**
 * Una nave sin ninguna pieza se ve pelada: se exige un mínimo de piezas puestas entre las que son opcionales.
 */
const OPTIONAL = ['nose', 'cockpit', 'wings', 'tail', 'top', 'belly', 'decal'] as const

function fillMinimum(config: ShipConfig, rand: () => number) {
  const lists: Record<(typeof OPTIONAL)[number], readonly string[]> = {
    nose: NOSES,
    cockpit: COCKPITS,
    wings: WINGS,
    tail: TAILS,
    top: TOPS,
    belly: BELLIES,
    decal: DECALS,
  }
  const empty = () => OPTIONAL.filter((slot) => config[slot] === 'none')
  while (OPTIONAL.length - empty().length < 4) {
    const slot = pick(rand, empty())
    ;(config as Record<string, unknown>)[slot] = pick(
      rand,
      lists[slot].filter((item) => item !== 'none'),
    )
  }
}

/** La misma semilla da siempre la misma nave. */
export function generateShipFromSeed(seed: string): ShipConfig {
  const safeSeed = seed.trim().slice(0, 80) || 'taskia'
  const rand = mulberry32(hashString(`ship:${safeSeed}`))
  const config: ShipConfig = {
    seed: safeSeed,
    hull: pick(rand, HULLS),
    nose: pick(rand, NOSES),
    cockpit: pick(rand, COCKPITS),
    wings: pick(rand, WINGS),
    tail: pick(rand, TAILS),
    engine: { kind: pick(rand, ENGINES), count: pick(rand, [1, 2, 3] as const), flame: pick(rand, FLAMES) },
    top: pick(rand, TOPS),
    belly: pick(rand, BELLIES),
    decal: pick(rand, DECALS),
    windows: pick(rand, WINDOWS),
    palette: { ...pick(rand, PALETTES) },
  }
  fillMinimum(config, rand)
  return config
}

function asEnum<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback
}

/** Acepta «#7dd3fc», «7dd3fc» y «#7df»: los modelos a veces se olvidan del # o abrevian. */
function asHex(raw: unknown, fallback: string) {
  if (typeof raw !== 'string') return fallback
  let value = raw.trim().toLowerCase().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/.test(value)) value = value.replace(/./g, (digit) => digit + digit)
  value = `#${value}`
  return HEX.test(value) ? value : fallback
}

/**
 * Completa y corrige cualquier JSON (de la IA o del cliente) antes de guardarlo o dibujarlo: lo que falte o no
 * sea válido sale de la nave de la semilla, y los colores se empujan a tonos que se lean sobre el espacio.
 */
export function sanitizeShipConfig(raw: unknown, fallbackSeed: string): ShipConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const seed = typeof o.seed === 'string' && o.seed.trim() ? o.seed.trim().slice(0, 80) : fallbackSeed
  const base = generateShipFromSeed(seed)
  const engineRaw = o.engine && typeof o.engine === 'object' ? (o.engine as Record<string, unknown>) : {}
  const paletteRaw = o.palette && typeof o.palette === 'object' ? (o.palette as Record<string, unknown>) : {}
  const count = Math.round(Number(engineRaw.count))

  // Casco y detalles no pueden ser casi negros ni apagados; la luz de las ventanillas, siempre clara.
  const hull = asHex(paletteRaw.hull, base.palette.hull)
  const trim = asHex(paletteRaw.trim, base.palette.trim)
  const accent = asHex(paletteRaw.accent, base.palette.accent)
  const glass = asHex(paletteRaw.glass, base.palette.glass)
  const palette: Palette = {
    hull: luminance(hull) < 0.4 ? mixHex(hull, '#ffffff', 0.45) : hull,
    trim: luminance(trim) < 0.18 ? mixHex(trim, '#ffffff', 0.4) : trim,
    accent: luminance(accent) < 0.3 ? mixHex(accent, '#ffffff', 0.45) : accent,
    // Con 0,85 de blanco hasta el gris más oscuro queda por encima del mínimo de claridad.
    glass: luminance(glass) < 0.75 ? mixHex(glass, '#ffffff', 0.85) : glass,
  }

  const config: ShipConfig = {
    seed,
    hull: asEnum(o.hull, HULLS, base.hull),
    nose: asEnum(o.nose, NOSES, base.nose),
    cockpit: asEnum(o.cockpit, COCKPITS, base.cockpit),
    wings: asEnum(o.wings, WINGS, base.wings),
    tail: asEnum(o.tail, TAILS, base.tail),
    engine: {
      kind: asEnum(engineRaw.kind, ENGINES, base.engine.kind),
      count: (count === 1 || count === 2 || count === 3 ? count : base.engine.count) as 1 | 2 | 3,
      flame: asEnum(engineRaw.flame, FLAMES, base.engine.flame),
    },
    top: asEnum(o.top, TOPS, base.top),
    belly: asEnum(o.belly, BELLIES, base.belly),
    decal: asEnum(o.decal, DECALS, base.decal),
    windows: asEnum(o.windows, WINDOWS, base.windows),
    palette,
  }
  return shipConfigSchema.parse(config)
}

/** Sin la semilla: dos naves con el mismo dibujo chocan aunque el seed cambie. */
export function shipFingerprint(config: ShipConfig) {
  const quant = (color: string) => hexToRgb(color).map((n) => Math.round(n / 32)).join('')
  return [
    config.hull,
    config.nose,
    config.cockpit,
    config.wings,
    config.tail,
    config.engine.kind,
    config.engine.count,
    config.engine.flame,
    config.top,
    config.belly,
    config.decal,
    config.windows,
    quant(config.palette.hull),
    quant(config.palette.trim),
  ].join('|')
}

/** Lo que guarda la base (o, si algo quedó raro, una nave limpia a partir del id). */
export function resolveTroopShip(raw: unknown, troopId: number) {
  return sanitizeShipConfig(raw, `troop-${troopId}`)
}
