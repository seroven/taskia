import { Plus, Trophy } from '@phosphor-icons/react'
import { courseSeed } from '../../../lib/seed'
import { MISSION_STATUS_LABEL, type StudyMission } from '../../../lib/worldsTypes'
import { phaseLabel, type TutorPhase } from '../../../lib/studyProtocol'
import { MissionMoon } from './MissionMoon'
import { OrbitSystem, type OrbitItem } from './OrbitSystem'

type Props = {
  worldId: number
  courseId: number
  missions: StudyMission[]
  onStudy: (missionId: number) => void
  onChallenge: (missionId: number) => void
  /** Si se da, el curso sin temas muestra un botón para crear el primero. */
  onCreateMission?: () => void
}

/** Sistema del curso: su planeta al centro y cada misión como una luna cuya fase cuenta el avance. */
export function CourseSystem({ worldId, courseId, missions, onStudy, onChallenge, onCreateMission }: Props) {
  // Lo que se está estudiando, adentro y más cerca del planeta; lo dominado, afuera.
  const rank = (status: string) => (status === 'studying' ? 0 : status === 'mastered' ? 2 : 1)
  const ordered = [...missions].sort((a, b) => rank(a.status) - rank(b.status))

  const items: OrbitItem[] = ordered.map((mission) => ({
    key: mission.id,
    label: mission.title,
    sub:
      mission.status === 'studying' && mission.tutor_phase
        ? phaseLabel(mission.tutor_phase as TutorPhase)
        : (MISSION_STATUS_LABEL[mission.status] ?? mission.status),
    state: mission.status,
    onClick: () => onStudy(mission.id),
    art: <MissionMoon seed={mission.id * 31 + 7} status={mission.status} phase={mission.tutor_phase} />,
    extra: (
      <button
        type="button"
        className="moon-trophy"
        aria-label={`Desafío: ${mission.title}`}
        title="Desafío del tema"
        onClick={() => onChallenge(mission.id)}
      >
        <Trophy size={21} weight="fill" />
      </button>
    ),
  }))

  return (
    <OrbitSystem
      centerSeed={courseSeed(worldId, courseId)}
      items={items}
      complete={missions.length > 0 && missions.every((mission) => mission.status === 'mastered')}
      emptyHint={
        <>
          <p style={{ margin: 0 }}>Este planeta aún no tiene lunas. Agrega una y aparecerá aquí.</p>
          {onCreateMission ? (
            <button type="button" className="primary" onClick={onCreateMission}>
              <Plus size={18} weight="bold" />
              Agregar luna
            </button>
          ) : null}
        </>
      }
    />
  )
}
