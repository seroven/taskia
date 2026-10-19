import { Plus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { progressFraction, progressLabel, type WorldStats } from '../../../lib/worldProgress'
import type { StudyWorld } from '../../../lib/worldsTypes'
import { MiniSystem } from './MiniSystem'

type Props = {
  worlds: StudyWorld[]
  progress: Record<number, WorldStats | undefined>
  onOpen: (worldId: number) => void
  onCreate: () => void
}

/** Mapa estelar: cada mundo es un sistema solar en miniatura (su sol y un planeta por curso), escalonado como en el hub. */
export function WorldsMap({ worlds, progress, onOpen, onCreate }: Props) {
  return (
    <div className="map-worlds">
      {worlds.map((world, index) => {
        const stats = progress[world.id]
        const fraction = stats ? progressFraction(stats) : 0
        return (
          <motion.button
            key={world.id}
            type="button"
            className="map-world scene-host"
            style={{ ['--off' as string]: index % 3 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onOpen(world.id)}
          >
            <MiniSystem worldId={world.id} courseIds={stats?.courseIds ?? []} size={280} />
            <span className="map-world-name">{world.title}</span>
            <span className="map-world-meta">{stats ? progressLabel(stats) : 'Cargando…'}</span>
            <span className="map-world-bar" aria-hidden>
              <i style={{ width: `${Math.round(fraction * 100)}%` }} />
            </span>
          </motion.button>
        )
      })}

      <motion.button
        type="button"
        className="map-world map-world--new scene-host"
        style={{ ['--off' as string]: worlds.length % 3 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: Math.min(worlds.length * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
        onClick={onCreate}
      >
        <span className="map-world-slot" aria-hidden>
          <Plus size={34} weight="bold" />
          <span className="map-world-slot-label">Nuevo mundo</span>
        </span>
        <span className="map-world-name">Descubrir mundos</span>
        <span className="map-world-meta">Crea uno nuevo</span>
      </motion.button>
    </div>
  )
}
