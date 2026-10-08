import { In, Not, type EntityManager } from 'typeorm'
import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import {
  Course,
  LlmUsage,
  ParentNotifyPrefs,
  ParentStudentLink,
  Role,
  StudyChallenge,
  StudyMessage,
  StudyMission,
  StudyMissionMessage,
  StudyMissionSession,
  StudySession,
  StudyWorld,
  StudyWorldCourse,
  Task,
  User,
} from '../../../infrastructure/database/entities/index.js'
import { roleIdByCode } from '../../../infrastructure/database/roles.js'

const OFFSET_RE = /^[+-]\d{2}:\d{2}$/

export type DateWindow = {
  tz: string
  from: string | null
  to: string | null
}

function daySql(column: string, tz: string, param: string) {
  if (/(?:^|\.)due_date$/i.test(column.trim())) {
    return `to_char(CAST(${column} AS date), 'YYYY-MM-DD')`
  }
  if (OFFSET_RE.test(tz)) {
    return `to_char((${column}) AT TIME ZONE INTERVAL :${param}, 'YYYY-MM-DD')`
  }
  return `to_char((${column}) AT TIME ZONE :${param}, 'YYYY-MM-DD')`
}

function applyWindow(
  qb: { andWhere: (sql: string, params?: object) => unknown; setParameter: (key: string, value: unknown) => unknown },
  column: string,
  window: DateWindow,
  key: string,
) {
  const expr = daySql(column, window.tz, `${key}Tz`)
  if (expr.includes(`:${key}Tz`)) qb.setParameter(`${key}Tz`, window.tz)
  if (window.from) qb.andWhere(`${expr} >= :${key}From`, { [`${key}From`]: window.from })
  if (window.to) qb.andWhere(`${expr} <= :${key}To`, { [`${key}To`]: window.to })
}

function explorers(alias = 'u') {
  return AppDataSource.getRepository(User)
    .createQueryBuilder(alias)
    .innerJoin(Role, 'role_filter', `role_filter.id = ${alias}.role_id AND role_filter.code = 'user'`)
}

function parents(alias = 'u') {
  return AppDataSource.getRepository(User)
    .createQueryBuilder(alias)
    .innerJoin(Role, 'role_filter', `role_filter.id = ${alias}.role_id AND role_filter.code = 'parent'`)
}

export async function findUserIdByUsername(username: string, exceptId?: number) {
  const row = await AppDataSource.getRepository(User).findOne({
    where: exceptId == null ? { username } : { username, id: Not(exceptId) },
    select: { id: true },
  })
  return row?.id ?? null
}

export async function findUserIdByEmail(email: string, exceptId?: number) {
  const row = await AppDataSource.getRepository(User).findOne({
    where: exceptId == null ? { email } : { email, id: Not(exceptId) },
    select: { id: true },
  })
  return row?.id ?? null
}

export async function countActiveLinksForParent(parentId: number) {
  return AppDataSource.getRepository(ParentStudentLink).count({
    where: { parentId, isActive: true },
  })
}

export async function countActiveLinksForStudent(studentId: number) {
  return AppDataSource.getRepository(ParentStudentLink).count({
    where: { studentId, isActive: true },
  })
}

export async function findExplorer(studentId: number) {
  const row = await explorers()
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.email', 'email')
    .addSelect('u.is_active', 'is_active')
    .addSelect('u.created_at', 'created_at')
    .where('u.id = :studentId', { studentId })
    .getRawOne<{
      id: number
      username: string
      email: string
      is_active: boolean
      created_at: Date
    }>()
  return row ?? null
}

export async function findGuardian(guardianId: number) {
  const row = await parents()
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.email', 'email')
    .addSelect('u.is_active', 'is_active')
    .addSelect('u.created_at', 'created_at')
    .where('u.id = :guardianId', { guardianId })
    .getRawOne<{
      id: number
      username: string
      email: string
      is_active: boolean
      created_at: Date
    }>()
  return row ?? null
}

export async function listStudents() {
  return explorers()
    .leftJoin(Course, 'c', 'c.user_id = u.id')
    .leftJoin(ParentStudentLink, 'l', 'l.student_id = u.id')
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.email', 'email')
    .addSelect('u.is_active', 'is_active')
    .addSelect('u.created_at', 'created_at')
    .addSelect('COUNT(DISTINCT c.id) FILTER (WHERE c.is_active)', 'course_count')
    .addSelect('COUNT(DISTINCT l.parent_id) FILTER (WHERE l.is_active)', 'guardian_count')
    .groupBy('u.id')
    .addGroupBy('u.username')
    .addGroupBy('u.email')
    .addGroupBy('u.is_active')
    .addGroupBy('u.created_at')
    .orderBy('u.username', 'ASC')
    .getRawMany<{
      id: number
      username: string
      email: string
      is_active: boolean
      created_at: Date
      course_count: string
      guardian_count: string
    }>()
}

export async function updateExplorer(
  studentId: number,
  patch: { username: string; email: string; isActive: boolean; passwordHash?: string },
) {
  const roleId = await roleIdByCode('user')
  await AppDataSource.getRepository(User).update(
    { id: studentId, roleId },
    {
      username: patch.username,
      email: patch.email,
      isActive: patch.isActive,
      ...(patch.passwordHash ? { passwordHash: patch.passwordHash } : {}),
    },
  )
}

export async function updateGuardian(
  guardianId: number,
  patch: { username: string; email: string; isActive: boolean; passwordHash?: string },
) {
  const roleId = await roleIdByCode('parent')
  await AppDataSource.getRepository(User).update(
    { id: guardianId, roleId },
    {
      username: patch.username,
      email: patch.email,
      isActive: patch.isActive,
      ...(patch.passwordHash ? { passwordHash: patch.passwordHash } : {}),
    },
  )
}

async function insertUser(
  manager: EntityManager,
  input: { username: string; email: string; passwordHash: string; roleCode: 'user' | 'parent' },
) {
  const roleId = await roleIdByCode(input.roleCode)
  const repo = manager.getRepository(User)
  const saved = await repo.save(
    repo.create({
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      roleId,
      isActive: true,
      xpTotal: 0,
    }),
  )
  return Number(saved.id)
}

async function ensureNotifyPrefs(manager: EntityManager, parentId: number) {
  await manager
    .getRepository(ParentNotifyPrefs)
    .createQueryBuilder()
    .insert()
    .into(ParentNotifyPrefs)
    .values({ parentId })
    .orIgnore()
    .execute()
}

async function activateLink(manager: EntityManager, parentId: number, studentId: number) {
  await manager
    .getRepository(ParentStudentLink)
    .createQueryBuilder()
    .insert()
    .into(ParentStudentLink)
    .values({ parentId, studentId, isActive: true })
    .orUpdate(['is_active'], ['parent_id', 'student_id'])
    .execute()
}

export async function createExplorerWithGuardian(input: {
  username: string
  email: string
  passwordHash: string
  parentIds: number[]
  newParent: { username: string; email: string; passwordHash: string } | null
}) {
  return AppDataSource.transaction(async (manager) => {
    const explorerId = await insertUser(manager, {
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      roleCode: 'user',
    })
    let guardianIds = input.parentIds
    if (input.newParent) {
      const guardianId = await insertUser(manager, {
        username: input.newParent.username,
        email: input.newParent.email,
        passwordHash: input.newParent.passwordHash,
        roleCode: 'parent',
      })
      await ensureNotifyPrefs(manager, guardianId)
      guardianIds = [guardianId]
    }
    for (const parentId of guardianIds) {
      await activateLink(manager, parentId, explorerId)
    }
    return explorerId
  })
}

export async function createGuardianWithExplorer(input: {
  username: string
  email: string
  passwordHash: string
  studentIds: number[]
  newStudent: { username: string; email: string; passwordHash: string } | null
}) {
  return AppDataSource.transaction(async (manager) => {
    const guardianId = await insertUser(manager, {
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      roleCode: 'parent',
    })
    await ensureNotifyPrefs(manager, guardianId)
    let explorerIds = input.studentIds
    if (input.newStudent) {
      const explorerId = await insertUser(manager, {
        username: input.newStudent.username,
        email: input.newStudent.email,
        passwordHash: input.newStudent.passwordHash,
        roleCode: 'user',
      })
      explorerIds = [explorerId]
    }
    for (const studentId of explorerIds) {
      await activateLink(manager, guardianId, studentId)
    }
    return guardianId
  })
}

export async function activateGuardianLink(parentId: number, studentId: number) {
  await activateLink(AppDataSource.manager, parentId, studentId)
}

export async function deactivateGuardianLink(parentId: number, studentId: number) {
  await AppDataSource.getRepository(ParentStudentLink).update(
    { parentId, studentId },
    { isActive: false },
  )
}

export async function listGuardianExplorers(guardianId: number) {
  const rows = await AppDataSource.getRepository(ParentStudentLink)
    .createQueryBuilder('l')
    .innerJoin(User, 'u', 'u.id = l.student_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.email', 'email')
    .addSelect('u.is_active', 'is_active')
    .addSelect('u.created_at', 'created_at')
    .where('l.parent_id = :guardianId AND l.is_active = TRUE', { guardianId })
    .orderBy('u.username', 'ASC')
    .getRawMany<{ id: number; username: string; email: string; is_active: boolean; created_at: Date }>()
  return rows
}

export async function listStudentGuardians(studentId: number, onlyParents: boolean) {
  const qb = AppDataSource.getRepository(ParentStudentLink)
    .createQueryBuilder('l')
    .innerJoin(User, 'u', 'u.id = l.parent_id')
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.email', 'email')
    .addSelect('u.is_active', 'is_active')
    .addSelect('u.created_at', 'created_at')
    .where('l.student_id = :studentId AND l.is_active = TRUE', { studentId })
    .orderBy('u.username', 'ASC')
  if (onlyParents) {
    qb.innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'parent'")
  }
  return qb.getRawMany<{
    id: number
    username: string
    email: string
    is_active: boolean
    created_at: Date
  }>()
}

export async function listGuardians() {
  return parents()
    .leftJoin(ParentStudentLink, 'l', 'l.parent_id = u.id')
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.email', 'email')
    .addSelect('u.is_active', 'is_active')
    .addSelect('u.created_at', 'created_at')
    .addSelect('COUNT(l.student_id) FILTER (WHERE l.is_active)', 'explorer_count')
    .groupBy('u.id')
    .addGroupBy('u.username')
    .addGroupBy('u.email')
    .addGroupBy('u.is_active')
    .addGroupBy('u.created_at')
    .orderBy('u.username', 'ASC')
    .getRawMany<{
      id: number
      username: string
      email: string
      is_active: boolean
      created_at: Date
      explorer_count: string
    }>()
}

export async function listCourses(studentId: number) {
  return AppDataSource.getRepository(Course).find({
    where: { userId: studentId },
    order: { isActive: 'DESC', name: 'ASC' },
  })
}

export async function findCourse(studentId: number, courseId: number) {
  return AppDataSource.getRepository(Course).findOne({
    where: { id: courseId, userId: studentId },
  })
}

export async function findCourseByName(studentId: number, name: string) {
  return AppDataSource.getRepository(Course).findOne({ where: { userId: studentId, name } })
}

export async function findOtherCourseByName(studentId: number, name: string, courseId: number) {
  return AppDataSource.getRepository(Course).findOne({
    where: { userId: studentId, name, id: Not(courseId) },
  })
}

export async function insertCourse(studentId: number, name: string) {
  const repo = AppDataSource.getRepository(Course)
  const saved = await repo.save(repo.create({ userId: studentId, name, isActive: true }))
  return Number(saved.id)
}

export async function updateCourse(
  studentId: number,
  courseId: number,
  patch: { name?: string; isActive?: boolean },
) {
  await AppDataSource.getRepository(Course).update({ id: courseId, userId: studentId }, patch)
}

export async function listActiveCourses(studentId: number, ids: number[]) {
  return AppDataSource.getRepository(Course).find({
    where: {
      userId: studentId,
      isActive: true,
      ...(ids.length > 0 ? { id: In(ids) } : {}),
    },
    order: { name: 'ASC' },
  })
}

function later(a: Date | string | null | undefined, b: Date | string | null | undefined) {
  if (a == null) return b ?? null
  if (b == null) return a
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b
}

export async function dashboardRoster(today: string, studentId: number | null) {
  const qb = explorers()
    .select('u.id', 'id')
    .addSelect('u.username', 'username')
    .addSelect('u.email', 'email')
    .addSelect('u.is_active', 'is_active')
    .addSelect('u.created_at', 'created_at')
    .addSelect(
      (sub) =>
        sub
          .select('COUNT(*)')
          .from(Course, 'c')
          .where('c.user_id = u.id AND c.is_active = TRUE'),
      'course_count',
    )
    .addSelect(
      (sub) => sub.select('COUNT(*)').from(Task, 't').where('t.user_id = u.id'),
      'tasks_total',
    )
    .addSelect(
      (sub) =>
        sub
          .select('COUNT(*)')
          .from(Task, 't')
          .where(`t.user_id = u.id AND t.status = 'done'`),
      'tasks_done',
    )
    .addSelect(
      (sub) =>
        sub
          .select('COUNT(*)')
          .from(Task, 't')
          .where(`t.user_id = u.id AND t.status <> 'done' AND t.due_date < :today`),
      'tasks_overdue',
    )
    .addSelect(
      (sub) =>
        sub
          .select('COUNT(*)')
          .from(StudyChallenge, 'ch')
          .where(`ch.user_id = u.id AND ch.status = 'completed'`),
      'challenges_completed',
    )
    .addSelect(
      (sub) =>
        sub
          .select('AVG(ch.score)')
          .from(StudyChallenge, 'ch')
          .where(`ch.user_id = u.id AND ch.status = 'completed'`),
      'avg_score',
    )
    .addSelect(
      (sub) =>
        sub
          .select('MAX(ss.updated_at)')
          .from(StudySession, 'ss')
          .innerJoin(Task, 't', 't.id = ss.task_id')
          .where('t.user_id = u.id'),
      'task_study_at',
    )
    .addSelect(
      (sub) =>
        sub
          .select('MAX(ms.updated_at)')
          .from(StudyMissionSession, 'ms')
          .innerJoin(StudyMission, 'm', 'm.id = ms.mission_id')
          .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
          .where('w.user_id = u.id'),
      'mission_study_at',
    )
    .setParameter('today', today)
    .orderBy('u.username', 'ASC')
  if (studentId != null) qb.andWhere('u.id = :studentId', { studentId })
  const rows = await qb.getRawMany<{
    id: number
    username: string
    email: string
    is_active: boolean
    created_at: Date
    course_count: string
    tasks_total: string
    tasks_done: string
    tasks_overdue: string
    challenges_completed: string
    avg_score: string | null
    task_study_at: Date | null
    mission_study_at: Date | null
  }>()
  return rows.map((row) => ({
    ...row,
    last_study_at: later(row.task_study_at, row.mission_study_at),
  }))
}

export async function studentHeadcounts(studentId: number | null) {
  const qb = explorers()
    .select('COUNT(*)', 'total')
    .addSelect(`SUM(CASE WHEN u.is_active = TRUE THEN 1 ELSE 0 END)`, 'active')
    .addSelect(`SUM(CASE WHEN u.is_active = FALSE THEN 1 ELSE 0 END)`, 'paused')
  if (studentId != null) qb.andWhere('u.id = :studentId', { studentId })
  const row = await qb.getRawOne<{ total: string; active: string; paused: string }>()
  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    paused: Number(row?.paused ?? 0),
  }
}

export async function taskHeadcounts(
  today: string,
  studentId: number | null,
  window: DateWindow,
) {
  const qb = AppDataSource.getRepository(Task)
    .createQueryBuilder('t')
    .innerJoin(User, 'u', 'u.id = t.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select(`SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END)`, 'pending')
    .addSelect(`SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END)`, 'in_progress')
    .addSelect(`SUM(CASE WHEN t.status = 'studying' THEN 1 ELSE 0 END)`, 'studying')
    .addSelect(`SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)`, 'done')
    .addSelect(
      `SUM(CASE WHEN t.status <> 'done' AND t.due_date < :today THEN 1 ELSE 0 END)`,
      'overdue',
    )
    .addSelect('COUNT(*)', 'total')
    .setParameter('today', today)
  applyWindow(qb, 't.created_at', window, 'taskHead')
  if (studentId != null) qb.andWhere('t.user_id = :studentId', { studentId })
  const row = await qb.getRawOne<{
    pending: string
    in_progress: string
    studying: string
    done: string
    overdue: string
    total: string
  }>()
  return {
    pending: Number(row?.pending ?? 0),
    in_progress: Number(row?.in_progress ?? 0),
    studying: Number(row?.studying ?? 0),
    done: Number(row?.done ?? 0),
    overdue: Number(row?.overdue ?? 0),
    total: Number(row?.total ?? 0),
  }
}

export async function activeWorldCount(studentId: number | null) {
  const qb = AppDataSource.getRepository(StudyWorld)
    .createQueryBuilder('w')
    .innerJoin(User, 'u', 'u.id = w.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select('COUNT(*)', 'c')
    .where('w.is_active = TRUE')
  if (studentId != null) qb.andWhere('w.user_id = :studentId', { studentId })
  const row = await qb.getRawOne<{ c: string }>()
  return Number(row?.c ?? 0)
}

export async function missionHeadcounts(studentId: number | null) {
  const qb = AppDataSource.getRepository(StudyMission)
    .createQueryBuilder('m')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .innerJoin(User, 'u', 'u.id = w.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select(`SUM(CASE WHEN m.status = 'pending' THEN 1 ELSE 0 END)`, 'pending')
    .addSelect(`SUM(CASE WHEN m.status = 'studying' THEN 1 ELSE 0 END)`, 'studying')
    .addSelect(`SUM(CASE WHEN m.status = 'mastered' THEN 1 ELSE 0 END)`, 'mastered')
    .addSelect('COUNT(*)', 'total')
    .where('m.is_active = TRUE AND w.is_active = TRUE')
  if (studentId != null) qb.andWhere('w.user_id = :studentId', { studentId })
  const row = await qb.getRawOne<{
    pending: string
    studying: string
    mastered: string
    total: string
  }>()
  return {
    pending: Number(row?.pending ?? 0),
    studying: Number(row?.studying ?? 0),
    mastered: Number(row?.mastered ?? 0),
    total: Number(row?.total ?? 0),
  }
}

export async function completedChallengeStats(studentId: number | null, window: DateWindow) {
  const qb = AppDataSource.getRepository(StudyChallenge)
    .createQueryBuilder('ch')
    .innerJoin(User, 'u', 'u.id = ch.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select('COUNT(*)', 'completed_count')
    .addSelect('AVG(ch.score)', 'avg_score')
    .where(`ch.status = 'completed'`)
  applyWindow(qb, 'ch.completed_at', window, 'chStats')
  if (studentId != null) qb.andWhere('ch.user_id = :studentId', { studentId })
  const row = await qb.getRawOne<{ completed_count: string; avg_score: string | null }>()
  return {
    completed_count: Number(row?.completed_count ?? 0),
    avg_score: row?.avg_score == null ? null : Number(row.avg_score),
  }
}

export async function countsByDay(
  kind: 'tasks' | 'challenges' | 'study_tasks' | 'study_missions',
  studentId: number | null,
  window: DateWindow,
) {
  if (kind === 'tasks') {
    const qb = AppDataSource.getRepository(Task)
      .createQueryBuilder('t')
      .innerJoin(User, 'u', 'u.id = t.user_id')
      .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    const expr = daySql('t.created_at', window.tz, 'dayTz')
    qb.select(expr, 'day').addSelect('COUNT(*)', 'c').groupBy(expr)
    applyWindow(qb, 't.created_at', window, 'day')
    if (studentId != null) qb.andWhere('t.user_id = :studentId', { studentId })
    return qb.getRawMany<{ day: string; c: string }>()
  }
  if (kind === 'challenges') {
    const qb = AppDataSource.getRepository(StudyChallenge)
      .createQueryBuilder('ch')
      .innerJoin(User, 'u', 'u.id = ch.user_id')
      .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
      .where(`ch.status = 'completed'`)
    const expr = daySql('ch.completed_at', window.tz, 'dayTz')
    qb.select(expr, 'day').addSelect('COUNT(*)', 'c').groupBy(expr)
    applyWindow(qb, 'ch.completed_at', window, 'day')
    if (studentId != null) qb.andWhere('ch.user_id = :studentId', { studentId })
    return qb.getRawMany<{ day: string; c: string }>()
  }
  if (kind === 'study_tasks') {
    const qb = AppDataSource.getRepository(StudySession)
      .createQueryBuilder('ss')
      .innerJoin(Task, 't', 't.id = ss.task_id')
      .innerJoin(User, 'u', 'u.id = t.user_id')
      .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    const expr = daySql('ss.updated_at', window.tz, 'dayTz')
    qb.select(expr, 'day').addSelect('COUNT(*)', 'c').groupBy(expr)
    applyWindow(qb, 'ss.updated_at', window, 'day')
    if (studentId != null) qb.andWhere('t.user_id = :studentId', { studentId })
    return qb.getRawMany<{ day: string; c: string }>()
  }
  const qb = AppDataSource.getRepository(StudyMissionSession)
    .createQueryBuilder('ms')
    .innerJoin(StudyMission, 'm', 'm.id = ms.mission_id')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .innerJoin(User, 'u', 'u.id = w.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
  const expr = daySql('ms.updated_at', window.tz, 'dayTz')
  qb.select(expr, 'day').addSelect('COUNT(*)', 'c').groupBy(expr)
  applyWindow(qb, 'ms.updated_at', window, 'day')
  if (studentId != null) qb.andWhere('w.user_id = :studentId', { studentId })
  return qb.getRawMany<{ day: string; c: string }>()
}

export async function countsByUser(
  kind: 'study_tasks' | 'study_missions' | 'tasks_done',
  studentId: number | null,
  window: DateWindow,
) {
  if (kind === 'study_tasks') {
    const qb = AppDataSource.getRepository(StudySession)
      .createQueryBuilder('ss')
      .innerJoin(Task, 't', 't.id = ss.task_id')
      .innerJoin(User, 'u', 'u.id = t.user_id')
      .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
      .select('t.user_id', 'user_id')
      .addSelect('COUNT(*)', 'c')
      .groupBy('t.user_id')
    applyWindow(qb, 'ss.updated_at', window, 'byUser')
    if (studentId != null) qb.andWhere('t.user_id = :studentId', { studentId })
    return qb.getRawMany<{ user_id: number; c: string }>()
  }
  if (kind === 'study_missions') {
    const qb = AppDataSource.getRepository(StudyMissionSession)
      .createQueryBuilder('ms')
      .innerJoin(StudyMission, 'm', 'm.id = ms.mission_id')
      .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
      .innerJoin(User, 'u', 'u.id = w.user_id')
      .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
      .select('w.user_id', 'user_id')
      .addSelect('COUNT(*)', 'c')
      .groupBy('w.user_id')
    applyWindow(qb, 'ms.updated_at', window, 'byUser')
    if (studentId != null) qb.andWhere('w.user_id = :studentId', { studentId })
    return qb.getRawMany<{ user_id: number; c: string }>()
  }
  const qb = AppDataSource.getRepository(Task)
    .createQueryBuilder('t')
    .innerJoin(User, 'u', 'u.id = t.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select('t.user_id', 'user_id')
    .addSelect('COUNT(*)', 'c')
    .where(`t.status = 'done'`)
    .groupBy('t.user_id')
  applyWindow(qb, 't.updated_at', window, 'byUser')
  if (studentId != null) qb.andWhere('t.user_id = :studentId', { studentId })
  return qb.getRawMany<{ user_id: number; c: string }>()
}

export async function challengesByUser(studentId: number | null, window: DateWindow) {
  const qb = AppDataSource.getRepository(StudyChallenge)
    .createQueryBuilder('ch')
    .innerJoin(User, 'u', 'u.id = ch.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .select('ch.user_id', 'user_id')
    .addSelect('COUNT(*)', 'c')
    .addSelect('AVG(ch.score)', 'avg_score')
    .where(`ch.status = 'completed'`)
    .groupBy('ch.user_id')
  applyWindow(qb, 'ch.completed_at', window, 'chUser')
  if (studentId != null) qb.andWhere('ch.user_id = :studentId', { studentId })
  return qb.getRawMany<{ user_id: number; c: string; avg_score: string | null }>()
}

export async function tutorMessageUsage(studentId: number | null, window: DateWindow) {
  const taskQb = AppDataSource.getRepository(StudyMessage)
    .createQueryBuilder('sm')
    .innerJoin(Task, 't', 't.id = sm.task_id')
    .innerJoin(User, 'u', 'u.id = t.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
  const taskExpr = daySql('sm.created_at', window.tz, 'msgTz')
  taskQb
    .select('t.user_id', 'user_id')
    .addSelect(taskExpr, 'day')
    .addSelect('sm.role', 'role')
    .addSelect('COUNT(*)', 'c')
    .addSelect('SUM(CHAR_LENGTH(sm.content))', 'chars')
    .groupBy('t.user_id')
    .addGroupBy(taskExpr)
    .addGroupBy('sm.role')
  applyWindow(taskQb, 'sm.created_at', window, 'msg')
  if (studentId != null) taskQb.andWhere('t.user_id = :studentId', { studentId })

  const missionQb = AppDataSource.getRepository(StudyMissionMessage)
    .createQueryBuilder('mm')
    .innerJoin(StudyMission, 'm', 'm.id = mm.mission_id')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .innerJoin(User, 'u', 'u.id = w.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
  const missionExpr = daySql('mm.created_at', window.tz, 'mmsgTz')
  missionQb
    .select('w.user_id', 'user_id')
    .addSelect(missionExpr, 'day')
    .addSelect('mm.role', 'role')
    .addSelect('COUNT(*)', 'c')
    .addSelect('SUM(CHAR_LENGTH(mm.content))', 'chars')
    .groupBy('w.user_id')
    .addGroupBy(missionExpr)
    .addGroupBy('mm.role')
  applyWindow(missionQb, 'mm.created_at', window, 'mmsg')
  if (studentId != null) missionQb.andWhere('w.user_id = :studentId', { studentId })

  const [tasks, missions] = await Promise.all([
    taskQb.getRawMany<{ user_id: number; day: string; role: string; c: string; chars: string }>(),
    missionQb.getRawMany<{ user_id: number; day: string; role: string; c: string; chars: string }>(),
  ])
  return [...tasks, ...missions]
}

export async function challengeActivity(
  mode: 'started' | 'completed',
  studentId: number | null,
  window: DateWindow,
) {
  const column = mode === 'started' ? 'ch.started_at' : 'ch.completed_at'
  const qb = AppDataSource.getRepository(StudyChallenge)
    .createQueryBuilder('ch')
    .innerJoin(User, 'u', 'u.id = ch.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
  const expr = daySql(column, window.tz, 'actTz')
  qb.select('ch.user_id', 'user_id')
    .addSelect(expr, 'day')
    .addSelect('COUNT(*)', 'c')
    .addSelect('SUM(ch.question_count)', 'q')
    .groupBy('ch.user_id')
    .addGroupBy(expr)
  if (mode === 'completed') qb.where(`ch.status = 'completed'`)
  applyWindow(qb, column, window, 'act')
  if (studentId != null) qb.andWhere('ch.user_id = :studentId', { studentId })
  return qb.getRawMany<{ user_id: number; day: string; c: string; q: string }>()
}

export async function llmUsageRows(studentId: number | null, window: DateWindow) {
  const qb = AppDataSource.getRepository(LlmUsage)
    .createQueryBuilder('lu')
    .innerJoin(User, 'u', 'u.id = lu.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
  const expr = daySql('lu.created_at', window.tz, 'llmTz')
  qb.select('lu.user_id', 'user_id')
    .addSelect(expr, 'day')
    .addSelect('lu.kind', 'kind')
    .addSelect('COUNT(*)', 'c')
    .addSelect('SUM(lu.prompt_tokens)', 'prompt')
    .addSelect('SUM(lu.output_tokens)', 'output')
    .addSelect('SUM(lu.total_tokens)', 'tokens')
    .groupBy('lu.user_id')
    .addGroupBy(expr)
    .addGroupBy('lu.kind')
  applyWindow(qb, 'lu.created_at', window, 'llm')
  if (studentId != null) qb.andWhere('lu.user_id = :studentId', { studentId })
  return qb.getRawMany<{
    user_id: number
    day: string
    kind: string
    c: string
    prompt: string
    output: string
    tokens: string
  }>()
}

export async function voiceMessageRows(studentId: number | null, window: DateWindow) {
  const taskQb = AppDataSource.getRepository(StudyMessage)
    .createQueryBuilder('sm')
    .innerJoin(Task, 't', 't.id = sm.task_id')
    .innerJoin(User, 'u', 'u.id = t.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .where(`sm.role = 'user' AND sm.from_voice = TRUE`)
  const taskExpr = daySql('sm.created_at', window.tz, 'voiceTz')
  taskQb
    .select('t.user_id', 'user_id')
    .addSelect(taskExpr, 'day')
    .addSelect('COUNT(*)', 'c')
    .addSelect('SUM(CHAR_LENGTH(sm.content))', 'chars')
    .groupBy('t.user_id')
    .addGroupBy(taskExpr)
  applyWindow(taskQb, 'sm.created_at', window, 'voice')
  if (studentId != null) taskQb.andWhere('t.user_id = :studentId', { studentId })

  const missionQb = AppDataSource.getRepository(StudyMissionMessage)
    .createQueryBuilder('mm')
    .innerJoin(StudyMission, 'm', 'm.id = mm.mission_id')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .innerJoin(User, 'u', 'u.id = w.user_id')
    .innerJoin(Role, 'r', "r.id = u.role_id AND r.code = 'user'")
    .where(`mm.role = 'user' AND mm.from_voice = TRUE`)
  const missionExpr = daySql('mm.created_at', window.tz, 'mvoiceTz')
  missionQb
    .select('w.user_id', 'user_id')
    .addSelect(missionExpr, 'day')
    .addSelect('COUNT(*)', 'c')
    .addSelect('SUM(CHAR_LENGTH(mm.content))', 'chars')
    .groupBy('w.user_id')
    .addGroupBy(missionExpr)
  applyWindow(missionQb, 'mm.created_at', window, 'mvoice')
  if (studentId != null) missionQb.andWhere('w.user_id = :studentId', { studentId })

  const [tasks, missions] = await Promise.all([
    taskQb.getRawMany<{ user_id: number; day: string; c: string; chars: string }>(),
    missionQb.getRawMany<{ user_id: number; day: string; c: string; chars: string }>(),
  ])
  return [...tasks, ...missions]
}

export async function studentTaskHeadcounts(studentId: number, today: string) {
  const row = await AppDataSource.getRepository(Task)
    .createQueryBuilder('t')
    .select(`SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END)`, 'pending')
    .addSelect(`SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END)`, 'in_progress')
    .addSelect(`SUM(CASE WHEN t.status = 'studying' THEN 1 ELSE 0 END)`, 'studying')
    .addSelect(`SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)`, 'done')
    .addSelect(
      `SUM(CASE WHEN t.status <> 'done' AND t.due_date < :today THEN 1 ELSE 0 END)`,
      'overdue',
    )
    .addSelect('COUNT(*)', 'total')
    .where('t.user_id = :studentId', { studentId })
    .setParameter('today', today)
    .getRawOne<{
      pending: string
      in_progress: string
      studying: string
      done: string
      overdue: string
      total: string
    }>()
  return {
    pending: Number(row?.pending ?? 0),
    in_progress: Number(row?.in_progress ?? 0),
    studying: Number(row?.studying ?? 0),
    done: Number(row?.done ?? 0),
    overdue: Number(row?.overdue ?? 0),
    total: Number(row?.total ?? 0),
  }
}

export async function recentStudentTasks(studentId: number) {
  return AppDataSource.getRepository(Task)
    .createQueryBuilder('t')
    .innerJoin(Course, 'c', 'c.id = t.course_id')
    .select('t.id', 'id')
    .addSelect('t.title', 'title')
    .addSelect('t.status', 'status')
    .addSelect('t.due_date', 'due_date')
    .addSelect('t.study_passed', 'study_passed')
    .addSelect('t.course_id', 'course_id')
    .addSelect('t.created_at', 'created_at')
    .addSelect('t.updated_at', 'updated_at')
    .addSelect('c.name', 'course_name')
    .where('t.user_id = :studentId', { studentId })
    .orderBy('t.updated_at', 'DESC')
    .addOrderBy('t.id', 'DESC')
    .limit(40)
    .getRawMany()
}

export async function studentWorldCount(studentId: number) {
  return AppDataSource.getRepository(StudyWorld).count({
    where: { userId: studentId, isActive: true },
  })
}

export async function studentMissionHeadcounts(studentId: number) {
  const row = await AppDataSource.getRepository(StudyMission)
    .createQueryBuilder('m')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .select(`SUM(CASE WHEN m.status = 'pending' THEN 1 ELSE 0 END)`, 'pending')
    .addSelect(`SUM(CASE WHEN m.status = 'studying' THEN 1 ELSE 0 END)`, 'studying')
    .addSelect(`SUM(CASE WHEN m.status = 'mastered' THEN 1 ELSE 0 END)`, 'mastered')
    .addSelect('COUNT(*)', 'total')
    .where('w.user_id = :studentId AND m.is_active = TRUE AND w.is_active = TRUE', { studentId })
    .getRawOne<{ pending: string; studying: string; mastered: string; total: string }>()
  return {
    pending: Number(row?.pending ?? 0),
    studying: Number(row?.studying ?? 0),
    mastered: Number(row?.mastered ?? 0),
    total: Number(row?.total ?? 0),
  }
}

export async function studentWorldSummaries(studentId: number) {
  return AppDataSource.getRepository(StudyWorld)
    .createQueryBuilder('w')
    .leftJoin(StudyMission, 'm', 'm.world_id = w.id AND m.is_active = TRUE')
    .select('w.id', 'id')
    .addSelect('w.title', 'title')
    .addSelect('COUNT(m.id)', 'mission_total')
    .addSelect(`SUM(CASE WHEN m.status = 'mastered' THEN 1 ELSE 0 END)`, 'mission_mastered')
    .addSelect(`SUM(CASE WHEN m.status = 'studying' THEN 1 ELSE 0 END)`, 'mission_studying')
    .where('w.user_id = :studentId AND w.is_active = TRUE', { studentId })
    .groupBy('w.id')
    .addGroupBy('w.title')
    .addGroupBy('w.updated_at')
    .orderBy('w.updated_at', 'DESC')
    .addOrderBy('w.id', 'DESC')
    .getRawMany<{
      id: number
      title: string
      mission_total: string
      mission_mastered: string
      mission_studying: string
    }>()
}

export async function studentCompletedChallengeStats(studentId: number) {
  const row = await AppDataSource.getRepository(StudyChallenge)
    .createQueryBuilder('ch')
    .select('COUNT(*)', 'completed_count')
    .addSelect('AVG(ch.score)', 'avg_score')
    .where(`ch.user_id = :studentId AND ch.status = 'completed'`, { studentId })
    .getRawOne<{ completed_count: string; avg_score: string | null }>()
  return {
    completed_count: Number(row?.completed_count ?? 0),
    avg_score: row?.avg_score == null ? null : Number(row.avg_score),
  }
}

export async function recentCompletedChallenges(studentId: number) {
  return AppDataSource.getRepository(StudyChallenge)
    .createQueryBuilder('ch')
    .innerJoin(StudyWorld, 'w', 'w.id = ch.world_id')
    .leftJoin(Course, 'c', 'c.id = ch.course_id')
    .leftJoin(StudyMission, 'm', 'm.id = ch.mission_id')
    .select('ch.id', 'id')
    .addSelect('ch.scope', 'scope')
    .addSelect('ch.difficulty', 'difficulty')
    .addSelect('ch.status', 'status')
    .addSelect('ch.score', 'score')
    .addSelect('ch.question_count', 'question_count')
    .addSelect('ch.world_id', 'world_id')
    .addSelect('ch.course_id', 'course_id')
    .addSelect('ch.mission_id', 'mission_id')
    .addSelect('ch.started_at', 'started_at')
    .addSelect('ch.completed_at', 'completed_at')
    .addSelect('w.title', 'world_title')
    .addSelect('c.name', 'course_name')
    .addSelect('m.title', 'mission_title')
    .where(`ch.user_id = :studentId AND ch.status = 'completed'`, { studentId })
    .orderBy('ch.completed_at', 'DESC')
    .addOrderBy('ch.id', 'DESC')
    .limit(5)
    .getRawMany()
}

export async function lastStudyAt(studentId: number) {
  const taskRow = await AppDataSource.getRepository(StudySession)
    .createQueryBuilder('ss')
    .innerJoin(Task, 't', 't.id = ss.task_id')
    .select('MAX(ss.updated_at)', 'last_at')
    .where('t.user_id = :studentId', { studentId })
    .getRawOne<{ last_at: Date | null }>()
  const missionRow = await AppDataSource.getRepository(StudyMissionSession)
    .createQueryBuilder('ms')
    .innerJoin(StudyMission, 'm', 'm.id = ms.mission_id')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .select('MAX(ms.updated_at)', 'last_at')
    .where('w.user_id = :studentId', { studentId })
    .getRawOne<{ last_at: Date | null }>()
  return later(taskRow?.last_at, missionRow?.last_at)
}

export async function listStudentTasks(
  studentId: number,
  filter: {
    tz: string
    createdFrom: string | null
    createdTo: string | null
    dueFrom: string | null
    dueTo: string | null
    status: string | null
    courseId: number | null
  },
) {
  const qb = AppDataSource.getRepository(Task)
    .createQueryBuilder('t')
    .innerJoin(Course, 'c', 'c.id = t.course_id')
    .select('t.id', 'id')
    .addSelect('t.title', 'title')
    .addSelect('t.status', 'status')
    .addSelect('t.due_date', 'due_date')
    .addSelect('t.study_passed', 'study_passed')
    .addSelect('t.course_id', 'course_id')
    .addSelect('t.created_at', 'created_at')
    .addSelect('t.updated_at', 'updated_at')
    .addSelect('c.name', 'course_name')
    .where('t.user_id = :studentId', { studentId })
  applyWindow(qb, 't.created_at', { tz: filter.tz, from: filter.createdFrom, to: filter.createdTo }, 'created')
  applyWindow(qb, 't.due_date', { tz: filter.tz, from: filter.dueFrom, to: filter.dueTo }, 'due')
  if (filter.status) qb.andWhere('t.status = :status', { status: filter.status })
  if (filter.courseId != null) qb.andWhere('t.course_id = :courseId', { courseId: filter.courseId })
  return qb.orderBy('t.due_date', 'DESC').addOrderBy('t.id', 'DESC').limit(200).getRawMany()
}

export async function listStudentStudy(
  studentId: number,
  filter: { tz: string; from: string | null; to: string | null; includeTask: boolean; includeMission: boolean },
) {
  const rows: Array<{
    kind: string
    ref_id: number
    title: string
    course_name: string
    phase: string
    summary: string | null
    updated_at: Date
  }> = []
  if (filter.includeTask) {
    const qb = AppDataSource.getRepository(StudySession)
      .createQueryBuilder('ss')
      .innerJoin(Task, 't', 't.id = ss.task_id')
      .innerJoin(Course, 'c', 'c.id = t.course_id')
      .select(`'task'`, 'kind')
      .addSelect('t.id', 'ref_id')
      .addSelect('t.title', 'title')
      .addSelect('c.name', 'course_name')
      .addSelect('ss.tutor_phase', 'phase')
      .addSelect('ss.topic_summary', 'summary')
      .addSelect('ss.updated_at', 'updated_at')
      .where('t.user_id = :studentId', { studentId })
    applyWindow(qb, 'ss.updated_at', filter, 'studyTask')
    rows.push(...(await qb.getRawMany()))
  }
  if (filter.includeMission) {
    const qb = AppDataSource.getRepository(StudyMissionSession)
      .createQueryBuilder('ms')
      .innerJoin(StudyMission, 'm', 'm.id = ms.mission_id')
      .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
      .innerJoin(Course, 'c', 'c.id = m.course_id')
      .select(`'mission'`, 'kind')
      .addSelect('m.id', 'ref_id')
      .addSelect('m.title', 'title')
      .addSelect('c.name', 'course_name')
      .addSelect('ms.tutor_phase', 'phase')
      .addSelect('ms.topic_summary', 'summary')
      .addSelect('ms.updated_at', 'updated_at')
      .where('w.user_id = :studentId', { studentId })
    applyWindow(qb, 'ms.updated_at', filter, 'studyMission')
    rows.push(...(await qb.getRawMany()))
  }
  return rows
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 200)
}

export async function listCompletedChallengesForStudent(
  studentId: number,
  window: DateWindow,
) {
  const qb = AppDataSource.getRepository(StudyChallenge)
    .createQueryBuilder('ch')
    .innerJoin(StudyWorld, 'w', 'w.id = ch.world_id')
    .leftJoin(Course, 'c', 'c.id = ch.course_id')
    .leftJoin(StudyMission, 'm', 'm.id = ch.mission_id')
    .select('ch.id', 'id')
    .addSelect('ch.scope', 'scope')
    .addSelect('ch.difficulty', 'difficulty')
    .addSelect('ch.status', 'status')
    .addSelect('ch.score', 'score')
    .addSelect('ch.question_count', 'question_count')
    .addSelect('ch.world_id', 'world_id')
    .addSelect('ch.course_id', 'course_id')
    .addSelect('ch.mission_id', 'mission_id')
    .addSelect('ch.started_at', 'started_at')
    .addSelect('ch.completed_at', 'completed_at')
    .addSelect('w.title', 'world_title')
    .addSelect('c.name', 'course_name')
    .addSelect('m.title', 'mission_title')
    .where(`ch.user_id = :studentId AND ch.status = 'completed'`, { studentId })
  applyWindow(qb, 'ch.completed_at', window, 'doneCh')
  return qb.orderBy('ch.completed_at', 'DESC').addOrderBy('ch.id', 'DESC').limit(200).getRawMany()
}

export async function worldsTreeSources(
  studentId: number,
  window: DateWindow,
  difficulty: string | null,
) {
  const worlds = await AppDataSource.getRepository(StudyWorld).find({
    where: { userId: studentId, isActive: true },
    order: { updatedAt: 'DESC', id: 'DESC' },
  })
  const courses = await AppDataSource.getRepository(StudyWorldCourse)
    .createQueryBuilder('wc')
    .innerJoin(StudyWorld, 'w', 'w.id = wc.world_id')
    .innerJoin(Course, 'c', 'c.id = wc.course_id')
    .select('wc.world_id', 'world_id')
    .addSelect('c.id', 'id')
    .addSelect('c.name', 'name')
    .addSelect('wc.sort_order', 'sort_order')
    .where('w.user_id = :studentId AND wc.is_active = TRUE AND w.is_active = TRUE', { studentId })
    .orderBy('wc.sort_order', 'ASC')
    .addOrderBy('c.name', 'ASC')
    .getRawMany<{ world_id: number; id: number; name: string; sort_order: number }>()
  const missions = await AppDataSource.getRepository(StudyMission)
    .createQueryBuilder('m')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .innerJoin(Course, 'c', 'c.id = m.course_id')
    .leftJoin(StudyMissionSession, 'ms', 'ms.mission_id = m.id')
    .select('m.id', 'id')
    .addSelect('m.world_id', 'world_id')
    .addSelect('m.course_id', 'course_id')
    .addSelect('m.title', 'title')
    .addSelect('m.status', 'status')
    .addSelect('m.sort_order', 'sort_order')
    .addSelect('m.updated_at', 'updated_at')
    .addSelect('c.name', 'course_name')
    .addSelect('ms.tutor_phase', 'phase')
    .addSelect('ms.topic_summary', 'summary')
    .addSelect('ms.updated_at', 'study_updated_at')
    .where('w.user_id = :studentId AND m.is_active = TRUE AND w.is_active = TRUE', { studentId })
    .orderBy('c.name', 'ASC')
    .addOrderBy('m.sort_order', 'ASC')
    .addOrderBy('m.id', 'ASC')
    .getRawMany()
  const challengesQb = AppDataSource.getRepository(StudyChallenge)
    .createQueryBuilder('ch')
    .innerJoin(StudyWorld, 'w', 'w.id = ch.world_id')
    .leftJoin(Course, 'c', 'c.id = ch.course_id')
    .leftJoin(StudyMission, 'm', 'm.id = ch.mission_id')
    .select('ch.id', 'id')
    .addSelect('ch.world_id', 'world_id')
    .addSelect('ch.course_id', 'course_id')
    .addSelect('ch.mission_id', 'mission_id')
    .addSelect('ch.scope', 'scope')
    .addSelect('ch.difficulty', 'difficulty')
    .addSelect('ch.status', 'status')
    .addSelect('ch.score', 'score')
    .addSelect('ch.question_count', 'question_count')
    .addSelect('ch.started_at', 'started_at')
    .addSelect('ch.completed_at', 'completed_at')
    .addSelect('w.title', 'world_title')
    .addSelect('c.name', 'course_name')
    .addSelect('m.title', 'mission_title')
    .where(`ch.user_id = :studentId AND ch.status IN ('completed', 'in_progress')`, { studentId })
  applyWindow(challengesQb, 'COALESCE(ch.completed_at, ch.started_at)', window, 'treeCh')
  if (difficulty) challengesQb.andWhere('ch.difficulty = :difficulty', { difficulty })
  const challenges = await challengesQb
    .orderBy('ch.completed_at', 'DESC')
    .addOrderBy('ch.started_at', 'DESC')
    .addOrderBy('ch.id', 'DESC')
    .getRawMany()
  return { worlds, courses, missions, challenges }
}

export async function listActiveWorldsWithMissions(studentId: number) {
  const worlds = await AppDataSource.getRepository(StudyWorld).find({
    where: { userId: studentId, isActive: true },
    order: { updatedAt: 'DESC', id: 'DESC' },
  })
  const missions = await AppDataSource.getRepository(StudyMission)
    .createQueryBuilder('m')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .innerJoin(Course, 'c', 'c.id = m.course_id')
    .select('m.id', 'id')
    .addSelect('m.world_id', 'world_id')
    .addSelect('m.title', 'title')
    .addSelect('m.status', 'status')
    .addSelect('m.updated_at', 'updated_at')
    .addSelect('c.name', 'course_name')
    .where('w.user_id = :studentId AND m.is_active = TRUE AND w.is_active = TRUE', { studentId })
    .orderBy('c.name', 'ASC')
    .addOrderBy('m.sort_order', 'ASC')
    .addOrderBy('m.id', 'ASC')
    .getRawMany()
  return { worlds, missions }
}
