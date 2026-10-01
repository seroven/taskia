import type { PublicUser } from '../types'

export interface XpSnapshot {
  level: number
  xp_total: number
  xp_into_level: number
  xp_to_next: number
  awarded?: boolean
  xp_gained?: number
}

export function progressPct(user: Pick<PublicUser, 'xp_into_level'> | null | undefined) {
  const into = user?.xp_into_level ?? 0
  return Math.min(100, Math.max(0, Math.round((into / 1000) * 100)))
}

/** Aplica progreso del servidor al usuario en memoria y arma copy de toast. */
export function mergeXpIntoUser(
  user: PublicUser | null,
  xp: XpSnapshot | null | undefined,
): PublicUser | null {
  if (!user || !xp) return user
  return {
    ...user,
    level: xp.level,
    xp_total: xp.xp_total,
    xp_into_level: xp.xp_into_level,
    xp_to_next: xp.xp_to_next,
  }
}

export function xpToastCopy(xpGained: number) {
  if (xpGained <= 0) return null
  return {
    title: `+${xpGained} XP`,
    subtitle: '¡Sigue explorando!',
  }
}
