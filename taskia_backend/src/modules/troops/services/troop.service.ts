import { civilDayFromInstant } from '../../../infrastructure/database/civil-date.js'
import { callGemini } from '../../../infrastructure/gemini/gemini.client.js'
import { PLANET_GENERATE_SYSTEM } from '../../../prompts/planet.js'
import { PRODUCT_TZ, weekStartMonday } from '../../../services/xp.js'
import { AppError, extractJson, toInstantISO } from '../../../utils/helpers.js'
import { normalizePlanetParams } from '../lib/planet-params.js'
import {
  cancelPendingInvitesTo,
  countActiveMembers,
  countInvitesSentToday,
  countPendingInvites,
  createTroopWithCaptain,
  findActiveExplorer,
  findActiveMembership,
  findCaptainId,
  findPendingInvite,
  findTroop,
  insertInvite,
  joinTroopAsMember,
  leaveTroop as persistLeave,
  listActiveMembers,
  listIncomingInvites,
  listTroopRequests,
  markMemberLeft,
  rankingPage,
  replaceCopilot,
  searchExplorers as searchExplorerRows,
  setInviteStatus,
  setPlanetParams,
  setPlanetStyle,
  troopWeekXp,
  universePage,
  weeklyRanks,
  type MemberRow,
} from '../repositories/troop.repository.js'
import {
  parseExplorerSearch,
  parsePlanetPrompt,
  parsePlanetStyleId,
  parseTroopName,
} from '../schemas/troop.schema.js'

type TroopReq = {
  user?: { id: number }
  body: any
  query: any
  params: any
}

const MAX_MEMBERS = 10
const MAX_PENDING_INVITES_PER_TROOP = 15
const MAX_INVITES_SENT_PER_DAY = 20

type TroopRole = 'captain' | 'copilot' | 'member'

function mapMember(r: MemberRow) {
  return {
    user_id: Number(r.user_id),
    username: r.username,
    role: r.role as TroopRole,
    level: Number(r.level ?? 1),
    xp_total: Number(r.xp_total ?? 0),
    xp_week: Number(r.xp_week ?? 0),
    joined_at: toInstantISO(r.joined_at) ?? '',
    avatar_kind: (r.avatar_kind as 'preset' | 'upload' | undefined) ?? 'preset',
    avatar_preset_id: r.avatar_preset_id ?? 'rocket',
    avatar_file: r.avatar_file ?? null,
    frame_id: r.frame_id ?? 'none',
  }
}

function troopLevelFromMembers(members: { level: number }[]) {
  if (members.length === 0) return 1
  const sum = members.reduce((acc, m) => acc + m.level, 0)
  return Math.max(1, Math.round(sum / members.length))
}

function mapInvite(
  i: {
    id: number
    troop_id: number
    troop_name: string
    from_user_id: number
    from_username: string
    created_at: Date
  },
  direction: 'invite' | 'request',
) {
  return {
    id: Number(i.id),
    troop_id: Number(i.troop_id),
    troop_name: i.troop_name,
    from_user_id: Number(i.from_user_id),
    from_username: i.from_username,
    direction,
    created_at: toInstantISO(i.created_at) ?? '',
  }
}

async function loadTroopDetail(troopId: number, viewerId: number) {
  const troop = await findTroop(troopId)
  if (!troop || Number(troop.isActive) === 0) {
    throw new AppError('Tripulación no encontrada', 404)
  }

  const weekStart = weekStartMonday()
  const members = await listActiveMembers(troopId, weekStart)
  const myRow = members.find((m) => Number(m.user_id) === viewerId)
  const ranked = members.map((m, i) => ({ ...mapMember(m), rank: i + 1 }))
  const level = troopLevelFromMembers(ranked)
  const ranks = await weeklyRanks(weekStart)
  const xpWeek = await troopWeekXp(troopId, weekStart)

  return {
    id: Number(troop.id),
    name: troop.name,
    member_count: ranked.length,
    max_members: MAX_MEMBERS,
    my_role: (myRow?.role as TroopRole | undefined) ?? null,
    members: ranked,
    level,
    xp_week: xpWeek,
    rank: ranks.get(Number(troop.id)) ?? null,
    planet_style_id: String(troop.planetStyleId ?? 'rocky_blue'),
    planet_seed: Number(troop.planetSeed ?? troop.id),
    planet_params: troop.planetParams ?? null,
    created_at: toInstantISO(troop.createdAt) ?? '',
  }
}

/** Mi tripulación + invitaciones pendientes recibidas. */
export async function getMe(req: TroopReq) {
  const userId = req.user!.id
  const membership = await findActiveMembership(userId)
  const troop = membership ? await loadTroopDetail(Number(membership.troop_id), userId) : null
  const invites = await listIncomingInvites(userId)
  return {
    troop,
    invites: invites.map((i) => mapInvite(i, 'invite')),
  }
}

/** Bandeja: invitaciones recibidas + solicitudes a mi tripulación (Capitán/Copiloto). */
export async function getInbox(req: TroopReq) {
  const userId = req.user!.id
  const membership = await findActiveMembership(userId)
  const invites = await listIncomingInvites(userId)
  const role = membership?.role as TroopRole | undefined
  const requests =
    membership && (role === 'captain' || role === 'copilot')
      ? await listTroopRequests(Number(membership.troop_id))
      : []

  return {
    invites: invites.map((i) => mapInvite(i, 'invite')),
    requests: requests.map((i) => mapInvite(i, 'request')),
  }
}

/** Ranking semanal de tripulaciones (lun–dom America/Lima vía week_start). */
export async function getRanking(req: TroopReq) {
  const weekStart = weekStartMonday()
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 50))
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const rows = await rankingPage(weekStart, limit, offset)
  return {
    week_start: weekStart,
    offset,
    limit,
    has_more: rows.length === limit,
    troops: rows.map((r, i) => ({
      rank: offset + i + 1,
      id: Number(r.id),
      name: r.name,
      member_count: Number(r.member_count),
      xp_week: Number(r.xp_week),
    })),
  }
}

/**
 * Tripulaciones activas para el canvas espacial.
 * Mi tripulación primero (si hay); el resto orden estable por id.
 */
export async function getUniverse(req: TroopReq) {
  const userId = req.user!.id
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 50))
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const weekStart = weekStartMonday()
  const membership = await findActiveMembership(userId)
  const myTroopId = membership ? Number(membership.troop_id) : null
  const ranks = await weeklyRanks(weekStart)
  const rows = await universePage(weekStart, myTroopId, limit, offset)

  return {
    week_start: weekStart,
    my_troop_id: myTroopId,
    offset,
    limit,
    has_more: rows.length === limit,
    troops: rows.map((r) => {
      const id = Number(r.id)
      return {
        id,
        name: r.name,
        member_count: Number(r.member_count),
        level: Math.max(1, Math.round(Number(r.avg_level ?? 1))),
        xp_week: Number(r.xp_week),
        rank: ranks.get(id) ?? null,
        is_mine: myTroopId != null && id === myTroopId,
        planet_style_id: String(r.planet_style_id ?? 'rocky_blue'),
        planet_seed: Number(r.planet_seed ?? id),
        planet_params: r.planet_params ?? null,
      }
    }),
  }
}

/** Buscar exploradores por nombre (global). */
export async function searchExplorers(req: TroopReq) {
  const q = parseExplorerSearch(req.query.q)
  const userId = req.user!.id
  const rows = await searchExplorerRows(userId, q)
  return rows.map((r) => ({
    id: Number(r.id),
    username: r.username,
    level: Number(r.level ?? 1),
    xp_total: Number(r.xp_total ?? 0),
    in_troop: r.troop_id != null,
  }))
}

export async function createTroop(req: TroopReq) {
  const userId = req.user!.id
  const name = parseTroopName(req.body.name)
  if (await findActiveMembership(userId)) {
    throw new AppError('Ya estás en una tripulación. Sal primero para crear otra.')
  }
  const troopId = await createTroopWithCaptain(name, userId)
  return loadTroopDetail(troopId, userId)
}

export async function inviteExplorer(req: TroopReq) {
  const userId = req.user!.id
  const toUserId = Number(req.body.to_user_id)
  if (!Number.isFinite(toUserId)) throw new AppError('Explorador no válido')

  const membership = await findActiveMembership(userId)
  if (!membership) throw new AppError('Primero crea o únete a una tripulación')
  const role = membership.role as TroopRole
  if (role !== 'captain' && role !== 'copilot') {
    throw new AppError('Solo el Capitán o el Copiloto pueden invitar')
  }

  const troopId = Number(membership.troop_id)
  if ((await countActiveMembers(troopId)) >= MAX_MEMBERS) {
    throw new AppError(`La tripulación ya tiene ${MAX_MEMBERS} exploradores`)
  }
  if ((await countPendingInvites(troopId)) >= MAX_PENDING_INVITES_PER_TROOP) {
    throw new AppError('Hay demasiadas invitaciones pendientes. Espera a que respondan.')
  }

  const today = civilDayFromInstant(new Date(), PRODUCT_TZ)
  if ((await countInvitesSentToday(userId, today)) >= MAX_INVITES_SENT_PER_DAY) {
    throw new AppError('Ya enviaste demasiadas invitaciones hoy. Prueba mañana.')
  }
  if (!(await findActiveExplorer(toUserId))) throw new AppError('Explorador no encontrado', 404)
  if (await findActiveMembership(toUserId)) {
    throw new AppError('Ese explorador ya está en una tripulación')
  }

  try {
    const id = await insertInvite({
      troopId,
      fromUserId: userId,
      toUserId,
      direction: 'invite',
    })
    return { id: Number(id), ok: true }
  } catch {
    throw new AppError('Ya hay una invitación pendiente para ese explorador')
  }
}

/** Explorador sin tripulación pide unirse a una tripulación. */
export async function requestJoin(req: TroopReq) {
  const userId = req.user!.id
  const troopId = Number(req.params.id)
  if (!Number.isFinite(troopId)) throw new AppError('Tripulación no válida', 404)
  if (await findActiveMembership(userId)) {
    throw new AppError('Ya estás en una tripulación')
  }

  const troop = await findTroop(troopId)
  if (!troop || Number(troop.isActive) === 0) {
    throw new AppError('Tripulación no encontrada', 404)
  }
  if ((await countActiveMembers(troopId)) >= MAX_MEMBERS) {
    throw new AppError('Esa tripulación ya está llena')
  }
  if ((await countPendingInvites(troopId)) >= MAX_PENDING_INVITES_PER_TROOP) {
    throw new AppError('Esa tripulación tiene demasiadas invitaciones pendientes. Prueba luego.')
  }

  const captainId = await findCaptainId(troopId)
  if (captainId == null || captainId === userId) {
    throw new AppError('No se puede solicitar unirse a esa tripulación')
  }

  try {
    const id = await insertInvite({
      troopId,
      fromUserId: userId,
      toUserId: captainId,
      direction: 'request',
    })
    return { id: Number(id), ok: true }
  } catch {
    throw new AppError('Ya pediste unirte a esa tripulación')
  }
}

export async function acceptInvite(req: TroopReq) {
  const userId = req.user!.id
  const inviteId = Number(req.params.id)
  const row = await findPendingInvite(inviteId)
  if (!row || Number(row.is_active) === 0) {
    throw new AppError('Invitación no válida', 404)
  }

  const troopId = Number(row.troop_id)
  const direction = String(row.direction ?? 'invite')

  if (direction === 'invite') {
    if (Number(row.to_user_id) !== userId) {
      throw new AppError('Invitación no válida', 404)
    }
    if (await findActiveMembership(userId)) {
      throw new AppError('Ya estás en una tripulación')
    }
    if ((await countActiveMembers(troopId)) >= MAX_MEMBERS) {
      throw new AppError('Esa tripulación ya está llena')
    }
    await setInviteStatus(inviteId, 'accepted')
    await joinTroopAsMember(troopId, userId)
    return loadTroopDetail(troopId, userId)
  }

  const membership = await findActiveMembership(userId)
  const role = membership?.role as TroopRole | undefined
  if (
    !membership ||
    Number(membership.troop_id) !== troopId ||
    (role !== 'captain' && role !== 'copilot')
  ) {
    throw new AppError('Solo el Capitán o el Copiloto pueden aceptar')
  }
  const joinerId = Number(row.from_user_id)
  if (await findActiveMembership(joinerId)) {
    await setInviteStatus(inviteId, 'cancelled')
    throw new AppError('Ese explorador ya está en una tripulación')
  }
  if ((await countActiveMembers(troopId)) >= MAX_MEMBERS) {
    throw new AppError('La tripulación ya está llena')
  }
  await setInviteStatus(inviteId, 'accepted')
  await joinTroopAsMember(troopId, joinerId)
  return loadTroopDetail(troopId, userId)
}

export async function rejectInvite(req: TroopReq) {
  const userId = req.user!.id
  const inviteId = Number(req.params.id)
  const row = await findPendingInvite(inviteId)
  if (!row) throw new AppError('Invitación no válida', 404)

  const direction = String(row.direction ?? 'invite')
  if (direction === 'invite') {
    if (Number(row.to_user_id) !== userId) {
      throw new AppError('Invitación no válida', 404)
    }
  } else {
    const membership = await findActiveMembership(userId)
    const role = membership?.role as TroopRole | undefined
    if (
      !membership ||
      Number(membership.troop_id) !== Number(row.troop_id) ||
      (role !== 'captain' && role !== 'copilot')
    ) {
      throw new AppError('Solo el Capitán o el Copiloto pueden rechazar')
    }
  }

  await setInviteStatus(inviteId, 'rejected')
  return { ok: true }
}

/** Capitán asigna o quita copiloto. */
export async function setCopilot(req: TroopReq) {
  const userId = req.user!.id
  const membership = await findActiveMembership(userId)
  if (!membership || membership.role !== 'captain') {
    throw new AppError('Solo el Capitán puede elegir Copiloto')
  }
  const troopId = Number(membership.troop_id)
  const nextId =
    req.body.user_id === null || req.body.user_id === undefined ? null : Number(req.body.user_id)
  await replaceCopilot(troopId, userId, nextId)
  return loadTroopDetail(troopId, userId)
}

/** Capitán elimina a un miembro (no a sí mismo). */
export async function kickMember(req: TroopReq) {
  const userId = req.user!.id
  const memberUserId = Number(req.params.memberUserId)
  const membership = await findActiveMembership(userId)
  if (!membership || membership.role !== 'captain') {
    throw new AppError('Solo el Capitán puede sacar a alguien')
  }
  if (memberUserId === userId) {
    throw new AppError('Para irte usa la opción de salir de la tripulación')
  }
  const troopId = Number(membership.troop_id)
  const affected = await markMemberLeft(troopId, memberUserId)
  if (affected === 0) throw new AppError('Miembro no encontrado', 404)
  await cancelPendingInvitesTo(troopId, memberUserId)
  return loadTroopDetail(troopId, userId)
}

export async function leaveTroop(req: TroopReq) {
  const userId = req.user!.id
  const membership = await findActiveMembership(userId)
  if (!membership) throw new AppError('No estás en una tripulación')
  await persistLeave(Number(membership.troop_id), userId, membership.role === 'captain')
  return { ok: true }
}

/** Capitán o Copiloto pide a la IA parámetros procedurales (preview, no guarda). */
export async function generatePlanet(req: TroopReq) {
  const userId = req.user!.id
  const membership = await findActiveMembership(userId)
  const role = membership?.role as TroopRole | undefined
  if (!membership || (role !== 'captain' && role !== 'copilot')) {
    throw new AppError('Solo el Capitán o el Copiloto pueden personalizar el planeta')
  }
  const prompt = parsePlanetPrompt(req.body.prompt)

  const raw = await callGemini({
    system: PLANET_GENERATE_SYSTEM,
    user: `Pedido del explorador: ${prompt}`,
    usage: { userId, kind: 'planet_generate' },
  })

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(raw))
  } catch {
    throw new AppError('No pude diseñar ese planeta. Prueba con otras palabras.')
  }

  const preview = normalizePlanetParams(parsed)
  return { preview, prompt }
}

/** Capitán o Copiloto cambia estilo de catálogo o aplica params IA. */
export async function updatePlanet(req: TroopReq) {
  const userId = req.user!.id
  const membership = await findActiveMembership(userId)
  const role = membership?.role as TroopRole | undefined
  if (!membership || (role !== 'captain' && role !== 'copilot')) {
    throw new AppError('Solo el Capitán o el Copiloto pueden personalizar el planeta')
  }
  const troopId = Number(membership.troop_id)
  const hasStyle = req.body.planet_style_id !== undefined
  const hasParams = req.body.planet_params !== undefined

  if (!hasStyle && !hasParams) {
    throw new AppError('Indica un estilo o parámetros de planeta')
  }

  if (hasStyle) {
    const styleId = parsePlanetStyleId(req.body.planet_style_id)
    await setPlanetStyle(troopId, styleId)
  }

  if (hasParams) {
    if (req.body.planet_params === null) {
      await setPlanetParams(troopId, null)
    } else {
      await setPlanetParams(troopId, normalizePlanetParams(req.body.planet_params))
    }
  }

  return loadTroopDetail(troopId, userId)
}

export async function getTroop(req: TroopReq) {
  const troopId = Number(req.params.id)
  if (!Number.isFinite(troopId)) throw new AppError('Tripulación no válida', 404)
  return loadTroopDetail(troopId, req.user!.id)
}
