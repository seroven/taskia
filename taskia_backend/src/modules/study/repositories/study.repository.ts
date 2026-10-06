import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import {
  StudyMessage,
  StudySession,
  Task,
  UserStudyMemory,
} from '../../../infrastructure/database/entities/index.js'
import { toInstantISO } from '../../../utils/helpers.js'
import { latencyForTaskReply } from '../../../utils/replyLatency.js'

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
    exercise_brief: session.exerciseBrief ?? '',
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
      image_url: message.imageUrl,
      created_at: toInstantISO(message.createdAt) ?? '',
    })),
  }
}

export async function insertMessage(
  taskId: number,
  role: string,
  content: string,
  fromVoice = false,
  imageUrl: string | null = null,
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
      imageUrl,
      replyLatencySeconds: latency.reply_latency_seconds,
      isPause: latency.is_pause,
    }),
  )
  const createdAt = saved.createdAt ?? (await repo.findOneBy({ id: saved.id }))?.createdAt
  return {
    role,
    content,
    image_url: imageUrl,
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

export async function saveExerciseBrief(taskId: number, brief: string) {
  await AppDataSource.getRepository(StudySession).update({ taskId }, { exerciseBrief: brief })
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
