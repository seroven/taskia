import { useCallback, useEffect, useState } from 'react'
import {
  DownloadSimple,
  Plus,
  Trophy,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { ChallengeSetupModal } from '../../components/worlds/ChallengeSetupModal'
import { ChallengeHistoryList } from '../../components/worlds/ChallengeHistoryList'
import { CreateMissionModal } from '../../components/worlds/CreateMissionModal'
import { ImportMissionsModal } from '../../components/worlds/ImportMissionsModal'
import { CourseSystem } from '../../components/worlds/map/CourseSystem'
import { courseSeed } from '../../lib/seed'
import { PageHeader } from '../../components/PageHeader'
import { LinePlanet } from '../../components/worlds/map/LinePlanet'
import { errorMessage } from '../../lib/errors'
import {
  type StudyChallenge,
  type StudyMission,
  type StudyWorldCourse,
} from '../../lib/worldsTypes'
import { useToast } from '../../toast'

interface Props {
  worldId: number
  courseId: number
  onBack: () => void
  onStudyMission: (missionId: number) => void
  onOpenChallenge: (challengeId: number) => void
}

export function CourseDetail({
  worldId,
  courseId,
  onBack,
  onStudyMission,
  onOpenChallenge,
}: Props) {
  const { showToast } = useToast()
  const [courseName, setCourseName] = useState('Curso')
  const [missions, setMissions] = useState<StudyMission[]>([])
  const [challenges, setChallenges] = useState<StudyChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [missionChallengeId, setMissionChallengeId] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const [list, worldCourses, history] = await Promise.all([
      api.listMissions(worldId, courseId),
      api.listWorldCourses(worldId),
      api.listChallenges(worldId, courseId),
    ])
    setMissions(list)
    const course = worldCourses.find((c: StudyWorldCourse) => c.course_id === courseId)
    if (course) setCourseName(course.course_name)
    setChallenges(history)
  }, [worldId, courseId])

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

  return (
    <div className="worlds-shell">
      <PageHeader
        backLabel="Mundo"
        onBack={onBack}
        art={<LinePlanet seed={courseSeed(worldId, courseId)} size={56} animate={false} />}
        title={courseName}
        lead={
          missions.length > 0 && missions.every((m) => m.status === 'mastered')
            ? '¡Dominaste todo este curso!'
            : 'Toca una luna para estudiar.'
        }
        actions={
          <button type="button" className="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={18} weight="bold" />
            Agregar luna
          </button>
        }
      />

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-stage">
        <div className="worlds-two-col worlds-two-col--system">
          <section className="worlds-panel worlds-panel--system">
            <div className="worlds-panel-head">
              <p className="worlds-block-label">Lunas</p>
              <button
                type="button"
                className="ghost"
                title="Traer temas de otro mundo"
                onClick={() => setImportOpen(true)}
              >
                <DownloadSimple size={18} weight="bold" />
                Traer
              </button>
            </div>
            {loading && <AppLoader message="Cargando misiones…" variant="section" />}
            {!loading ? (
              <CourseSystem
                worldId={worldId}
                courseId={courseId}
                missions={missions}
                onCreateMission={() => setCreateOpen(true)}
                onStudy={onStudyMission}
                onChallenge={(missionId) => {
                  setMissionChallengeId(missionId)
                  setChallengeOpen(true)
                }}
              />
            ) : null}
          </section>

          <ChallengeHistoryList
            className="worlds-panel worlds-challenges-panel"
            items={challenges}
            loading={loading}
            onOpen={onOpenChallenge}
            title="Desafíos"
            emptyText="Cuando completes un desafío de este curso, aparece aquí."
            action={
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setMissionChallengeId(null)
                  setChallengeOpen(true)
                }}
                disabled={missions.length === 0}
              >
                <Trophy size={18} weight="fill" />
                Desafío del curso
              </button>
            }
          />
        </div>
      </div>

      <CreateMissionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          await api.createMission({
            world_id: worldId,
            course_id: courseId,
            ...input,
          })
          await refresh()
          showToast({
            tone: 'success',
            title: 'Misión creada',
            subtitle: input.title,
          })
        }}
      />
      <ImportMissionsModal
        open={importOpen}
        worldId={worldId}
        courseId={courseId}
        onClose={() => setImportOpen(false)}
        onImported={async () => {
          await refresh()
          showToast({
            tone: 'success',
            title: 'Misiones importadas',
            subtitle: 'Listas para estudiar en este mundo',
          })
        }}
      />
      <ChallengeSetupModal
        open={challengeOpen}
        worldId={worldId}
        scope={missionChallengeId != null ? 'mission' : 'course'}
        courseId={courseId}
        missionId={missionChallengeId}
        title={
          missionChallengeId != null
            ? missions.find((m) => m.id === missionChallengeId)?.title
            : courseName
        }
        onClose={() => {
          setChallengeOpen(false)
          setMissionChallengeId(null)
        }}
        onStarted={onOpenChallenge}
      />
    </div>
  )
}
