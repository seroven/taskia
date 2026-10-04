import { asyncHandler } from '../../../middlewares/error.middleware.js'
import * as studyService from '../services/study.service.js'

export const transcribe = asyncHandler(async (req, res) => {
  res.json(await studyService.transcribe(req.user!.id, req.body))
})

export const openSession = asyncHandler(async (req, res) => {
  res.json(await studyService.openSession(req.user!.id, Number(req.params.taskId)))
})

export const saveBoard = asyncHandler(async (req, res) => {
  res.json(
    await studyService.saveTaskBoard(req.user!.id, Number(req.params.taskId), req.body),
  )
})

export const chat = asyncHandler(async (req, res) => {
  res.json(await studyService.chat(req.user!.id, Number(req.params.taskId), req.body))
})
