import type { RowDataPacket } from '../../../infrastructure/database/pool.js'
import { pool } from '../../../infrastructure/database/pool.js'

export async function listActiveCourses(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name FROM courses
     WHERE user_id = ? AND is_active = 1
     ORDER BY name ASC`,
    [userId],
  )
  return rows.map((row) => ({ id: Number(row.id), name: row.name }))
}
