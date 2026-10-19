import type { StudyWorldCourse } from './worldsTypes'

export interface Progress {
  total: number
  mastered: number
}

/** Misiones dominadas y totales de un conjunto de cursos de un mundo. */
export function sumProgress(courses: StudyWorldCourse[]): Progress {
  return courses.reduce<Progress>(
    (acc, course) => ({
      total: acc.total + (course.mission_count ?? 0),
      mastered: acc.mastered + (course.mastered_count ?? 0),
    }),
    { total: 0, mastered: 0 },
  )
}

export function progressLabel({ total, mastered }: Progress) {
  if (total === 0) return 'Sin temas todavía'
  if (mastered >= total) return '¡Todo dominado!'
  return `${mastered} de ${total} ${total === 1 ? 'tema' : 'temas'}`
}

export function progressFraction({ total, mastered }: Progress) {
  return total === 0 ? 0 : Math.min(1, mastered / total)
}

/** Avance de un mundo más los cursos que lo orbitan (para dibujar su sistema en la lista). */
export interface WorldStats extends Progress {
  courseIds: number[]
}

export function worldStats(courses: StudyWorldCourse[]): WorldStats {
  return { ...sumProgress(courses), courseIds: courses.map((course) => course.course_id) }
}
