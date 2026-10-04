import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import { Difficulty } from '../../../infrastructure/database/entities/index.js'

export async function listDifficulties() {
  const rows = await AppDataSource.getRepository(Difficulty).find({
    order: { sortOrder: 'ASC', id: 'ASC' },
  })
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    sort_order: row.sortOrder,
  }))
}
