import { CourseSystem } from '../components/worlds/map/CourseSystem'
import { WorldSystem } from '../components/worlds/map/WorldSystem'
import { WorldsMap } from '../components/worlds/map/WorldsMap'
import type { StudyMission, StudyWorld, StudyWorldCourse } from '../lib/worldsTypes'

const NAMES = ['Matemática', 'Comunicación', 'Ciencia y Tecnología', 'Personal Social', 'Inglés', 'Arte y Cultura', 'Educación Física']

const worlds: StudyWorld[] = ['Examenes bimestrales', 'Ciencias del colegio', 'Verano', 'Preparación de admisión', 'Mi mundo'].map(
  (title, index) => ({ id: index + 1, user_id: 1, title, description: null, created_at: '', updated_at: '' }),
)

function courses(count: number): StudyWorldCourse[] {
  return Array.from({ length: count }, (_, index) => NAMES[index] ?? `Curso ${index + 1}`).map((name, index) => ({
    world_id: 1,
    course_id: index + 1,
    course_name: name,
    sort_order: index,
    mission_count: 3 + (index % 3),
    mastered_count: index % 4 === 0 ? 3 : index % 3,
    studying_count: index % 3 === 0 ? 0 : 1,
    pending_count: 1,
  }))
}

function missions(count: number, allDone = false): StudyMission[] {
  const statuses = ['mastered', 'studying', 'studying', 'pending', 'studying', 'mastered', 'studying', 'pending', 'pending']
  const phases = ['understanding', 'practicing', 'reviewing']
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    world_id: 1,
    course_id: 1,
    course_name: 'Matemática',
    title: ['Fracciones', 'Circunferencias', 'Ejercicios con circunferencias', 'Ángulos', 'Triángulos', 'Perímetros', 'Áreas', 'Potencias', 'Raíces'][index] ?? `Tema ${index + 1}`,
    description: null,
    status: allDone ? 'mastered' : statuses[index % statuses.length],
    tutor_phase: statuses[index % statuses.length] === 'studying' ? phases[index % 3] : null,
    source_mission_id: null,
    sort_order: index,
    created_at: '',
    updated_at: '',
  }))
}

const progress = Object.fromEntries(worlds.map((w, i) => [w.id, { total: 10, mastered: i * 2, courseIds: Array.from({ length: [2, 3, 5, 8, 14][i] }, (_, k) => k + 1) }]))

/** Solo dev: `?lab=map` muestra el mapa estelar de Mundos con datos de ejemplo. */
export function MapLab() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 28px 64px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Lista de mundos</h2>
      <WorldsMap worlds={worlds} progress={progress} onOpen={() => {}} onCreate={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Mundo con 6 cursos (dos anillos)</h2>
      <WorldSystem worldId={3} courses={courses(6)} onOpenCourse={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Curso con 7 misiones (fases de luna)</h2>
      <CourseSystem worldId={1} courseId={1} missions={missions(7)} onStudy={() => {}} onChallenge={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Curso dominado</h2>
      <CourseSystem worldId={1} courseId={2} missions={missions(4, true)} onStudy={() => {}} onChallenge={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Curso con 13 misiones (tres anillos)</h2>
      <CourseSystem worldId={1} courseId={3} missions={missions(13)} onStudy={() => {}} onChallenge={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Mundo con 15 cursos</h2>
      <WorldSystem worldId={5} courses={courses(15)} onOpenCourse={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Curso con 22 misiones</h2>
      <CourseSystem worldId={1} courseId={4} missions={missions(22)} onStudy={() => {}} onChallenge={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Mundo con 30 cursos</h2>
      <WorldSystem worldId={6} courses={courses(30)} onOpenCourse={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Mundo con 60 cursos</h2>
      <WorldSystem worldId={7} courses={courses(60)} onOpenCourse={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Curso con 40 misiones</h2>
      <CourseSystem worldId={1} courseId={5} missions={missions(40)} onStudy={() => {}} onChallenge={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Mundo vacío</h2>
      <WorldSystem worldId={2} courses={[]} onOpenCourse={() => {}} />
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Llega el primer curso</h2>
      <WorldSystem worldId={4} courses={courses(1)} arrivingCourseId={1} onOpenCourse={() => {}} />
    </div>
  )
}
