import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { sendAvatar } from './controllers/files.controller.js'

const router = Router()

router.get('/avatars/:file', requireAuth, sendAvatar)

export default router
