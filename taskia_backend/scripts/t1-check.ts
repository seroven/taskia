import 'reflect-metadata'
import { initDataSource, AppDataSource } from '../src/infrastructure/database/data-source.js'
import { roleIdByCode } from '../src/infrastructure/database/roles.js'
import { findLoginByUsername } from '../src/modules/auth/repositories/user.repository.js'
import { listDifficulties } from '../src/modules/catalog/repositories/difficulty.repository.js'
import { listActiveCourses } from '../src/modules/catalog/repositories/course.repository.js'

async function main() {
  await initDataSource()
  const login = await findLoginByUsername('Sebastian')
  const difficulties = await listDifficulties()
  const courses = login ? await listActiveCourses(login.id) : []
  const roleId = await roleIdByCode('user')
  if (!login) throw new Error('No está el usuario Sebastian')
  if (typeof login.id !== 'number') throw new Error('id no es número')
  if (!login.password_hash) throw new Error('falta password_hash')
  if (typeof login.is_active !== 'boolean') throw new Error('is_active no es boolean')
  if (login.role !== 'admin') throw new Error(`rol inesperado: ${login.role}`)
  if (difficulties.length < 3) throw new Error('faltan dificultades')
  if (!Number.isFinite(roleId)) throw new Error('rol user sin id')
  console.log(
    JSON.stringify({
      id: login.id,
      role: login.role,
      active: login.is_active,
      difficulties: difficulties.map((d) => d.code),
      courses: courses.length,
      roleId,
    }),
  )
  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
