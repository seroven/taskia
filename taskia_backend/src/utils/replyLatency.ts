import { AppDataSource } from '../infrastructure/database/data-source.js'
import { StudyMessage, StudyMissionMessage } from '../infrastructure/database/entities/index.js'
import { REPLY_PAUSE_SECONDS } from './helpers.js'

export async function latencyForTaskReply(taskId: number) {
  const message = await AppDataSource.getRepository(StudyMessage).findOne({
    where: { taskId, role: 'assistant' },
    order: { createdAt: 'DESC', id: 'DESC' },
  })
  return measureLatency(message?.createdAt)
}

export async function latencyForMissionReply(missionId: number) {
  const message = await AppDataSource.getRepository(StudyMissionMessage).findOne({
    where: { missionId, role: 'assistant' },
    order: { createdAt: 'DESC', id: 'DESC' },
  })
  return measureLatency(message?.createdAt)
}

function measureLatency(raw: Date | undefined): {
  reply_latency_seconds: number | null
  is_pause: boolean
} {
  if (raw == null || Number.isNaN(raw.getTime())) {
    return { reply_latency_seconds: null, is_pause: false }
  }
  const seconds = Math.max(0, Math.round((Date.now() - raw.getTime()) / 1000))
  return {
    reply_latency_seconds: seconds,
    is_pause: seconds > REPLY_PAUSE_SECONDS,
  }
}
