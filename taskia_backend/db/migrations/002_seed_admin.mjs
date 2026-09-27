/**
 * Admin por defecto para entornos nuevos / locales.
 * Usuario: Sebastian · contraseña: 123456
 * Idempotente: no pisa si el username o el email ya existen.
 */
import bcrypt from 'bcryptjs'

const USERNAME = 'Sebastian'
const EMAIL = 'sebastian@taskia.local'
const PASSWORD = '123456'

export async function up(client) {
  const role = await client.query(
    `SELECT id FROM roles WHERE code = 'admin' LIMIT 1`,
  )
  const roleId = role.rows[0]?.id
  if (roleId == null) {
    throw new Error('Falta el rol admin (corre 001_initial.sql primero)')
  }

  const existing = await client.query(
    `SELECT id FROM users
     WHERE username = $1 OR email = $2
     LIMIT 1`,
    [USERNAME, EMAIL],
  )
  if (existing.rows.length > 0) {
    console.log(`  admin ${USERNAME} ya existe — sin cambios`)
    return
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  await client.query(
    `INSERT INTO users (username, email, password_hash, role_id, is_active)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [USERNAME, EMAIL, passwordHash, roleId],
  )
  console.log(`  admin creado: ${USERNAME} / ${PASSWORD}`)
}
