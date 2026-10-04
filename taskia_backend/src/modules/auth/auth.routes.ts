import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import * as authController from './controllers/auth.controller.js'

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.get('/me', requireAuth, authController.me)
router.patch('/me/avatar', requireAuth, authController.updateAvatar)
router.patch('/me', requireAuth, authController.updateProfile)

export default router
