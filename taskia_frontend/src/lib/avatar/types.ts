/**
 * Modelo del avatar de un usuario: qué pieza va en cada parte y los colores. Es solo datos; el dibujo sale de
 * `components/avatar/AvatarRenderer.tsx`. El backend valida el mismo esquema
 * (`taskia_backend/src/modules/auth/lib/avatar-config.ts`): si cambia una lista, cambia en los dos.
 */

export const BASES = ['human', 'alien', 'robot', 'cat', 'panda', 'bunny', 'ghost', 'monster', 'dino', 'owl'] as const
export const EYES = ['dots', 'round', 'happy', 'sleepy', 'wink', 'star', 'big', 'cyclops', 'heart', 'angry', 'wide', 'lashes', 'tired', 'spiral', 'cross', 'shiny', 'sad', 'led'] as const
export const MOUTHS = ['smile', 'grin', 'open', 'tongue', 'smirk', 'flat', 'laugh', 'frown', 'kiss', 'fangs', 'wavy', 'buck', 'cat', 'oh', 'braces', 'teasing'] as const
export const HAIRS = ['none', 'short', 'spiky', 'long', 'curly', 'bun', 'mohawk', 'pigtails', 'bob', 'afro', 'braids', 'ponytail', 'buns', 'wavy', 'fringe', 'parted', 'buzz', 'tuft', 'bowl'] as const
export const OUTFITS = ['tee', 'hoodie', 'suit', 'overalls', 'jacket', 'armor', 'poncho', 'turtleneck', 'stripes', 'vest', 'dress', 'tie', 'cape', 'lab', 'sailor', 'puffer', 'tanktop', 'scarf'] as const
export const ACCESSORIES = ['none', 'glasses', 'shades', 'headphones', 'antennas', 'cap', 'bow', 'crown', 'monocle', 'beanie', 'tophat', 'patch', 'helmet', 'bandana', 'flower', 'mask', 'halo', 'mustache'] as const

export type Base = (typeof BASES)[number]
export type Eyes = (typeof EYES)[number]
export type Mouth = (typeof MOUTHS)[number]
export type Hair = (typeof HAIRS)[number]
export type Outfit = (typeof OUTFITS)[number]
export type Accessory = (typeof ACCESSORIES)[number]

export interface AvatarPalette {
  /** Cabeza y cuello. */
  skin: string
  hair: string
  outfit: string
  /** Detalles: accesorios, antenas, parches. */
  accent: string
  /** Fondo del círculo. */
  bg: string
}

export interface AvatarConfig {
  seed: string
  base: Base
  eyes: Eyes
  mouth: Mouth
  hair: Hair
  outfit: Outfit
  accessory: Accessory
  palette: AvatarPalette
}

type Option<T extends string> = { id: T; label: string }

export const AVATAR_OPTIONS = {
  base: [
    { id: 'human', label: 'Explorador' },
    { id: 'alien', label: 'Alienígena' },
    { id: 'robot', label: 'Robot' },
    { id: 'cat', label: 'Gatonauta' },
    { id: 'panda', label: 'Panda' },
    { id: 'bunny', label: 'Conejo' },
    { id: 'ghost', label: 'Fantasma' },
    { id: 'monster', label: 'Monstruo' },
    { id: 'dino', label: 'Dino' },
    { id: 'owl', label: 'Búho' },
  ] satisfies Option<Base>[],
  eyes: [
    { id: 'dots', label: 'Puntitos' },
    { id: 'round', label: 'Redondos' },
    { id: 'happy', label: 'Felices' },
    { id: 'sleepy', label: 'Dormilones' },
    { id: 'wink', label: 'Guiño' },
    { id: 'star', label: 'Estrellas' },
    { id: 'big', label: 'Grandes' },
    { id: 'cyclops', label: 'Un ojo' },
    { id: 'heart', label: 'Corazones' },
    { id: 'angry', label: 'Enojados' },
    { id: 'wide', label: 'Asombrados' },
    { id: 'lashes', label: 'Pestañas' },
    { id: 'tired', label: 'Cansados' },
    { id: 'spiral', label: 'Mareados' },
    { id: 'cross', label: 'Cruces' },
    { id: 'shiny', label: 'Brillantes' },
    { id: 'sad', label: 'Tristes' },
    { id: 'led', label: 'Pantalla' },
  ] satisfies Option<Eyes>[],
  mouth: [
    { id: 'smile', label: 'Sonrisa' },
    { id: 'grin', label: 'Dientes' },
    { id: 'open', label: 'Sorpresa' },
    { id: 'tongue', label: 'Lengua' },
    { id: 'smirk', label: 'Pícara' },
    { id: 'flat', label: 'Seria' },
    { id: 'laugh', label: 'Carcajada' },
    { id: 'frown', label: 'Triste' },
    { id: 'kiss', label: 'Beso' },
    { id: 'fangs', label: 'Colmillos' },
    { id: 'wavy', label: 'Nerviosa' },
    { id: 'buck', label: 'Dientón' },
    { id: 'cat', label: 'Gatuna' },
    { id: 'oh', label: 'Oh' },
    { id: 'braces', label: 'Frenos' },
    { id: 'teasing', label: 'Burla' },
  ] satisfies Option<Mouth>[],
  hair: [
    { id: 'none', label: 'Sin pelo' },
    { id: 'short', label: 'Corto' },
    { id: 'spiky', label: 'Puntas' },
    { id: 'long', label: 'Largo' },
    { id: 'curly', label: 'Rizos' },
    { id: 'bun', label: 'Moño' },
    { id: 'mohawk', label: 'Cresta' },
    { id: 'pigtails', label: 'Coletas' },
    { id: 'bob', label: 'Melena' },
    { id: 'afro', label: 'Afro' },
    { id: 'braids', label: 'Trenzas' },
    { id: 'ponytail', label: 'Cola alta' },
    { id: 'buns', label: 'Dos moños' },
    { id: 'wavy', label: 'Ondas' },
    { id: 'fringe', label: 'Flequillo' },
    { id: 'parted', label: 'Raya' },
    { id: 'buzz', label: 'Rapado' },
    { id: 'tuft', label: 'Mechón' },
    { id: 'bowl', label: 'Taza' },
  ] satisfies Option<Hair>[],
  outfit: [
    { id: 'tee', label: 'Camiseta' },
    { id: 'hoodie', label: 'Capucha' },
    { id: 'suit', label: 'Traje espacial' },
    { id: 'overalls', label: 'Overol' },
    { id: 'jacket', label: 'Chaqueta' },
    { id: 'armor', label: 'Armadura' },
    { id: 'poncho', label: 'Poncho' },
    { id: 'turtleneck', label: 'Cuello alto' },
    { id: 'stripes', label: 'Rayas' },
    { id: 'vest', label: 'Chaleco' },
    { id: 'dress', label: 'Vestido' },
    { id: 'tie', label: 'Corbata' },
    { id: 'cape', label: 'Capa' },
    { id: 'lab', label: 'Bata' },
    { id: 'sailor', label: 'Marinero' },
    { id: 'puffer', label: 'Plumífero' },
    { id: 'tanktop', label: 'Tirantes' },
    { id: 'scarf', label: 'Bufanda' },
  ] satisfies Option<Outfit>[],
  accessory: [
    { id: 'none', label: 'Ninguno' },
    { id: 'glasses', label: 'Gafas' },
    { id: 'shades', label: 'Gafas de sol' },
    { id: 'headphones', label: 'Audífonos' },
    { id: 'antennas', label: 'Antenas' },
    { id: 'cap', label: 'Gorra' },
    { id: 'bow', label: 'Lazo' },
    { id: 'crown', label: 'Corona' },
    { id: 'monocle', label: 'Monóculo' },
    { id: 'beanie', label: 'Gorro' },
    { id: 'tophat', label: 'Sombrero' },
    { id: 'patch', label: 'Parche' },
    { id: 'helmet', label: 'Casco' },
    { id: 'bandana', label: 'Pañuelo' },
    { id: 'flower', label: 'Flor' },
    { id: 'mask', label: 'Antifaz' },
    { id: 'halo', label: 'Aureola' },
    { id: 'mustache', label: 'Bigote' },
  ] satisfies Option<Accessory>[],
}

/** Marcos del avatar: cada uno pide más nivel y es más elaborado que el anterior. */
export const FRAMES = [
  { id: 'none', label: 'Sin marco', minLevel: 1 },
  { id: 'ring', label: 'Anillo', minLevel: 1 },
  { id: 'double', label: 'Doble anillo', minLevel: 3 },
  { id: 'dots', label: 'Puntitos', minLevel: 5 },
  { id: 'stars', label: 'Estrellas', minLevel: 8 },
  { id: 'laurel', label: 'Laureles', minLevel: 12 },
  { id: 'flame', label: 'Llamas', minLevel: 16 },
  { id: 'orbit', label: 'Órbita', minLevel: 20 },
  { id: 'wings', label: 'Alas', minLevel: 30 },
  { id: 'crystal', label: 'Cristales', minLevel: 40 },
  { id: 'comet', label: 'Cometa', minLevel: 50 },
  { id: 'sun', label: 'Sol', minLevel: 60 },
  { id: 'galaxy', label: 'Galaxia', minLevel: 70 },
  { id: 'royal', label: 'Realeza', minLevel: 80 },
  { id: 'phoenix', label: 'Fénix', minLevel: 90 },
  { id: 'legend', label: 'Leyenda', minLevel: 100 },
] as const

export type FrameId = (typeof FRAMES)[number]['id']

export const frameUnlocked = (id: string, level: number) => FRAMES.some((frame) => frame.id === id && level >= frame.minLevel)

/** Muestras de color por parte; además se puede escribir cualquier código. */
export const SWATCHES = {
  skin: ['#f8d5b8', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21', '#86efac', '#c4b5fd', '#7dd3fc', '#fda4af', '#cbd5e1', '#fde68a'],
  hair: ['#1f2937', '#78350f', '#b45309', '#fbbf24', '#f43f5e', '#8b5cf6', '#3b82f6', '#22c55e', '#e5e7eb', '#ffffff', '#f472b6', '#14b8a6'],
  outfit: ['#3b82f6', '#22c55e', '#f43f5e', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#64748b', '#1f2937', '#ffffff', '#0ea5e9', '#a3e635'],
  accent: ['#fbbf24', '#38bdf8', '#f472b6', '#4ade80', '#f87171', '#a78bfa', '#fb923c', '#ffffff', '#1f2937', '#2dd4bf'],
  bg: ['#bae6fd', '#fde68a', '#fbcfe8', '#bbf7d0', '#ddd6fe', '#fed7aa', '#a5f3fc', '#e2e8f0', '#1e293b', '#fecaca', '#d9f99d', '#0f172a'],
} as const

const SKINS = SWATCHES.skin.slice(0, 6)
const FUN_SKINS = SWATCHES.skin.slice(6)

const pick = <T,>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!

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

/** Un avatar al azar pero válido (el botón «Sorpréndeme» y el banco de pruebas). */
export function randomAvatar(seed: string): AvatarConfig {
  const rand = mulberry32(hashString(seed))
  const ids = <T extends string>(list: { id: T }[]) => list.map((item) => item.id)
  const base = pick(rand, ids(AVATAR_OPTIONS.base))
  return {
    seed,
    base,
    eyes: pick(rand, ids(AVATAR_OPTIONS.eyes)),
    mouth: pick(rand, ids(AVATAR_OPTIONS.mouth)),
    hair: pick(rand, ids(AVATAR_OPTIONS.hair)),
    outfit: pick(rand, ids(AVATAR_OPTIONS.outfit)),
    accessory: pick(rand, ids(AVATAR_OPTIONS.accessory)),
    palette: {
      skin: pick(rand, base === 'human' ? SKINS : FUN_SKINS),
      hair: pick(rand, SWATCHES.hair),
      outfit: pick(rand, SWATCHES.outfit),
      accent: pick(rand, SWATCHES.accent),
      bg: pick(rand, SWATCHES.bg.slice(0, 8)),
    },
  }
}
