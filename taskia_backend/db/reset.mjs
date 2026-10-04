/**
 * Taskia — reset del schema de app (borra y recrea).
 *
 *   npm run db:reset              → DROP SCHEMA + migraciones (.env.development)
 *   npm run db:reset:qa -- --yes  → igual con .env.qa (pide --yes)
 *   npm run db:reset:pd -- --yes  → igual con .env.pd (obligatorio --yes)
 *
 * No borra la base Postgres entera: solo el schema PG_SCHEMA (por defecto
 * "taskia"). Luego corre migrate.ts para volver a crear tablas y seeds.
 *
 * Env: igual que migrate.ts (--env=pd / TASKIA_ENV).
 */
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const forceYes = args.includes('--yes') || args.includes('-y')
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

if (envName !== 'development' && !forceYes) {
  console.error(
    `Reset en "${envName}" borra TODO el schema ${pgSchema}.\n` +
      `Vuelve a correr con --yes si estás seguro.\n` +
      `Ejemplo: npm run db:reset:pd -- --yes`,
  )
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

function runMigrate() {
  return new Promise((resolve, reject) => {
    const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
    const migratePath = path.join(__dirname, 'migrate.ts')
    const child = spawn(
      process.execPath,
      [tsxCli, migratePath, `--env=${envName}`],
      {
        cwd: root,
        stdio: 'inherit',
        env: process.env,
      },
    )
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`migrate.ts salió con código ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  const host = pgDsn ? '(PG_DSN)' : (process.env.PG_HOST ?? 'localhost')
  const database = process.env.PG_DATABASE ?? 'postgres'
  console.log(
    `RESET Env: ${envFile} | DB: ${database} @ ${host} | schema: ${pgSchema}`,
  )
  console.log(`→ DROP SCHEMA ${pgSchema} CASCADE`)

  const client = new pg.Client(clientConfig())
  await client.connect()
  try {
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdent(pgSchema)} CASCADE`)
    console.log('OK — schema eliminado')
  } finally {
    await client.end()
  }

  console.log('→ Aplicando migraciones…')
  await runMigrate()
  console.log('OK — reset completo')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
