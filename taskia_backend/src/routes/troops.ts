import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from '../db/pool.js'
import { pool } from '../db/pool.js'
import { civilDayFromInstant } from '../db/civilDate.js'
import { requireAuth, requireStudent } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { AppError, extractJson, toInstantISO } from '../utils/helpers.js'
import { normalizePlanetParams } from '../lib/planetParams.js'
import { callGemini } from '../services/gemini.js'
import { PRODUCT_TZ, weekStartMonday } from '../services/xp.js'

const router = Router()
const MAX_MEMBERS = 10
const MAX_PENDING_INVITES_PER_TROOP = 15
const MAX_INVITES_SENT_PER_DAY = 20

type TroopRole = 'captain' | 'copilot' | 'member'

function normalizeTroopName(raw: string) {
  return raw
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
}

function isReasonableTroopName(name: string) {
  if (name.length < 3 || name.length > 80) return false
  // Al menos una letra o número (evita solo símbolos / espacios raros)
  return /[\p{L}\p{N}]/u.test(name)
}

function mapMember(r: RowDataPacket) {
  return {
    user_id: Number(r.user_id),
    username: r.username as string,
    role: r.role as TroopRole,
    level: Number(r.level ?? 1),
    xp_total: Number(r.xp_total ?? 0),
    xp_week: Number(r.xp_week ?? 0),
    joined_at: toInstantISO(r.joined_at as Date | string) ?? '',
    avatar_kind: (r.avatar_kind as 'preset' | 'upload' | undefined) ?? 'preset',
    avatar_preset_id: (r.avatar_preset_id as string | null) ?? 'rocket',
    avatar_file: (r.avatar_file as string | null) ?? null,
    frame_id: (r.frame_id as string | null) ?? 'none',
  }
}

async function activeMembership(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT tm.id, tm.troop_id, tm.role, t.name AS troop_name, t.is_active
     FROM troop_members tm
     INNER JOIN troops t ON t.id = tm.troop_id
     WHERE tm.user_id = ? AND tm.left_at IS NULL
     LIMIT 1`,
    [userId],
  )
  return rows[0] ?? null
}

async function countActiveMembers(troopId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM troop_members
     WHERE troop_id = ? AND left_at IS NULL`,
    [troopId],
  )
  return Number(rows[0]?.c ?? 0)
}

function troopLevelFromMembers(members: { level: number }[]) {
  if (members.length === 0) return 1
  const sum = members.reduce((acc, m) => acc + m.level, 0)
  return Math.max(1, Math.round(sum / members.length))
}

async function weeklyRankByTroopId(weekStart: string): Promise<Map<number, number>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id,
            COALESCE(SUM(a.amount), 0) AS xp_week
     FROM troops t
     INNER JOIN troop_members tm
       ON tm.troop_id = t.id AND tm.left_at IS NULL
     LEFT JOIN xp_awards a
       ON a.user_id = tm.user_id AND a.week_start = ?
     WHERE t.is_active = TRUE
     GROUP BY t.id, t.name
     ORDER BY xp_week DESC, t.name ASC`,
    [weekStart],
  )
  const map = new Map<number, number>()
  rows.forEach((r, i) => map.set(Number(r.id), i + 1))
  return map
}

async function loadTroopDetail(troopId: number, viewerId: number) {
  const [trows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, is_active, created_at,
            planet_style_id, planet_seed, planet_params
     FROM troops WHERE id = ? LIMIT 1`,
    [troopId],
  )
  const troop = trows[0]
  if (!troop || Number(troop.is_active) === 0) {
    throw new AppError('Tropa no encontrada', 404)
  }

  const weekStart = weekStartMonday()
  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT tm.user_id, u.username, tm.role, u.level, u.xp_total, tm.joined_at,
            u.avatar_kind, u.avatar_preset_id, u.avatar_file, u.frame_id,
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

  const myRow = members.find((m) => Number(m.user_id) === viewerId)
  const ranked = members.map((m, i) => ({ ...mapMember(m), rank: i + 1 }))
  const level = troopLevelFromMembers(ranked)
  const ranks = await weeklyRankByTroopId(weekStart)
  const [xpRow] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(a.amount), 0) AS xp_week
     FROM troop_members tm
     LEFT JOIN xp_awards a
       ON a.user_id = tm.user_id AND a.week_start = ?
     WHERE tm.troop_id = ? AND tm.left_at IS NULL`,
    [weekStart, troopId],
  )

  return {
    id: Number(troop.id),
    name: troop.name as string,
    member_count: ranked.length,
    max_members: MAX_MEMBERS,
    my_role: (myRow?.role as TroopRole | undefined) ?? null,
    members: ranked,
    level,
    xp_week: Number(xpRow[0]?.xp_week ?? 0),
    rank: ranks.get(Number(troop.id)) ?? null,
    planet_style_id: String(troop.planet_style_id ?? 'rocky_blue'),
    planet_seed: Number(troop.planet_seed ?? troop.id),
    planet_params: troop.planet_params ?? null,
    created_at: toInstantISO(troop.created_at as Date) ?? '',
  }
}

async function promoteSuccessor(troopId: number, conn: Awaited<ReturnType<typeof pool.getConnection>>) {
  const [copilot] = await conn.query<RowDataPacket[]>(
    `SELECT user_id FROM troop_members
     WHERE troop_id = ? AND left_at IS NULL AND role = 'copilot'
     LIMIT 1`,
    [troopId],
  )
  if (copilot[0]) {
    await conn.query(
      `UPDATE troop_members SET role = 'captain'
       WHERE troop_id = ? AND user_id = ? AND left_at IS NULL`,
      [troopId, copilot[0].user_id],
    )
    return
  }
  const [next] = await conn.query<RowDataPacket[]>(
    `SELECT tm.user_id
     FROM troop_members tm
     INNER JOIN users u ON u.id = tm.user_id
     WHERE tm.troop_id = ? AND tm.left_at IS NULL
     ORDER BY u.level DESC, u.xp_total DESC, tm.joined_at ASC
     LIMIT 1`,
    [troopId],
  )
  if (next[0]) {
    await conn.query(
      `UPDATE troop_members SET role = 'captain'
       WHERE troop_id = ? AND user_id = ? AND left_at IS NULL`,
      [troopId, next[0].user_id],
    )
  } else {
    await conn.query(`UPDATE troops SET is_active = FALSE WHERE id = ?`, [troopId])
  }
}

async function joinTroopAsMember(troopId: number, userId: number) {
  // Reactivar fila histórica o insertar
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id, left_at FROM troop_members
     WHERE troop_id = ? AND user_id = ? LIMIT 1`,
    [troopId, userId],
  )
  if (existing[0]) {
    if (existing[0].left_at == null) return
    await pool.query(
      `UPDATE troop_members
       SET role = 'member', left_at = NULL, joined_at = NOW()
       WHERE id = ?`,
      [existing[0].id],
    )
    return
  }
  await pool.query(
    `INSERT INTO troop_members (troop_id, user_id, role) VALUES (?, ?, 'member')`,
    [troopId, userId],
  )
}

router.use(requireAuth, requireStudent)

/** Mi tropa + invitaciones pendientes recibidas. */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const membership = await activeMembership(userId)
    const troop = membership
      ? await loadTroopDetail(Number(membership.troop_id), userId)
      : null

    const [invites] = await pool.query<RowDataPacket[]>(
      `SELECT i.id, i.troop_id, t.name AS troop_name, i.from_user_id,
              fu.username AS from_username, i.created_at, i.direction
       FROM troop_invites i
       INNER JOIN troops t ON t.id = i.troop_id AND t.is_active = TRUE
       INNER JOIN users fu ON fu.id = i.from_user_id
       WHERE i.to_user_id = ? AND i.status = 'pending' AND i.direction = 'invite'
       ORDER BY i.id DESC`,
      [userId],
    )

    res.json({
      troop,
      invites: invites.map((i) => ({
        id: Number(i.id),
        troop_id: Number(i.troop_id),
        troop_name: i.troop_name as string,
        from_user_id: Number(i.from_user_id),
        from_username: i.from_username as string,
        direction: 'invite' as const,
        created_at: toInstantISO(i.created_at as Date) ?? '',
      })),
    })
  }),
)

/** Bandeja: invitaciones recibidas + solicitudes a mi tropa (Capitán/Copiloto). */
router.get(
  '/inbox',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const membership = await activeMembership(userId)

    const [invites] = await pool.query<RowDataPacket[]>(
      `SELECT i.id, i.troop_id, t.name AS troop_name, i.from_user_id,
              fu.username AS from_username, i.created_at
       FROM troop_invites i
       INNER JOIN troops t ON t.id = i.troop_id AND t.is_active = TRUE
       INNER JOIN users fu ON fu.id = i.from_user_id
       WHERE i.to_user_id = ? AND i.status = 'pending' AND i.direction = 'invite'
       ORDER BY i.id DESC`,
      [userId],
    )

    let requests: RowDataPacket[] = []
    const role = membership?.role as TroopRole | undefined
    if (
      membership &&
      (role === 'captain' || role === 'copilot')
    ) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT i.id, i.troop_id, t.name AS troop_name, i.from_user_id,
                fu.username AS from_username, i.created_at
         FROM troop_invites i
         INNER JOIN troops t ON t.id = i.troop_id AND t.is_active = TRUE
         INNER JOIN users fu ON fu.id = i.from_user_id
         WHERE i.troop_id = ? AND i.status = 'pending' AND i.direction = 'request'
         ORDER BY i.id DESC`,
        [Number(membership.troop_id)],
      )
      requests = rows
    }

    const mapItem = (i: RowDataPacket, direction: 'invite' | 'request') => ({
      id: Number(i.id),
      troop_id: Number(i.troop_id),
      troop_name: i.troop_name as string,
      from_user_id: Number(i.from_user_id),
      from_username: i.from_username as string,
      direction,
      created_at: toInstantISO(i.created_at as Date) ?? '',
    })

    res.json({
      invites: invites.map((i) => mapItem(i, 'invite')),
      requests: requests.map((i) => mapItem(i, 'request')),
    })
  }),
)

/** Ranking semanal de tropas (lun–dom America/Lima vía week_start). */
router.get(
  '/ranking',
  asyncHandler(async (req, res) => {
    const weekStart = weekStartMonday()
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 50))
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.name,
              COUNT(DISTINCT tm.user_id) AS member_count,
              COALESCE(SUM(a.amount), 0) AS xp_week
       FROM troops t
       INNER JOIN troop_members tm
         ON tm.troop_id = t.id AND tm.left_at IS NULL
       LEFT JOIN xp_awards a
         ON a.user_id = tm.user_id AND a.week_start = ?
       WHERE t.is_active = TRUE
       GROUP BY t.id, t.name
       ORDER BY xp_week DESC, t.name ASC
       LIMIT ? OFFSET ?`,
      [weekStart, limit, offset],
    )
    res.json({
      week_start: weekStart,
      offset,
      limit,
      has_more: rows.length === limit,
      troops: rows.map((r, i) => ({
        rank: offset + i + 1,
        id: Number(r.id),
        name: r.name as string,
        member_count: Number(r.member_count),
        xp_week: Number(r.xp_week),
      })),
    })
  }),
)

/**
 * Tropas activas para el canvas espacial.
 * Mi tropa primero (si hay); el resto orden estable por id.
 */
router.get(
  '/universe',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 50))
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const weekStart = weekStartMonday()
    const membership = await activeMembership(userId)
    const myTroopId = membership ? Number(membership.troop_id) : null
    const ranks = await weeklyRankByTroopId(weekStart)

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.name, t.planet_style_id, t.planet_seed, t.planet_params,
              COUNT(DISTINCT tm.user_id) AS member_count,
              COALESCE(AVG(u.level), 1) AS avg_level,
              COALESCE(SUM(a.amount), 0) AS xp_week
       FROM troops t
       INNER JOIN troop_members tm
         ON tm.troop_id = t.id AND tm.left_at IS NULL
       INNER JOIN users u ON u.id = tm.user_id
       LEFT JOIN xp_awards a
         ON a.user_id = tm.user_id AND a.week_start = ?
       WHERE t.is_active = TRUE
       GROUP BY t.id, t.name, t.planet_style_id, t.planet_seed, t.planet_params
       ORDER BY
         CASE WHEN t.id = ? THEN 0 ELSE 1 END,
         t.id ASC
       LIMIT ? OFFSET ?`,
      [weekStart, myTroopId ?? -1, limit, offset],
    )

    res.json({
      week_start: weekStart,
      my_troop_id: myTroopId,
      offset,
      limit,
      has_more: rows.length === limit,
      troops: rows.map((r) => {
        const id = Number(r.id)
        return {
          id,
          name: r.name as string,
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
    })
  }),
)

/** Buscar exploradores por nombre (global). */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim()
    if (q.length < 2) {
      throw new AppError('Escribe al menos 2 letras para buscar')
    }
    const userId = req.user!.id
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.level, u.xp_total,
              (SELECT tm.troop_id FROM troop_members tm
               WHERE tm.user_id = u.id AND tm.left_at IS NULL LIMIT 1) AS troop_id
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id AND r.code = 'user'
       WHERE u.is_active = TRUE
         AND u.id <> ?
         AND u.username ILIKE ?
       ORDER BY u.username ASC
       LIMIT 20`,
      [userId, `%${q}%`],
    )
    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        username: r.username as string,
        level: Number(r.level ?? 1),
        xp_total: Number(r.xp_total ?? 0),
        in_troop: r.troop_id != null,
      })),
    )
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const name = normalizeTroopName(String(req.body.name ?? ''))
    if (!isReasonableTroopName(name)) {
      throw new AppError(
        'Elige un nombre de 3 a 80 caracteres con al menos una letra o número',
      )
    }
    if (await activeMembership(userId)) {
      throw new AppError('Ya estás en una tropa. Sal primero para crear otra.')
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [ins] = await conn.query<ResultSetHeader>(
        `INSERT INTO troops (name) VALUES (?)`,
        [name],
      )
      const troopId = Number(ins.insertId)
      await conn.query(
        `UPDATE troops SET planet_seed = ? WHERE id = ?`,
        [troopId % 2147483647, troopId],
      )
      await conn.query(
        `INSERT INTO troop_members (troop_id, user_id, role) VALUES (?, ?, 'captain')`,
        [troopId, userId],
      )
      await conn.commit()
      res.json(await loadTroopDetail(troopId, userId))
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }),
)

router.post(
  '/invites',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const toUserId = Number(req.body.to_user_id)
    if (!Number.isFinite(toUserId)) throw new AppError('Explorador no válido')

    const membership = await activeMembership(userId)
    if (!membership) throw new AppError('Primero crea o únete a una tropa')
    const role = membership.role as TroopRole
    if (role !== 'captain' && role !== 'copilot') {
      throw new AppError('Solo el Capitán o el Copiloto pueden invitar')
    }

    const troopId = Number(membership.troop_id)
    if ((await countActiveMembers(troopId)) >= MAX_MEMBERS) {
      throw new AppError(`La tropa ya tiene ${MAX_MEMBERS} exploradores`)
    }

    const [pendingCount] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM troop_invites
       WHERE troop_id = ? AND status = 'pending'`,
      [troopId],
    )
    if (Number(pendingCount[0]?.c ?? 0) >= MAX_PENDING_INVITES_PER_TROOP) {
      throw new AppError(
        'Hay demasiadas invitaciones pendientes. Espera a que respondan.',
      )
    }

    const today = civilDayFromInstant(new Date(), PRODUCT_TZ)
    const [sentToday] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM troop_invites
       WHERE from_user_id = ?
         AND created_at >= (?::date AT TIME ZONE 'America/Lima')
         AND created_at < ((?::date + 1) AT TIME ZONE 'America/Lima')`,
      [userId, today, today],
    )
    if (Number(sentToday[0]?.c ?? 0) >= MAX_INVITES_SENT_PER_DAY) {
      throw new AppError(
        'Ya enviaste demasiadas invitaciones hoy. Prueba mañana.',
      )
    }

    const [target] = await pool.query<RowDataPacket[]>(
      `SELECT u.id FROM users u
       INNER JOIN roles r ON r.id = u.role_id AND r.code = 'user'
       WHERE u.id = ? AND u.is_active = TRUE LIMIT 1`,
      [toUserId],
    )
    if (!target[0]) throw new AppError('Explorador no encontrado', 404)
    if (await activeMembership(toUserId)) {
      throw new AppError('Ese explorador ya está en una tropa')
    }

    try {
      const [ins] = await pool.query<ResultSetHeader>(
        `INSERT INTO troop_invites
           (troop_id, from_user_id, to_user_id, status, direction)
         VALUES (?, ?, ?, 'pending', 'invite')`,
        [troopId, userId, toUserId],
      )
      res.json({ id: Number(ins.insertId), ok: true })
    } catch {
      throw new AppError('Ya hay una invitación pendiente para ese explorador')
    }
  }),
)

/** Explorador sin tropa pide unirse a una tropa. */
router.post(
  '/:id/request',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const troopId = Number(req.params.id)
    if (!Number.isFinite(troopId)) throw new AppError('Tropa no válida', 404)
    if (await activeMembership(userId)) {
      throw new AppError('Ya estás en una tropa')
    }

    const [trows] = await pool.query<RowDataPacket[]>(
      `SELECT id, is_active FROM troops WHERE id = ? LIMIT 1`,
      [troopId],
    )
    if (!trows[0] || Number(trows[0].is_active) === 0) {
      throw new AppError('Tropa no encontrada', 404)
    }
    if ((await countActiveMembers(troopId)) >= MAX_MEMBERS) {
      throw new AppError('Esa tropa ya está llena')
    }

    const [pendingCount] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM troop_invites
       WHERE troop_id = ? AND status = 'pending'`,
      [troopId],
    )
    if (Number(pendingCount[0]?.c ?? 0) >= MAX_PENDING_INVITES_PER_TROOP) {
      throw new AppError(
        'Esa tropa tiene demasiadas invitaciones pendientes. Prueba luego.',
      )
    }

    const [captain] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM troop_members
       WHERE troop_id = ? AND left_at IS NULL AND role = 'captain'
       LIMIT 1`,
      [troopId],
    )
    const captainId = Number(captain[0]?.user_id)
    if (!Number.isFinite(captainId) || captainId === userId) {
      throw new AppError('No se puede solicitar unirse a esa tropa')
    }

    try {
      const [ins] = await pool.query<ResultSetHeader>(
        `INSERT INTO troop_invites
           (troop_id, from_user_id, to_user_id, status, direction)
         VALUES (?, ?, ?, 'pending', 'request')`,
        [troopId, userId, captainId],
      )
      res.json({ id: Number(ins.insertId), ok: true })
    } catch {
      throw new AppError('Ya pediste unirte a esa tropa')
    }
  }),
)

router.post(
  '/invites/:id/accept',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const inviteId = Number(req.params.id)

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT i.id, i.troop_id, i.from_user_id, i.to_user_id, i.direction, t.is_active
       FROM troop_invites i
       INNER JOIN troops t ON t.id = i.troop_id
       WHERE i.id = ? AND i.status = 'pending'
       LIMIT 1`,
      [inviteId],
    )
    const row = rows[0]
    if (!row || Number(row.is_active) === 0) {
      throw new AppError('Invitación no válida', 404)
    }

    const troopId = Number(row.troop_id)
    const direction = String(row.direction ?? 'invite')

    if (direction === 'invite') {
      if (Number(row.to_user_id) !== userId) {
        throw new AppError('Invitación no válida', 404)
      }
      if (await activeMembership(userId)) {
        throw new AppError('Ya estás en una tropa')
      }
      if ((await countActiveMembers(troopId)) >= MAX_MEMBERS) {
        throw new AppError('Esa tropa ya está llena')
      }
      await pool.query(
        `UPDATE troop_invites
         SET status = 'accepted', responded_at = NOW()
         WHERE id = ?`,
        [inviteId],
      )
      await joinTroopAsMember(troopId, userId)
      res.json(await loadTroopDetail(troopId, userId))
      return
    }

    // request: Capitán o Copiloto acepta; entra from_user_id
    const membership = await activeMembership(userId)
    const role = membership?.role as TroopRole | undefined
    if (
      !membership ||
      Number(membership.troop_id) !== troopId ||
      (role !== 'captain' && role !== 'copilot')
    ) {
      throw new AppError('Solo el Capitán o el Copiloto pueden aceptar')
    }
    const joinerId = Number(row.from_user_id)
    if (await activeMembership(joinerId)) {
      await pool.query(
        `UPDATE troop_invites
         SET status = 'cancelled', responded_at = NOW()
         WHERE id = ?`,
        [inviteId],
      )
      throw new AppError('Ese explorador ya está en una tropa')
    }
    if ((await countActiveMembers(troopId)) >= MAX_MEMBERS) {
      throw new AppError('La tropa ya está llena')
    }
    await pool.query(
      `UPDATE troop_invites
       SET status = 'accepted', responded_at = NOW()
       WHERE id = ?`,
      [inviteId],
    )
    await joinTroopAsMember(troopId, joinerId)
    res.json(await loadTroopDetail(troopId, userId))
  }),
)

router.post(
  '/invites/:id/reject',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const inviteId = Number(req.params.id)

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT i.id, i.troop_id, i.to_user_id, i.direction
       FROM troop_invites i
       WHERE i.id = ? AND i.status = 'pending'
       LIMIT 1`,
      [inviteId],
    )
    const row = rows[0]
    if (!row) throw new AppError('Invitación no válida', 404)

    const direction = String(row.direction ?? 'invite')
    if (direction === 'invite') {
      if (Number(row.to_user_id) !== userId) {
        throw new AppError('Invitación no válida', 404)
      }
    } else {
      const membership = await activeMembership(userId)
      const role = membership?.role as TroopRole | undefined
      if (
        !membership ||
        Number(membership.troop_id) !== Number(row.troop_id) ||
        (role !== 'captain' && role !== 'copilot')
      ) {
        throw new AppError('Solo el Capitán o el Copiloto pueden rechazar')
      }
    }

    await pool.query(
      `UPDATE troop_invites
       SET status = 'rejected', responded_at = NOW()
       WHERE id = ?`,
      [inviteId],
    )
    res.json({ ok: true })
  }),
)

/** Capitán asigna o quita copiloto. */
router.post(
  '/copilot',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const membership = await activeMembership(userId)
    if (!membership || membership.role !== 'captain') {
      throw new AppError('Solo el Capitán puede elegir Copiloto')
    }
    const troopId = Number(membership.troop_id)
    const nextId =
      req.body.user_id === null || req.body.user_id === undefined
        ? null
        : Number(req.body.user_id)

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query(
        `UPDATE troop_members SET role = 'member'
         WHERE troop_id = ? AND role = 'copilot' AND left_at IS NULL`,
        [troopId],
      )
      if (nextId != null) {
        if (nextId === userId) throw new AppError('No puedes ser Capitán y Copiloto')
        const [m] = await conn.query<RowDataPacket[]>(
          `SELECT user_id FROM troop_members
           WHERE troop_id = ? AND user_id = ? AND left_at IS NULL LIMIT 1`,
          [troopId, nextId],
        )
        if (!m[0]) throw new AppError('Ese explorador no está en tu tropa')
        await conn.query(
          `UPDATE troop_members SET role = 'copilot'
           WHERE troop_id = ? AND user_id = ? AND left_at IS NULL`,
          [troopId, nextId],
        )
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
    res.json(await loadTroopDetail(troopId, userId))
  }),
)

/** Capitán elimina a un miembro (no a sí mismo). */
router.delete(
  '/members/:memberUserId',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const memberUserId = Number(req.params.memberUserId)
    const membership = await activeMembership(userId)
    if (!membership || membership.role !== 'captain') {
      throw new AppError('Solo el Capitán puede sacar a alguien')
    }
    if (memberUserId === userId) {
      throw new AppError('Para irte usa la opción de salir de la tropa')
    }
    const troopId = Number(membership.troop_id)
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE troop_members SET left_at = NOW(), role = 'member'
       WHERE troop_id = ? AND user_id = ? AND left_at IS NULL`,
      [troopId, memberUserId],
    )
    if (result.affectedRows === 0) throw new AppError('Miembro no encontrado', 404)
    // Cancel pending invites to kicked user for this troop
    await pool.query(
      `UPDATE troop_invites SET status = 'cancelled', responded_at = NOW()
       WHERE troop_id = ? AND to_user_id = ? AND status = 'pending'`,
      [troopId, memberUserId],
    )
    res.json(await loadTroopDetail(troopId, userId))
  }),
)

router.post(
  '/leave',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const membership = await activeMembership(userId)
    if (!membership) throw new AppError('No estás en una tropa')
    const troopId = Number(membership.troop_id)
    const wasCaptain = membership.role === 'captain'

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query(
        `UPDATE troop_members SET left_at = NOW(), role = 'member'
         WHERE troop_id = ? AND user_id = ? AND left_at IS NULL`,
        [troopId, userId],
      )
      if (wasCaptain) {
        await promoteSuccessor(troopId, conn)
      } else {
        const [count] = await conn.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS c FROM troop_members
           WHERE troop_id = ? AND left_at IS NULL`,
          [troopId],
        )
        if (Number(count[0]?.c ?? 0) === 0) {
          await conn.query(`UPDATE troops SET is_active = FALSE WHERE id = ?`, [
            troopId,
          ])
        }
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
    res.json({ ok: true })
  }),
)

const PLANET_STYLE_IDS = new Set([
  'rocky_blue',
  'gas_teal',
  'lava_amber',
  'neon_violet',
  'ice_cyan',
  'forest_green',
  'rose_dust',
  'shadow_slate',
])

const PLANET_GENERATE_SYSTEM = `Eres un diseñador de planetas para Taskia, una app infantil de exploración espacial (español latinoamericano).
Devuelve SOLO un JSON con esta forma exacta:
{
  "color": "#rrggbb",
  "emissive": "#rrggbb",
  "atmosphere": "#rrggbb" o null,
  "roughness": número entre 0 y 1,
  "metalness": número entre 0 y 1,
  "label": "nombre corto en español (máx 24 caracteres)"
}
Reglas:
- Colores vivos y legibles sobre fondo oscuro del espacio.
- Sin violencia, miedo extremo ni contenido adulto.
- Interpreta el pedido del niño de forma amable y creativa.
- No agregues texto fuera del JSON.`

/** Capitán o Copiloto pide a la IA parámetros procedurales (preview, no guarda). */
router.post(
  '/planet/generate',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const membership = await activeMembership(userId)
    const role = membership?.role as TroopRole | undefined
    if (
      !membership ||
      (role !== 'captain' && role !== 'copilot')
    ) {
      throw new AppError('Solo el Capitán o el Copiloto pueden personalizar el planeta')
    }
    const prompt = String(req.body.prompt ?? '')
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .trim()
    if (prompt.length < 3 || prompt.length > 200) {
      throw new AppError('Cuéntame el planeta en 3 a 200 caracteres')
    }

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
    res.json({ preview, prompt })
  }),
)

/** Capitán o Copiloto cambia estilo de catálogo o aplica params IA. */
router.patch(
  '/planet',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const membership = await activeMembership(userId)
    const role = membership?.role as TroopRole | undefined
    if (
      !membership ||
      (role !== 'captain' && role !== 'copilot')
    ) {
      throw new AppError('Solo el Capitán o el Copiloto pueden personalizar el planeta')
    }
    const troopId = Number(membership.troop_id)
    const hasStyle = req.body.planet_style_id !== undefined
    const hasParams = req.body.planet_params !== undefined

    if (!hasStyle && !hasParams) {
      throw new AppError('Indica un estilo o parámetros de planeta')
    }

    if (hasStyle) {
      const styleId = String(req.body.planet_style_id ?? '').trim()
      if (!PLANET_STYLE_IDS.has(styleId)) {
        throw new AppError('Estilo de planeta no válido')
      }
      await pool.query(
        `UPDATE troops SET planet_style_id = ?, planet_params = NULL WHERE id = ?`,
        [styleId, troopId],
      )
    }

    if (hasParams) {
      if (req.body.planet_params === null) {
        await pool.query(
          `UPDATE troops SET planet_params = NULL WHERE id = ?`,
          [troopId],
        )
      } else {
        const params = normalizePlanetParams(req.body.planet_params)
        await pool.query(
          `UPDATE troops SET planet_params = ?::jsonb WHERE id = ?`,
          [JSON.stringify(params), troopId],
        )
      }
    }

    res.json(await loadTroopDetail(troopId, userId))
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const troopId = Number(req.params.id)
    if (!Number.isFinite(troopId)) throw new AppError('Tropa no válida', 404)
    res.json(await loadTroopDetail(troopId, req.user!.id))
  }),
)

export default router
