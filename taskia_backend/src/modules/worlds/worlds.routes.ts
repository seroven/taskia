import { Router } from 'express'
import { requireAuth, requireStudent } from '../../middleware/auth.middleware.js'
import * as worldController from './controllers/world.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireStudent)

router.get('/challenge-presets', worldController.listPresets)
router.patch('/missions/:missionId', worldController.patchMission)
router.delete('/missions/:missionId', worldController.removeMission)
router.get('/missions/:missionId/session', worldController.openSession)
router.put('/missions/:missionId/board', worldController.saveBoard)
router.post('/missions/:missionId/chat', worldController.chat)
router.post('/challenges/start', worldController.startChallenge)
router.get('/challenges/:challengeId', worldController.getChallenge)
router.patch('/challenges/:challengeId/progress', worldController.saveChallengeProgress)
router.delete('/challenges/:challengeId', worldController.discardChallenge)
router.post('/challenges/:challengeId/complete', worldController.completeChallenge)
router.get('/', worldController.listWorlds)
router.post('/', worldController.createWorld)
router.patch('/:worldId', worldController.patchWorld)
router.delete('/:worldId', worldController.removeWorld)
router.get('/:worldId/courses', worldController.listCourses)
router.post('/:worldId/courses', worldController.addCourse)
router.delete('/:worldId/courses/:courseId', worldController.removeCourse)
router.get('/:worldId/courses/:courseId/missions', worldController.listMissions)
router.post('/:worldId/courses/:courseId/missions', worldController.createMission)
router.get('/:worldId/courses/:courseId/importable', worldController.listImportable)
router.post('/:worldId/courses/:courseId/import', worldController.importMissions)
router.get('/:worldId/challenges', worldController.listChallenges)

export default router
