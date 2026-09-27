import type { RowDataPacket } from '../db/pool.js'
import { pool } from '../db/pool.js'
import { REPLY_PAUSE_SECONDS } from './helpers.js'

export async function latencyForTaskReply(taskId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT created_at
     FROM study_messages
     WHERE task_id = ? AND role = 'assistant'
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [taskId],
  )
  return measureLatency(rows[0]?.created_at)
}

export async function latencyForMissionReply(missionId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT created_at
     FROM study_mission_messages
     WHERE mission_id = ? AND role = 'assistant'
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [missionId],
  )
  return measureLatency(rows[0]?.created_at)
}

function measureLatency(raw: unknown): {
  reply_latency_seconds: number | null
  is_pause: boolean
} {
  if (raw == null) {
    return { reply_latency_seconds: null, is_pause: false }
  }
  const then = raw instanceof Date ? raw : new Date(String(raw))
  if (Number.isNaN(then.getTime())) {
    return { reply_latency_seconds: null, is_pause: false }
  }
  const seconds = Math.max(0, Math.round((Date.now() - then.getTime()) / 1000))
  return {
    reply_latency_seconds: seconds,
    is_pause: seconds > REPLY_PAUSE_SECONDS,
  }
}
