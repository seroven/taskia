import { z } from 'zod'

/**
 * Avatar de un usuario: qué pieza va en cada parte y los colores. El dibujo lo hace el frontend
 * (`taskia_frontend/src/components/avatar/AvatarRenderer.tsx`); las listas de abajo deben ser las mismas que en
 * `taskia_frontend/src/lib/avatar/types.ts`. Es del usuario, en toda la aplicación (no depende de la tripulación).
 */
export const BASES = ['human', 'alien', 'robot', 'cat'] as const
export const EYES = ['dots', 'round', 'happy', 'sleepy', 'wink', 'star', 'big', 'cyclops'] as const
export const MOUTHS = ['smile', 'grin', 'open', 'tongue', 'smirk', 'flat'] as const
export const HAIRS = ['none', 'short', 'spiky', 'long', 'curly', 'bun', 'mohawk', 'pigtails', 'bob', 'afro', 'braids', 'ponytail', 'buns', 'wavy', 'fringe', 'parted', 'buzz', 'tuft', 'bowl'] as const
export const OUTFITS = ['tee', 'hoodie', 'suit', 'overalls', 'jacket', 'armor', 'poncho', 'turtleneck', 'stripes', 'vest', 'dress', 'tie', 'cape', 'lab', 'sailor', 'puffer', 'tanktop', 'scarf'] as const
export const ACCESSORIES = ['none', 'glasses', 'shades', 'headphones', 'antennas', 'cap', 'bow', 'crown', 'monocle', 'beanie', 'tophat', 'patch', 'helmet', 'bandana', 'flower', 'mask', 'halo', 'mustache'] as const

/** Marcos del avatar y el nivel con el que se desbloquean: cada vez más elaborados. */
export const FRAMES = [
  { id: 'none', minLevel: 1 },
  { id: 'ring', minLevel: 1 },
  { id: 'double', minLevel: 3 },
  { id: 'dots', minLevel: 5 },
  { id: 'stars', minLevel: 8 },
  { id: 'laurel', minLevel: 12 },
  { id: 'flame', minLevel: 16 },
  { id: 'orbit', minLevel: 20 },
] as const

export const FRAME_IDS = FRAMES.map((frame) => frame.id) as unknown as readonly (typeof FRAMES)[number]['id'][]
export type FrameId = (typeof FRAMES)[number]['id']

export function isFrameId(id: unknown): id is FrameId {
  return typeof id === 'string' && FRAMES.some((frame) => frame.id === id)
}

export function frameUnlocked(id: string, level: number) {
  const frame = FRAMES.find((item) => item.id === id)
  return frame != null && level >= frame.minLevel
}

const HEX = /^#([0-9a-fA-F]{6})$/

const hex = z
  .string()
  .trim()
  .regex(HEX)
  .transform((value) => value.toLowerCase())

export const avatarConfigSchema = z.object({
  seed: z.string().trim().min(1).max(80),
  base: z.enum(BASES),
  eyes: z.enum(EYES),
  mouth: z.enum(MOUTHS),
  hair: z.enum(HAIRS),
  outfit: z.enum(OUTFITS),
  accessory: z.enum(ACCESSORIES),
  palette: z.object({ skin: hex, hair: hex, outfit: hex, accent: hex, bg: hex }),
})

export type AvatarConfig = z.infer<typeof avatarConfigSchema>
type Palette = AvatarConfig['palette']

const SKINS = ['#f8d5b8', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21']
const FUN_SKINS = ['#86efac', '#c4b5fd', '#7dd3fc', '#fda4af', '#cbd5e1']
const HAIR_COLORS = ['#1f2937', '#78350f', '#b45309', '#fbbf24', '#f43f5e', '#8b5cf6', '#3b82f6', '#e5e7eb']
const OUTFIT_COLORS = ['#3b82f6', '#22c55e', '#f43f5e', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#64748b']
const ACCENT_COLORS = ['#fbbf24', '#38bdf8', '#f472b6', '#4ade80', '#f87171', '#a78bfa']
const BG_COLORS = ['#bae6fd', '#fde68a', '#fbcfe8', '#bbf7d0', '#ddd6fe', '#fed7aa', '#a5f3fc', '#e2e8f0']

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value: string) {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const pick = <T>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!

/** La misma semilla da siempre el mismo avatar. */
export function generateAvatarFromSeed(seed: string): AvatarConfig {
  const safeSeed = seed.trim().slice(0, 80) || 'taskia'
  const rand = mulberry32(hashString(`avatar:${safeSeed}`))
  const base = pick(rand, BASES)
  return {
    seed: safeSeed,
    base,
    eyes: pick(rand, EYES),
    mouth: pick(rand, MOUTHS),
    hair: pick(rand, HAIRS),
    outfit: pick(rand, OUTFITS),
    accessory: pick(rand, ACCESSORIES),
    palette: {
      skin: pick(rand, base === 'human' ? SKINS : FUN_SKINS),
      hair: pick(rand, HAIR_COLORS),
      outfit: pick(rand, OUTFIT_COLORS),
      accent: pick(rand, ACCENT_COLORS),
      bg: pick(rand, BG_COLORS),
    },
  }
}

function asEnum<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback
}

/** Acepta «#7dd3fc», «7dd3fc» y «#7df». */
function asHex(raw: unknown, fallback: string) {
  if (typeof raw !== 'string') return fallback
  let value = raw.trim().toLowerCase().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/.test(value)) value = value.replace(/./g, (digit) => digit + digit)
  value = `#${value}`
  return HEX.test(value) ? value : fallback
}

/**
 * Completa y corrige el JSON del cliente antes de guardarlo o dibujarlo: lo que falte o no sea válido sale del
 * avatar de la semilla. Los colores se respetan tal cual: es decisión del niño.
 */
export function sanitizeAvatarConfig(raw: unknown, fallbackSeed: string): AvatarConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const seed = typeof o.seed === 'string' && o.seed.trim() ? o.seed.trim().slice(0, 80) : fallbackSeed
  const base = generateAvatarFromSeed(seed)
  const paletteRaw = o.palette && typeof o.palette === 'object' ? (o.palette as Record<string, unknown>) : {}
  const palette: Palette = {
    skin: asHex(paletteRaw.skin, base.palette.skin),
    hair: asHex(paletteRaw.hair, base.palette.hair),
    outfit: asHex(paletteRaw.outfit, base.palette.outfit),
    accent: asHex(paletteRaw.accent, base.palette.accent),
    bg: asHex(paletteRaw.bg, base.palette.bg),
  }
  return avatarConfigSchema.parse({
    seed,
    base: asEnum(o.base, BASES, base.base),
    eyes: asEnum(o.eyes, EYES, base.eyes),
    mouth: asEnum(o.mouth, MOUTHS, base.mouth),
    hair: asEnum(o.hair, HAIRS, base.hair),
    outfit: asEnum(o.outfit, OUTFITS, base.outfit),
    accessory: asEnum(o.accessory, ACCESSORIES, base.accessory),
    palette,
  })
}

/** Lo que guarda la base. Si el usuario aún no tiene avatar (`null`), no se inventa uno: se le pide crearlo. */
export function resolveUserAvatar(raw: unknown, userId: number): AvatarConfig | null {
  if (raw == null) return null
  return sanitizeAvatarConfig(raw, `user-${userId}`)
}
