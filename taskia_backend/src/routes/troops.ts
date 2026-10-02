import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from '../db/pool.js'
import { pool } from '../db/pool.js'
import { requireAuth, requireStudent } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { AppError, toInstantISO } from '../utils/helpers.js'
import { weekStartMonday } from '../services/xp.js'

const router = Router()
const MAX_MEMBERS = 10

type TroopRole = 'captain' | 'copilot' | 'member'

function mapMember(r: RowDataPacket) {
  return {
    user_id: Number(r.user_id),
    username: r.username as string,
    role: r.role as TroopRole,
    level: Number(r.level ?? 1),
    xp_total: Number(r.xp_total ?? 0),
    xp_week: Number(r.xp_week ?? 0),
    joined_at: toInstantISO(r.joined_at as Date | string) ?? '',
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

async function loadTroopDetail(troopId: number, viewerId: number) {
  const [trows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, is_active, created_at FROM troops WHERE id = ? LIMIT 1`,
    [troopId],
  )
  const troop = trows[0]
  if (!troop || Number(troop.is_active) === 0) {
    throw new AppError('Tropa no encontrada', 404)
  }

  const weekStart = weekStartMonday()
  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT tm.user_id, u.username, tm.role, u.level, u.xp_total, tm.joined_at,
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

  return {
    id: Number(troop.id),
    name: troop.name as string,
    member_count: ranked.length,
    max_members: MAX_MEMBERS,
    my_role: (myRow?.role as TroopRole | undefined) ?? null,
    members: ranked,
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
              fu.username AS from_username, i.created_at
       FROM troop_invites i
       INNER JOIN troops t ON t.id = i.troop_id AND t.is_active = TRUE
       INNER JOIN users fu ON fu.id = i.from_user_id
       WHERE i.to_user_id = ? AND i.status = 'pending'
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
        created_at: toInstantISO(i.created_at as Date) ?? '',
      })),
    })
  }),
)

/** Ranking semanal de tropas (lun–dom America/Lima vía week_start). */
router.get(
  '/ranking',
  asyncHandler(async (_req, res) => {
    const weekStart = weekStartMonday()
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
       ORDER BY xp_week DESC, member_count DESC, t.name ASC
       LIMIT 50`,
      [weekStart],
    )
    res.json({
      week_start: weekStart,
      troops: rows.map((r, i) => ({
        rank: i + 1,
        id: Number(r.id),
        name: r.name as string,
        member_count: Number(r.member_count),
        xp_week: Number(r.xp_week),
      })),
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
    const name = String(req.body.name ?? '').trim()
    if (name.length < 3 || name.length > 80) {
      throw new AppError('El nombre de la tropa debe tener entre 3 y 80 caracteres')
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
        `INSERT INTO troop_invites (troop_id, from_user_id, to_user_id, status)
         VALUES (?, ?, ?, 'pending')`,
        [troopId, userId, toUserId],
      )
      res.json({ id: Number(ins.insertId), ok: true })
    } catch {
      throw new AppError('Ya hay una invitación pendiente para ese explorador')
    }
  }),
)

router.post(
  '/invites/:id/accept',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const inviteId = Number(req.params.id)
    if (await activeMembership(userId)) {
      throw new AppError('Ya estás en una tropa')
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT i.id, i.troop_id, t.is_active
       FROM troop_invites i
       INNER JOIN troops t ON t.id = i.troop_id
       WHERE i.id = ? AND i.to_user_id = ? AND i.status = 'pending'
       LIMIT 1`,
      [inviteId, userId],
    )
    if (!rows[0] || Number(rows[0].is_active) === 0) {
      throw new AppError('Invitación no válida', 404)
    }
    const troopId = Number(rows[0].troop_id)
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
  }),
)

router.post(
  '/invites/:id/reject',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const inviteId = Number(req.params.id)
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE troop_invites
       SET status = 'rejected', responded_at = NOW()
       WHERE id = ? AND to_user_id = ? AND status = 'pending'`,
      [inviteId, userId],
    )
    if (result.affectedRows === 0) throw new AppError('Invitación no válida', 404)
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

export default router
