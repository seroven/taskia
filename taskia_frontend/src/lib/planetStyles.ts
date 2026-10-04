export interface PlanetStyle {
  id: string
  label: string
  color: string
  emissive: string
  roughness: number
  metalness: number
  atmosphere?: string
}

export const PLANET_STYLES: PlanetStyle[] = [
  {
    id: 'rocky_blue',
    label: 'Rocoso azul',
    color: '#3b82f6',
    emissive: '#1e3a8a',
    roughness: 0.85,
    metalness: 0.15,
    atmosphere: '#60a5fa',
  },
  {
    id: 'gas_teal',
    label: 'Gaseoso teal',
    color: '#14b8a6',
    emissive: '#115e59',
    roughness: 0.45,
    metalness: 0.2,
    atmosphere: '#5eead4',
  },
  {
    id: 'lava_amber',
    label: 'Lava ámbar',
    color: '#f59e0b',
    emissive: '#b45309',
    roughness: 0.55,
    metalness: 0.35,
    atmosphere: '#fbbf24',
  },
  {
    id: 'neon_violet',
    label: 'Neón violeta',
    color: '#8b5cf6',
    emissive: '#5b21b6',
    roughness: 0.3,
    metalness: 0.55,
    atmosphere: '#c4b5fd',
  },
  {
    id: 'ice_cyan',
    label: 'Hielo cian',
    color: '#22d3ee',
    emissive: '#0e7490',
    roughness: 0.25,
    metalness: 0.4,
    atmosphere: '#a5f3fc',
  },
  {
    id: 'forest_green',
    label: 'Bosque',
    color: '#22c55e',
    emissive: '#166534',
    roughness: 0.9,
    metalness: 0.05,
    atmosphere: '#86efac',
  },
  {
    id: 'rose_dust',
    label: 'Polvo rosa',
    color: '#f43f5e',
    emissive: '#9f1239',
    roughness: 0.7,
    metalness: 0.2,
    atmosphere: '#fda4af',
  },
  {
    id: 'shadow_slate',
    label: 'Pizarra',
    color: '#64748b',
    emissive: '#1e293b',
    roughness: 0.95,
    metalness: 0.25,
  },
]

export function getPlanetStyle(id: string | null | undefined): PlanetStyle {
  return PLANET_STYLES.find((s) => s.id === id) ?? PLANET_STYLES[0]!
}

export interface PlanetParams {
  color: string
  emissive: string
  roughness: number
  metalness: number
  atmosphere?: string | null
  label?: string
}

const HEX = /^#([0-9a-fA-F]{6})$/

function asHex(raw: unknown, fallback: string): string {
  const s = String(raw ?? '').trim()
  return HEX.test(s) ? s.toLowerCase() : fallback
}

function clamp01(n: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback
  return Math.min(1, Math.max(0, n))
}

/** Catálogo + overrides IA (`planet_params`). */
export function resolvePlanetLook(
  styleId: string | null | undefined,
  params: unknown,
): PlanetStyle {
  const base = getPlanetStyle(styleId)
  if (!params || typeof params !== 'object') return base
  const o = params as Record<string, unknown>
  const label =
    typeof o.label === 'string' && o.label.trim()
      ? o.label.trim().slice(0, 24)
      : base.label
  const atmosphere =
    o.atmosphere === null || o.atmosphere === ''
      ? undefined
      : o.atmosphere === undefined
        ? base.atmosphere
        : asHex(o.atmosphere, base.atmosphere ?? base.color)
  return {
    id: base.id,
    label,
    color: asHex(o.color, base.color),
    emissive: asHex(o.emissive, base.emissive),
    roughness: clamp01(Number(o.roughness), base.roughness),
    metalness: clamp01(Number(o.metalness), base.metalness),
    atmosphere,
  }
}
