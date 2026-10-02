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
import { progressFromXpTotal, weekStartMonday } from '../services/xp.js'
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

function mapTroopRole(role: string) {
  if (role === 'captain' || role === 'copilot' || role === 'member') return role
  return 'member' as const
}

async function loadExplorerTroop(studentId: number) {
  const [membership] = await pool.query<RowDataPacket[]>(
    `SELECT tm.troop_id, tm.role, t.name AS troop_name
     FROM troop_members tm
     INNER JOIN troops t ON t.id = tm.troop_id AND t.is_active = TRUE
     WHERE tm.user_id = ? AND tm.left_at IS NULL
     LIMIT 1`,
    [studentId],
  )
  if (!membership[0]) return null

  const troopId = Number(membership[0].troop_id)
  const weekStart = weekStartMonday()
  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT tm.user_id, u.username, tm.role, u.level, u.xp_total,
            COALESCE((
              SELECT SUM(a.amount) FROM xp_awards a
              WHERE a.user_id = tm.user_id AND a.week_start = ?
            ), 0) AS xp_week
     FROM troop_members tm
     INNER JOIN users u ON u.id = tm.user_id
     WHERE tm.troop_id = ? AND tm.left_at IS NULL
     ORDER BY u.level DESC, u.xp_total DESC, tm.joined_at ASC`,
    [weekStart, troopId],
  )

  const ranked = members.map((m, i) => ({
    user_id: Number(m.user_id),
    username: m.username as string,
    role: mapTroopRole(String(m.role)),
    level: Number(m.level ?? 1),
    xp_total: Number(m.xp_total ?? 0),
    xp_week: Number(m.xp_week ?? 0),
    rank: i + 1,
  }))
  const mine = ranked.find((m) => m.user_id === studentId)

  const [weekly] = await pool.query<RowDataPacket[]>(
    `SELECT t.id,
            COALESCE(SUM(a.amount), 0) AS xp_week
     FROM troops t
     INNER JOIN troop_members tm
       ON tm.troop_id = t.id AND tm.left_at IS NULL
     LEFT JOIN xp_awards a
       ON a.user_id = tm.user_id AND a.week_start = ?
     WHERE t.is_active = TRUE
     GROUP BY t.id, t.name
     ORDER BY xp_week DESC, COUNT(DISTINCT tm.user_id) DESC, t.name ASC`,
    [weekStart],
  )
  const weeklyRank =
    weekly.findIndex((r) => Number(r.id) === troopId) + 1 || null

  return {
    id: troopId,
    name: membership[0].troop_name as string,
    my_role: mapTroopRole(String(membership[0].role)),
    my_rank: mine?.rank ?? null,
    member_count: ranked.length,
    weekly_rank: weeklyRank,
    members: ranked,
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

    const [xpRows] = await pool.query<RowDataPacket[]>(
      `SELECT level, xp_total FROM users WHERE id = ? LIMIT 1`,
      [studentId],
    )
    const xp = progressFromXpTotal(Number(xpRows[0]?.xp_total ?? 0))

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

    const troop = await loadExplorerTroop(studentId)

    res.json({
      explorer,
      xp,
      troop,
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
