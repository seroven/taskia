import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { avatarFilePath } from '../services/files.js'

const router = Router()

router.get(
  '/avatars/:file',
  requireAuth,
  asyncHandler(async (req, res) => {
    const file = String(req.params.file ?? '')
    const full = avatarFilePath(file)
    res.sendFile(full)
  }),
)

export default router
