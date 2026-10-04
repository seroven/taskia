import {
  And,
  In,
  LessThan,
  MoreThanOrEqual,
  type EntityManager,
  type FindOptionsWhere,
} from 'typeorm'
import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import { Course, Difficulty, Task } from '../../../infrastructure/database/entities/index.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { formatCivilDate, toInstantISO } from '../../../utils/helpers.js'

export type TaskRecord = {
  id: number
  user_id: number
  course_id: number
  course_name: string
  difficulty_id: number
  difficulty_code: string
  difficulty_name: string
  title: string
  description: string | null
  task_kind: string
  status: string
  board_order: number
  study_passed: boolean
  uses_board: boolean
  study_mode_chosen: boolean
  due_date: string
  created_at: string
  updated_at: string
}

function tasksOf(manager?: EntityManager) {
  return (manager ?? AppDataSource.manager).getRepository(Task)
}

function mapTask(task: Task, course: Course, difficulty: Difficulty): TaskRecord {
  return {
    id: task.id,
    user_id: task.userId,
    course_id: task.courseId,
    course_name: course.name,
    difficulty_id: task.difficultyId,
    difficulty_code: difficulty.code,
    difficulty_name: difficulty.name,
    title: task.title,
    description: task.description,
    task_kind: task.taskKind,
    status: task.status,
    board_order: task.boardOrder,
    study_passed: task.studyPassed,
    uses_board: task.usesBoard,
    study_mode_chosen: task.studyModeChosen,
    due_date: formatCivilDate(task.dueDate),
    created_at: toInstantISO(task.createdAt) ?? '',
    updated_at: toInstantISO(task.updatedAt) ?? '',
  }
}

async function hydrate(rows: Task[], manager?: EntityManager): Promise<TaskRecord[]> {
  if (rows.length === 0) return []
  const db = manager ?? AppDataSource.manager
  const courseIds = [...new Set(rows.map((row) => row.courseId))]
  const difficultyIds = [...new Set(rows.map((row) => row.difficultyId))]
  const [courses, difficulties] = await Promise.all([
    db.getRepository(Course).find({ where: { id: In(courseIds) } }),
    db.getRepository(Difficulty).find({ where: { id: In(difficultyIds) } }),
  ])
  const courseById = new Map(courses.map((course) => [course.id, course]))
  const difficultyById = new Map(difficulties.map((difficulty) => [difficulty.id, difficulty]))
  return rows.map((row) => {
    const course = courseById.get(row.courseId)
    const difficulty = difficultyById.get(row.difficultyId)
    if (!course || !difficulty) {
      throw new AppError('Tarea no encontrada', 404)
    }
    return mapTask(row, course, difficulty)
  })
}

export async function findTask(taskId: number, userId: number, manager?: EntityManager) {
  const task = await tasksOf(manager).findOne({ where: { id: taskId, userId } })
  if (!task) return null
  const [mapped] = await hydrate([task], manager)
  return mapped ?? null
}

export async function listTasks(
  userId: number,
  filter: {
    createdFrom?: Date
    createdTo?: Date
    dueOn?: string
    courseId?: number
    status?: string
  },
) {
  const where: FindOptionsWhere<Task> = { userId }
  if (filter.createdFrom && filter.createdTo) {
    where.createdAt = And(MoreThanOrEqual(filter.createdFrom), LessThan(filter.createdTo))
  }
  if (filter.dueOn) where.dueDate = filter.dueOn
  if (filter.courseId) where.courseId = filter.courseId
  if (filter.status) where.status = filter.status

  const rows = await tasksOf().find({
    where,
    order: { status: 'ASC', boardOrder: 'ASC', id: 'ASC' },
  })
  return hydrate(rows)
}

export async function findOwnedCourse(courseId: number, userId: number, mustBeActive: boolean) {
  const where: FindOptionsWhere<Course> = { id: courseId, userId }
  if (mustBeActive) where.isActive = true
  return AppDataSource.getRepository(Course).findOne({
    where,
    select: { id: true },
  })
}

export async function findDifficulty(difficultyId: number) {
  return AppDataSource.getRepository(Difficulty).findOne({
    where: { id: difficultyId },
    select: { id: true, code: true },
  })
}

export async function nextBoardOrder(userId: number, status: string) {
  const row = await tasksOf()
    .createQueryBuilder('t')
    .select('MAX(t.board_order)', 'm')
    .where('t.user_id = :userId AND t.status = :status', { userId, status })
    .getRawOne<{ m: string | number | null }>()
  return row?.m == null ? 0 : Number(row.m) + 1
}

export async function insertTask(input: {
  userId: number
  courseId: number
  difficultyId: number
  title: string
  description: string | null
  taskKind: string
  boardOrder: number
  usesBoard: boolean
  dueDate: string
}) {
  const repo = tasksOf()
  const saved = await repo.save(
    repo.create({
      userId: input.userId,
      courseId: input.courseId,
      difficultyId: input.difficultyId,
      title: input.title,
      description: input.description,
      taskKind: input.taskKind,
      status: 'pending',
      boardOrder: input.boardOrder,
      usesBoard: input.usesBoard,
      dueDate: input.dueDate,
    }),
  )
  return saved.id
}

export async function updateTask(input: {
  taskId: number
  userId: number
  title: string
  description: string | null
  courseId: number
  difficultyId: number
  taskKind: string
  dueDate: string
  status: string
  boardOrder: number
  usesBoard: boolean
  studyModeChosen: boolean
}) {
  const result = await tasksOf().update(
    { id: input.taskId, userId: input.userId },
    {
      title: input.title,
      description: input.description,
      courseId: input.courseId,
      difficultyId: input.difficultyId,
      taskKind: input.taskKind,
      dueDate: input.dueDate,
      status: input.status,
      boardOrder: input.boardOrder,
      usesBoard: input.usesBoard,
      studyModeChosen: input.studyModeChosen,
    },
  )
  return result.affected ?? 0
}

export async function moveTask(status: string, boardOrder: number, taskId: number, userId: number) {
  const result = await tasksOf().update({ id: taskId, userId }, { status, boardOrder })
  return result.affected ?? 0
}

export async function reorderInTransaction(
  userId: number,
  items: Array<{ taskId: number; status: string; boardOrder: number }>,
  assertCanChange: (current: TaskRecord, nextStatus: string) => void,
) {
  return AppDataSource.transaction(async (manager) => {
    const doneAwards: Array<{
      taskId: number
      previousStatus: string
      nextStatus: string
      studyPassed: boolean
    }> = []
    for (const item of items) {
      const current = await findTask(item.taskId, userId, manager)
      if (!current) throw new AppError(`Tarea ${item.taskId} no encontrada`, 404)
      assertCanChange(current, item.status)
      await tasksOf(manager).update(
        { id: item.taskId, userId },
        { status: item.status, boardOrder: item.boardOrder },
      )
      doneAwards.push({
        taskId: item.taskId,
        previousStatus: current.status,
        nextStatus: item.status,
        studyPassed: current.study_passed,
      })
    }
    return doneAwards
  })
}
