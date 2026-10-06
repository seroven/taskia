import 'reflect-metadata'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { Course, Difficulty, Task, UserStudyMemory } from '../src/infrastructure/database/entities/index.js'
import { insertTask } from '../src/modules/tasks/repositories/task.repository.js'
import {
  ensureSession,
  insertMessage,
  loadContext,
  loadUserMemory,
  markStudyPassed,
  saveSessionMeta,
  saveUserMemory,
} from '../src/modules/study/repositories/study.repository.js'

async function main() {
  await initDataSource()
  const course = await AppDataSource.getRepository(Course).findOne({
    where: { isActive: true },
    order: { id: 'ASC' },
  })
  const difficulty = await AppDataSource.getRepository(Difficulty).findOne({
    where: {},
    order: { id: 'ASC' },
  })
  if (!course || !difficulty) throw new Error('Faltan materia o dificultad')

  const previousMemory = await loadUserMemory(course.userId)
  const taskId = await insertTask({
    userId: course.userId,
    courseId: course.id,
    difficultyId: difficulty.id,
    title: 't3-check',
    description: null,
    taskKind: 'daily',
    boardOrder: 0,
    dueDate: '2026-10-03',
  })

  try {
    await ensureSession(taskId)
    await ensureSession(taskId)
    const first = await loadContext(taskId)
    if (first.tutor_phase !== 'understanding') throw new Error('fase inicial distinta')
    if (first.messages.length !== 0) throw new Error('la sesión nueva no debería tener mensajes')

    await saveSessionMeta({
      task_id: taskId,
      tutor_phase: 'practicing',
      topic_summary: 'fracciones',
      context_summary: 'Ejercicio activo: 1/2',
      hints_level: 1,
    })
    const meta = await loadContext(taskId)
    if (meta.tutor_phase !== 'practicing' || meta.hints_level !== 1) {
      throw new Error('la sesión no guardó la fase')
    }

    await saveUserMemory(course.userId, 'primera')
    await saveUserMemory(course.userId, 'segunda')
    const memories = await AppDataSource.getRepository(UserStudyMemory).count({
      where: { userId: course.userId },
    })
    if (memories !== 1) throw new Error(`memoria duplicada: ${memories}`)
    if ((await loadUserMemory(course.userId)) !== 'segunda') {
      throw new Error('el upsert de memoria no actualizó')
    }

    const assistant = await insertMessage(taskId, 'assistant', 'hola')
    const user = await insertMessage(taskId, 'user', 'listo', false)
    if (!assistant.created_at || !user.created_at) throw new Error('mensaje sin fecha')
    if (user.role !== 'user') throw new Error('rol del mensaje distinto')

    await markStudyPassed(taskId, course.userId)
    const task = await AppDataSource.getRepository(Task).findOneByOrFail({ id: taskId })
    if (!task.studyPassed) throw new Error('study_passed no quedó en true')

    console.log(JSON.stringify({ taskId, phase: meta.tutor_phase, memory: 'segunda' }))
  } finally {
    await AppDataSource.getRepository(Task).delete({ id: taskId })
    if (previousMemory) await saveUserMemory(course.userId, previousMemory)
    else await AppDataSource.getRepository(UserStudyMemory).delete({ userId: course.userId })
  }
  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
