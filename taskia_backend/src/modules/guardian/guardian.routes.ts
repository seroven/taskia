import { Router } from 'express'
import { requireAuth, requireParent } from '../../middleware/auth.middleware.js'
import * as guardianController from './controllers/guardian.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireParent)

router.get('/explorers', guardianController.listExplorers)
router.get('/explorers/:studentId/overview', guardianController.overview)
router.get('/notify-prefs', guardianController.getNotifyPrefs)
router.patch('/notify-prefs', guardianController.updateNotifyPrefs)
router.get('/explorers/:studentId/chat', guardianController.listChat)
router.post('/explorers/:studentId/chat', guardianController.sendChat)

export default router
