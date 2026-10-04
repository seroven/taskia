import type { ResultSetHeader, RowDataPacket } from '../../../infrastructure/database/pool.js'
import { pool } from '../../../infrastructure/database/pool.js'
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
  await pool.query(
    `INSERT INTO study_sessions (task_id, tutor_phase, topic_summary, context_summary, hints_level)
     VALUES (?, 'understanding', '', '', 0)
     ON CONFLICT (task_id) DO NOTHING`,
    [taskId],
  )
}

export async function loadContext(taskId: number) {
  await ensureSession(taskId)
  const [sess] = await pool.query<RowDataPacket[]>(
    `SELECT tutor_phase, topic_summary, context_summary, hints_level, updated_at
     FROM study_sessions WHERE task_id = ?`,
    [taskId],
  )
  const s = sess[0]
  const [msgs] = await pool.query<RowDataPacket[]>(
    `SELECT role, content, created_at FROM study_messages
     WHERE task_id = ? ORDER BY created_at ASC, id ASC`,
    [taskId],
  )
  return {
    task_id: taskId,
    updated_at: toInstantISO(s.updated_at as Date) ?? '',
    tutor_phase: s.tutor_phase as string,
    topic_summary: s.topic_summary as string,
    context_summary: s.context_summary as string,
    hints_level: Number(s.hints_level),
    messages: msgs.map((m) => ({
      role: m.role as string,
      content: m.content as string,
      created_at: toInstantISO(m.created_at as Date) ?? '',
    })),
  }
}

export async function loadBoard(taskId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT board_json FROM study_boards WHERE task_id = ?',
    [taskId],
  )
  if (rows[0]?.board_json) {
    try {
      const raw = rows[0].board_json
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
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
  await pool.query(
    `INSERT INTO study_boards (task_id, board_json) VALUES (?, ?)
     ON CONFLICT (task_id) DO UPDATE SET board_json = EXCLUDED.board_json`,
    [taskId, JSON.stringify(board)],
  )
}

export async function insertMessage(
  taskId: number,
  role: string,
  content: string,
  fromVoice = false,
) {
  let latency: { reply_latency_seconds: number | null; is_pause: boolean } = {
    reply_latency_seconds: null,
    is_pause: false,
  }
  if (role === 'user') {
    latency = await latencyForTaskReply(taskId)
  }
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO study_messages
       (task_id, role, content, from_voice, reply_latency_seconds, is_pause)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      taskId,
      role,
      content,
      fromVoice,
      latency.reply_latency_seconds,
      latency.is_pause,
    ],
  )
  const insertId = result.insertId
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT created_at FROM study_messages WHERE id = ?',
    [insertId],
  )
  return {
    role,
    content,
    created_at: toInstantISO(rows[0]?.created_at as Date) ?? '',
  }
}

export async function loadUserMemory(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT memory_summary FROM user_study_memory WHERE user_id = ?',
    [userId],
  )
  return (rows[0]?.memory_summary as string) ?? ''
}

export async function saveUserMemory(userId: number, summary: string) {
  await pool.query(
    `INSERT INTO user_study_memory (user_id, memory_summary) VALUES (?, ?)
     ON CONFLICT (user_id) DO UPDATE SET memory_summary = EXCLUDED.memory_summary`,
    [userId, summary],
  )
}

export async function saveSessionMeta(ctx: {
  task_id: number
  tutor_phase: string
  topic_summary: string
  context_summary: string
  hints_level: number
}) {
  await pool.query(
    `UPDATE study_sessions
     SET tutor_phase = ?, topic_summary = ?, context_summary = ?, hints_level = ?
     WHERE task_id = ?`,
    [
      ctx.tutor_phase,
      ctx.topic_summary,
      ctx.context_summary,
      ctx.hints_level,
      ctx.task_id,
    ],
  )
}

export async function markStudyPassed(taskId: number, userId: number) {
  await pool.query('UPDATE tasks SET study_passed = TRUE WHERE id = ? AND user_id = ?', [
    taskId,
    userId,
  ])
}
