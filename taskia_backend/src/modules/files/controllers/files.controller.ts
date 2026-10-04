import { avatarFilePath } from '../../../infrastructure/storage/local-file-storage.js'
import { asyncHandler } from '../../../middleware/error.middleware.js'

export const sendAvatar = asyncHandler(async (req, res) => {
  const file = String(req.params.file ?? '')
  const full = avatarFilePath(file)
  res.sendFile(full)
})
