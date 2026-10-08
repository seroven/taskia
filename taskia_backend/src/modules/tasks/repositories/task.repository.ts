import {
  And,
  In,
  LessThan,
  MoreThanOrEqual,
  type EntityManager,
  type FindOptionsWhere,
} from 'typeorm'
import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import { Course, Task } from '../../../infrastructure/database/entities/index.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { formatCivilDate, toInstantISO } from '../../../utils/helpers.js'

export type TaskRecord = {
  id: number
  user_id: number
  course_id: number
  course_name: string
  title: string
  description: string | null
  task_kind: string
  status: string
  needs_help: boolean
  due_date: string
  created_at: string
  updated_at: string
}

function tasksOf(manager?: EntityManager) {
  return (manager ?? AppDataSource.manager).getRepository(Task)
}

function mapTask(task: Task, course: Course): TaskRecord {
  return {
    id: task.id,
    user_id: task.userId,
    course_id: task.courseId,
    course_name: course.name,
    title: task.title,
    description: task.description,
    task_kind: task.taskKind,
    status: task.status,
    needs_help: Boolean(task.needsHelp),
    due_date: formatCivilDate(task.dueDate),
    created_at: toInstantISO(task.createdAt) ?? '',
    updated_at: toInstantISO(task.updatedAt) ?? '',
  }
}

async function hydrate(rows: Task[], manager?: EntityManager): Promise<TaskRecord[]> {
  if (rows.length === 0) return []
  const db = manager ?? AppDataSource.manager
  const courseIds = [...new Set(rows.map((row) => row.courseId))]
  const courses = await db.getRepository(Course).find({ where: { id: In(courseIds) } })
  const courseById = new Map(courses.map((course) => [course.id, course]))
  return rows.map((row) => {
    const course = courseById.get(row.courseId)
    if (!course) throw new AppError('Tarea no encontrada', 404)
    return mapTask(row, course)
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
    order: { status: 'ASC', id: 'ASC' },
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

export async function insertTask(input: {
  userId: number
  courseId: number
  title: string
  description: string | null
  taskKind: string
  needsHelp: boolean
  dueDate: string
}) {
  const repo = tasksOf()
  const saved = await repo.save(
    repo.create({
      userId: input.userId,
      courseId: input.courseId,
      title: input.title,
      description: input.description,
      taskKind: input.taskKind,
      status: 'pending',
      needsHelp: input.needsHelp,
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
  taskKind: string
  needsHelp: boolean
  dueDate: string
}) {
  const result = await tasksOf().update(
    { id: input.taskId, userId: input.userId },
    {
      title: input.title,
      description: input.description,
      courseId: input.courseId,
      taskKind: input.taskKind,
      needsHelp: input.needsHelp,
      dueDate: input.dueDate,
    },
  )
  return result.affected ?? 0
}

export async function setTaskStatus(taskId: number, userId: number, status: string) {
  const result = await tasksOf().update({ id: taskId, userId }, { status })
  return result.affected ?? 0
}
