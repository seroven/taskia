export type MoonPhase = 'new' | 'crescent' | 'quarter' | 'gibbous' | 'full'

/** La fase que le toca a una misión: nueva, creciente, cuarto, gibosa o llena. */
export function moonPhase(status: string, phase?: string | null): MoonPhase {
  if (status === 'mastered') return 'full'
  if (status !== 'studying') return 'new'
  if (phase === 'understanding') return 'crescent'
  if (phase === 'reviewing') return 'gibbous'
  return 'quarter'
}
