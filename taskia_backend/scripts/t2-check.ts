import 'reflect-metadata'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { Course, Difficulty, Task } from '../src/infrastructure/database/entities/index.js'
import {
  findTask,
  insertTask,
  listTasks,
  nextBoardOrder,
} from '../src/modules/tasks/repositories/task.repository.js'

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

  const listed = await listTasks(course.userId, {})
  const order = await nextBoardOrder(course.userId, 'pending')
  const id = await insertTask({
    userId: course.userId,
    courseId: course.id,
    difficultyId: difficulty.id,
    title: 't2-check',
    description: null,
    taskKind: 'daily',
    boardOrder: order,
    dueDate: '2026-10-03',
  })
  try {
    const task = await findTask(id, course.userId)
    if (!task) throw new Error('La tarea insertada no se lee')
    if (task.due_date !== '2026-10-03') throw new Error(`due_date ${task.due_date}`)
    if (task.course_name !== course.name) throw new Error('course_name distinto')
    if (task.difficulty_code !== difficulty.code) throw new Error('difficulty_code distinto')
    if (task.status !== 'pending') throw new Error(`status ${task.status}`)
    const again = await listTasks(course.userId, { dueOn: '2026-10-03' })
    if (!again.some((row) => row.id === id)) throw new Error('El filtro due_on no devolvió la tarea')
    console.log(
      JSON.stringify({
        listed: listed.length,
        id: task.id,
        due_date: task.due_date,
        course_name: task.course_name,
        difficulty_code: task.difficulty_code,
        board_order: task.board_order,
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
