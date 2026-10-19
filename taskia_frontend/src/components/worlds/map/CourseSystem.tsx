import { Trophy } from '@phosphor-icons/react'
import { courseSeed } from '../../../lib/seed'
import { MISSION_STATUS_LABEL, type StudyMission } from '../../../lib/worldsTypes'
import { MissionMoon } from './MissionMoon'
import { OrbitSystem, type OrbitItem } from './OrbitSystem'

type Props = {
  worldId: number
  courseId: number
  missions: StudyMission[]
  onStudy: (missionId: number) => void
  onChallenge: (missionId: number) => void
}

/** Sistema del curso: su planeta al centro y cada misión como una luna cuya fase cuenta el avance. */
export function CourseSystem({ worldId, courseId, missions, onStudy, onChallenge }: Props) {
  // Lo que se está estudiando, adentro y más cerca del planeta; lo dominado, afuera.
  const rank = (status: string) => (status === 'studying' ? 0 : status === 'mastered' ? 2 : 1)
  const ordered = [...missions].sort((a, b) => rank(a.status) - rank(b.status))

  const items: OrbitItem[] = ordered.map((mission) => ({
    key: mission.id,
    label: mission.title,
    sub: MISSION_STATUS_LABEL[mission.status] ?? mission.status,
    state: mission.status,
    onClick: () => onStudy(mission.id),
    art: <MissionMoon seed={mission.id * 31 + 7} status={mission.status} />,
    extra: (
      <button
        type="button"
        className="moon-trophy"
        aria-label={`Desafío: ${mission.title}`}
        title="Desafío del tema"
        onClick={() => onChallenge(mission.id)}
      >
        <Trophy size={16} weight="fill" />
      </button>
    ),
  }))

  return (
    <OrbitSystem
      centerSeed={courseSeed(worldId, courseId)}
      items={items}
      complete={missions.length > 0 && missions.every((mission) => mission.status === 'mastered')}
      emptyHint="Este curso aún no tiene temas. Crea una misión y aparecerá aquí."
    />
  )
}
