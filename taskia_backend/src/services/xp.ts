import type { ResultSetHeader, RowDataPacket } from '../db/pool.js'
import { pool } from '../db/pool.js'
import { civilDayFromInstant } from '../db/civilDate.js'
import { AppError } from '../utils/helpers.js'

/** Zona de producto para semana XP y tope diario de tareas. */
export const PRODUCT_TZ = 'America/Lima'

export const XP_PER_LEVEL = 1000
export const XP_TASK_DONE_SIMPLE = 10
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

const TASK_STUDY_BASE: Record<string, number> = {
  low: 100,
  medium: 180,
  high: 320,
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

export function xpForTaskStudy(
  difficultyCode: string,
  effortScore: number,
): number {
  const base = TASK_STUDY_BASE[difficultyCode] ?? TASK_STUDY_BASE.medium!
  return Math.max(1, Math.round((base * effortScore) / 100))
}

export function xpForMission(effortScore: number): number {
  return Math.max(1, Math.round((MISSION_BASE * effortScore) / 100))
}

export function xpForChallenge(
  scope: string,
  difficulty: string,
  scorePercent: number,
): number {
  const base =
    CHALLENGE_BASE[scope]?.[difficulty] ?? CHALLENGE_BASE.mission!.quest!
  const performance = Math.min(1, Math.max(0, scorePercent / 100))
  const raw = Math.floor(base * performance)
  const floor = Math.floor(base * 0.05)
  return Math.max(floor, raw, 1)
}

export async function countTasksCreatedToday(userId: number): Promise<number> {
  const day = todayProductCivil()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM tasks
     WHERE user_id = ?
       AND to_char(created_at AT TIME ZONE ?, 'YYYY-MM-DD') = ?`,
    [userId, PRODUCT_TZ, day],
  )
  return Number(rows[0]?.c ?? 0)
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
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT xp_total FROM users WHERE id = ? LIMIT 1`,
    [userId],
  )
  return progressFromXpTotal(Number(rows[0]?.xp_total ?? 0))
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

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [header] = await conn.query<ResultSetHeader>(
      `INSERT INTO xp_awards
         (user_id, source_type, source_id, amount, effort_score, reason, week_start)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, source_type, source_id) DO NOTHING`,
      [
        opts.userId,
        opts.sourceType,
        opts.sourceId,
        amount,
        effort,
        opts.reason ?? null,
        weekStart,
      ],
    )

    if (header.affectedRows === 0) {
      await conn.commit()
      const progress = await fetchUserProgress(opts.userId)
      return { ...progress, awarded: false, xp_gained: 0 }
    }

    const [sumRows] = await conn.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM xp_awards WHERE user_id = ?`,
      [opts.userId],
    )
    const progress = progressFromXpTotal(Number(sumRows[0]?.s ?? 0))
    await conn.query(`UPDATE users SET xp_total = ?, level = ? WHERE id = ?`, [
      progress.xp_total,
      progress.level,
      opts.userId,
    ])
    await conn.commit()
    return { ...progress, awarded: true, xp_gained: amount }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/** Al pasar a Listo: 10 XP si no hubo estudio; si hubo visto, no paga de nuevo aquí. */
export async function maybeAwardTaskDoneXp(opts: {
  userId: number
  taskId: number
  previousStatus: string
  nextStatus: string
  studyPassed: boolean
}): Promise<XpAwardResult | null> {
  if (opts.nextStatus !== 'done' || opts.previousStatus === 'done') return null
  if (opts.studyPassed) return null
  return awardXp({
    userId: opts.userId,
    sourceType: 'task_done_simple',
    sourceId: opts.taskId,
    amount: XP_TASK_DONE_SIMPLE,
    reason: 'Listo sin estudio',
  })
}
