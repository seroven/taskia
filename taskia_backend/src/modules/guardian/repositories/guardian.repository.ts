import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import {
  ParentChatMessage,
  ParentNotifyPrefs,
  ParentStudentLink,
  Role,
  StudyChallenge,
  StudyMission,
  StudyWorld,
  StudentDailySummary,
  Task,
  Troop,
  TroopMember,
  User,
  XpAward,
} from '../../../infrastructure/database/entities/index.js'

function num(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function findExplorerById(studentId: number) {
  const row = await AppDataSource.getRepository(User)
    .createQueryBuilder('u')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.email', 'email')
    .addSelect('u.is_active', 'is_active')
    .where('u.id = :studentId', { studentId })
    .getRawOne<{ id: number; username: string; email: string; is_active: boolean }>()
  return row ?? null
}

export async function listLinkedExplorers(parentId: number) {
  return AppDataSource.getRepository(User)
    .createQueryBuilder('u')
    .innerJoin(
      ParentStudentLink,
      'l',
      'l.student_id = u.id AND l.parent_id = :parentId AND l.is_active = TRUE',
      { parentId },
    )
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.email', 'email')
    .addSelect('u.is_active', 'is_active')
    .orderBy('u.username', 'ASC')
    .getRawMany<{ id: number; username: string; email: string; is_active: boolean }>()
}

export async function findProgress(studentId: number) {
  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: studentId },
    select: { id: true, xpTotal: true },
  })
  return user?.xpTotal ?? 0
}

export async function taskCounts(studentId: number, today: string) {
  const row = await AppDataSource.getRepository(Task)
    .createQueryBuilder('t')
    .select(`SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END)`, 'pending')
    .addSelect(`SUM(CASE WHEN t.status = 'studying' THEN 1 ELSE 0 END)`, 'studying')
    .addSelect(`SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)`, 'done')
    .addSelect(
      `SUM(CASE WHEN t.status <> 'done' AND t.due_date < :today THEN 1 ELSE 0 END)`,
      'overdue',
    )
    .addSelect('COUNT(*)', 'total')
    .where('t.user_id = :studentId', { studentId, today })
    .getRawOne()
  return {
    pending: num(row?.pending),
    studying: num(row?.studying),
    done: num(row?.done),
    overdue: num(row?.overdue),
    total: num(row?.total),
  }
}

export async function missionCounts(studentId: number) {
  const row = await AppDataSource.getRepository(StudyMission)
    .createQueryBuilder('m')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .select(`SUM(CASE WHEN m.status = 'pending' THEN 1 ELSE 0 END)`, 'pending')
    .addSelect(`SUM(CASE WHEN m.status = 'studying' THEN 1 ELSE 0 END)`, 'studying')
    .addSelect(`SUM(CASE WHEN m.status = 'mastered' THEN 1 ELSE 0 END)`, 'mastered')
    .addSelect('COUNT(*)', 'total')
    .where('w.user_id = :studentId AND m.is_active = TRUE AND w.is_active = TRUE', { studentId })
    .getRawOne()
  return {
    pending: num(row?.pending),
    studying: num(row?.studying),
    mastered: num(row?.mastered),
    total: num(row?.total),
  }
}

export async function challengeStats(studentId: number) {
  const row = await AppDataSource.getRepository(StudyChallenge)
    .createQueryBuilder('c')
    .select('COUNT(*)', 'completed_count')
    .addSelect('AVG(c.score)', 'avg_score')
    .where("c.user_id = :studentId AND c.status = 'completed'", { studentId })
    .getRawOne<{ completed_count: unknown; avg_score: unknown }>()
  return {
    completed_count: num(row?.completed_count),
    avg_score: row?.avg_score == null ? null : Number(row.avg_score),
  }
}

export async function countActiveWorlds(studentId: number) {
  return AppDataSource.getRepository(StudyWorld).count({
    where: { userId: studentId, isActive: true },
  })
}

export async function findActiveTroop(studentId: number) {
  const row = await AppDataSource.getRepository(TroopMember)
    .createQueryBuilder('tm')
    .innerJoin(Troop, 't', 't.id = tm.troop_id AND t.is_active = TRUE')
    .select('tm.troop_id', 'troop_id')
    .addSelect('tm."role"', 'role')
    .addSelect('t.name', 'troop_name')
    .where('tm.user_id = :studentId AND tm.left_at IS NULL', { studentId })
    .getRawOne<{ troop_id: number; role: string; troop_name: string }>()
  if (!row) return null
  return {
    troopId: Number(row.troop_id),
    role: String(row.role),
    troopName: String(row.troop_name),
  }
}

export async function listTroopMembers(troopId: number, weekStart: string) {
  const rows = await AppDataSource.getRepository(TroopMember)
    .createQueryBuilder('tm')
    .innerJoin(User, 'u', 'u.id = tm.user_id')
    .leftJoin(XpAward, 'a', 'a.user_id = tm.user_id AND a.week_start = :weekStart', { weekStart })
    .select('tm.user_id', 'user_id')
    .addSelect('u.username', 'username')
    .addSelect('tm."role"', 'role')
    .addSelect('u.level', 'level')
    .addSelect('u.xp_total', 'xp_total')
    .addSelect('COALESCE(SUM(a.amount), 0)', 'xp_week')
    .where('tm.troop_id = :troopId AND tm.left_at IS NULL', { troopId })
    .groupBy('tm.user_id')
    .addGroupBy('u.username')
    .addGroupBy('tm."role"')
    .addGroupBy('u.level')
    .addGroupBy('u.xp_total')
    .addGroupBy('tm.joined_at')
    .orderBy('u.level', 'DESC')
    .addOrderBy('u.xp_total', 'DESC')
    .addOrderBy('tm.joined_at', 'ASC')
    .getRawMany<{
      user_id: number
      username: string
      role: string
      level: number
      xp_total: number
      xp_week: number
    }>()
  return rows.map((row) => ({
    userId: Number(row.user_id),
    username: String(row.username),
    role: String(row.role),
    level: Number(row.level ?? 1),
    xpTotal: Number(row.xp_total ?? 0),
    xpWeek: Number(row.xp_week ?? 0),
  }))
}

export async function troopWeeklyRank(troopId: number, weekStart: string) {
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
    .addOrderBy('COUNT(DISTINCT tm.user_id)', 'DESC')
    .addOrderBy('t.name', 'ASC')
    .getRawMany<{ id: number }>()
  const index = rows.findIndex((row) => Number(row.id) === troopId)
  return index >= 0 ? index + 1 : null
}

export async function ensureNotifyPrefs(parentId: number) {
  await AppDataSource.getRepository(ParentNotifyPrefs)
    .createQueryBuilder()
    .insert()
    .into(ParentNotifyPrefs)
    .values({ parentId })
    .orIgnore()
    .execute()
  const prefs = await AppDataSource.getRepository(ParentNotifyPrefs).findOneBy({ parentId })
  if (!prefs) return null
  return {
    whatsapp_e164: prefs.whatsappE164,
    notify_task_done: prefs.notifyTaskDone,
    notify_task_study_done: prefs.notifyTaskStudyDone,
    notify_mission_done: prefs.notifyMissionDone,
    notify_course_done: prefs.notifyCourseDone,
    notify_world_done: prefs.notifyWorldDone,
    notify_challenge_done: prefs.notifyChallengeDone,
    notify_inactivity: prefs.notifyInactivity,
  }
}

export async function saveNotifyPrefs(
  parentId: number,
  prefs: {
    whatsapp_e164: string | null
    notify_task_done: boolean
    notify_task_study_done: boolean
    notify_mission_done: boolean
    notify_course_done: boolean
    notify_world_done: boolean
    notify_challenge_done: boolean
    notify_inactivity: boolean
  },
) {
  await AppDataSource.getRepository(ParentNotifyPrefs).update(
    { parentId },
    {
      whatsappE164: prefs.whatsapp_e164,
      notifyTaskDone: prefs.notify_task_done,
      notifyTaskStudyDone: prefs.notify_task_study_done,
      notifyMissionDone: prefs.notify_mission_done,
      notifyCourseDone: prefs.notify_course_done,
      notifyWorldDone: prefs.notify_world_done,
      notifyChallengeDone: prefs.notify_challenge_done,
      notifyInactivity: prefs.notify_inactivity,
    },
  )
}

export async function listChatMessages(parentId: number, studentId: number, chatDate: string) {
  const rows = await AppDataSource.getRepository(ParentChatMessage).find({
    where: { parentId, studentId, chatDate, isActive: true },
    order: { id: 'ASC' },
    take: 200,
  })
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt,
  }))
}

export async function recentChat(parentId: number, studentId: number, chatDate: string) {
  const rows = await AppDataSource.getRepository(ParentChatMessage).find({
    where: { parentId, studentId, chatDate, isActive: true },
    order: { id: 'DESC' },
    take: 20,
    select: { id: true, role: true, content: true },
  })
  return rows.reverse().map((row) => ({ role: row.role, content: row.content }))
}

export async function insertChatMessage(input: {
  parentId: number
  studentId: number
  role: 'user' | 'assistant'
  content: string
  chatDate: string
}) {
  const repo = AppDataSource.getRepository(ParentChatMessage)
  const saved = await repo.save(
    repo.create({
      parentId: input.parentId,
      studentId: input.studentId,
      role: input.role,
      content: input.content,
      chatDate: input.chatDate,
    }),
  )
  return saved.id
}

export async function findTodaySummary(studentId: number, today: string) {
  const row = await AppDataSource.getRepository(StudentDailySummary).findOne({
    where: { studentId, summaryDate: today, isActive: true },
  })
  return row?.summaryText?.trim() ?? ''
}
