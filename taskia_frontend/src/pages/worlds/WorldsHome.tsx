import { useEffect, useState } from 'react'
import { GlobeHemisphereWest } from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { CreateWorldModal } from '../../components/worlds/CreateWorldModal'
import { WorldsMap } from '../../components/worlds/map/WorldsMap'
import { PageHeader } from '../../components/PageHeader'
import { errorMessage } from '../../lib/errors'
import { worldStats, type WorldStats } from '../../lib/worldProgress'
import type { StudyWorld } from '../../lib/worldsTypes'
import { useToast } from '../../toast'

interface Props {
  onBack: () => void
  onOpenWorld: (worldId: number) => void
}

export function WorldsHome({ onBack, onOpenWorld }: Props) {
  const { showToast } = useToast()
  const [worlds, setWorlds] = useState<StudyWorld[]>([])
  const [progress, setProgress] = useState<Record<number, WorldStats | undefined>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  async function refresh() {
    const list = await api.listWorlds()
    setWorlds(list)
    // El avance de cada mundo sale de sus cursos; llega después, sin frenar el mapa.
    void Promise.all(
      list.map(async (world) => {
        try {
          const courses = await api.listWorldCourses(world.id)
          setProgress((prev) => ({ ...prev, [world.id]: worldStats(courses) }))
        } catch {
          setProgress((prev) => ({ ...prev, [world.id]: { total: 0, mastered: 0, courseIds: [] } }))
        }
      }),
    )
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await refresh()
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="worlds-shell">
      <PageHeader
        backLabel="Inicio"
        onBack={onBack}
        icon={GlobeHemisphereWest}
        title="Mundos"
        lead={
          worlds.length === 0 && !loading
            ? 'Aquí viven tus cursos y misiones. Empieza con tu primer mundo.'
            : 'Elige un mundo para explorar… o descubre uno nuevo.'
        }
      />

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-stage">
        {loading ? (
          <AppLoader message="Cargando mundos…" variant="section" />
        ) : (
          <WorldsMap
            worlds={worlds}
            progress={progress}
            onOpen={onOpenWorld}
            onCreate={() => setModalOpen(true)}
          />
        )}
      </div>

      <CreateWorldModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={async (title, description) => {
          const world = await api.createWorld(title, description)
          await refresh()
          showToast({
            tone: 'success',
            title: 'Mundo creado',
            subtitle: world.title,
          })
          onOpenWorld(world.id)
        }}
      />
    </div>
  )
}
