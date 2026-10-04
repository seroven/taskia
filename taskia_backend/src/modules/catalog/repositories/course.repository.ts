import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import { Course } from '../../../infrastructure/database/entities/index.js'

export async function listActiveCourses(userId: number) {
  const rows = await AppDataSource.getRepository(Course).find({
    where: { userId, isActive: true },
    order: { name: 'ASC' },
    select: { id: true, name: true },
  })
  return rows.map((row) => ({ id: row.id, name: row.name }))
}
