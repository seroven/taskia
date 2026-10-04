import { assertParentLinked } from '../../../middleware/auth.middleware.js'
import { callGemini } from '../../../infrastructure/gemini/gemini.client.js'
import { progressFromXpTotal, weekStartMonday } from '../../../services/xp.js'
import { AppError, extractJson, toInstantISO } from '../../../utils/helpers.js'
import { guardianTutorSystem } from '../../../prompts/guardian.js'
import { parseGuardianChatMessage } from '../schemas/guardian.schema.js'
import * as guardian from '../repositories/guardian.repository.js'

function mapExplorer(row: { id: number; username: string; email: string; is_active: boolean }) {
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    is_active: row.is_active !== false,
  }
}

function mapTroopRole(role: string) {
  if (role === 'captain' || role === 'copilot' || role === 'member') return role
  return 'member' as const
}

async function loadExplorerTroop(studentId: number) {
  const membership = await guardian.findActiveTroop(studentId)
  if (!membership) return null

  const weekStart = weekStartMonday()
  const members = await guardian.listTroopMembers(membership.troopId, weekStart)
  const ranked = members.map((member, index) => ({
    user_id: member.userId,
    username: member.username,
    role: mapTroopRole(member.role),
    level: member.level,
    xp_total: member.xpTotal,
    xp_week: member.xpWeek,
    rank: index + 1,
  }))
  const mine = ranked.find((member) => member.user_id === studentId)

  return {
    id: membership.troopId,
    name: membership.troopName,
    my_role: mapTroopRole(membership.role),
    my_rank: mine?.rank ?? null,
    member_count: ranked.length,
    weekly_rank: await guardian.troopWeeklyRank(membership.troopId, weekStart),
    members: ranked,
  }
}

async function requireLinkedExplorer(parentId: number, studentId: number) {
  await assertParentLinked(parentId, studentId)
  const explorer = await guardian.findExplorerById(studentId)
  if (!explorer) throw new AppError('Explorador no encontrado', 404)
  return mapExplorer(explorer)
}

export async function listExplorers(parentId: number) {
  const rows = await guardian.listLinkedExplorers(parentId)
  return rows.map(mapExplorer)
}

export async function explorerOverview(parentId: number, studentId: number, today: string) {
  const explorer = await requireLinkedExplorer(parentId, studentId)
  const xp = progressFromXpTotal(await guardian.findProgress(studentId))
  const [tasks, missions, challenges, worldsCount, troop] = await Promise.all([
    guardian.taskCounts(studentId, today),
    guardian.missionCounts(studentId),
    guardian.challengeStats(studentId),
    guardian.countActiveWorlds(studentId),
    loadExplorerTroop(studentId),
  ])

  return {
    explorer,
    xp,
    troop,
    tasks,
    missions,
    challenges,
    worlds_count: worldsCount,
  }
}

async function loadOrCreatePrefs(parentId: number) {
  const prefs = await guardian.ensureNotifyPrefs(parentId)
  if (!prefs) throw new AppError('No se pudieron cargar las preferencias', 500)
  return prefs
}

export async function getNotifyPrefs(parentId: number) {
  return loadOrCreatePrefs(parentId)
}

export async function updateNotifyPrefs(parentId: number, body: Record<string, unknown>) {
  await loadOrCreatePrefs(parentId)
  const current = await loadOrCreatePrefs(parentId)

  const whatsapp =
    body.whatsapp_e164 === undefined
      ? current.whatsapp_e164
      : body.whatsapp_e164 == null || body.whatsapp_e164 === ''
        ? null
        : String(body.whatsapp_e164).trim()

  const bool = (key: keyof typeof current, bodyKey: string) =>
    body[bodyKey] === undefined ? current[key] : Boolean(body[bodyKey])

  await guardian.saveNotifyPrefs(parentId, {
    whatsapp_e164: whatsapp,
    notify_task_done: Boolean(bool('notify_task_done', 'notify_task_done')),
    notify_task_study_done: Boolean(bool('notify_task_study_done', 'notify_task_study_done')),
    notify_mission_done: Boolean(bool('notify_mission_done', 'notify_mission_done')),
    notify_course_done: Boolean(bool('notify_course_done', 'notify_course_done')),
    notify_world_done: Boolean(bool('notify_world_done', 'notify_world_done')),
    notify_challenge_done: Boolean(bool('notify_challenge_done', 'notify_challenge_done')),
    notify_inactivity: Boolean(bool('notify_inactivity', 'notify_inactivity')),
  })
  return loadOrCreatePrefs(parentId)
}

export async function listChat(parentId: number, studentId: number) {
  await requireLinkedExplorer(parentId, studentId)
  const rows = await guardian.listChatMessages(parentId, studentId)
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    created_at: toInstantISO(row.createdAt) ?? '',
  }))
}

const NO_SUMMARY_REPLY =
  'Todavía no hay un resumen del día para este explorador. Cuando lo haya, podré contarte cómo le fue.'

export async function sendChat(
  parentId: number,
  studentId: number,
  body: Record<string, unknown>,
  today: string,
) {
  const explorer = await requireLinkedExplorer(parentId, studentId)
  const message = parseGuardianChatMessage(body)
  const todaySummary = await guardian.findTodaySummary(studentId, today)
  const history = todaySummary ? await guardian.recentChat(parentId, studentId) : []

  await guardian.insertChatMessage({
    parentId,
    studentId,
    role: 'user',
    content: message,
  })

  let reply = NO_SUMMARY_REPLY
  if (todaySummary) {
    const system = guardianTutorSystem({
      explorerName: explorer.username,
      today,
      todaySummary,
    })

    const historyText = history
      .map((item) => `${item.role === 'user' ? 'Guardián' : 'Asistente'}: ${item.content}`)
      .join('\n')

    const raw = await callGemini({
      system,
      user: `${historyText ? `Historial reciente:\n${historyText}\n\n` : ''}Nuevo mensaje del guardián:\n${message}`,
      usage: { userId: parentId, kind: 'parent_tutor' },
    })

    reply = ''
    try {
      const parsed = JSON.parse(extractJson(raw)) as { reply?: string }
      reply = String(parsed.reply ?? '').trim()
    } catch {
      reply = raw.trim()
    }
    if (!reply) {
      reply = 'No pude armar una respuesta ahora. Intenta de nuevo en un momento.'
    }
  }

  const id = await guardian.insertChatMessage({
    parentId,
    studentId,
    role: 'assistant',
    content: reply,
  })

  return {
    id,
    role: 'assistant',
    content: reply,
    created_at: toInstantISO(new Date()) ?? '',
    has_today_summary: Boolean(todaySummary),
    summary_date: today,
  }
}
