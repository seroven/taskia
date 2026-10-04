/**
 * Taskia — migraciones PostgreSQL en TypeScript.
 *
 *   npm run db:migrate   → crea PG_SCHEMA si falta y aplica pendientes
 *   npm run db:setup     → igual (alias de primera vez)
 *
 * Cada archivo db/migrations/NNN_nombre.ts exporta async function up(client).
 * 001_baseline.ts es la foto inicial. Lo posterior suma; no recrea el schema.
 *
 * Tabla schema_migrations (id, applied_at). El schema de app es PG_SCHEMA
 * (por defecto "taskia"), no public.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const migrationsDir = path.join(__dirname, 'migrations')

const BASELINE_ID = '001_baseline.ts'

/** Nombres que quedaron en schema_migrations antes de unificar el baseline. */
const LEGACY_MIGRATION_IDS = [
  'schema.pg.sql',
  '001_initial.sql',
  '002_seed_admin.mjs',
  '003_tropas_xp.sql',
  '004_seed_demo_users.mjs',
  '005_seed_demo_troops.mjs',
  '006_troop_planet.sql',
  '007_troop_invite_direction.sql',
  '008_user_avatar.sql',
  '009_llm_usage_planet_generate.sql',
  '010_seed_demo_planet_styles.sql',
  '011_planet_config.sql',
]

const args = process.argv.slice(2)
const envArg = args.find((a) => a.startsWith('--env='))?.slice('--env='.length)
const envName = envArg || process.env.TASKIA_ENV || 'development'
const envFiles: Record<string, string> = {
  development: '.env.development',
  qa: '.env.qa',
  pd: '.env.pd',
  production: '.env.production',
}
const envFile = envFiles[envName] ?? `.env.${envName}`

const envPath = path.join(root, envFile)
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true })
} else if (fs.existsSync(path.join(root, '.env'))) {
  dotenv.config({ path: path.join(root, '.env'), override: true })
} else {
  console.error(`No se encontró ${envFile} ni .env en taskia_backend`)
  process.exit(1)
}

const pgDsn = (process.env.PG_DSN ?? process.env.DATABASE_URL ?? '').trim()
const pgSchema = (process.env.PG_SCHEMA ?? 'taskia').trim() || 'taskia'
const sslmode = (
  process.env.PG_SSLMODE ?? (pgDsn ? 'require' : 'prefer')
).toLowerCase()

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(pgSchema)) {
  console.error('PG_SCHEMA inválido')
  process.exit(1)
}

function quoteIdent(name: string) {
  return `"${name}"`
}

function sslConfig() {
  if (sslmode === 'require' || sslmode === 'verify-full') {
    return { rejectUnauthorized: sslmode === 'verify-full' }
  }
  return undefined
}

/** El pooler de Supabase no conserva un SET suelto. El arranque sí fija el schema. */
function searchPathOption() {
  return `-c search_path=${pgSchema},public`
}

function clientConfig() {
  const ssl = sslConfig()
  const options = searchPathOption()
  if (pgDsn) return { connectionString: pgDsn, ssl, options }
  return {
    host: process.env.PG_HOST ?? 'localhost',
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD ?? '',
    database: process.env.PG_DATABASE ?? 'postgres',
    ssl,
    options,
  }
}

const migrationsTable = `${quoteIdent(pgSchema)}.schema_migrations`

const APP_TABLES = [
  'roles',
  'users',
  'courses',
  'difficulties',
  'tasks',
  'study_sessions',
  'study_messages',
  'study_boards',
  'user_study_memory',
  'study_worlds',
  'study_world_courses',
  'study_missions',
  'study_mission_sessions',
  'study_mission_messages',
  'study_mission_boards',
  'study_challenges',
  'study_challenge_questions',
  'study_challenge_answers',
  'study_challenge_presets',
  'parent_student_links',
  'parent_notify_prefs',
  'student_daily_summaries',
  'parent_chat_messages',
  'llm_usage',
  'xp_awards',
  'troops',
  'troop_members',
  'troop_invites',
]

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) return []
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => /^\d{3}_.+\.ts$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'))
}

async function ensureMigrationsTable(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${migrationsTable} (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function isApplied(client: pg.Client, id: string) {
  const result = await client.query(
    `SELECT 1 AS ok FROM ${migrationsTable} WHERE id = $1 LIMIT 1`,
    [id],
  )
  return result.rows.length > 0
}

async function markApplied(client: pg.Client, id: string) {
  await client.query(
    `INSERT INTO ${migrationsTable} (id) VALUES ($1)
     ON CONFLICT (id) DO NOTHING`,
    [id],
  )
}

async function hasColumn(client: pg.Client, table: string, column: string) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = $3
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [table, column, pgSchema],
  )
  return result.rows.length > 0
}

async function hasTable(client: pg.Client, table: string) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = $2
       AND table_name = $1
     LIMIT 1`,
    [table, pgSchema],
  )
  return result.rows.length > 0
}

async function tablesInPublic(client: pg.Client) {
  if (pgSchema === 'public') return []
  const result = await client.query(
    `SELECT table_name AS name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [APP_TABLES],
  )
  return result.rows.map((row: { name: string }) => row.name)
}

/**
 * Una base que ya llegó al esquema actual no vuelve a ejecutar el baseline.
 * Si quedó a medias en la cadena vieja, se aborta: no se tiran las tablas.
 */
async function baselineAlreadyMaterialized(client: pg.Client) {
  if (await hasColumn(client, 'troops', 'planet_config')) return true

  const legacy = await client.query(
    `SELECT id FROM ${migrationsTable} WHERE id = ANY($1::text[])`,
    [LEGACY_MIGRATION_IDS],
  )
  if (legacy.rows.length === 0) return false

  if (await hasTable(client, 'users')) {
    throw new Error(
      'La base tiene migraciones anteriores, pero no el esquema actual (falta troops.planet_config). No recreo las tablas. En development, npm run db:reset solo si se pueden perder los datos.',
    )
  }
  return false
}

async function applyTsFile(client: pg.Client, filePath: string) {
  const mod = (await import(pathToFileURL(filePath).href)) as {
    up?: (client: pg.Client) => Promise<void>
  }
  if (typeof mod.up !== 'function') {
    throw new Error(`${path.basename(filePath)} debe exportar async function up(client)`)
  }
  await mod.up(client)
}

async function main() {
  const files = listMigrationFiles()
  if (files.length === 0) {
    console.error('No hay migraciones en db/migrations/')
    process.exit(1)
  }
  if (files[0] !== BASELINE_ID) {
    console.error(`La primera migración tiene que ser ${BASELINE_ID}`)
    process.exit(1)
  }

  const client = new pg.Client(clientConfig())
  await client.connect()

  try {
    const host = pgDsn ? '(PG_DSN)' : (process.env.PG_HOST ?? 'localhost')
    const database = process.env.PG_DATABASE ?? 'postgres'
    console.log(
      `Env: ${envFile} | DB: ${database} @ ${host} | schema: ${pgSchema}`,
    )

    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(pgSchema)}`)
    const leaked = await tablesInPublic(client)
    if (leaked.length > 0) {
      throw new Error(
        `Hay tablas de Taskia en public (${leaked.join(', ')}). ` +
          'Ese intento no respetó PG_SCHEMA. Bórralas de public y vuelve a correr. No borres el schema public.',
      )
    }
    await client.query(`SET search_path TO ${quoteIdent(pgSchema)}, public`)
    const placed = await client.query(`SELECT current_schema() AS schema`)
    const current = String(placed.rows[0]?.schema ?? '')
    if (current !== pgSchema) {
      throw new Error(
        `La conexión quedó en "${current || 'public'}", no en "${pgSchema}". No creo tablas ahí.`,
      )
    }
    await ensureMigrationsTable(client)

    let applied = 0
    for (const name of files) {
      if (await isApplied(client, name)) {
        console.log(`· ${name} (ya aplicada)`)
        continue
      }
      if (name === BASELINE_ID && (await baselineAlreadyMaterialized(client))) {
        await markApplied(client, name)
        console.log(`· ${name} (esquema ya existente — no se recrea)`)
        continue
      }

      console.log(`→ ${name}`)
      const full = path.join(migrationsDir, name)
      await client.query('BEGIN')
      try {
        await client.query(`SET LOCAL search_path TO ${quoteIdent(pgSchema)}, public`)
        await applyTsFile(client, full)
        await markApplied(client, name)
        await client.query('COMMIT')
        applied += 1
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }

    if (applied === 0) {
      console.log('Nada pendiente')
    } else {
      console.log(`OK — ${applied} migración(es) nueva(s)`)
    }

    const tables = await client.query(
      `SELECT table_name AS name
       FROM information_schema.tables
       WHERE table_schema = $1
       ORDER BY table_name`,
      [pgSchema],
    )
    console.log(
      'Tablas:',
      tables.rows.map((t: { name: string }) => t.name).join(', '),
    )
  } finally {
    await client.end()
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(message)
  process.exit(1)
})
