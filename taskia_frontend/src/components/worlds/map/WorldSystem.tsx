import { Plus } from '@phosphor-icons/react'
import { progressFraction } from '../../../lib/worldProgress'
import { courseSeed, worldSeed } from '../../../lib/seed'
import { courseProgress, type StudyWorldCourse } from '../../../lib/worldsTypes'
import { LinePlanet } from './LinePlanet'
import { OrbitSystem, type OrbitItem } from './OrbitSystem'

type Props = {
  worldId: number
  courses: StudyWorldCourse[]
  /** Curso recién agregado: llega a su órbita con una animación. */
  arrivingCourseId?: number | null
  onOpenCourse: (courseId: number) => void
  /** Si se da, el mundo vacío muestra un botón para agregar el primer curso. */
  onAddCourse?: () => void
}

function ProgressRing({ fraction, done }: { fraction: number; done: boolean }) {
  const circumference = 2 * Math.PI * 47
  return (
    <svg className={`moon-ring${done ? ' is-done' : ''}`} viewBox="0 0 100 100" aria-hidden>
      <circle className="moon-ring-track" cx="50" cy="50" r="47" />
      <circle
        className="moon-ring-fill"
        cx="50"
        cy="50"
        r="47"
        strokeDasharray={`${(circumference * fraction).toFixed(1)} ${circumference.toFixed(1)}`}
        transform="rotate(-90 50 50)"
      />
    </svg>
  )
}

/** Sistema del mundo: el planeta al centro y cada curso como una luna con su anillo de avance. */
export function WorldSystem({ worldId, courses, arrivingCourseId = null, onOpenCourse, onAddCourse }: Props) {
  const items: OrbitItem[] = courses.map((course) => {
    const progress = courseProgress(course)
    const stats = { total: course.mission_count ?? 0, mastered: course.mastered_count ?? 0 }
    const done = progress === 'mastered'
    return {
      key: course.course_id,
      label: course.course_name,
      sub: stats.total === 0 ? 'Sin temas' : done ? '¡Listo!' : `${stats.mastered} de ${stats.total}`,
      state: progress,
      arriving: course.course_id === arrivingCourseId,
      onClick: () => onOpenCourse(course.course_id),
      art: (
        <>
          <LinePlanet seed={courseSeed(worldId, course.course_id)} size="170%" animate={false} />
          <ProgressRing fraction={progressFraction(stats)} done={done} />
        </>
      ),
    }
  })

  const total = courses.reduce((sum, course) => sum + (course.mission_count ?? 0), 0)
  const mastered = courses.reduce((sum, course) => sum + (course.mastered_count ?? 0), 0)

  return (
    <OrbitSystem
      centerSeed={worldSeed(worldId)}
      centerKind="sun"
      items={items}
      complete={total > 0 && mastered >= total}
      emptyHint={
        <>
          <p style={{ margin: 0 }}>Tu sol está solo. Agrega un planeta y empezará a girar.</p>
          {onAddCourse ? (
            <button type="button" className="primary" onClick={onAddCourse}>
              <Plus size={18} weight="bold" />
              Agregar planeta
            </button>
          ) : null}
        </>
      }
    />
  )
}
