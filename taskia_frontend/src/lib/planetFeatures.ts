import { getPlanetStyle, type PlanetParams } from './planetStyles'

export type PlanetKind = 'terrestrial' | 'gas' | 'ice' | 'lava' | 'desert' | 'cloud'

export interface PlanetFeatures {
  kind: PlanetKind
  seed: number
  colors: [string, string, string, string]
  scale: number
  coverage: number
  warp: number
  gloss: number
  cloud: number
  cloudSpeed: number
  atmosphere: string
  rings: 0 | 1 | 2
  ringColor: string
  ringTilt: number
}

const KINDS: PlanetKind[] = ['terrestrial', 'gas', 'ice', 'lava', 'desert', 'cloud']

export function planetKindIndex(kind: PlanetKind) {
  return KINDS.indexOf(kind)
}

const STYLE_KIND: Record<string, PlanetKind> = {
  rocky_blue: 'terrestrial',
  gas_teal: 'gas',
  lava_amber: 'lava',
  neon_violet: 'gas',
  ice_cyan: 'ice',
  forest_green: 'terrestrial',
  rose_dust: 'cloud',
  shadow_slate: 'desert',
}

/** Paletas de vivas a un punto medio. El detalle lo pone la semilla. */
const STYLE_PALETTES: Record<string, [string, string, string, string][]> = {
  rocky_blue: [
    ['#3b82f6', '#34d399', '#fde68a', '#f8fafc'],
    ['#60a5fa', '#4ade80', '#fcd34d', '#eff6ff'],
  ],
  gas_teal: [
    ['#2dd4bf', '#5eead4', '#fde68a', '#f0fdfa'],
    ['#14b8a6', '#99f6e4', '#fb7185', '#ecfeff'],
  ],
  lava_amber: [
    ['#f97316', '#fbbf24', '#fb7185', '#fff7ed'],
    ['#ea580c', '#fde68a', '#f43f5e', '#ffedd5'],
  ],
  neon_violet: [
    ['#8b5cf6', '#c4b5fd', '#5eead4', '#f5f3ff'],
    ['#a78bfa', '#f0abfc', '#67e8f9', '#faf5ff'],
  ],
  ice_cyan: [
    ['#7dd3fc', '#e0f2fe', '#ffffff', '#f0f9ff'],
    ['#67e8f9', '#bae6fd', '#fef9c3', '#ecfeff'],
  ],
  forest_green: [
    ['#22c55e', '#4ade80', '#86efac', '#f0fdf4'],
    ['#16a34a', '#a3e635', '#fde68a', '#f7fee7'],
  ],
  rose_dust: [
    ['#fb7185', '#fda4af', '#fde68a', '#fff1f2'],
    ['#f472b6', '#fecdd3', '#fdba74', '#fdf2f8'],
  ],
  shadow_slate: [
    ['#94a3b8', '#cbd5e1', '#fde68a', '#f8fafc'],
    ['#a8b4c4', '#e2e8f0', '#f9a8d4', '#f8fafc'],
  ],
}

function hash(n: number) {
  let x = n | 0
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d)
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b)
  return (x ^ (x >>> 16)) >>> 0
}

function unit(seed: number, salt: number) {
  return (hash(seed + salt * 997) % 10000) / 10000
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
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

/** Sube un color demasiado oscuro hacia un punto medio. */
export function liftPlanetColor(hex: string) {
  const [r, g, b] = hexToRgb(hex)
  const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (y >= 0.28) return hex
  return mixHex(hex, '#f4f7fb', 0.42)
}

function asKind(raw: unknown): PlanetKind | null {
  return typeof raw === 'string' && KINDS.includes(raw as PlanetKind)
    ? (raw as PlanetKind)
    : null
}

function asRings(raw: unknown): 0 | 1 | 2 | null {
  const n = Number(raw)
  if (n === 0 || n === 1 || n === 2) return n
  return null
}

export function featuresFromSeed(styleId: string | null | undefined, seed: number): PlanetFeatures {
  const style = getPlanetStyle(styleId)
  const kind = STYLE_KIND[style.id] ?? 'terrestrial'
  const palettes = STYLE_PALETTES[style.id] ?? STYLE_PALETTES.rocky_blue!
  const colors = palettes[Math.floor(unit(seed, 1) * palettes.length)]!
  const u = (salt: number) => unit(seed, salt)
  const ringsRoll = u(7)
  const rings: 0 | 1 | 2 = ringsRoll < 0.18 ? 2 : ringsRoll < 0.42 ? 1 : 0
  const glossBase =
    kind === 'ice' ? 0.72 : kind === 'gas' || kind === 'cloud' ? 0.18 : kind === 'lava' ? 0.4 : 0.28
  return {
    kind,
    seed: seed >>> 0,
    colors,
    scale: 1.5 + u(2) * 2.6,
    coverage: 0.36 + u(3) * 0.28,
    warp: 0.2 + u(4) * 1.1,
    gloss: Math.min(1, glossBase + u(5) * 0.2),
    cloud: kind === 'cloud' ? 0.45 + u(6) * 0.35 : 0.12 + u(6) * 0.4,
    cloudSpeed: 0.04 + u(8) * 0.1,
    atmosphere: mixHex(colors[0], '#ffffff', 0.45),
    rings,
    ringColor: mixHex(colors[2], '#ffffff', 0.35),
    ringTilt: 0.35 + u(9) * 0.85,
  }
}

/** Semilla fija, salvo que el Capitán haya guardado `planet_params`. */
export function resolvePlanetFeatures(
  styleId: string | null | undefined,
  seed: number | null | undefined,
  params: unknown,
): PlanetFeatures {
  const safeSeed = Number.isFinite(Number(seed)) ? Number(seed) : 1
  const look = featuresFromSeed(styleId, safeSeed || 1)
  if (!params || typeof params !== 'object') return look
  const o = params as PlanetParams & { kind?: unknown; rings?: unknown }
  const kind = asKind(o.kind)
  const rings = asRings(o.rings)
  const color = typeof o.color === 'string' ? liftPlanetColor(o.color) : look.colors[0]
  const emissive = typeof o.emissive === 'string' ? liftPlanetColor(o.emissive) : look.colors[2]
  const atmosphere =
    typeof o.atmosphere === 'string'
      ? liftPlanetColor(o.atmosphere)
      : o.atmosphere === null
        ? look.atmosphere
        : look.atmosphere
  return {
    ...look,
    kind: kind ?? look.kind,
    rings: rings ?? look.rings,
    colors: [color, mixHex(color, atmosphere, 0.4), emissive, mixHex(atmosphere, '#ffffff', 0.35)],
    atmosphere,
    gloss:
      typeof o.roughness === 'number'
        ? Math.min(1, Math.max(0.05, 1 - o.roughness))
        : look.gloss,
    ringColor: mixHex(emissive, '#ffffff', 0.4),
  }
}

export function planetOrbBackground(features: PlanetFeatures) {
  const [base, detail, accent] = features.colors
  return [
    `radial-gradient(circle at 32% 32%, ${detail} 0 26%, transparent 28%)`,
    `radial-gradient(circle at 66% 62%, ${accent} 0 16%, transparent 18%)`,
    `radial-gradient(circle at 50% 48%, ${base} 0 78%, #172033 80% 100%)`,
  ].join(', ')
}
