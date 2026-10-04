/**
 * Seed demo: tropas con muchos exploradores (niveles/XP distintos) + guardianes.
 * Cursos = mismos de primaria que Seroven. Sin tareas/desafíos/estudio.
 * XP semanal sintético en xp_awards para el ranking lun–dom (America/Lima).
 * Idempotente: si ya existe la tropa ancla, no vuelve a insertar.
 */
import bcrypt from 'bcryptjs'

const PRIMARY_COURSES = [
  'Matemática',
  'Comunicación',
  'Ciencia y Tecnología',
  'Personal Social',
  'Arte y Cultura',
  'Educación Física',
  'Inglés',
  'Religión',
]

const PASSWORD = '123456'
const ANCHOR_TROOP = 'Los Veloces'

/** Semana civil America/Lima → lunes YYYY-MM-DD. */
function weekStartMondayLima(instant = new Date()) {
  const civil = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
  const [y, m, d] = civil.split('-').map(Number)
  const asUtc = Date.UTC(y, m - 1, d)
  const dow = new Date(asUtc).getUTCDay()
  const daysSinceMonday = dow === 0 ? 6 : dow - 1
  const monday = new Date(asUtc - daysSinceMonday * 86_400_000)
  return monday.toISOString().slice(0, 10)
}

/**
 * Tropas demo. Cada miembro: username, level, xpIntoLevel (0–999), xpWeek, role.
 * xp_total = (level - 1) * 1000 + xpIntoLevel
 */
const TROOPS = [
  {
    name: ANCHOR_TROOP,
    planet_style_id: 'rocky_blue',
    planet_seed: 1001,
    members: [
      { username: 'Seroven', role: 'captain', level: 4, xpInto: 320, xpWeek: 480 },
      { username: 'MateoR', role: 'copilot', level: 5, xpInto: 110, xpWeek: 620 },
      { username: 'LuciaV', role: 'member', level: 3, xpInto: 780, xpWeek: 210 },
      { username: 'DiegoP', role: 'member', level: 2, xpInto: 450, xpWeek: 95 },
      { username: 'SofiaM', role: 'member', level: 6, xpInto: 40, xpWeek: 710 },
      { username: 'LeoG', role: 'member', level: 1, xpInto: 180, xpWeek: 40 },
      { username: 'ValentinaC', role: 'member', level: 4, xpInto: 900, xpWeek: 350 },
      { username: 'NicolasH', role: 'member', level: 3, xpInto: 55, xpWeek: 160 },
    ],
  },
  {
    name: 'Estrellas del Norte',
    planet_style_id: 'neon_violet',
    planet_seed: 1002,
    members: [
      { username: 'CamilaT', role: 'captain', level: 7, xpInto: 220, xpWeek: 890 },
      { username: 'JoaquinB', role: 'copilot', level: 6, xpInto: 640, xpWeek: 540 },
      { username: 'IsabellaF', role: 'member', level: 5, xpInto: 300, xpWeek: 400 },
      { username: 'BenjaminL', role: 'member', level: 4, xpInto: 10, xpWeek: 280 },
      { username: 'MartinaS', role: 'member', level: 3, xpInto: 500, xpWeek: 190 },
      { username: 'SantiagoO', role: 'member', level: 2, xpInto: 870, xpWeek: 120 },
      { username: 'EmiliaR', role: 'member', level: 8, xpInto: 15, xpWeek: 950 },
      { username: 'ThiagoD', role: 'member', level: 1, xpInto: 60, xpWeek: 25 },
      { username: 'AntonellaP', role: 'member', level: 5, xpInto: 770, xpWeek: 330 },
    ],
  },
  {
    name: 'Guardianes del Saber',
    planet_style_id: 'forest_green',
    planet_seed: 1003,
    members: [
      { username: 'RenataA', role: 'captain', level: 9, xpInto: 400, xpWeek: 1020 },
      { username: 'LucasE', role: 'copilot', level: 7, xpInto: 50, xpWeek: 700 },
      { username: 'AmandaQ', role: 'member', level: 6, xpInto: 880, xpWeek: 460 },
      { username: 'FelipeN', role: 'member', level: 4, xpInto: 200, xpWeek: 250 },
      { username: 'CatalinaZ', role: 'member', level: 3, xpInto: 990, xpWeek: 180 },
      { username: 'AgustinM', role: 'member', level: 2, xpInto: 120, xpWeek: 75 },
      { username: 'PaulaI', role: 'member', level: 5, xpInto: 560, xpWeek: 390 },
      { username: 'MaximilianoV', role: 'member', level: 8, xpInto: 300, xpWeek: 810 },
      { username: 'JosefinaK', role: 'member', level: 1, xpInto: 420, xpWeek: 55 },
      { username: 'TomasW', role: 'member', level: 4, xpInto: 670, xpWeek: 300 },
    ],
  },
  {
    name: 'Rayos Azules',
    planet_style_id: 'ice_cyan',
    planet_seed: 1004,
    members: [
      { username: 'DanielaY', role: 'captain', level: 3, xpInto: 150, xpWeek: 200 },
      { username: 'GabrielX', role: 'copilot', level: 2, xpInto: 800, xpWeek: 140 },
      { username: 'FlorenciaJ', role: 'member', level: 1, xpInto: 30, xpWeek: 15 },
      { username: 'IgnacioU', role: 'member', level: 4, xpInto: 500, xpWeek: 270 },
      { username: 'ConstanzaB', role: 'member', level: 2, xpInto: 250, xpWeek: 90 },
      { username: 'RodrigoC', role: 'member', level: 5, xpInto: 10, xpWeek: 360 },
    ],
  },
  {
    name: 'Cometas del Sur',
    planet_style_id: 'lava_amber',
    planet_seed: 1005,
    members: [
      { username: 'ElenaD', role: 'captain', level: 6, xpInto: 450, xpWeek: 580 },
      { username: 'PabloF', role: 'copilot', level: 5, xpInto: 200, xpWeek: 440 },
      { username: 'JulietaG', role: 'member', level: 4, xpInto: 800, xpWeek: 310 },
      { username: 'AndresH', role: 'member', level: 3, xpInto: 100, xpWeek: 170 },
      { username: 'MarianaI', role: 'member', level: 7, xpInto: 900, xpWeek: 760 },
      { username: 'SebastianJ', role: 'member', level: 2, xpInto: 600, xpWeek: 110 },
      { username: 'CarlaK', role: 'member', level: 1, xpInto: 900, xpWeek: 80 },
    ],
  },
  {
    name: 'Pioneros',
    planet_style_id: 'rose_dust',
    planet_seed: 1006,
    members: [
      { username: 'BrunoL', role: 'captain', level: 2, xpInto: 50, xpWeek: 60 },
      { username: 'OliviaM', role: 'copilot', level: 1, xpInto: 700, xpWeek: 45 },
      { username: 'HugoN', role: 'member', level: 3, xpInto: 300, xpWeek: 130 },
      { username: 'IrisO', role: 'member', level: 1, xpInto: 10, xpWeek: 10 },
      { username: 'KevinP', role: 'member', level: 2, xpInto: 990, xpWeek: 100 },
    ],
  },
]

/** Guardián por explorador (salvo Seroven → Claudia ya existe en 004). */
const GUARDIAN_BY_EXPLORER = {
  MateoR: 'RosaM',
  LuciaV: 'PedroV',
  DiegoP: 'AnaP',
  SofiaM: 'CarlosM',
  LeoG: 'MariaG',
  ValentinaC: 'JorgeC',
  NicolasH: 'LauraH',
  CamilaT: 'MartaT',
  JoaquinB: 'RicardoB',
  IsabellaF: 'ElenaF',
  BenjaminL: 'PatriciaL',
  MartinaS: 'HectorS',
  SantiagoO: 'GloriaO',
  EmiliaR: 'RaulR',
  ThiagoD: 'SilviaD',
  AntonellaP: 'FernandoP',
  RenataA: 'BeatrizA',
  LucasE: 'DiegoE',
  AmandaQ: 'NormaQ',
  FelipeN: 'OscarN',
  CatalinaZ: 'IreneZ',
  AgustinM: 'VictorM',
  PaulaI: 'CarmenI',
  MaximilianoV: 'SandraV',
  JosefinaK: 'AlbertoK',
  TomasW: 'MonicaW',
  DanielaY: 'LuisY',
  GabrielX: 'PilarX',
  FlorenciaJ: 'RamonJ',
  IgnacioU: 'TeresaU',
  ConstanzaB: 'ManuelB',
  RodrigoC: 'AliciaC',
  ElenaD: 'FranciscoD',
  PabloF: 'IsabelF',
  JulietaG: 'EduardoG',
  AndresH: 'CeciliaH',
  MarianaI: 'RobertoI',
  SebastianJ: 'AdrianaJ',
  CarlaK: 'MiguelK',
  BrunoL: 'SusanaL',
  OliviaM: 'AndresM',
  HugoN: 'ClaudiaN',
  IrisO: 'JoseO',
  KevinP: 'NataliaP',
}

async function roleId(client, code) {
  const r = await client.query(`SELECT id FROM roles WHERE code = $1 LIMIT 1`, [
    code,
  ])
  if (!r.rows[0]) throw new Error(`Falta el rol ${code}`)
  return Number(r.rows[0].id)
}

async function ensureUser(
  client,
  { username, email, password, level, xpTotal },
  roleCode,
  passwordHash,
) {
  const existing = await client.query(
    `SELECT id, level, xp_total FROM users WHERE username = $1 OR email = $2 LIMIT 1`,
    [username, email],
  )
  if (existing.rows.length > 0) {
    const id = Number(existing.rows[0].id)
    if (roleCode === 'user' && level != null && xpTotal != null) {
      await client.query(
        `UPDATE users SET level = $1, xp_total = $2 WHERE id = $3`,
        [level, xpTotal, id],
      )
    }
    return id
  }

  const inserted = await client.query(
    `INSERT INTO users (username, email, password_hash, role_id, is_active, level, xp_total)
     VALUES ($1, $2, $3, $4, TRUE, $5, $6)
     RETURNING id`,
    [
      username,
      email,
      passwordHash,
      await roleId(client, roleCode),
      level ?? 1,
      xpTotal ?? 0,
    ],
  )
  return Number(inserted.rows[0].id)
}

async function ensureCourses(client, userId) {
  for (const name of PRIMARY_COURSES) {
    await client.query(
      `INSERT INTO courses (user_id, name, is_active)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (user_id, name) DO NOTHING`,
      [userId, name],
    )
  }
}

async function ensureLink(client, parentId, studentId) {
  await client.query(
    `INSERT INTO parent_student_links (parent_id, student_id, is_active)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (parent_id, student_id) DO UPDATE SET is_active = TRUE`,
    [parentId, studentId],
  )
  await client.query(
    `INSERT INTO parent_notify_prefs (parent_id) VALUES ($1)
     ON CONFLICT (parent_id) DO NOTHING`,
    [parentId],
  )
}

async function ensureMembership(client, troopId, userId, role) {
  const activeElsewhere = await client.query(
    `SELECT id, troop_id FROM troop_members
     WHERE user_id = $1 AND left_at IS NULL AND troop_id <> $2
     LIMIT 1`,
    [userId, troopId],
  )
  if (activeElsewhere.rows[0]) {
    console.log(
      `  skip membership user ${userId}: ya está en tropa ${activeElsewhere.rows[0].troop_id}`,
    )
    return
  }

  const existing = await client.query(
    `SELECT id, left_at, role FROM troop_members
     WHERE troop_id = $1 AND user_id = $2 LIMIT 1`,
    [troopId, userId],
  )
  if (existing.rows[0]) {
    if (existing.rows[0].left_at != null) {
      await client.query(
        `UPDATE troop_members
         SET left_at = NULL, role = $1, joined_at = NOW()
         WHERE id = $2`,
        [role, existing.rows[0].id],
      )
    } else if (existing.rows[0].role !== role) {
      await client.query(`UPDATE troop_members SET role = $1 WHERE id = $2`, [
        role,
        existing.rows[0].id,
      ])
    }
    return
  }
  await client.query(
    `INSERT INTO troop_members (troop_id, user_id, role)
     VALUES ($1, $2, $3)`,
    [troopId, userId, role],
  )
}

async function ensureWeekAward(client, userId, amount, weekStart, seedKey) {
  if (amount <= 0) return
  // source_id sintético estable por seed (evita chocar con ids reales de tareas)
  const sourceId = 9_000_000 + seedKey
  await client.query(
    `INSERT INTO xp_awards
       (user_id, source_type, source_id, amount, effort_score, reason, week_start)
     VALUES ($1, 'task_done_simple', $2, $3, NULL, 'seed demo tropas', $4)
     ON CONFLICT (user_id, source_type, source_id) DO UPDATE
       SET amount = EXCLUDED.amount,
           week_start = EXCLUDED.week_start,
           reason = EXCLUDED.reason`,
    [userId, sourceId, amount, weekStart],
  )
}

export async function up(client) {
  const anchor = await client.query(
    `SELECT id FROM troops WHERE name = $1 AND is_active = TRUE LIMIT 1`,
    [ANCHOR_TROOP],
  )
  const already =
    anchor.rows[0] != null &&
    (
      await client.query(
        `SELECT COUNT(*)::int AS c FROM troop_members
         WHERE troop_id = $1 AND left_at IS NULL`,
        [Number(anchor.rows[0].id)],
      )
    ).rows[0].c >= 5

  if (already) {
    console.log(
      `  seed tropas demo: "${ANCHOR_TROOP}" ya tiene miembros — omito`,
    )
    return
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  const weekStart = weekStartMondayLima()
  let explorers = 0
  let guardians = 0
  let troopCount = 0
  let seedKey = 1

  for (const troop of TROOPS) {
    let troopId
    const existingTroop = await client.query(
      `SELECT id FROM troops WHERE name = $1 LIMIT 1`,
      [troop.name],
    )
    if (existingTroop.rows[0]) {
      troopId = Number(existingTroop.rows[0].id)
      await client.query(
        `UPDATE troops
         SET is_active = TRUE,
             planet_style_id = $2,
             planet_seed = $3
         WHERE id = $1`,
        [troopId, troop.planet_style_id, troop.planet_seed],
      )
    } else {
      const ins = await client.query(
        `INSERT INTO troops (name, planet_style_id, planet_seed)
         VALUES ($1, $2, $3) RETURNING id`,
        [troop.name, troop.planet_style_id, troop.planet_seed],
      )
      troopId = Number(ins.rows[0].id)
    }
    troopCount += 1

    for (const m of troop.members) {
      const xpTotal = (m.level - 1) * 1000 + m.xpInto
      const email = `${m.username.toLowerCase()}@taskia.local`
      const explorerId = await ensureUser(
        client,
        {
          username: m.username,
          email,
          password: PASSWORD,
          level: m.level,
          xpTotal,
        },
        'user',
        passwordHash,
      )
      explorers += 1
      await ensureCourses(client, explorerId)
      await ensureMembership(client, troopId, explorerId, m.role)
      await ensureWeekAward(client, explorerId, m.xpWeek, weekStart, seedKey)
      seedKey += 1

      const gName = GUARDIAN_BY_EXPLORER[m.username]
      if (gName) {
        const gEmail = `${gName.toLowerCase()}@taskia.local`
        const guardianId = await ensureUser(
          client,
          {
            username: gName,
            email: gEmail,
            password: PASSWORD,
            level: 1,
            xpTotal: 0,
          },
          'parent',
          passwordHash,
        )
        guardians += 1
        await ensureLink(client, guardianId, explorerId)
      }
    }
  }

  console.log(
    `  seed tropas demo: ${troopCount} tropas, ~${explorers} exploradores, ~${guardians} guardianes`,
  )
  console.log(
    `  password común ${PASSWORD}; XP semanal week_start=${weekStart}`,
  )
  console.log(
    `  prueba ranking: entra como Seroven o CamilaT / ${PASSWORD}`,
  )
}
