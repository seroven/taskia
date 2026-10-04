import { IsNull, type EntityManager } from 'typeorm'
import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import { AppError } from '../../../shared/errors/app-error.js'
import {
  Role,
  Troop,
  TroopInvite,
  TroopMember,
  User,
  XpAward,
} from '../../../infrastructure/database/entities/index.js'
import { PRODUCT_TZ } from '../../../services/xp.js'

export type MembershipRow = {
  id: number
  troop_id: number
  role: string
  troop_name: string
  is_active: boolean
}

function db(manager?: EntityManager) {
  return manager ?? AppDataSource.manager
}

export async function findActiveMembership(userId: number, manager?: EntityManager) {
  const row = await db(manager)
    .getRepository(TroopMember)
    .createQueryBuilder('tm')
    .innerJoin(Troop, 't', 't.id = tm.troop_id')
    .select('tm.id', 'id')
    .addSelect('tm.troop_id', 'troop_id')
    .addSelect('tm."role"', 'role')
    .addSelect('t.name', 'troop_name')
    .addSelect('t.is_active', 'is_active')
    .where('tm.user_id = :userId AND tm.left_at IS NULL', { userId })
    .getRawOne<MembershipRow>()
  if (!row) return null
  return {
    id: Number(row.id),
    troop_id: Number(row.troop_id),
    role: String(row.role),
    troop_name: String(row.troop_name),
    is_active: Number(row.is_active) !== 0,
  }
}

export async function countActiveMembers(troopId: number, manager?: EntityManager) {
  return db(manager).getRepository(TroopMember).count({
    where: { troopId, leftAt: IsNull() },
  })
}

export async function weeklyRanks(weekStart: string) {
  const rows = await AppDataSource.getRepository(Troop)
    .createQueryBuilder('t')
    .innerJoin(TroopMember, 'tm', 'tm.troop_id = t.id AND tm.left_at IS NULL')
    .leftJoin(XpAward, 'a', 'a.user_id = tm.user_id AND a.week_start = :weekStart', { weekStart })
    .select('t.id', 'id')
    .addSelect('COALESCE(SUM(a.amount), 0)', 'xp_week')
    .where('t.is_active = TRUE')
    .groupBy('t.id')
    .addGroupBy('t.name')
    .orderBy('xp_week', 'DESC')
    .addOrderBy('t.name', 'ASC')
    .getRawMany<{ id: number }>()
  const map = new Map<number, number>()
  rows.forEach((row, index) => map.set(Number(row.id), index + 1))
  return map
}

export async function findTroop(troopId: number) {
  return AppDataSource.getRepository(Troop).findOne({ where: { id: troopId } })
}

export type MemberRow = {
  user_id: number
  username: string
  role: string
  level: number
  xp_total: number
  joined_at: Date
  avatar_kind: string
  avatar_preset_id: string | null
  avatar_file: string | null
  frame_id: string | null
  xp_week: number
}

export async function listActiveMembers(troopId: number, weekStart: string) {
  const rows = await AppDataSource.getRepository(TroopMember)
    .createQueryBuilder('tm')
    .innerJoin(User, 'u', 'u.id = tm.user_id')
    .leftJoin(XpAward, 'a', 'a.user_id = tm.user_id AND a.week_start = :weekStart', { weekStart })
    .select('tm.user_id', 'user_id')
    .addSelect('u.username', 'username')
    .addSelect('tm."role"', 'role')
    .addSelect('u.level', 'level')
    .addSelect('u.xp_total', 'xp_total')
    .addSelect('tm.joined_at', 'joined_at')
    .addSelect('u.avatar_kind', 'avatar_kind')
    .addSelect('u.avatar_preset_id', 'avatar_preset_id')
    .addSelect('u.avatar_file', 'avatar_file')
    .addSelect('u.frame_id', 'frame_id')
    .addSelect('COALESCE(SUM(a.amount), 0)', 'xp_week')
    .where('tm.troop_id = :troopId AND tm.left_at IS NULL', { troopId })
    .groupBy('tm.user_id')
    .addGroupBy('u.username')
    .addGroupBy('tm."role"')
    .addGroupBy('u.level')
    .addGroupBy('u.xp_total')
    .addGroupBy('tm.joined_at')
    .addGroupBy('u.avatar_kind')
    .addGroupBy('u.avatar_preset_id')
    .addGroupBy('u.avatar_file')
    .addGroupBy('u.frame_id')
    .orderBy('u.level', 'DESC')
    .addOrderBy('u.xp_total', 'DESC')
    .addOrderBy('tm.joined_at', 'ASC')
    .getRawMany<MemberRow>()
  return rows.map((row) => ({
    ...row,
    user_id: Number(row.user_id),
    level: Number(row.level ?? 1),
    xp_total: Number(row.xp_total ?? 0),
    xp_week: Number(row.xp_week ?? 0),
  }))
}

export async function troopWeekXp(troopId: number, weekStart: string) {
  const row = await AppDataSource.getRepository(TroopMember)
    .createQueryBuilder('tm')
    .leftJoin(XpAward, 'a', 'a.user_id = tm.user_id AND a.week_start = :weekStart', { weekStart })
    .select('COALESCE(SUM(a.amount), 0)', 'xp_week')
    .where('tm.troop_id = :troopId AND tm.left_at IS NULL', { troopId })
    .getRawOne<{ xp_week: string | number }>()
  return Number(row?.xp_week ?? 0)
}

export async function listIncomingInvites(userId: number) {
  return AppDataSource.getRepository(TroopInvite)
    .createQueryBuilder('i')
    .innerJoin(Troop, 't', 't.id = i.troop_id AND t.is_active = TRUE')
    .innerJoin(User, 'fu', 'fu.id = i.from_user_id')
    .select('i.id', 'id')
    .addSelect('i.troop_id', 'troop_id')
    .addSelect('t.name', 'troop_name')
    .addSelect('i.from_user_id', 'from_user_id')
    .addSelect('fu.username', 'from_username')
    .addSelect('i.created_at', 'created_at')
    .where("i.to_user_id = :userId AND i.status = 'pending' AND i.direction = 'invite'", { userId })
    .orderBy('i.id', 'DESC')
    .getRawMany<{
      id: number
      troop_id: number
      troop_name: string
      from_user_id: number
      from_username: string
      created_at: Date
    }>()
}

export async function listTroopRequests(troopId: number) {
  return AppDataSource.getRepository(TroopInvite)
    .createQueryBuilder('i')
    .innerJoin(Troop, 't', 't.id = i.troop_id AND t.is_active = TRUE')
    .innerJoin(User, 'fu', 'fu.id = i.from_user_id')
    .select('i.id', 'id')
    .addSelect('i.troop_id', 'troop_id')
    .addSelect('t.name', 'troop_name')
    .addSelect('i.from_user_id', 'from_user_id')
    .addSelect('fu.username', 'from_username')
    .addSelect('i.created_at', 'created_at')
    .where("i.troop_id = :troopId AND i.status = 'pending' AND i.direction = 'request'", { troopId })
    .orderBy('i.id', 'DESC')
    .getRawMany<{
      id: number
      troop_id: number
      troop_name: string
      from_user_id: number
      from_username: string
      created_at: Date
    }>()
}

export async function rankingPage(weekStart: string, limit: number, offset: number) {
  return AppDataSource.getRepository(Troop)
    .createQueryBuilder('t')
    .innerJoin(TroopMember, 'tm', 'tm.troop_id = t.id AND tm.left_at IS NULL')
    .leftJoin(XpAward, 'a', 'a.user_id = tm.user_id AND a.week_start = :weekStart', { weekStart })
    .select('t.id', 'id')
    .addSelect('t.name', 'name')
    .addSelect('COUNT(DISTINCT tm.user_id)', 'member_count')
    .addSelect('COALESCE(SUM(a.amount), 0)', 'xp_week')
    .where('t.is_active = TRUE')
    .groupBy('t.id')
    .addGroupBy('t.name')
    .orderBy('xp_week', 'DESC')
    .addOrderBy('t.name', 'ASC')
    .limit(limit)
    .offset(offset)
    .getRawMany<{ id: number; name: string; member_count: string; xp_week: string }>()
}

export async function universePage(weekStart: string, myTroopId: number | null, limit: number, offset: number) {
  const mine = myTroopId != null && Number.isFinite(myTroopId) ? Number(myTroopId) : -1
  return AppDataSource.getRepository(Troop)
    .createQueryBuilder('t')
    .innerJoin(TroopMember, 'tm', 'tm.troop_id = t.id AND tm.left_at IS NULL')
    .innerJoin(User, 'u', 'u.id = tm.user_id')
    .leftJoin(XpAward, 'a', 'a.user_id = tm.user_id AND a.week_start = :weekStart', { weekStart })
    .select('t.id', 'id')
    .addSelect('t.name', 'name')
    .addSelect('t.planet_style_id', 'planet_style_id')
    .addSelect('t.planet_seed', 'planet_seed')
    .addSelect('t.planet_params', 'planet_params')
    .addSelect('COUNT(DISTINCT tm.user_id)', 'member_count')
    .addSelect('COALESCE(AVG(u.level), 1)', 'avg_level')
    .addSelect('COALESCE(SUM(a.amount), 0)', 'xp_week')
    .where('t.is_active = TRUE')
    .groupBy('t.id')
    .addGroupBy('t.name')
    .addGroupBy('t.planet_style_id')
    .addGroupBy('t.planet_seed')
    .addGroupBy('t.planet_params')
    .addSelect(`CASE WHEN t.id = ${mine} THEN 0 ELSE 1 END`, 'mine_sort')
    .orderBy('mine_sort', 'ASC')
    .addOrderBy('t.id', 'ASC')
    .limit(limit)
    .offset(offset)
    .getRawMany<{
      id: number
      name: string
      planet_style_id: string
      planet_seed: number
      planet_params: unknown
      member_count: string
      avg_level: string
      xp_week: string
    }>()
}

export async function searchExplorers(userId: number, q: string) {
  return AppDataSource.getRepository(User)
    .createQueryBuilder('u')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .leftJoin(TroopMember, 'tm', 'tm.user_id = u.id AND tm.left_at IS NULL')
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.level', 'level')
    .addSelect('u.xp_total', 'xp_total')
    .addSelect('tm.troop_id', 'troop_id')
    .where('u.is_active = TRUE')
    .andWhere('u.id <> :userId', { userId })
    .andWhere('u.username ILIKE :q', { q: `%${q}%` })
    .orderBy('u.username', 'ASC')
    .limit(20)
    .getRawMany<{ id: number; username: string; level: number; xp_total: number; troop_id: number | null }>()
}

export async function createTroopWithCaptain(name: string, userId: number) {
  return AppDataSource.transaction(async (manager) => {
    const troops = manager.getRepository(Troop)
    const saved = await troops.save(troops.create({ name }))
    await troops.update({ id: saved.id }, { planetSeed: saved.id % 2147483647 })
    const members = manager.getRepository(TroopMember)
    await members.save(members.create({ troopId: saved.id, userId, role: 'captain' }))
    return saved.id
  })
}

export async function countPendingInvites(troopId: number) {
  return AppDataSource.getRepository(TroopInvite).count({
    where: { troopId, status: 'pending' },
  })
}

export async function countInvitesSentToday(userId: number, today: string) {
  const row = await AppDataSource.getRepository(TroopInvite)
    .createQueryBuilder('i')
    .select('COUNT(*)', 'c')
    .where('i.from_user_id = :userId', { userId })
    .andWhere(
      `i.created_at >= (CAST(:day AS date) AT TIME ZONE :tz) AND i.created_at < ((CAST(:day AS date) + 1) AT TIME ZONE :tz)`,
      { day: today, tz: PRODUCT_TZ },
    )
    .getRawOne<{ c: string | number }>()
  return Number(row?.c ?? 0)
}

export async function findActiveExplorer(userId: number) {
  const row = await AppDataSource.getRepository(User)
    .createQueryBuilder('u')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select('u.id', 'id')
    .where('u.id = :userId AND u.is_active = TRUE', { userId })
    .getRawOne<{ id: number }>()
  return row ? Number(row.id) : null
}

export async function insertInvite(input: {
  troopId: number
  fromUserId: number
  toUserId: number
  direction: 'invite' | 'request'
}) {
  const repo = AppDataSource.getRepository(TroopInvite)
  const saved = await repo.save(
    repo.create({
      troopId: input.troopId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      status: 'pending',
      direction: input.direction,
    }),
  )
  return saved.id
}

export async function findCaptainId(troopId: number) {
  const row = await AppDataSource.getRepository(TroopMember).findOne({
    where: { troopId, leftAt: IsNull(), role: 'captain' },
  })
  return row?.userId ?? null
}

export async function findPendingInvite(inviteId: number) {
  const row = await AppDataSource.getRepository(TroopInvite)
    .createQueryBuilder('i')
    .innerJoin(Troop, 't', 't.id = i.troop_id')
    .select('i.id', 'id')
    .addSelect('i.troop_id', 'troop_id')
    .addSelect('i.from_user_id', 'from_user_id')
    .addSelect('i.to_user_id', 'to_user_id')
    .addSelect('i.direction', 'direction')
    .addSelect('t.is_active', 'is_active')
    .where("i.id = :inviteId AND i.status = 'pending'", { inviteId })
    .getRawOne<{
      id: number
      troop_id: number
      from_user_id: number
      to_user_id: number
      direction: string
      is_active: boolean
    }>()
  if (!row) return null
  return {
    id: Number(row.id),
    troop_id: Number(row.troop_id),
    from_user_id: Number(row.from_user_id),
    to_user_id: Number(row.to_user_id),
    direction: String(row.direction ?? 'invite'),
    is_active: Number(row.is_active) !== 0,
  }
}

export async function setInviteStatus(inviteId: number, status: 'accepted' | 'rejected' | 'cancelled') {
  await AppDataSource.getRepository(TroopInvite).update(
    { id: inviteId },
    { status, respondedAt: () => 'NOW()' },
  )
}

export async function joinTroopAsMember(troopId: number, userId: number) {
  const members = AppDataSource.getRepository(TroopMember)
  const existing = await members.findOne({ where: { troopId, userId } })
  if (existing) {
    if (existing.leftAt == null) return
    await members
      .createQueryBuilder()
      .update()
      .set({ role: 'member', leftAt: () => 'NULL', joinedAt: () => 'NOW()' })
      .where('id = :id', { id: existing.id })
      .execute()
    return
  }
  await members.save(members.create({ troopId, userId, role: 'member' }))
}

export async function replaceCopilot(troopId: number, captainId: number, nextId: number | null) {
  await AppDataSource.transaction(async (manager) => {
    const members = manager.getRepository(TroopMember)
    await members
      .createQueryBuilder()
      .update()
      .set({ role: 'member' })
      .where("troop_id = :troopId AND role = 'copilot' AND left_at IS NULL", { troopId })
      .execute()
    if (nextId == null) return
    if (nextId === captainId) {
      throw new AppError('No puedes ser Capitán y Copiloto')
    }
    const member = await members.findOne({ where: { troopId, userId: nextId, leftAt: IsNull() } })
    if (!member) throw new AppError('Ese explorador no está en tu tropa')
    await members.update({ id: member.id }, { role: 'copilot' })
  })
}

export async function markMemberLeft(troopId: number, userId: number) {
  const result = await AppDataSource.getRepository(TroopMember)
    .createQueryBuilder()
    .update()
    .set({ leftAt: () => 'NOW()', role: 'member' })
    .where('troop_id = :troopId AND user_id = :userId AND left_at IS NULL', { troopId, userId })
    .execute()
  return result.affected ?? 0
}

export async function cancelPendingInvitesTo(troopId: number, userId: number) {
  await AppDataSource.getRepository(TroopInvite)
    .createQueryBuilder()
    .update()
    .set({ status: 'cancelled', respondedAt: () => 'NOW()' })
    .where("troop_id = :troopId AND to_user_id = :userId AND status = 'pending'", { troopId, userId })
    .execute()
}

export async function promoteSuccessor(manager: EntityManager, troopId: number) {
  const members = manager.getRepository(TroopMember)
  const copilot = await members.findOne({
    where: { troopId, leftAt: IsNull(), role: 'copilot' },
  })
  if (copilot) {
    await members.update({ id: copilot.id }, { role: 'captain' })
    return
  }
  const next = await members
    .createQueryBuilder('tm')
    .innerJoin(User, 'u', 'u.id = tm.user_id')
    .select('tm.user_id', 'user_id')
    .where('tm.troop_id = :troopId AND tm.left_at IS NULL', { troopId })
    .orderBy('u.level', 'DESC')
    .addOrderBy('u.xp_total', 'DESC')
    .addOrderBy('tm.joined_at', 'ASC')
    .limit(1)
    .getRawOne<{ user_id: number }>()
  if (next) {
    await members
      .createQueryBuilder()
      .update()
      .set({ role: 'captain' })
      .where('troop_id = :troopId AND user_id = :userId AND left_at IS NULL', {
        troopId,
        userId: Number(next.user_id),
      })
      .execute()
    return
  }
  await manager.getRepository(Troop).update({ id: troopId }, { isActive: false })
}

export async function leaveTroop(troopId: number, userId: number, wasCaptain: boolean) {
  await AppDataSource.transaction(async (manager) => {
    await manager
      .getRepository(TroopMember)
      .createQueryBuilder()
      .update()
      .set({ leftAt: () => 'NOW()', role: 'member' })
      .where('troop_id = :troopId AND user_id = :userId AND left_at IS NULL', { troopId, userId })
      .execute()
    if (wasCaptain) {
      await promoteSuccessor(manager, troopId)
      return
    }
    const left = await manager.getRepository(TroopMember).count({
      where: { troopId, leftAt: IsNull() },
    })
    if (left === 0) {
      await manager.getRepository(Troop).update({ id: troopId }, { isActive: false })
    }
  })
}

export async function setPlanetStyle(troopId: number, styleId: string) {
  await AppDataSource.getRepository(Troop)
    .createQueryBuilder()
    .update()
    .set({ planetStyleId: styleId, planetParams: () => 'NULL' })
    .where('id = :id', { id: troopId })
    .execute()
}

export async function setPlanetParams(troopId: number, params: unknown | null) {
  const update = AppDataSource.getRepository(Troop)
    .createQueryBuilder()
    .update()
    .where('id = :id', { id: troopId })
  if (params == null) {
    await update.set({ planetParams: () => 'NULL' }).execute()
    return
  }
  await update
    .set({ planetParams: () => 'CAST(:params AS jsonb)' })
    .setParameter('params', JSON.stringify(params))
    .execute()
}
