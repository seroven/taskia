import 'reflect-metadata'
import { IsNull } from 'typeorm'
import { civilDayFromInstant } from '../src/infrastructure/database/civil-date.js'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { Role, Troop, TroopMember, User } from '../src/infrastructure/database/entities/index.js'
import {
  countInvitesSentToday,
  weeklyRanks,
} from '../src/modules/troops/repositories/troop.repository.js'
import { getMe, getRanking, getUniverse, searchExplorers } from '../src/modules/troops/services/troop.service.js'
import { PRODUCT_TZ, weekStartMonday } from '../src/services/xp.js'

const req = (userId: number, query: Record<string, unknown> = {}) => ({
  user: { id: userId },
  query,
  body: {},
  params: {},
})

async function main() {
  await initDataSource()
  const member = await AppDataSource.getRepository(TroopMember).findOne({
    where: { leftAt: IsNull() },
    order: { id: 'ASC' },
  })
  if (!member) throw new Error('No hay una membresía activa')

  const ranking = await getRanking(req(member.userId, { limit: 5, offset: 0 }))
  const universe = await getUniverse(req(member.userId))
  const me = await getMe(req(member.userId))
  if (!ranking.troops.length) throw new Error('El ranking no devolvió tropas')
  if (universe.my_troop_id !== member.troopId) throw new Error('El universo no marcó mi tropa')
  if (universe.troops[0]?.id !== member.troopId) throw new Error('Mi tropa no quedó primera')
  if (!me.troop || me.troop.id !== member.troopId) throw new Error('getMe no devolvió la tropa')
  if (!me.troop.members.length) throw new Error('La tropa no tiene miembros')
  if (typeof me.troop.planet_style_id !== 'string') throw new Error('Falta el estilo del planeta')

  const self = await AppDataSource.getRepository(User).findOneBy({ id: member.userId })
  if (!self || self.username.length < 2) throw new Error('El explorador no tiene nombre buscable')
  const found = await searchExplorers(req(0, { q: self.username.slice(0, 2) }))
  if (!found.some((row) => row.id === self.id)) throw new Error('La búsqueda ILIKE no encontró al explorador')

  const sentToday = await countInvitesSentToday(member.userId, civilDayFromInstant(new Date(), PRODUCT_TZ))
  if (!Number.isFinite(sentToday)) throw new Error('El conteo de invitaciones del día no es un número')

  const ranks = await weeklyRanks(weekStartMonday())
  if (me.troop.rank != null && ranks.get(me.troop.id) !== me.troop.rank) {
    throw new Error('El puesto semanal no coincide')
  }

  const marker = `t6-check-${Date.now()}`
  let createdId = 0
  try {
    await AppDataSource.transaction(async (manager) => {
      const troops = manager.getRepository(Troop)
      const saved = await troops.save(troops.create({ name: marker }))
      createdId = Number(saved.id)
      const seed = createdId % 2147483647
      await troops.update({ id: createdId }, { planetSeed: seed })
      await troops
        .createQueryBuilder()
        .update()
        .set({ planetParams: () => 'CAST(:params AS jsonb)' })
        .where('id = :id', { id: createdId })
        .setParameter(
          'params',
          JSON.stringify({
            color: '#112233',
            emissive: '#000000',
            roughness: 0.4,
            metalness: 0.2,
            atmosphere: null,
            label: 'T6',
          }),
        )
        .execute()
      const again = await troops.findOneBy({ id: createdId })
      const params = again?.planetParams as { label?: string } | null
      if (!again || Number(again.planetSeed) !== seed) throw new Error('La semilla del planeta no se guardó')
      if (!params || params.label !== 'T6') throw new Error('planet_params no volvió como objeto')

      const free = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
        .leftJoin(TroopMember, 'tm', 'tm.user_id = u.id AND tm.left_at IS NULL')
        .where('u.is_active = TRUE AND tm.id IS NULL')
        .orderBy('u.id', 'ASC')
        .getOne()
      if (free) {
        const members = manager.getRepository(TroopMember)
        await members.save(members.create({ troopId: createdId, userId: free.id, role: 'captain' }))
        let blocked = false
        try {
          await members.save(members.create({ troopId: createdId, userId: free.id, role: 'member' }))
        } catch {
          blocked = true
        }
        if (!blocked) throw new Error('La tropa aceptó dos filas del mismo explorador')
      }
      throw new Error('rollback')
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'rollback') throw error
  }

  const leaked = await AppDataSource.getRepository(Troop).findOne({ where: { name: marker } })
  if (leaked) throw new Error('La tropa de prueba quedó guardada')

  console.log(
    JSON.stringify({
      userId: member.userId,
      troopId: member.troopId,
      troop: me.troop.name,
      members: me.troop.members.length,
      rank: me.troop.rank,
      ranking: ranking.troops.length,
      universeFirst: universe.troops[0]?.id,
      sentToday,
      rolledBack: createdId,
    }),
  )
  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
