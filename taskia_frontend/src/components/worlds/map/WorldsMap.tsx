import { Plus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { Progress } from '../../../lib/worldProgress'
import { progressFraction, progressLabel } from '../../../lib/worldProgress'
import type { StudyWorld } from '../../../lib/worldsTypes'
import { worldSeed } from '../../../lib/seed'
import { LinePlanet } from './LinePlanet'

type Props = {
  worlds: StudyWorld[]
  progress: Record<number, Progress | undefined>
  onOpen: (worldId: number) => void
  onCreate: () => void
}

/** Mapa estelar: cada mundo es un planeta de línea, escalonado como en el hub. */
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
            <LinePlanet seed={worldSeed(world.id)} size={220} />
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
          <Plus size={36} weight="bold" />
        </span>
        <span className="map-world-name">Descubrir un mundo</span>
        <span className="map-world-meta">Crea uno nuevo</span>
      </motion.button>
    </div>
  )
}
