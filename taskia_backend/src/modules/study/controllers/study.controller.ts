import { asyncHandler } from '../../../middleware/error.middleware.js'
import * as studyService from '../services/study.service.js'

export const speak = asyncHandler(async (req, res) => {
  res.json(await studyService.speak(req.user!.id, req.body))
})

export const transcribe = asyncHandler(async (req, res) => {
  res.json(await studyService.transcribe(req.user!.id, req.body))
})

export const openSession = asyncHandler(async (req, res) => {
  res.json(await studyService.openSession(req.user!.id, Number(req.params.taskId)))
})

export const chat = asyncHandler(async (req, res) => {
  res.json(await studyService.chat(req.user!.id, Number(req.params.taskId), req.body))
})

export const voiceTurn = asyncHandler(async (req, res) => {
  res.json(await studyService.voiceTurn(req.user!.id, Number(req.params.taskId), req.body))
})
