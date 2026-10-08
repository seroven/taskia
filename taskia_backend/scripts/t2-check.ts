import 'reflect-metadata'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { Course, Task } from '../src/infrastructure/database/entities/index.js'
import { findTask, insertTask, listTasks } from '../src/modules/tasks/repositories/task.repository.js'

async function main() {
  await initDataSource()
  const course = await AppDataSource.getRepository(Course).findOne({
    where: { isActive: true },
    order: { id: 'ASC' },
  })
  if (!course) throw new Error('Falta materia')

  const listed = await listTasks(course.userId, {})
  const id = await insertTask({
    userId: course.userId,
    courseId: course.id,
    title: 't2-check',
    description: null,
    taskKind: 'daily',
    needsHelp: false,
    dueDate: '2026-10-03',
  })
  try {
    const task = await findTask(id, course.userId)
    if (!task) throw new Error('La tarea insertada no se lee')
    if (task.due_date !== '2026-10-03') throw new Error(`due_date ${task.due_date}`)
    if (task.course_name !== course.name) throw new Error('course_name distinto')
    if (task.needs_help) throw new Error('needs_help debería ser false')
    if (task.status !== 'pending') throw new Error(`status ${task.status}`)
    const again = await listTasks(course.userId, { dueOn: '2026-10-03' })
    if (!again.some((row) => row.id === id)) throw new Error('El filtro due_on no devolvió la tarea')
    console.log(
      JSON.stringify({
        listed: listed.length,
        id: task.id,
        due_date: task.due_date,
        course_name: task.course_name,
        needs_help: task.needs_help,
      }),
    )
  } finally {
    await AppDataSource.getRepository(Task).delete({ id })
  }
  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
