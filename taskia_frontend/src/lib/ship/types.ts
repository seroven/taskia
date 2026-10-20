/**
 * Modelo de la nave de una tripulación. Es solo datos: qué pieza va en cada ranura y los colores.
 * El dibujo sale de `components/ship/ShipRenderer.tsx`. El backend valida el mismo esquema
 * (`taskia_backend/src/modules/troops/lib/ship-config.ts`): si cambia una lista, cambia en los dos.
 */

export const HULLS = ['rocket', 'bean', 'arrow', 'barge', 'saucer'] as const
export const NOSES = ['none', 'probe', 'cap', 'drill'] as const
export const COCKPITS = ['none', 'bubble', 'visor'] as const
export const WINGS = ['none', 'delta', 'swept', 'stub'] as const
export const TAILS = ['none', 'shark', 'twin', 'block', 'fins'] as const
export const ENGINES = ['bell', 'pods', 'ring', 'orb'] as const
export const FLAMES = ['classic', 'bolt', 'puff', 'none'] as const
export const TOPS = ['none', 'antenna', 'dish', 'solar', 'beacon'] as const
export const BELLIES = ['none', 'pod', 'legs', 'tank'] as const
export const DECALS = ['none', 'stripe', 'chevrons', 'checker', 'star'] as const
export const WINDOWS = ['round', 'square', 'arch'] as const

export type Hull = (typeof HULLS)[number]
export type Nose = (typeof NOSES)[number]
export type Cockpit = (typeof COCKPITS)[number]
export type Wing = (typeof WINGS)[number]
export type Tail = (typeof TAILS)[number]
export type Engine = (typeof ENGINES)[number]
export type Flame = (typeof FLAMES)[number]
export type Top = (typeof TOPS)[number]
export type Belly = (typeof BELLIES)[number]
export type Decal = (typeof DECALS)[number]
export type WindowKind = (typeof WINDOWS)[number]

export interface ShipPalette {
  /** Casco. */
  hull: string
  /** Alas, cola, motores y módulos. */
  trim: string
  /** Detalles: franjas, punta, llama. */
  accent: string
  /** Luz de las ventanillas. */
  glass: string
}

export interface ShipConfig {
  seed: string
  hull: Hull
  nose: Nose
  cockpit: Cockpit
  wings: Wing
  tail: Tail
  engine: { kind: Engine; count: 1 | 2 | 3; flame: Flame }
  top: Top
  belly: Belly
  decal: Decal
  windows: WindowKind
  palette: ShipPalette
}

/** Máximo de miembros de una tripulación: una ventanilla por cada uno. */
export const MAX_CREW = 10

type Option<T extends string> = { id: T; label: string }

export const SHIP_OPTIONS = {
  hull: [
    { id: 'rocket', label: 'Cohete' },
    { id: 'bean', label: 'Cápsula' },
    { id: 'arrow', label: 'Flecha' },
    { id: 'barge', label: 'Carguero' },
    { id: 'saucer', label: 'Platillo' },
  ] satisfies Option<Hull>[],
  nose: [
    { id: 'none', label: 'Lisa' },
    { id: 'probe', label: 'Sonda' },
    { id: 'cap', label: 'Punta de color' },
    { id: 'drill', label: 'Taladro' },
  ] satisfies Option<Nose>[],
  cockpit: [
    { id: 'none', label: 'Sin cabina' },
    { id: 'bubble', label: 'Burbuja' },
    { id: 'visor', label: 'Visor' },
  ] satisfies Option<Cockpit>[],
  wings: [
    { id: 'none', label: 'Sin alas' },
    { id: 'delta', label: 'Delta' },
    { id: 'swept', label: 'Curvas' },
    { id: 'stub', label: 'Cortas' },
  ] satisfies Option<Wing>[],
  tail: [
    { id: 'none', label: 'Sin cola' },
    { id: 'shark', label: 'Tiburón' },
    { id: 'twin', label: 'Gemela' },
    { id: 'block', label: 'Bloque' },
    { id: 'fins', label: 'Aletas' },
  ] satisfies Option<Tail>[],
  engine: [
    { id: 'bell', label: 'Campana' },
    { id: 'pods', label: 'Cápsulas' },
    { id: 'ring', label: 'Anillo' },
    { id: 'orb', label: 'Orbe' },
  ] satisfies Option<Engine>[],
  flame: [
    { id: 'classic', label: 'Llama' },
    { id: 'bolt', label: 'Rayo' },
    { id: 'puff', label: 'Burbujas' },
    { id: 'none', label: 'Sin estela' },
  ] satisfies Option<Flame>[],
  top: [
    { id: 'none', label: 'Nada' },
    { id: 'antenna', label: 'Antena' },
    { id: 'dish', label: 'Parabólica' },
    { id: 'solar', label: 'Panel solar' },
    { id: 'beacon', label: 'Faro' },
  ] satisfies Option<Top>[],
  belly: [
    { id: 'none', label: 'Nada' },
    { id: 'pod', label: 'Bodega' },
    { id: 'legs', label: 'Patas' },
    { id: 'tank', label: 'Tanque' },
  ] satisfies Option<Belly>[],
  decal: [
    { id: 'none', label: 'Lisa' },
    { id: 'stripe', label: 'Franja' },
    { id: 'chevrons', label: 'Flechas' },
    { id: 'checker', label: 'Ajedrez' },
    { id: 'star', label: 'Estrella' },
  ] satisfies Option<Decal>[],
  windows: [
    { id: 'round', label: 'Redondas' },
    { id: 'square', label: 'Cuadradas' },
    { id: 'arch', label: 'Arco' },
  ] satisfies Option<WindowKind>[],
}

export interface PalettePreset {
  id: string
  label: string
  palette: ShipPalette
}

/** Paletas de la casa: colores vivos o pastel, con la luz de ventana siempre clara. */
export const PALETTE_PRESETS: PalettePreset[] = [
  { id: 'cielo', label: 'Cielo', palette: { hull: '#7dd3fc', trim: '#3b82f6', accent: '#fbbf24', glass: '#fef9c3' } },
  { id: 'menta', label: 'Menta', palette: { hull: '#86efac', trim: '#22c55e', accent: '#fde68a', glass: '#ecfeff' } },
  { id: 'coral', label: 'Coral', palette: { hull: '#fda4af', trim: '#f43f5e', accent: '#fde68a', glass: '#fff7ed' } },
  { id: 'uva', label: 'Uva', palette: { hull: '#c4b5fd', trim: '#8b5cf6', accent: '#fbcfe8', glass: '#f5f3ff' } },
  { id: 'mandarina', label: 'Mandarina', palette: { hull: '#fdba74', trim: '#f97316', accent: '#fef08a', glass: '#fffbeb' } },
  { id: 'nube', label: 'Nube', palette: { hull: '#e2e8f0', trim: '#94a3b8', accent: '#f472b6', glass: '#e0f2fe' } },
  { id: 'limon', label: 'Limón', palette: { hull: '#fde68a', trim: '#f59e0b', accent: '#38bdf8', glass: '#fffbeb' } },
  { id: 'turquesa', label: 'Turquesa', palette: { hull: '#5eead4', trim: '#0d9488', accent: '#fda4af', glass: '#f0fdfa' } },
  { id: 'fresa', label: 'Fresa', palette: { hull: '#fecdd3', trim: '#fb7185', accent: '#a5b4fc', glass: '#fff1f2' } },
  { id: 'noche', label: 'Noche', palette: { hull: '#a5b4fc', trim: '#4338ca', accent: '#fcd34d', glass: '#e0e7ff' } },
]

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

/** Una nave al azar pero válida por construcción (el botón «Sorpréndeme» del editor y el banco de pruebas). */
export function randomShip(seed: string): ShipConfig {
  const rand = mulberry32(hashString(seed))
  const ids = <T extends string>(list: { id: T }[]) => list.map((item) => item.id)
  return {
    seed,
    hull: pick(rand, ids(SHIP_OPTIONS.hull)),
    nose: pick(rand, ids(SHIP_OPTIONS.nose)),
    cockpit: pick(rand, ids(SHIP_OPTIONS.cockpit)),
    wings: pick(rand, ids(SHIP_OPTIONS.wings)),
    tail: pick(rand, ids(SHIP_OPTIONS.tail)),
    engine: {
      kind: pick(rand, ids(SHIP_OPTIONS.engine)),
      count: pick(rand, [1, 2, 3] as const),
      flame: pick(rand, ids(SHIP_OPTIONS.flame)),
    },
    top: pick(rand, ids(SHIP_OPTIONS.top)),
    belly: pick(rand, ids(SHIP_OPTIONS.belly)),
    decal: pick(rand, ids(SHIP_OPTIONS.decal)),
    windows: pick(rand, ids(SHIP_OPTIONS.windows)),
    palette: pick(rand, PALETTE_PRESETS).palette,
  }
}
