import { AppError } from '../../../shared/errors/app-error.js'
import { assertCanCreateTask, maybeAwardTaskDoneXp } from '../../../services/xp.js'
import {
  parseDueOn,
  parseInstant,
  parseKind,
  parseStatus,
  resolveDueDate,
} from '../schemas/task.schema.js'
import * as tasks from '../repositories/task.repository.js'

function ensureCanMarkDone(
  difficultyCode: string,
  studyPassed: boolean,
  currentStatus: string,
  nextStatus: string,
) {
  if (nextStatus !== 'done') return
  if (currentStatus === 'done') return
  if (studyPassed) return
  if (difficultyCode === 'high' || currentStatus === 'studying') {
    throw new AppError(
      difficultyCode === 'high'
        ? 'Esta tarea es de dificultad Alta. Primero estudiala con Taskia hasta que diga que estás listo.'
        : 'Primero estudia con Taskia hasta que diga que estás listo para marcarla Listo.',
    )
  }
}

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
  const params: unknown[] = [userId]
  let sql = tasks.taskListSql()

  const createdFrom = String(query.created_from ?? '').trim()
  const createdTo = String(query.created_to ?? '').trim()
  const dueOn = query.due_on as string | undefined
  const courseId = query.course_id ? Number(query.course_id) : undefined
  const status = query.status as string | undefined

  if (createdFrom || createdTo) {
    const start = parseInstant(createdFrom, 'created_from')
    const end = parseInstant(createdTo, 'created_to')
    sql += ' AND t.created_at >= ? AND t.created_at < ?'
    params.push(start, end)
  }
  if (dueOn) {
    parseDueOn(dueOn)
    sql += ' AND t.due_date = ?'
    params.push(dueOn)
  }
  if (courseId) {
    sql += ' AND t.course_id = ?'
    params.push(courseId)
  }
  if (status) {
    parseStatus(status)
    sql += ' AND t.status = ?'
    params.push(status)
  }
  sql += ' ORDER BY t.status ASC, t.board_order ASC, t.id ASC'
  return tasks.listTasks(sql, params)
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
  const difficultyId = Number(body.difficulty_id)
  const usesBoard = body.uses_board === undefined ? false : Boolean(body.uses_board)

  if (!(await tasks.findOwnedCourse(courseId, userId, true))) {
    throw new AppError('Curso no válido')
  }
  if (!(await tasks.findDifficulty(difficultyId))) {
    throw new AppError('Dificultad no válida')
  }
  await assertCanCreateTask(userId)

  const nextOrder = await tasks.nextBoardOrder(userId, 'pending')
  const taskId = await tasks.insertTask([
    userId,
    courseId,
    difficultyId,
    title,
    description,
    kind,
    nextOrder,
    usesBoard,
    dueDate,
  ])
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

  const status = parseStatus(String(body.status ?? ''))
  const kind = parseKind(String(body.task_kind ?? ''))
  const dueDate = resolveDueDate(kind, body.due_date, today)
  const description = readDescription(body.description)
  const courseId = Number(body.course_id)
  const difficultyId = Number(body.difficulty_id)
  const usesBoard = body.uses_board === undefined ? undefined : Boolean(body.uses_board)

  if (!(await tasks.findOwnedCourse(courseId, userId, false))) {
    throw new AppError('Curso no válido')
  }
  if (!(await tasks.findDifficulty(difficultyId))) {
    throw new AppError('Dificultad no válida')
  }

  const current = await requireTask(taskId, userId)
  let nextDifficultyCode = current.difficulty_code
  if (difficultyId !== current.difficulty_id) {
    const difficulty = await tasks.findDifficulty(difficultyId)
    if (!difficulty) throw new AppError('Dificultad no válida')
    nextDifficultyCode = difficulty.code as string
  }

  ensureCanMarkDone(nextDifficultyCode, current.study_passed, current.status, status)

  let boardOrder = current.board_order
  if (current.status !== status) {
    boardOrder = await tasks.nextBoardOrder(userId, status)
  }

  const nextUsesBoard = usesBoard === undefined ? current.uses_board : usesBoard
  const nextModeChosen =
    body.study_mode_chosen === undefined
      ? current.study_mode_chosen
      : Boolean(body.study_mode_chosen)

  const affected = await tasks.updateTask([
    title,
    description,
    courseId,
    difficultyId,
    kind,
    dueDate,
    status,
    boardOrder,
    nextUsesBoard,
    nextModeChosen,
    taskId,
    userId,
  ])
  if (affected === 0) throw new AppError('Tarea no encontrada', 404)
  const xp = await maybeAwardTaskDoneXp({
    userId,
    taskId,
    previousStatus: current.status,
    nextStatus: status,
    studyPassed: current.study_passed,
  })
  const task = await requireTask(taskId, userId)
  return xp ? { ...task, xp_gained: xp.xp_gained, xp } : task
}

export async function moveTask(userId: number, body: Record<string, unknown>) {
  const taskId = Number(body.task_id)
  const status = parseStatus(String(body.status ?? ''))
  const boardOrder = Number(body.board_order)
  const current = await requireTask(taskId, userId)
  ensureCanMarkDone(current.difficulty_code, current.study_passed, current.status, status)

  const affected = await tasks.moveTask(status, boardOrder, taskId, userId)
  if (affected === 0) throw new AppError('Tarea no encontrada', 404)
  const xp = await maybeAwardTaskDoneXp({
    userId,
    taskId,
    previousStatus: current.status,
    nextStatus: status,
    studyPassed: current.study_passed,
  })
  const task = await requireTask(taskId, userId)
  return xp ? { ...task, xp_gained: xp.xp_gained, xp } : task
}

export async function reorderTasks(userId: number, body: { items?: unknown }) {
  const items = Array.isArray(body.items) ? body.items : body
  if (!Array.isArray(items)) throw new AppError('Lista de tareas inválida')

  const parsed = items.map((item) => {
    const row = item as { task_id?: unknown; status?: unknown; board_order?: unknown }
    return {
      taskId: Number(row.task_id),
      status: parseStatus(String(row.status ?? '')),
      boardOrder: Number(row.board_order),
    }
  })

  const doneAwards = await tasks.reorderInTransaction(userId, parsed, (current, nextStatus) => {
    ensureCanMarkDone(
      current.difficulty_code,
      current.study_passed,
      current.status,
      nextStatus,
    )
  })
  for (const award of doneAwards) {
    await maybeAwardTaskDoneXp({
      userId,
      taskId: award.taskId,
      previousStatus: award.previousStatus,
      nextStatus: award.nextStatus,
      studyPassed: award.studyPassed,
    })
  }
  return { ok: true }
}
