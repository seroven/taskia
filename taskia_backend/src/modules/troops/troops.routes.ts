import { Router } from 'express'
import { requireAuth, requireStudent } from '../../middlewares/auth.middleware.js'
import * as troopController from './controllers/troop.controller.js'

const router = Router()

router.use(requireAuth, requireStudent)

router.get('/me', troopController.getMe)
router.get('/inbox', troopController.getInbox)
router.get('/ranking', troopController.getRanking)
router.get('/universe', troopController.getUniverse)
router.get('/search', troopController.searchExplorers)
router.post('/', troopController.createTroop)
router.post('/invites', troopController.inviteExplorer)
router.post('/:id/request', troopController.requestJoin)
router.post('/invites/:id/accept', troopController.acceptInvite)
router.post('/invites/:id/reject', troopController.rejectInvite)
router.post('/copilot', troopController.setCopilot)
router.delete('/members/:memberUserId', troopController.kickMember)
router.post('/leave', troopController.leaveTroop)
router.post('/planet/generate', troopController.generatePlanet)
router.patch('/planet', troopController.updatePlanet)
router.get('/:id', troopController.getTroop)

export default router
