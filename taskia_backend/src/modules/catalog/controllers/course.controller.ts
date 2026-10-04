import { asyncHandler } from '../../../middleware/error.middleware.js'
import { listActiveCourses } from '../repositories/course.repository.js'

export const listCourses = asyncHandler(async (req, res) => {
  res.json(await listActiveCourses(req.user!.id))
})
