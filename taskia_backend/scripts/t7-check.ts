import 'reflect-metadata'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { Course, StudyWorld, StudyWorldCourse, User } from '../src/infrastructure/database/entities/index.js'
import { listChallengePresets } from '../src/modules/worlds/repositories/world.repository.js'
import { listWorlds } from '../src/modules/worlds/services/world.service.js'

async function main() {
  await initDataSource()
  const presets = await listChallengePresets()
  const scopes = new Set(presets.map((preset) => preset.scope))
  if (!scopes.has('mission') || !scopes.has('course') || !scopes.has('world')) {
    throw new Error('Faltan alcances en los presets')
  }
  if (!presets.some((preset) => preset.difficulty === 'quest' && preset.question_count > 0)) {
    throw new Error('El preset quest no tiene preguntas')
  }

  const courseOwner = await AppDataSource.getRepository(Course).findOne({
    where: { isActive: true },
    order: { id: 'ASC' },
  })
  const user = courseOwner
    ? await AppDataSource.getRepository(User).findOneByOrFail({ id: courseOwner.userId })
    : await AppDataSource.getRepository(User).findOne({ where: {}, order: { id: 'ASC' } })
  if (!user) throw new Error('No hay usuarios')
  const worlds = await listWorlds(user.id)
  if (!Array.isArray(worlds)) throw new Error('El listado de mundos no es un array')

  const marker = `t7-check-${Date.now()}`
  let createdId = 0
  try {
    await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(StudyWorld)
      const saved = await repo.save(
        repo.create({ userId: user.id, title: marker, description: 'rollback' }),
      )
      createdId = Number(saved.id)
      const again = await repo.findOneBy({ id: createdId })
      if (!again || again.title !== marker || again.isActive !== true) {
        throw new Error('El mundo de prueba no se leyó')
      }
      const course = courseOwner && courseOwner.userId === user.id ? courseOwner : null
      if (course) {
        const links = manager.getRepository(StudyWorldCourse)
        await links
          .createQueryBuilder()
          .insert()
          .into(StudyWorldCourse)
          .values({
            worldId: createdId,
            courseId: course.id,
            userId: user.id,
            sortOrder: 0,
            isActive: true,
          })
          .orUpdate(['is_active'], ['world_id', 'course_id'])
          .execute()
        await links.update({ worldId: createdId, courseId: course.id }, { isActive: false })
        await links
          .createQueryBuilder()
          .insert()
          .into(StudyWorldCourse)
          .values({
            worldId: createdId,
            courseId: course.id,
            userId: user.id,
            sortOrder: 3,
            isActive: true,
          })
          .orUpdate(['is_active'], ['world_id', 'course_id'])
          .execute()
        const linked = await links.findOneBy({ worldId: createdId, courseId: course.id })
        if (!linked?.isActive) throw new Error('La materia no se reactivó')
      }
      throw new Error('rollback')
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'rollback') throw error
  }

  const leaked = await AppDataSource.getRepository(StudyWorld).findOne({ where: { title: marker } })
  if (leaked) throw new Error('El mundo de prueba quedó guardado')

  console.log(
    JSON.stringify({
      userId: user.id,
      presets: presets.length,
      worlds: worlds.length,
      rolledBack: createdId,
    }),
  )
  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
