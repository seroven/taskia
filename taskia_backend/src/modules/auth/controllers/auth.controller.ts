import {
  clearAuthCookie,
  setAuthCookie,
  signToken,
} from '../../../middleware/auth.middleware.js'
import { asyncHandler } from '../../../middleware/error.middleware.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { parseLoginBody, parseProfileBody, readAvatarBody } from '../schemas/auth.schema.js'
import * as authService from '../services/auth.service.js'

export const register = asyncHandler(async () => {
  throw new AppError('Las cuentas las crea un adulto. Pídele que te registre.', 403)
})

export const login = asyncHandler(async (req, res) => {
  const input = parseLoginBody(req.body)
  const user = await authService.login(input.username, input.password)
  setAuthCookie(res, signToken(user))
  res.json(user)
})

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

export const me = asyncHandler(async (req, res) => {
  res.json(await authService.currentUser(req.user!.id))
})

export const updateAvatar = asyncHandler(async (req, res) => {
  const user = await authService.updateAvatar(req.user!, readAvatarBody(req.body))
  res.json(user)
})

export const updateProfile = asyncHandler(async (req, res) => {
  const input = parseProfileBody(req.body, req.user!)
  const user = await authService.updateProfile(req.user!, input)
  res.json(user)
})
