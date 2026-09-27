/**
 * Taskia — migraciones PostgreSQL.
 *
 *   npm run db:migrate   → crea PG_SCHEMA si falta y aplica pendientes
 *   npm run db:setup     → igual (alias de primera vez)
 *
 * Archivos en db/migrations/:
 *   NNN_nombre.sql  — SQL puro
 *   NNN_nombre.mjs  — export async function up(client)
 *
 * Tabla schema_migrations (id, applied_at). El schema de app es PG_SCHEMA
 * (por defecto "taskia"), no public.
 *
 * Env: --env-file del script npm, o TASKIA_ENV / --env=pd.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const migrationsDir = path.join(__dirname, 'migrations')

const args = process.argv.slice(2)
const envArg = args.find((a) => a.startsWith('--env='))?.slice('--env='.length)
const envName = envArg || process.env.TASKIA_ENV || 'development'
const envFiles = {
  development: '.env.development',
  qa: '.env.qa',
  pd: '.env.pd',
  production: '.env.production',
}
const envFile = envFiles[envName] ?? `.env.${envName}`

const envPath = path.join(root, envFile)
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else if (fs.existsSync(path.join(root, '.env'))) {
  dotenv.config({ path: path.join(root, '.env') })
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

function quoteIdent(name) {
  return `"${name}"`
}

function sslConfig() {
  if (sslmode === 'require' || sslmode === 'verify-full') {
    return { rejectUnauthorized: sslmode === 'verify-full' }
  }
  return undefined
}

function clientConfig() {
  const ssl = sslConfig()
  if (pgDsn) return { connectionString: pgDsn, ssl }
  return {
    host: process.env.PG_HOST ?? 'localhost',
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD ?? '',
    database: process.env.PG_DATABASE ?? 'postgres',
    ssl,
  }
}

function splitPgStatements(sql) {
  const out = []
  let i = 0
  let buf = ''
  const n = sql.length
  while (i < n) {
    const c = sql[i]
    if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i)
      i = nl === -1 ? n : nl + 1
      continue
    }
    if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? n : end + 2
      continue
    }
    if (c === "'") {
      buf += c
      i += 1
      while (i < n) {
        buf += sql[i]
        if (sql[i] === "'" && sql[i + 1] === "'") {
          buf += sql[i + 1]
          i += 2
          continue
        }
        if (sql[i] === "'") {
          i += 1
          break
        }
        i += 1
      }
      continue
    }
    if (c === '$' && sql[i + 1] === '$') {
      const end = sql.indexOf('$$', i + 2)
      if (end === -1) {
        buf += sql.slice(i)
        break
      }
      buf += sql.slice(i, end + 2)
      i = end + 2
      continue
    }
    if (c === ';') {
      const stmt = buf.trim()
      if (stmt) out.push(stmt)
      buf = ''
      i += 1
      continue
    }
    buf += c
    i += 1
  }
  const last = buf.trim()
  if (last) out.push(last)
  return out
}

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) return []
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => /^\d{3}_.+\.(sql|mjs)$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'))
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function isApplied(client, id) {
  const result = await client.query(
    'SELECT 1 AS ok FROM schema_migrations WHERE id = $1 LIMIT 1',
    [id],
  )
  return result.rows.length > 0
}

async function markApplied(client, id) {
  await client.query(
    `INSERT INTO schema_migrations (id) VALUES ($1)
     ON CONFLICT (id) DO NOTHING`,
    [id],
  )
}

async function applySqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8')
  for (const stmt of splitPgStatements(sql)) {
    await client.query(stmt)
  }
}

async function applyMjsFile(client, filePath) {
  const mod = await import(pathToFileURL(filePath).href)
  if (typeof mod.up !== 'function') {
    throw new Error(`${path.basename(filePath)} debe exportar async function up(client)`)
  }
  await mod.up(client)
}

/** Bases que ya corrieron el dump monolítico schema.pg.sql. */
async function bootstrapFromLegacySchema(client) {
  const legacy = await isApplied(client, 'schema.pg.sql')
  const initial = await isApplied(client, '001_initial.sql')
  if (legacy && !initial) {
    await markApplied(client, '001_initial.sql')
    console.log('→ 001_initial.sql (ya aplicada vía schema.pg.sql)')
  }
}

async function main() {
  const files = listMigrationFiles()
  if (files.length === 0) {
    console.error('No hay migraciones en db/migrations/')
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
    await client.query(`SET search_path TO ${quoteIdent(pgSchema)}, public`)
    await ensureMigrationsTable(client)
    await bootstrapFromLegacySchema(client)

    let applied = 0
    for (const name of files) {
      if (await isApplied(client, name)) {
        console.log(`· ${name} (ya aplicada)`)
        continue
      }
      console.log(`→ ${name}`)
      const full = path.join(migrationsDir, name)
      await client.query('BEGIN')
      try {
        if (name.endsWith('.sql')) {
          await applySqlFile(client, full)
        } else {
          await applyMjsFile(client, full)
        }
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
      tables.rows.map((t) => t.name).join(', '),
    )
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
