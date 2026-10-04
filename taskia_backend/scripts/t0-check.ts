import 'reflect-metadata'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { Course, Difficulty, Task, User, XpAward } from '../src/infrastructure/database/entities/index.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function main() {
  await initDataSource()
  const tableCount = AppDataSource.entityMetadatas.length
  if (tableCount !== 28) {
    throw new Error(`Se esperaban 28 entidades y hay ${tableCount}`)
  }

  let report: Record<string, unknown> = { tables: tableCount }
  try {
    await AppDataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: {},
        order: { id: 'ASC' },
      })
      if (!user) throw new Error('No hay usuarios en el schema')
      if (typeof user.id !== 'number' || !Number.isFinite(user.id)) {
        throw new Error(`users.id no es número: ${typeof user.id} ${String(user.id)}`)
      }

      const course = await manager.getRepository(Course).findOne({
        where: {},
        order: { id: 'ASC' },
      })
      const difficulty = await manager.getRepository(Difficulty).findOne({
        where: {},
        order: { id: 'ASC' },
      })
      if (!course || !difficulty) {
        throw new Error('Faltan materia o dificultad para probar due_date')
      }
      const saved = await manager.getRepository(Task).save({
        userId: course.userId,
        courseId: course.id,
        difficultyId: difficulty.id,
        title: 't0-check',
        dueDate: '2026-10-03',
      })
      const task = await manager.getRepository(Task).findOneByOrFail({ id: saved.id })
      if (!DATE_RE.test(task.dueDate) || task.dueDate !== '2026-10-03') {
        throw new Error(`due_date no es día civil: ${String(task.dueDate)}`)
      }

      const values = {
        userId: user.id,
        sourceType: 'task_done_simple',
        sourceId: Date.now(),
        amount: 1,
        weekStart: '2020-01-06',
        reason: 't0-check',
      }
      const repo = manager.getRepository(XpAward)
      const first = await repo
        .createQueryBuilder()
        .insert()
        .into(XpAward)
        .values(values)
        .orIgnore()
        .execute()
      const second = await repo
        .createQueryBuilder()
        .insert()
        .into(XpAward)
        .values(values)
        .orIgnore()
        .execute()

      const written = Array.isArray(first.raw) ? first.raw.length : 0
      const ignored = Array.isArray(second.raw) ? second.raw.length : -1
      if (written !== 1) {
        throw new Error(`El primer insert no escribió 1 fila: ${JSON.stringify(first.raw)}`)
      }
      if (ignored !== 0) {
        throw new Error(`orIgnore no ignoró el conflicto: ${JSON.stringify(second.raw)}`)
      }

      report = {
        tables: tableCount,
        userId: user.id,
        userIdType: typeof user.id,
        dueDate: task?.dueDate ?? null,
        orIgnore: { firstReturned: written, secondReturned: ignored },
      }
      throw new Error('__rollback__')
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== '__rollback__') throw error
  }

  console.log(JSON.stringify(report))
  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
