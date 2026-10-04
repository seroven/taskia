import type { ResultSetHeader, RowDataPacket } from '../../../infrastructure/database/pool.js'
import { pool } from '../../../infrastructure/database/pool.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { formatCivilDate, toInstantISO } from '../../../utils/helpers.js'

const TASK_SELECT = `
  SELECT
    t.id, t.user_id, t.course_id, c.name AS course_name,
    t.difficulty_id, d.code AS difficulty_code, d.name AS difficulty_name,
    t.title, t.description, t.task_kind, t.status, t.board_order,
    t.study_passed, t.uses_board, t.study_mode_chosen, t.due_date, t.created_at, t.updated_at
  FROM tasks t
  INNER JOIN courses c ON c.id = t.course_id
  INNER JOIN difficulties d ON d.id = t.difficulty_id
`

export function mapTask(row: RowDataPacket) {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    course_id: Number(row.course_id),
    course_name: row.course_name as string,
    difficulty_id: Number(row.difficulty_id),
    difficulty_code: row.difficulty_code as string,
    difficulty_name: row.difficulty_name as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    task_kind: row.task_kind as string,
    status: row.status as string,
    board_order: Number(row.board_order),
    study_passed: Boolean(row.study_passed),
    uses_board: Number(row.uses_board) !== 0,
    study_mode_chosen: Number(row.study_mode_chosen) !== 0,
    due_date: formatCivilDate(row.due_date as Date | string),
    created_at: toInstantISO(row.created_at as Date) ?? '',
    updated_at: toInstantISO(row.updated_at as Date) ?? '',
  }
}

export type TaskRecord = ReturnType<typeof mapTask>

export async function findTask(taskId: number, userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${TASK_SELECT} WHERE t.id = ? AND t.user_id = ? LIMIT 1`,
    [taskId, userId],
  )
  return rows[0] ? mapTask(rows[0]) : null
}

export async function listTasks(sql: string, params: unknown[]) {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  return rows.map(mapTask)
}

export function taskListSql() {
  return `${TASK_SELECT} WHERE t.user_id = ?`
}

export async function findOwnedCourse(courseId: number, userId: number, mustBeActive: boolean) {
  const [rows] = await pool.query<RowDataPacket[]>(
    mustBeActive
      ? 'SELECT id FROM courses WHERE id = ? AND user_id = ? AND is_active = 1 LIMIT 1'
      : 'SELECT id FROM courses WHERE id = ? AND user_id = ? LIMIT 1',
    [courseId, userId],
  )
  return rows[0] ?? null
}

export async function findDifficulty(difficultyId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, code FROM difficulties WHERE id = ? LIMIT 1',
    [difficultyId],
  )
  return rows[0] ?? null
}

export async function nextBoardOrder(userId: number, status: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT MAX(board_order) AS m FROM tasks WHERE user_id = ? AND status = ?`,
    [userId, status],
  )
  return rows[0]?.m == null ? 0 : Number(rows[0].m) + 1
}

export async function insertTask(values: unknown[]) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO tasks (
      user_id, course_id, difficulty_id, title, description,
      task_kind, status, board_order, uses_board, due_date
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    values,
  )
  return result.insertId
}

export async function updateTask(values: unknown[]) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE tasks SET title = ?, description = ?, course_id = ?, difficulty_id = ?,
      task_kind = ?, due_date = ?, status = ?, board_order = ?, uses_board = ?,
      study_mode_chosen = ?
     WHERE id = ? AND user_id = ?`,
    values,
  )
  return result.affectedRows
}

export async function moveTask(status: string, boardOrder: number, taskId: number, userId: number) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE tasks SET status = ?, board_order = ? WHERE id = ? AND user_id = ?`,
    [status, boardOrder, taskId, userId],
  )
  return result.affectedRows
}

export async function reorderInTransaction(
  userId: number,
  items: Array<{ taskId: number; status: string; boardOrder: number }>,
  assertCanChange: (current: TaskRecord, nextStatus: string) => void,
) {
  const conn = await pool.getConnection()
  const doneAwards: Array<{
    taskId: number
    previousStatus: string
    nextStatus: string
    studyPassed: boolean
  }> = []
  try {
    await conn.beginTransaction()
    for (const item of items) {
      const [rows] = await conn.query<RowDataPacket[]>(
        `${TASK_SELECT} WHERE t.id = ? AND t.user_id = ? LIMIT 1`,
        [item.taskId, userId],
      )
      if (!rows[0]) throw new AppError(`Tarea ${item.taskId} no encontrada`, 404)
      const current = mapTask(rows[0])
      assertCanChange(current, item.status)
      await conn.query(
        `UPDATE tasks SET status = ?, board_order = ? WHERE id = ? AND user_id = ?`,
        [item.status, item.boardOrder, item.taskId, userId],
      )
      doneAwards.push({
        taskId: item.taskId,
        previousStatus: current.status,
        nextStatus: item.status,
        studyPassed: current.study_passed,
      })
    }
    await conn.commit()
    return doneAwards
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
