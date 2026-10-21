/**
 * Modelo de la nave de una tripulación. Es solo datos: qué pieza va en cada ranura y los colores.
 * El dibujo sale de `components/ship/ShipRenderer.tsx`. El backend valida el mismo esquema
 * (`taskia_backend/src/modules/troops/lib/ship-config.ts`): si cambia una lista, cambia en los dos.
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
    { id: 'rocket', label: 'Cometa' },
    { id: 'bean', label: 'Lunita' },
    { id: 'arrow', label: 'Halcón' },
    { id: 'barge', label: 'Titán' },
    { id: 'saucer', label: 'Nébula' },
    { id: 'dart', label: 'Dardo' },
    { id: 'drop', label: 'Gota' },
    { id: 'leaf', label: 'Pétalo' },
    { id: 'bullet', label: 'Bala' },
    { id: 'brick', label: 'Ladrillo' },
    { id: 'dolphin', label: 'Delfín' },
    { id: 'whale', label: 'Ballena' },
    { id: 'needle', label: 'Aguja' },
    { id: 'blimp', label: 'Zepelín' },
    { id: 'diamond', label: 'Diamante' },
  ] satisfies Option<Hull>[],
  nose: [
    { id: 'none', label: 'Pulida' },
    { id: 'probe', label: 'Explorador' },
    { id: 'cap', label: 'Gorrito' },
    { id: 'drill', label: 'Barrena' },
    { id: 'ball', label: 'Bolita' },
    { id: 'cone', label: 'Cono' },
    { id: 'fork', label: 'Horquilla' },
    { id: 'ring', label: 'Aro' },
    { id: 'beak', label: 'Pico' },
    { id: 'lamp', label: 'Linterna' },
    { id: 'spark', label: 'Chispazo' },
    { id: 'bumper', label: 'Almohadilla' },
    { id: 'whisker', label: 'Bigotes' },
    { id: 'pennant', label: 'Banderín' },
  ] satisfies Option<Nose>[],
  cockpit: [
    { id: 'none', label: 'Sin domo' },
    { id: 'bubble', label: 'Pecera' },
    { id: 'visor', label: 'Mirada' },
    { id: 'dome', label: 'Cúpula' },
    { id: 'twin', label: 'Gemelas' },
    { id: 'porthole', label: 'Escotilla' },
    { id: 'slit', label: 'Rendija' },
    { id: 'hood', label: 'Capucha' },
    { id: 'panorama', label: 'Panorámica' },
    { id: 'periscope', label: 'Periscopio' },
    { id: 'eye', label: 'Ojo' },
    { id: 'tower', label: 'Torreta' },
    { id: 'wedge', label: 'Cuña' },
  ] satisfies Option<Cockpit>[],
  wings: [
    { id: 'none', label: 'Sin alas' },
    { id: 'delta', label: 'Alerón' },
    { id: 'swept', label: 'Pluma' },
    { id: 'stub', label: 'Remo' },
    { id: 'blade', label: 'Cuchilla' },
    { id: 'leaf', label: 'Hoja' },
    { id: 'manta', label: 'Raya' },
    { id: 'steps', label: 'Escalón' },
    { id: 'hook', label: 'Gancho' },
    { id: 'biplane', label: 'Biplano' },
    { id: 'scissor', label: 'Tijera' },
    { id: 'butterfly', label: 'Mariposa' },
    { id: 'saw', label: 'Sierra' },
    { id: 'boomerang', label: 'Bumerán' },
  ] satisfies Option<Wing>[],
  tail: [
    { id: 'none', label: 'Sin cola' },
    { id: 'shark', label: 'Colmillo' },
    { id: 'twin', label: 'Mellizas' },
    { id: 'block', label: 'Timón' },
    { id: 'fins', label: 'Plumaje' },
    { id: 'sail', label: 'Vela' },
    { id: 'spike', label: 'Púa' },
    { id: 'crest', label: 'Cresta' },
    { id: 'fishtail', label: 'Pez' },
    { id: 'sickle', label: 'Hoz' },
    { id: 'disc', label: 'Disco' },
    { id: 'notch', label: 'Muesca' },
    { id: 'zig', label: 'Zigzag' },
    { id: 'rotor', label: 'Rotor' },
    { id: 'crown', label: 'Corona' },
  ] satisfies Option<Tail>[],
  engine: [
    { id: 'bell', label: 'Trueno' },
    { id: 'pods', label: 'Brote' },
    { id: 'ring', label: 'Aro solar' },
    { id: 'orb', label: 'Núcleo' },
  ] satisfies Option<Engine>[],
  flame: [
    { id: 'classic', label: 'Fuego' },
    { id: 'bolt', label: 'Centella' },
    { id: 'puff', label: 'Nubecitas' },
    { id: 'none', label: 'Apagada' },
  ] satisfies Option<Flame>[],
  top: [
    { id: 'none', label: 'Despejado' },
    { id: 'antenna', label: 'Chispa' },
    { id: 'dish', label: 'Oído' },
    { id: 'solar', label: 'Velas solares' },
    { id: 'beacon', label: 'Luciérnaga' },
  ] satisfies Option<Top>[],
  belly: [
    { id: 'none', label: 'Liso' },
    { id: 'pod', label: 'Panza' },
    { id: 'legs', label: 'Zancos' },
    { id: 'tank', label: 'Barril' },
  ] satisfies Option<Belly>[],
  decal: [
    { id: 'none', label: 'Lisa' },
    { id: 'stripe', label: 'Cinta' },
    { id: 'chevrons', label: 'Galones' },
    { id: 'checker', label: 'Meta' },
    { id: 'star', label: 'Estrella' },
  ] satisfies Option<Decal>[],
  windows: [
    { id: 'round', label: 'Ojos de buey' },
    { id: 'square', label: 'Píxeles' },
    { id: 'arch', label: 'Portales' },
    { id: 'hex', label: 'Colmena' },
    { id: 'diamond', label: 'Rombos' },
    { id: 'star', label: 'Estrellitas' },
    { id: 'heart', label: 'Corazones' },
    { id: 'slot', label: 'Ranuras' },
    { id: 'tri', label: 'Triángulos' },
    { id: 'oval', label: 'Óvalos' },
    { id: 'cross', label: 'Cruces' },
    { id: 'moon', label: 'Lunas' },
    { id: 'drop', label: 'Gotas' },
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
