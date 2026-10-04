import 'reflect-metadata'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { User, XpAward } from '../src/infrastructure/database/entities/index.js'
import { awardXp, countTasksCreatedToday, fetchUserProgress } from '../src/services/xp.js'

async function main() {
  await initDataSource()
  const user = await AppDataSource.getRepository(User).findOne({
    where: {},
    order: { id: 'ASC' },
  })
  if (!user) throw new Error('No hay usuarios')

  const before = await fetchUserProgress(user.id)
  const sourceId = Date.now()
  try {
    const first = await awardXp({
      userId: user.id,
      sourceType: 'task_done_simple',
      sourceId,
      amount: 10,
      reason: 't5-check',
    })
    const second = await awardXp({
      userId: user.id,
      sourceType: 'task_done_simple',
      sourceId,
      amount: 10,
      reason: 't5-check',
    })
    if (!first.awarded || first.xp_gained !== 10) throw new Error('el primer award no sumó')
    if (first.xp_total !== before.xp_total + 10) {
      throw new Error(`xp_total ${first.xp_total} no es ${before.xp_total + 10}`)
    }
    if (second.awarded || second.xp_gained !== 0) throw new Error('el conflicto volvió a sumar')
    if (second.xp_total !== first.xp_total) throw new Error('el segundo award cambió el total')
    const created = await countTasksCreatedToday(user.id)
    if (!Number.isFinite(created)) throw new Error('conteo del día inválido')
    console.log(
      JSON.stringify({
        userId: user.id,
        before: before.xp_total,
        after: first.xp_total,
        secondAwarded: second.awarded,
        tasksToday: created,
      }),
    )
  } finally {
    await AppDataSource.getRepository(XpAward).delete({
      userId: user.id,
      sourceType: 'task_done_simple',
      sourceId,
    })
    await AppDataSource.getRepository(User).update(
      { id: user.id },
      { xpTotal: before.xp_total, level: before.level },
    )
  }
  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
