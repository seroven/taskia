import { Router } from 'express'
import { requireAuth, requireStudent } from '../../middlewares/auth.middleware.js'
import { listCourses } from './controllers/course.controller.js'

const router = Router()

router.get('/', requireAuth, requireStudent, listCourses)

export default router
