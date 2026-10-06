import { Router } from 'express'
import { requireAuth, requireStudent } from '../../middleware/auth.middleware.js'
import * as studyController from './controllers/study.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireStudent)

router.post('/transcribe', studyController.transcribe)
router.get('/:taskId', studyController.openSession)
router.post('/:taskId/chat', studyController.chat)

export default router
