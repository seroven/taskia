import { AppDataSource } from '../infrastructure/database/data-source.js'
import { Task, User, XpAward } from '../infrastructure/database/entities/index.js'
import { civilDayFromInstant } from '../infrastructure/database/civil-date.js'
import { AppError } from '../utils/helpers.js'

/** Zona de producto para semana XP y tope diario de tareas. */
export const PRODUCT_TZ = 'America/Lima'

export const XP_PER_LEVEL = 1000
export const XP_TASK_DONE_SIMPLE = 10
/** XP de estudio con Taskia (tarea diaria): effort 1–100 → este rango. */
export const XP_TASK_STUDY_MIN = 40
export const XP_TASK_STUDY_MAX = 200
/** XP de proyecto con Taskia: effort 1–100 → este rango (más alto: más complejo). */
export const XP_PROJECT_STUDY_MIN = 80
export const XP_PROJECT_STUDY_MAX = 350
export const MAX_TASKS_CREATED_PER_DAY = 20

export type XpSourceType =
  | 'task_done_simple'
  | 'task_study'
  | 'mission'
  | 'challenge'

export interface XpProgress {
  level: number
  xp_total: number
  xp_into_level: number
  xp_to_next: number
}

export interface XpAwardResult extends XpProgress {
  awarded: boolean
  xp_gained: number
}

const MISSION_BASE = 400

const CHALLENGE_BASE: Record<string, Record<string, number>> = {
  mission: { warm: 80, quest: 140, boss: 220 },
  course: { warm: 150, quest: 250, boss: 400 },
  world: { warm: 250, quest: 450, boss: 700 },
}

export function progressFromXpTotal(xpTotal: number): XpProgress {
  const total = Math.max(0, Math.floor(xpTotal))
  const level = 1 + Math.floor(total / XP_PER_LEVEL)
  const xp_into_level = total % XP_PER_LEVEL
  return {
    level,
    xp_total: total,
    xp_into_level,
    xp_to_next: XP_PER_LEVEL - xp_into_level,
  }
}

/** Lunes (YYYY-MM-DD) de la semana civil que contiene `instant` en America/Lima. */
export function weekStartMonday(instant: Date = new Date()): string {
  const civil = civilDayFromInstant(instant, PRODUCT_TZ)
  const [y, m, d] = civil.split('-').map(Number)
  const asUtc = Date.UTC(y!, m! - 1, d!)
  const dow = new Date(asUtc).getUTCDay()
  const daysSinceMonday = dow === 0 ? 6 : dow - 1
  const monday = new Date(asUtc - daysSinceMonday * 86_400_000)
  return monday.toISOString().slice(0, 10)
}

export function todayProductCivil(): string {
  return civilDayFromInstant(new Date(), PRODUCT_TZ)
}

/**
 * Normaliza effort_score de la IA: estricto, casi nunca 100.
 */
export function clampEffortScore(
  raw: unknown,
  opts: { passed: boolean; hasEvidence: boolean },
): number {
  let n = Number(raw)
  if (!Number.isFinite(n)) n = opts.passed ? 50 : 35
  n = Math.round(n)
  n = Math.min(100, Math.max(1, n))
  if (!opts.passed) n = Math.min(n, 40)
  if (!opts.hasEvidence) n = Math.min(n, 45)
  if (n > 95) n = 95
  if (n >= 86 && !opts.hasEvidence) n = Math.min(n, 65)
  return n
}

export function xpForTaskStudy(effortScore: number): number {
  const effort = Math.min(100, Math.max(1, Math.round(effortScore)))
  const span = XP_TASK_STUDY_MAX - XP_TASK_STUDY_MIN
  return Math.max(
    XP_TASK_STUDY_MIN,
    Math.min(XP_TASK_STUDY_MAX, Math.round(XP_TASK_STUDY_MIN + (span * effort) / 100)),
  )
}

export function xpForProjectStudy(effortScore: number): number {
  const effort = Math.min(100, Math.max(1, Math.round(effortScore)))
  const span = XP_PROJECT_STUDY_MAX - XP_PROJECT_STUDY_MIN
  return Math.max(
    XP_PROJECT_STUDY_MIN,
    Math.min(XP_PROJECT_STUDY_MAX, Math.round(XP_PROJECT_STUDY_MIN + (span * effort) / 100)),
  )
}

export function xpForMission(effortScore: number): number {
  return Math.max(1, Math.round((MISSION_BASE * effortScore) / 100))
}

/** esperado / tardado, entre 0,7 y 1,15. esperado = 90 s por pregunta. */
export function challengeTimeFactor(elapsedMs: number, questionCount: number): number {
  const expected = 90_000 * Math.max(1, questionCount)
  const elapsed = Math.max(1, elapsedMs)
  return Math.min(1.15, Math.max(0.7, expected / elapsed))
}

export function xpForChallenge(
  scope: string,
  difficulty: string,
  scorePercent: number,
  elapsedMs?: number,
  questionCount?: number,
): number {
  const base =
    CHALLENGE_BASE[scope]?.[difficulty] ?? CHALLENGE_BASE.mission!.quest!
  const performance = Math.min(1, Math.max(0, scorePercent / 100))
  const time =
    elapsedMs != null && questionCount != null
      ? challengeTimeFactor(elapsedMs, questionCount)
      : 1
  const raw = Math.floor(base * performance * time)
  const floor = Math.floor(base * 0.05)
  return Math.max(floor, raw, 1)
}

export async function countTasksCreatedToday(userId: number): Promise<number> {
  const day = todayProductCivil()
  const row = await AppDataSource.getRepository(Task)
    .createQueryBuilder('t')
    .select('COUNT(*)', 'c')
    .where('t.user_id = :userId', { userId })
    .andWhere(`to_char(t.created_at AT TIME ZONE :tz, 'YYYY-MM-DD') = :day`, {
      tz: PRODUCT_TZ,
      day,
    })
    .getRawOne<{ c: string | number }>()
  return Number(row?.c ?? 0)
}

export async function assertCanCreateTask(userId: number): Promise<void> {
  const count = await countTasksCreatedToday(userId)
  if (count >= MAX_TASKS_CREATED_PER_DAY) {
    throw new AppError(
      `Ya creaste ${MAX_TASKS_CREATED_PER_DAY} tareas hoy. Mañana puedes crear más.`,
    )
  }
}

export async function fetchUserProgress(userId: number): Promise<XpProgress> {
  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
    select: { id: true, xpTotal: true },
  })
  return progressFromXpTotal(Number(user?.xpTotal ?? 0))
}

function insertedRowCount(raw: unknown) {
  return Array.isArray(raw) ? raw.length : 0
}

/**
 * Inserta award idempotente y recalcula users.level / xp_total desde la suma.
 * Si el award ya existía, awarded=false y xp_gained=0.
 */
export async function awardXp(opts: {
  userId: number
  sourceType: XpSourceType
  sourceId: number
  amount: number
  effortScore?: number | null
  reason?: string | null
}): Promise<XpAwardResult> {
  const amount = Math.max(0, Math.floor(opts.amount))
  if (amount <= 0) {
    const progress = await fetchUserProgress(opts.userId)
    return { ...progress, awarded: false, xp_gained: 0 }
  }

  const weekStart = weekStartMonday()
  const effort =
    opts.effortScore == null
      ? null
      : Math.min(100, Math.max(1, Math.round(opts.effortScore)))

  return AppDataSource.transaction(async (manager) => {
    const inserted = await manager
      .getRepository(XpAward)
      .createQueryBuilder()
      .insert()
      .into(XpAward)
      .values({
        userId: opts.userId,
        sourceType: opts.sourceType,
        sourceId: opts.sourceId,
        amount,
        effortScore: effort,
        reason: opts.reason ?? null,
        weekStart,
      })
      .orIgnore()
      .execute()

    if (insertedRowCount(inserted.raw) === 0) {
      const user = await manager.getRepository(User).findOne({
        where: { id: opts.userId },
        select: { id: true, xpTotal: true },
      })
      const progress = progressFromXpTotal(Number(user?.xpTotal ?? 0))
      return { ...progress, awarded: false, xp_gained: 0 }
    }

    const sumRow = await manager
      .getRepository(XpAward)
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 's')
      .where('a.user_id = :userId', { userId: opts.userId })
      .getRawOne<{ s: string | number }>()
    const progress = progressFromXpTotal(Number(sumRow?.s ?? 0))
    await manager.getRepository(User).update(
      { id: opts.userId },
      { xpTotal: progress.xp_total, level: progress.level },
    )
    return { ...progress, awarded: true, xp_gained: amount }
  })
}

/** Al pasar a Listo sin ayuda de Taskia: 10 XP. */
export async function maybeAwardTaskDoneXp(opts: {
  userId: number
  taskId: number
  previousStatus: string
  nextStatus: string
  needsHelp: boolean
}): Promise<XpAwardResult | null> {
  if (opts.nextStatus !== 'done' || opts.previousStatus === 'done') return null
  if (opts.needsHelp) return null
  return awardXp({
    userId: opts.userId,
    sourceType: 'task_done_simple',
    sourceId: opts.taskId,
    amount: XP_TASK_DONE_SIMPLE,
    reason: 'Listo sin Taskia',
  })
}
