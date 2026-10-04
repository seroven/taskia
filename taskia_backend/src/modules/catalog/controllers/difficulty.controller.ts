import { asyncHandler } from '../../../middleware/error.middleware.js'
import { listDifficulties } from '../repositories/difficulty.repository.js'

export const list = asyncHandler(async (_req, res) => {
  res.json(await listDifficulties())
})
