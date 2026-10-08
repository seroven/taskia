import { AppError } from '../../../shared/errors/app-error.js'
import { scoreTaskEffort } from '../../../services/score-task-effort.js'
import {
  assertCanCreateTask,
  awardXp,
  maybeAwardTaskDoneXp,
  xpForProjectStudy,
} from '../../../services/xp.js'
import {
  parseDueOn,
  parseInstant,
  parseKind,
  parseNeedsHelp,
  parseStatus,
  resolveDueDate,
} from '../schemas/task.schema.js'
import * as tasks from '../repositories/task.repository.js'
import { loadContext } from '../../study/repositories/study.repository.js'

async function requireTask(taskId: number, userId: number) {
  const task = await tasks.findTask(taskId, userId)
  if (!task) throw new AppError('Tarea no encontrada', 404)
  return task
}

export async function fetchTask(taskId: number, userId: number) {
  return requireTask(taskId, userId)
}

export async function listTasks(
  userId: number,
  query: {
    created_from?: unknown
    created_to?: unknown
    due_on?: unknown
    course_id?: unknown
    status?: unknown
  },
) {
  const createdFrom = String(query.created_from ?? '').trim()
  const createdTo = String(query.created_to ?? '').trim()
  const dueOn = query.due_on as string | undefined
  const courseId = query.course_id ? Number(query.course_id) : undefined
  const status = query.status as string | undefined

  return tasks.listTasks(userId, {
    createdFrom: createdFrom || createdTo ? parseInstant(createdFrom, 'created_from') : undefined,
    createdTo: createdFrom || createdTo ? parseInstant(createdTo, 'created_to') : undefined,
    dueOn: dueOn ? parseDueOn(dueOn) : undefined,
    courseId,
    status: status ? parseStatus(status) : undefined,
  })
}

function readDescription(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function createTask(userId: number, body: Record<string, unknown>, today: string) {
  const title = String(body.title ?? '').trim()
  if (!title) throw new AppError('El título es obligatorio')

  const kind = parseKind(String(body.task_kind ?? ''))
  const dueDate = resolveDueDate(kind, body.due_date, today)
  const description = readDescription(body.description)
  const courseId = Number(body.course_id)
  const needsHelp = parseNeedsHelp(body)

  if (!(await tasks.findOwnedCourse(courseId, userId, true))) {
    throw new AppError('Curso no válido')
  }
  await assertCanCreateTask(userId)

  const taskId = await tasks.insertTask({
    userId,
    courseId,
    title,
    description,
    taskKind: kind,
    needsHelp,
    dueDate,
  })
  return requireTask(taskId, userId)
}

export async function updateTask(
  userId: number,
  taskId: number,
  body: Record<string, unknown>,
  today: string,
) {
  const title = String(body.title ?? '').trim()
  if (!title) throw new AppError('El título es obligatorio')

  const kind = parseKind(String(body.task_kind ?? ''))
  const dueDate = resolveDueDate(kind, body.due_date, today)
  const description = readDescription(body.description)
  const courseId = Number(body.course_id)
  const needsHelp = parseNeedsHelp(body)

  if (!(await tasks.findOwnedCourse(courseId, userId, false))) {
    throw new AppError('Curso no válido')
  }

  const current = await requireTask(taskId, userId)
  if (current.status === 'done') {
    throw new AppError('Esta tarea ya está lista')
  }
  if (current.status === 'studying' && !needsHelp) {
    throw new AppError('Esta tarea ya está con Taskia; no puedes quitarle la ayuda')
  }

  const affected = await tasks.updateTask({
    taskId,
    userId,
    title,
    description,
    courseId,
    taskKind: kind,
    needsHelp: current.status === 'studying' ? true : needsHelp,
    dueDate,
  })
  if (affected === 0) throw new AppError('Tarea no encontrada', 404)
  return requireTask(taskId, userId)
}

/**
 * Marca Listo.
 * - Diaria sin ayuda / proyecto sin ayuda: 10 XP.
 * - Diaria con ayuda: bloqueada (la cierra Taskia).
 * - Proyecto con ayuda: permitido desde pending o studying; XP 80–350.
 */
export async function completeTask(userId: number, taskId: number) {
  const current = await requireTask(taskId, userId)
  if (current.status === 'done') return current

  const isProject = current.task_kind === 'project'
  if (current.needs_help && !isProject) {
    throw new AppError('Esta tarea la termina Taskia cuando ya la entiendas')
  }
  if (!isProject && current.status !== 'pending') {
    throw new AppError('Solo puedes marcar como lista una tarea por hacer')
  }
  if (isProject && current.status !== 'pending' && current.status !== 'studying') {
    throw new AppError('Solo puedes marcar como listo un proyecto en marcha')
  }

  const affected = await tasks.setTaskStatus(taskId, userId, 'done')
  if (affected === 0) throw new AppError('Tarea no encontrada', 404)

  if (isProject && current.needs_help) {
    let evidence = 'Proyecto marcado Listo por el explorador'
    let userTurns = 0
    let topicSummary = current.title
    try {
      const session = await loadContext(taskId)
      userTurns = session.messages.filter((m) => m.role === 'user').length
      topicSummary = session.topic_summary || current.title
      if (session.context_summary.trim()) {
        evidence = session.context_summary.slice(0, 240)
      }
    } catch {
      /* sin sesión: effort conservador */
    }
    const effort = await scoreTaskEffort({
      userId,
      evidence,
      userTurns,
      topicSummary,
    })
    const xp = await awardXp({
      userId,
      sourceType: 'task_study',
      sourceId: taskId,
      amount: xpForProjectStudy(effort),
      effortScore: effort,
      reason: evidence || 'Proyecto listo',
    })
    const task = await requireTask(taskId, userId)
    return { ...task, xp_gained: xp.xp_gained, xp }
  }

  const xp = await maybeAwardTaskDoneXp({
    userId,
    taskId,
    previousStatus: current.status,
    nextStatus: 'done',
    needsHelp: false,
  })
  const task = await requireTask(taskId, userId)
  return xp ? { ...task, xp_gained: xp.xp_gained, xp } : task
}

export async function markStudying(userId: number, taskId: number) {
  const current = await requireTask(taskId, userId)
  if (!current.needs_help) {
    throw new AppError('Esta tarea no usa ayuda de Taskia')
  }
  if (current.status === 'done') {
    throw new AppError('Esta tarea ya está lista')
  }
  if (current.status === 'pending') {
    await tasks.setTaskStatus(taskId, userId, 'studying')
  }
  return requireTask(taskId, userId)
}

export async function markDoneByStudy(userId: number, taskId: number) {
  const current = await requireTask(taskId, userId)
  if (current.status === 'done') return { task: current, previousStatus: current.status }
  await tasks.setTaskStatus(taskId, userId, 'done')
  return { task: await requireTask(taskId, userId), previousStatus: current.status }
}
