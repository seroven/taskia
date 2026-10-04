import { AppError } from '../utils/helpers.js'

export interface PlanetParams {
  color: string
  emissive: string
  roughness: number
  metalness: number
  atmosphere: string | null
  label: string
}

const HEX = /^#([0-9a-fA-F]{6})$/

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

function asHex(raw: unknown, fallback: string): string {
  const s = String(raw ?? '').trim()
  if (!HEX.test(s)) return fallback
  return s.toLowerCase()
}

export function normalizePlanetParams(raw: unknown): PlanetParams {
  if (!raw || typeof raw !== 'object') {
    throw new AppError('Parámetros de planeta no válidos')
  }
  const o = raw as Record<string, unknown>
  const label = String(o.label ?? 'Planeta custom')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24)
  if (!label) throw new AppError('El planeta necesita un nombre corto')

  const atmosphereRaw = o.atmosphere
  const atmosphere =
    atmosphereRaw === null || atmosphereRaw === undefined || atmosphereRaw === ''
      ? null
      : asHex(atmosphereRaw, '#60a5fa')

  return {
    color: asHex(o.color, '#3b82f6'),
    emissive: asHex(o.emissive, '#1e3a8a'),
    roughness: clamp01(Number(o.roughness)),
    metalness: clamp01(Number(o.metalness)),
    atmosphere,
    label,
  }
}
