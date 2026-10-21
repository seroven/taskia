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
export const ENGINES = ['bell', 'pods', 'ring', 'orb', 'jet', 'horn', 'cone', 'fan', 'crystal', 'box', 'bubble', 'saturn', 'nozzle', 'flare'] as const
export const FLAMES = ['classic', 'bolt', 'puff', 'none', 'comet', 'rainbow', 'sparks', 'waves', 'drip', 'ribbon', 'stars', 'pulse', 'tongue', 'hearts'] as const
export const TOPS = ['none', 'antenna', 'dish', 'solar', 'beacon', 'flag', 'windmill', 'balloon', 'lighthouse', 'sprout', 'umbrella', 'minirocket', 'moon', 'antlers', 'orbit'] as const
export const BELLIES = ['none', 'pod', 'legs', 'tank', 'wheels', 'skids', 'orb', 'claw', 'keel', 'dome', 'crates', 'tripod', 'spot', 'anchor'] as const
export const DECALS = ['none', 'stripe', 'chevrons', 'checker', 'star', 'dots', 'zigzag', 'waves', 'diamonds', 'bands', 'flames', 'spots', 'bolt', 'plaid', 'hearts'] as const
export const WINDOWS = ['round', 'square', 'arch', 'hex', 'diamond', 'star', 'heart', 'slot', 'tri', 'oval', 'cross', 'moon', 'drop'] as const

/**
 * Piezas que se desbloquean con el nivel de la tripulación: en cada parte, tres (a los niveles 5, 15 y 25); todo lo
 * demás está libre desde el nivel 1. Debe ser igual a `SHIP_LOCKS` de `taskia_backend/src/modules/troops/lib/ship-config.ts`.
 */
export const LOCK_LEVELS = [5, 15, 25] as const

const LOCKED = {
  hull: ['dolphin', 'blimp', 'diamond'],
  nose: ['whisker', 'lamp', 'spark'],
  cockpit: ['periscope', 'eye', 'panorama'],
  wings: ['manta', 'biplane', 'butterfly'],
  tail: ['rotor', 'fishtail', 'crown'],
  engine: ['fan', 'crystal', 'saturn'],
  flame: ['ribbon', 'stars', 'rainbow'],
  top: ['windmill', 'lighthouse', 'orbit'],
  belly: ['wheels', 'claw', 'anchor'],
  decal: ['diamonds', 'flames', 'plaid'],
  windows: ['hex', 'star', 'heart'],
} as const

export type LockSlot = keyof typeof LOCKED

export const SHIP_LOCKS = (Object.keys(LOCKED) as LockSlot[]).flatMap((slot) =>
  LOCKED[slot].map((id, index) => ({ slot, id: id as string, level: LOCK_LEVELS[index]! })),
)

/** Los hitos del escudo de nivel: gana un adorno en cada uno (no todos desbloquean piezas). */
export const LEVEL_MILESTONES = [5, 10, 15, 20, 25] as const

/** Cuántos hitos ya alcanzó un nivel. */
export const levelTier = (level: number) => LEVEL_MILESTONES.filter((m) => level >= m).length

/** Nivel de tripulación que pide una pieza (1 si está libre). */
export function shipPartLevel(slot: string, id: string): number {
  return SHIP_LOCKS.find((lock) => lock.slot === slot && lock.id === id)?.level ?? 1
}

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
    { id: 'jet', label: 'Turbina' },
    { id: 'horn', label: 'Trompeta' },
    { id: 'cone', label: 'Cohetín' },
    { id: 'fan', label: 'Ventilador' },
    { id: 'crystal', label: 'Cristal' },
    { id: 'box', label: 'Caja' },
    { id: 'bubble', label: 'Pompa' },
    { id: 'saturn', label: 'Anillos' },
    { id: 'nozzle', label: 'Boquilla' },
    { id: 'flare', label: 'Abanico' },
  ] satisfies Option<Engine>[],
  flame: [
    { id: 'classic', label: 'Fuego' },
    { id: 'bolt', label: 'Centella' },
    { id: 'puff', label: 'Nubecitas' },
    { id: 'none', label: 'Apagada' },
    { id: 'comet', label: 'Meteoro' },
    { id: 'rainbow', label: 'Arcoíris' },
    { id: 'sparks', label: 'Chispas' },
    { id: 'waves', label: 'Ondas' },
    { id: 'drip', label: 'Gotitas' },
    { id: 'ribbon', label: 'Cinta' },
    { id: 'stars', label: 'Estrellas' },
    { id: 'pulse', label: 'Pulsos' },
    { id: 'tongue', label: 'Lengua' },
    { id: 'hearts', label: 'Corazones' },
  ] satisfies Option<Flame>[],
  top: [
    { id: 'none', label: 'Despejado' },
    { id: 'antenna', label: 'Chispa' },
    { id: 'dish', label: 'Oído' },
    { id: 'solar', label: 'Velas solares' },
    { id: 'beacon', label: 'Luciérnaga' },
    { id: 'flag', label: 'Bandera' },
    { id: 'windmill', label: 'Molino' },
    { id: 'balloon', label: 'Globo' },
    { id: 'lighthouse', label: 'Faro' },
    { id: 'sprout', label: 'Plantita' },
    { id: 'umbrella', label: 'Sombrilla' },
    { id: 'minirocket', label: 'Cohetito' },
    { id: 'moon', label: 'Media luna' },
    { id: 'antlers', label: 'Cuernos' },
    { id: 'orbit', label: 'Satélite' },
  ] satisfies Option<Top>[],
  belly: [
    { id: 'none', label: 'Liso' },
    { id: 'pod', label: 'Panza' },
    { id: 'legs', label: 'Zancos' },
    { id: 'tank', label: 'Barril' },
    { id: 'wheels', label: 'Ruedas' },
    { id: 'skids', label: 'Patines' },
    { id: 'orb', label: 'Esfera' },
    { id: 'claw', label: 'Garra' },
    { id: 'keel', label: 'Quilla' },
    { id: 'dome', label: 'Mirador' },
    { id: 'crates', label: 'Cajas' },
    { id: 'tripod', label: 'Trípode' },
    { id: 'spot', label: 'Reflector' },
    { id: 'anchor', label: 'Ancla' },
  ] satisfies Option<Belly>[],
  decal: [
    { id: 'none', label: 'Lisa' },
    { id: 'stripe', label: 'Cinta' },
    { id: 'chevrons', label: 'Galones' },
    { id: 'checker', label: 'Meta' },
    { id: 'star', label: 'Estrella' },
    { id: 'dots', label: 'Lunares' },
    { id: 'zigzag', label: 'Zigzag' },
    { id: 'waves', label: 'Olas' },
    { id: 'diamonds', label: 'Rombos' },
    { id: 'bands', label: 'Bandas' },
    { id: 'flames', label: 'Llamas' },
    { id: 'spots', label: 'Manchas' },
    { id: 'bolt', label: 'Rayo' },
    { id: 'plaid', label: 'Cuadros' },
    { id: 'hearts', label: 'Corazones' },
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

/**
 * Una nave al azar pero válida por construcción (el botón «Sorpréndeme» del editor y el banco de pruebas).
 * Con `level` solo usa piezas ya desbloqueadas; sin él, todas (los laboratorios).
 */
export function randomShip(seed: string, level = Number.POSITIVE_INFINITY): ShipConfig {
  const rand = mulberry32(hashString(seed))
  const ids = <T extends string>(list: { id: T }[], slot = '') => list.map((item) => item.id).filter((id) => shipPartLevel(slot, id) <= level)
  return {
    seed,
    hull: pick(rand, ids(SHIP_OPTIONS.hull, 'hull')),
    nose: pick(rand, ids(SHIP_OPTIONS.nose, 'nose')),
    cockpit: pick(rand, ids(SHIP_OPTIONS.cockpit, 'cockpit')),
    wings: pick(rand, ids(SHIP_OPTIONS.wings, 'wings')),
    tail: pick(rand, ids(SHIP_OPTIONS.tail, 'tail')),
    engine: {
      kind: pick(rand, ids(SHIP_OPTIONS.engine, 'engine')),
      count: pick(rand, [1, 2, 3] as const),
      flame: pick(rand, ids(SHIP_OPTIONS.flame, 'flame')),
    },
    top: pick(rand, ids(SHIP_OPTIONS.top, 'top')),
    belly: pick(rand, ids(SHIP_OPTIONS.belly, 'belly')),
    decal: pick(rand, ids(SHIP_OPTIONS.decal, 'decal')),
    windows: pick(rand, ids(SHIP_OPTIONS.windows, 'windows')),
    palette: pick(rand, PALETTE_PRESETS).palette,
  }
}
