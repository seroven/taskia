import { asyncHandler } from '../../../middleware/error.middleware.js'
import * as adminService from '../services/admin.service.js'

const view = (req: { query: unknown; headers: unknown }) => ({
  query: req.query as Record<string, unknown>,
  headers: req.headers as import('node:http').IncomingHttpHeaders,
})

export const dashboard = asyncHandler(async (req, res) => {
  res.json(await adminService.dashboard(view(req)))
})

export const listStudents = asyncHandler(async (_req, res) => {
  res.json(await adminService.listAllStudents())
})

export const createStudent = asyncHandler(async (req, res) => {
  res.json(await adminService.createStudent(req.body))
})

export const patchStudent = asyncHandler(async (req, res) => {
  res.json(await adminService.patchStudent(Number(req.params.studentId), req.body))
})

export const studentCourses = asyncHandler(async (req, res) => {
  res.json(await adminService.studentCourses(Number(req.params.studentId)))
})

export const addCourse = asyncHandler(async (req, res) => {
  res.json(await adminService.addStudentCourse(Number(req.params.studentId), req.body))
})

export const importCourses = asyncHandler(async (req, res) => {
  res.json(await adminService.importStudentCourses(Number(req.params.studentId), req.body))
})

export const patchCourse = asyncHandler(async (req, res) => {
  res.json(
    await adminService.patchStudentCourse(
      Number(req.params.studentId),
      Number(req.params.courseId),
      req.body,
    ),
  )
})

export const archiveCourse = asyncHandler(async (req, res) => {
  res.json(
    await adminService.archiveStudentCourse(Number(req.params.studentId), Number(req.params.courseId)),
  )
})

export const overview = asyncHandler(async (req, res) => {
  res.json(await adminService.studentOverview(Number(req.params.studentId), view(req)))
})

export const tasks = asyncHandler(async (req, res) => {
  res.json(await adminService.studentTasks(Number(req.params.studentId), view(req)))
})

export const study = asyncHandler(async (req, res) => {
  res.json(await adminService.studentStudy(Number(req.params.studentId), view(req)))
})

export const challenges = asyncHandler(async (req, res) => {
  res.json(await adminService.studentChallenges(Number(req.params.studentId), view(req)))
})

export const challenge = asyncHandler(async (req, res) => {
  res.json(
    await adminService.studentChallenge(Number(req.params.studentId), Number(req.params.challengeId)),
  )
})

export const worldsTree = asyncHandler(async (req, res) => {
  res.json(await adminService.studentWorldsTree(Number(req.params.studentId), view(req)))
})

export const worlds = asyncHandler(async (req, res) => {
  res.json(await adminService.studentWorlds(Number(req.params.studentId)))
})

export const listGuardians = asyncHandler(async (_req, res) => {
  res.json(await adminService.listAllGuardians())
})

export const createGuardian = asyncHandler(async (req, res) => {
  res.json(await adminService.createGuardian(req.body))
})

export const guardian = asyncHandler(async (req, res) => {
  res.json(await adminService.guardianDetail(Number(req.params.parentId)))
})

export const patchGuardian = asyncHandler(async (req, res) => {
  res.json(await adminService.patchGuardian(Number(req.params.parentId), req.body))
})

export const linkFromGuardian = asyncHandler(async (req, res) => {
  res.json(
    await adminService.linkGuardian(Number(req.params.parentId), Number(req.params.studentId)),
  )
})

export const unlinkFromGuardian = asyncHandler(async (req, res) => {
  res.json(
    await adminService.unlinkGuardian(Number(req.params.parentId), Number(req.params.studentId)),
  )
})

export const studentGuardians = asyncHandler(async (req, res) => {
  res.json(await adminService.studentGuardians(Number(req.params.studentId)))
})

export const linkFromStudent = asyncHandler(async (req, res) => {
  res.json(
    await adminService.linkStudentGuardian(Number(req.params.studentId), Number(req.params.parentId)),
  )
})

export const unlinkFromStudent = asyncHandler(async (req, res) => {
  res.json(
    await adminService.unlinkStudentGuardian(
      Number(req.params.studentId),
      Number(req.params.parentId),
    ),
  )
})
