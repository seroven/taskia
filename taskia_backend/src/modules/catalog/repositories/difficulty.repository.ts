import type { RowDataPacket } from '../../../infrastructure/database/pool.js'
import { pool } from '../../../infrastructure/database/pool.js'

export async function listDifficulties() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, code, name, sort_order FROM difficulties ORDER BY sort_order ASC, id ASC`,
  )
  return rows.map((row) => ({
    id: Number(row.id),
    code: row.code,
    name: row.name,
    sort_order: Number(row.sort_order),
  }))
}
