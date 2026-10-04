import { AppDataSource } from './data-source.js'
import { Role } from './entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import type { UserRole } from '../../utils/helpers.js'

const CACHE = new Map<UserRole, number>()

export async function roleIdByCode(code: UserRole): Promise<number> {
  const hit = CACHE.get(code)
  if (hit != null) return hit
  const role = await AppDataSource.getRepository(Role).findOne({ where: { code } })
  const id = role?.id
  if (id == null || !Number.isFinite(id)) {
    throw new AppError(`Rol no configurado: ${code}`, 500)
  }
  CACHE.set(code, id)
  return id
}
