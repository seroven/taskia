import 'reflect-metadata'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { ParentStudentLink } from '../src/infrastructure/database/entities/index.js'
import { explorerOverview, getNotifyPrefs, listExplorers } from '../src/modules/guardian/services/guardian.service.js'

async function main() {
  await initDataSource()
  const link = await AppDataSource.getRepository(ParentStudentLink).findOne({
    where: { isActive: true },
    order: { parentId: 'ASC' },
  })
  if (!link) throw new Error('No hay un vínculo guardián-explorador')

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
  const explorers = await listExplorers(link.parentId)
  const overview = await explorerOverview(link.parentId, link.studentId, today)
  const prefs = await getNotifyPrefs(link.parentId)

  if (!explorers.some((explorer) => explorer.id === link.studentId)) {
    throw new Error('El listado no incluye al explorador vinculado')
  }
  if (typeof overview.tasks.total !== 'number') throw new Error('conteo de tareas inválido')
  if (typeof overview.worlds_count !== 'number') throw new Error('conteo de mundos inválido')
  if (typeof prefs.notify_task_done !== 'boolean') throw new Error('preferencia no es boolean')

  console.log(
    JSON.stringify({
      parentId: link.parentId,
      studentId: link.studentId,
      explorers: explorers.length,
      tasks: overview.tasks.total,
      missions: overview.missions.total,
      worlds: overview.worlds_count,
      troop: overview.troop?.name ?? null,
      weeklyRank: overview.troop?.weekly_rank ?? null,
      notifyTaskDone: prefs.notify_task_done,
    }),
  )
  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
