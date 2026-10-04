import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import {
  StudyBoard,
  StudyMessage,
  StudySession,
  Task,
  UserStudyMemory,
} from '../../../infrastructure/database/entities/index.js'
import { toInstantISO } from '../../../utils/helpers.js'
import { latencyForTaskReply } from '../../../utils/replyLatency.js'

export function emptyBoard() {
  return {
    type: 'taskia-grid',
    version: 1,
    source: 'taskia-grid',
    cols: 160,
    rows: 100,
    items: [],
  }
}

export function coerceBoard(raw: unknown) {
  if (raw && typeof raw === 'object') {
    const rec = raw as { type?: string; source?: string; items?: unknown }
    if (rec.type === 'taskia-grid' || rec.source === 'taskia-grid') {
      return raw
    }
  }
  return emptyBoard()
}

export async function ensureSession(taskId: number) {
  await AppDataSource.getRepository(StudySession)
    .createQueryBuilder()
    .insert()
    .into(StudySession)
    .values({
      taskId,
      tutorPhase: 'understanding',
      topicSummary: '',
      contextSummary: '',
      hintsLevel: 0,
    })
    .orIgnore()
    .execute()
}

export async function loadContext(taskId: number) {
  await ensureSession(taskId)
  const session = await AppDataSource.getRepository(StudySession).findOneByOrFail({ taskId })
  const messages = await AppDataSource.getRepository(StudyMessage).find({
    where: { taskId },
    order: { createdAt: 'ASC', id: 'ASC' },
  })
  return {
    task_id: taskId,
    updated_at: toInstantISO(session.updatedAt) ?? '',
    tutor_phase: session.tutorPhase,
    topic_summary: session.topicSummary,
    context_summary: session.contextSummary,
    hints_level: session.hintsLevel,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
      created_at: toInstantISO(message.createdAt) ?? '',
    })),
  }
}

export async function loadBoard(taskId: number) {
  const row = await AppDataSource.getRepository(StudyBoard).findOne({ where: { taskId } })
  if (row?.boardJson) {
    try {
      const parsed = JSON.parse(row.boardJson) as unknown
      return coerceBoard(parsed)
    } catch {
      /* fallthrough */
    }
  }
  const board = emptyBoard()
  await saveBoard(taskId, board)
  return board
}

export async function saveBoard(taskId: number, board: unknown) {
  await AppDataSource.getRepository(StudyBoard)
    .createQueryBuilder()
    .insert()
    .into(StudyBoard)
    .values({ taskId, boardJson: JSON.stringify(board) })
    .orUpdate(['board_json'], ['task_id'])
    .execute()
}

export async function insertMessage(
  taskId: number,
  role: string,
  content: string,
  fromVoice = false,
) {
  const latency =
    role === 'user'
      ? await latencyForTaskReply(taskId)
      : { reply_latency_seconds: null, is_pause: false }
  const repo = AppDataSource.getRepository(StudyMessage)
  const saved = await repo.save(
    repo.create({
      taskId,
      role,
      content,
      fromVoice,
      replyLatencySeconds: latency.reply_latency_seconds,
      isPause: latency.is_pause,
    }),
  )
  const createdAt = saved.createdAt ?? (await repo.findOneBy({ id: saved.id }))?.createdAt
  return {
    role,
    content,
    created_at: toInstantISO(createdAt) ?? '',
  }
}

export async function loadUserMemory(userId: number) {
  const row = await AppDataSource.getRepository(UserStudyMemory).findOne({ where: { userId } })
  return row?.memorySummary ?? ''
}

export async function saveUserMemory(userId: number, summary: string) {
  await AppDataSource.getRepository(UserStudyMemory)
    .createQueryBuilder()
    .insert()
    .into(UserStudyMemory)
    .values({ userId, memorySummary: summary })
    .orUpdate(['memory_summary'], ['user_id'])
    .execute()
}

export async function saveSessionMeta(ctx: {
  task_id: number
  tutor_phase: string
  topic_summary: string
  context_summary: string
  hints_level: number
}) {
  await AppDataSource.getRepository(StudySession).update(
    { taskId: ctx.task_id },
    {
      tutorPhase: ctx.tutor_phase,
      topicSummary: ctx.topic_summary,
      contextSummary: ctx.context_summary,
      hintsLevel: ctx.hints_level,
    },
  )
}

export async function markStudyPassed(taskId: number, userId: number) {
  await AppDataSource.getRepository(Task).update(
    { id: taskId, userId },
    { studyPassed: true },
  )
}
