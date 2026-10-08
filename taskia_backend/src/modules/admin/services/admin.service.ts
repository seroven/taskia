import bcrypt from 'bcryptjs'
import type { IncomingHttpHeaders } from 'node:http'
import { viewerDates, civilDayKey } from '../../../infrastructure/database/civil-date.js'
import type { Course, StudyWorld } from '../../../infrastructure/database/entities/index.js'
import { getChallengeDetail } from '../../worlds/services/challenge.service.js'
import { AppError, formatCivilDate, toInstantISO } from '../../../utils/helpers.js'
import {
  activateGuardianLink,
  activeWorldCount,
  challengeActivity,
  challengesByUser,
  completedChallengeStats,
  countsByDay,
  countsByUser,
  createExplorerWithGuardian,
  createGuardianWithExplorer,
  dashboardRoster,
  deactivateGuardianLink,
  findCourse,
  findCourseByName,
  findExplorer,
  findGuardian,
  findOtherCourseByName,
  findUserIdByEmail,
  findUserIdByUsername,
  insertCourse,
  lastStudyAt,
  listActiveCourses,
  listActiveWorldsWithMissions,
  listCompletedChallengesForStudent,
  listCourses,
  listGuardianExplorers,
  listGuardians,
  listStudentGuardians,
  listStudentStudy,
  listStudentTasks,
  listStudents,
  llmUsageRows,
  missionHeadcounts,
  recentCompletedChallenges,
  recentStudentTasks,
  studentCompletedChallengeStats,
  studentHeadcounts,
  studentMissionHeadcounts,
  studentTaskHeadcounts,
  studentWorldCount,
  studentWorldSummaries,
  taskHeadcounts,
  tutorMessageUsage,
  updateCourse,
  updateExplorer,
  updateGuardian,
  voiceMessageRows,
  worldsTreeSources,
  countActiveLinksForParent,
  countActiveLinksForStudent,
} from '../repositories/admin.repository.js'
import {
  parseAccount,
  parseCourseName,
  parseIds,
  parseIsoDate,
  parseNewAccount,
  parseStudentId,
} from '../schemas/admin.schema.js'

type Raw = Record<string, unknown>

function flagOn(value: unknown) {
  return Number(value) !== 0
}

function mapStudent(row: Raw) {
  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    is_active: flagOn(row.is_active),
    created_at: toInstantISO(row.created_at as Date | string) ?? '',
    course_count: row.course_count == null ? undefined : Number(row.course_count),
    guardian_count: row.guardian_count == null ? undefined : Number(row.guardian_count),
  }
}

function mapCourse(course: Course) {
  return {
    id: Number(course.id),
    user_id: Number(course.userId),
    name: course.name,
    is_active: course.isActive,
    created_at: toInstantISO(course.createdAt) ?? '',
  }
}

function mapTaskRow(row: Raw) {
  return {
    id: Number(row.id),
    title: String(row.title),
    status: String(row.status),
    due_date: formatCivilDate(row.due_date as Date | string),
    needs_help: flagOn(row.needs_help),
    course_id: Number(row.course_id),
    course_name: String(row.course_name),
    created_at: toInstantISO(row.created_at as Date | string) ?? '',
    updated_at: toInstantISO(row.updated_at as Date | string) ?? '',
  }
}

function mapChallengeRow(row: Raw) {
  return {
    id: Number(row.id),
    scope: String(row.scope),
    difficulty: String(row.difficulty),
    status: String(row.status),
    score: row.score == null ? null : Number(row.score),
    question_count: Number(row.question_count),
    world_id: row.world_id == null ? undefined : Number(row.world_id),
    course_id: row.course_id == null ? null : Number(row.course_id),
    mission_id: row.mission_id == null ? null : Number(row.mission_id),
    world_title: String(row.world_title),
    course_name: (row.course_name as string | null) ?? null,
    mission_title: (row.mission_title as string | null) ?? null,
    started_at: toInstantISO(row.started_at as Date | string) ?? '',
    completed_at: toInstantISO(row.completed_at as Date | string) ?? null,
  }
}

function mapPerson(row: Raw) {
  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    is_active: flagOn(row.is_active),
    created_at: toInstantISO(row.created_at as Date | string) ?? '',
  }
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function seriesRange(from: string | null, to: string | null, today: string) {
  let end = to ?? today
  let start = from ?? addDaysISO(end, -29)
  if (start > end) {
    const swap = start
    start = end
    end = swap
  }
  const startDate = new Date(`${start}T12:00:00`)
  const endDate = new Date(`${end}T12:00:00`)
  const span = Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
  if (span > 89) start = addDaysISO(end, -89)
  const days: string[] = []
  let cursor = start
  while (cursor <= end) {
    days.push(cursor)
    cursor = addDaysISO(cursor, 1)
  }
  return { start, end, days }
}

function countByDay(rows: Array<{ day: unknown; c: unknown }>, tz: string) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = civilDayKey(row.day, tz)
    if (!key) continue
    map.set(key, Number(row.c ?? 0))
  }
  return map
}

function countByUser(rows: Array<{ user_id: unknown; c: unknown }>) {
  const map = new Map<number, number>()
  for (const row of rows) {
    const id = Number(row.user_id)
    if (!id) continue
    map.set(id, Number(row.c ?? 0))
  }
  return map
}

const FLASH_IN_USD = 0.1
const FLASH_OUT_USD = 0.4

function usdFromTokens(prompt: number, output: number) {
  return Math.round(((prompt * FLASH_IN_USD + output * FLASH_OUT_USD) / 1_000_000) * 10_000) / 10_000
}

function addNum(map: Map<string, number>, key: string, n: number) {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + n)
}

function inDateRange(value: string | null, from: string | null, to: string | null) {
  if (!from && !to) return true
  if (!value) return false
  const day = value.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

async function assertUsernameEmailFree(username: string, email: string, exceptId?: number) {
  if (await findUserIdByUsername(username, exceptId)) {
    throw new AppError('Ese nombre de usuario ya existe')
  }
  if (await findUserIdByEmail(email, exceptId)) {
    throw new AppError('Ese correo ya está registrado')
  }
}

async function requireStudent(studentId: number) {
  const row = await findExplorer(studentId)
  if (!row) throw new AppError('Explorador no encontrado', 404)
  return mapStudent(row)
}

async function requireGuardian(guardianId: number) {
  const row = await findGuardian(guardianId)
  if (!row) throw new AppError('Guardián no encontrado', 404)
  return { ...mapPerson(row), explorer_count: 0 }
}

async function requireCourse(studentId: number, courseId: number) {
  const course = await findCourse(studentId, courseId)
  if (!course) throw new AppError('Materia no encontrada', 404)
  return course
}

async function assertCanUnlink(parentId: number, studentId: number) {
  const parentLinks = await countActiveLinksForParent(parentId)
  const studentLinks = await countActiveLinksForStudent(studentId)
  if (parentLinks <= 1) {
    throw new AppError(
      'Un guardián debe tener al menos un explorador. Vincula otro antes de desvincular.',
    )
  }
  if (studentLinks <= 1) {
    throw new AppError(
      'Un explorador debe tener al menos un guardián. Vincula otro antes de desvincular.',
    )
  }
}

export async function dashboard(input: {
  query: Record<string, unknown>
  headers?: IncomingHttpHeaders
}) {
  const { today, tz } = viewerDates(input)
  const from = parseIsoDate(input.query.from)
  const to = parseIsoDate(input.query.to)
  const studentId = parseStudentId(input.query.student_id)
  if (studentId != null) await requireStudent(studentId)
  const period: { tz: string; from: string | null; to: string | null } = { tz, from, to }
  const series = seriesRange(from, to, today)
  const seriesWindow = { tz, from: series.start, to: series.end }

  const [
    students,
    tasks,
    worlds,
    missions,
    challenges,
    roster,
    taskDays,
    challengeDays,
    studyTaskDays,
    studyMissionDays,
    studyUserTasks,
    studyUserMissions,
    tasksDoneUsers,
    challengeUsers,
    assistRows,
    started,
    finished,
  ] = await Promise.all([
    studentHeadcounts(studentId),
    taskHeadcounts(today, studentId, period),
    activeWorldCount(studentId),
    missionHeadcounts(studentId),
    completedChallengeStats(studentId, period),
    dashboardRoster(today, studentId),
    countsByDay('tasks', studentId, seriesWindow),
    countsByDay('challenges', studentId, seriesWindow),
    countsByDay('study_tasks', studentId, seriesWindow),
    countsByDay('study_missions', studentId, seriesWindow),
    countsByUser('study_tasks', studentId, seriesWindow),
    countsByUser('study_missions', studentId, seriesWindow),
    countsByUser('tasks_done', studentId, seriesWindow),
    challengesByUser(studentId, seriesWindow),
    tutorMessageUsage(studentId, seriesWindow),
    challengeActivity('started', studentId, seriesWindow),
    challengeActivity('completed', studentId, seriesWindow),
  ])

  let realUsageRows: Array<{ user_id: unknown; day: unknown; kind: unknown; c: unknown; prompt: unknown; output: unknown; tokens: unknown }> = []
  try {
    realUsageRows = await llmUsageRows(studentId, seriesWindow)
  } catch {
    realUsageRows = []
  }
  let voiceRows: Array<{ user_id: unknown; day: unknown; c: unknown; chars: unknown }> = []
  try {
    voiceRows = await voiceMessageRows(studentId, seriesWindow)
  } catch {
    voiceRows = []
  }

  const tasksByDay = countByDay(taskDays, tz)
  const challengesByDay = countByDay(challengeDays, tz)
  const studyByDay = countByDay(studyTaskDays, tz)
  for (const [key, value] of countByDay(studyMissionDays, tz)) {
    studyByDay.set(key, (studyByDay.get(key) ?? 0) + value)
  }
  const studyByUser = countByUser(studyUserTasks)
  for (const [id, value] of countByUser(studyUserMissions)) {
    studyByUser.set(id, (studyByUser.get(id) ?? 0) + value)
  }
  const tasksDoneByUser = countByUser(tasksDoneUsers)
  const challengesByUserMap = countByUser(challengeUsers)
  const scoreByUser = new Map<number, number>()
  for (const row of challengeUsers) {
    if (row.avg_score == null) continue
    scoreByUser.set(Number(row.user_id), Math.round(Number(row.avg_score)))
  }
  const byStudent = roster.map((row) => {
    const id = Number(row.id)
    return {
      id,
      username: String(row.username),
      study: studyByUser.get(id) ?? 0,
      tasks_done: tasksDoneByUser.get(id) ?? 0,
      challenges: challengesByUserMap.get(id) ?? 0,
      avg_score: scoreByUser.get(id) ?? null,
    }
  })

  const tutorByDay = new Map<string, number>()
  const challengeByDay = new Map<string, number>()
  const voiceByDay = new Map<string, number>()
  const imageByDay = new Map<string, number>()
  const childByDay = new Map<string, number>()
  const tokensByDay = new Map<string, number>()
  type UserUse = {
    tutor: number
    challenges: number
    created: number
    voice: number
    images: number
    child: number
    prompt: number
    output: number
    tutorPrompt: number
    tutorOutput: number
    challengesPrompt: number
    challengesOutput: number
    voicePrompt: number
    voiceOutput: number
    imagesPrompt: number
    imagesOutput: number
  }
  const emptyUse = (): UserUse => ({
    tutor: 0,
    challenges: 0,
    created: 0,
    voice: 0,
    images: 0,
    child: 0,
    prompt: 0,
    output: 0,
    tutorPrompt: 0,
    tutorOutput: 0,
    challengesPrompt: 0,
    challengesOutput: 0,
    voicePrompt: 0,
    voiceOutput: 0,
    imagesPrompt: 0,
    imagesOutput: 0,
  })
  const userUse = new Map<number, UserUse>()
  const bumpUser = (id: number, patch: Partial<UserUse>) => {
    const cur = userUse.get(id) ?? emptyUse()
    const prompt = patch.prompt ?? 0
    const output = patch.output ?? 0
    const next: UserUse = {
      tutor: cur.tutor + (patch.tutor ?? 0),
      challenges: cur.challenges + (patch.challenges ?? 0),
      created: cur.created + (patch.created ?? 0),
      voice: cur.voice + (patch.voice ?? 0),
      images: cur.images + (patch.images ?? 0),
      child: cur.child + (patch.child ?? 0),
      prompt: cur.prompt + prompt,
      output: cur.output + output,
      tutorPrompt: cur.tutorPrompt,
      tutorOutput: cur.tutorOutput,
      challengesPrompt: cur.challengesPrompt,
      challengesOutput: cur.challengesOutput,
      voicePrompt: cur.voicePrompt,
      voiceOutput: cur.voiceOutput,
      imagesPrompt: cur.imagesPrompt,
      imagesOutput: cur.imagesOutput,
    }
    if ((patch.tutor ?? 0) > 0) {
      next.tutorPrompt += prompt
      next.tutorOutput += output
    } else if ((patch.challenges ?? 0) > 0) {
      next.challengesPrompt += prompt
      next.challengesOutput += output
    } else if ((patch.voice ?? 0) > 0) {
      next.voicePrompt += prompt
      next.voiceOutput += output
    } else if ((patch.images ?? 0) > 0) {
      next.imagesPrompt += prompt
      next.imagesOutput += output
    }
    userUse.set(id, next)
  }
  const measured = realUsageRows.length > 0
  for (const row of assistRows) {
    const id = Number(row.user_id)
    const day = civilDayKey(row.day, tz)
    const count = Number(row.c ?? 0)
    const chars = Number(row.chars ?? 0)
    if (row.role === 'assistant') {
      if (measured) continue
      addNum(tutorByDay, day, count)
      const output = Math.max(80, Math.ceil(chars / 4))
      bumpUser(id, { tutor: count, prompt: 1800 * count, output })
      addNum(tokensByDay, day, 1800 * count + output)
    } else {
      addNum(childByDay, day, count)
      bumpUser(id, { child: count })
    }
  }
  if (!measured) {
    for (const row of started) {
      const id = Number(row.user_id)
      const day = civilDayKey(row.day, tz)
      const count = Number(row.c ?? 0)
      const questions = Number(row.q ?? 0)
      addNum(challengeByDay, day, count)
      const output = 400 + questions * 100
      bumpUser(id, { challenges: count, prompt: 3000 * count, output })
      addNum(tokensByDay, day, 3000 * count + output)
    }
    for (const row of finished) {
      const id = Number(row.user_id)
      const day = civilDayKey(row.day, tz)
      const count = Number(row.c ?? 0)
      addNum(challengeByDay, day, count)
      bumpUser(id, { challenges: count, prompt: 1800 * count, output: 250 * count })
      addNum(tokensByDay, day, 2050 * count)
    }
  }
  const hasTranscribeLog = realUsageRows.some((row) => String(row.kind ?? '') === 'transcribe')
  if (measured) {
    for (const row of realUsageRows) {
      const id = Number(row.user_id)
      const day = civilDayKey(row.day, tz)
      const count = Number(row.c ?? 0)
      const prompt = Number(row.prompt ?? 0)
      const output = Number(row.output ?? 0)
      const tokens = Number(row.tokens ?? prompt + output)
      const kind = String(row.kind ?? '')
      addNum(tokensByDay, day, tokens)
      if (kind === 'transcribe') {
        addNum(voiceByDay, day, count)
        bumpUser(id, { voice: count, prompt, output })
      } else if (kind === 'challenge_generate' || kind === 'challenge_grade' || kind === 'challenge_photo_grade') {
        addNum(challengeByDay, day, count)
        bumpUser(id, { challenges: count, prompt, output })
      } else {
        addNum(tutorByDay, day, count)
        bumpUser(id, { tutor: count, prompt, output })
      }
    }
  }
  if (!hasTranscribeLog) {
    for (const row of voiceRows) {
      const id = Number(row.user_id)
      const day = civilDayKey(row.day, tz)
      const count = Number(row.c ?? 0)
      const chars = Number(row.chars ?? 0)
      const output = Math.max(20, Math.ceil(chars / 4))
      const prompt = 2000 * count
      addNum(voiceByDay, day, count)
      bumpUser(id, { voice: count, prompt, output })
      addNum(tokensByDay, day, prompt + output)
    }
  }
  for (const row of started) bumpUser(Number(row.user_id), { created: Number(row.c ?? 0) })

  const names = new Map(roster.map((row) => [Number(row.id), String(row.username)]))
  const usageByStudent = [...userUse.entries()]
    .map(([id, row]) => ({
      id,
      username: names.get(id) ?? `#${id}`,
      tutor: row.tutor,
      challenges: row.challenges,
      challenges_created: row.created,
      voice: row.voice,
      images: row.images,
      child_messages: row.child,
      calls: row.tutor + row.challenges + row.voice + row.images,
      tokens: row.prompt + row.output,
      estimated_usd: usdFromTokens(row.prompt, row.output),
      usd_tutor: usdFromTokens(row.tutorPrompt, row.tutorOutput),
      usd_challenges: usdFromTokens(row.challengesPrompt, row.challengesOutput),
      usd_voice: usdFromTokens(row.voicePrompt, row.voiceOutput),
      usd_images: usdFromTokens(row.imagesPrompt, row.imagesOutput),
    }))
    .filter((row) => row.calls > 0 || row.child_messages > 0 || row.challenges_created > 0)
    .sort((a, b) => b.estimated_usd - a.estimated_usd || b.calls - a.calls)
  const usageDays = series.days.map((date) => ({
    date,
    tutor: tutorByDay.get(date) ?? 0,
    challenges: challengeByDay.get(date) ?? 0,
    voice: voiceByDay.get(date) ?? 0,
    images: imageByDay.get(date) ?? 0,
    child_messages: childByDay.get(date) ?? 0,
    tokens: tokensByDay.get(date) ?? 0,
  }))
  const usageTotals = usageByStudent.reduce(
    (acc, row) => ({
      calls: acc.calls + row.calls,
      tokens: acc.tokens + row.tokens,
      estimated_usd: acc.estimated_usd + row.estimated_usd,
      child_messages: acc.child_messages + row.child_messages,
    }),
    { calls: 0, tokens: 0, estimated_usd: 0, child_messages: 0 },
  )
  usageTotals.estimated_usd = Math.round(usageTotals.estimated_usd * 10_000) / 10_000
  const kindTotals = {
    tutor: { calls: 0, prompt: 0, output: 0 },
    challenges: { calls: 0, prompt: 0, output: 0 },
    voice: { calls: 0, prompt: 0, output: 0 },
    images: { calls: 0, prompt: 0, output: 0 },
  }
  for (const row of userUse.values()) {
    kindTotals.tutor.calls += row.tutor
    kindTotals.tutor.prompt += row.tutorPrompt
    kindTotals.tutor.output += row.tutorOutput
    kindTotals.challenges.calls += row.challenges
    kindTotals.challenges.prompt += row.challengesPrompt
    kindTotals.challenges.output += row.challengesOutput
    kindTotals.voice.calls += row.voice
    kindTotals.voice.prompt += row.voicePrompt
    kindTotals.voice.output += row.voiceOutput
    kindTotals.images.calls += row.images
    kindTotals.images.prompt += row.imagesPrompt
    kindTotals.images.output += row.imagesOutput
  }

  return {
    period: { from, to, student_id: studentId },
    students,
    tasks,
    worlds: { count: worlds },
    missions,
    challenges: {
      completed_count: challenges.completed_count,
      avg_score: challenges.avg_score == null ? null : Math.round(challenges.avg_score),
    },
    roster: roster.map((row) => ({
      id: Number(row.id),
      username: String(row.username),
      email: String(row.email),
      is_active: flagOn(row.is_active),
      created_at: toInstantISO(row.created_at) ?? '',
      course_count: Number(row.course_count ?? 0),
      tasks_total: Number(row.tasks_total ?? 0),
      tasks_done: Number(row.tasks_done ?? 0),
      tasks_overdue: Number(row.tasks_overdue ?? 0),
      challenges_completed: Number(row.challenges_completed ?? 0),
      avg_score: row.avg_score == null ? null : Math.round(Number(row.avg_score)),
      last_study_at: toInstantISO(row.last_study_at as Date | string | null),
    })),
    series: {
      from: series.start,
      to: series.end,
      days: series.days.map((date) => ({
        date,
        tasks: tasksByDay.get(date) ?? 0,
        study: studyByDay.get(date) ?? 0,
        challenges: challengesByDay.get(date) ?? 0,
      })),
    },
    by_student: byStudent,
    usage: {
      from: series.start,
      to: series.end,
      measured,
      totals: usageTotals,
      days: usageDays,
      by_student: usageByStudent,
      by_kind: [
        {
          kind: 'tutor',
          label: 'Mensajes',
          calls: kindTotals.tutor.calls,
          tokens: kindTotals.tutor.prompt + kindTotals.tutor.output,
          estimated_usd: usdFromTokens(kindTotals.tutor.prompt, kindTotals.tutor.output),
        },
        {
          kind: 'challenges',
          label: 'Desafíos',
          calls: kindTotals.challenges.calls,
          tokens: kindTotals.challenges.prompt + kindTotals.challenges.output,
          estimated_usd: usdFromTokens(kindTotals.challenges.prompt, kindTotals.challenges.output),
        },
        {
          kind: 'voice',
          label: 'Transcripciones',
          calls: kindTotals.voice.calls,
          tokens: kindTotals.voice.prompt + kindTotals.voice.output,
          estimated_usd: usdFromTokens(kindTotals.voice.prompt, kindTotals.voice.output),
        },
        {
          kind: 'images',
          label: 'Imágenes',
          calls: kindTotals.images.calls,
          tokens: kindTotals.images.prompt + kindTotals.images.output,
          estimated_usd: usdFromTokens(kindTotals.images.prompt, kindTotals.images.output),
        },
      ],
    },
  }
}

export async function listAllStudents() {
  return (await listStudents()).map((row) => mapStudent(row))
}

export async function createStudent(body: Record<string, unknown>) {
  const username = String(body.username ?? '')
  const email = String(body.email ?? '')
  const password = String(body.password ?? '')
  parseAccount(username, password, email)
  const name = username.trim()
  const mail = email.trim().toLowerCase()
  const parentIds = parseIds(body.parent_ids)
  const newParent = parseNewAccount(body.new_parent)
  if (parentIds.length === 0 && !newParent) {
    throw new AppError('Un explorador necesita al menos un guardián (existente o nuevo)')
  }
  if (parentIds.length > 0 && newParent) {
    throw new AppError('Elige un guardián existente o uno nuevo, no ambos')
  }
  await assertUsernameEmailFree(name, mail)
  if (newParent) await assertUsernameEmailFree(newParent.username, newParent.email)
  for (const parentId of parentIds) await requireGuardian(parentId)
  const explorerId = await createExplorerWithGuardian({
    username: name,
    email: mail,
    passwordHash: await bcrypt.hash(password, 10),
    parentIds,
    newParent: newParent
      ? { ...newParent, passwordHash: await bcrypt.hash(newParent.password, 10) }
      : null,
  })
  return requireStudent(explorerId)
}

export async function patchStudent(studentId: number, body: Record<string, unknown>) {
  const current = await requireStudent(studentId)
  const username = body.username === undefined ? current.username : String(body.username)
  const email = body.email === undefined ? current.email : String(body.email)
  const password =
    body.password === undefined || body.password === '' ? undefined : String(body.password)
  const isActive = body.is_active === undefined ? current.is_active : Boolean(body.is_active)
  parseAccount(username, password, email)
  const name = username.trim()
  const mail = email.trim().toLowerCase()
  await assertUsernameEmailFree(name, mail, studentId)
  await updateExplorer(studentId, {
    username: name,
    email: mail,
    isActive,
    passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
  })
  return requireStudent(studentId)
}

export async function studentCourses(studentId: number) {
  await requireStudent(studentId)
  return (await listCourses(studentId)).map(mapCourse)
}

export async function addStudentCourse(studentId: number, body: Record<string, unknown>) {
  await requireStudent(studentId)
  const name = parseCourseName(body.name)
  const existing = await findCourseByName(studentId, name)
  if (existing) {
    if (!existing.isActive) {
      await updateCourse(studentId, existing.id, { isActive: true })
      return mapCourse((await findCourse(studentId, existing.id))!)
    }
    throw new AppError('Ese alumno ya tiene una materia con ese nombre')
  }
  const id = await insertCourse(studentId, name)
  return mapCourse((await findCourse(studentId, id))!)
}

export async function importStudentCourses(studentId: number, body: Record<string, unknown>) {
  await requireStudent(studentId)
  const fromId = Number(body.from_student_id)
  if (!Number.isFinite(fromId) || fromId <= 0) throw new AppError('Elige un alumno de origen')
  if (fromId === studentId) throw new AppError('No puedes importar desde el mismo alumno')
  await requireStudent(fromId)
  const requestedIds = parseIds(body.course_ids)
  const source = await listActiveCourses(fromId, requestedIds)
  if (source.length === 0) throw new AppError('No hay materias para importar')
  const created = []
  const reactivated = []
  const skipped: string[] = []
  for (const row of source) {
    const existing = await findCourseByName(studentId, row.name)
    if (existing) {
      if (!existing.isActive) {
        await updateCourse(studentId, existing.id, { isActive: true })
        reactivated.push(mapCourse((await findCourse(studentId, existing.id))!))
      } else {
        skipped.push(row.name)
      }
      continue
    }
    const id = await insertCourse(studentId, row.name)
    created.push(mapCourse((await findCourse(studentId, id))!))
  }
  return { created, reactivated, skipped }
}

export async function patchStudentCourse(
  studentId: number,
  courseId: number,
  body: Record<string, unknown>,
) {
  const current = await requireCourse(studentId, courseId)
  const name = body.name === undefined ? current.name : parseCourseName(body.name)
  const isActive = body.is_active === undefined ? current.isActive : Boolean(body.is_active)
  if (await findOtherCourseByName(studentId, name, courseId)) {
    throw new AppError('Ese alumno ya tiene una materia con ese nombre')
  }
  await updateCourse(studentId, courseId, { name, isActive })
  return mapCourse((await findCourse(studentId, courseId))!)
}

export async function archiveStudentCourse(studentId: number, courseId: number) {
  await requireCourse(studentId, courseId)
  await updateCourse(studentId, courseId, { isActive: false })
  return { ok: true }
}

export async function studentOverview(studentId: number, input: { query: Record<string, unknown>; headers?: IncomingHttpHeaders }) {
  const student = await requireStudent(studentId)
  const { today } = viewerDates(input)
  const [taskStats, taskList, worldCount, missionStats, worldList, challengeStats, recent, lastAt, courses] =
    await Promise.all([
      studentTaskHeadcounts(studentId, today),
      recentStudentTasks(studentId),
      studentWorldCount(studentId),
      studentMissionHeadcounts(studentId),
      studentWorldSummaries(studentId),
      studentCompletedChallengeStats(studentId),
      recentCompletedChallenges(studentId),
      lastStudyAt(studentId),
      listCourses(studentId),
    ])
  return {
    student,
    courses: courses.map(mapCourse),
    tasks: { ...taskStats, items: taskList.map((row) => mapTaskRow(row as Raw)) },
    worlds: {
      count: worldCount,
      items: worldList.map((row) => ({
        id: Number(row.id),
        title: String(row.title),
        mission_total: Number(row.mission_total ?? 0),
        mission_mastered: Number(row.mission_mastered ?? 0),
        mission_studying: Number(row.mission_studying ?? 0),
      })),
    },
    missions: missionStats,
    challenges: {
      completed_count: challengeStats.completed_count,
      avg_score: challengeStats.avg_score == null ? null : Math.round(challengeStats.avg_score),
      recent: recent.map((row) => mapChallengeRow(row as Raw)),
    },
    last_study_at: toInstantISO(lastAt as Date | string | null),
  }
}

export async function studentTasks(
  studentId: number,
  input: { query: Record<string, unknown>; headers?: IncomingHttpHeaders },
) {
  await requireStudent(studentId)
  const { tz } = viewerDates(input)
  const status = String(input.query.status ?? '').trim()
  const courseId = Number(input.query.course_id)
  const rows = await listStudentTasks(studentId, {
    tz,
    createdFrom: parseIsoDate(input.query.created_from),
    createdTo: parseIsoDate(input.query.created_to),
    dueFrom: parseIsoDate(input.query.due_from),
    dueTo: parseIsoDate(input.query.due_to),
    status: ['pending', 'studying', 'done'].includes(status) ? status : null,
    courseId: Number.isFinite(courseId) && courseId > 0 ? courseId : null,
  })
  return rows.map((row) => mapTaskRow(row as Raw))
}

export async function studentStudy(
  studentId: number,
  input: { query: Record<string, unknown>; headers?: IncomingHttpHeaders },
) {
  await requireStudent(studentId)
  const { tz } = viewerDates(input)
  const kind = String(input.query.kind ?? '').trim()
  const rows = await listStudentStudy(studentId, {
    tz,
    from: parseIsoDate(input.query.from),
    to: parseIsoDate(input.query.to),
    includeTask: kind !== 'mission',
    includeMission: kind !== 'task',
  })
  return rows.map((row) => ({
    kind: String(row.kind),
    ref_id: Number(row.ref_id),
    title: String(row.title),
    course_name: String(row.course_name),
    phase: String(row.phase),
    summary: row.summary ?? '',
    updated_at: toInstantISO(row.updated_at) ?? '',
  }))
}

export async function studentChallenges(
  studentId: number,
  input: { query: Record<string, unknown>; headers?: IncomingHttpHeaders },
) {
  await requireStudent(studentId)
  const dates = viewerDates(input)
  const rows = await listCompletedChallengesForStudent(studentId, {
    tz: dates.tz,
    from: parseIsoDate(input.query.from),
    to: parseIsoDate(input.query.to),
  })
  return rows.map((row) => mapChallengeRow(row as Raw))
}

export async function studentChallenge(studentId: number, challengeId: number) {
  await requireStudent(studentId)
  return getChallengeDetail(challengeId, studentId)
}

export async function studentWorldsTree(
  studentId: number,
  input: { query: Record<string, unknown>; headers?: IncomingHttpHeaders },
) {
  await requireStudent(studentId)
  const dates = viewerDates(input)
  const from = parseIsoDate(input.query.from)
  const to = parseIsoDate(input.query.to)
  const status = String(input.query.status ?? '').trim()
  const courseId = Number(input.query.course_id)
  const difficulty = String(input.query.difficulty ?? '').trim()
  const courseFilter = Number.isFinite(courseId) && courseId > 0 ? courseId : null
  const statusFilter = ['pending', 'studying', 'mastered'].includes(status) ? status : null
  const difficultyFilter = ['warm', 'quest', 'boss'].includes(difficulty) ? difficulty : null
  const hasDate = Boolean(from || to)
  const hasFilter = Boolean(hasDate || statusFilter || courseFilter || difficultyFilter)
  const source = await worldsTreeSources(
    studentId,
    { tz: dates.tz, from, to },
    difficultyFilter,
  )
  type TreeChallenge = ReturnType<typeof mapChallengeRow>
  type TreeMission = {
    id: number
    title: string
    status: string
    updated_at: string
    study: { phase: string; summary: string; updated_at: string } | null
    challenges: TreeChallenge[]
  }
  type TreeCourse = {
    id: number
    name: string
    sort_order: number
    missions: TreeMission[]
    challenges: TreeChallenge[]
  }
  const worlds = source.worlds.map((world: StudyWorld) => ({
    id: Number(world.id),
    title: world.title,
    description: world.description ?? null,
    updated_at: toInstantISO(world.updatedAt) ?? '',
    courses: [] as TreeCourse[],
    challenges: [] as TreeChallenge[],
  }))
  const worldMap = new Map(worlds.map((world) => [world.id, world]))
  const courseMap = new Map<string, TreeCourse>()
  const courseOptions = new Map<number, string>()
  const ensureCourse = (worldId: number, id: number, name: string, sortOrder = 999) => {
    const key = `${worldId}:${id}`
    let course = courseMap.get(key)
    if (!course) {
      course = { id, name, sort_order: sortOrder, missions: [], challenges: [] }
      courseMap.set(key, course)
      worldMap.get(worldId)?.courses.push(course)
    }
    courseOptions.set(id, name)
    return course
  }
  for (const row of source.courses) {
    ensureCourse(Number(row.world_id), Number(row.id), String(row.name), Number(row.sort_order ?? 0))
  }
  const missionMap = new Map<number, TreeMission>()
  const missionCourse = new Map<number, { worldId: number; courseId: number }>()
  for (const row of source.missions as Raw[]) {
    const missionStatus = String(row.status)
    if (statusFilter && missionStatus !== statusFilter) continue
    const worldId = Number(row.world_id)
    const cid = Number(row.course_id)
    if (courseFilter && cid !== courseFilter) continue
    const studyAt = toInstantISO((row.study_updated_at as Date | string | null) ?? null)
    const studyInRange = inDateRange(studyAt, from, to)
    const study =
      row.phase && studyAt && studyInRange
        ? { phase: String(row.phase), summary: (row.summary as string | null) ?? '', updated_at: studyAt }
        : null
    const mission: TreeMission = {
      id: Number(row.id),
      title: String(row.title),
      status: missionStatus,
      updated_at: toInstantISO(row.updated_at as Date | string) ?? '',
      study,
      challenges: [],
    }
    ensureCourse(worldId, cid, String(row.course_name)).missions.push(mission)
    missionMap.set(mission.id, mission)
    missionCourse.set(mission.id, { worldId, courseId: cid })
  }
  for (const row of source.challenges as Raw[]) {
    const mapped = mapChallengeRow(row)
    const worldId = Number(row.world_id)
    const cid = row.course_id == null ? null : Number(row.course_id)
    const mid = row.mission_id == null ? null : Number(row.mission_id)
    const scope = String(row.scope)
    if (courseFilter) {
      if (scope === 'world') continue
      if (scope === 'course' && cid !== courseFilter) continue
      if (scope === 'mission') {
        const loc = mid != null ? missionCourse.get(mid) : undefined
        if (!loc || loc.courseId !== courseFilter) continue
      }
    }
    if (scope === 'mission') {
      if (mid != null && missionMap.has(mid)) missionMap.get(mid)!.challenges.push(mapped)
      continue
    }
    if (scope === 'course' && cid != null) {
      ensureCourse(worldId, cid, (row.course_name as string | null) ?? 'Materia').challenges.push(mapped)
      continue
    }
    if (!courseFilter) worldMap.get(worldId)?.challenges.push(mapped)
  }
  if (hasDate || difficultyFilter) {
    for (const world of worlds) {
      for (const course of world.courses) {
        course.missions = course.missions.filter((mission) => {
          if (difficultyFilter) return mission.challenges.length > 0
          if (hasDate) return Boolean(mission.study) || mission.challenges.length > 0
          return true
        })
      }
    }
  }
  if (hasFilter) {
    for (const world of worlds) {
      world.courses = world.courses.filter(
        (course) => course.missions.length > 0 || course.challenges.length > 0,
      )
    }
  }
  for (const world of worlds) {
    world.courses.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'es'))
  }
  const pruned = hasFilter
    ? worlds.filter((world) => world.courses.length > 0 || world.challenges.length > 0)
    : worlds
  return {
    courses: [...courseOptions.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    worlds: pruned.map((world) => ({
      id: world.id,
      title: world.title,
      description: world.description,
      updated_at: world.updated_at,
      challenges: world.challenges,
      courses: world.courses.map((course) => ({
        id: course.id,
        name: course.name,
        missions: course.missions,
        challenges: course.challenges,
      })),
    })),
  }
}

export async function studentWorlds(studentId: number) {
  await requireStudent(studentId)
  const { worlds, missions } = await listActiveWorldsWithMissions(studentId)
  const byWorld = new Map<number, Raw[]>()
  for (const mission of missions as Raw[]) {
    const worldId = Number(mission.world_id)
    const list = byWorld.get(worldId) ?? []
    list.push(mission)
    byWorld.set(worldId, list)
  }
  return worlds.map((world) => ({
    id: Number(world.id),
    title: world.title,
    description: world.description ?? null,
    updated_at: toInstantISO(world.updatedAt) ?? '',
    missions: (byWorld.get(Number(world.id)) ?? []).map((mission) => ({
      id: Number(mission.id),
      title: String(mission.title),
      status: String(mission.status),
      course_name: String(mission.course_name),
      updated_at: toInstantISO(mission.updated_at as Date | string) ?? '',
    })),
  }))
}

export async function listAllGuardians() {
  return (await listGuardians()).map((row) => ({
    ...mapPerson(row),
    explorer_count: Number(row.explorer_count ?? 0),
  }))
}

export async function createGuardian(body: Record<string, unknown>) {
  const username = String(body.username ?? '')
  const email = String(body.email ?? '')
  const password = String(body.password ?? '')
  parseAccount(username, password, email)
  const name = username.trim()
  const mail = email.trim().toLowerCase()
  const studentIds = parseIds(body.student_ids)
  const newStudent = parseNewAccount(body.new_student)
  if (studentIds.length === 0 && !newStudent) {
    throw new AppError('Un guardián necesita al menos un explorador (existente o nuevo)')
  }
  if (studentIds.length > 0 && newStudent) {
    throw new AppError('Elige un explorador existente o uno nuevo, no ambos')
  }
  await assertUsernameEmailFree(name, mail)
  if (newStudent) await assertUsernameEmailFree(newStudent.username, newStudent.email)
  for (const studentId of studentIds) await requireStudent(studentId)
  const guardianId = await createGuardianWithExplorer({
    username: name,
    email: mail,
    passwordHash: await bcrypt.hash(password, 10),
    studentIds,
    newStudent: newStudent
      ? { ...newStudent, passwordHash: await bcrypt.hash(newStudent.password, 10) }
      : null,
  })
  return {
    ...(await requireGuardian(guardianId)),
    explorers: (await listGuardianExplorers(guardianId)).map((row) => mapPerson(row)),
  }
}

export async function guardianDetail(guardianId: number) {
  return {
    ...(await requireGuardian(guardianId)),
    explorers: (await listGuardianExplorers(guardianId)).map((row) => mapPerson(row)),
  }
}

export async function patchGuardian(guardianId: number, body: Record<string, unknown>) {
  const current = await requireGuardian(guardianId)
  const username = body.username === undefined ? current.username : String(body.username)
  const email = body.email === undefined ? current.email : String(body.email)
  const password =
    body.password === undefined || body.password === '' ? undefined : String(body.password)
  const isActive = body.is_active === undefined ? current.is_active : Boolean(body.is_active)
  parseAccount(username, password, email)
  const name = username.trim()
  const mail = email.trim().toLowerCase()
  await assertUsernameEmailFree(name, mail, guardianId)
  await updateGuardian(guardianId, {
    username: name,
    email: mail,
    isActive,
    passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
  })
  return guardianDetail(guardianId)
}

export async function linkGuardian(parentId: number, studentId: number) {
  await requireGuardian(parentId)
  await requireStudent(studentId)
  await activateGuardianLink(parentId, studentId)
  return guardianDetail(parentId)
}

export async function unlinkGuardian(parentId: number, studentId: number) {
  await requireGuardian(parentId)
  await requireStudent(studentId)
  await assertCanUnlink(parentId, studentId)
  await deactivateGuardianLink(parentId, studentId)
  return guardianDetail(parentId)
}

export async function studentGuardians(studentId: number) {
  await requireStudent(studentId)
  return (await listStudentGuardians(studentId, true)).map((row) => mapPerson(row))
}

export async function linkStudentGuardian(studentId: number, parentId: number) {
  await requireGuardian(parentId)
  await requireStudent(studentId)
  await activateGuardianLink(parentId, studentId)
  return (await listStudentGuardians(studentId, false)).map((row) => mapPerson(row))
}

export async function unlinkStudentGuardian(studentId: number, parentId: number) {
  await requireStudent(studentId)
  await requireGuardian(parentId)
  await assertCanUnlink(parentId, studentId)
  await deactivateGuardianLink(parentId, studentId)
  return (await listStudentGuardians(studentId, false)).map((row) => mapPerson(row))
}
