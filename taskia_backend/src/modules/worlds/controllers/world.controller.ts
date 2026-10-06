import { asyncHandler } from '../../../middleware/error.middleware.js'
import * as challengeService from '../services/challenge.service.js'
import * as worldService from '../services/world.service.js'

export const listPresets = asyncHandler(async (_req, res) => {
  res.json(await challengeService.listPresets())
})

export const patchMission = asyncHandler(async (req, res) => {
  res.json(await worldService.patchMission(req.user!.id, Number(req.params.missionId), req.body))
})

export const removeMission = asyncHandler(async (req, res) => {
  res.json(await worldService.removeMission(req.user!.id, Number(req.params.missionId)))
})

export const openSession = asyncHandler(async (req, res) => {
  res.json(await worldService.openMissionSession(req.user!.id, Number(req.params.missionId)))
})

export const chat = asyncHandler(async (req, res) => {
  res.json(await worldService.chatMission(req.user!.id, Number(req.params.missionId), req.body))
})

export const startChallenge = asyncHandler(async (req, res) => {
  res.json(await challengeService.startChallenge(req.user!.id, req.body))
})

export const getChallenge = asyncHandler(async (req, res) => {
  res.json(await challengeService.getChallenge(req.user!.id, Number(req.params.challengeId)))
})

export const saveChallengeProgress = asyncHandler(async (req, res) => {
  res.json(
    await challengeService.saveChallengeProgress(
      req.user!.id,
      Number(req.params.challengeId),
      req.body,
    ),
  )
})

export const discardChallenge = asyncHandler(async (req, res) => {
  res.json(await challengeService.discardChallenge(req.user!.id, Number(req.params.challengeId)))
})

export const completeChallenge = asyncHandler(async (req, res) => {
  res.json(
    await challengeService.finishChallenge(req.user!.id, Number(req.params.challengeId), req.body),
  )
})

export const listWorlds = asyncHandler(async (req, res) => {
  res.json(await worldService.listWorlds(req.user!.id))
})

export const createWorld = asyncHandler(async (req, res) => {
  res.json(await worldService.createWorld(req.user!.id, req.body))
})

export const patchWorld = asyncHandler(async (req, res) => {
  res.json(await worldService.patchWorld(req.user!.id, Number(req.params.worldId), req.body))
})

export const removeWorld = asyncHandler(async (req, res) => {
  res.json(await worldService.removeWorld(req.user!.id, Number(req.params.worldId)))
})

export const listCourses = asyncHandler(async (req, res) => {
  res.json(await worldService.listCourses(req.user!.id, Number(req.params.worldId)))
})

export const addCourse = asyncHandler(async (req, res) => {
  res.json(await worldService.addCourse(req.user!.id, Number(req.params.worldId), req.body))
})

export const removeCourse = asyncHandler(async (req, res) => {
  res.json(
    await worldService.removeCourse(
      req.user!.id,
      Number(req.params.worldId),
      Number(req.params.courseId),
    ),
  )
})

export const listMissions = asyncHandler(async (req, res) => {
  res.json(
    await worldService.listCourseMissions(
      req.user!.id,
      Number(req.params.worldId),
      Number(req.params.courseId),
    ),
  )
})

export const createMission = asyncHandler(async (req, res) => {
  res.json(
    await worldService.createMission(
      req.user!.id,
      Number(req.params.worldId),
      Number(req.params.courseId),
      req.body,
    ),
  )
})

export const listImportable = asyncHandler(async (req, res) => {
  res.json(
    await worldService.listImportable(
      req.user!.id,
      Number(req.params.worldId),
      Number(req.params.courseId),
    ),
  )
})

export const importMissions = asyncHandler(async (req, res) => {
  res.json(
    await worldService.importMissions(
      req.user!.id,
      Number(req.params.worldId),
      Number(req.params.courseId),
      req.body,
    ),
  )
})

export const listChallenges = asyncHandler(async (req, res) => {
  res.json(
    await challengeService.listWorldChallenges(req.user!.id, Number(req.params.worldId), req.query),
  )
})
