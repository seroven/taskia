import { useAuth } from '../auth'
import { LevelRocket } from './LevelRocket'

/** Nivel del explorador en el header. */
export function ExplorerXpBar() {
  const { user } = useAuth()
  if (!user || user.role !== 'user') return null

  return (
    <LevelRocket
      level={user.level ?? 1}
      into={user.xp_into_level ?? 0}
      toNext={user.xp_to_next}
    />
  )
}
