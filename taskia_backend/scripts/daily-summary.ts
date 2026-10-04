/**
 * Resumen del día, una pasada y termina.
 * Por defecto resume el día de ayer en America/Lima.
 * GitHub Actions decide cuándo llamarlo. Fecha opcional: --date=YYYY-MM-DD
 *
 *   npm run job:daily-summary
 *   npm run job:daily-summary -- --date=2026-10-03
 */
import 'reflect-metadata'
import { AppDataSource, initDataSource } from '../src/infrastructure/database/data-source.js'
import { StudentDailySummary } from '../src/infrastructure/database/entities/index.js'
import { callGemini } from '../src/infrastructure/gemini/gemini.client.js'
import { todayInTimeZone } from '../src/infrastructure/database/civil-date.js'
import { dailySummarySystem } from '../src/prompts/daily-summary.js'
import { extractJson } from '../src/utils/helpers.js'

const TZ = 'America/Lima'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const NO_ACTIVITY =
  'No hubo actividad registrada este día: ni tareas, ni estudio, ni desafíos.'

type Explorer = { id: number; username: string }

function dayArg(): string {
  const raw = process.argv.find((arg) => arg.startsWith('--date='))?.slice('--date='.length) ?? ''
  if (!raw) return yesterday(todayInTimeZone(TZ))
  if (!DATE_RE.test(raw)) {
    throw new Error('--date debe ser YYYY-MM-DD')
  }
  return raw
}

function yesterday(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, date))
  utc.setUTCDate(utc.getUTCDate() - 1)
  return utc.toISOString().slice(0, 10)
}

function onDay(column: string): string {
  return `(${column} AT TIME ZONE '${TZ}')::date = $2::date`
}

async function explorers(): Promise<Explorer[]> {
  const rows = await AppDataSource.query(
    `SELECT u.id, u.username
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.code = 'user' AND u.is_active
     ORDER BY u.id`,
  )
  return rows.map((row: { id: number; username: string }) => ({
    id: Number(row.id),
    username: row.username,
  }))
}

async function brief(studentId: number, day: string): Promise<string> {
  const tasks = await AppDataSource.query(
    `SELECT title, status, study_passed
     FROM tasks
     WHERE user_id = $1 AND (${onDay('created_at')} OR ${onDay('updated_at')})
     ORDER BY id
     LIMIT 20`,
    [studentId, day],
  )
  const taskLines = tasks.map(
    (row: { title: string; status: string; study_passed: boolean }) =>
      `- Tarea «${row.title}»: ${row.status}${row.study_passed ? ', con visto de estudio' : ''}`,
  )

  const study = await AppDataSource.query(
    `SELECT t.title, m.role, left(m.content, 180) AS content,
            m.reply_latency_seconds, m.is_pause
     FROM study_messages m
     JOIN tasks t ON t.id = m.task_id
     WHERE t.user_id = $1 AND ${onDay('m.created_at')}
     ORDER BY m.id
     LIMIT 16`,
    [studentId, day],
  )
  const studyLines = study.map(
    (row: {
      title: string
      role: string
      content: string
      reply_latency_seconds: number | null
      is_pause: boolean
    }) => {
      const pause = row.is_pause ? ' (pausa larga)' : ''
      const latency =
        row.role === 'user' && row.reply_latency_seconds != null
          ? ` respuesta en ${row.reply_latency_seconds}s`
          : ''
      return `- Estudio «${row.title}», ${row.role}${latency}${pause}: ${row.content}`
    },
  )

  const missions = await AppDataSource.query(
    `SELECT m.title, m.status
     FROM study_missions m
     JOIN study_worlds w ON w.id = m.world_id
     WHERE w.user_id = $1 AND ${onDay('m.updated_at')}
     ORDER BY m.id
     LIMIT 12`,
    [studentId, day],
  )
  const missionLines = missions.map(
    (row: { title: string; status: string }) => `- Misión «${row.title}»: ${row.status}`,
  )

  const missionChat = await AppDataSource.query(
    `SELECT m.title, msg.role, left(msg.content, 180) AS content, msg.is_pause
     FROM study_mission_messages msg
     JOIN study_missions m ON m.id = msg.mission_id
     JOIN study_worlds w ON w.id = m.world_id
     WHERE w.user_id = $1 AND ${onDay('msg.created_at')}
     ORDER BY msg.id
     LIMIT 12`,
    [studentId, day],
  )
  const missionChatLines = missionChat.map(
    (row: { title: string; role: string; content: string; is_pause: boolean }) =>
      `- Misión «${row.title}», ${row.role}${row.is_pause ? ' (pausa larga)' : ''}: ${row.content}`,
  )

  const challenges = await AppDataSource.query(
    `SELECT scope, status, score
     FROM study_challenges
     WHERE user_id = $1 AND (${onDay('started_at')} OR ${onDay('completed_at')})
     ORDER BY id
     LIMIT 12`,
    [studentId, day],
  )
  const challengeLines = challenges.map(
    (row: { scope: string; status: string; score: number | null }) =>
      `- Desafío ${row.scope}: ${row.status}${row.score != null ? `, puntaje ${row.score}` : ''}`,
  )

  const lines = [
    ...taskLines,
    ...studyLines,
    ...missionLines,
    ...missionChatLines,
    ...challengeLines,
  ]
  return lines.join('\n')
}

async function saveSummary(studentId: number, day: string, summaryText: string) {
  await AppDataSource.getRepository(StudentDailySummary)
    .createQueryBuilder()
    .insert()
    .into(StudentDailySummary)
    .values({ studentId, summaryDate: day, summaryText, isActive: true })
    .orUpdate(['summary_text', 'is_active'], ['student_id', 'summary_date'])
    .execute()
}

async function summarize(explorer: Explorer, day: string): Promise<'quiet' | 'ai'> {
  const facts = await brief(explorer.id, day)
  if (!facts) {
    await saveSummary(explorer.id, day, NO_ACTIVITY)
    return 'quiet'
  }
  const raw = await callGemini({
    system: dailySummarySystem({ explorerName: explorer.username, day }),
    user: `Hechos del día ${day}:\n${facts}`,
    usage: { userId: explorer.id, kind: 'daily_summary' },
  })
  const parsed = JSON.parse(extractJson(raw)) as { summary?: string }
  const summary = String(parsed.summary ?? '').trim()
  if (!summary) throw new Error('Gemini no devolvió summary')
  await saveSummary(explorer.id, day, summary)
  return 'ai'
}

async function main() {
  const day = dayArg()
  await initDataSource()
  const list = await explorers()
  let quiet = 0
  let ai = 0
  let failed = 0
  for (const explorer of list) {
    try {
      const kind = await summarize(explorer, day)
      if (kind === 'quiet') quiet += 1
      else ai += 1
      console.log(`${day} · ${explorer.username} · ${kind === 'quiet' ? 'sin actividad' : 'resumen'}`)
    } catch (err) {
      failed += 1
      const message = err instanceof Error ? err.message : String(err)
      console.error(`${day} · ${explorer.username} · fallo: ${message}`)
    }
  }
  console.log(`Listo ${day}: ${list.length} exploradores, ${ai} con IA, ${quiet} sin actividad, ${failed} fallos`)
  await AppDataSource.destroy()
  if (failed > 0) process.exitCode = 1
}

main().catch(async (err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  if (AppDataSource.isInitialized) await AppDataSource.destroy()
  process.exit(1)
})
