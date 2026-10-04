import { viewerDates } from '../../../infrastructure/database/civil-date.js'
import { asyncHandler } from '../../../middleware/error.middleware.js'
import * as guardianService from '../services/guardian.service.js'

export const listExplorers = asyncHandler(async (req, res) => {
  res.json(await guardianService.listExplorers(req.user!.id))
})

export const overview = asyncHandler(async (req, res) => {
  res.json(
    await guardianService.explorerOverview(
      req.user!.id,
      Number(req.params.studentId),
      viewerDates(req).today,
    ),
  )
})

export const getNotifyPrefs = asyncHandler(async (req, res) => {
  res.json(await guardianService.getNotifyPrefs(req.user!.id))
})

export const updateNotifyPrefs = asyncHandler(async (req, res) => {
  res.json(await guardianService.updateNotifyPrefs(req.user!.id, req.body))
})

export const listChat = asyncHandler(async (req, res) => {
  res.json(
    await guardianService.listChat(
      req.user!.id,
      Number(req.params.studentId),
      viewerDates(req).today,
    ),
  )
})

export const sendChat = asyncHandler(async (req, res) => {
  res.json(
    await guardianService.sendChat(
      req.user!.id,
      Number(req.params.studentId),
      req.body,
      viewerDates(req).today,
    ),
  )
})
