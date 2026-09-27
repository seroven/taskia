import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from '../db/pool.js'
import { pool } from '../db/pool.js'
import {
  assertParentLinked,
  requireAuth,
  requireParent,
} from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { callGemini } from '../services/gemini.js'
import { AppError, extractJson, toInstantISO } from '../utils/helpers.js'
import { viewerDates } from '../db/civilDate.js'

const router = Router()

router.use(requireAuth)
router.use(requireParent)

function mapExplorer(r: RowDataPacket) {
  return {
    id: Number(r.id),
    username: r.username as string,
    email: r.email as string,
    is_active: Number(r.is_active) !== 0,
  }
}

async function requireLinkedExplorer(parentId: number, studentId: number) {
  await assertParentLinked(parentId, studentId)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.username, u.email, u.is_active
     FROM users u
     WHERE u.id = ?
       AND EXISTS (SELECT 1 FROM roles _r WHERE _r.id = u.role_id AND _r.code = 'user')
     LIMIT 1`,
    [studentId],
  )
  if (!rows[0]) throw new AppError('Explorador no encontrado', 404)
  return mapExplorer(rows[0])
}

router.get(
  '/explorers',
  asyncHandler(async (req, res) => {
    const parentId = req.user!.id
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.email, u.is_active
       FROM parent_student_links l
       INNER JOIN users u ON u.id = l.student_id
       WHERE l.parent_id = ? AND l.is_active = 1
         AND EXISTS (SELECT 1 FROM roles _r WHERE _r.id = u.role_id AND _r.code = 'user')
       ORDER BY u.username ASC`,
      [parentId],
    )
    res.json(rows.map(mapExplorer))
  }),
)

router.get(
  '/explorers/:studentId/overview',
  asyncHandler(async (req, res) => {
    const parentId = req.user!.id
    const studentId = Number(req.params.studentId)
    const explorer = await requireLinkedExplorer(parentId, studentId)
    const { today } = viewerDates(req)

    const [taskRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         SUM(status = 'pending') AS pending,
         SUM(status = 'in_progress') AS in_progress,
         SUM(status = 'studying') AS studying,
         SUM(status = 'done') AS done,
         SUM(status <> 'done' AND due_date < ?) AS overdue,
         COUNT(*) AS total
       FROM tasks WHERE user_id = ?`,
      [today, studentId],
    )
    const [missionRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         SUM(m.status = 'pending') AS pending,
         SUM(m.status = 'studying') AS studying,
         SUM(m.status = 'mastered') AS mastered,
         COUNT(*) AS total
       FROM study_missions m
       INNER JOIN study_worlds w ON w.id = m.world_id
       WHERE w.user_id = ? AND m.is_active = 1 AND w.is_active = 1`,
      [studentId],
    )
    const [challengeRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS completed_count, AVG(score) AS avg_score
       FROM study_challenges
       WHERE user_id = ? AND status = 'completed'`,
      [studentId],
    )
    const [worldCount] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS c FROM study_worlds WHERE user_id = ? AND is_active = 1',
      [studentId],
    )

    res.json({
      explorer,
      tasks: {
        pending: Number(taskRows[0]?.pending) || 0,
        in_progress: Number(taskRows[0]?.in_progress) || 0,
        studying: Number(taskRows[0]?.studying) || 0,
        done: Number(taskRows[0]?.done) || 0,
        overdue: Number(taskRows[0]?.overdue) || 0,
        total: Number(taskRows[0]?.total) || 0,
      },
      missions: {
        pending: Number(missionRows[0]?.pending) || 0,
        studying: Number(missionRows[0]?.studying) || 0,
        mastered: Number(missionRows[0]?.mastered) || 0,
        total: Number(missionRows[0]?.total) || 0,
      },
      challenges: {
        completed_count: Number(challengeRows[0]?.completed_count) || 0,
        avg_score:
          challengeRows[0]?.avg_score == null
            ? null
            : Number(challengeRows[0].avg_score),
      },
      worlds_count: Number(worldCount[0]?.c) || 0,
    })
  }),
)

function mapPrefs(r: RowDataPacket) {
  return {
    whatsapp_e164: (r.whatsapp_e164 as string | null) ?? null,
    notify_task_done: Number(r.notify_task_done) !== 0,
    notify_task_study_done: Number(r.notify_task_study_done) !== 0,
    notify_mission_done: Number(r.notify_mission_done) !== 0,
    notify_course_done: Number(r.notify_course_done) !== 0,
    notify_world_done: Number(r.notify_world_done) !== 0,
    notify_challenge_done: Number(r.notify_challenge_done) !== 0,
    notify_inactivity: Number(r.notify_inactivity) !== 0,
  }
}

async function loadOrCreatePrefs(parentId: number) {
  await pool.query(
    `INSERT INTO parent_notify_prefs (parent_id) VALUES (?)
     ON CONFLICT (parent_id) DO NOTHING`,
    [parentId],
  )
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM parent_notify_prefs WHERE parent_id = ? LIMIT 1',
    [parentId],
  )
  if (!rows[0]) throw new AppError('No se pudieron cargar las preferencias', 500)
  return mapPrefs(rows[0])
}

router.get(
  '/notify-prefs',
  asyncHandler(async (req, res) => {
    res.json(await loadOrCreatePrefs(req.user!.id))
  }),
)

router.patch(
  '/notify-prefs',
  asyncHandler(async (req, res) => {
    const parentId = req.user!.id
    await loadOrCreatePrefs(parentId)
    const current = await loadOrCreatePrefs(parentId)

    const whatsapp =
      req.body.whatsapp_e164 === undefined
        ? current.whatsapp_e164
        : req.body.whatsapp_e164 == null || req.body.whatsapp_e164 === ''
          ? null
          : String(req.body.whatsapp_e164).trim()

    const bool = (key: keyof typeof current, bodyKey: string) =>
      req.body[bodyKey] === undefined
        ? current[key]
        : Boolean(req.body[bodyKey])

    await pool.query(
      `UPDATE parent_notify_prefs SET
         whatsapp_e164 = ?,
         notify_task_done = ?,
         notify_task_study_done = ?,
         notify_mission_done = ?,
         notify_course_done = ?,
         notify_world_done = ?,
         notify_challenge_done = ?,
         notify_inactivity = ?
       WHERE parent_id = ?`,
      [
        whatsapp,
        bool('notify_task_done', 'notify_task_done'),
        bool('notify_task_study_done', 'notify_task_study_done'),
        bool('notify_mission_done', 'notify_mission_done'),
        bool('notify_course_done', 'notify_course_done'),
        bool('notify_world_done', 'notify_world_done'),
        bool('notify_challenge_done', 'notify_challenge_done'),
        bool('notify_inactivity', 'notify_inactivity'),
        parentId,
      ],
    )
    res.json(await loadOrCreatePrefs(parentId))
  }),
)

router.get(
  '/explorers/:studentId/chat',
  asyncHandler(async (req, res) => {
    const parentId = req.user!.id
    const studentId = Number(req.params.studentId)
    await requireLinkedExplorer(parentId, studentId)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, role, content, created_at
       FROM parent_chat_messages
       WHERE parent_id = ? AND student_id = ? AND is_active = 1
       ORDER BY id ASC
       LIMIT 200`,
      [parentId, studentId],
    )
    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        role: r.role as string,
        content: r.content as string,
        created_at: toInstantISO(r.created_at as Date | string) ?? '',
      })),
    )
  }),
)

router.post(
  '/explorers/:studentId/chat',
  asyncHandler(async (req, res) => {
    const parentId = req.user!.id
    const studentId = Number(req.params.studentId)
    const explorer = await requireLinkedExplorer(parentId, studentId)
    const message = String(req.body.message ?? '').trim()
    if (!message) throw new AppError('Escribe un mensaje')
    if (message.length > 4000) throw new AppError('El mensaje es demasiado largo')

    const { today } = viewerDates(req)
    const [summaryRows] = await pool.query<RowDataPacket[]>(
      `SELECT summary_text, summary_date
       FROM student_daily_summaries
       WHERE student_id = ? AND summary_date = ? AND is_active = 1
       LIMIT 1`,
      [studentId, today],
    )
    const todaySummary =
      summaryRows[0] != null
        ? String(summaryRows[0].summary_text ?? '').trim()
        : ''

    const [histRows] = await pool.query<RowDataPacket[]>(
      `SELECT role, content
       FROM parent_chat_messages
       WHERE parent_id = ? AND student_id = ? AND is_active = 1
       ORDER BY id DESC
       LIMIT 20`,
      [parentId, studentId],
    )
    const history = histRows.reverse()

    await pool.query(
      `INSERT INTO parent_chat_messages (parent_id, student_id, role, content)
       VALUES (?, ?, 'user', ?)`,
      [parentId, studentId, message],
    )

    const summaryBlock = todaySummary
      ? `Resumen del progreso de hoy (${today}) para el explorador ${explorer.username}:\n${todaySummary}`
      : `NO hay resumen diario del día ${today} para el explorador ${explorer.username}. Si el guardián pregunta por el avance de hoy o en general, dilo con claridad: todavía no hay un resumen elaborado para hoy. No inventes datos de progreso.`

    const system = `Eres un asistente para el guardián de Taskia (español latinoamericano, tono adulto, claro y breve).
El guardián acompaña al explorador "${explorer.username}" pero no juega el tablero.
${summaryBlock}

Reglas:
- Habla al guardián, no al explorador.
- Usa "explorador" y "guardián"; no digas alumno, hijo ni padre.
- Si no hay resumen de hoy, no inventes métricas ni eventos.
- Responde en JSON: { "reply": "texto para el guardián" }.`

    const historyText = history
      .map((m) => `${m.role === 'user' ? 'Guardián' : 'Asistente'}: ${m.content}`)
      .join('\n')

    const raw = await callGemini({
      system,
      user: `${historyText ? `Historial reciente:\n${historyText}\n\n` : ''}Nuevo mensaje del guardián:\n${message}`,
      usage: { userId: parentId, kind: 'parent_tutor' },
    })

    let reply = ''
    try {
      const parsed = extractJson(raw) as { reply?: string }
      reply = String(parsed.reply ?? '').trim()
    } catch {
      reply = raw.trim()
    }
    if (!reply) {
      reply =
        'No pude armar una respuesta ahora. Intenta de nuevo en un momento.'
    }

    const [ins] = await pool.query<ResultSetHeader>(
      `INSERT INTO parent_chat_messages (parent_id, student_id, role, content)
       VALUES (?, ?, 'assistant', ?)`,
      [parentId, studentId, reply],
    )

    res.json({
      id: ins.insertId,
      role: 'assistant',
      content: reply,
      created_at: toInstantISO(new Date()) ?? '',
      has_today_summary: Boolean(todaySummary),
      summary_date: today,
    })
  }),
)

export default router
