import { asyncHandler } from '../../../middleware/error.middleware.js'
import { viewerDates } from '../../../infrastructure/database/civil-date.js'
import * as taskService from '../services/task.service.js'

export const list = asyncHandler(async (req, res) => {
  res.json(await taskService.listTasks(req.user!.id, req.query))
})

export const create = asyncHandler(async (req, res) => {
  res.json(await taskService.createTask(req.user!.id, req.body, viewerDates(req).today))
})

export const update = asyncHandler(async (req, res) => {
  res.json(
    await taskService.updateTask(
      req.user!.id,
      Number(req.params.id),
      req.body,
      viewerDates(req).today,
    ),
  )
})

export const move = asyncHandler(async (req, res) => {
  res.json(await taskService.moveTask(req.user!.id, req.body))
})

export const reorder = asyncHandler(async (req, res) => {
  res.json(await taskService.reorderTasks(req.user!.id, req.body))
})
