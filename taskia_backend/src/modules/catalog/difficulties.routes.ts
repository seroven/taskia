import { Router } from 'express'
import { requireAuth, requireStudent } from '../../middlewares/auth.middleware.js'
import { list } from './controllers/difficulty.controller.js'

const router = Router()

router.get('/', requireAuth, requireStudent, list)

export default router