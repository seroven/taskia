import { CampTaskRow } from '../components/CampTaskRow'
import type { Task } from '../types'

function task(id: number, patch: Partial<Task>): Task {
  return {
    id,
    user_id: 1,
    course_id: id,
    course_name: 'Matemática',
    title: 'tarea de ejemplo',
    description: null,
    task_kind: 'daily',
    status: 'pending',
    needs_help: false,
    due_date: '2026-10-18',
    created_at: '',
    updated_at: '',
    ...patch,
  }
}

const SAMPLES: { task: Task; featured: boolean }[] = [
  { task: task(1, { title: 'resolver la página 42', needs_help: true, status: 'studying' }), featured: true },
  { task: task(2, { title: 'leer el capítulo 3', course_name: 'Comunicación' }), featured: false },
  { task: task(3, { title: 'maqueta del sistema solar', course_name: 'Ciencia', task_kind: 'project', needs_help: true }), featured: false },
  { task: task(4, { title: 'copiar el vocabulario', course_name: 'Inglés', status: 'done' }), featured: false },
]

/** Solo dev: `?lab=camp` muestra las filas del Campamento sin sesión. */
export function CampLab() {
  return (
    <div className="board-shell camp-shell">
      <div className="camp-stage" style={{ paddingTop: 24 }}>
        <div className="camp-column">
          <ul className="camp-section-list">
            {SAMPLES.map(({ task: item, featured }) => (
              <li key={item.id}>
                <CampTaskRow task={item} featured={featured} onOpen={() => {}} onStudy={() => {}} onComplete={() => {}} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
