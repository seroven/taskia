import 'reflect-metadata'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { ParentStudentLink, Role, User } from '../src/infrastructure/database/entities/index.js'
import {
  dashboard,
  listAllGuardians,
  listAllStudents,
  studentOverview,
  studentWorldsTree,
} from '../src/modules/admin/services/admin.service.js'

const view = { headers: { 'x-timezone': 'America/Lima' }, query: {} }

async function main() {
  await initDataSource()
  const link = await AppDataSource.getRepository(ParentStudentLink).findOne({
    where: { isActive: true },
    order: { studentId: 'ASC' },
  })
  if (!link) throw new Error('No hay un vínculo activo')

  const students = await listAllStudents()
  const guardians = await listAllGuardians()
  const explorer = students.find((student) => student.id === link.studentId)
  const guardian = guardians.find((row) => row.id === link.parentId)
  if (!explorer) throw new Error('El listado no incluye al explorador vinculado')
  if (!guardian || guardian.explorer_count < 1) {
    throw new Error('El listado no cuenta al explorador del guardián')
  }

  const board = await dashboard({ ...view, query: { student_id: String(link.studentId) } })
  if (board.students.total !== 1) throw new Error('El filtro del dashboard no dejó un explorador')
  if (!Number.isFinite(board.tasks.total)) throw new Error('El conteo de tareas no es un número')
  if (board.roster.length !== 1 || board.roster[0]?.id !== link.studentId) {
    throw new Error('El roster no es el explorador filtrado')
  }
  if (!Array.isArray(board.series.days) || board.series.days.length < 1) {
    throw new Error('La serie del dashboard está vacía')
  }

  const overview = await studentOverview(link.studentId, view)
  if (overview.student.id !== link.studentId) throw new Error('El resumen no es de ese explorador')
  if (!Array.isArray(overview.courses)) throw new Error('El resumen no trae materias')

  const tree = await studentWorldsTree(link.studentId, view)
  if (!Array.isArray(tree.worlds)) throw new Error('El árbol de mundos no es un array')

  const marker = `t8-${Date.now()}`
  try {
    await AppDataSource.transaction(async (manager) => {
      const role = await manager.getRepository(Role).findOneByOrFail({ code: 'user' })
      const users = manager.getRepository(User)
      const saved = await users.save(
        users.create({
          username: marker,
          email: `${marker}@taskia.test`,
          passwordHash: 'hash',
          roleId: role.id,
          isActive: true,
          xpTotal: 0,
        }),
      )
      const links = manager.getRepository(ParentStudentLink)
      const relink = async () => {
        await links
          .createQueryBuilder()
          .insert()
          .into(ParentStudentLink)
          .values({ parentId: link.parentId, studentId: saved.id, isActive: true })
          .orUpdate(['is_active'], ['parent_id', 'student_id'])
          .execute()
      }
      await relink()
      await links.update({ parentId: link.parentId, studentId: saved.id }, { isActive: false })
      await relink()
      const again = await links.findOneBy({ parentId: link.parentId, studentId: saved.id })
      if (!again?.isActive) throw new Error('El vínculo no se reactivó')
      throw new Error('rollback')
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'rollback') throw error
  }
  const leaked = await AppDataSource.getRepository(User).findOne({ where: { username: marker } })
  if (leaked) throw new Error('El explorador de prueba quedó guardado')

  console.log(
    JSON.stringify({
      studentId: link.studentId,
      parentId: link.parentId,
      students: students.length,
      guardians: guardians.length,
      tasks: board.tasks.total,
      worlds: board.worlds.count,
      roster: board.roster[0]?.username,
      courses: overview.courses.length,
      tree: tree.worlds.length,
    }),
  )
  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
