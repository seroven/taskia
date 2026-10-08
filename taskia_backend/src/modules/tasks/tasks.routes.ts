import { Router } from 'express'
import { requireAuth, requireStudent } from '../../middleware/auth.middleware.js'
import * as taskController from './controllers/task.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireStudent)

router.get('/', taskController.list)
router.post('/', taskController.create)
router.patch('/:id', taskController.update)
router.post('/:id/complete', taskController.complete)

export default router
