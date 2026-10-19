import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Plus, Trophy } from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { ChallengeSetupModal } from '../../components/worlds/ChallengeSetupModal'
import { ChallengeHistoryList } from '../../components/worlds/ChallengeHistoryList'
import { LinePlanet } from '../../components/worlds/map/LinePlanet'
import { WorldSystem } from '../../components/worlds/map/WorldSystem'
import { WorldsEmptyState } from '../../components/worlds/WorldsEmptyState'
import { PageHeader } from '../../components/PageHeader'
import { SelectField } from '../../components/ui/SelectField'
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
  const [addCourseId, setAddCourseId] = useState('')
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

  async function onAddCourse() {
    if (!addCourseId) return
    try {
      const first = courses.length === 0
      const next = await api.addWorldCourse(worldId, Number(addCourseId))
      setCourses(next)
      setAddCourseId('')
      if (first) {
        setArriving(Number(addCourseId))
        window.setTimeout(() => setArriving(null), 4200)
      }
      showToast({
        tone: 'success',
        title: first ? 'Tu mundo cobra vida' : 'Curso agregado',
        subtitle: 'Ya puedes crear misiones en él',
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo agregar',
        subtitle: errorMessage(err),
      })
    }
  }

  return (
    <div className="worlds-shell">
      <PageHeader
        backLabel="Mundos"
        onBack={onBack}
        art={<LinePlanet seed={worldSeed(worldId)} size={56} animate={false} />}
        title={world?.title ?? 'Mundo'}
        lead={
          <>
            {world?.description ? world.description : 'Toca una luna para entrar a su curso.'}
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
        <div className="worlds-two-col">
          <section className="worlds-panel worlds-panel--system">
            <p className="worlds-block-label">Cursos</p>
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
              />
            ) : null}

            {available.length > 0 && (
              <div className="worlds-add-course">
                <SelectField
                  label="Agregar curso"
                  value={addCourseId}
                  onChange={setAddCourseId}
                  options={available.map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  }))}
                  placeholder="Elige un curso"
                />
                <button
                  type="button"
                  className="primary"
                  disabled={!addCourseId}
                  onClick={() => void onAddCourse()}
                >
                  <Plus size={18} weight="bold" />
                  Agregar
                </button>
              </div>
            )}
          </section>

          <ChallengeHistoryList
            className="worlds-panel worlds-challenges-panel"
            items={challenges}
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
                Desafío del mundo
              </button>
            }
          />
        </div>
      </div>

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
