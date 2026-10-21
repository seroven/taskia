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
export const ENGINES = ['bell', 'pods', 'ring', 'orb', 'jet', 'horn', 'cone', 'fan', 'crystal', 'box', 'bubble', 'saturn', 'nozzle', 'flare'] as const
export const FLAMES = ['classic', 'bolt', 'puff', 'none', 'comet', 'rainbow', 'sparks', 'waves', 'drip', 'ribbon', 'stars', 'pulse', 'tongue', 'hearts'] as const
export const TOPS = ['none', 'antenna', 'dish', 'solar', 'beacon', 'flag', 'windmill', 'balloon', 'lighthouse', 'sprout', 'umbrella', 'minirocket', 'moon', 'antlers', 'orbit'] as const
export const BELLIES = ['none', 'pod', 'legs', 'tank', 'wheels', 'skids', 'orb', 'claw', 'keel', 'dome', 'crates', 'tripod', 'spot', 'anchor'] as const
export const DECALS = ['none', 'stripe', 'chevrons', 'checker', 'star', 'dots', 'zigzag', 'waves', 'diamonds', 'bands', 'flames', 'spots', 'bolt', 'plaid', 'hearts'] as const
export const WINDOWS = ['round', 'square', 'arch', 'hex', 'diamond', 'star', 'heart', 'slot', 'tri', 'oval', 'cross', 'moon', 'drop'] as const

/**
 * Las cinco piezas que se desbloquean con el nivel de la tripulación; todo lo demás está libre desde el nivel 1.
 * Debe ser igual a `SHIP_LOCKS` de `taskia_frontend/src/lib/ship/types.ts`.
 */
export const SHIP_LOCKS = [
  { slot: 'flame', id: 'rainbow', level: 5 },
  { slot: 'wings', id: 'butterfly', level: 10 },
  { slot: 'engine', id: 'saturn', level: 15 },
  { slot: 'top', id: 'orbit', level: 20 },
  { slot: 'tail', id: 'crown', level: 25 },
] as const

type LockSlot = (typeof SHIP_LOCKS)[number]['slot']

/** Nivel de tripulación que pide una pieza (1 si está libre). */
export function shipPartLevel(slot: string, id: string): number {
  return SHIP_LOCKS.find((lock) => lock.slot === slot && lock.id === id)?.level ?? 1
}

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

/**
 * Una nave sin ninguna pieza se ve pelada: se exige un mínimo de piezas puestas entre las que son opcionales.
 */
const OPTIONAL = ['nose', 'cockpit', 'wings', 'tail', 'top', 'belly', 'decal'] as const

/** Las piezas de una ranura que ya puede usar una tripulación de ese nivel. */
const available = <T extends string>(slot: string, list: readonly T[], level: number): readonly T[] =>
  list.filter((id) => shipPartLevel(slot, id) <= level)

function fillMinimum(config: ShipConfig, rand: () => number, level: number) {
  const lists: Record<(typeof OPTIONAL)[number], readonly string[]> = {
    nose: available('nose', NOSES, level),
    cockpit: available('cockpit', COCKPITS, level),
    wings: available('wings', WINGS, level),
    tail: available('tail', TAILS, level),
    top: available('top', TOPS, level),
    belly: available('belly', BELLIES, level),
    decal: available('decal', DECALS, level),
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

/** La misma semilla da siempre la misma nave. Solo usa piezas ya desbloqueadas para `level` (por defecto, las del nivel 1). */
export function generateShipFromSeed(seed: string, level = 1): ShipConfig {
  const safeSeed = seed.trim().slice(0, 80) || 'taskia'
  const rand = mulberry32(hashString(`ship:${safeSeed}`))
  const config: ShipConfig = {
    seed: safeSeed,
    hull: pick(rand, HULLS),
    nose: pick(rand, NOSES),
    cockpit: pick(rand, COCKPITS),
    wings: pick(rand, available('wings', WINGS, level)),
    tail: pick(rand, available('tail', TAILS, level)),
    engine: {
      kind: pick(rand, available('engine', ENGINES, level)),
      count: pick(rand, [1, 2, 3] as const),
      flame: pick(rand, available('flame', FLAMES, level)),
    },
    top: pick(rand, available('top', TOPS, level)),
    belly: pick(rand, BELLIES),
    decal: pick(rand, DECALS),
    windows: pick(rand, WINDOWS),
    palette: { ...pick(rand, PALETTES) },
  }
  fillMinimum(config, rand, level)
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
 * sea válido sale de la nave de la semilla. Los colores que elige el niño se respetan tal cual (aunque se vean
 * apagados en el espacio: es su decisión); y los que devuelve la IA también (si el niño pide una nave negra, es negra).
 */
export function sanitizeShipConfig(
  raw: unknown,
  fallbackSeed: string,
  /** `level`: si se indica, las piezas aún bloqueadas se cambian por una libre, salvo las que ya tiene la nave `current`. */
  limit?: { level: number; current?: unknown },
): ShipConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const seed = typeof o.seed === 'string' && o.seed.trim() ? o.seed.trim().slice(0, 80) : fallbackSeed
  const base = generateShipFromSeed(seed, limit?.level ?? Number.POSITIVE_INFINITY)
  const engineRaw = o.engine && typeof o.engine === 'object' ? (o.engine as Record<string, unknown>) : {}
  const paletteRaw = o.palette && typeof o.palette === 'object' ? (o.palette as Record<string, unknown>) : {}
  const count = Math.round(Number(engineRaw.count))

  const hull = asHex(paletteRaw.hull, base.palette.hull)
  const trim = asHex(paletteRaw.trim, base.palette.trim)
  const accent = asHex(paletteRaw.accent, base.palette.accent)
  const glass = asHex(paletteRaw.glass, base.palette.glass)
  const palette: Palette = { hull, trim, accent, glass }

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
  const parsed = shipConfigSchema.parse(config)
  return limit ? lockToLevel(parsed, limit.level, limit.current == null ? null : sanitizeShipConfig(limit.current, seed)) : parsed
}

const partOf = (config: ShipConfig, slot: LockSlot) =>
  slot === 'flame' ? config.engine.flame : slot === 'engine' ? config.engine.kind : config[slot]

/**
 * Cambia por la primera pieza libre toda pieza que aún no se desbloquea con `level`. Las que ya tenía la nave
 * guardada (`kept`) se respetan: el nivel solo sube, pero una nave heredada no debe perder su aspecto.
 */
export function lockToLevel(config: ShipConfig, level: number, kept: ShipConfig | null): ShipConfig {
  const next: ShipConfig = { ...config, engine: { ...config.engine } }
  for (const lock of SHIP_LOCKS) {
    if (level >= lock.level || partOf(next, lock.slot) !== lock.id) continue
    if (kept && partOf(kept, lock.slot) === lock.id) continue
    const list: readonly string[] = lock.slot === 'flame' ? FLAMES : lock.slot === 'engine' ? ENGINES : lock.slot === 'wings' ? WINGS : lock.slot === 'top' ? TOPS : TAILS
    const free = list.find((id) => id !== 'none' && shipPartLevel(lock.slot, id) <= level)!
    if (lock.slot === 'flame') next.engine.flame = free as ShipConfig['engine']['flame']
    else if (lock.slot === 'engine') next.engine.kind = free as ShipConfig['engine']['kind']
    else (next as Record<string, unknown>)[lock.slot] = free
  }
  return next
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
