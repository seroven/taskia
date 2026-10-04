import { Router } from 'express'
import { requireAdmin, requireAuth } from '../../middleware/auth.middleware.js'
import * as adminController from './controllers/admin.controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireAdmin)

router.get('/dashboard', adminController.dashboard)
router.get('/students', adminController.listStudents)
router.post('/students', adminController.createStudent)
router.patch('/students/:studentId', adminController.patchStudent)
router.get('/students/:studentId/courses', adminController.studentCourses)
router.post('/students/:studentId/courses', adminController.addCourse)
router.post('/students/:studentId/courses/import', adminController.importCourses)
router.patch('/students/:studentId/courses/:courseId', adminController.patchCourse)
router.delete('/students/:studentId/courses/:courseId', adminController.archiveCourse)
router.get('/students/:studentId/overview', adminController.overview)
router.get('/students/:studentId/tasks', adminController.tasks)
router.get('/students/:studentId/study', adminController.study)
router.get('/students/:studentId/challenges', adminController.challenges)
router.get('/students/:studentId/challenges/:challengeId', adminController.challenge)
router.get('/students/:studentId/worlds-tree', adminController.worldsTree)
router.get('/students/:studentId/worlds', adminController.worlds)
router.get('/parents', adminController.listGuardians)
router.post('/parents', adminController.createGuardian)
router.get('/parents/:parentId', adminController.guardian)
router.patch('/parents/:parentId', adminController.patchGuardian)
router.post('/parents/:parentId/students/:studentId', adminController.linkFromGuardian)
router.delete('/parents/:parentId/students/:studentId', adminController.unlinkFromGuardian)
router.get('/students/:studentId/parents', adminController.studentGuardians)
router.post('/students/:studentId/parents/:parentId', adminController.linkFromStudent)
router.delete('/students/:studentId/parents/:parentId', adminController.unlinkFromStudent)

export default router
