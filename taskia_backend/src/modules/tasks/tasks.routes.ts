import { Router } from 'express'
import { requireAuth, requireStudent } from '../../middlewares/auth.middleware.js'
import * as taskController from './controllers/task.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireStudent)

router.get('/', taskController.list)
router.post('/', taskController.create)
router.patch('/:id', taskController.update)
router.post('/move', taskController.move)
router.post('/reorder', taskController.reorder)

export default router
