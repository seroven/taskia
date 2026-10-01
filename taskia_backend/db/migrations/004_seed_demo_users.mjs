/**
 * Cuentas demo para entornos nuevos / locales.
 * - Explorador Seroven / 123456 + materias de primaria
 * - Guardián Claudia / 123456 vinculada a Seroven
 * Idempotente: no pisa si username/email ya existen; completa cursos/vínculo faltantes.
 */
import bcrypt from 'bcryptjs'

const EXPLORER = {
  username: 'Seroven',
  email: 'seroven@taskia.local',
  password: '123456',
}

const GUARDIAN = {
  username: 'Claudia',
  email: 'claudia@taskia.local',
  password: '123456',
}

/** Materias típicas de primaria (LatAm). */
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

async function ensureUser(client, { username, email, password }, roleCode) {
  const role = await client.query(
    `SELECT id FROM roles WHERE code = $1 LIMIT 1`,
    [roleCode],
  )
  const roleId = role.rows[0]?.id
  if (roleId == null) {
    throw new Error(`Falta el rol ${roleCode}`)
  }

  const existing = await client.query(
    `SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1`,
    [username, email],
  )
  if (existing.rows.length > 0) {
    console.log(`  ${roleCode} ${username} ya existe — reutilizo id`)
    return Number(existing.rows[0].id)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const inserted = await client.query(
    `INSERT INTO users (username, email, password_hash, role_id, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id`,
    [username, email, passwordHash, roleId],
  )
  console.log(`  ${roleCode} creado: ${username} / ${password}`)
  return Number(inserted.rows[0].id)
}

export async function up(client) {
  const explorerId = await ensureUser(client, EXPLORER, 'user')
  const guardianId = await ensureUser(client, GUARDIAN, 'parent')

  await client.query(
    `INSERT INTO parent_student_links (parent_id, student_id, is_active)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (parent_id, student_id) DO UPDATE
       SET is_active = TRUE`,
    [guardianId, explorerId],
  )
  console.log(`  vínculo Claudia ↔ Seroven listo`)

  await client.query(
    `INSERT INTO parent_notify_prefs (parent_id) VALUES ($1)
     ON CONFLICT (parent_id) DO NOTHING`,
    [guardianId],
  )

  let coursesAdded = 0
  for (const name of PRIMARY_COURSES) {
    const result = await client.query(
      `INSERT INTO courses (user_id, name, is_active)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (user_id, name) DO NOTHING
       RETURNING id`,
      [explorerId, name],
    )
    if (result.rows.length > 0) coursesAdded += 1
  }
  console.log(
    `  materias primaria Seroven: +${coursesAdded} nuevas (${PRIMARY_COURSES.length} en catálogo)`,
  )
}
