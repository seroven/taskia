import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Plus, Trophy } from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { AddCourseModal } from '../../components/worlds/AddCourseModal'
import { ChallengeSetupModal } from '../../components/worlds/ChallengeSetupModal'
import { ChallengeHistoryList } from '../../components/worlds/ChallengeHistoryList'
import { LineSun } from '../../components/worlds/map/LineSun'
import { WorldSystem } from '../../components/worlds/map/WorldSystem'
import { WorldsEmptyState } from '../../components/worlds/WorldsEmptyState'
import { PageHeader } from '../../components/PageHeader'
import { errorMessage } from '../../lib/errors'
import { worldSeed } from '../../lib/seed'
import { progressFraction, progressLabel, sumProgress } from '../../lib/worldProgress'
import {
  type StudyChallenge,
  type StudyWorld,
  type StudyWorldCourse,
} from '../../lib/worldsTypes'
import type { Course } from '../../types'
import { useToast } from '../../toast'

interface Props {
  worldId: number
  onBack: () => void
  onOpenCourse: (courseId: number) => void
  onOpenChallenge: (challengeId: number) => void
}

export function WorldDetail({
  worldId,
  onBack,
  onOpenCourse,
  onOpenChallenge,
}: Props) {
  const { showToast } = useToast()
  const [world, setWorld] = useState<StudyWorld | null>(null)
  const [courses, setCourses] = useState<StudyWorldCourse[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [challenges, setChallenges] = useState<StudyChallenge[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [challengeOpen, setChallengeOpen] = useState(false)
  /** El primer curso de un mundo llega con animación; el id se limpia solo. */
  const [arriving, setArriving] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const [worlds, worldCourses, catalog, history] = await Promise.all([
      api.listWorlds(),
      api.listWorldCourses(worldId),
      api.listCourses(),
      api.listChallenges(worldId),
    ])
    const found = worlds.find((w) => w.id === worldId) ?? null
    setWorld(found)
    setCourses(worldCourses)
    setAllCourses(catalog)
    setChallenges(history)
  }, [worldId])

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
  }, [refresh])

  const available = allCourses.filter(
    (c) => !courses.some((wc) => wc.course_id === c.id),
  )

  /** Agrega un curso al mundo. El modal muestra el error si algo falla. */
  async function addCourse(courseId: number) {
    const first = courses.length === 0
    const next = await api.addWorldCourse(worldId, courseId)
    setCourses(next)
    if (first) {
      setArriving(courseId)
      window.setTimeout(() => setArriving(null), 4200)
    }
    showToast({
      tone: 'success',
      title: first ? 'Tu mundo cobra vida' : 'Planeta agregado',
      subtitle: 'Ya puedes agregar lunas a su curso',
    })
  }

  return (
    <div className="worlds-shell">
      <PageHeader
        backLabel="Mundos"
        onBack={onBack}
        art={<LineSun seed={worldSeed(worldId)} size={60} animate={false} />}
        title={world?.title ?? 'Mundo'}
        actions={
          !loading && available.length > 0 ? (
            <button type="button" className="primary" onClick={() => setAddOpen(true)}>
              <Plus size={18} weight="bold" />
              Agregar planeta
            </button>
          ) : null
        }
        lead={
          <>
            {world?.description ? world.description : 'Toca un planeta para entrar a su curso.'}
            {!loading && courses.length > 0 ? (
              <span className="worlds-lead-progress">
                {progressLabel(sumProgress(courses))}
                <span className="map-world-bar" aria-hidden>
                  <i style={{ width: `${Math.round(progressFraction(sumProgress(courses)) * 100)}%` }} />
                </span>
              </span>
            ) : null}
          </>
        }
      />

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-stage">
        <div className="worlds-two-col worlds-two-col--system">
          <section className="worlds-panel worlds-panel--system">
            {loading && <AppLoader message="Cargando cursos…" variant="section" />}
            {!loading && allCourses.length === 0 && (
              <WorldsEmptyState
                compact
                icon={BookOpen}
                title="Todavía no tienes cursos"
                description="Pídele a un adulto que te asigne cursos. Después los agregas a este mundo."
              />
            )}
            {!loading && allCourses.length > 0 ? (
              <WorldSystem
                worldId={worldId}
                courses={courses}
                arrivingCourseId={arriving}
                onOpenCourse={onOpenCourse}
                onAddCourse={() => setAddOpen(true)}
              />
            ) : null}

          </section>

          <ChallengeHistoryList
            className="worlds-panel worlds-challenges-panel"
            items={challenges}
            groupBy="course"
            worldId={worldId}
            loading={loading}
            onOpen={onOpenChallenge}
            title="Desafíos"
            emptyText="Cuando completes un desafío, aparece aquí."
            action={
              <button
                type="button"
                className="primary"
                onClick={() => setChallengeOpen(true)}
                disabled={loading || courses.length === 0}
              >
                <Trophy size={18} weight="fill" />
                Desafío de mundos
              </button>
            }
          />
        </div>
      </div>

      <AddCourseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        options={available.map((course) => ({ id: course.id, name: course.name }))}
        onAdd={addCourse}
      />
      <ChallengeSetupModal
        open={challengeOpen}
        worldId={worldId}
        scope="world"
        title={world?.title}
        onClose={() => setChallengeOpen(false)}
        onStarted={onOpenChallenge}
      />
    </div>
  )
}
