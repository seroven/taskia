import type { Express } from 'express'
import authRoutes from '../modules/auth/auth.routes.js'
import coursesRoutes from '../modules/catalog/courses.routes.js'
import difficultiesRoutes from '../modules/catalog/difficulties.routes.js'
import tasksRoutes from '../modules/tasks/tasks.routes.js'
import studyRoutes from '../modules/study/study.routes.js'
import worldsRoutes from './worlds.js'
import adminRoutes from './admin.js'
import parentRoutes from '../modules/guardian/guardian.routes.js'
import troopsRoutes from '../modules/troops/troops.routes.js'
import filesRoutes from '../modules/files/files.routes.js'

/** Monta los routers. Los paths HTTP se quedan como están. */
export function registerRoutes(app: Express) {
  app.use('/auth', authRoutes)
  app.use('/courses', coursesRoutes)
  app.use('/difficulties', difficultiesRoutes)
  app.use('/tasks', tasksRoutes)
  app.use('/study', studyRoutes)
  app.use('/worlds', worldsRoutes)
  app.use('/troops', troopsRoutes)
  app.use('/files', filesRoutes)
  app.use('/admin', adminRoutes)
  app.use('/parent', parentRoutes)
}
