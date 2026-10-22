import { AURA_LOOK, type GlKind } from './auraGl'

/**
 * Auras de la nave: un resplandor detrás de ella que la tripulación desbloquea con su nivel, de la más sencilla a la
 * más vistosa. Las dibuja `auraGl.ts` con shaders. Debe ser igual a `AURAS` de
 * `taskia_backend/src/modules/troops/lib/auras.ts`.
 */
export const AURAS: readonly { id: GlKind; level: number }[] = [
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
]

/** Nivel de tripulación que pide un aura. */
export const auraLevel = (id: GlKind): number => AURAS.find((aura) => aura.id === id)?.level ?? 1

export const auraLabel = (id: GlKind): string => AURA_LOOK[id].label
