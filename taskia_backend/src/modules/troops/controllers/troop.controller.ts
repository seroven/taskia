import { asyncHandler } from '../../../middlewares/error.middleware.js'
import * as troopService from '../services/troop.service.js'

export const getMe = asyncHandler(async (req, res) => {
  res.json(await troopService.getMe(req))
})

export const getInbox = asyncHandler(async (req, res) => {
  res.json(await troopService.getInbox(req))
})

export const getRanking = asyncHandler(async (req, res) => {
  res.json(await troopService.getRanking(req))
})

export const getUniverse = asyncHandler(async (req, res) => {
  res.json(await troopService.getUniverse(req))
})

export const searchExplorers = asyncHandler(async (req, res) => {
  res.json(await troopService.searchExplorers(req))
})

export const createTroop = asyncHandler(async (req, res) => {
  res.json(await troopService.createTroop(req))
})

export const inviteExplorer = asyncHandler(async (req, res) => {
  res.json(await troopService.inviteExplorer(req))
})

export const requestJoin = asyncHandler(async (req, res) => {
  res.json(await troopService.requestJoin(req))
})

export const acceptInvite = asyncHandler(async (req, res) => {
  res.json(await troopService.acceptInvite(req))
})

export const rejectInvite = asyncHandler(async (req, res) => {
  res.json(await troopService.rejectInvite(req))
})

export const setCopilot = asyncHandler(async (req, res) => {
  res.json(await troopService.setCopilot(req))
})

export const kickMember = asyncHandler(async (req, res) => {
  res.json(await troopService.kickMember(req))
})

export const leaveTroop = asyncHandler(async (req, res) => {
  res.json(await troopService.leaveTroop(req))
})

export const generatePlanet = asyncHandler(async (req, res) => {
  res.json(await troopService.generatePlanet(req))
})

export const updatePlanet = asyncHandler(async (req, res) => {
  res.json(await troopService.updatePlanet(req))
})

export const getTroop = asyncHandler(async (req, res) => {
  res.json(await troopService.getTroop(req))
})
