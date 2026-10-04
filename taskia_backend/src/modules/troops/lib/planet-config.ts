import { z } from 'zod'

export const BODY_TYPES = [
  'rocky',
  'gas',
  'ice',
  'lava',
  'ocean',
  'forest',
  'candy',
  'crystal',
  'desert',
  'cloud',
] as const

export const PATTERNS = [
  'none',
  'bands',
  'spots',
  'craters',
  'swirls',
  'stripes',
  'continents',
  'dots',
  'waves',
] as const

export const RING_STYLES = ['solid', 'dashed', 'sparkle'] as const
export const EYES = ['round', 'sleepy', 'happy-arc'] as const
export const MOUTHS = ['smile', 'tiny'] as const
export const ACCESSORIES = ['none', 'crown', 'bow', 'leaf', 'cap'] as const
export const DECORATIONS = ['stars', 'sparkles', 'flowers', 'clouds'] as const
export const PERSONALITIES = ['bouncy', 'sleepy', 'energetic', 'shy', 'proud'] as const

const HEX = /^#([0-9a-fA-F]{6})$/

const hex = z
  .string()
  .trim()
  .regex(HEX)
  .transform((value) => value.toLowerCase())

export const planetConfigSchema = z.object({
  seed: z.string().trim().min(1).max(80),
  bodyType: z.enum(BODY_TYPES),
  size: z.number().min(0.8).max(1.3),
  palette: z.object({
    base: hex,
    secondary: hex,
    accent: hex,
    glow: hex,
  }),
  surface: z.object({
    pattern: z.enum(PATTERNS),
    density: z.number().min(0).max(1),
    scale: z.number().min(0).max(1),
    rotation: z.number().min(0).max(360),
    contrast: z.number().min(0).max(1),
  }),
  rings: z.object({
    enabled: z.boolean(),
    count: z.number().int().min(1).max(3),
    tilt: z.number().min(-30).max(30),
    thickness: z.number().min(0.04).max(0.22),
    color: hex,
    style: z.enum(RING_STYLES),
  }),
  moons: z.object({
    count: z.number().int().min(0).max(1),
    size: z.number().min(0.12).max(0.28),
    orbitSpeed: z.number().min(0).max(1),
    colors: z.array(hex).max(1),
  }),
  atmosphere: z.object({
    enabled: z.boolean(),
    color: hex,
    intensity: z.number().min(0).max(1),
  }),
  face: z.object({
    eyes: z.enum(EYES),
    mouth: z.enum(MOUTHS),
    cheeks: z.boolean(),
    cheekColor: hex,
  }),
  accessory: z.enum(ACCESSORIES),
  decorations: z.array(z.enum(DECORATIONS)).max(2),
  personality: z.enum(PERSONALITIES),
})

export type PlanetConfig = z.infer<typeof planetConfigSchema>
export type BodyType = PlanetConfig['bodyType']
export type SurfacePattern = PlanetConfig['surface']['pattern']

const ALLOWED: Record<BodyType, readonly SurfacePattern[]> = {
  rocky: ['continents', 'craters', 'spots', 'dots'],
  gas: ['bands', 'stripes', 'swirls'],
  ice: ['dots', 'waves', 'spots'],
  lava: ['swirls', 'spots', 'stripes'],
  ocean: ['waves', 'swirls', 'dots'],
  forest: ['spots', 'continents', 'dots'],
  candy: ['dots', 'spots', 'stripes'],
  crystal: ['dots', 'stripes', 'none'],
  desert: ['waves', 'spots', 'craters'],
  cloud: ['swirls', 'spots', 'none'],
}

const FRIENDLY: Record<BodyType, [string, string, string, string]> = {
  rocky: ['#3b82f6', '#34d399', '#fde68a', '#93c5fd'],
  gas: ['#2dd4bf', '#5eead4', '#fde68a', '#99f6e4'],
  ice: ['#7dd3fc', '#e0f2fe', '#ffffff', '#bae6fd'],
  lava: ['#f97316', '#fbbf24', '#fb7185', '#fdba74'],
  ocean: ['#38bdf8', '#22d3ee', '#fef08a', '#7dd3fc'],
  forest: ['#22c55e', '#4ade80', '#fde68a', '#86efac'],
  candy: ['#f9a8d4', '#fde68a', '#a5b4fc', '#fbcfe8'],
  crystal: ['#c4b5fd', '#e9d5ff', '#67e8f9', '#ddd6fe'],
  desert: ['#fdba74', '#fde68a', '#fb7185', '#fed7aa'],
  cloud: ['#fda4af', '#fecdd3', '#fde68a', '#ffe4e6'],
}

const STYLE_BODY: Record<string, BodyType> = {
  rocky_blue: 'rocky',
  gas_teal: 'gas',
  lava_amber: 'lava',
  neon_violet: 'candy',
  ice_cyan: 'ice',
  forest_green: 'forest',
  rose_dust: 'cloud',
  shadow_slate: 'desert',
}

const OLD_KIND: Record<string, BodyType> = {
  terrestrial: 'rocky',
  rocky: 'rocky',
  gas: 'gas',
  ice: 'ice',
  lava: 'lava',
  desert: 'desert',
  cloud: 'cloud',
  ocean: 'ocean',
  forest: 'forest',
  candy: 'candy',
  crystal: 'crystal',
}

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
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function hexToRgb(hexColor: string): [number, number, number] {
  const h = hexColor.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function mixHex(a: string, b: string, t: number) {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

function luminance(hexColor: string) {
  const [r, g, b] = hexToRgb(hexColor)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/** Verde-marrón apagado o gris sucio: se empuja hacia la paleta amable del cuerpo. */
function freshen(hexColor: string, friendly: string) {
  const [r, g, b] = hexToRgb(hexColor)
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const sat = max === 0 ? 0 : (max - min) / max
  const y = luminance(hexColor)
  const muddy = sat < 0.22 && y < 0.62
  const tooDark = y < 0.28
  if (!muddy && !tooDark) return hexColor
  return mixHex(hexColor, friendly, muddy ? 0.55 : 0.42)
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)]!
}

export function generateFromSeed(seed: string, styleId?: string | null): PlanetConfig {
  const safeSeed = seed.trim() || 'taskia'
  const rand = mulberry32(hashString(`${styleId ?? ''}:${safeSeed}`))
  const bodyType = STYLE_BODY[styleId ?? ''] ?? pick(rand, BODY_TYPES)
  const palette = FRIENDLY[bodyType]
  const pattern = pick(rand, ALLOWED[bodyType])
  const ringsOn = rand() < 0.42
  const moonOn = rand() < 0.28
  return {
    seed: safeSeed,
    bodyType,
    size: 0.9 + rand() * 0.35,
    palette: {
      base: palette[0],
      secondary: palette[1],
      accent: palette[2],
      glow: palette[3],
    },
    surface: {
      pattern,
      density: 0.35 + rand() * 0.5,
      scale: 0.4 + rand() * 0.45,
      rotation: Math.round(rand() * 360),
      contrast: 0.45 + rand() * 0.4,
    },
    rings: {
      enabled: ringsOn,
      count: rand() < 0.3 ? 2 : 1,
      tilt: Math.round(-24 + rand() * 48),
      thickness: 0.06 + rand() * 0.08,
      color: palette[2],
      style: pick(rand, RING_STYLES),
    },
    moons: {
      count: moonOn ? 1 : 0,
      size: 0.14 + rand() * 0.1,
      orbitSpeed: 0.25 + rand() * 0.5,
      colors: [palette[1]],
    },
    atmosphere: {
      enabled: true,
      color: palette[3],
      intensity: 0.35 + rand() * 0.4,
    },
    face: {
      eyes: pick(rand, EYES),
      mouth: pick(rand, MOUTHS),
      cheeks: rand() < 0.55,
      cheekColor: '#fb7185',
    },
    accessory: pick(rand, ACCESSORIES),
    decorations: rand() < 0.5 ? [pick(rand, DECORATIONS)] : [],
    personality: pick(rand, PERSONALITIES),
  }
}

function asEnum<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback
}

function clamp(n: unknown, min: number, max: number, fallback: number) {
  const value = Number(n)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function asHex(raw: unknown, fallback: string) {
  return typeof raw === 'string' && HEX.test(raw.trim()) ? raw.trim().toLowerCase() : fallback
}

function readOldKind(raw: unknown): BodyType | null {
  if (typeof raw !== 'string') return null
  return OLD_KIND[raw] ?? null
}

/** Completa y corrige cualquier JSON antes de dibujar. */
export function sanitizePlanetConfig(raw: unknown, fallbackSeed: string, styleId?: string | null): PlanetConfig {
  const base = generateFromSeed(fallbackSeed, styleId)
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const seed = typeof o.seed === 'string' && o.seed.trim() ? o.seed.trim().slice(0, 80) : base.seed
  const fromSeed = seed === base.seed ? base : generateFromSeed(seed, styleId)
  const bodyType = readOldKind(o.bodyType) ?? readOldKind(o.kind) ?? fromSeed.bodyType
  const allowed = ALLOWED[bodyType]
  const surfaceRaw = o.surface && typeof o.surface === 'object' ? (o.surface as Record<string, unknown>) : {}
  const paletteRaw = o.palette && typeof o.palette === 'object' ? (o.palette as Record<string, unknown>) : {}
  const ringsRaw = o.rings && typeof o.rings === 'object' ? (o.rings as Record<string, unknown>) : {}
  const moonsRaw = o.moons && typeof o.moons === 'object' ? (o.moons as Record<string, unknown>) : {}
  const atmoRaw = o.atmosphere && typeof o.atmosphere === 'object' ? (o.atmosphere as Record<string, unknown>) : {}
  const faceRaw = o.face && typeof o.face === 'object' ? (o.face as Record<string, unknown>) : {}
  const friendly = FRIENDLY[bodyType]

  const legacyColor = asHex(o.color, '')
  const palette = {
    base: freshen(asHex(paletteRaw.base, legacyColor || fromSeed.palette.base), friendly[0]),
    secondary: freshen(asHex(paletteRaw.secondary, fromSeed.palette.secondary), friendly[1]),
    accent: freshen(asHex(paletteRaw.accent, fromSeed.palette.accent), friendly[2]),
    glow: freshen(asHex(paletteRaw.glow, fromSeed.palette.glow), friendly[3]),
  }
  if (bodyType === 'candy') {
    palette.base = mixHex(palette.base, '#fff7fb', 0.28)
    palette.secondary = mixHex(palette.secondary, '#fff7fb', 0.22)
  }
  if (bodyType === 'lava') {
    palette.base = mixHex(palette.base, '#f97316', 0.35)
  }

  const pattern = asEnum(surfaceRaw.pattern, allowed, allowed[0]!)
  const eyeInk = luminance(palette.base) > 0.62 ? '#1e293b' : '#f8fafc'
  const cheeks = faceRaw.cheeks === undefined ? fromSeed.face.cheeks : Boolean(faceRaw.cheeks)
  const decorations = Array.isArray(o.decorations)
    ? o.decorations
        .filter((item): item is PlanetConfig['decorations'][number] =>
          typeof item === 'string' && (DECORATIONS as readonly string[]).includes(item),
        )
        .slice(0, 2)
    : fromSeed.decorations

  const oldRings = o.rings === 0 || o.rings === 1 || o.rings === 2 ? Number(o.rings) : null

  const config: PlanetConfig = {
    seed,
    bodyType,
    size: clamp(o.size, 0.8, 1.3, fromSeed.size),
    palette,
    surface: {
      pattern,
      density: clamp(surfaceRaw.density, 0, 1, fromSeed.surface.density),
      scale: clamp(surfaceRaw.scale, 0, 1, fromSeed.surface.scale),
      rotation: clamp(surfaceRaw.rotation, 0, 360, fromSeed.surface.rotation),
      contrast: clamp(surfaceRaw.contrast, 0, 1, fromSeed.surface.contrast),
    },
    rings: {
      enabled: typeof ringsRaw.enabled === 'boolean' ? ringsRaw.enabled : oldRings != null ? oldRings > 0 : fromSeed.rings.enabled,
      count: Math.round(clamp(ringsRaw.count, 1, 3, oldRings === 2 ? 2 : fromSeed.rings.count)),
      tilt: clamp(ringsRaw.tilt, -30, 30, fromSeed.rings.tilt),
      thickness: clamp(ringsRaw.thickness, 0.04, 0.22, fromSeed.rings.thickness),
      color: freshen(asHex(ringsRaw.color, fromSeed.rings.color), friendly[2]),
      style: asEnum(ringsRaw.style, RING_STYLES, fromSeed.rings.style),
    },
    moons: {
      count: Math.round(clamp(moonsRaw.count, 0, 1, fromSeed.moons.count)) as 0 | 1,
      size: clamp(moonsRaw.size, 0.12, 0.28, fromSeed.moons.size),
      orbitSpeed: clamp(moonsRaw.orbitSpeed, 0, 1, fromSeed.moons.orbitSpeed),
      colors: [freshen(asHex(Array.isArray(moonsRaw.colors) ? moonsRaw.colors[0] : '', fromSeed.moons.colors[0] ?? friendly[1]), friendly[1])],
    },
    atmosphere: {
      enabled: typeof atmoRaw.enabled === 'boolean' ? atmoRaw.enabled : fromSeed.atmosphere.enabled,
      color: freshen(asHex(atmoRaw.color, typeof o.atmosphere === 'string' ? o.atmosphere : fromSeed.atmosphere.color), friendly[3]),
      intensity: clamp(atmoRaw.intensity, 0, 1, fromSeed.atmosphere.intensity),
    },
    face: {
      eyes: asEnum(faceRaw.eyes, EYES, fromSeed.face.eyes),
      mouth: asEnum(faceRaw.mouth, MOUTHS, fromSeed.face.mouth),
      cheeks,
      cheekColor: asHex(faceRaw.cheekColor, '#fb7185'),
    },
    accessory: asEnum(o.accessory, ACCESSORIES, fromSeed.accessory),
    decorations,
    personality: asEnum(o.personality, PERSONALITIES, fromSeed.personality),
  }

  config.face.cheekColor = luminance(config.palette.base) > 0.7 ? '#fb7185' : mixHex('#fb7185', '#ffffff', 0.25)
  void eyeInk
  return planetConfigSchema.parse(config)
}

/** Sin la semilla: dos configs con el mismo dibujo chocan aunque el seed cambie. */
export function planetFingerprint(config: PlanetConfig) {
  const quant = (hexColor: string) => {
    const [r, g, b] = hexToRgb(hexColor)
    const q = (n: number) => Math.round(n / 32)
    return `${q(r)}${q(g)}${q(b)}`
  }
  return [
    config.bodyType,
    quant(config.palette.base),
    quant(config.palette.secondary),
    config.surface.pattern,
    config.rings.enabled ? config.rings.style : 'off',
    config.face.eyes,
    config.face.mouth,
    config.accessory,
    config.decorations.join(','),
    String(config.moons.count),
  ].join('|')
}

export function resolveTroopPlanet(troop: {
  planet_style_id?: string | null
  planet_seed?: number | null
  planet_params?: unknown
  planet_config?: unknown
}) {
  const seed = `${troop.planet_style_id ?? 'rocky_blue'}:${troop.planet_seed ?? 1}`
  const source = troop.planet_config ?? troop.planet_params
  return sanitizePlanetConfig(source, seed, troop.planet_style_id)
}

export type PlanetMark = {
  cx: number
  cy: number
  rx: number
  ry: number
  fill: string
  rotate: number
}

export type PlanetDraw = {
  config: PlanetConfig
  marks: PlanetMark[]
  eyeInk: string
  moonAngle: number
}

export function planetDraw(config: PlanetConfig): PlanetDraw {
  const rand = mulberry32(hashString(`draw:${config.seed}:${config.bodyType}`))
  const count = config.surface.pattern === 'none' ? 0 : Math.round(2 + config.surface.density * 5)
  const scale = 0.55 + config.surface.scale * 1.1
  const marks: PlanetMark[] = []
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2
    const dist = rand() * 16
    const unit = 3.2 + rand() * 5.5
    marks.push({
      cx: 50 + Math.cos(angle) * dist,
      cy: 50 + Math.sin(angle) * dist * 0.85,
      rx: unit * scale,
      ry: (config.surface.pattern === 'bands' || config.surface.pattern === 'stripes' ? unit * 0.38 : unit * (0.7 + rand() * 0.4)) * scale,
      fill: i % 2 === 0 ? config.palette.secondary : config.palette.accent,
      rotate: config.surface.pattern === 'bands' || config.surface.pattern === 'waves' ? config.surface.rotation * 0.15 : rand() * 40 - 20,
    })
  }
  return {
    config,
    marks,
    eyeInk: luminance(config.palette.base) > 0.62 ? '#1e293b' : '#f8fafc',
    moonAngle: rand() * 360,
  }
}
