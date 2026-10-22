import { AppError } from '../../../shared/errors/app-error.js'

/**
 * Auras de la nave: un resplandor detrás de ella (la dibuja el frontend con shaders, ver
 * `taskia_frontend/src/lib/ship/auraGl.ts`). Se desbloquean con el nivel de la tripulación, de la más sencilla a la
 * más vistosa. Debe ser igual a `AURAS` de `taskia_frontend/src/lib/ship/auras.ts`.
 */
export const AURAS = [
  { id: 'halo', level: 1 },
  { id: 'fireflies', level: 3 },
  { id: 'sparks', level: 5 },
  { id: 'ring', level: 7 },
  { id: 'nebula', level: 9 },
  { id: 'comets', level: 11 },
  { id: 'fire', level: 13 },
  { id: 'aurora', level: 15 },
  { id: 'galaxy', level: 17 },
  { id: 'plasma', level: 19 },
  { id: 'portal', level: 21 },
  { id: 'storm', level: 23 },
  { id: 'blackhole', level: 25 },
  { id: 'nova', level: 27 },
] as const

export type AuraId = (typeof AURAS)[number]['id']

export const AURA_IDS: readonly string[] = AURAS.map((aura) => aura.id)

/** Lo que guarda la base, listo para devolver: un aura conocida o `null`. */
export function resolveAura(raw: unknown): AuraId | null {
  return typeof raw === 'string' && AURA_IDS.includes(raw) ? (raw as AuraId) : null
}

export const auraLevel = (id: AuraId) => AURAS.find((aura) => aura.id === id)!.level

/**
 * Valida el aura que pide la tripulación. `null` (o vacío) es «sin aura». Una aura que aún pide más nivel se rechaza,
 * salvo que la tripulación ya la tuviera (nunca se quita lo que ya se tenía).
 */
export function checkAura(raw: unknown, level: number, current: unknown): AuraId | null {
  if (raw === null || raw === '') return null
  const id = resolveAura(raw)
  if (!id) throw new AppError('Esa aura no existe')
  if (auraLevel(id) > level && id !== resolveAura(current)) {
    throw new AppError(`Esa aura se desbloquea en el nivel ${auraLevel(id)} de la tripulación`)
  }
  return id
}
